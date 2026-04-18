/**
 * Market data fetching service using Yahoo Finance API
 * Provides real-time ETF prices, indices, FX rates, and sector data
 */

interface YahooQuoteResponse {
  quoteResponse?: {
    result?: Array<{
      symbol: string;
      regularMarketPrice?: number;
      regularMarketChange?: number;
      regularMarketChangePercent?: number;
      regularMarketOpen?: number;
      fiftyTwoWeekHigh?: number;
      fiftyTwoWeekLow?: number;
      trailingPE?: number;
      trailingAnnualDividendYield?: number;
      marketCap?: number;
      averageVolume?: number;
    }>;
  };
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        currency?: string;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: (number | null)[];
          open?: (number | null)[];
          high?: (number | null)[];
          low?: (number | null)[];
          volume?: (number | null)[];
        }>;
      };
    }>;
  };
}

const YAHOO_API_BASE = "https://query1.finance.yahoo.com";

/**
 * Fetch quote data for a single symbol using Yahoo Finance v10 API
 */
export async function fetchYahooQuote(symbol: string): Promise<{
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  pe: number | null;
  yield: number | null;
  marketCap: number | null;
} | null> {
  try {
    const url = `${YAHOO_API_BASE}/v10/finance/quoteSummary/${symbol}?modules=price,financialData`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      console.warn(`[Yahoo API] Failed to fetch ${symbol}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const priceData = data.quoteSummary?.result?.[0]?.price;
    const finData = data.quoteSummary?.result?.[0]?.financialData;

    if (!priceData) return null;

    const price = priceData.regularMarketPrice?.raw || 0;
    const change = priceData.regularMarketChange?.raw || 0;
    const changePercent = priceData.regularMarketChangePercent?.raw || 0;

    return {
      symbol,
      price,
      change,
      changePercent,
      pe: finData?.trailingPE?.raw || null,
      yield: finData?.trailingAnnualDividendYield?.raw || null,
      marketCap: finData?.marketCap?.raw || null,
    };
  } catch (error) {
    console.error(`[Yahoo API] Error fetching ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch historical chart data for calculating multiple time period changes
 */
export async function fetchYahooChart(
  symbol: string,
  range: "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" = "1d"
): Promise<{
  current: number;
  open: number;
  change: number;
  changePercent: number;
} | null> {
  try {
    const url = `${YAHOO_API_BASE}/v8/finance/chart/${symbol}?interval=1d&range=${range}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      console.warn(`[Yahoo API] Failed to fetch chart ${symbol}: ${response.status}`);
      return null;
    }

    const data: YahooChartResponse = await response.json();
    const result = data.chart?.result?.[0];

    if (!result) return null;

    const quotes = result.indicators?.quote?.[0] || {};
    const meta = result.meta || {};

    if (!quotes.close || quotes.close.length === 0) return null;

    const current = meta.regularMarketPrice || quotes.close[quotes.close.length - 1] || 0;
    const open = quotes.open?.[0] || quotes.close[0] || 0;

    if (!current || !open) return null;

    const change = current - open;
    const changePercent = (change / open) * 100;

    return {
      current,
      open,
      change,
      changePercent,
    };
  } catch (error) {
    console.error(`[Yahoo API] Error fetching chart ${symbol}:`, error);
    return null;
  }
}

/**
 * Calculate RSI (Relative Strength Index) from price changes
 */
export function calculateRSI(changes: number[], period: number = 14): number {
  if (changes.length < period) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 0; i < period; i++) {
    const change = changes[i];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);

  return Math.round(rsi);
}

/**
 * Format market cap to readable string
 */
export function formatMarketCap(marketCap: number | null): string {
  if (!marketCap) return "—";
  if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(1)}T`;
  if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(1)}B`;
  if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(1)}M`;
  return `$${marketCap}`;
}

/**
 * Fetch multiple quotes efficiently with rate limiting
 */
export async function fetchMultipleQuotes(symbols: string[]): Promise<
  Record<
    string,
    {
      symbol: string;
      price: number;
      change: number;
      changePercent: number;
      pe: number | null;
      yield: number | null;
      marketCap: number | null;
    } | null
  >
> {
  const results: Record<string, any> = {};

  for (const symbol of symbols) {
    results[symbol] = await fetchYahooQuote(symbol);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * Fetch multiple chart data efficiently with rate limiting
 */
export async function fetchMultipleCharts(
  symbols: string[],
  range: "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" = "1d"
): Promise<
  Record<
    string,
    {
      current: number;
      open: number;
      change: number;
      changePercent: number;
    } | null
  >
> {
  const results: Record<string, any> = {};

  for (const symbol of symbols) {
    results[symbol] = await fetchYahooChart(symbol, range);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * Map ticker to Yahoo Finance symbol (handle special cases)
 */
export function mapTickerToYahooSymbol(ticker: string): string {
  const mapping: Record<string, string> = {
    "DXY": "DX-Y.NYB",
    "EUR": "EURUSD=X",
    "GBP": "GBPUSD=X",
    "JPY": "JPYUSD=X",
    "CNY": "CNHUSD=X",
    "INR": "INRUSD=X",
    "BRL": "BRLUSD=X",
    "TRY": "TRYUSD=X",
  };

  return mapping[ticker] || ticker;
}

/**
 * Fetch volatility data (VIX, MOVE, etc.)
 */
export async function fetchVolatilityData(): Promise<{
  vix: number;
  move: number;
  dxy: number;
} | null> {
  try {
    const [vixData, moveData, dxyData] = await Promise.all([
      fetchYahooChart("^VIX", "1d"),
      fetchYahooChart("^MOVE", "1d"),
      fetchYahooChart("DX-Y.NYB", "1d"),
    ]);

    return {
      vix: vixData?.current || 0,
      move: moveData?.current || 0,
      dxy: dxyData?.current || 0,
    };
  } catch (error) {
    console.error("[Yahoo API] Error fetching volatility data:", error);
    return null;
  }
}
