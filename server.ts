import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { db } from './src/db/index.ts';
import { users, tradingAccounts, tradeLogs, botSettings, chatMessages } from './src/db/schema.ts';
import { eq, desc } from 'drizzle-orm';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Server-side Gemini initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const QUANT_SYSTEM_INSTRUCTION = `You are the MCLLC Institutional Algorithmic Trading Bot & Quantitative Strategy Advisor.
You specialize in:
1. MetaTrader 5 (MT5) algorithmic execution and Python/MQL5 bridge mechanics.
2. ICT & Smart Money Concepts: Fair Value Gaps (Bullish & Bearish FVG), Inverted Fair Value Gaps (iFVG), Volume Imbalance (VIMB), Market Structure Shifts (MSS), and Fibonacci Retracement Optimal Trade Entry (OTE 50%, 61.8%, 70.5%, 78.6%).
3. The MCLLC Risk Balancing Rule: "1 loss balanced by >= 2 profits with net positive equity -> Batch Liquidation".
4. The 10% Equity Target Rule: Auto-liquidate and lock profits as soon as floating gains reach 10% of balance.
5. Asian Session Range & Open Alerts: Asian session opens at 00:00 UTC (Tokyo/Sydney range setup).
6. Multi-market coverage across 10 instruments: XAUUSD, USDCAD, AUDUSD, US30, DXY, GBPUSD, GBPJPY, Volatility 100 Index, Crash 500 Index, Boom 1000 Index.
7. Sub-lot scaling: Dispersing risk into 4 nano-trades of 0.05 lots each (0.20 lots total).

Provide quantitative, highly technical, and actionable trade management advice. Maintain a disciplined institutional mindset.`;

// ==========================================
// API ROUTES
// ==========================================

// 1. Sync User / Auth Profile
app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    
    // Retrieve trading account
    const accounts = await db
      .select()
      .from(tradingAccounts)
      .where(eq(tradingAccounts.userId, dbUser.id));

    // Retrieve bot settings
    const settings = await db
      .select()
      .from(botSettings)
      .where(eq(botSettings.userId, dbUser.id));

    res.json({
      user: dbUser,
      account: accounts[0] || null,
      settings: settings[0] || null,
    });
  } catch (error: any) {
    console.error('Error syncing auth profile:', error);
    res.status(500).json({ error: error.message || 'Failed to sync user' });
  }
});

// 2. Get Trading Account
app.get('/api/account', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const accounts = await db
      .select()
      .from(tradingAccounts)
      .where(eq(tradingAccounts.userId, dbUser.id));

    if (accounts.length === 0) {
      return res.status(404).json({ error: 'Trading account not found' });
    }
    res.json(accounts[0]);
  } catch (error: any) {
    console.error('Error fetching account:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch account' });
  }
});

// 3. Update Trading Account State
app.post('/api/account', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const { balance, equity, liquidationsCount, riskLiquidationsCount, totalRealizedProfit } = req.body;

    const updated = await db
      .update(tradingAccounts)
      .set({
        balance: balance !== undefined ? Number(balance) : undefined,
        equity: equity !== undefined ? Number(equity) : undefined,
        liquidationsCount: liquidationsCount !== undefined ? Number(liquidationsCount) : undefined,
        riskLiquidationsCount: riskLiquidationsCount !== undefined ? Number(riskLiquidationsCount) : undefined,
        totalRealizedProfit: totalRealizedProfit !== undefined ? Number(totalRealizedProfit) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(tradingAccounts.userId, dbUser.id))
      .returning();

    res.json(updated[0]);
  } catch (error: any) {
    console.error('Error updating account:', error);
    res.status(500).json({ error: error.message || 'Failed to update account' });
  }
});

// 4. Get Trade Logs
app.get('/api/trades', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const trades = await db
      .select()
      .from(tradeLogs)
      .where(eq(tradeLogs.userId, dbUser.id))
      .orderBy(desc(tradeLogs.createdAt))
      .limit(50);

    res.json(trades);
  } catch (error: any) {
    console.error('Error fetching trades:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch trade logs' });
  }
});

