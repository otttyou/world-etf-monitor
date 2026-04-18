import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
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

export default function Observatory() {
  const [activeTab, setActiveTab] = useState("I");
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedETF, setSelectedETF] = useState("EEM");

  // Canvas refs
  const radarCanvasRef = useRef<HTMLCanvasElement>(null);
  const mapCanvasRef = useRef<HTMLCanvasElement>(null);
  const orbitCanvasRef = useRef<HTMLCanvasElement>(null);
  const moonCanvasRef = useRef<HTMLCanvasElement>(null);
  const roseCanvasRef = useRef<HTMLCanvasElement>(null);
  const chladniCanvasRef = useRef<HTMLCanvasElement>(null);
  const liquidityCanvasRef = useRef<HTMLCanvasElement>(null);
  const volatilityCanvasRef = useRef<HTMLCanvasElement>(null);
  const heatmapCanvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch market data
  const etfPrices = trpc.market.etfPrices.useQuery();
  const regionalIndices = trpc.market.regionalIndices.useQuery();
  const fxRates = trpc.market.fxRates.useQuery();
  const sectorData = trpc.market.sectorData.useQuery();

  // Refresh mutations
  const refreshETF = trpc.market.refreshETFData.useMutation({
    onMutate: () => setIsRefreshing(true),
    onSettled: () => setIsRefreshing(false),
  });
  const refreshRegional = trpc.market.refreshRegionalData.useMutation({
    onMutate: () => setIsRefreshing(true),
    onSettled: () => setIsRefreshing(false),
  });
  const refreshFX = trpc.market.refreshFXData.useMutation({
    onMutate: () => setIsRefreshing(true),
    onSettled: () => setIsRefreshing(false),
  });
  const refreshSector = trpc.market.refreshSectorData.useMutation({
    onMutate: () => setIsRefreshing(true),
    onSettled: () => setIsRefreshing(false),
  });

  const utils = trpc.useUtils();

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const performRefresh = async () => {
      setLastUpdated(new Date());
      try {
        await Promise.all([
          refreshETF.mutateAsync(),
          refreshRegional.mutateAsync(),
          refreshFX.mutateAsync(),
          refreshSector.mutateAsync(),
        ]);
        await utils.market.etfPrices.invalidate();
        await utils.market.regionalIndices.invalidate();
        await utils.market.fxRates.invalidate();
        await utils.market.sectorData.invalidate();
      } catch (error) {
        console.error("Refresh failed:", error);
      }
    };

    const interval = setInterval(performRefresh, 60000);
    performRefresh();

    return () => clearInterval(interval);
  }, [utils]);

  // Draw all charts when data updates
  useEffect(() => {
    if (!radarCanvasRef.current) return;

    const currentData: RadarData = {
      growth: 0.62,
      inflation: -0.15,
      rates: -0.28,
      credit: 0.44,
      usd: 0.31,
      oil: 0.52,
    };

    const priorData: RadarData = {
      growth: 0.44,
      inflation: -0.08,
      rates: -0.14,
      credit: 0.22,
      usd: 0.18,
      oil: 0.38,
    };

    drawRadarChart(radarCanvasRef.current, currentData, priorData);
  }, []);

  // Draw map
  useEffect(() => {
    if (!mapCanvasRef.current || !regionalIndices.data) return;

    const countries: CountryNode[] = regionalIndices.data.map((r) => ({
      code: r.code || "XX",
      name: r.name || "Unknown",
      lat: getCountryLat(r.code || ""),
      lng: getCountryLng(r.code || ""),
      change: parseFloat(r.d1 || "0"),
    }));

    drawEquirectangularMap(mapCanvasRef.current, countries);
  }, [regionalIndices.data]);

  // Draw exchange orbit
  useEffect(() => {
    if (!orbitCanvasRef.current) return;

    const exchanges: ExchangeMarker[] = [
      { code: "NYSE", hour: 14, isOpen: true },
      { code: "NASD", hour: 14, isOpen: true },
      { code: "TSX", hour: 14, isOpen: true },
      { code: "B3", hour: 15, isOpen: true },
      { code: "LSE", hour: 16, isOpen: false },
      { code: "XETRA", hour: 16, isOpen: false },
      { code: "SIX", hour: 16, isOpen: false },
      { code: "JSE", hour: 8, isOpen: true },
      { code: "DIFX", hour: 10, isOpen: true },
      { code: "BSE", hour: 9, isOpen: true },
      { code: "SGX", hour: 8, isOpen: true },
      { code: "HKG", hour: 9, isOpen: true },
      { code: "SSE", hour: 9, isOpen: true },
      { code: "KRX", hour: 9, isOpen: true },
    ];

    drawExchangeOrbit(orbitCanvasRef.current, exchanges);
  }, []);

  // Draw volatility moon
  useEffect(() => {
    if (!moonCanvasRef.current) return;
    drawVolatilityMoon(moonCanvasRef.current, 19.8, 94, 0.49, "first qtr");
  }, []);

  // Draw sector rose
  useEffect(() => {
    if (!roseCanvasRef.current || !sectorData.data) return;

    const sectors = sectorData.data.map((s) => ({
      name: s.sector || "Unknown",
      value: parseFloat(s.value || "0"),
    }));

    drawSectorRose(roseCanvasRef.current, sectors);
  }, [sectorData.data]);

  // Draw Chladni plate
  useEffect(() => {
    if (!chladniCanvasRef.current || !etfPrices.data) return;

    const etfNodes = etfPrices.data.map((etf, i) => ({
      ticker: etf.ticker || "?",
      x: 20 + (i % 4) * 25,
      y: 20 + Math.floor(i / 4) * 30,
      change: parseFloat(etf.d1 || "0"),
    }));

    drawChladniPlate(chladniCanvasRef.current, etfNodes);
  }, [etfPrices.data]);

  // Draw liquidity depth
  useEffect(() => {
    if (!liquidityCanvasRef.current) return;

    const bids = [120, 150, 180, 200, 220, 250];
    const asks = [210, 190, 160, 140, 110, 80];
    const mid = 548.22;

    drawLiquidityDepth(liquidityCanvasRef.current, bids, asks, mid);
  }, []);

  // Draw volatility curve
  useEffect(() => {
    if (!volatilityCanvasRef.current) return;

    const current = [18, 17.5, 16, 15, 14.5, 14];
    const prior = [16, 15.5, 15, 14.5, 14, 13.5];

    drawVolatilityCurve(volatilityCanvasRef.current, current, prior);

    // Draw correlation heatmap
    if (heatmapCanvasRef.current) {
      const correlationMatrix = [
        [1.00, 0.94, 0.91, 0.62, 0.45, 0.78, 0.55, 0.72, 0.68, 0.51, 0.42, 0.89, 0.76, 0.48],
        [0.94, 1.00, 0.87, 0.58, 0.42, 0.75, 0.52, 0.69, 0.65, 0.48, 0.39, 0.86, 0.73, 0.45],
        [0.91, 0.87, 1.00, 0.65, 0.48, 0.81, 0.58, 0.74, 0.70, 0.54, 0.44, 0.91, 0.78, 0.51],
        [0.62, 0.58, 0.65, 1.00, 0.88, 0.92, 0.85, 0.79, 0.76, 0.68, 0.72, 0.64, 0.55, 0.61],
        [0.45, 0.42, 0.48, 0.88, 1.00, 0.75, 0.82, 0.68, 0.65, 0.58, 0.72, 0.47, 0.38, 0.52],
        [0.78, 0.75, 0.81, 0.92, 0.75, 1.00, 0.88, 0.85, 0.82, 0.75, 0.78, 0.80, 0.68, 0.72],
        [0.55, 0.52, 0.58, 0.85, 0.82, 0.88, 1.00, 0.76, 0.73, 0.65, 0.81, 0.57, 0.48, 0.59],
        [0.72, 0.69, 0.74, 0.79, 0.68, 0.85, 0.76, 1.00, 0.95, 0.72, 0.68, 0.74, 0.62, 0.68],
        [0.68, 0.65, 0.70, 0.76, 0.65, 0.82, 0.73, 0.95, 1.00, 0.69, 0.65, 0.70, 0.59, 0.65],
        [0.51, 0.48, 0.54, 0.68, 0.58, 0.75, 0.65, 0.72, 0.69, 1.00, 0.62, 0.53, 0.45, 0.58],
        [0.42, 0.39, 0.44, 0.72, 0.72, 0.78, 0.81, 0.68, 0.65, 0.62, 1.00, 0.44, 0.35, 0.61],
        [0.89, 0.86, 0.91, 0.64, 0.47, 0.80, 0.57, 0.74, 0.70, 0.53, 0.44, 1.00, 0.79, 0.50],
        [0.76, 0.73, 0.78, 0.55, 0.38, 0.68, 0.48, 0.62, 0.59, 0.45, 0.35, 0.79, 1.00, 0.42],
        [0.48, 0.45, 0.51, 0.61, 0.52, 0.72, 0.59, 0.68, 0.65, 0.58, 0.61, 0.50, 0.42, 1.00],
      ];
      drawCorrelationHeatmap(heatmapCanvasRef.current, correlationMatrix);
    }
  }, []);

  // Format helpers
  const formatTime = (date: Date) => {
    return (
      date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }) + "Z"
    );
  };

  const formatPercent = (value: string | number | null | undefined) => {
    if (!value && value !== 0) return "—";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "—";
    const sign = num >= 0 ? "+" : "−";
    return `${sign}${Math.abs(num).toFixed(2)}%`;
  };

  const getPercentClass = (value: string | number | null | undefined) => {
    if (!value && value !== 0) return "dim";
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(num)) return "dim";
    return num > 0 ? "pos" : num < 0 ? "neg" : "dim";
  };

  // Data processing
  const etfs = etfPrices.data || [];
  const regions = regionalIndices.data || [];
  const fx = fxRates.data || [];
  const sectors = sectorData.data || [];

  const dm = regions.filter((r) => r.region === "DM");
  const em = regions.filter((r) => r.region === "EM");

  // Calculate composite metrics
  const advCount = etfs.filter((e) => {
    const d1 = parseFloat(e.d1 || "0");
    return d1 > 0;
  }).length;
  const breadthPct = etfs.length > 0 ? Math.round((advCount / etfs.length) * 100) : 0;

  const dispersion =
    etfs.length > 0
      ? (
          etfs.reduce((sum, e) => {
            const d1 = parseFloat(e.d1 || "0");
            return sum + Math.abs(d1);
          }, 0) / etfs.length
        ).toFixed(2)
      : "0.00";

  const liquidity = (() => {
    if (etfs.length === 0) return "0";
    const sum = etfs.reduce((acc, e) => {
      const price = parseFloat(e.price || "0");
      return acc + (isNaN(price) ? 0 : price);
    }, 0);
    const avg = sum / etfs.length;
    return isNaN(avg) ? "0" : avg.toFixed(0);
  })();

  // Get selected ETF data
  const selectedETFData = etfs.find((e) => e.ticker === selectedETF);

  // News items
  const newsItems = [
    {
      title: "Asia equity breadth widens",
      content: "Nikkei +1.2%, Shanghai +0.8%, Hong Kong +0.4%",
    },
    {
      title: "Fed speakers hawkish on rates",
      content: "2Y yields +6bp, long-duration bonds drift lower",
    },
    {
      title: "Gold consolidates near $2,100",
      content: "Safe-haven demand steady amid geopolitical concerns",
    },
  ];

  // Correlation matrix data (simulated)
  const correlationPairs = [
    { pair1: "SPY", pair2: "QQQ", corr: 0.94 },
    { pair1: "EEM", pair2: "EWZ", corr: 0.87 },
    { pair1: "EFA", pair2: "EWG", corr: 0.91 },
    { pair1: "EWJ", pair2: "MCHI", corr: 0.62 },
    { pair1: "TLT", pair2: "GLD", corr: 0.45 },
  ];

  return (
    <div className="aesop-frame">
      {/* META STRIP */}
      <div className="aesop-meta">
        <div className="aesop-meta-left">
          <span>
            <span className={`aesop-dot ${isLive && !isRefreshing ? "live" : ""}`}></span>
            LIVE FEED — COMPOSITE {formatTime(lastUpdated)}
          </span>
          <span>
            FX BASE · <b>USD</b>
          </span>
          <span>
            BENCHMARK · <b>MSCI ACWI</b>
          </span>
        </div>
        <div className="aesop-meta-center">
          <span>
            <b>REC SESSION</b> · ASIA→EUROPE HANDOVER
          </span>
        </div>
        <div className="aesop-meta-right">
          <span>
            VOL · <b>NORMAL — {(Math.random() * 0.5 + 0.7).toFixed(2)}σ</b>
          </span>
          <span>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
        </div>
      </div>

      {/* MASTHEAD */}
      <div className="aesop-masthead">
        <div>
          <h1 className="aesop-title">The Observatory of World Exchange-Traded Funds</h1>
          <p className="aesop-subtitle">A quiet instrument for watching capital move across latitudes — geographies, sectors, currencies and the slow weather of correlation.</p>
        </div>
        <div className="aesop-stat-block">
          <span className="aesop-caps">Composite Breadth</span>
          <div className="aesop-val">{isNaN(breadthPct) ? "—" : breadthPct}</div>
          <span className="aesop-sfx">/ 100 advancers</span>
          <div className="aesop-foot">Δ +4 vs. prev. session · 10 issues</div>
        </div>
        <div className="aesop-stat-block">
          <span className="aesop-caps">Global Dispersion</span>
          <div className="aesop-val">{isNaN(parseFloat(dispersion)) ? "—" : dispersion}</div>
          <span className="aesop-sfx">σ regional</span>
          <div className="aesop-foot">Low regime · 25d avg 1.61</div>
        </div>
        <div className="aesop-stat-block">
          <span className="aesop-caps">Liquidity Pulse</span>
          <div className="aesop-val">${liquidity || "—"}</div>
          <span className="aesop-sfx">B ADV</span>
          <div className="aesop-foot">+12.4% wow · 1y percentile 71</div>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="aesop-nav">
        {["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"].map((tab, i) => (
          <button
            key={tab}
            className={`aesop-nav-link ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            <span className="aesop-idx">{tab}.</span>{" "}
            {["OBSERVATORY", "REGIONS", "SECTORS", "FACTORS", "CORRELATION", "FUNDAMENTALS", "TECHNICALS", "FLOWS", "JOURNAL"][i]}
          </button>
        ))}
        <div className="aesop-nav-spacer"></div>
        <div className="aesop-nav-tools">
          <span>⚙ TWEAKS</span>
        </div>
      </nav>

      {/* MAIN GRID */}
      <div className="aesop-grid">
        {/* LEFT RAIL */}
        <aside className="aesop-rail">
          <div className="aesop-shead">
            <span className="aesop-shead-title">
              <span className="roman">I.</span> <em>Regions</em>
            </span>
            <span className="aesop-shead-idx">24 · SORTED BY GMT</span>
          </div>

          {/* Developed Markets */}
          <section className="aesop-rail-section">
            <h3>Developed Markets</h3>
            <div className="aesop-region-list">
              {dm.length > 0 ? (
                dm.map((r, i) => (
                  <div key={i} className={`aesop-region ${i === 0 ? "sel" : ""}`}>
                    <div className="aesop-region-mk">{r.code}</div>
                    <div>
                      <div className="aesop-region-name">
                        <em>{r.name}</em>
                      </div>
                      <div className="aesop-region-sparkline">▁▂▃▂▃▄▃▂▃</div>
                    </div>
                    <div className={`aesop-region-delta ${getPercentClass(r.d1 || undefined)}`}>
                      {formatPercent(r.d1 || undefined)}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: "10px", fontSize: "11px", color: "var(--ink-3)" }}>
                  {isRefreshing ? "Loading..." : "No data"}
                </div>
              )}
            </div>
          </section>

          {/* Emerging Markets */}
          <section className="aesop-rail-section">
            <h3>Emerging &amp; Frontier</h3>
            <div className="aesop-region-list">
              {em.length > 0 ? (
                em.map((r, i) => (
                  <div key={i} className="aesop-region">
                    <div className="aesop-region-mk">{r.code}</div>
                    <div>
                      <div className="aesop-region-name">
                        <em>{r.name}</em>
                      </div>
                      <div className="aesop-region-sparkline">▁▂▃▂▃▄▃▂▃</div>
                    </div>
                    <div className={`aesop-region-delta ${getPercentClass(r.d1 || undefined)}`}>
                      {formatPercent(r.d1 || undefined)}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: "10px", fontSize: "11px", color: "var(--ink-3)" }}>
                  {isRefreshing ? "Loading..." : "No data"}
                </div>
              )}
            </div>
          </section>

          {/* FX Rates */}
          <section className="aesop-rail-section">
            <h3>Currencies</h3>
            <div className="aesop-region-list">
              {fx.length > 0 ? (
                fx.map((r, i) => (
                  <div key={i} className="aesop-region">
                    <div className="aesop-region-mk">$</div>
                    <div>
                      <div className="aesop-region-name">
                        <em>{r.pair}</em>
                      </div>
                      <div className="aesop-region-sparkline">▁▂▃▂▃▄▃▂▃</div>
                    </div>
                    <div className={`aesop-region-delta ${getPercentClass(r.d1 || undefined)}`}>
                      {formatPercent(r.d1 || undefined)}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: "10px", fontSize: "11px", color: "var(--ink-3)" }}>
                  {isRefreshing ? "Loading..." : "No data"}
                </div>
              )}
            </div>
          </section>
        </aside>

        {/* CENTER COLUMN */}
        <main className="aesop-center">
          {/* II. GEOGRAPHIC MONITOR */}
          <div className="aesop-shead">
            <span className="aesop-shead-title">
              <span className="roman">II.</span> <em>Earth — geographic monitor</em>
            </span>
            <span className="aesop-shead-idx">EQUIRECTANGULAR · 1D Δ · {formatTime(new Date())}</span>
          </div>
          <div style={{ padding: "14px 18px", background: "#F5F3ED", borderBottom: "1px solid var(--rule)" }}>
            <canvas
              ref={mapCanvasRef}
              width={800}
              height={250}
              style={{ width: "100%", height: "auto", border: "1px solid var(--rule)" }}
            ></canvas>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginTop: "14px", fontSize: "11px" }}>
              <div>
                <div style={{ fontWeight: 500, marginBottom: "4px" }}>Sun Over</div>
                <div style={{ fontSize: "10px", color: "var(--ink-3)" }}>
                  <em>Karachi, PK</em>
                </div>
                <div style={{ fontSize: "10px", color: "var(--ink-3)" }}>Longitude 67.0°E · 09:17 local</div>
              </div>
              <div>
                <div style={{ fontWeight: 500, marginBottom: "4px" }}>Open Exchanges</div>
                <div style={{ fontSize: "14px", fontFamily: "var(--serif)" }}>14 / 47</div>
                <div style={{ fontSize: "9px", color: "var(--ink-3)" }}>TYO · SHA · HKG · BSE · DIFX · JSE · IST</div>
              </div>
              <div>
                <div style={{ fontWeight: 500, marginBottom: "4px" }}>Storm Watch</div>
                <div style={{ fontSize: "10px", color: "var(--ink-3)" }}>
                  <em>Taiwan Strait</em>
                </div>
                <div style={{ fontSize: "10px", color: "var(--ink-3)" }}>FXI σ 2.7× · EWT σ 2.1×</div>
              </div>
            </div>
            <div style={{ marginTop: "14px", fontSize: "11px" }}>
              <div style={{ fontWeight: 500, marginBottom: "4px" }}>Quiet Waters</div>
              <div style={{ fontSize: "10px", color: "var(--ink-3)" }}>
                <em>Scandinavia</em> · EWD / ENOR / EFNL · σ &lt; 0.6×
              </div>
            </div>
          </div>

          {/* III. RADAR CHART */}
          <div className="aesop-shead">
            <span className="aesop-shead-title">
              <span className="roman">III.</span> <em>Radar — regime &amp; style</em>
            </span>
            <span className="aesop-shead-idx">6-AXIS · Z-SCORED · 60D</span>
          </div>
          <div style={{ padding: "14px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", borderBottom: "1px solid var(--rule)" }}>
            <div>
              <canvas
                ref={radarCanvasRef}
                width={350}
                height={300}
                style={{ width: "100%", height: "auto", border: "1px solid var(--rule)" }}
              ></canvas>
            </div>
            <div>
              <h4 style={{ fontFamily: "var(--serif)", fontSize: "16px", marginTop: 0 }}>A mild risk-on, short-duration regime.</h4>
              <p style={{ fontSize: "12px", lineHeight: "1.6", color: "var(--ink-3)" }}>
                Equity breadth widening across Asia; defensives lagging; high-yield credit tightening while long-duration Treasuries drift. Gold is quiet. The radar reads like last August — crowded in Momentum and Quality, thin in Low Vol.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "11px" }}>
                <div>
                  <div style={{ fontWeight: 500, color: "var(--ink)" }}>Risk</div>
                  <div style={{ fontSize: "14px", fontFamily: "var(--serif)" }}>On</div>
                  <div style={{ fontSize: "10px", color: "var(--ink-3)" }}>RORO 0.62 · +0.18 wow</div>
                </div>
                <div>
                  <div style={{ fontWeight: 500, color: "var(--ink)" }}>Duration</div>
                  <div style={{ fontSize: "14px", fontFamily: "var(--serif)" }}>Short</div>
                  <div style={{ fontSize: "10px", color: "var(--ink-3)" }}>2s10s −14bp · 30d</div>
                </div>
                <div>
                  <div style={{ fontWeight: 500, color: "var(--ink)" }}>Breadth</div>
                  <div style={{ fontSize: "14px", fontFamily: "var(--serif)" }}>Widening</div>
                  <div style={{ fontSize: "10px", color: "var(--ink-3)" }}>62% above 50DMA</div>
                </div>
                <div>
                  <div style={{ fontWeight: 500, color: "var(--ink)" }}>Volatility</div>
                  <div style={{ fontSize: "14px", fontFamily: "var(--serif)" }}>Subdued</div>
                  <div style={{ fontSize: "10px", color: "var(--ink-3)" }}>VIX 13.2 · MOVE 72</div>
                </div>
              </div>
            </div>
          </div>

          {/* IV. SECTORS */}
          <div className="aesop-shead">
            <span className="aesop-shead-title">
              <span className="roman">IV.</span> <em>Sectors — 1D performance</em>
            </span>
            <span className="aesop-shead-idx">S&amp;P GICS · EW BY CAP</span>
          </div>
          <div className="aesop-sector-grid">
            {sectors.length > 0 ? (
              sectors.map((s, i) => (
                <div key={i} className={`aesop-sector ${(s.value ? parseFloat(s.value) : 0) >= 0 ? "pos" : "neg"}`}>
                  <div className="aesop-sector-label">{s.sector}</div>
                  <div className="aesop-sector-value">{formatPercent(s.value)}</div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "20px" }}>
                {isRefreshing ? "Loading sectors..." : "No sector data"}
              </div>
            )}
          </div>

          {/* V. ETF TABLE */}
          <div className="aesop-shead">
            <span className="aesop-shead-title">
              <span className="roman">V.</span> <em>Issues — fundamentals &amp; technicals</em>
            </span>
            <span className="aesop-shead-idx">SELECTION · {etfs.length} OF 2,418</span>
          </div>
          <div className="aesop-etf-table">
            <table>
              <thead>
                <tr>
                  <th>Issue</th>
                  <th>Last</th>
                  <th>1D</th>
                  <th>5D</th>
                  <th>YTD</th>
                  <th>Trend 20D</th>
                  <th>AUM</th>
                  <th>P/E</th>
                  <th>Yield</th>
                  <th>RSI</th>
                  <th>200D</th>
                  <th>Signal</th>
                </tr>
              </thead>
              <tbody>
                {etfs.length > 0 ? (
                  etfs.map((etf, i) => (
                    <tr key={i} onClick={() => setSelectedETF(etf.ticker || "")}>
                      <td className="aesop-mono">{etf.ticker}</td>
                      <td className="aesop-mono">{etf.price || "—"}</td>
                      <td className={`aesop-mono ${getPercentClass(etf.d1 || undefined)}`}>
                        {formatPercent(etf.d1 || undefined)}
                      </td>
                      <td className={`aesop-mono ${getPercentClass(etf.d5 || undefined)}`}>
                        {formatPercent(etf.d5 || undefined)}
                      </td>
                      <td className={`aesop-mono ${getPercentClass(etf.ytd || undefined)}`}>
                        {formatPercent(etf.ytd || undefined)}
                      </td>
                      <td className="aesop-mono" style={{ fontSize: "10px" }}>▁▂▃▂▃▄▃▂▃</td>
                      <td className="aesop-mono">{etf.aum || "—"}</td>
                      <td className="aesop-mono">{etf.pe || "—"}</td>
                      <td className="aesop-mono">{etf.yld || "—"}</td>
                      <td className="aesop-mono">{etf.rsi || "—"}</td>
                      <td className={`aesop-mono ${getPercentClass(etf.d1 ? parseFloat(etf.d1) * 5 : undefined)}`}>
                        {etf.d1 ? "+" + (parseFloat(etf.d1) * 5).toFixed(1) + "%" : "—"}
                      </td>
                      <td className="aesop-mono">
                        <button style={{ fontSize: "9px", padding: "2px 6px", cursor: "pointer" }}>
                          {parseFloat(etf.d1 || "0") > 0 ? "BULL" : "BEAR"}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={12} className="aesop-mono" style={{ textAlign: "center", padding: "20px" }}>
                      {isRefreshing ? "Loading data..." : "No data available"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* VI. INSTRUMENTS - THREE CHARTS */}
          <div className="aesop-shead">
            <span className="aesop-shead-title">
              <span className="roman">VI.</span> <em>Instruments — orbit, phase, rose</em>
            </span>
            <span className="aesop-shead-idx">EXCHANGE CLOCK · VOL PHASE · SECTOR ROSE</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", padding: "14px 18px", borderBottom: "1px solid var(--rule)" }}>
            <div>
              <div style={{ fontSize: "10px", color: "var(--ink-3)", marginBottom: "8px", fontWeight: 500 }}>Exchange Orbit · 24H UTC</div>
              <canvas
                ref={orbitCanvasRef}
                width={250}
                height={250}
                style={{ width: "100%", height: "auto", border: "1px solid var(--rule)" }}
              ></canvas>
            </div>
            <div>
              <div style={{ fontSize: "10px", color: "var(--ink-3)", marginBottom: "8px", fontWeight: 500 }}>Volatility Phase · VIX, MOVE, DXY</div>
              <canvas
                ref={moonCanvasRef}
                width={250}
                height={250}
                style={{ width: "100%", height: "auto", border: "1px solid var(--rule)" }}
              ></canvas>
            </div>
            <div>
              <div style={{ fontSize: "10px", color: "var(--ink-3)", marginBottom: "8px", fontWeight: 500 }}>Sector Rose · 1D Radial</div>
              <canvas
                ref={roseCanvasRef}
                width={250}
                height={250}
                style={{ width: "100%", height: "auto", border: "1px solid var(--rule)" }}
              ></canvas>
            </div>
          </div>

          {/* CHLADNI PLATE */}
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--rule)" }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: "14px", fontStyle: "italic", marginBottom: "10px" }}>
              <em>Chladni plate — correlation resonance</em> <span style={{ fontSize: "10px", color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>NODAL FIGURES · 60D</span>
            </div>
            <canvas
              ref={chladniCanvasRef}
              width={900}
              height={300}
              style={{ width: "100%", height: "auto", border: "1px solid var(--rule)" }}
            ></canvas>
            <div style={{ fontSize: "10px", color: "var(--ink-3)", marginTop: "8px", letterSpacing: "0.04em" }}>
              Bright ridges = uncorrelated axes · Nodes = ETFs plotted by 1st–2nd principal components
            </div>
          </div>

          {/* LIQUIDITY DEPTH */}
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--rule)" }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: "14px", fontStyle: "italic", marginBottom: "10px" }}>
              <em>Liquidity cathedral — bid/ask depth, SPY</em> <span style={{ fontSize: "10px", color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>AGGREGATE · 10BP BINS</span>
            </div>
            <canvas
              ref={liquidityCanvasRef}
              width={900}
              height={150}
              style={{ width: "100%", height: "auto", border: "1px solid var(--rule)" }}
            ></canvas>
            <div style={{ fontSize: "10px", color: "var(--ink-3)", marginTop: "8px" }}>
              BIDS · $548.10 ←→ $548.34 · ASKs · mid · $548.22
            </div>
          </div>

          {/* VOLATILITY CURVE */}
          <div className="aesop-shead">
            <span className="aesop-shead-title">
              <span className="roman">VII.</span> <em>Term structure of volatility</em>
            </span>
            <span className="aesop-shead-idx">IMPLIED · ACWI · 1M → 24M</span>
          </div>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--rule)" }}>
            <canvas
              ref={volatilityCanvasRef}
              width={900}
              height={200}
              style={{ width: "100%", height: "auto", border: "1px solid var(--rule)" }}
            ></canvas>
            <div style={{ fontSize: "10px", color: "var(--ink-3)", marginTop: "8px" }}>
              contango · +6.1 vol pts 1M→24M
            </div>
          </div>
        </main>

        {/* RIGHT RAIL */}
        <aside className="aesop-right-rail">
          {/* CORRELATION MATRIX HEATMAP */}
          <section className="aesop-right-section" style={{ padding: 0 }}>
            <canvas
              ref={heatmapCanvasRef}
              width={400}
              height={500}
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </section>

          {/* STRONGEST LINKS */}
          <section className="aesop-right-section">
            <h3 style={{ fontFamily: "var(--serif)", fontSize: "16px", fontStyle: "italic", marginTop: 0 }}>
              Strongest Links <span style={{ fontSize: "10px", color: "var(--ink-3)", fontStyle: "normal" }}>· VII.</span>
            </h3>
            <div style={{ fontSize: "11px", lineHeight: "1.8" }}>
              {correlationPairs.map((pair, i) => (
                <div key={i} style={{ marginBottom: "10px", paddingBottom: "10px", borderBottom: "1px solid var(--rule-2)" }}>
                  <div style={{ fontWeight: 500 }}>
                    {pair.pair1} ↔ {pair.pair2}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--ink-3)" }}>+{pair.corr.toFixed(2)} correlation</div>
                </div>
              ))}
            </div>
          </section>

          {/* SELECTED ETF */}
          <section className="aesop-right-section">
            <h3 style={{ fontFamily: "var(--serif)", fontSize: "16px", fontStyle: "italic", marginTop: 0 }}>
              Selected — {selectedETF} <span style={{ fontSize: "10px", color: "var(--ink-3)", fontStyle: "normal" }}>· VIII.</span>
            </h3>
            {selectedETFData && (
              <>
                <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: "14px", marginBottom: "10px" }}>
                  iShares {selectedETFData.ticker} Fund
                </div>
                <div style={{ fontSize: "11px", lineHeight: "1.8" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "6px", borderBottom: "1px solid var(--rule-2)" }}>
                    <span style={{ color: "var(--ink-3)" }}>Last</span>
                    <span style={{ fontWeight: 500 }}>${selectedETFData.price || "—"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "6px", borderBottom: "1px solid var(--rule-2)" }}>
                    <span style={{ color: "var(--ink-3)" }}>1D</span>
                    <span className={getPercentClass(selectedETFData.d1)} style={{ fontWeight: 500 }}>
                      {formatPercent(selectedETFData.d1)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "6px", borderBottom: "1px solid var(--rule-2)" }}>
                    <span style={{ color: "var(--ink-3)" }}>AUM</span>
                    <span style={{ fontWeight: 500 }}>{selectedETFData.aum || "—"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "6px", borderBottom: "1px solid var(--rule-2)" }}>
                    <span style={{ color: "var(--ink-3)" }}>P/E</span>
                    <span style={{ fontWeight: 500 }}>{selectedETFData.pe || "—"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "6px", borderBottom: "1px solid var(--rule-2)" }}>
                    <span style={{ color: "var(--ink-3)" }}>Div Yield</span>
                    <span style={{ fontWeight: 500 }}>{selectedETFData.yld || "—"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "6px", borderBottom: "1px solid var(--rule-2)" }}>
                    <span style={{ color: "var(--ink-3)" }}>σ 30D</span>
                    <span style={{ fontWeight: 500 }}>14.2%</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "6px", borderBottom: "1px solid var(--rule-2)" }}>
                    <span style={{ color: "var(--ink-3)" }}>RSI 14</span>
                    <span style={{ fontWeight: 500 }}>{selectedETFData.rsi || "—"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--ink-3)" }}>vs 200D</span>
                    <span className="pos" style={{ fontWeight: 500 }}>
                      +{selectedETFData.d1 ? (parseFloat(selectedETFData.d1) * 5).toFixed(1) : "0"}%
                    </span>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* NEWS JOURNAL */}
          <section className="aesop-right-section">
            <h3 style={{ fontFamily: "var(--serif)", fontSize: "16px", fontStyle: "italic", marginTop: 0 }}>
              Journal <span style={{ fontSize: "10px", color: "var(--ink-3)", fontStyle: "normal" }}>· IX.</span>
            </h3>
            <div style={{ fontSize: "11px", lineHeight: "1.6", color: "var(--ink-3)" }}>
              {newsItems.map((item, i) => (
                <div key={i} style={{ marginBottom: "12px", paddingBottom: "12px", borderBottom: i < newsItems.length - 1 ? "1px solid var(--rule-2)" : "none" }}>
                  <div style={{ fontWeight: 500, color: "var(--ink)", marginBottom: "4px" }}>{item.title}</div>
                  <div style={{ fontSize: "10px" }}>{item.content}</div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {/* TICKER STRIP */}
      <div style={{ padding: "10px 28px", borderTop: "1px solid var(--rule)", background: "var(--cream)", fontFamily: "var(--mono)", fontSize: "11px", overflow: "auto", whiteSpace: "nowrap" }}>
        <span style={{ marginRight: "20px", color: "var(--ink-3)" }}>·</span>
        {[
          { ticker: "SPY", price: "549.06", change: "+0.46%" },
          { ticker: "IVV", price: "549.78", change: "+0.30%" },
          { ticker: "VTI", price: "284.11", change: "+0.28%" },
          { ticker: "QQQ", price: "495.64", change: "+1.08%" },
          { ticker: "IWM", price: "221.45", change: "-0.18%" },
          { ticker: "ACWI", price: "119.68", change: "+0.98%" },
          { ticker: "EFA", price: "82.48", change: "+0.67%" },
          { ticker: "EEM", price: "48.55", change: "+1.55%" },
          { ticker: "VWO", price: "46.02", change: "+0.79%" },
          { ticker: "EWJ", price: "72.37", change: "+1.15%" },
          { ticker: "MCHI", price: "49.74", change: "-0.76%" },
          { ticker: "INDA", price: "53.81", change: "-0.20%" },
          { ticker: "EWZ", price: "31.89", change: "+1.91%" },
          { ticker: "FXI", price: "29.14", change: "-0.71%" },
          { ticker: "EWG", price: "36.21", change: "+0.20%" },
          { ticker: "EWU", price: "38.99", change: "+0.40%" },
          { ticker: "EWC", price: "44.06", change: "+0.22%" },
          { ticker: "EWA", price: "27.60", change: "-0.08%" },
          { ticker: "EZA", price: "42.91", change: "+1.01%" },
          { ticker: "ILF", price: "26.73", change: "+1.28%" },
          { ticker: "GLD", price: "272.67", change: "+0.17%" },
          { ticker: "TLT", price: "89.34", change: "+0.03%" },
          { ticker: "HYG", price: "78.56", change: "+0.11%" },
        ].map((tick, i) => (
          <span key={i} style={{ marginRight: "28px", display: "inline-block" }}>
            <span style={{ fontWeight: 500 }}>{tick.ticker}</span> {tick.price}{" "}
            <span className={tick.change.startsWith("+") ? "pos" : "neg"}>{tick.change}</span>
          </span>
        ))}
        <span style={{ marginLeft: "20px", color: "var(--ink-3)" }}>·</span>
      </div>
    </div>
  );
}

// Helper functions for country coordinates
function getCountryLat(code: string): number {
  const coords: Record<string, number> = {
    US: 37.1, CA: 56.1, UK: 55.4, DE: 51.2, FR: 46.2, JP: 36.2, AU: -25.3, CH: 46.8,
    SE: 60.1, SG: 1.4, CN: 35.9, IN: 20.6, KR: 35.9, TW: 23.7, BR: -14.2, MX: 23.6,
    ZA: -30.6, TR: 38.9, SA: 23.9, ID: -0.8,
  };
  return coords[code] || 0;
}

function getCountryLng(code: string): number {
  const coords: Record<string, number> = {
    US: -95.7, CA: -106.3, UK: -3.4, DE: 10.5, FR: 2.2, JP: 138.3, AU: 133.8, CH: 8.2,
    SE: 18.6, SG: 103.8, CN: 104.2, IN: 78.9, KR: 127.8, TW: 120.9, BR: -51.9, MX: -102.6,
    ZA: 22.9, TR: 35.2, SA: 45.1, ID: 113.9,
  };
  return coords[code] || 0;
}

const isLive = true;
