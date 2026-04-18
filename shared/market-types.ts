/**
 * Shared market data types used across frontend and backend
 */

export interface ETFQuote {
  ticker: string;
  name?: string;
  price?: string;
  d1?: string;
  d5?: string;
  ytd?: string;
  aum?: string;
  pe?: string;
  yld?: string;
  signal?: string;
  rsi?: number;
  vol?: string;
  lastUpdated?: Date;
}

export interface RegionalIndex {
  code: string;
  name: string;
  d1?: string;
  region: "DM" | "EM" | "AGG";
  lastUpdated?: Date;
}

export interface FXRate {
  pair: string;
  rate?: string;
  d1?: string;
  lastUpdated?: Date;
}

export interface SectorData {
  sector: string;
  value?: string;
  lastUpdated?: Date;
}

export interface CompositeMetrics {
  breadthPct: number;
  dispersion: number;
  liquidity: number;
  advancers: number;
  decliners: number;
  totalETFs: number;
}

export const ETF_TICKERS = [
  "SPY", "QQQ", "IWM", "ACWI", "EFA", "EEM", "EWJ",
  "MCHI", "INDA", "EWZ", "EWG", "EWU", "TLT", "GLD"
] as const;

export const REGIONS_DM = [
  { code: "US", name: "United States" },
  { code: "JP", name: "Japan" },
  { code: "DE", name: "Germany" },
  { code: "UK", name: "United Kingdom" },
  { code: "CH", name: "Switzerland" },
  { code: "SE", name: "Sweden" },
  { code: "AU", name: "Australia" },
  { code: "SG", name: "Singapore" },
] as const;

export const REGIONS_EM = [
  { code: "CN", name: "China" },
  { code: "IN", name: "India" },
  { code: "KR", name: "Korea" },
  { code: "TW", name: "Taiwan" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "ZA", name: "South Africa" },
  { code: "TR", name: "Türkiye" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "ID", name: "Indonesia" },
] as const;

export const FX_PAIRS = [
  { pair: "DXY", label: "USD Index" },
  { pair: "EUR/USD", label: "EUR/USD" },
  { pair: "GBP/USD", label: "GBP/USD" },
  { pair: "USD/JPY", label: "USD/JPY" },
  { pair: "USD/CNH", label: "USD/CNH" },
  { pair: "USD/INR", label: "USD/INR" },
  { pair: "USD/BRL", label: "USD/BRL" },
  { pair: "USD/TRY", label: "USD/TRY" },
] as const;

export const SECTORS = [
  "TECH", "COMM", "DISC", "FIN", "INDU",
  "MATS", "ENER", "HLTH", "STAP", "UTIL", "REAL"
] as const;
