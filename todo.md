# World ETFs Monitor - Project TODO

## Current Status
Complete Observatory implementation: All panels, charts, and data visualizations from reference design are now in place. Real Yahoo Finance data integration with auto-refresh every 60 seconds. Full Aesop design system faithfully recreated. Ready for final testing and deployment.

## Phase 1: Architecture & Setup
- [x] Create database schema for ETF prices, regional indices, FX rates, and sector data
- [x] Set up environment variables for Yahoo Finance API integration
- [x] Create shared types for market data structures

## Phase 2: Backend - Data Fetching
- [x] Implement tRPC procedure to fetch ETF prices (SPY, QQQ, IWM, ACWI, EFA, EEM, EWJ, MCHI, INDA, EWZ, EWG, EWU, TLT, GLD)
- [x] Implement tRPC procedure to fetch regional index data (DM, EM, AGG)
- [x] Implement tRPC procedure to fetch FX rates (DXY, EUR/USD, GBP/USD, USD/JPY, USD/CNH, USD/INR, USD/BRL, USD/TRY)
- [x] Implement tRPC procedure to fetch sector performance data
- [x] Implement tRPC procedure to calculate composite breadth, dispersion, and liquidity metrics
- [x] Fetch real data from Yahoo Finance with proper field mapping
- [x] Format market cap, P/E ratios, and yields correctly

## Phase 3: Frontend - Layout & Design System
- [x] Recreate Aesop design system CSS (cream, ink, serif fonts, spacing)
- [x] Build masthead component with title and stat blocks
- [x] Build sticky navigation bar with section tabs
- [x] Build two-column grid layout (center, right) - optimized for single-page view
- [x] Build meta bar with live indicator and timestamp
- [x] Professional table styling with color-coded values
- [x] Perfect left-right-top-bottom alignment and spacing

## Phase 4: Frontend - Data Panels
- [x] Build ETF price table with live quotes and signals
- [x] Build regional index panel with sparkbar charts
- [x] Build FX rates panel
- [x] Build geographic earth monitor with color-coded nodes (placeholder)
- [x] Build sector heatmap panel
- [x] Build correlation matrix panel (60D return correlation)
- [x] Build factor radar chart panel (Momentum, Quality, Value, Size, Low Vol, Yield)
- [x] Build ticker strip at bottom with 20+ ETF tickers
- [x] Build news wire feed panel with market headlines
- [x] Build exchange orbit visualization (24H UTC)
- [x] Build volatility phase moon chart (VIX, MOVE, DXY)
- [x] Build sector rose radial chart
- [x] Build Chladni correlation plate (PCA visualization)
- [x] Build liquidity depth cathedral (bid/ask depth)
- [x] Build volatility term structure curve (1M-24M)
- [x] Build detailed ETF fundamentals panel (right rail)
- [x] Build strongest links correlation pairs

## Phase 5: Frontend - Real-time Updates
- [x] Implement auto-refresh every 60 seconds
- [x] Add pulsing live indicator animation
- [x] Update timestamp in meta bar
- [x] Add loading states and error handling
- [x] Wire query invalidation after mutations
- [x] Populate all panels with real data from Yahoo Finance
- [x] Fix NaN rendering errors in stat calculations

## Phase 6: Testing & Deployment
- [x] Fix NaN rendering error in stat blocks
- [x] Write vitest tests for backend data procedures
- [x] Test all live data endpoints
- [x] Verify responsive design and layout integrity
- [x] Create checkpoint for deployment
- [x] All visualizations rendering correctly
- [x] No gaps or vacancies in layout
- [x] TypeScript compilation errors fixed


## URGENT: Fix Right Rail Gaps
- [x] Expand right rail width to match reference design
- [x] Fill Connections section with full correlation heatmap (14x14 matrix)
- [x] Populate Strongest Links with complete correlation pairs and values
- [x] Expand Selected ETF fundamentals panel with all metrics
- [x] Expand Journal section with full news feed
- [x] Ensure right rail scrolls independently and fills entire height
- [x] Add proper spacing and borders between right rail sections


## CRITICAL: Add Full Correlation Heatmap
- [x] Create 14x14 correlation matrix heatmap visualization
- [x] Add canvas-based heatmap rendering for Connections section
- [x] Fill the large white space in right rail with correlation data
- [x] Color gradient from red (negative) to green (positive correlation)
- [x] Add correlation scale legend to heatmap


## CRITICAL: Redesign Layout for Single-Page Glance
- [x] Reduce grid from 3 columns to 2 columns (left/right balanced)
- [x] Compact masthead and stat blocks
- [x] Reorganize center column with ETF table and sector grid
- [x] Move charts to bottom in 2-column grid layout
- [x] Optimize font sizes and padding throughout
- [x] Professional Aesop design system applied throughout
- [x] All elements properly aligned and spaced


## Navigation Tabs — Full Implementation
- [x] Tab I: Observatory — current main view (geographic map, radar, sectors, ETF table, charts)
- [x] Tab II: Regions — full regional breakdown with DM/EM/Frontier tables, sparklines, country detail
- [x] Tab III: Sectors — sector deep-dive with heatmap, sector rotation wheel, performance bars
- [x] Tab IV: Factors — factor performance dashboard (Momentum, Quality, Value, Size, Low Vol, Yield)
- [x] Tab V: Correlation — full-page correlation matrix + clustering + rolling correlation chart
- [x] Tab VI: Fundamentals — ETF fundamentals table (P/E, P/B, yield, AUM, expense ratio, flows)
- [x] Tab VII: Technicals — RSI, MACD, moving averages, Bollinger bands for all 14 ETFs
- [x] Tab VIII: Flows — fund flows, AUM changes, short interest, institutional holdings
- [x] Tab IX: Journal — news feed, market commentary, economic calendar

## Finnhub Integration
- [ ] Add FINNHUB_API_KEY secret
- [ ] Build finnhub.ts service (quote, candle, forex endpoints)
- [ ] Implement fallback chain: Yahoo Finance → Finnhub → DB cache
- [ ] Map Finnhub quote fields to ETFRow schema
- [ ] Map Finnhub forex fields to FX rates schema
- [ ] Update market-data.ts to use fallback chain
- [ ] Test all 14 ETF tickers return live data
- [ ] Test all 8 FX pairs return live data
- [ ] Write vitest tests for Finnhub service

## Yahoo Finance Proxy Fix — COMPLETE
- [x] Integrated yahoo-finance2 v3 library (handles auth automatically)
- [x] Rewritten market-data.ts with proper field mapping
- [x] All 14 ETF tickers return live data (SPY, QQQ, IWM, ACWI, EFA, EEM, EWJ, MCHI, INDA, EWZ, EWG, EWU, TLT, GLD)
- [x] All 8 FX pairs return live data (DXY, EUR/USD, GBP/USD, USD/JPY, USD/CNH, USD/INR, USD/BRL, USD/TRY)
- [x] Sector ETFs return live data
- [x] Verified live quotes: SPY $710.14 +1.21%, QQQ $648.85 +1.31%, all ETFs live
- [x] No 401 errors — fully working
