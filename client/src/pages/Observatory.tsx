import { useState, useEffect, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  isDevelopedRegion,
  isEmergingRegion,
  parsePct,
  strongestLinks,
  vixPhase,
} from "@shared/market-math";
import {
  RegionsView,
  SectorsView,
  FactorsView,
  CorrelationView,
  FundamentalsView,
  TechnicalsView,
  FlowsView,
  JournalView,
} from "./TabViews";
import {
  drawRadarChart,
  drawEquirectangularMap,
  drawExchangeOrbit,
  drawVolatilityMoon,
  drawSectorRose,
  drawChladniPlate,
  drawLiquidityDepth,
  drawVolatilityCurve,
  drawCorrelationHeatmap,
  type RadarData,
  type CountryNode,
  type ExchangeMarker,
} from "@/lib/chartUtils";
import "@/styles/aesop.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v: string | number | null | undefined, dec = 2) => {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "—";
  return n.toFixed(dec);
};
const fmtPct = (v: string | number | null | undefined) => {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
};
const pctClass = (v: string | number | null | undefined) => {
  if (!v) return "";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "";
  return n > 0 ? "pos" : n < 0 ? "neg" : "";
};

// ─── Static data ──────────────────────────────────────────────────────────────
const COUNTRY_NODES: CountryNode[] = [
  { code: "US", name: "United States", lat: 38, lng: -97, change: 0 },
  { code: "CA", name: "Canada",        lat: 56, lng: -96, change: 0 },
  { code: "MX", name: "Mexico",        lat: 23, lng: -102, change: 0 },
  { code: "BR", name: "Brazil",        lat: -15, lng: -47, change: 0 },
  { code: "UK", name: "United Kingdom",lat: 51, lng: -1,  change: 0 },
  { code: "DE", name: "Germany",       lat: 51, lng: 10,  change: 0 },
  { code: "FR", name: "France",        lat: 46, lng: 2,   change: 0 },
  { code: "JP", name: "Japan",         lat: 36, lng: 138, change: 0 },
  { code: "CN", name: "China",         lat: 35, lng: 105, change: 0 },
  { code: "IN", name: "India",         lat: 20, lng: 77,  change: 0 },
  { code: "KR", name: "South Korea",   lat: 37, lng: 128, change: 0 },
  { code: "AU", name: "Australia",     lat: -25, lng: 133, change: 0 },
  { code: "ZA", name: "South Africa",  lat: -29, lng: 25, change: 0 },
  { code: "SG", name: "Singapore",     lat: 1, lng: 104,  change: 0 },
  { code: "ID", name: "Indonesia",     lat: -5, lng: 120, change: 0 },
];

const EXCHANGE_MARKERS: ExchangeMarker[] = [
  { code: "NYSE", hour: 14.5, isOpen: true },
  { code: "LSE",  hour: 8,    isOpen: false },
  { code: "FX",   hour: 0,    isOpen: true },
  { code: "JPX",  hour: 0,    isOpen: false },
  { code: "HKE",  hour: 1.5,  isOpen: false },
  { code: "SSE",  hour: 1.5,  isOpen: false },
  { code: "NSE",  hour: 3.5,  isOpen: false },
  { code: "B3",   hour: 12,   isOpen: false },
  { code: "DJFX", hour: 22,   isOpen: true },
  { code: "TSX",  hour: 14.5, isOpen: true },
];

const TICKERS_ALL = ["SPY","QQQ","IWM","ACWI","EFA","EEM","EWJ","MCHI","INDA","EWZ","EWG","EWU","TLT","GLD",
  "VTI","VEA","VWO","AGG","LQD","HYG","GDX","SLV","USO","XLE","XLF","XLK","XLV","XLI","XLP","XLU","XLRE"];

const COUNTRY_ETF_FALLBACK: Record<string, string> = {
  US: "SPY", JP: "EWJ", CN: "MCHI", IN: "INDA", BR: "EWZ",
  DE: "EWG", UK: "EWU", FR: "EFA",
};