// 5. Post Trade Log
app.post('/api/trades', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const { symbol, orderType, volume, subTradesCount, openPrice, closePrice, profitUsd, magicNumber, reason, batchId } = req.body;

    const inserted = await db
      .insert(tradeLogs)
      .values({
        userId: dbUser.id,
        symbol,
        orderType,
        volume: Number(volume || 0.05),
        subTradesCount: Number(subTradesCount || 4),
        openPrice: Number(openPrice),
        closePrice: closePrice !== undefined ? Number(closePrice) : null,
        profitUsd: Number(profitUsd || 0),
        magicNumber: Number(magicNumber || 998877),
        reason: reason || null,
        batchId: batchId || null,
      })
      .returning();

    res.json(inserted[0]);
  } catch (error: any) {
    console.error('Error recording trade:', error);
    res.status(500).json({ error: error.message || 'Failed to record trade' });
  }
});

// 6. Get Bot Settings
app.get('/api/settings', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const settings = await db
      .select()
      .from(botSettings)
      .where(eq(botSettings.userId, dbUser.id));

    res.json(settings[0] || null);
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch settings' });
  }
});

// 7. Update Bot Settings
app.post('/api/settings', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const { pollIntervalSec, defaultLotSize, maxSubTrades, targetProfitPercent, magicNumber, autoExecute, soundAlerts } = req.body;

    const updated = await db
      .update(botSettings)
      .set({
        pollIntervalSec: pollIntervalSec !== undefined ? Number(pollIntervalSec) : undefined,
        defaultLotSize: defaultLotSize !== undefined ? Number(defaultLotSize) : undefined,
        maxSubTrades: maxSubTrades !== undefined ? Number(maxSubTrades) : undefined,
        targetProfitPercent: targetProfitPercent !== undefined ? Number(targetProfitPercent) : undefined,
        magicNumber: magicNumber !== undefined ? Number(magicNumber) : undefined,
        autoExecute: autoExecute !== undefined ? Boolean(autoExecute) : undefined,
        soundAlerts: soundAlerts !== undefined ? Boolean(soundAlerts) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(botSettings.userId, dbUser.id))
      .returning();

    res.json(updated[0]);
  } catch (error: any) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: error.message || 'Failed to update settings' });
  }
});

// 8. Get Chat History
app.get('/api/chat/history', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const history = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, dbUser.id))
      .orderBy(chatMessages.createdAt)
      .limit(60);

    res.json(history);
  } catch (error: any) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch chat history' });
  }
});

// 9. Multi-turn Chat Endpoint using Gemini SDK & Cloud SQL persistence
app.post('/api/chat', requireAuth, async (req: AuthRequest, res) => {
  try {
    const dbUser = req.dbUser!;
    const { message, model = 'gemini-3.8-flash' } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message text is required' });
    }

    // Allowed model aliases
    const validModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-4-argon'];
    const chosenModel = validModels.includes(model) ? model : 'gemini-3.8-flash';

    // 1. Fetch previous conversation history for this user
    const previousMessages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, dbUser.id))
      .orderBy(chatMessages.createdAt)
      .limit(20);

    // 2. Persist user message to Cloud SQL
    await db.insert(chatMessages).values({
      userId: dbUser.id,
      role: 'user',
      content: message,
      modelUsed: chosenModel,
    });

    // 3. Format message history for Gemini multi-turn format
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    previousMessages.forEach((msg) => {
      contents.push({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    });

    // Add current user turn
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    // 4. Call Gemini API on server
    const response = await ai.models.generateContent({
      model: chosenModel,
      contents,
      config: {
        systemInstruction: QUANT_SYSTEM_INSTRUCTION,
      },
    });

    const modelReply = response.text || 'No response generated.';

    // 5. Persist assistant reply to Cloud SQL
    const insertedReply = await db
      .insert(chatMessages)
      .values({
        userId: dbUser.id,
        role: 'model',
        content: modelReply,
        modelUsed: chosenModel,
      })
      .returning();

    res.json({
      reply: modelReply,
      messageRecord: insertedReply[0],
    });
  } catch (error: any) {
    console.error('Error generating chat response:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate response from Gemini API',
    });
  }
});

