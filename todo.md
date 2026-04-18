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
- [ ] Expand right rail width to match reference design
- [ ] Fill Connections section with full correlation heatmap (12x12 matrix)
- [ ] Populate Strongest Links with complete correlation pairs and values
- [ ] Expand Selected ETF fundamentals panel with all metrics
- [ ] Expand Journal section with full news feed
- [ ] Ensure right rail scrolls independently and fills entire height
- [ ] Add proper spacing and borders between right rail sections


## CRITICAL: Add Full Correlation Heatmap
- [x] Create 14x14 correlation matrix heatmap visualization
- [x] Add canvas-based heatmap rendering for Connections section
- [x] Fill the large white space in right rail with correlation data
- [x] Color gradient from red (negative) to green (positive correlation)
- [x] Add correlation scale legend to heatmap


## CRITICAL: Redesign Layout for Single-Page Glance
- [ ] Reduce grid from 3 columns to 2 columns (left/right balanced)
- [ ] Make all content fit in viewport without scrolling
- [ ] Compact masthead and stat blocks
- [ ] Reorganize center column: ETF table + sector grid side-by-side
- [ ] Move charts to bottom in 2-column grid layout
- [ ] Reduce right rail width, make it scrollable internally only
- [ ] Optimize font sizes and padding throughout
- [ ] Test on 1920px, 1440px, and 1024px widths
