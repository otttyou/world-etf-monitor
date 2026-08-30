/**
 * Pure market-math helpers shared by the snapshot service and the UI.
 * No I/O — safe to unit test without Yahoo or a database.
 */

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Map a percent move onto roughly [-1, 1] for radar axes. */
export function axisFromPct(pct: number, scale = 2): number {
  return clamp(pct / scale, -1, 1);
}

export function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  return mean(values.slice(-period));
}

export function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((a, b) => a + (b - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function ema(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let e = mean(values.slice(0, period));
  for (let i = period; i < values.length; i++) {
    e = values[i] * k + e * (1 - k);
  }
  return e;
}

export function dailyReturns(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1];
    if (!prev) continue;
    out.push((closes[i] - prev) / prev);
  }
  return out;
}

export function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 5) return 0;
  const a = xs.slice(-n);
  const b = ys.slice(-n);
  const meanA = mean(a);
  const meanB = mean(b);
  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  if (den === 0) return 0;
  return clamp(num / den, -1, 1);
}

export function correlationMatrix(series: number[][]): number[][] {
  const n = series.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    matrix[i][i] = series[i]?.length >= 5 ? 1 : 0;
    for (let j = i + 1; j < n; j++) {
      const r = pearson(series[i] ?? [], series[j] ?? []);
      matrix[i][j] = r;
      matrix[j][i] = r;
    }
  }
  return matrix;
}

export function strongestLinks(
  tickers: string[],
  matrix: number[][],
  limit = 10
): { a: string; b: string; r: number }[] {
  const pairs: { a: string; b: string; r: number }[] = [];
  for (let i = 0; i < tickers.length; i++) {
    for (let j = i + 1; j < tickers.length; j++) {
      const r = matrix[i]?.[j];
      if (typeof r !== "number" || r === 0) continue;
      pairs.push({ a: tickers[i], b: tickers[j], r });
    }
  }
  return pairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).slice(0, limit);
}

export function calculateRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round(100 - 100 / (1 + rs));
}

export function macdLine(closes: number[]): number | null {
  const fast = ema(closes, 12);
  const slow = ema(closes, 26);
  if (fast === null || slow === null) return null;
  return fast - slow;
}

export function bollingerBand(closes: number[], price: number): "upper" | "mid" | "lower" {
  if (closes.length < 20) return "mid";
  const window = closes.slice(-20);
  const mid = mean(window);
  const sd = stdev(window);
  if (sd === 0) return "mid";
  if (price > mid + 2 * sd) return "upper";
  if (price < mid - 2 * sd) return "lower";
  return "mid";
}

export function trendFromVs200(vs200: number): "Uptrend" | "Downtrend" | "Sideways" {
  if (vs200 > 2) return "Uptrend";
  if (vs200 < -2) return "Downtrend";
  return "Sideways";
}

export function isDevelopedRegion(region?: string | null): boolean {
  const v = (region || "").trim().toLowerCase();
  return v === "developed" || v === "dm";
}

export function isEmergingRegion(region?: string | null): boolean {
  const v = (region || "").trim().toLowerCase();
  return v === "emerging" || v === "em" || v === "frontier";
}

export function vixPhase(vix: number): string {
  if (vix < 12) return "new moon";
  if (vix < 15) return "waxing crescent";
  if (vix < 18) return "first qtr";
  if (vix < 22) return "waxing gibbous";
  if (vix < 28) return "full moon";
  if (vix < 35) return "waning gibbous";
  return "last qtr";
}

export interface RadarAxes {
  growth: number;
  inflation: number;
  rates: number;
  credit: number;
  usd: number;
  oil: number;
}

export function radarFromMarket(input: {
  equityD1: number[];
  tltD1: number;
  gldD1: number;
  dxyD1: number;
  energyD1: number;
}): RadarAxes {
  const growth = axisFromPct(mean(input.equityD1), 1.5);
  const inflation = axisFromPct(input.gldD1 - input.tltD1 * 0.5, 1.8);
  const rates = axisFromPct(input.tltD1, 1.5);
  const credit = axisFromPct(mean(input.equityD1) * 0.7 + input.tltD1 * 0.3, 1.6);
  const usd = axisFromPct(input.dxyD1, 1.2);
  const oil = axisFromPct(input.energyD1, 2);
  return { growth, inflation, rates, credit, usd, oil };
}

export function parsePct(v: string | number | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}
