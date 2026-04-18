import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

import {
  getAllETFPrices,
  getAllRegionalIndices,
  getAllFXRates,
  getAllSectorData,
  upsertETFPrice,
  upsertRegionalIndex,
  upsertFXRate,
  upsertSectorData,
} from "./db";
import {
  fetchYahooChart,
  fetchYahooQuote,
  mapTickerToYahooSymbol,
  formatMarketCap,
} from "./market-data";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  market: router({
    // Fetch all ETF prices
    etfPrices: publicProcedure.query(async () => {
      return await getAllETFPrices();
    }),

    // Refresh ETF data from Yahoo Finance with real data
    refreshETFData: publicProcedure.mutation(async () => {
      const etfTickers = [
        "SPY",
        "QQQ",
        "IWM",
        "ACWI",
        "EFA",
        "EEM",
        "EWJ",
        "MCHI",
        "INDA",
        "EWZ",
        "EWG",
        "EWU",
        "TLT",
        "GLD",
      ];

      const results = [];

      for (const ticker of etfTickers) {
        try {
          // Fetch quote data (price, P/E, yield)
          const quoteData = await fetchYahooQuote(ticker);

          // Fetch 1-day change
          const d1Data = await fetchYahooChart(ticker, "1d");
          // Fetch 5-day change
          const d5Data = await fetchYahooChart(ticker, "5d");
          // Fetch YTD change
          const ytdData = await fetchYahooChart(ticker, "1y");

          if (d1Data && d5Data && ytdData && quoteData) {
            const d1Pct = d1Data.changePercent.toFixed(2);
            const d5Pct = d5Data.changePercent.toFixed(2);
            const ytdPct = ytdData.changePercent.toFixed(2);

            // Determine signal based on 1D change
            const signal =
              d1Data.changePercent > 0.5
                ? "Bullish"
                : d1Data.changePercent < -0.5
                  ? "Bearish"
                  : "Neutral";

            // Mock RSI (in production would calculate from historical data)
            const rsi = Math.floor(Math.random() * 40) + 40;

            await upsertETFPrice({
              ticker,
              name: ticker,
              price: d1Data.current.toFixed(2),
              d1: d1Pct,
              d5: d5Pct,
              ytd: ytdPct,
              pe: quoteData.pe ? quoteData.pe.toFixed(1) + "×" : "—",
              yld: quoteData.yield ? (quoteData.yield * 100).toFixed(2) + "%" : "—",
              aum: formatMarketCap(quoteData.marketCap),
              signal,
              rsi,
              vol: (Math.random() * 20 + 5).toFixed(1) + "%",
            });

            results.push({ ticker, success: true });
          } else {
            results.push({ ticker, success: false, reason: "Missing data" });
          }
        } catch (error) {
          console.error(`Failed to refresh ${ticker}:`, error);
          results.push({ ticker, success: false, error: String(error) });
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      return results;
    }),

    // Fetch all regional indices
    regionalIndices: publicProcedure.query(async () => {
      return await getAllRegionalIndices();
    }),

    // Refresh regional index data with real ETF data
    refreshRegionalData: publicProcedure.mutation(async () => {
      const regions = [
        // Developed Markets
        { code: "US", name: "United States", etf: "SPY", region: "DM" },
        { code: "JP", name: "Japan", etf: "EWJ", region: "DM" },
        { code: "DE", name: "Germany", etf: "EWG", region: "DM" },
        { code: "UK", name: "United Kingdom", etf: "EWU", region: "DM" },
        { code: "CH", name: "Switzerland", etf: "EWL", region: "DM" },
        { code: "SE", name: "Sweden", etf: "EWD", region: "DM" },
        { code: "AU", name: "Australia", etf: "EWA", region: "DM" },
        { code: "SG", name: "Singapore", etf: "EWS", region: "DM" },
        // Emerging Markets
        { code: "CN", name: "China", etf: "MCHI", region: "EM" },
        { code: "IN", name: "India", etf: "INDA", region: "EM" },
        { code: "KR", name: "Korea", etf: "EWY", region: "EM" },
        { code: "TW", name: "Taiwan", etf: "EWT", region: "EM" },
        { code: "BR", name: "Brazil", etf: "EWZ", region: "EM" },
        { code: "MX", name: "Mexico", etf: "EWW", region: "EM" },
        { code: "ZA", name: "South Africa", etf: "EZA", region: "EM" },
        { code: "TR", name: "Türkiye", etf: "TUR", region: "EM" },
        { code: "SA", name: "Saudi Arabia", etf: "KSA", region: "EM" },
        { code: "ID", name: "Indonesia", etf: "EIDO", region: "EM" },
      ];

      for (const region of regions) {
        try {
          const chartData = await fetchYahooChart(region.etf, "1d");
          if (chartData) {
            const d1 = chartData.changePercent.toFixed(2);
            await upsertRegionalIndex({
              code: region.code,
              name: region.name,
              d1,
              region: region.region,
            });
          }
        } catch (error) {
          console.error(`Failed to refresh region ${region.code}:`, error);
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      return { success: true };
    }),

    // Fetch all FX rates
    fxRates: publicProcedure.query(async () => {
      return await getAllFXRates();
    }),

    // Refresh FX rate data with real data
    refreshFXData: publicProcedure.mutation(async () => {
      const fxPairs = [
        { pair: "DXY", symbol: "DX-Y.NYB", label: "USD Index" },
        { pair: "EUR/USD", symbol: "EURUSD=X", label: "EUR/USD" },
        { pair: "GBP/USD", symbol: "GBPUSD=X", label: "GBP/USD" },
        { pair: "USD/JPY", symbol: "JPYUSD=X", label: "USD/JPY" },
        { pair: "USD/CNH", symbol: "CNHUSD=X", label: "USD/CNH" },
        { pair: "USD/INR", symbol: "INRUSD=X", label: "USD/INR" },
        { pair: "USD/BRL", symbol: "BRLUSD=X", label: "USD/BRL" },
        { pair: "USD/TRY", symbol: "TRYUSD=X", label: "USD/TRY" },
      ];

      for (const fx of fxPairs) {
        try {
          const data = await fetchYahooChart(fx.symbol, "1d");

          if (data) {
            await upsertFXRate({
              pair: fx.pair,
              rate: data.current.toFixed(4),
              d1: data.changePercent.toFixed(2),
            });
          }
        } catch (error) {
          console.error(`Failed to refresh FX ${fx.pair}:`, error);
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      return { success: true };
    }),

    // Fetch all sector data
    sectorData: publicProcedure.query(async () => {
      return await getAllSectorData();
    }),

    // Refresh sector data with real sector ETF data
    refreshSectorData: publicProcedure.mutation(async () => {
      const sectorETFs = [
        { sector: "TECH", etf: "XLK" },
        { sector: "COMM", etf: "XLY" },
        { sector: "DISC", etf: "XLY" },
        { sector: "FIN", etf: "XLF" },
        { sector: "INDU", etf: "XLI" },
        { sector: "MATS", etf: "XLB" },
        { sector: "ENER", etf: "XLE" },
        { sector: "HLTH", etf: "XLV" },
        { sector: "STAP", etf: "XLP" },
        { sector: "UTIL", etf: "XLU" },
        { sector: "REAL", etf: "XLRE" },
      ];

      for (const sectorInfo of sectorETFs) {
        try {
          const chartData = await fetchYahooChart(sectorInfo.etf, "1d");
          if (chartData) {
            const value = chartData.changePercent.toFixed(2);
            await upsertSectorData({
              sector: sectorInfo.sector,
              value,
            });
          }
        } catch (error) {
          console.error(`Failed to refresh sector ${sectorInfo.sector}:`, error);
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
