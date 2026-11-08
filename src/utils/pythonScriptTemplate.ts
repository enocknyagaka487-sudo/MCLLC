export interface BridgeScriptConfig {
  loginId?: number;
  password?: string;
  server?: string;
  port?: number;
  magicNumber?: number;
  defaultLotSize?: number;
  maxSubTrades?: number;
  targetProfitPercent?: number;
}

export function getDerivFastApiBridgeScript(config: BridgeScriptConfig = {}): string {
  const loginId = config.loginId || 0;
  const password = config.password || '';
  const server = config.server || 'Deriv-Server';
  const port = config.port || 8000;
  const magic = config.magicNumber || 998877;
  const defaultLot = config.defaultLotSize || 0.05;
  const maxTrades = config.maxSubTrades || 4;

  return `# ==============================================================================
# MCLLC DERIV MT5 FASTAPI ALGORITHMIC BRIDGE MICROSERVICE
# High-Speed REST execution bridge connecting MCLLC Web Terminal to Deriv MT5
#
# Requirements:
#   pip install MetaTrader5 fastapi uvicorn pydantic
# Run with:
#   python mcllc_deriv_bridge.py
#   OR: uvicorn mcllc_deriv_bridge:app --host 0.0.0.0 --port ${port} --reload
# ==============================================================================

import time
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

try:
    import MetaTrader5 as mt5
except ImportError:
    import subprocess
    print("[INIT] Installing required dependencies...")
    subprocess.check_call(["pip", "install", "MetaTrader5", "fastapi", "uvicorn", "pydantic"])
    import MetaTrader5 as mt5

app = FastAPI(
    title="MCLLC Deriv MT5 Algorithmic Bridge",
    description="Institutional nano-trade execution, risk balancing & 10% equity liquidator microservice",
    version="2.0.0"
)

# Enable CORS for browser-based MCLLC Web Terminal access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration Defaults
DERIV_LOGIN = ${loginId}
DERIV_PASSWORD = "${password}"
DERIV_SERVER = "${server}"  # "Deriv-Demo" or "Deriv-Server"
DEFAULT_MAGIC = ${magic}
MAX_SUB_TRADES = ${maxTrades}
DEFAULT_LOT_SIZE = ${defaultLot}

class TradeRequest(BaseModel):
    symbol: str
    volume: float = DEFAULT_LOT_SIZE
    order_type: str = Field(..., description="'BUY' or 'SELL'")
    magic: Optional[int] = DEFAULT_MAGIC
    deviation: Optional[int] = 20
    comment: Optional[str] = "MCLLC Nano-Trade"

class CloseRequest(BaseModel):
    symbol: Optional[str] = None
    magic: Optional[int] = DEFAULT_MAGIC
    reason: Optional[str] = "Batch Liquidation"

@app.on_event("startup")
def init_mt5():
    """Initialize connection to Deriv MT5 desktop terminal."""
    print(f"[STARTUP] Connecting to Deriv MT5 Terminal (Server: {DERIV_SERVER}, Login: {DERIV_LOGIN})...")
    
    # First attempt initialize with credentials
    connected = mt5.initialize(
        login=DERIV_LOGIN,
        password=DERIV_PASSWORD,
        server=DERIV_SERVER
    )
    
    # Fallback to current active MT5 session if already logged in locally
    if not connected:
        print(f"[WARN] Credential login failed ({mt5.last_error()}). Attempting attach to active MT5 session...")
        connected = mt5.initialize()

    if not connected:
        error_code, error_msg = mt5.last_error()
        print(f"[ERROR] Failed to connect to Deriv MT5: {error_code} - {error_msg}")
        print("[HINT] Ensure MT5 terminal is running and 'Allow Algo Trading' is checked in Tools -> Options -> Expert Advisors.")
    else:
        account_info = mt5.account_info()
        acc_id = account_info.login if account_info else "Unknown"
        acc_server = account_info.server if account_info else DERIV_SERVER
        balance = account_info.balance if account_info else 0.0
        currency = account_info.currency if account_info else "USD"
        print(f"[SUCCESS] Connected to Deriv MT5 Terminal! Account: #{acc_id} ({acc_server}) | Balance: {balance:,.2f} {currency}")

@app.on_event("shutdown")
def shutdown_mt5():
    """Disconnect cleanly from MT5."""
    print("[SHUTDOWN] Closing Deriv MT5 Bridge connection.")
    mt5.shutdown()

@app.get("/")
def root():
    return {
        "service": "MCLLC Deriv MT5 FastAPI Bridge",
        "status": "ONLINE",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "magic": DEFAULT_MAGIC,
        "nano_trades_count": MAX_SUB_TRADES,
    }

@app.get("/health")
def health_check():
    """Terminal health, connection status, and account snapshot."""
    terminal_info = mt5.terminal_info()
    if not terminal_info or not terminal_info.connected:
        return {
            "status": "DISCONNECTED",
            "connected": False,
            "error": "MT5 Terminal not running or disconnected from broker",
            "last_error": mt5.last_error()
        }

    account = mt5.account_info()
    return {
        "status": "CONNECTED",
        "connected": True,
        "terminal": {
            "build": terminal_info.build,
            "connected": terminal_info.connected,
            "trade_allowed": terminal_info.trade_allowed,
        },
        "account": {
            "login": account.login if account else None,
            "server": account.server if account else None,
            "company": account.company if account else "Deriv",
            "balance": account.balance if account else 0.0,
            "equity": account.equity if account else 0.0,
            "margin": account.margin if account else 0.0,
            "free_margin": account.margin_free if account else 0.0,
            "profit": account.profit if account else 0.0,
            "currency": account.currency if account else "USD",
        },
        "server_time_utc": datetime.now(timezone.utc).isoformat()
    }

@app.get("/account")
def get_account():
    """Get live Deriv account equity, balance, and margin."""
    account = mt5.account_info()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unable to read MT5 account info: {mt5.last_error()}"
        )
    return {
        "login": account.login,
        "server": account.server,
        "company": account.company,
        "balance": account.balance,
        "equity": account.equity,
        "profit": account.profit,
        "margin": account.margin,
        "free_margin": account.margin_free,
        "margin_level": account.margin_level,
        "currency": account.currency,
        "leverage": account.leverage
    }

@app.get("/positions")
def get_open_positions(symbol: Optional[str] = None, magic: Optional[int] = DEFAULT_MAGIC):
    """Retrieve all open MT5 positions, optionally filtered by symbol and magic number."""
    if symbol:
        positions = mt5.positions_get(symbol=symbol)
    else:
        positions = mt5.positions_get()

    if positions is None:
        return {"count": 0, "positions": [], "total_profit": 0.0}

    results = []
    total_profit = 0.0
    for p in positions:
        # Filter by magic if provided
        if magic is not None and p.magic != magic:
            continue

        total_profit += p.profit
        results.append({
            "ticket": p.ticket,
            "symbol": p.symbol,
            "type": "BUY" if p.type == mt5.POSITION_TYPE_BUY else "SELL",
            "volume": p.volume,
            "open_price": p.price_open,
            "current_price": p.price_current,
            "sl": p.sl,
            "tp": p.tp,
            "profit": p.profit,
            "magic": p.magic,
            "comment": p.comment,
            "time": p.time
        })

    return {
        "count": len(results),
        "total_profit": round(total_profit, 2),
        "positions": results
    }

@app.post("/execute")
def execute_nano_trade(trade: TradeRequest):
    """Execute 4x nano-trades (or custom subTrades) on Deriv MT5."""
    symbol = trade.symbol
    order_type_str = trade.order_type.upper()

    # Ensure symbol is selected in MT5 Market Watch
    if not mt5.symbol_select(symbol, True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Symbol '{symbol}' not found in Deriv MT5 Market Watch"
        )

    tick = mt5.symbol_info_tick(symbol)
    if not tick:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to fetch market tick for symbol '{symbol}'"
        )

    price = tick.ask if order_type_str == "BUY" else tick.bid
    mt5_order_type = mt5.ORDER_TYPE_BUY if order_type_str == "BUY" else mt5.ORDER_TYPE_SELL

    tickets: List[int] = []
    errors: List[str] = []

    # 4x Nano-trade execution loop as configured in MCLLC
    for i in range(MAX_SUB_TRADES):
        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": symbol,
            "volume": trade.volume,
            "type": mt5_order_type,
            "price": price,
            "deviation": trade.deviation or 20,
            "magic": trade.magic or DEFAULT_MAGIC,
            "comment": f"{trade.comment}_Sub_{i+1}",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }

        res = mt5.order_send(request)
        if res and res.retcode == mt5.TRADE_RETCODE_DONE:
            tickets.append(res.order)
        else:
            err = res.comment if res else str(mt5.last_error())
            errors.append(f"Sub-trade {i+1} failed: {err}")

    if not tickets:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "All nano-trades failed", "errors": errors}
        )

    print(f"[MCLLC EXECUTION] Dispatched {len(tickets)}/{MAX_SUB_TRADES} nano-trades on {symbol} (Tickets: {tickets})")

    return {
        "status": "SUCCESS",
        "symbol": symbol,
        "order_type": order_type_str,
        "volume_per_trade": trade.volume,
        "total_volume": round(trade.volume * len(tickets), 4),
        "requested_trades": MAX_SUB_TRADES,
        "executed_trades": len(tickets),
        "tickets": tickets,
        "price": price,
        "errors": errors if errors else None
    }

@app.post("/close_all")
def close_all_positions(req: Optional[CloseRequest] = None):
    """Liquidate positions matching magic or symbol (used for 10% target & risk balance rule)."""
    target_magic = req.magic if req and req.magic is not None else DEFAULT_MAGIC
    target_symbol = req.symbol if req else None
    reason = req.reason if req and req.reason else "Batch Liquidation"

    if target_symbol:
        positions = mt5.positions_get(symbol=target_symbol)
    else:
        positions = mt5.positions_get()

    if not positions:
        return {"status": "SUCCESS", "message": "No open positions found", "closed_count": 0, "closed_tickets": []}

    closed_tickets: List[int] = []
    for pos in positions:
        if target_magic is not None and pos.magic != target_magic:
            continue

        tick = mt5.symbol_info_tick(pos.symbol)
        if not tick:
            continue

        close_type = mt5.ORDER_TYPE_SELL if pos.type == mt5.POSITION_TYPE_BUY else mt5.ORDER_TYPE_BUY
        price = tick.bid if close_type == mt5.ORDER_TYPE_SELL else tick.ask

        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "position": pos.ticket,
            "symbol": pos.symbol,
            "volume": pos.volume,
            "type": close_type,
            "price": price,
            "deviation": 20,
            "magic": pos.magic,
            "comment": f"MCLLC_{reason[:15]}",
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        res = mt5.order_send(request)
        if res and res.retcode == mt5.TRADE_RETCODE_DONE:
            closed_tickets.append(pos.ticket)

    print(f"[MCLLC LIQUIDATION] Closed {len(closed_tickets)} positions. Reason: {reason}")
    return {
        "status": "SUCCESS",
        "reason": reason,
        "closed_count": len(closed_tickets),
        "closed_tickets": closed_tickets
    }

class ClosePositionRequest(BaseModel):
    ticket: int
    comment: Optional[str] = "Manual Close"

@app.post("/close_position")
def close_single_position(req: ClosePositionRequest):
    """Close an individual MT5 position by ticket number."""
    positions = mt5.positions_get(ticket=req.ticket)
    if not positions or len(positions) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Position #{req.ticket} not found on MT5 terminal"
        )
    pos = positions[0]
    tick = mt5.symbol_info_tick(pos.symbol)
    if not tick:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Cannot fetch price tick for {pos.symbol}"
        )
    close_type = mt5.ORDER_TYPE_SELL if pos.type == mt5.POSITION_TYPE_BUY else mt5.ORDER_TYPE_BUY
    price = tick.bid if close_type == mt5.ORDER_TYPE_SELL else tick.ask
    request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "position": pos.ticket,
        "symbol": pos.symbol,
        "volume": pos.volume,
        "type": close_type,
        "price": price,
        "deviation": 20,
        "magic": pos.magic,
        "comment": f"MCLLC_{req.comment[:15]}",
        "type_filling": mt5.ORDER_FILLING_IOC,
    }
    res = mt5.order_send(request)
    if not res or res.retcode != mt5.TRADE_RETCODE_DONE:
        err = res.comment if res else str(mt5.last_error())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to close position #{req.ticket}: {err}"
        )
    print(f"[MCLLC EXECUTION] Successfully closed position #{req.ticket} on {pos.symbol} @ {price}")
    return {
        "status": "SUCCESS",
        "ticket": pos.ticket,
        "symbol": pos.symbol,
        "closed_price": price
    }

if __name__ == "__main__":
    print(f"[MCLLC BRIDGE] Starting FastAPI server on port ${port}...")
    uvicorn.run(app, host="0.0.0.0", port=${port})
`;
}

