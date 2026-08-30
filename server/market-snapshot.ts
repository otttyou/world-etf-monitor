/**
 * Live market snapshot.
 *
 * Fetches Yahoo Finance quotes into an in-memory cache so the observatory can
 * run on updating data even when MySQL is unavailable. DB writes are best-effort.
 */

import {
  calculateRSI,
  correlationMatrix,
  dailyReturns,
  macdLine,
  bollingerBand,
  sma,
  trendFromVs200,
  type RadarAxes,
  radarFromMarket,
} from "@shared/market-math";
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
  fetchQuotes,
  formatMarketCap,
  signalFromRSI,
  ETF_TICKERS,
  SECTOR_ETF_MAP,
  FX_SYMBOL_MAP,
  REGION_ETF_MAP,
  FACTOR_ETF_MAP,
  type QuoteResult,
  type HistoricalBar,
} from "./market-data";

const TTL_MS = 55_000;

export interface LiveETF {
  ticker: string;
  name: string | null;
  price: string | null;
  d1: string | null;
  d5: string | null;
  ytd: string | null;
  aum: string | null;
  pe: string | null;
  yld: string | null;
  signal: string | null;
  rsi: number | null;
  vol: string | null;
  lastUpdated: Date;
  ma50: string | null;
  ma200: string | null;
  vs200: string | null;
  macd: string | null;
  bb: string | null;
  trend: string | null;
  volume: number | null;
}

export interface LiveRegion {
  code: string;
  name: string;
  d1: string | null;
  region: string | null;
  lastUpdated: Date;
}

export interface LiveFX {
  pair: string;
  rate: string | null;
  d1: string | null;
  lastUpdated: Date;
}

export interface LiveSector {
  sector: string;
  value: string | null;
  d5: string | null;
  ytd: string | null;
  lastUpdated: Date;
}

export interface LiveFactor {
  name: string;
  ticker: string;
  price: string;
  d1: string;
  ytd: string;
  aum: string;
}

export interface MarketSnapshot {
  etfs: LiveETF[];
  regions: LiveRegion[];
  fx: LiveFX[];
  sectors: LiveSector[];
  factors: LiveFactor[];
  volatility: { vix: number; tyvix: number; vix1y: number; dxy: number; vixChangePercent: number } | null;
  correlation: { tickers: string[]; matrix: number[][] };
  radar: RadarAxes;
  priorRadar: RadarAxes;
  fetchedAt: number;
}

const EMPTY_RADAR: RadarAxes = {
  growth: 0, inflation: 0, rates: 0, credit: 0, usd: 0, oil: 0,
};

function emptySnapshot(): MarketSnapshot {
  return {
    etfs: [],
    regions: [],
    fx: [],
    sectors: [],
    factors: [],
    volatility: null,
    correlation: { tickers: [...ETF_TICKERS], matrix: [] },
    radar: EMPTY_RADAR,
    priorRadar: EMPTY_RADAR,
    fetchedAt: 0,
  };
}

let snapshot: MarketSnapshot | null = null;
let inflight: Promise<MarketSnapshot> | null = null;

