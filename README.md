# The Observatory of World Exchange-Traded Funds

A sophisticated, real-time global ETF monitoring platform that faithfully recreates the Aesop ETF Observatory design system. This is a quiet instrument for watching capital move across latitudes — geographies, sectors, currencies, and the slow weather of correlation.

## Overview

The World ETFs Monitor Observatory is a comprehensive web application designed for institutional investors, portfolio managers, and market analysts who need to monitor global exchange-traded funds with precision and elegance. The application provides real-time data visualization, correlation analysis, and market intelligence across 14 major ETFs spanning developed markets, emerging markets, sectors, and asset classes.

### Core Philosophy

Built on the Aesop design system principles: cream backgrounds, ink-toned typography, serif fonts, and a commitment to visual clarity. Every panel, chart, and data point is carefully crafted to reveal patterns in global capital flows without overwhelming the observer.

## Key Features

### 1. **Real-Time ETF Monitoring**
- Live price quotes for 14 major ETFs: SPY, QQQ, IWM, ACWI, EFA, EEM, EWJ, MCHI, INDA, EWZ, EWG, EWU, TLT, GLD
- 1-day, 5-day, and year-to-date performance metrics
- Market cap, P/E ratios, dividend yields, and RSI indicators
- Auto-refresh every 60 seconds with live pulsing indicator
- Last-updated timestamp in meta bar

### 2. **Geographic Market Intelligence**
- **Equirectangular Map**: Color-coded nodes (green for gains, red for losses) showing real-time performance across 18 countries
- **Regional Indices**: Developed Markets, Emerging Markets, and Currency aggregates with 1D% changes
- **FX Rates Panel**: Real-time currency pairs (DXY, EUR/USD, GBP/USD, USD/JPY, USD/CNH, USD/INR, USD/BRL, USD/TRY)

### 3. **Advanced Visualizations**

#### Eight Proprietary Chart Types:
1. **6-Axis Radar Chart**: Regime analysis across GROWTH, INFLATION, RATES, CREDIT, USD, and OIL
2. **Exchange Orbit**: 24-hour UTC circular visualization of global exchange activity
3. **Volatility Phase Moon**: VIX, MOVE, and DXY volatility indicators in lunar phase representation
4. **Sector Rose**: Radial polar chart displaying 11 sector performance (TECH, COMM, DISC, FIN, INDU, MATS, ENER, HLTH, STAP, UTIL, REAL)
5. **Chladni Correlation Plate**: PCA-inspired visualization of ETF node relationships
6. **Liquidity Depth Cathedral**: Bid/ask depth visualization for market microstructure analysis
7. **Volatility Term Structure**: 1M-24M curve showing implied volatility across maturities
8. **Correlation Heatmap**: 14x14 matrix with red-to-green gradient showing 60-day return correlations

### 4. **Market Analytics**

#### Masthead Statistics:
- **Composite Breadth**: 70/100 advancers showing market participation
- **Global Dispersion**: σ regional metric indicating market synchronization
- **Liquidity Pulse**: $220B ADV showing aggregate daily volume

#### Right Rail Panels:
- **Connections**: Full correlation matrix with color-coded strength indicators
- **Strongest Links**: Top correlation pairs with values
- **Selected ETF Fundamentals**: Detailed metrics for highlighted instruments
- **Journal**: Contextual market news and headlines

### 5. **Responsive Design**

