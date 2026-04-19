# World ETFs Monitor

A real-time global ETF observatory. Tracks 14 equity, fixed income, and commodity ETFs across 20 countries, 11 sectors, and 8 currency pairs. Data is sourced live from Yahoo Finance and refreshed every 60 seconds.

---

## Sections

The application is organised into nine tabs accessible from the top navigation bar.

| Tab | Label | What It Shows |
|-----|-------|---------------|
| I | Observatory | Live geographic map, regime radar, ETF price table, sector grid, correlation heatmap, exchange orbit, volatility charts |
| II | Regions | Developed and emerging market country performance with sparklines and regional summaries |
| III | Sectors | 11 GICS sector performance bars and rotation table (1D / 5D / YTD) |
| IV | Factors | 8 factor ETF premia — Momentum, Quality, Value, Size, Low Volatility, Yield, Growth, ESG |
| V | Correlation | 14×14 Pearson correlation matrix, strongest pair links, rolling volatility curve |
| VI | Fundamentals | Per-ETF detail: P/E, P/B, dividend yield, AUM, expense ratio, fund flows |
| VII | Technicals | RSI, MA50/200, distance from 200d, MACD, Bollinger band position, trend signal for all 14 ETFs |
| VIII | Flows | 1W and 1M fund flows, short interest, institutional ownership, AUM change |
| IX | Journal | Market wire feed, 10-day economic calendar, market commentary |

---

## ETF Universe

**Broad Market:** SPY, QQQ, IWM, ACWI  
**Developed International:** EFA, EWJ, EWG, EWU  
**Emerging Markets:** EEM, MCHI, INDA, EWZ  
**Fixed Income:** TLT  
**Commodities:** GLD

---

## FX Pairs

DXY · EUR/USD · GBP/USD · USD/JPY · USD/CNH · USD/INR · USD/BRL · USD/TRY

---

## Data

All market data is fetched server-side from the Yahoo Finance public API. Results are cached in a MySQL database and served via tRPC. If Yahoo Finance is unreachable, the UI falls back to the most recently cached values and shows a stale-data indicator in the meta bar.

**Refresh cycle:** 60 seconds. The live indicator pulses during each refresh.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS 4, Canvas API |
| Backend | Express 4, tRPC 11 |
| Database | MySQL / TiDB via Drizzle ORM |
| Auth | Manus OAuth |
| Build | Vite 7, esbuild |
| Tests | Vitest |

---

## Project Structure

```
client/src/
  pages/
    Observatory.tsx   — Tab I: main dashboard
    TabViews.tsx      — Tabs II–IX: individual section views
  lib/
    chartUtils.ts     — Canvas drawing functions
    trpc.ts           — tRPC client
  styles/
    aesop.css         — Global stylesheet

server/
  routers.ts          — tRPC procedures
  market-data.ts      — Yahoo Finance integration
  db.ts               — Database helpers

drizzle/
  schema.ts           — Table definitions
```

---

## Local Development

**Requirements:** Node.js 22+, pnpm, a MySQL-compatible database.

```bash
pnpm install        # install dependencies
pnpm db:push        # apply schema migrations
pnpm dev            # start dev server on http://localhost:3000
pnpm build          # production build
pnpm test           # run unit tests
```

---

## Environment Variables

Injected automatically on the Manus platform. For local development, add a `.env` file at the project root.

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | MySQL connection string |
| `JWT_SECRET` | Session cookie signing key |
| `VITE_APP_ID` | Manus OAuth application ID |
| `OAUTH_SERVER_URL` | Manus OAuth backend URL |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal URL |
| `BUILT_IN_FORGE_API_KEY` | Server-side Manus API key |
| `VITE_FRONTEND_FORGE_API_KEY` | Client-side Manus API key |

---

## tRPC Procedures

| Procedure | Returns |
|-----------|---------|
| `market.getETFPrices` | Live quotes for all 14 ETFs (price, 1D%, 5D%, YTD%, AUM, P/E, yield, RSI, signal) |
| `market.getRegionalIndices` | 18 country indices with 1D% and sparkline history |
| `market.getFXRates` | 8 currency pairs with rates and 24h changes |
| `market.getSectorData` | 11 sector ETF performance metrics |
| `market.getCompositeMetrics` | Breadth, dispersion, and liquidity calculations for the masthead |
| `market.refresh` | Triggers an immediate data refresh from Yahoo Finance |

---

## Deployment

The application runs on the Manus hosting platform.

1. Save a checkpoint from the Management UI or via `webdev_save_checkpoint`.
2. Click **Publish** in the Management UI header.
3. The build compiles and deploys automatically.

Custom domains are configured under **Settings → Domains** in the Management UI.

---

## Known Limitations

- Yahoo Finance rate-limits unauthenticated requests. During high-traffic periods some tickers may temporarily show cached data.
- The correlation matrix uses 60-day rolling return windows from daily close prices. Intraday correlation is not available.
- The economic calendar and news wire in the Journal tab use static seed data. Live integration with a financial news API is a planned enhancement.

---

## License

MIT
