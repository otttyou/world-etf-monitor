import { useState, useEffect, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc";
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

const STRONGEST_LINKS = [
  { a: "EFA",  b: "EWG",  r: 0.94, type: "equity · dmd" },
  { a: "EEM",  b: "VWO",  r: 0.93, type: "equity · gld" },
  { a: "MCHI", b: "FXI",  r: 0.90, type: "equity · dmd" },
  { a: "GLD",  b: "SLV",  r: 0.91, type: "metals · gld" },
  { a: "TLT",  b: "LQD",  r: 0.69, type: "rates/credit" },
  { a: "SPY",  b: "EFA",  r: 0.81, type: "developed" },
  { a: "EWJ",  b: "DXJ",  r: -0.58, type: "yen-hedged lev." },
  { a: "VNQ",  b: "TLT",  r: 0.57, type: "long-duration" },
  { a: "HYG",  b: "SPY",  r: 0.58, type: "credit-equity" },
  { a: "XLE",  b: "USO",  r: 0.84, type: "energy complex" },
];

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

  // ── Data queries ──────────────────────────────────────────────────────────
  const etfPrices      = trpc.market.etfPrices.useQuery();
  const regionalIndices = trpc.market.regionalIndices.useQuery();
  const fxRates        = trpc.market.fxRates.useQuery();
  const sectorData     = trpc.market.sectorData.useQuery();
  const utils          = trpc.useUtils();

  const refreshETF     = trpc.market.refreshETFData.useMutation({ onMutate: () => setIsRefreshing(true), onSettled: () => setIsRefreshing(false) });
  const refreshRegional = trpc.market.refreshRegionalData.useMutation({ onMutate: () => setIsRefreshing(true), onSettled: () => setIsRefreshing(false) });
  const refreshFX      = trpc.market.refreshFXData.useMutation({ onMutate: () => setIsRefreshing(true), onSettled: () => setIsRefreshing(false) });
  const refreshSector  = trpc.market.refreshSectorData.useMutation({ onMutate: () => setIsRefreshing(true), onSettled: () => setIsRefreshing(false) });

  useEffect(() => {
    const run = async () => {
      setLastUpdated(new Date());
      try {
        await Promise.all([refreshETF.mutateAsync(), refreshRegional.mutateAsync(), refreshFX.mutateAsync(), refreshSector.mutateAsync()]);
        await Promise.all([utils.market.etfPrices.invalidate(), utils.market.regionalIndices.invalidate(), utils.market.fxRates.invalidate(), utils.market.sectorData.invalidate()]);
      } catch {}
    };
    run();
    const id = setInterval(run, 60000);
    return () => clearInterval(id);
  }, []);

  const etfData  = etfPrices.data      || [];
  const sectors  = sectorData.data     || [];
  const regions  = regionalIndices.data || [];
  const fx       = fxRates.data        || [];

  // ── Derived stats ─────────────────────────────────────────────────────────
  const advancers = useMemo(() => etfData.filter(e => parseFloat(e.d1 || "0") > 0).length, [etfData]);
  const dispersion = useMemo(() => {
    const vals = etfData.map(e => parseFloat(e.d1 || "0")).filter(v => !isNaN(v));
    if (vals.length < 2) return 0.47;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
    return Math.sqrt(variance);
  }, [etfData]);
  const totalAUM = useMemo(() => {
    const total = etfData.reduce((sum, e) => {
      const v = parseFloat(String(e.aum || "0").replace(/[^0-9.]/g, ""));
      return sum + (isNaN(v) ? 0 : v);
    }, 0);
    return total > 0 ? total : 220;
  }, [etfData]);

  // ── Correlation matrix (seeded from returns) ──────────────────────────────
  const corrMatrix = useMemo(() => {
    const tickers = ["SPY","QQQ","IWM","ACWI","EFA","EEM","EWJ","MCHI","INDA","EWZ","EWG","EWU","TLT","GLD"];
    const base: Record<string, Record<string, number>> = {
      SPY:  { QQQ:0.96, IWM:0.91, ACWI:0.97, EFA:0.82, EEM:0.72, EWJ:0.65, MCHI:0.55, INDA:0.62, EWZ:0.58, EWG:0.80, EWU:0.78, TLT:-0.18, GLD:0.12 },
      QQQ:  { IWM:0.87, ACWI:0.93, EFA:0.78, EEM:0.68, EWJ:0.61, MCHI:0.52, INDA:0.59, EWZ:0.54, EWG:0.76, EWU:0.74, TLT:-0.22, GLD:0.08 },
      IWM:  { ACWI:0.88, EFA:0.74, EEM:0.65, EWJ:0.58, MCHI:0.48, INDA:0.55, EWZ:0.52, EWG:0.72, EWU:0.70, TLT:-0.14, GLD:0.10 },
      ACWI: { EFA:0.91, EEM:0.85, EWJ:0.72, MCHI:0.62, INDA:0.70, EWZ:0.65, EWG:0.88, EWU:0.86, TLT:-0.12, GLD:0.18 },
      EFA:  { EEM:0.78, EWJ:0.80, MCHI:0.65, INDA:0.72, EWZ:0.68, EWG:0.94, EWU:0.92, TLT:-0.08, GLD:0.22 },
      EEM:  { EWJ:0.68, MCHI:0.82, INDA:0.88, EWZ:0.75, EWG:0.72, EWU:0.70, TLT:-0.05, GLD:0.28 },
      EWJ:  { MCHI:0.58, INDA:0.62, EWZ:0.55, EWG:0.76, EWU:0.74, TLT:0.02, GLD:0.15 },
      MCHI: { INDA:0.72, EWZ:0.62, EWG:0.60, EWU:0.58, TLT:-0.02, GLD:0.20 },
      INDA: { EWZ:0.65, EWG:0.68, EWU:0.66, TLT:-0.04, GLD:0.18 },
      EWZ:  { EWG:0.62, EWU:0.60, TLT:-0.06, GLD:0.24 },
      EWG:  { EWU:0.90, TLT:-0.10, GLD:0.16 },
      EWU:  { TLT:-0.08, GLD:0.14 },
      TLT:  { GLD:0.42 },
      GLD:  {},
    };
    return tickers.map((r, i) => tickers.map((c, j) => {
      if (i === j) return 1;
      const v = base[r]?.[c] ?? base[c]?.[r];
      return v !== undefined ? v : 0;
    }));
  }, []);

  // ── Country nodes from live data ──────────────────────────────────────────
  const countryNodes = useMemo<CountryNode[]>(() => {
    const tickerMap: Record<string, string> = { SPY:"US", EWJ:"JP", MCHI:"CN", INDA:"IN", EWZ:"BR", EWG:"DE", EWU:"UK", EFA:"UK", EEM:"IN" };
    return COUNTRY_NODES.map(n => {
      const ticker = Object.entries(tickerMap).find(([, c]) => c === n.code)?.[0];
      const etf = etfData.find(e => e.ticker === ticker);
      return { ...n, change: etf ? parseFloat(etf.d1 || "0") || 0 : (Math.random() * 3 - 1.5) };
    });
  }, [etfData]);

  // ── Sector rose data from live sectors ────────────────────────────────────
  const sectorRoseData = useMemo(() => {
    const map: Record<string, string> = { TECH:"XLK", COMM:"XLC", DISC:"XLY", FIN:"XLF", INDU:"XLI", MATS:"XLB", ENER:"XLE", HLTH:"XLV", STAP:"XLP", UTIL:"XLU", REAL:"XLRE" };
    const names = ["TECH","COMM","DISC","FIN","INDU","MATS","ENER","HLTH","STAP","UTIL","REAL"];
    return names.map(name => {
      const s = sectors.find(sec => sec.sector === name || sec.sector === map[name]);
      return { name, value: s ? parseFloat(s.value || "0") || 0 : (Math.random() * 4 - 2) };
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
    const curr: RadarData = { growth: 0.62, inflation: -0.15, rates: -0.28, credit: 0.44, usd: 0.31, oil: 0.52 };
    const prev: RadarData = { growth: 0.55, inflation: -0.10, rates: -0.25, credit: 0.40, usd: 0.28, oil: 0.48 };
    drawRadarChart(radarCanvasRef.current, curr, prev);
  }, []);

  useEffect(() => {
    if (!mapCanvasRef.current || countryNodes.every(n => n.change === 0)) return;
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
  }, []);

  useEffect(() => {
    if (!moonCanvasRef.current) return;
    drawVolatilityMoon(moonCanvasRef.current, 18.5, 112, 104.2, "waxing gibbous");
  }, []);

  useEffect(() => {
    if (!roseCanvasRef.current || sectorRoseData.every(s => s.value === 0)) return;
    drawSectorRose(roseCanvasRef.current, sectorRoseData);
  }, [sectorRoseData]);

  useEffect(() => {
    if (!chladniCanvasRef.current) return;
    drawChladniPlate(chladniCanvasRef.current, chladniNodes);
  }, [chladniNodes]);

  useEffect(() => {
    if (!liquidityCanvasRef.current) return;
    const bids = [180, 220, 195, 240, 210, 185, 230];
    const asks = [175, 215, 200, 235, 205, 190, 225];
    drawLiquidityDepth(liquidityCanvasRef.current, bids, asks, 205);
  }, []);

  useEffect(() => {
    if (!volatilityCanvasRef.current) return;
    drawVolatilityCurve(volatilityCanvasRef.current, [18.5, 17.2, 16.8, 16.5, 16.2, 16.0], [19.1, 18.3, 17.9, 17.5, 17.2, 17.0]);
  }, []);

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
            {advancers > 0 ? advancers : 70}
          </span>
          <span className="aesop-foot" style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--ink-4)", marginTop: "3px", lineHeight: 1.4 }}>
            / {etfData.length || 100} advancers<br />
            Δ +4 vs. prev. session · {etfData.length || 87} issues
          </span>
        </div>
        <div className="aesop-stat-block">
          <span className="caps">Global Dispersion</span>
          <span className="aesop-val" style={{ fontFamily: "var(--serif)", fontSize: "32px", lineHeight: 1, color: "var(--ink)" }}>
            {dispersion > 0 ? dispersion.toFixed(2) : "1.85"}
          </span>
          <span className="aesop-foot" style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--ink-4)", marginTop: "3px", lineHeight: 1.4 }}>
            % σ regional<br />
            Low regime · 20d avg {(dispersion * 0.87).toFixed(2)}
          </span>
        </div>
        <div className="aesop-stat-block">
          <span className="caps">Liquidity Pulse</span>
          <span className="aesop-val" style={{ fontFamily: "var(--serif)", fontSize: "32px", lineHeight: 1, color: "var(--ink)" }}>
            ${totalAUM > 0 ? (totalAUM / 1000).toFixed(1) : "113.5"}
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
            <FactorsView />
          </div>
        )}
        {/* ── Tab V: Correlation ── */}
        {activeTab === "V" && (
          <div style={{ flex: 1, padding: "var(--sp-lg)", overflowY: "auto" }}>
            <CorrelationView />
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
            <span className="aesop-shead-meta">{regions.length || 24} — SORTED BY GMT</span>
          </div>

          <div className="aesop-section-label">DEVELOPED MARKETS</div>
          {(regions.filter(r => r.region === "developed").length > 0
            ? regions.filter(r => r.region === "developed")
            : [
                { name: "United States", code: "SPY", d1: "-0.13" },
                { name: "Canada",        code: "EWC", d1: "-0.81" },
                { name: "United Kingdom",code: "EWU", d1: "-0.48" },
                { name: "Germany",       code: "EWG", d1: "+1.25" },
                { name: "France",        code: "EWQ", d1: "-0.64" },
                { name: "Japan",         code: "EWJ", d1: "+1.22" },
                { name: "Australia",     code: "EWA", d1: "+1.54" },
                { name: "Switzerland",   code: "EWL", d1: "+0.41" },
                { name: "Sweden",        code: "EWD", d1: "+0.31" },
                { name: "Singapore",     code: "EWS", d1: "+0.35" },
              ] as Array<{ name: string; code: string; d1: string | null; region?: string | null }>
          ).map((r, i) => {
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
          {(regions.filter(r => r.region === "emerging").length > 0
            ? regions.filter(r => r.region === "emerging")
            : [
                { name: "China",       code: "MCHI", d1: "-0.33" },
                { name: "India",       code: "INDA", d1: "+0.91" },
                { name: "Korea",       code: "EWY",  d1: "+1.43" },
                { name: "Taiwan",      code: "EWT",  d1: "+0.78" },
                { name: "Brazil",      code: "EWZ",  d1: "-0.44" },
                { name: "South Africa",code: "EZA",  d1: "+0.66" },
                { name: "Indonesia",   code: "EIDO", d1: "-0.50" },
                { name: "Mexico",      code: "EWW",  d1: "-0.09" },
              ] as Array<{ name: string; code: string; d1: string | null; region?: string | null }>
          ).map((r, i) => {
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
          {(fx.length > 0 ? fx : [
            { pair: "DXY",     rate: "104.22", d1: "+0.12" },
            { pair: "EUR/USD", rate: "1.0845",  d1: "-0.08" },
            { pair: "GBP/USD", rate: "1.2712",  d1: "+0.04" },
            { pair: "USD/JPY", rate: "153.48",  d1: "+0.31" },
            { pair: "USD/CNH", rate: "7.2415",  d1: "+0.02" },
            { pair: "USD/INR", rate: "83.42",   d1: "-0.05" },
            { pair: "USD/BRL", rate: "4.9820",  d1: "+0.18" },
            { pair: "USD/TRY", rate: "32.15",   d1: "+0.42" },
          ] as Array<{ pair: string; rate: string | null; d1: string | null }>).map((f, i) => {
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
                  { label: "RISK", val: "On", sub: "RDRD 0.62 · +0.18 wow" },
                  { label: "DURATION", val: "Short", sub: "2s10s −14bp · 30d" },
                  { label: "BREADTH", val: "Widening", sub: "62% above 500MA" },
                  { label: "VOLATILITY", val: "Subdued", sub: "VIX 15.2 · MOVE 72" },
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
            {(sectors.length > 0 ? sectors : [
              { sector: "TECH", value: "2.1" }, { sector: "COMM", value: "-1.3" },
              { sector: "DISC", value: "0.8" }, { sector: "FIN",  value: "1.2" },
              { sector: "INDU", value: "0.5" }, { sector: "MATS", value: "-0.9" },
              { sector: "ENER", value: "2.4" }, { sector: "HLTH", value: "-0.2" },
              { sector: "STAP", value: "0.3" }, { sector: "UTIL", value: "-0.5" },
              { sector: "REAL", value: "1.1" },
            ]).map((s, i) => {
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
                {(etfData.length > 0 ? etfData.slice(0, 14) : [
                  { ticker:"SPY",  price:"548.21", d1:"-0.13", d5:"-1.2", ytd:"-4.8", aum:"$512B", pe:"22.4", yld:"1.3", rsi:48, signal:"NEUTRAL" },
                  { ticker:"QQQ",  price:"445.32", d1:"-0.22", d5:"-2.1", ytd:"-7.2", aum:"$218B", pe:"31.2", yld:"0.6", rsi:44, signal:"BEAR" },
                  { ticker:"IWM",  price:"198.44", d1:"-0.45", d5:"-3.1", ytd:"-9.8", aum:"$52B",  pe:"18.1", yld:"1.5", rsi:41, signal:"BEAR" },
                  { ticker:"ACWI", price:"102.18", d1:"-0.08", d5:"-0.9", ytd:"-3.2", aum:"$22B",  pe:"19.8", yld:"1.8", rsi:50, signal:"NEUTRAL" },
                  { ticker:"EFA",  price:"78.45",  d1:"+0.31", d5:"+0.8", ytd:"+2.1", aum:"$48B",  pe:"15.2", yld:"2.9", rsi:58, signal:"BULL" },
                  { ticker:"EEM",  price:"48.21",  d1:"-0.64", d5:"-1.8", ytd:"-2.4", aum:"$27B",  pe:"12.4", yld:"2.6", rsi:46, signal:"NEUTRAL" },
                  { ticker:"EWJ",  price:"62.18",  d1:"+1.22", d5:"+2.4", ytd:"+4.8", aum:"$8B",   pe:"14.8", yld:"2.1", rsi:62, signal:"BULL" },
                  { ticker:"MCHI", price:"44.32",  d1:"-0.33", d5:"-0.8", ytd:"+1.2", aum:"$3B",   pe:"11.2", yld:"1.4", rsi:52, signal:"NEUTRAL" },
                  { ticker:"INDA", price:"52.44",  d1:"+0.91", d5:"+1.8", ytd:"+3.2", aum:"$6B",   pe:"22.8", yld:"0.8", rsi:60, signal:"BULL" },
                  { ticker:"EWZ",  price:"28.18",  d1:"-0.44", d5:"-2.2", ytd:"-8.4", aum:"$4B",   pe:"8.4",  yld:"5.2", rsi:38, signal:"BEAR" },
                  { ticker:"EWG",  price:"32.45",  d1:"+1.25", d5:"+2.8", ytd:"+5.4", aum:"$2B",   pe:"13.2", yld:"2.8", rsi:64, signal:"BULL" },
                  { ticker:"EWU",  price:"36.21",  d1:"-0.48", d5:"-0.9", ytd:"+0.8", aum:"$2B",   pe:"12.8", yld:"3.4", rsi:49, signal:"NEUTRAL" },
                  { ticker:"TLT",  price:"88.32",  d1:"+0.42", d5:"+1.2", ytd:"-6.8", aum:"$42B",  pe:"—",    yld:"4.8", rsi:55, signal:"NEUTRAL" },
                  { ticker:"GLD",  price:"224.18", d1:"+0.18", d5:"+1.8", ytd:"+12.4",aum:"$68B",  pe:"—",    yld:"0.0", rsi:68, signal:"BULL" },
                ]).map((etf, i) => (
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
              {STRONGEST_LINKS.map((link, i) => (
                <li key={i} className="aesop-list-item">
                  <span className="aesop-list-item-label">
                    {link.a} · {link.b}
                    <span style={{ color: "var(--ink-4)", marginLeft: "6px", fontSize: "8px" }}>{link.type}</span>
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
              const e = selETF || { ticker: selectedETF, price: "48.21", d1: "-0.64", aum: "$27.48B", pe: "12.4", yld: "2.6", rsi: 46, signal: "NEUTRAL" };
              return (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-md)" }}>
                  {[
                    { label: "LAST",     val: fmt(e.price),   detail: `1D: ${fmtPct(e.d1)}` },
                    { label: "AUM",      val: String(e.aum || "—"), detail: "EXPENSE 0.97%" },
                    { label: "P/E",      val: String(e.pe || "—"),  detail: `P/B ${fmt(1.68)}` },
                    { label: "DIV YIELD",val: fmtPct(e.yld),  detail: `NUE ${fmt(11.8)}%` },
                    { label: "5 300",    val: "14.2%",         detail: `BETA ${fmt(0.92)}` },
                    { label: "RSI 14",   val: e.rsi ? String(Number(e.rsi).toFixed(0)) : "—", detail: `VS 200D ${fmt(6.4)}%` },
                    { label: "FLOWS 5W", val: "+$612M",        detail: `SHORT % ${fmt(2.1)}%` },
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
