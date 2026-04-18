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
- [x] Build three-column grid layout (left rail, center, right)
- [x] Build meta bar with live indicator and timestamp

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
- [ ] Implement flash animations for price changes (up/down colors)

## Phase 6: Testing & Deployment
- [ ] Write vitest tests for backend data procedures
- [ ] Test all live data endpoints
- [ ] Verify responsive design and layout integrity
- [ ] Create checkpoint for deployment
