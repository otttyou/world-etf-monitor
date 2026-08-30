/**
 * Market data fetching service using yahoo-finance2 v3
 * Uses the yahoo-finance2 npm package which handles Yahoo Finance auth (crumb/cookie) automatically.
 * All 14 ETF tickers and 8 FX pairs are fetched with correct field mappings.
 */

// Dynamic import for ESM-only yahoo-finance2
let _yf: any = null;
async function getYF() {
  if (!_yf) {
    const mod = await import("yahoo-finance2");
    const YahooFinance = mod.default;
    _yf = new YahooFinance({ suppressNotices: ["yahooSurvey", "ripHistorical"] });
  }
  return _yf;
}

// ─── Ticker maps ────────────────────────────────────────────────────────────

export const ETF_TICKERS = [
  "SPY", "QQQ", "IWM", "ACWI", "EFA", "EEM",
  "EWJ", "MCHI", "INDA", "EWZ", "EWG", "EWU", "TLT", "GLD",
];

export const SECTOR_ETF_MAP: Record<string, string> = {
  TECH: "XLK", COMM: "XLC", DISC: "XLY", FIN: "XLF",
  INDU: "XLI", MATS: "XLB", ENER: "XLE", HLTH: "XLV",
  STAP: "XLP", UTIL: "XLU", REAL: "XLRE",
};

export const FX_SYMBOL_MAP: Record<string, string> = {
  "DXY":     "DX-Y.NYB",
  "EUR/USD": "EURUSD=X",
  "GBP/USD": "GBPUSD=X",
  "USD/JPY": "JPY=X",
  "USD/CNH": "CNH=X",
  "USD/INR": "INR=X",
  "USD/BRL": "BRL=X",
  "USD/TRY": "TRY=X",
};

export const FACTOR_ETF_MAP: Record<string, string> = {
  Momentum: "MTUM",
  Quality: "QUAL",
  Value: "VTV",
  "Size (Small)": "IWM",
  "Low Vol": "USMV",
  Yield: "DVY",
  Growth: "VUG",
  ESG: "ESGU",
};

export const REGION_ETF_MAP: Record<string, string> = {
  "United States": "SPY",
  "Canada":        "EWC",
  "United Kingdom":"EWU",
  "Germany":       "EWG",
  "France":        "EWQ",
  "Japan":         "EWJ",
  "Australia":     "EWA",
  "Switzerland":   "EWL",
  "Sweden":        "EWD",
  "Singapore":     "EWS",
  "China":         "MCHI",
  "India":         "INDA",
  "Korea":         "EWY",
  "Taiwan":        "EWT",
  "Brazil":        "EWZ",
  "Mexico":        "EWW",
  "South Africa":  "EZA",
  "Indonesia":     "EIDO",
};

// ─── Core quote fetch ────────────────────────────────────────────────────────

export interface QuoteResult {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;   // already in % points (e.g. 1.21 = +1.21%)
  open: number;
  prevClose: number;
  volume: number;
  marketCap: number | null;
  pe: number | null;
  dividendYield: number | null;  // decimal (0.0081 = 0.81%)
  fiftyTwoWeekLow: number | null;
  fiftyTwoWeekHigh: number | null;
  ytdChangePercent: number | null; // % points
  shortName: string;
}

export async function fetchQuotes(symbols: string[]): Promise<QuoteResult[]> {
  try {
    const yf = await getYF();
    const raw = await yf.quote(symbols, {}, { validateResult: false });
    const arr: any[] = Array.isArray(raw) ? raw : [raw];

    return arr.map((q: any): QuoteResult => ({
      symbol:            q.symbol ?? "",
      price:             q.regularMarketPrice ?? 0,
      change:            q.regularMarketChange ?? 0,
      changePercent:     q.regularMarketChangePercent ?? 0,   // already %
      open:              q.regularMarketOpen ?? q.regularMarketPrice ?? 0,
      prevClose:         q.regularMarketPreviousClose ?? 0,
      volume:            q.regularMarketVolume ?? 0,
      marketCap:         q.marketCap ?? null,
      pe:                q.trailingPE ?? null,
      dividendYield:     q.trailingAnnualDividendYield ?? null,
      fiftyTwoWeekLow:   q.fiftyTwoWeekLow ?? null,
      fiftyTwoWeekHigh:  q.fiftyTwoWeekHigh ?? null,
      ytdChangePercent:  q.fiftyTwoWeekChangePercent ?? null,  // already %
      shortName:         q.shortName ?? q.longName ?? q.symbol ?? "",
    }));
  } catch (err) {
    console.error("[market-data] fetchQuotes error:", err);
    return [];
  }
}