export function getPythonScript(
  magicNumber = 998877,
  defaultLotSize = 0.05,
  maxSubTrades = 4,
  targetProfitPercent = 0.10,
  pollIntervalSec = 30.0
): string {
  const targetPercentFormatted = (targetProfitPercent * 100).toFixed(0);
  const profitPlaceholder = '{profit:.2f}';
  const subIdxPlaceholder = '{i+1}';
  const timePlaceholder = "{now_utc.strftime('%Y-%m-%d %H:%M:%S UTC')}";

  return `# ==============================================================================
# MCLLC MULTI-MARKET ALGORITHMIC TRADING BOT FOR MT5 (STANDALONE LOOP)
# Features: 30-sec polling, 4x 0.05 lot execution, 10% equity target,
#           Risk balancer (1 loss requires 2 profits), Asian session alerts,
#           FIB, FVG, iFVG, VIMB, MSS, RSI, Stochastic, MA analysis.
# ==============================================================================

import time
from datetime import datetime, timezone
import pandas as pd
import numpy as np

try:
    import MetaTrader5 as mt5
except ImportError:
    import subprocess
    subprocess.check_call(["pip", "install", "MetaTrader5", "pandas", "numpy"])
    import MetaTrader5 as mt5

MAGIC_NUMBER = ${magicNumber}
DEFAULT_LOT_SIZE = ${defaultLotSize}
MAX_SUB_TRADES = ${maxSubTrades}
TARGET_PROFIT_PERCENT = ${targetProfitPercent}  # ${targetPercentFormatted}% target
POLL_INTERVAL_SEC = ${pollIntervalSec}       # 30-second sub-candle evaluation loop

SYMBOLS = [
    "XAUUSD", "USDCAD", "AUDUSD", "US30", "DXY",
    "GBPUSD", "GBPJPY",
    "Volatility 100 Index", "Crash 500 Index", "Boom 1000 Index"
]

session_alerted = {"ASIAN": False}

def initialize_mt5():
    if not mt5.initialize():
        print(f"[ERROR] MT5 Initialization failed: {mt5.last_error()}")
        return False
    print("[SUCCESS] MCLLC MT5 Engine Successfully Connected.")
    return True

def check_asian_session_open():
    global session_alerted
    now_utc = datetime.now(timezone.utc)
    if now_utc.hour == 0 and not session_alerted["ASIAN"]:
        print(f"\\n[MCLLC ALERT] Asian Session Opened at ${timePlaceholder}")
        session_alerted["ASIAN"] = True
    elif now_utc.hour != 0:
        session_alerted["ASIAN"] = False

def calculate_indicators(df, rsi_period=14, stoch_k=14, stoch_d=3):
    delta = df['close'].diff()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)
    avg_gain = gain.ewm(alpha=1/rsi_period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1/rsi_period, adjust=False).mean()
    rs = avg_gain / (avg_loss + 1e-10)
    df['RSI'] = 100 - (100 / (1 + rs))

    lowest_low = df['low'].rolling(window=stoch_k).min()
    highest_high = df['high'].rolling(window=stoch_k).max()
    df['Stoch_K'] = 100 * ((df['close'] - lowest_low) / (highest_high - lowest_low + 1e-10))
    df['Stoch_D'] = df['Stoch_K'].rolling(window=stoch_d).mean()
    return df

def detect_institutional_structures(df):
    signals = {
        "bullish_fvg": False, "bearish_fvg": False,
        "ifvg_bullish": False, "ifvg_bearish": False,
        "vimb": False, "mss_bullish": False, "mss_bearish": False,
        "oversold": False, "overbought": False
    }
    if len(df) < 4:
        return signals

    c1, c2, c3, latest = df.iloc[-4], df.iloc[-3], df.iloc[-2], df.iloc[-1]

    if c3['low'] > c1['high']: signals["bullish_fvg"] = True
    elif c3['high'] < c1['low']: signals["bearish_fvg"] = True

    if signals["bearish_fvg"] and latest['close'] > c1['low']: signals["ifvg_bullish"] = True
    elif signals["bullish_fvg"] and latest['close'] < c1['high']: signals["ifvg_bearish"] = True

    if (c3['open'] > c2['close'] and c3['low'] <= c2['high']) or (c3['open'] < c2['close'] and c3['high'] >= c2['low']):
        signals["vimb"] = True

    prev_high = df['high'].iloc[-10:-2].max()
    prev_low = df['low'].iloc[-10:-2].min()
    if latest['close'] > prev_high: signals["mss_bullish"] = True
    elif latest['close'] < prev_low: signals["mss_bearish"] = True

    if latest['RSI'] < 30 and latest['Stoch_K'] < 20: signals["oversold"] = True
    elif latest['RSI'] > 70 and latest['Stoch_K'] > 80: signals["overbought"] = True

    return signals

def execute_orders(symbol, order_type):
    tick = mt5.symbol_info_tick(symbol)
    if not tick: return
    price = tick.ask if order_type == mt5.ORDER_TYPE_BUY else tick.bid
    
    for i in range(MAX_SUB_TRADES):
        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": symbol,
            "volume": DEFAULT_LOT_SIZE,
            "type": order_type,
            "price": price,
            "deviation": 20,
            "magic": MAGIC_NUMBER,
            "comment": f"MCLLC_Sub_${subIdxPlaceholder}",
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        mt5.order_send(request)
    print(f"[MCLLC EXECUTION] Dispatched {MAX_SUB_TRADES} nano-trades of {DEFAULT_LOT_SIZE} lots on {symbol}")

def monitor_and_manage():
    account = mt5.account_info()
    if not account: return
    profit = account.equity - account.balance

    if profit >= (account.balance * TARGET_PROFIT_PERCENT):
        print(f"[MCLLC TARGET] 10% Profit Target Hit (+$$${profitPlaceholder}). Liquidating all open positions.")
        close_all()
        return

    positions = mt5.positions_get(group=f"*{MAGIC_NUMBER}*")
    if not positions: return

    profitable = [p for p in positions if p.profit > 0]
    losing = [p for p in positions if p.profit < 0]

    if len(losing) >= 1 and len(profitable) >= 2 and sum(p.profit for p in positions) > 0:
        print("[MCLLC RISK RULE] 1 loss balanced by >=2 profits with net positive equity. Liquidating batch.")
        close_all()

def close_all():
    for pos in mt5.positions_get():
        tick = mt5.symbol_info_tick(pos.symbol)
        close_type = mt5.ORDER_TYPE_SELL if pos.type == mt5.POSITION_TYPE_BUY else mt5.ORDER_TYPE_BUY
        price = tick.bid if close_type == mt5.ORDER_TYPE_SELL else tick.ask
        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "position": pos.ticket,
            "symbol": pos.symbol,
            "volume": pos.volume,
            "type": close_type,
            "price": price,
            "deviation": 20,
            "magic": MAGIC_NUMBER,
            "comment": "MCLLC Batch Close",
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        mt5.order_send(request)

def main():
    if not initialize_mt5(): return
    print("==========================================================")
    print("      MCLLC INSTITUTIONAL TRADING ENGINE (30s LOOP)       ")
    print("==========================================================")
    try:
        while True:
            check_asian_session_open()
            monitor_and_manage()

            for symbol in SYMBOLS:
                mt5.symbol_select(symbol, True)
                rates = mt5.copy_rates_from_pos(symbol, mt5.TIMEFRAME_M1, 0, 30)
                if rates is None or len(rates) == 0: continue
                df = pd.DataFrame(rates)
                df['time'] = pd.to_datetime(df['time'], unit='s')
                df = calculate_indicators(df)
                
                signals = detect_institutional_structures(df)
                open_pos = mt5.positions_get(symbol=symbol)
                if not open_pos:
                    if signals["oversold"] and signals["mss_bullish"] and (signals["bullish_fvg"] or signals["ifvg_bullish"] or signals["vimb"]):
                        execute_orders(symbol, mt5.ORDER_TYPE_BUY)
                    elif signals["overbought"] and signals["mss_bearish"] and (signals["bearish_fvg"] or signals["ifvg_bearish"] or signals["vimb"]):
                        execute_orders(symbol, mt5.ORDER_TYPE_SELL)

            time.sleep(POLL_INTERVAL_SEC)
    except KeyboardInterrupt:
        print("[MCLLC SYSTEM] Shutting down bot gracefully.")
        mt5.shutdown()

if __name__ == "__main__":
    main()
`;
}