export function getCachedSnapshot(): MarketSnapshot | null {
  return snapshot;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function d5FromBars(bars: HistoricalBar[]): string | null {
  if (bars.length < 6) return null;
  const recent = bars[bars.length - 1].close;
  const fiveBack = bars[Math.max(0, bars.length - 6)].close;
  if (!fiveBack) return null;
  return (((recent - fiveBack) / fiveBack) * 100).toFixed(2);
}

function buildETF(q: QuoteResult, bars: HistoricalBar[]): LiveETF {
  const closes = bars.map((b) => b.close).filter((c) => c > 0);
  const rsi = closes.length >= 15 ? calculateRSI(closes) : 50;
  const ma50 = sma(closes, 50);
  const ma200 = sma(closes, 200);
  const price = q.price;
  const vs200 = ma200 && ma200 !== 0 ? ((price - ma200) / ma200) * 100 : null;
  const macd = macdLine(closes);
  const bb = bollingerBand(closes, price);
  const trend = vs200 !== null ? trendFromVs200(vs200) : "Sideways";

  return {
    ticker: q.symbol,
    name: q.shortName || q.symbol,
    price: q.price.toFixed(2),
    d1: q.changePercent.toFixed(2),
    d5: d5FromBars(bars),
    ytd: q.ytdChangePercent !== null ? q.ytdChangePercent.toFixed(2) : null,
    aum: formatMarketCap(q.marketCap),
    pe: q.pe ? q.pe.toFixed(1) + "×" : "—",
    yld: q.dividendYield ? (q.dividendYield * 100).toFixed(2) : null,
    signal: signalFromRSI(rsi),
    rsi,
    vol: q.volume ? String(q.volume) : "—",
    lastUpdated: new Date(),
    ma50: ma50 ? ma50.toFixed(2) : null,
    ma200: ma200 ? ma200.toFixed(2) : null,
    vs200: vs200 !== null ? vs200.toFixed(1) : null,
    macd: macd !== null ? macd.toFixed(2) : null,
    bb,
    trend,
    volume: q.volume || null,
  };
}

async function fetchLive(): Promise<MarketSnapshot | null> {
  const factorTickers = Array.from(new Set(Object.values(FACTOR_ETF_MAP)));

  const [etfQuotes, sectorQuotes, fxQuotes, regionQuotes, vol, factorQuotes] = await Promise.all([
    fetchAllETFQuotes(),
    fetchSectorQuotes(),
    fetchFXQuotes(),
    fetchRegionQuotes(),
    fetchVolatilityData(),
    fetchQuotes(factorTickers),
  ]);

  if (!etfQuotes.length && !sectorQuotes.length && !fxQuotes.length) {
    return null;
  }

  const hist = await Promise.all(
    ETF_TICKERS.map((ticker) => fetchHistorical(ticker, daysAgo(400)))
  );
  const histByTicker = new Map<string, HistoricalBar[]>();
  ETF_TICKERS.forEach((ticker, i) => histByTicker.set(ticker, hist[i] ?? []));

  const quoteBySymbol = new Map(etfQuotes.map((q) => [q.symbol, q]));
  const etfs: LiveETF[] = ETF_TICKERS.map((ticker) => {
    const q = quoteBySymbol.get(ticker);
    if (!q) return null;
    return buildETF(q, histByTicker.get(ticker) ?? []);
  }).filter((e): e is LiveETF => e !== null);

  const returnSeries = ETF_TICKERS.map((ticker) => {
    const closes = (histByTicker.get(ticker) ?? []).map((b) => b.close).filter((c) => c > 0);
    return dailyReturns(closes).slice(-60);
  });
  const matrix = correlationMatrix(returnSeries);

  const regionMeta: { code: string; name: string; region: string }[] = [
    { code: "US", name: "United States", region: "DM" },
    { code: "CA", name: "Canada", region: "DM" },
    { code: "UK", name: "United Kingdom", region: "DM" },
    { code: "DE", name: "Germany", region: "DM" },
    { code: "FR", name: "France", region: "DM" },
    { code: "JP", name: "Japan", region: "DM" },
    { code: "AU", name: "Australia", region: "DM" },
    { code: "CH", name: "Switzerland", region: "DM" },
    { code: "SE", name: "Sweden", region: "DM" },
    { code: "SG", name: "Singapore", region: "DM" },
    { code: "CN", name: "China", region: "EM" },
    { code: "IN", name: "India", region: "EM" },
    { code: "KR", name: "Korea", region: "EM" },
    { code: "TW", name: "Taiwan", region: "EM" },
    { code: "BR", name: "Brazil", region: "EM" },
    { code: "MX", name: "Mexico", region: "EM" },
    { code: "ZA", name: "South Africa", region: "EM" },
    { code: "ID", name: "Indonesia", region: "EM" },
  ];
  const regionQuoteMap = new Map(regionQuotes.map((q) => [q.symbol, q]));
  const now = new Date();
  const regions: LiveRegion[] = regionMeta.flatMap((meta) => {
    const etf = REGION_ETF_MAP[meta.name];
    const q = etf ? regionQuoteMap.get(etf) : undefined;
    if (!q) return [];
    return [{
      code: meta.code,
      name: meta.name,
      d1: q.changePercent.toFixed(2),
      region: meta.region,
      lastUpdated: now,
    }];
  });

  const fxReverse: Record<string, string> = {};
  for (const [pair, sym] of Object.entries(FX_SYMBOL_MAP)) fxReverse[sym] = pair;
  const fx: LiveFX[] = fxQuotes.map((q) => ({
    pair: fxReverse[q.symbol] ?? q.symbol,
    rate: q.price.toFixed(4),
    d1: q.changePercent.toFixed(2),
    lastUpdated: now,
  }));

  const sectorReverse: Record<string, string> = {};
  for (const [sector, etf] of Object.entries(SECTOR_ETF_MAP)) sectorReverse[etf] = sector;
  const sectors: LiveSector[] = sectorQuotes.map((q) => ({
    sector: sectorReverse[q.symbol] ?? q.symbol,
    value: q.changePercent.toFixed(2),
    d5: null,
    ytd: q.ytdChangePercent !== null ? q.ytdChangePercent.toFixed(2) : null,
    lastUpdated: now,
  }));

  const factorQuoteMap = new Map(factorQuotes.map((q) => [q.symbol, q]));
  const factors: LiveFactor[] = Object.entries(FACTOR_ETF_MAP).map(([name, ticker]) => {
    const q = factorQuoteMap.get(ticker);
    return {
      name,
      ticker,
      price: q ? q.price.toFixed(2) : "—",
      d1: q ? q.changePercent.toFixed(2) : "—",
      ytd: q && q.ytdChangePercent !== null ? q.ytdChangePercent.toFixed(2) : "—",
      aum: q ? formatMarketCap(q.marketCap) : "—",
    };
  });

  const equityD1 = etfs
    .filter((e) => !["TLT", "GLD"].includes(e.ticker))
    .map((e) => parseFloat(e.d1 || "0"))
    .filter((v) => Number.isFinite(v));
  const tltD1 = parseFloat(etfs.find((e) => e.ticker === "TLT")?.d1 || "0") || 0;
  const gldD1 = parseFloat(etfs.find((e) => e.ticker === "GLD")?.d1 || "0") || 0;
  const dxyD1 = parseFloat(fx.find((f) => f.pair === "DXY")?.d1 || "0") || 0;
  const energyD1 = parseFloat(sectors.find((s) => s.sector === "ENER")?.value || "0") || 0;
  const radar = radarFromMarket({ equityD1, tltD1, gldD1, dxyD1, energyD1 });
  const priorRadar = snapshot?.radar ?? radar;

  return {
    etfs,
    regions,
    fx,
    sectors,
    factors,
    volatility: vol,
    correlation: { tickers: [...ETF_TICKERS], matrix },
    radar,
    priorRadar,
    fetchedAt: Date.now(),
  };
}

async function loadFromDb(): Promise<MarketSnapshot | null> {
  try {
    const [etfs, regions, fx, sectors] = await Promise.all([
      getAllETFPrices(),
      getAllRegionalIndices(),
      getAllFXRates(),
      getAllSectorData(),
    ]);
    if (!etfs.length && !regions.length && !fx.length && !sectors.length) return null;
    return {
      ...emptySnapshot(),
      etfs: etfs.map((e) => ({
        ticker: e.ticker,
        name: e.name,
        price: e.price,
        d1: e.d1,
        d5: e.d5,
        ytd: e.ytd,
        aum: e.aum,
        pe: e.pe,
        yld: e.yld,
        signal: e.signal,
        rsi: e.rsi,
        vol: e.vol,
        lastUpdated: e.lastUpdated,
        ma50: null,
        ma200: null,
        vs200: null,
        macd: null,
        bb: null,
        trend: null,
        volume: null,
      })),
      regions: regions.map((r) => ({
        code: r.code,
        name: r.name,
        d1: r.d1,
        region: r.region,
        lastUpdated: r.lastUpdated,
      })),
      fx: fx.map((f) => ({
        pair: f.pair,
        rate: f.rate,
        d1: f.d1,
        lastUpdated: f.lastUpdated,
      })),
      sectors: sectors.map((s) => ({
        sector: s.sector,
        value: s.value,
        d5: null,
        ytd: null,
        lastUpdated: s.lastUpdated,
      })),
      fetchedAt: Date.now(),
    };
  } catch (err) {
    console.error("[snapshot] loadFromDb failed:", err);
    return null;
  }
}

async function persistSnapshot(s: MarketSnapshot): Promise<void> {
  try {
    await Promise.all([
      ...s.etfs.map((e) => upsertETFPrice({
        ticker: e.ticker,
        name: e.name ?? undefined,
        price: e.price ?? undefined,
        d1: e.d1 ?? undefined,
        d5: e.d5 ?? undefined,
        ytd: e.ytd ?? undefined,
        aum: e.aum ?? undefined,
        pe: e.pe ?? undefined,
        yld: e.yld ?? undefined,
        signal: e.signal ?? undefined,
        rsi: e.rsi ?? undefined,
        vol: e.vol ?? undefined,
      })),
      ...s.regions.map((r) => upsertRegionalIndex({
        code: r.code,
        name: r.name,
        d1: r.d1 ?? undefined,
        region: r.region || "DM",
      })),
      ...s.fx.map((f) => upsertFXRate({
        pair: f.pair,
        rate: f.rate ?? undefined,
        d1: f.d1 ?? undefined,
      })),
      ...s.sectors.map((sec) => upsertSectorData({
        sector: sec.sector,
        value: sec.value ?? undefined,
      })),
    ]);
  } catch (err) {
    console.warn("[snapshot] persist skipped:", err);
  }
}

async function buildSnapshot(): Promise<MarketSnapshot> {
  try {
    const live = await fetchLive();
    if (live && (live.etfs.length || live.regions.length || live.fx.length)) {
      persistSnapshot(live).catch((err) => console.warn("[snapshot] persist:", err));
      return live;
    }
  } catch (err) {
    console.error("[snapshot] Yahoo fetch failed:", err);
  }
  const fromDb = await loadFromDb();
  if (fromDb) return fromDb;
  return snapshot ?? emptySnapshot();
}

export async function getSnapshot(force = false): Promise<MarketSnapshot> {
  if (!force && snapshot && Date.now() - snapshot.fetchedAt < TTL_MS) {
    return snapshot;
  }
  if (inflight) return inflight;
  inflight = buildSnapshot()
    .then((s) => {
      snapshot = s;
      return s;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
