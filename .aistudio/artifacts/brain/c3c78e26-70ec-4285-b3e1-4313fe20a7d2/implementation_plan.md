# Deriv MT5 FastAPI Algorithmic Bridge Integration & Web Terminal Workstation

Integrate the user's Deriv MT5 FastAPI bridge server into the MCLLC Algorithmic Trading Station, provide a complete MT5 Web Terminal and PWA installable application, and make the workspace fully production-ready for live trading on Deriv-Demo and Deriv-Server.

### User Review & Completed Decisions

> [!NOTE]
> All phases of the implementation plan have been completed and verified with clean builds (`compile_applet` and `lint_applet` passing with 0 errors).

- **Confirmed Decision 1**: Adopt the user's FastAPI architecture (`MetaTrader5` + `FastAPI` + `pydantic` + `uvicorn`) with 4x nano-trades loop (`MAX_SUB_TRADES = 4`, `DEFAULT_LOT_SIZE = 0.05`).
- **Confirmed Decision 2**: Expand the bridge with production endpoints: `/execute`, `/positions`, `/account`, `/close_all`, `/close_position`, and `/health` for complete MCLLC risk balancer and 10% equity target enforcement.
- **Confirmed Decision 3**: Provide both an in-app bridge connection manager (live dispatch toggle + health ping) and a full export suite (Python script, `requirements.txt`, launch guide).
- **Confirmed Decision 4**: Provide a native MT5 Web Terminal (Market Watch, Navigator, Canvas Chart with multi-timeframe candle/bar/line views, 1-Click Trading, F9 Order Ticket, and MT5 Toolbox).
- **Confirmed Decision 5**: Provide PWA installability with web app manifest, standard icons (192x192, 512x512 maskable, apple-touch-icon, svg), and in-app install prompt.
- **Confirmed Decision 6**: Removed all dummy demo information (dummy credentials `10023456`, placeholder passwords, "Simulate Asian Open", mock logs), replacing them with persistent workspace credentials, live account & position polling, and real UTC financial session tracking.

---

### Implementation Progress Summary

- [x] **Phase 1: Deriv MT5 FastAPI Bridge Integration**
  - Updated `src/utils/pythonScriptTemplate.ts` with `getDerivFastApiBridgeScript()` including CORS, `/health`, `/account`, `/positions`, `/execute` (4x nano-trades), `/close_all`, and `/close_position`.
  - Added Express proxy endpoints in `server.ts` (`/api/bridge/*`).
  - Added live ping, diagnostic testing, and test trade dispatch in `src/components/Mt5BridgeModal.tsx`.
  - Persisted user credentials in `localStorage` (`mcllc_bridge_credentials`).

- [x] **Phase 2: MT5 Web Terminal Workstation**
  - Created `src/components/Mt5WebTerminal.tsx` with:
    - Market Watch panel with real-time streaming bid/ask quotes and spreads for all 10 instruments.
    - Multi-timeframe canvas charting (M1, M5, M15, M30, H1, H4, D1) supporting Candlesticks, Bar charts, and Line charts.
    - One-Click Trading widget (1-click Instant Buy/Sell, Volume selector, dynamic spreads).
    - F9 Order Ticket Modal for Market Execution and Pending Orders (Buy Limit, Sell Limit, Buy Stop, Sell Stop) with SL/TP inputs.
    - Full MT5 Toolbox with Trade (open positions), Exposure (currency/asset exposure breakdown), History, and Journal tabs.
    - Navigator with Accounts and Technical Indicators.

- [x] **Phase 3: PWA Installable App Configuration**
  - Configured `vite-plugin-pwa` in `vite.config.ts` and `tsconfig.json`.
  - Added web manifest, viewport, and theme meta tags to `index.html`.
  - Created high-resolution PWA icons (`public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/apple-touch-icon.png`, `public/icon.svg`).
  - Implemented `src/hooks/usePWAInstall.ts` and responsive `src/components/PWAInstallButton.tsx`.

- [x] **Phase 4: Workspace Production Hardening & Demo Removal**
  - Removed dummy demo logins (`10023456`, placeholder passwords).
  - Replaced simulated Asian session controls with real UTC session indicators (Tokyo/Asia, London, New York) and 00:00 UTC alerts.
  - Connected live Deriv MT5 position polling and individual ticket closure directly to the bridge.
  - Ensured dynamic calculation of 10% target thresholds without hardcoded values.
  - Verified compilation and linting (`compile_applet` and `lint_applet` pass with 0 errors).