// ─── Historical chart fetch ──────────────────────────────────────────────────

export interface HistoricalBar {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function fetchHistorical(
  symbol: string,
  period1: Date,
  period2: Date = new Date()
): Promise<HistoricalBar[]> {
  try {
    const yf = await getYF();
    const rows = await yf.historical(symbol, {
      period1: period1.toISOString().slice(0, 10),
      period2: period2.toISOString().slice(0, 10),
      interval: "1d",
    }, { validateResult: false });

    return (rows ?? []).map((r: any): HistoricalBar => ({
      date:   r.date,
      open:   r.open   ?? 0,
      high:   r.high   ?? 0,
      low:    r.low    ?? 0,
      close:  r.close  ?? 0,
      volume: r.volume ?? 0,
    }));
  } catch (err) {
    console.error(`[market-data] fetchHistorical(${symbol}) error:`, err);
    return [];
  }
}

// ─── 5-day change helper ─────────────────────────────────────────────────────

export async function fetch5DayChange(symbol: string): Promise<number | null> {
  try {
    const period1 = new Date();
    period1.setDate(period1.getDate() - 10); // fetch 10 days to ensure 5 trading days
    const bars = await fetchHistorical(symbol, period1);
    if (bars.length < 2) return null;
    const recent = bars[bars.length - 1].close;
    const fiveDaysAgo = bars[Math.max(0, bars.length - 6)].close;
    if (!fiveDaysAgo) return null;
    return ((recent - fiveDaysAgo) / fiveDaysAgo) * 100;
  } catch {
    return null;
  }
}

// ─── Batch helpers ───────────────────────────────────────────────────────────

export async function fetchAllETFQuotes(): Promise<QuoteResult[]> {
  return fetchQuotes(ETF_TICKERS);
}

export async function fetchSectorQuotes(): Promise<QuoteResult[]> {
  return fetchQuotes(Object.values(SECTOR_ETF_MAP));
}

export async function fetchFXQuotes(): Promise<QuoteResult[]> {
  return fetchQuotes(Object.values(FX_SYMBOL_MAP));
}

export async function fetchRegionQuotes(): Promise<QuoteResult[]> {
  const symbols = Object.values(REGION_ETF_MAP);
  const unique = Array.from(new Set(symbols));
  return fetchQuotes(unique);
}

// ─── Volatility fetch ────────────────────────────────────────────────────────
// Yahoo does not list the ICE BofA MOVE Index — the "^MOVE" symbol there is the
// "Northern Trust iBoxx 5-Year Tar" bond fund, NOT a volatility index. Use the
// CBOE/CBOT 10-Year Treasury Volatility Index (^TYVIX) as the real rates-vol
// proxy, and ^VIX1Y (CBOE S&P 500 One-Year Volatility) to anchor the term
// structure curve on real data instead of fabricated scaling factors.

export const VOL_SYMBOLS = {
  vix:    "^VIX",
  tyvix:  "^TYVIX",
  vix1y:  "^VIX1Y",
  dxy:    "DX-Y.NYB",
} as const;

export interface VolatilityData {
  vix: number;
  tyvix: number;
  vix1y: number;
  dxy: number;
  vixChangePercent: number;
}

export async function fetchVolatilityData(): Promise<VolatilityData | null> {
  try {
    const results = await fetchQuotes(Object.values(VOL_SYMBOLS));
    const find = (sym: string) => results.find(r => r.symbol === sym);
    const vix   = find(VOL_SYMBOLS.vix);
    const tyvix = find(VOL_SYMBOLS.tyvix);
    const vix1y = find(VOL_SYMBOLS.vix1y);
    const dxy   = find(VOL_SYMBOLS.dxy);
    if (!vix) return null;
    return {
      vix:   vix.price ?? 0,
      tyvix: tyvix?.price ?? 0,
      vix1y: vix1y?.price ?? vix.price ?? 0,
      dxy:   dxy?.price ?? 0,
      vixChangePercent: vix.changePercent ?? 0,
    };
  } catch (err) {
    console.error("[market-data] fetchVolatilityData error:", err);
    return null;
  }
}

// ─── Utility ─────────────────────────────────────────────────────────────────

export { calculateRSI } from "@shared/market-math";

export function formatMarketCap(v: number | null): string {
  if (!v) return "—";
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(1)}M`;
  return `$${v}`;
}

export function signalFromRSI(rsi: number): string {
  if (rsi >= 70) return "OVERBOUGHT";
  if (rsi >= 55) return "BULL";
  if (rsi <= 30) return "OVERSOLD";
  if (rsi <= 45) return "BEAR";
  return "NEUTRAL";
}