- **2-Column Balanced Layout**: Left column (charts/data), right column (analytics/news)
- **Compact Masthead**: Optimized typography and spacing
- **Independent Scrolling**: Each column scrolls independently
- **Aesop Design System**: Cream (#F1ECE0) backgrounds, ink (#1C1B17) typography, serif fonts (Cormorant Garamond)

## Technology Stack

### Frontend
- **React 19** with TypeScript for type-safe component development
- **Tailwind CSS 4** with custom Aesop design tokens
- **Recharts** for interactive data visualizations
- **Canvas API** for custom chart rendering (radar, orbit, moon, rose, Chladni, liquidity, volatility curve, heatmap)
- **tRPC React Query** for type-safe server communication

### Backend
- **Express.js** for HTTP server and API routing
- **tRPC 11** for end-to-end type-safe procedures
- **Drizzle ORM** for database operations
- **Yahoo Finance API** for real-time market data

### Database
- **MySQL/TiDB** for persistent storage of ETF prices, regional indices, FX rates, and sector data
- Schema includes tables for: etf_prices, regional_indices, fx_rates, sector_data

### Data Sources
- **Yahoo Finance**: Primary source for ETF quotes, historical data, and technical indicators
- Real-time updates with 60-second refresh interval
- Graceful fallback when API is unreachable

## Project Structure

```
world-etf-monitor/
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   └── Observatory.tsx       # Main Observatory component
│   │   ├── lib/
│   │   │   └── chartUtils.ts         # Canvas-based chart utilities
│   │   ├── styles/
│   │   │   └── aesop.css             # Aesop design system CSS
│   │   ├── App.tsx                   # Router and layout
│   │   └── main.tsx                  # React entry point
│   └── index.html
├── server/
│   ├── market-data.ts                # Yahoo Finance API integration
│   ├── routers.ts                    # tRPC procedure definitions
│   ├── db.ts                         # Database query helpers
│   └── _core/                        # Framework infrastructure
├── drizzle/
│   └── schema.ts                     # Database schema
├── shared/
│   └── market-types.ts               # Shared TypeScript types
└── package.json
```

## Installation & Setup

### Prerequisites
- Node.js 22.13.0 or higher
- pnpm 10.4.1 or higher
- MySQL/TiDB database connection

### Local Development

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Set Up Environment Variables**
   ```bash
   # .env file (auto-injected by Manus platform)
   DATABASE_URL=mysql://user:password@localhost:3306/world_etf_monitor
   VITE_APP_ID=your_oauth_app_id
   JWT_SECRET=your_jwt_secret
   ```

3. **Initialize Database**
   ```bash
   pnpm db:push
   ```

4. **Start Development Server**
   ```bash
   pnpm dev
   ```
   Server runs on http://localhost:3000

5. **Build for Production**
   ```bash
   pnpm build
   ```

## Usage Guide

### Main Observatory View

1. **Masthead**: Check composite breadth, dispersion, and liquidity metrics at a glance
2. **Navigation Tabs**: Switch between 9 sections (I-IX) for different data views
3. **Left Column**: 
   - ETF price table with 14 instruments
   - Sector performance heatmap
   - Geographic map with country nodes
   - Advanced charts (radar, orbit, moon, rose, etc.)
4. **Right Column**:
   - Correlation matrix heatmap
   - Strongest correlation pairs
   - Selected ETF fundamentals
   - Market news journal

### Data Refresh

- Auto-refresh every 60 seconds
- Live pulsing indicator shows when data is updating
- Manual refresh available via navigation
- Last updated timestamp in meta bar

### Interactive Features

- **Hover Over Correlations**: See exact correlation values
- **Click ETF Rows**: Select for detailed fundamentals display
- **Scroll Independently**: Left and right columns scroll separately
- **Color Coding**: Green (positive), Red (negative) for all performance metrics

## API Documentation

### tRPC Procedures

#### Market Data Procedures

**`market.getETFPrices()`**
- Returns real-time quotes for all 14 ETFs
- Fields: ticker, price, change1D, change5D, changeYTD, marketCap, pe, yield, rsi, signal

**`market.getRegionalIndices()`**
- Returns 18 country indices with 1D% changes
- Includes sparkline data for 20-day history

**`market.getFXRates()`**
- Returns 8 currency pairs with real-time rates
- Includes bid/ask spreads and 24h changes

**`market.getSectorData()`**
- Returns 11 sector ETF performance metrics
- Includes sector names, symbols, and percentage changes

**`market.getCompositeMetrics()`**
- Returns breadth, dispersion, and liquidity calculations
- Used for masthead statistics

## Design System

### Aesop Color Palette
- **Cream**: #F1ECE0 (primary background)
- **Paper**: #EAE3D2 (secondary background)
- **Ink**: #1C1B17 (primary text)
- **Ink-2**: #2E2C26 (secondary text)
- **Ink-3**: #5A574C (tertiary text)
- **Green**: #3B5A2A (positive indicator)
- **Red**: #8A2A1E (negative indicator)

### Typography
- **Serif**: Cormorant Garamond (titles, values)
- **Sans**: Inter (body text, labels)
- **Mono**: JetBrains Mono (data, metrics)

### Spacing & Layout
- 8px base unit for consistent spacing
- 2px border radius for subtle edges
- 1px borders for grid structure
- Cream background with subtle radial gradients

## Performance Optimization

- **Canvas-Based Charts**: Custom rendering for complex visualizations
- **Query Caching**: Minimal API calls with 60-second refresh interval
- **Lazy Loading**: Charts render only when visible
- **Responsive Images**: SVG-based geographic map
- **Efficient State Management**: tRPC with React Query for optimal data flow

## Testing

### Unit Tests
```bash
pnpm test
```

Test coverage includes:
- Market data fetching procedures
- Correlation calculations
- Chart utility functions
- Component rendering

### Integration Tests
- End-to-end data flow from Yahoo Finance to UI
- Database persistence verification
- API response handling

## Deployment

### Manus Platform (Recommended)
1. Save checkpoint: `webdev_save_checkpoint`
2. Click "Publish" button in Management UI
3. Custom domain configuration available in Settings

### External Hosting
- Build: `pnpm build`
- Output: `dist/` directory
- Requires Node.js runtime
- Environment variables must be set before deployment

## Troubleshooting

### Data Not Updating
- Check Yahoo Finance API connectivity
- Verify database connection string
- Review server logs for API errors
- Ensure 60-second refresh interval is running

### Charts Not Rendering
- Verify canvas element is in DOM
- Check browser console for JavaScript errors
- Ensure chart data is populated from API
- Try hard refresh (Ctrl+Shift+R)

### Layout Issues
- Clear browser cache
- Check CSS file is loaded (aesop.css)
- Verify viewport width is at least 1024px
- Test on Chrome, Firefox, Safari

## Future Enhancements

- **Real-Time WebSocket Updates**: Replace 60-second polling with live streaming
- **Portfolio Tracking**: User accounts with custom watchlists
- **Alert System**: Price and correlation threshold notifications
- **Advanced Analytics**: Machine learning for correlation prediction
- **Mobile Responsive**: Optimized mobile layout
- **Export Functionality**: CSV/PDF report generation
- **Dark Mode**: Alternative theme option

## Contributing

This project is maintained by the Manus team. For feature requests or bug reports, please contact support@manus.im.

## License

© 2026 Manus. All rights reserved.

## Support

For technical support, visit: https://help.manus.im

---

**The Observatory of World Exchange-Traded Funds** — A quiet instrument for watching capital move across latitudes, geographies, sectors, currencies, and the slow weather of correlation.