// ==========================================
// 10. DERIV MT5 FASTAPI BRIDGE PROXY ENDPOINTS
// ==========================================

// Helper to normalize bridge target URL
function getTargetUrl(req: express.Request): string {
  const queryUrl = req.query.bridgeUrl as string;
  const bodyUrl = req.body?.bridgeUrl as string;
  const rawUrl = queryUrl || bodyUrl || process.env.DERIV_BRIDGE_URL || 'http://127.0.0.1:8000';
  return rawUrl.replace(/\/+$/, '');
}

// Ping / Health Check Bridge
app.get('/api/bridge/health', async (req, res) => {
  const bridgeUrl = getTargetUrl(req);
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`${bridgeUrl}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const latencyMs = Date.now() - startTime;
    if (!response.ok) {
      return res.status(response.status).json({
        connected: false,
        latencyMs,
        error: `Bridge returned status ${response.status}`,
      });
    }

    const data = await response.json();
    res.json({
      connected: true,
      latencyMs,
      bridgeUrl,
      ...data,
    });
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    res.status(503).json({
      connected: false,
      latencyMs,
      bridgeUrl,
      error: error.name === 'AbortError' ? 'Connection timed out (4s)' : (error.message || 'Unable to connect to bridge'),
    });
  }
});

// Fetch Live Deriv Account info
app.get('/api/bridge/account', async (req, res) => {
  const bridgeUrl = getTargetUrl(req);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`${bridgeUrl}/account`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(503).json({ error: error.message || 'Failed to fetch MT5 account info' });
  }
});

// Fetch Live Open Positions from MT5
app.get('/api/bridge/positions', async (req, res) => {
  const bridgeUrl = getTargetUrl(req);
  const symbol = req.query.symbol as string;
  const magic = req.query.magic as string;

  try {
    const params = new URLSearchParams();
    if (symbol) params.append('symbol', symbol);
    if (magic) params.append('magic', magic);

    const endpoint = `${bridgeUrl}/positions${params.toString() ? `?${params.toString()}` : ''}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(503).json({ error: error.message || 'Failed to fetch MT5 positions' });
  }
});

// Execute Nano-Trades on Deriv MT5
app.post('/api/bridge/execute', async (req, res) => {
  const bridgeUrl = getTargetUrl(req);
  const { symbol, volume, order_type, magic, deviation, comment } = req.body;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${bridgeUrl}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol,
        volume: volume || 0.05,
        order_type,
        magic: magic || 998877,
        deviation: deviation || 20,
        comment: comment || 'MCLLC Nano-Trade',
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(503).json({ error: error.message || 'Failed to execute nano-trades on Deriv MT5' });
  }
});

// Close All / Batch Liquidation
app.post('/api/bridge/close-all', async (req, res) => {
  const bridgeUrl = getTargetUrl(req);
  const { symbol, magic, reason } = req.body;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${bridgeUrl}/close_all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: symbol || null,
        magic: magic || 998877,
        reason: reason || 'Batch Liquidation',
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(503).json({ error: error.message || 'Failed to liquidate positions on Deriv MT5' });
  }
});

// Close Single Position on Deriv MT5
app.post('/api/bridge/close-position', async (req, res) => {
  const bridgeUrl = getTargetUrl(req);
  const { ticket, comment } = req.body;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${bridgeUrl}/close_position`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticket: Number(ticket),
        comment: comment || 'Manual Close',
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(503).json({ error: error.message || 'Failed to close position on Deriv MT5' });
  }
});

// ==========================================
// VITE DEV SERVER / STATIC ASSETS
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