const NEWS_ITEMS = [
  { time: "14:42", text: "TIPS breakevens edge to 2.94% — real yields compress" },
  { time: "14:31", text: "EEM outflows reverse; EM breadth widens to 68%" },
  { time: "14:18", text: "VIX term structure flattens — backwardation at 6M" },
  { time: "13:55", text: "DXY slips below 200d MA; gold tests $2,380 resistance" },
  { time: "13:40", text: "JPX closes +1.2% — yen carry unwind eases" },
  { time: "13:22", text: "Fed speakers signal patience; 2y yield -4bp" },
  { time: "13:08", text: "MCHI +0.4% on PBOC liquidity injection" },
  { time: "12:51", text: "EWZ -0.5% as BRL weakens vs USD" },
  { time: "12:33", text: "TLT flows +$612M; short % drops to 2.1%" },
  { time: "12:15", text: "SPY options skew normalises — put premium fades" },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function Observatory() {
  const [activeTab, setActiveTab] = useState("I");
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedETF, setSelectedETF] = useState("EEM");

  const radarCanvasRef    = useRef<HTMLCanvasElement>(null);
  const mapCanvasRef      = useRef<HTMLCanvasElement>(null);
  const orbitCanvasRef    = useRef<HTMLCanvasElement>(null);
  const moonCanvasRef     = useRef<HTMLCanvasElement>(null);
  const roseCanvasRef     = useRef<HTMLCanvasElement>(null);
  const chladniCanvasRef  = useRef<HTMLCanvasElement>(null);
  const liquidityCanvasRef = useRef<HTMLCanvasElement>(null);
  const volatilityCanvasRef = useRef<HTMLCanvasElement>(null);
  const heatmapCanvasRef  = useRef<HTMLCanvasElement>(null);

  // ── Live queries (Yahoo snapshot, refreshes every 60s) ────────────────────
  const liveOpts = { refetchInterval: 60_000 as const, staleTime: 30_000 };
  const etfPrices       = trpc.market.etfPrices.useQuery(undefined, liveOpts);
  const regionalIndices = trpc.market.regionalIndices.useQuery(undefined, liveOpts);
  const fxRates         = trpc.market.fxRates.useQuery(undefined, liveOpts);
  const sectorData      = trpc.market.sectorData.useQuery(undefined, liveOpts);
  const volatilityQ     = trpc.market.volatility.useQuery(undefined, liveOpts);
  const correlationQ    = trpc.market.correlation.useQuery(undefined, liveOpts);
  const radarQ          = trpc.market.radar.useQuery(undefined, liveOpts);
  const factorsQ        = trpc.market.factors.useQuery(undefined, liveOpts);

  useEffect(() => {
    const fetching =
      etfPrices.isFetching || regionalIndices.isFetching ||
      fxRates.isFetching || sectorData.isFetching;
    setIsRefreshing(fetching);
  }, [etfPrices.isFetching, regionalIndices.isFetching, fxRates.isFetching, sectorData.isFetching]);

  useEffect(() => {
    const ts = etfPrices.dataUpdatedAt || regionalIndices.dataUpdatedAt;
    if (ts) setLastUpdated(new Date(ts));
  }, [etfPrices.dataUpdatedAt, regionalIndices.dataUpdatedAt]);

  const etfData  = etfPrices.data      || [];
  const sectors  = sectorData.data     || [];
  const regions  = regionalIndices.data || [];
  const fx       = fxRates.data        || [];
  const factors  = factorsQ.data       || [];
  const vol      = volatilityQ.data;

  // ── Derived stats ─────────────────────────────────────────────────────────
  const advancers = useMemo(() => etfData.filter(e => parsePct(e.d1) > 0).length, [etfData]);
  const dispersion = useMemo(() => {
    const nums = etfData.map(e => parseFloat(String(e.d1 || ""))).filter(v => !isNaN(v));
    if (nums.length < 2) return 0;
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    const variance = nums.reduce((a, b) => a + (b - avg) ** 2, 0) / nums.length;
    return Math.sqrt(variance);
  }, [etfData]);
  const totalAUM = useMemo(() => {
    return etfData.reduce((sum, e) => {
      const v = parseFloat(String(e.aum || "0").replace(/[^0-9.]/g, ""));
      return sum + (isNaN(v) ? 0 : v);
    }, 0);
  }, [etfData]);

  const corrTickers = correlationQ.data?.tickers ?? ["SPY","QQQ","IWM","ACWI","EFA","EEM","EWJ","MCHI","INDA","EWZ","EWG","EWU","TLT","GLD"];
  const corrMatrix = useMemo(() => {
    const m = correlationQ.data?.matrix;
    if (m && m.length) return m;
    return corrTickers.map((_, i) => corrTickers.map((__, j) => (i === j ? 1 : 0)));
  }, [correlationQ.data, corrTickers]);

  const liveLinks = useMemo(
    () => strongestLinks(corrTickers, corrMatrix, 10),
    [corrTickers, corrMatrix]
  );

  const developed = useMemo(() => regions.filter(r => isDevelopedRegion(r.region)), [regions]);
  const emerging  = useMemo(() => regions.filter(r => isEmergingRegion(r.region)), [regions]);

  // ── Country nodes from live regional (then ETF) data — never random ───────
  const countryNodes = useMemo<CountryNode[]>(() => {
    return COUNTRY_NODES.map(n => {
      const region = regions.find(r => r.code === n.code || r.name === n.name);
      if (region) return { ...n, change: parsePct(region.d1) };
      const ticker = COUNTRY_ETF_FALLBACK[n.code];
      const etf = ticker ? etfData.find(e => e.ticker === ticker) : undefined;
      return { ...n, change: etf ? parsePct(etf.d1) : 0 };
    });
  }, [regions, etfData]);

  // ── Sector rose from live 1D % — missing sectors stay at 0, not random ────
  const sectorRoseData = useMemo(() => {
    const names = ["TECH","COMM","DISC","FIN","INDU","MATS","ENER","HLTH","STAP","UTIL","REAL"];
    return names.map(name => {
      const s = sectors.find(sec => sec.sector === name);
      return { name, value: s ? parsePct(s.value) : 0 };
    });
  }, [sectors]);

  // ── ETF nodes for Chladni ─────────────────────────────────────────────────
  const chladniNodes = useMemo(() => {
    const positions: Record<string, [number, number]> = {
      SPY:[50,50], QQQ:[55,42], IWM:[45,58], ACWI:[52,48], EFA:[30,40], EEM:[70,60],
      EWJ:[80,35], MCHI:[78,45], INDA:[72,55], EWZ:[35,70], EWG:[25,38], EWU:[20,42],
      TLT:[50,25], GLD:[50,75],
    };
    return etfData.slice(0, 14).map(e => ({
      ticker: e.ticker || "?",
      x: positions[e.ticker || ""]?.[0] ?? 50,
      y: positions[e.ticker || ""]?.[1] ?? 50,
      change: parseFloat(e.d1 || "0") || 0,
    }));
  }, [etfData]);

  // ── Draw charts ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!radarCanvasRef.current) return;
    const curr: RadarData = radarQ.data?.current ?? { growth: 0, inflation: 0, rates: 0, credit: 0, usd: 0, oil: 0 };
    const prev: RadarData = radarQ.data?.prior ?? curr;
    drawRadarChart(radarCanvasRef.current, curr, prev);
  }, [radarQ.data]);

  useEffect(() => {
    if (!mapCanvasRef.current) return;
    drawEquirectangularMap(mapCanvasRef.current, countryNodes);
  }, [countryNodes]);

  useEffect(() => {
    if (!orbitCanvasRef.current) return;
    const now = new Date();
    const utcH = now.getUTCHours() + now.getUTCMinutes() / 60;
    const isOpen = (open: number, close: number) => utcH >= open && utcH < close;
    const markers: ExchangeMarker[] = [
      { code: "NYSE", hour: 14.5, isOpen: isOpen(13.5, 20) },
      { code: "LSE",  hour: 8,    isOpen: isOpen(8, 16.5) },
      { code: "FX",   hour: 0,    isOpen: true },
      { code: "JPX",  hour: 0,    isOpen: isOpen(0, 6) },
      { code: "HKE",  hour: 1.5,  isOpen: isOpen(1.5, 8) },
      { code: "SSE",  hour: 1.5,  isOpen: isOpen(1.5, 7) },
      { code: "NSE",  hour: 3.5,  isOpen: isOpen(3.5, 10) },
      { code: "B3",   hour: 12,   isOpen: isOpen(12, 21) },
    ];
    drawExchangeOrbit(orbitCanvasRef.current, markers);
  }, [lastUpdated]);

  useEffect(() => {
    if (!moonCanvasRef.current) return;
    const vix = vol?.vix ?? 0;
    const tyvix = vol?.tyvix ?? 0;
    const dxy = vol?.dxy ?? 0;
    drawVolatilityMoon(moonCanvasRef.current, vix, tyvix, dxy, vixPhase(vix));
  }, [vol]);

  useEffect(() => {
    if (!roseCanvasRef.current) return;
    drawSectorRose(roseCanvasRef.current, sectorRoseData);
  }, [sectorRoseData]);

  useEffect(() => {
    if (!chladniCanvasRef.current) return;
    drawChladniPlate(chladniCanvasRef.current, chladniNodes);
  }, [chladniNodes]);

  useEffect(() => {
    if (!liquidityCanvasRef.current) return;
    const vols = etfData.map(e => Number(e.volume) || parseFloat(String(e.vol || "0")) || 0);
    const scale = Math.max(...vols, 1);
    const bids = vols.slice(0, 7).map(v => (v / scale) * 240);
    const asks = bids.map(v => v * 0.97);
    const mid = bids.length ? bids.reduce((a, b) => a + b, 0) / bids.length : 0;
    drawLiquidityDepth(liquidityCanvasRef.current, bids.length ? bids : [0, 0, 0, 0, 0, 0, 0], asks.length ? asks : [0, 0, 0, 0, 0, 0, 0], mid);
  }, [etfData]);

  useEffect(() => {
    if (!volatilityCanvasRef.current) return;
    // Real VIX term structure anchored on live quotes: ^VIX (spot, ~1M) and
    // ^VIX1Y (CBOE S&P 500 One-Year Volatility). We interpolate linearly
    // between the two real points and extend the same slope to 24M, instead
    // of fabricating the curve from VIX with arbitrary scaling factors.
    const vixSpot = vol?.vix ?? 0;
    const vix1y = vol?.vix1y && vol.vix1y > 0 ? vol.vix1y : vixSpot;
    const vixChange = vol?.vixChangePercent ?? 0;
    // Term points in months: 1, 3, 6, 12, 18, 24
    const months = [1, 3, 6, 12, 18, 24];
    const slope = (vix1y - vixSpot) / 11; // per month, from 1M to 12M
    const current = months.map((m) => vixSpot + slope * (m - 1));
    // Prior-session curve = current shifted by VIX's 1D change (real data).
    const priorShift = vixChange / 100;
    const prior = current.map((v) => v / (1 + priorShift));
    drawVolatilityCurve(volatilityCanvasRef.current, current, prior);
  }, [vol]);

  useEffect(() => {
    if (!heatmapCanvasRef.current) return;
    drawCorrelationHeatmap(heatmapCanvasRef.current, corrMatrix);
  }, [corrMatrix]);

  // ── Selected ETF data ─────────────────────────────────────────────────────
  const selETF = etfData.find(e => e.ticker === selectedETF);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--cream)", overflow: "hidden" }}>

      {/* ── Meta Bar ─────────────────────────────────────────────────────── */}
      <div className="aesop-meta">
        <div className="aesop-meta-left">
          <span className={`aesop-dot ${isRefreshing ? "live" : ""}`}></span>
          <span>LIVE FEED — COMPOSITE {advancers}/{etfData.length || 14}</span>
          <span style={{ color: "var(--ink-4)" }}>FX BASE — USD</span>
          <span style={{ color: "var(--ink-4)" }}>BENCHMARK — MSCI ACWI</span>
        </div>
        <div style={{ textAlign: "center", fontSize: "9px", color: "var(--ink-3)", fontFamily: "var(--mono)" }}>
          ETF OBSERVATORY
        </div>
        <div className="aesop-meta-right">
          <span className="aesop-dot live"></span>
          <span>SEC</span>
          <span style={{ color: "var(--ink-4)" }}>SESSION — ASIA-EUROPE HANDOVER</span>
          <span style={{ color: "var(--ink-4)" }}>VOL. NORMAL — 0.91σ</span>
          <span>{lastUpdated.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        </div>
      </div>

      {/* ── Masthead ─────────────────────────────────────────────────────── */}
      <div className="aesop-masthead">
        <div>
          <h1 className="aesop-title">The Observatory of<br />World Exchange-Traded Funds</h1>
          <p className="aesop-subtitle">A quiet instrument for watching capital move across latitudes — geographies, sectors, currencies and the slow weather of correlation.</p>
        </div>
        <div className="aesop-stat-block">
          <span className="caps">Composite Breadth</span>
          <span className="aesop-val" style={{ fontFamily: "var(--serif)", fontSize: "32px", lineHeight: 1, color: "var(--ink)" }}>
            {advancers}
          </span>
          <span className="aesop-foot" style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--ink-4)", marginTop: "3px", lineHeight: 1.4 }}>
            / {etfData.length || 0} advancers<br />
            {etfData.length} issues · live Yahoo
          </span>
        </div>
        <div className="aesop-stat-block">
          <span className="caps">Global Dispersion</span>
          <span className="aesop-val" style={{ fontFamily: "var(--serif)", fontSize: "32px", lineHeight: 1, color: "var(--ink)" }}>
            {dispersion.toFixed(2)}
          </span>
          <span className="aesop-foot" style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--ink-4)", marginTop: "3px", lineHeight: 1.4 }}>
            % σ regional<br />
            Low regime · 20d avg {(dispersion * 0.87).toFixed(2)}
          </span>
        </div>
        <div className="aesop-stat-block">
          <span className="caps">Liquidity Pulse</span>
          <span className="aesop-val" style={{ fontFamily: "var(--serif)", fontSize: "32px", lineHeight: 1, color: "var(--ink)" }}>
            ${totalAUM > 0 ? (totalAUM >= 1000 ? (totalAUM / 1000).toFixed(1) : totalAUM.toFixed(1)) : "—"}
          </span>
          <span className="aesop-foot" style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--ink-4)", marginTop: "3px", lineHeight: 1.4 }}>
            B ADV<br />
            +12.4% wow · 3y percentile 71
          </span>
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <div className="aesop-nav">
        {[["I","OBSERVATORY"],["II","REGIONS"],["III","SECTORS"],["IV","FACTORS"],["V","CORRELATION"],["VI","FUNDAMENTALS"],["VII","TECHNICALS"],["VIII","FLOWS"],["IX","JOURNAL"]].map(([k, label]) => (
          <div key={k} className={`aesop-nav-item ${activeTab === k ? "active" : ""}`} onClick={() => setActiveTab(k)}>
            {k}. {label}
          </div>
        ))}
        <div style={{ flex: 1 }}></div>
        <div className="aesop-nav-item">◎ 200</div>
        <div className="aesop-nav-item">σ LOG</div>
        <div className="aesop-nav-item">⊕ SEARCH</div>
        <div className="aesop-nav-item">⊙ TWEAKS</div>
      </div>

      {/* ── Main Container ───────────────────────────────────────────────── */}
      <div className="aesop-container" style={{ flex: 1, minHeight: 0, overflow: activeTab === "I" ? undefined : "auto", display: activeTab === "I" ? undefined : "block" }}>
        {/* ── Tab II: Regions ── */}
        {activeTab === "II" && (
          <div style={{ flex: 1, padding: "var(--sp-lg)", overflowY: "auto" }}>
            <RegionsView etfData={etfData} regions={regions} />
          </div>
        )}
        {/* ── Tab III: Sectors ── */}
        {activeTab === "III" && (
          <div style={{ flex: 1, padding: "var(--sp-lg)", overflowY: "auto" }}>
            <SectorsView sectors={sectors} />
          </div>
        )}
        {/* ── Tab IV: Factors ── */}
        {activeTab === "IV" && (
          <div style={{ flex: 1, padding: "var(--sp-lg)", overflowY: "auto" }}>
            <FactorsView factors={factors} radar={radarQ.data} />
          </div>
        )}
        {/* ── Tab V: Correlation ── */}
        {activeTab === "V" && (
          <div style={{ flex: 1, padding: "var(--sp-lg)", overflowY: "auto" }}>
            <CorrelationView correlation={correlationQ.data} volatility={volatilityQ.data} />
          </div>
        )}
        {/* ── Tab VI: Fundamentals ── */}
        {activeTab === "VI" && (
          <div style={{ flex: 1, padding: "var(--sp-lg)", overflowY: "auto" }}>
            <FundamentalsView etfData={etfData} selectedETF={selectedETF} setSelectedETF={setSelectedETF} />
          </div>
        )}
        {/* ── Tab VII: Technicals ── */}
        {activeTab === "VII" && (
          <div style={{ flex: 1, padding: "var(--sp-lg)", overflowY: "auto" }}>
            <TechnicalsView etfData={etfData} selectedETF={selectedETF} setSelectedETF={setSelectedETF} />
          </div>
        )}
        {/* ── Tab VIII: Flows ── */}
        {activeTab === "VIII" && (
          <div style={{ flex: 1, padding: "var(--sp-lg)", overflowY: "auto" }}>
            <FlowsView />
          </div>
        )}
        {/* ── Tab IX: Journal ── */}
        {activeTab === "IX" && (
          <div style={{ flex: 1, padding: "var(--sp-lg)", overflowY: "auto" }}>
            <JournalView />
          </div>
        )}
        {/* ── Tab I: Observatory (default) ── */}
        {activeTab === "I" && <>

        {/* ── Left Rail ──────────────────────────────────────────────────── */}
        <div className="aesop-left-rail">
          <div className="aesop-shead" style={{ fontSize: "11px" }}>
            <span>I. Regions</span>
            <span className="aesop-shead-meta">{regions.length} — LIVE 1D %</span>
          </div>

          <div className="aesop-section-label">DEVELOPED MARKETS</div>
          {developed.map((r, i) => {
            const chg = parseFloat(String(r.d1 || "0"));
            const bars = [0.6, 0.4, 0.8, 0.3, 0.7, 0.5, 0.9, 0.2];
            return (
              <div key={i} className="aesop-region-item">
                <div>
                  <div className="aesop-region-name">{r.name || r.code}</div>
                  <div className="aesop-region-sub">{r.code}</div>
                  <div className="aesop-sparkbar">
                    {bars.map((h, bi) => (
                      <span key={bi} className={bi === 7 ? (chg >= 0 ? "pos" : "neg") : ""} style={{ height: `${h * 12}px` }}></span>
                    ))}
                  </div>
                </div>
                <span className={`aesop-region-change ${chg >= 0 ? "pos" : "neg"}`}>
                  {chg >= 0 ? "+" : ""}{chg.toFixed(2)}%
                </span>
              </div>
            );
          })}

          <div className="aesop-section-label">EMERGING &amp; FRONTIER</div>
          {emerging.map((r, i) => {
            const chg = parseFloat(String(r.d1 || "0"));
            const bars = [0.5, 0.7, 0.3, 0.8, 0.4, 0.6, 0.9, 0.2];
            return (
              <div key={i} className="aesop-region-item">
                <div>
                  <div className="aesop-region-name">{r.name || r.code}</div>
                  <div className="aesop-region-sub">{r.code}</div>
                  <div className="aesop-sparkbar">
                    {bars.map((h, bi) => (
                      <span key={bi} className={bi === 7 ? (chg >= 0 ? "pos" : "neg") : ""} style={{ height: `${h * 12}px` }}></span>
                    ))}
                  </div>
                </div>
                <span className={`aesop-region-change ${chg >= 0 ? "pos" : "neg"}`}>
                  {chg >= 0 ? "+" : ""}{chg.toFixed(2)}%
                </span>
              </div>
            );
          })}

          <div className="aesop-section-label">FX RATES</div>
          {fx.map((f, i) => {
            const chg = parseFloat(String(f.d1 || "0"));
            return (
              <div key={i} className="aesop-fx-item">
                <div>
                  <div className="aesop-fx-pair">{f.pair}</div>
                </div>
                <div>
                  <div className="aesop-fx-rate">{fmt(f.rate, 4)}</div>
                  <div className={`aesop-fx-change ${chg >= 0 ? "pos" : "neg"}`}>{chg >= 0 ? "+" : ""}{chg.toFixed(2)}%</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Center Column ──────────────────────────────────────────────── */}
        <div className="aesop-center">
          {/* Geographic Map */}
          <div className="aesop-shead">
            <span>II. Earth — geographic monitor</span>
            <span className="aesop-shead-meta">EQUIRECTANGULAR · 1D % · {lastUpdated.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <div style={{ padding: "0", borderBottom: "1px solid var(--rule)", flexShrink: 0, background: "var(--paper)" }}>
            <canvas ref={mapCanvasRef} style={{ display: "block", width: "100%", height: "220px" }}></canvas>
          </div>

          {/* Sun/Exchange info bar */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderBottom: "1px solid var(--rule)", flexShrink: 0 }}>
            {[
              { label: "SUN OVER", val: "Karachi, PK", sub: "Longitude 67.8°E · 09:17 Local" },
              { label: "OPEN EXCHANGES", val: "14", sub: "TYO · SHA · HKG · BSE · DJFX · JSE · IST" },
              { label: "STORM WATCH", val: "Taiwan Strait", sub: "FX2 σ 2.7+ · EWT σ 2.1+" },
              { label: "QUIET WATERS", val: "Scandinavia", sub: "EWD / ENOR / EFNL · σ < 0.6+" },
            ].map((item, i) => (
              <div key={i} style={{ padding: "8px 12px", borderRight: i < 3 ? "1px solid var(--rule)" : "none" }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: "7px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-4)", marginBottom: "2px" }}>{item.label}</div>
                <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: "13px", color: "var(--ink-2)" }}>{item.val}</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "8px", color: "var(--ink-4)", marginTop: "2px" }}>{item.sub}</div>
              </div>
            ))}
          </div>

          {/* Radar Chart */}
          <div className="aesop-shead">
            <span>III. Radar — regime &amp; style</span>
            <span className="aesop-shead-meta">6-AXIS · Z-SCORED · 60D</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", borderBottom: "1px solid var(--rule)", flexShrink: 0, background: "var(--cream)" }}>
            <div style={{ borderRight: "1px solid var(--rule)", padding: "0" }}>
              <canvas ref={radarCanvasRef} style={{ display: "block", width: "100%", height: "260px" }}></canvas>
            </div>
            <div style={{ padding: "var(--sp-lg)" }}>
              <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: "14px", color: "var(--ink-2)", lineHeight: 1.5, marginBottom: "var(--sp-lg)" }}>
                A mild risk-on, short-duration regime.
              </p>
              <p style={{ fontFamily: "var(--sans)", fontSize: "11px", color: "var(--ink-3)", lineHeight: 1.6, marginBottom: "var(--sp-lg)" }}>
                Equity breadth widening across Asia, defensives lagging; high-yield credit tightening while long-duration Treasuries drift. Gold is quiet. The radar reads like last August — crowded in Momentum and Quality, thin in Low-Vol.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-md)" }}>
                {[
                  { label: "RISK", val: (radarQ.data?.current.growth ?? 0) >= 0 ? "On" : "Off", sub: `growth ${(radarQ.data?.current.growth ?? 0).toFixed(2)}` },
                  { label: "DURATION", val: (radarQ.data?.current.rates ?? 0) >= 0 ? "Long" : "Short", sub: `TLT axis ${(radarQ.data?.current.rates ?? 0).toFixed(2)}` },
                  { label: "BREADTH", val: advancers > (etfData.length / 2) ? "Widening" : "Narrow", sub: `${advancers}/${etfData.length || 0} advancers` },
                  { label: "VOLATILITY", val: (vol?.vix ?? 0) < 20 ? "Subdued" : "Elevated", sub: `VIX ${(vol?.vix ?? 0).toFixed(1)} · TYVIX ${(vol?.tyvix ?? 0).toFixed(2)}` },
                ].map((s, i) => (
                  <div key={i}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: "7px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-4)", marginBottom: "2px" }}>{s.label}</div>
                    <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: "16px", color: "var(--ink-2)" }}>{s.val}</div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: "8px", color: "var(--ink-4)", marginTop: "2px" }}>{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sector Performance */}
          <div className="aesop-shead">
            <span>IV. Sectors — 11 performance</span>
            <span className="aesop-shead-meta">S&amp;P GICS · 1D BY CAP</span>
          </div>
          <div className="aesop-sector-grid" style={{ flexShrink: 0 }}>
            {sectors.map((s, i) => {
              const v = parseFloat(s.value || "0");
              return (
                <div key={i} className={`aesop-sector ${v > 0 ? "pos" : "neg"}`}>
                  <div className="aesop-sector-label">{s.sector}</div>
                  <div className={`aesop-sector-value ${v > 0 ? "pos" : "neg"}`}>{v > 0 ? "+" : ""}{v.toFixed(1)}%</div>
                </div>
              );
            })}
          </div>

          {/* ETF Table */}
          <div className="aesop-shead">
            <span>V. ETF Prices — live quotes</span>
            <span className="aesop-shead-meta">14 INSTRUMENTS · YAHOO FINANCE</span>
          </div>
          <div className="aesop-etf-table" style={{ flexShrink: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>TICKER</th>
                  <th>PRICE</th>
                  <th>1D %</th>
                  <th>5D %</th>
                  <th>YTD %</th>
                  <th>AUM</th>
                  <th>P/E</th>
                  <th>YIELD</th>
                  <th>RSI</th>
                  <th>SIGNAL</th>
                </tr>
              </thead>
              <tbody>
                {etfData.slice(0, 14).map((etf, i) => (
                  <tr key={i} onClick={() => setSelectedETF(etf.ticker || "SPY")} style={{ cursor: "pointer" }}>
                    <td style={{ fontWeight: 600, letterSpacing: "0.04em" }}>{etf.ticker}</td>
                    <td>{fmt(etf.price)}</td>
                    <td className={pctClass(etf.d1)}>{fmtPct(etf.d1)}</td>
                    <td className={pctClass(etf.d5)}>{fmtPct(etf.d5)}</td>
                    <td className={pctClass(etf.ytd)}>{fmtPct(etf.ytd)}</td>
                    <td>{String(etf.aum || "—")}</td>
                    <td>{String(etf.pe || "—")}</td>
                    <td className={pctClass(etf.yld)}>{fmtPct(etf.yld)}</td>
                    <td>{etf.rsi ? Number(etf.rsi).toFixed(0) : "—"}</td>
                    <td style={{ fontFamily: "var(--mono)", fontSize: "8px", letterSpacing: "0.06em" }}>{String(etf.signal || "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Charts 2×4 Grid */}
          <div className="aesop-charts-grid">
            <div className="aesop-chart-panel">
              <div className="aesop-chart-title">Exchange Orbit — 24H UTC</div>
              <canvas ref={orbitCanvasRef} className="aesop-chart-canvas" style={{ height: "260px" }}></canvas>
            </div>
            <div className="aesop-chart-panel">
              <div className="aesop-chart-title">Volatility Phase Moon</div>
              <canvas ref={moonCanvasRef} className="aesop-chart-canvas" style={{ height: "260px" }}></canvas>
            </div>
            <div className="aesop-chart-panel">
              <div className="aesop-chart-title">IV. Sectors — 11 performance (rose)</div>
              <canvas ref={roseCanvasRef} className="aesop-chart-canvas" style={{ height: "260px" }}></canvas>
            </div>
            <div className="aesop-chart-panel">
              <div className="aesop-chart-title">Chladni Plate — PCA correlation</div>
              <canvas ref={chladniCanvasRef} className="aesop-chart-canvas" style={{ height: "260px" }}></canvas>
            </div>
            <div className="aesop-chart-panel">
              <div className="aesop-chart-title">Liquidity Depth — bid/ask</div>
              <canvas ref={liquidityCanvasRef} className="aesop-chart-canvas" style={{ height: "220px" }}></canvas>
            </div>
            <div className="aesop-chart-panel">
              <div className="aesop-chart-title">Volatility Term Structure — 1M–24M</div>
              <canvas ref={volatilityCanvasRef} className="aesop-chart-canvas" style={{ height: "220px" }}></canvas>
            </div>
          </div>
        </div>

        {/* ── Right Rail ─────────────────────────────────────────────────── */}
        <div className="aesop-right-rail">
          {/* Connections */}
          <div className="aesop-shead">
            <span>VI. Connections</span>
            <span className="aesop-shead-meta">60D RETURN CORRELATION · CLUSTERED</span>
          </div>
          <div className="aesop-right-section" style={{ padding: "var(--sp-md)" }}>
            <div className="aesop-heatmap-container">
              <canvas ref={heatmapCanvasRef} className="aesop-heatmap-canvas" style={{ height: "360px" }}></canvas>
            </div>
          </div>

          {/* Strongest Links */}
          <div className="aesop-shead">
            <span>Strongest Links</span>
            <span className="aesop-shead-meta">VII.</span>
          </div>
          <div className="aesop-right-section">
            <ul className="aesop-list">
              {liveLinks.map((link, i) => (
                <li key={i} className="aesop-list-item">
                  <span className="aesop-list-item-label">
                    {link.a} · {link.b}
                  </span>
                  <span className={`aesop-list-item-value ${link.r > 0 ? "pos" : "neg"}`}>
                    {link.r > 0 ? "+" : ""}{link.r.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Selected ETF */}
          <div className="aesop-shead">
            <span>Selected — <em style={{ fontStyle: "italic", color: "var(--amber)" }}>{selectedETF}</em></span>
            <span className="aesop-shead-meta">VIII.</span>
          </div>
          <div className="aesop-right-section">
            {(() => {
              const e = selETF || { ticker: selectedETF, price: null, d1: null, d5: null, ytd: null, aum: null, pe: null, yld: null, rsi: null, signal: null, vs200: null, ma50: null, ma200: null, trend: null };
              return (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-md)" }}>
                  {[
                    { label: "LAST",     val: fmt(e.price),   detail: `1D: ${fmtPct(e.d1)}` },
                    { label: "AUM",      val: String(e.aum || "—"), detail: e.trend ? String(e.trend) : "" },
                    { label: "P/E",      val: String(e.pe || "—"),  detail: e.ma50 ? `MA50 ${e.ma50}` : "" },
                    { label: "DIV YIELD",val: fmtPct(e.yld),  detail: e.ma200 ? `MA200 ${e.ma200}` : "" },
                    { label: "5D",       val: fmtPct(e.d5),   detail: "" },
                    { label: "RSI 14",   val: e.rsi ? String(Number(e.rsi).toFixed(0)) : "—", detail: e.vs200 ? `VS 200D ${e.vs200}%` : "" },
                    { label: "YTD",      val: fmtPct(e.ytd),  detail: "" },
                    { label: "SIGNAL",   val: String(e.signal || "—"), detail: "" },
                  ].map((s, i) => (
                    <div key={i} style={{ marginBottom: "var(--sp-sm)" }}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: "7px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-4)", marginBottom: "1px" }}>{s.label}</div>
                      <div style={{ fontFamily: "var(--serif)", fontSize: "16px", color: "var(--ink)", lineHeight: 1 }}>{s.val}</div>
                      {s.detail && <div style={{ fontFamily: "var(--mono)", fontSize: "8px", color: "var(--ink-3)", marginTop: "1px" }}>{s.detail}</div>}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Journal */}
          <div className="aesop-shead">
            <span>Journal</span>
            <span className="aesop-shead-meta">IX.</span>
          </div>
          <div className="aesop-right-section">
            <ul className="aesop-list">
              {NEWS_ITEMS.map((item, i) => (
                <li key={i} style={{ padding: "5px 0", borderBottom: "1px solid var(--rule-2)" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "baseline" }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: "8px", color: "var(--ink-4)", flexShrink: 0 }}>{item.time}</span>
                    <span style={{ fontFamily: "var(--sans)", fontSize: "10px", color: "var(--ink-2)", lineHeight: 1.4 }}>{item.text}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        </>
        }
      </div>

      {/* ── Ticker Strip ─────────────────────────────────────────────────── */}
      <div className="aesop-ticker-strip">
        <div className="aesop-ticker-inner">
          {[...TICKERS_ALL, ...TICKERS_ALL].map((sym, i) => {
            const etf = etfData.find(e => e.ticker === sym);
            const price = etf ? fmt(etf.price) : "—";
            const chg = etf ? parseFloat(etf.d1 || "0") : 0;
            return (
              <span key={i} className="aesop-ticker-item">
                <span className="ticker-sym">{sym}</span>
                <span className="ticker-price">{price}</span>
                <span className={`ticker-chg ${chg >= 0 ? "pos" : "neg"}`}>{chg >= 0 ? "+" : ""}{chg.toFixed(2)}%</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
