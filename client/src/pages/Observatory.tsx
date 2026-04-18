import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import "@/styles/aesop.css";

export default function Observatory() {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isLive, setIsLive] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

    // Initial refresh
    performRefresh();

    return () => clearInterval(interval);
  }, [utils]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }) + "Z";
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

  // Calculate composite metrics
  const etfs = etfPrices.data || [];
  const advCount = etfs.filter((e) => {
    const d1 = parseFloat(e.d1 || "0");
    return d1 > 0;
  }).length;
  const totalETFs = etfs.length || 1;
  const breadthPct = Math.round((advCount / totalETFs) * 100);

  const deltas = etfs.map((e) => parseFloat(e.d1 || "0"));
  const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length || 0;
  const sd = Math.sqrt(
    deltas.reduce((a, b) => a + (b - mean) ** 2, 0) / deltas.length || 0
  );

  const liquidity = 114.2 + (Math.random() - 0.5) * 20;

  // Group regional data
  const dm = (regionalIndices.data || []).filter((r) => r.region === "DM");
  const em = (regionalIndices.data || []).filter((r) => r.region === "EM");
  const agg = (regionalIndices.data || []).filter((r) => r.region === "AGG");
  const fx = (fxRates.data || []).slice(0, 8);
  const sectors = sectorData.data || [];

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
        <div className="aesop-meta-center">· · ETF OBSERVATORY · ·</div>
        <div className="aesop-meta-right">
          <span>
            SESSION · <b>ASIA→EUROPE HANDOVER</b>
          </span>
          <span>
            VOL · <b>NORMAL — 0.91σ</b>
          </span>
          <span>{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
        </div>
      </div>

      {/* MASTHEAD */}
      <header className="aesop-masthead">
        <div>
          <h1 className="aesop-title">
            The Observatory <span className="roman">of</span>
            <br />
            World Exchange-Traded Funds
          </h1>
          <div className="aesop-subtitle">
            A quiet instrument for watching capital move across latitudes — geographies, sectors, currencies and the slow weather of correlation.
          </div>
        </div>
        <div className="aesop-stat-block">
          <span className="aesop-caps">Composite Breadth</span>
          <div className="aesop-val">
            {breadthPct}
            <span className="aesop-sfx">/ 100 advancers</span>
          </div>
          <div className="aesop-foot">Δ +4 vs. prev. session · {totalETFs} issues</div>
        </div>
        <div className="aesop-stat-block">
          <span className="aesop-caps">Global Dispersion</span>
          <div className="aesop-val">
            {sd.toFixed(2)}
            <span className="aesop-sfx">% σ regional</span>
          </div>
          <div className="aesop-foot">Low regime · 20d avg 1.61</div>
        </div>
        <div className="aesop-stat-block">
          <span className="aesop-caps">Liquidity Pulse</span>
          <div className="aesop-val">
            ${liquidity.toFixed(1)}
            <span className="aesop-sfx">B ADV</span>
          </div>
          <div className="aesop-foot">+12.4% wow · 3y percentile 71</div>
        </div>
      </header>

      {/* STICKY NAV */}
      <nav className="aesop-nav">
        <a className="aesop-nav-link active">
          <span className="aesop-idx">I.</span> Observatory
        </a>
        <a className="aesop-nav-link">
          <span className="aesop-idx">II.</span> Regions
        </a>
        <a className="aesop-nav-link">
          <span className="aesop-idx">III.</span> Sectors
        </a>
        <a className="aesop-nav-link">
          <span className="aesop-idx">IV.</span> Factors
        </a>
        <a className="aesop-nav-link">
          <span className="aesop-idx">V.</span> Correlation
        </a>
        <a className="aesop-nav-link">
          <span className="aesop-idx">VI.</span> Fundamentals
        </a>
        <a className="aesop-nav-link">
          <span className="aesop-idx">VII.</span> Technicals
        </a>
        <a className="aesop-nav-link">
          <span className="aesop-idx">VIII.</span> Flows
        </a>
        <a className="aesop-nav-link">
          <span className="aesop-idx">IX.</span> Journal
        </a>
        <div className="aesop-nav-spacer"></div>
        <div className="aesop-nav-tools">
          <span>◷ 20D</span>
          <span>◴ LOG</span>
          <span>⌕ SEARCH</span>
        </div>
      </nav>

      {/* GRID */}
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

        {/* CENTER */}
        <section className="aesop-center">
          {/* ETF TABLE */}
          <div className="aesop-shead">
            <span className="aesop-shead-title">
              <span className="roman">I.</span> <em>ETF Prices</em>
            </span>
            <span className="aesop-shead-idx">{etfs.length} INSTRUMENTS</span>
          </div>

          <div className="aesop-etf-table">
            <table>
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Price</th>
                  <th>1D%</th>
                  <th>5D%</th>
                  <th>YTD%</th>
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

          {/* SECTOR HEATMAP */}
          <div className="aesop-shead">
            <span className="aesop-shead-title">
              <span className="roman">III.</span> <em>Sector Heatmap</em>
            </span>
            <span className="aesop-shead-idx">11 SECTORS</span>
          </div>

          <div className="aesop-sector-grid">
            {sectors.length > 0 ? (
              sectors.map((s, i) => (
                <div key={i} className={`aesop-sector ${(s.value ? parseFloat(s.value) : 0) >= 0 ? "pos" : "neg"}`}>
                  <div className="aesop-sector-label">{s.sector}</div>
                  <div className="aesop-sector-value">
                    {formatPercent(s.value)}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "20px" }}>
                {isRefreshing ? "Loading sectors..." : "No sector data"}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT RAIL */}
        <aside className="aesop-right-rail">
          <div className="aesop-shead">
            <span className="aesop-shead-title">
              <span className="roman">V.</span> <em>Status</em>
            </span>
          </div>

          <div className="aesop-right-section">
            <div className="aesop-stat-item">
              <span className="aesop-label">Last Updated</span>
              <div className="aesop-value">{formatTime(lastUpdated)}</div>
            </div>

            <div className="aesop-stat-item">
              <span className="aesop-label">ETF Count</span>
              <div className="aesop-value">{etfs.length}</div>
            </div>

            <div className="aesop-stat-item">
              <span className="aesop-label">Advancers</span>
              <div className="aesop-value">{advCount}</div>
            </div>

            <div className="aesop-stat-item">
              <span className="aesop-label">Decliners</span>
              <div className="aesop-value">{totalETFs - advCount}</div>
            </div>

            <div className="aesop-stat-item">
              <span className="aesop-label">Refresh Rate</span>
              <div className="aesop-value">60s</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
