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
  fetchAllETFQuotes,
  fetchSectorQuotes,
  fetchFXQuotes,
  fetchRegionQuotes,
  fetchHistorical,
  fetchVolatilityData,
  formatMarketCap,
  calculateRSI,
  signalFromRSI,
  SECTOR_ETF_MAP,
  FX_SYMBOL_MAP,
  REGION_ETF_MAP,
} from "./market-data";

// ─── helpers ─────────────────────────────────────────────────────────────────

function ytdStart(): Date {
  const d = new Date();
  d.setMonth(0, 1);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  market: router({
    // ── Read (cached) ─────────────────────────────────────────────────────
    etfPrices: publicProcedure.query(async () => getAllETFPrices()),
    regionalIndices: publicProcedure.query(async () => getAllRegionalIndices()),
    fxRates: publicProcedure.query(async () => getAllFXRates()),
    sectorData: publicProcedure.query(async () => getAllSectorData()),

    // ── Refresh ETFs ──────────────────────────────────────────────────────
    refreshETFData: publicProcedure.mutation(async () => {
      const quotes = await fetchAllETFQuotes();
      const results: { ticker: string; success: boolean; reason?: string }[] = [];

      for (const q of quotes) {
        try {
          // Fetch 5-day historical to compute 5D change
          const bars = await fetchHistorical(q.symbol, daysAgo(12));
          let d5Pct = 0;
          if (bars.length >= 6) {
            const recent = bars[bars.length - 1].close;
            const fiveBack = bars[Math.max(0, bars.length - 6)].close;
            if (fiveBack) d5Pct = ((recent - fiveBack) / fiveBack) * 100;
          }

          // Compute RSI from recent closes
          const closes = bars.map((b) => b.close);
          const rsi = closes.length >= 15 ? calculateRSI(closes) : 50;
          const signal = signalFromRSI(rsi);

          await upsertETFPrice({
            ticker:  q.symbol,
            name:    q.shortName || q.symbol,
            price:   q.price.toFixed(2),
            d1:      q.changePercent.toFixed(2),
            d5:      d5Pct.toFixed(2),
            ytd:     (q.ytdChangePercent ?? 0).toFixed(2),
            pe:      q.pe ? q.pe.toFixed(1) + "×" : "—",
            yld:     q.dividendYield ? (q.dividendYield * 100).toFixed(2) + "%" : "—",
            aum:     formatMarketCap(q.marketCap),
            signal,
            rsi,
            vol:     "—",
          });

          results.push({ ticker: q.symbol, success: true });
        } catch (err) {
          console.error(`[router] refreshETFData ${q.symbol}:`, err);
          results.push({ ticker: q.symbol, success: false, reason: String(err) });
        }
      }

      return results;
    }),

    // ── Refresh Regions ───────────────────────────────────────────────────
    refreshRegionalData: publicProcedure.mutation(async () => {
      const regionMeta: { code: string; name: string; region: string }[] = [
        { code: "US", name: "United States",  region: "DM" },
        { code: "CA", name: "Canada",          region: "DM" },
        { code: "UK", name: "United Kingdom",  region: "DM" },
        { code: "DE", name: "Germany",         region: "DM" },
        { code: "FR", name: "France",          region: "DM" },
        { code: "JP", name: "Japan",           region: "DM" },
        { code: "AU", name: "Australia",       region: "DM" },
        { code: "CH", name: "Switzerland",     region: "DM" },
        { code: "SE", name: "Sweden",          region: "DM" },
        { code: "SG", name: "Singapore",       region: "DM" },
        { code: "CN", name: "China",           region: "EM" },
        { code: "IN", name: "India",           region: "EM" },
        { code: "KR", name: "Korea",           region: "EM" },
        { code: "TW", name: "Taiwan",          region: "EM" },
        { code: "BR", name: "Brazil",          region: "EM" },
        { code: "MX", name: "Mexico",          region: "EM" },
        { code: "ZA", name: "South Africa",    region: "EM" },
        { code: "ID", name: "Indonesia",       region: "EM" },
      ];

      const quotes = await fetchRegionQuotes();
      const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

      for (const meta of regionMeta) {
        const etf = REGION_ETF_MAP[meta.name];
        const q = etf ? quoteMap.get(etf) : undefined;
        if (q) {
          await upsertRegionalIndex({
            code:   meta.code,
            name:   meta.name,
            d1:     q.changePercent.toFixed(2),
            region: meta.region,
          });
        }
      }

      return { success: true };
    }),

    // ── Refresh FX ────────────────────────────────────────────────────────
    refreshFXData: publicProcedure.mutation(async () => {
      const quotes = await fetchFXQuotes();

      // Build reverse map: yahoo symbol → display pair name
      const reverseMap: Record<string, string> = {};
      for (const [pair, sym] of Object.entries(FX_SYMBOL_MAP)) {
        reverseMap[sym] = pair;
      }

      for (const q of quotes) {
        const pair = reverseMap[q.symbol] ?? q.symbol;
        await upsertFXRate({
          pair,
          rate: q.price.toFixed(4),
          d1:   q.changePercent.toFixed(2),
        });
      }

      return { success: true };
    }),

    // ── Refresh Sectors ───────────────────────────────────────────────────
    refreshSectorData: publicProcedure.mutation(async () => {
      const quotes = await fetchSectorQuotes();

      // Reverse map: ETF symbol → sector label
      const reverseMap: Record<string, string> = {};
      for (const [sector, etf] of Object.entries(SECTOR_ETF_MAP)) {
        reverseMap[etf] = sector;
      }

      for (const q of quotes) {
        const sector = reverseMap[q.symbol] ?? q.symbol;
        await upsertSectorData({
          sector,
          value: q.changePercent.toFixed(2),
        });
      }

      return { success: true };
    }),

    // ── Volatility data ───────────────────────────────────────────────────
    volatility: publicProcedure.query(async () => {
      return await fetchVolatilityData();
    }),
  }),
});

export type AppRouter = typeof appRouter;
