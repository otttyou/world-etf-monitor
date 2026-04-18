import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import "@/styles/aesop.css";

export default function Observatory() {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isLive, setIsLive] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fetch market data
  const etfPrices = trpc.market.etfPrices.useQuery();
  const regionalIndices = trpc.market.regionalIndices.useQuery();
  const fxRates = trpc.market.fxRates.useQuery();
  const sectorData = trpc.market.sectorData.useQuery();

  // Refresh mutations with callbacks
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
        // Invalidate queries to force UI update
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

  // Draw Chladni correlation plate
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = "#EAE3D2";
    ctx.fillRect(0, 0, width, height);

    // Draw correlation pattern (Chladni plate simulation)
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let i = 0; i < width; i++) {
      for (let j = 0; j < height; j++) {
        const x = (i / width) * 4 - 2;
        const y = (j / height) * 4 - 2;

        // Chladni plate equation simulation
        const value =
          Math.sin(x * Math.PI) * Math.sin(y * Math.PI) +
          0.5 * Math.sin(2 * x * Math.PI) * Math.sin(2 * y * Math.PI);

        const brightness = Math.abs(value) * 255;
        const idx = (j * width + i) * 4;

        data[idx] = brightness * 0.8;
        data[idx + 1] = brightness * 0.75;
        data[idx + 2] = brightness * 0.7;
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
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
  const declCount = etfs.length - advCount;
  const breadthPct = Math.round((advCount / etfs.length) * 100);

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
        <button className="aesop-nav-link active">
          <span className="aesop-idx">I.</span> OBSERVATORY
        </button>
        <button className="aesop-nav-link">
          <span className="aesop-idx">II.</span> REGIONS
        </button>
        <button className="aesop-nav-link">
          <span className="aesop-idx">III.</span> SECTORS
        </button>
        <button className="aesop-nav-link">
          <span className="aesop-idx">IV.</span> FACTORS
        </button>
        <button className="aesop-nav-link">
          <span className="aesop-idx">V.</span> CORRELATION
        </button>
        <button className="aesop-nav-link">
          <span className="aesop-idx">VI.</span> FUNDAMENTALS
        </button>
        <button className="aesop-nav-link">
          <span className="aesop-idx">VII.</span> TECHNICALS
        </button>
        <button className="aesop-nav-link">
          <span className="aesop-idx">VIII.</span> FLOWS
        </button>
        <button className="aesop-nav-link">
          <span className="aesop-idx">IX.</span> JOURNAL
        </button>
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
          {/* GEOGRAPHIC MONITOR */}
          <div className="aesop-shead">
            <span className="aesop-shead-title">
              <span className="roman">II.</span> <em>Earth — geographic monitor</em>
            </span>
            <span className="aesop-shead-idx">EQUIRECTANGULAR · 1D Δ · {formatTime(new Date())}</span>
          </div>
          <div style={{ padding: "14px 18px", background: "#F5F3ED", minHeight: "200px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-3)", fontSize: "12px" }}>
            [Geographic Earth Monitor - Equirectangular map with color-coded country nodes]
          </div>

          {/* RADAR CHART */}
          <div className="aesop-shead">
            <span className="aesop-shead-title">
              <span className="roman">III.</span> <em>Radar — regime &amp; style</em>
            </span>
            <span className="aesop-shead-idx">6-AXIS · Z-SCORED · 60D</span>
          </div>
          <div style={{ padding: "14px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div style={{ background: "#F5F3ED", minHeight: "200px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-3)", fontSize: "12px" }}>
              [Radar Chart - GROWTH, INFLATION, RATES, CREDIT, USD, OIL]
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
              </div>
            </div>
          </div>

          {/* SECTORS */}
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

          {/* ETF TABLE */}
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
                  <th>AUM</th>
                  <th>P/E</th>
                  <th>Yield</th>
                  <th>RSI</th>
                  <th>Signal</th>
                </tr>
              </thead>
              <tbody>
                {etfs.length > 0 ? (
                  etfs.map((etf, i) => (
                    <tr key={i}>
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
                      <td className="aesop-mono">{etf.aum || "—"}</td>
                      <td className="aesop-mono">{etf.pe || "—"}</td>
                      <td className="aesop-mono">{etf.yld || "—"}</td>
                      <td className="aesop-mono">{etf.rsi || "—"}</td>
                      <td className="aesop-mono">{etf.signal || "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="aesop-mono" style={{ textAlign: "center", padding: "20px" }}>
                      {isRefreshing ? "Loading data..." : "No data available"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* EXOTIC STRIP */}
          <div className="aesop-shead">
            <span className="aesop-shead-title">
              <span className="roman">VI.</span> <em>Instruments — orbit, phase, rose</em>
            </span>
            <span className="aesop-shead-idx">EXCHANGE CLOCK · VOL PHASE · SECTOR ROSE</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", padding: "14px 18px", borderBottom: "1px solid var(--rule)" }}>
            <div style={{ background: "#F5F3ED", minHeight: "150px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-3)", fontSize: "11px" }}>
              [Exchange Orbit - 24H UTC]
            </div>
            <div style={{ background: "#F5F3ED", minHeight: "150px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-3)", fontSize: "11px" }}>
              [Volatility Phase - VIX, MOVE, DXY]
            </div>
            <div style={{ background: "#F5F3ED", minHeight: "150px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-3)", fontSize: "11px" }}>
              [Sector Rose - Radial Chart]
            </div>
          </div>

          {/* CHLADNI PLATE */}
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--rule)" }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: "14px", fontStyle: "italic", marginBottom: "10px" }}>
              <em>Chladni plate — correlation resonance</em> <span style={{ fontSize: "10px", color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>NODAL FIGURES · 60D</span>
            </div>
            <canvas id="chladniCanvas" ref={canvasRef} width={900} height={300} style={{ width: "100%", height: "auto", border: "1px solid var(--rule)" }}></canvas>
            <div style={{ fontSize: "10px", color: "var(--ink-3)", marginTop: "8px", letterSpacing: "0.04em" }}>
              Bright ridges = uncorrelated axes · Nodes = ETFs plotted by 1st–2nd principal components
            </div>
          </div>

          {/* LIQUIDITY DEPTH */}
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--rule)" }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: "14px", fontStyle: "italic", marginBottom: "10px" }}>
              <em>Liquidity cathedral — bid/ask depth, SPY</em> <span style={{ fontSize: "10px", color: "var(--ink-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>AGGREGATE · 10BP BINS</span>
            </div>
            <div style={{ background: "#F5F3ED", height: "100px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-3)", fontSize: "11px" }}>
              [Liquidity Depth Chart]
            </div>
          </div>

          {/* VOLATILITY CURVE */}
          <div className="aesop-shead">
            <span className="aesop-shead-title">
              <span className="roman">VII.</span> <em>Term structure of volatility</em>
            </span>
            <span className="aesop-shead-idx">IMPLIED · ACWI · 1M → 24M</span>
          </div>
          <div style={{ padding: "14px 18px", background: "#F5F3ED", minHeight: "150px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-3)", fontSize: "11px" }}>
            [Volatility Term Structure Curve]
          </div>
        </main>

        {/* RIGHT RAIL */}
        <aside className="aesop-right-rail">
          <section className="aesop-right-section">
            <h3 style={{ fontFamily: "var(--serif)", fontSize: "16px", fontStyle: "italic", marginTop: 0 }}>
              Connections <span style={{ fontSize: "10px", color: "var(--ink-3)", fontStyle: "normal" }}>· VI.</span>
            </h3>
            <div style={{ background: "#F5F3ED", minHeight: "120px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-3)", fontSize: "11px" }}>
              [Correlation Matrix]
            </div>
            <div style={{ fontSize: "9px", color: "var(--ink-3)", marginTop: "10px", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              60D RETURN CORRELATION · CLUSTERED
            </div>
          </section>

          <section className="aesop-right-section">
            <h3 style={{ fontFamily: "var(--serif)", fontSize: "16px", fontStyle: "italic", marginTop: 0 }}>
              Strongest Links <span style={{ fontSize: "10px", color: "var(--ink-3)", fontStyle: "normal" }}>· VII.</span>
            </h3>
            <div style={{ fontSize: "11px", lineHeight: "1.6" }}>
              <div style={{ marginBottom: "8px" }}>
                <div style={{ fontWeight: 500 }}>SPY ↔ QQQ</div>
                <div style={{ fontSize: "10px", color: "var(--ink-3)" }}>+0.94 correlation</div>
              </div>
              <div style={{ marginBottom: "8px" }}>
                <div style={{ fontWeight: 500 }}>EEM ↔ EWZ</div>
                <div style={{ fontSize: "10px", color: "var(--ink-3)" }}>+0.87 correlation</div>
              </div>
              <div>
                <div style={{ fontWeight: 500 }}>EFA ↔ EWG</div>
                <div style={{ fontSize: "10px", color: "var(--ink-3)" }}>+0.91 correlation</div>
              </div>
            </div>
          </section>

          <section className="aesop-right-section">
            <h3 style={{ fontFamily: "var(--serif)", fontSize: "16px", fontStyle: "italic", marginTop: 0 }}>
              Selected — EEM <span style={{ fontSize: "10px", color: "var(--ink-3)", fontStyle: "normal" }}>· VIII.</span>
            </h3>
            <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: "14px", marginBottom: "10px" }}>
              iShares MSCI Emerging Markets
            </div>
            <div style={{ fontSize: "11px", lineHeight: "1.8" }}>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "6px", borderBottom: "1px solid var(--rule-2)" }}>
                <span style={{ color: "var(--ink-3)" }}>Last</span>
                <span style={{ fontWeight: 500 }}>$48.21</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "6px", borderBottom: "1px solid var(--rule-2)" }}>
                <span style={{ color: "var(--ink-3)" }}>1D</span>
                <span className="pos" style={{ fontWeight: 500 }}>+0.84%</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "6px", borderBottom: "1px solid var(--rule-2)" }}>
                <span style={{ color: "var(--ink-3)" }}>AUM</span>
                <span style={{ fontWeight: 500 }}>$27.4B</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "6px", borderBottom: "1px solid var(--rule-2)" }}>
                <span style={{ color: "var(--ink-3)" }}>P/E</span>
                <span style={{ fontWeight: 500 }}>12.4×</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "6px", borderBottom: "1px solid var(--rule-2)" }}>
                <span style={{ color: "var(--ink-3)" }}>Div Yield</span>
                <span style={{ fontWeight: 500 }}>2.6%</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "6px", borderBottom: "1px solid var(--rule-2)" }}>
                <span style={{ color: "var(--ink-3)" }}>σ 30D</span>
                <span style={{ fontWeight: 500 }}>14.2%</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "6px", borderBottom: "1px solid var(--rule-2)" }}>
                <span style={{ color: "var(--ink-3)" }}>RSI 14</span>
                <span style={{ fontWeight: 500 }}>61</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--ink-3)" }}>vs 200D</span>
                <span className="pos" style={{ fontWeight: 500 }}>+6.4%</span>
              </div>
            </div>
          </section>

          <section className="aesop-right-section">
            <h3 style={{ fontFamily: "var(--serif)", fontSize: "16px", fontStyle: "italic", marginTop: 0 }}>
              Journal <span style={{ fontSize: "10px", color: "var(--ink-3)", fontStyle: "normal" }}>· IX.</span>
            </h3>
            <div style={{ fontSize: "11px", lineHeight: "1.6", color: "var(--ink-3)" }}>
              <div style={{ marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid var(--rule-2)" }}>
                <div style={{ fontWeight: 500, color: "var(--ink)", marginBottom: "4px" }}>Asia equity breadth widens</div>
                <div style={{ fontSize: "10px" }}>Nikkei +1.2%, Shanghai +0.8%, Hong Kong +0.4%</div>
              </div>
              <div style={{ marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid var(--rule-2)" }}>
                <div style={{ fontWeight: 500, color: "var(--ink)", marginBottom: "4px" }}>Fed speakers hawkish on rates</div>
                <div style={{ fontSize: "10px" }}>2Y yields +6bp, long-duration bonds drift lower</div>
              </div>
              <div>
                <div style={{ fontWeight: 500, color: "var(--ink)", marginBottom: "4px" }}>Gold consolidates near $2,100</div>
                <div style={{ fontSize: "10px" }}>Safe-haven demand steady amid geopolitical concerns</div>
              </div>
            </div>
          </section>
        </aside>
      </div>

      {/* TICKER STRIP */}
      <div style={{ padding: "10px 28px", borderTop: "1px solid var(--rule)", background: "var(--cream)", fontFamily: "var(--mono)", fontSize: "11px", overflow: "auto", whiteSpace: "nowrap" }}>
        <span style={{ marginRight: "20px", color: "var(--ink-3)" }}>·</span>
        {[
          { ticker: "SPY", price: "549.06", change: "+0.46%" },
          { ticker: "QQQ", price: "495.64", change: "+1.08%" },
          { ticker: "IWM", price: "221.45", change: "-0.18%" },
          { ticker: "ACWI", price: "119.68", change: "+0.98%" },
          { ticker: "EFA", price: "82.48", change: "+0.67%" },
          { ticker: "EEM", price: "48.55", change: "+1.55%" },
          { ticker: "EWJ", price: "72.37", change: "+1.15%" },
          { ticker: "MCHI", price: "49.74", change: "-0.76%" },
          { ticker: "INDA", price: "53.81", change: "-0.20%" },
          { ticker: "EWZ", price: "31.89", change: "+1.91%" },
          { ticker: "EWG", price: "36.21", change: "+0.20%" },
          { ticker: "EWU", price: "38.99", change: "+0.40%" },
          { ticker: "TLT", price: "89.34", change: "+0.03%" },
          { ticker: "GLD", price: "272.67", change: "+0.17%" },
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
