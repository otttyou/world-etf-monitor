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
  const [selectedETF, setSelectedETF] = useState("SPY");

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

  // Draw all charts
  useEffect(() => {
    if (!radarCanvasRef.current) return;

    const radarData: RadarData = {
      growth: 0.62,
      inflation: -0.15,
      rates: -0.28,
      credit: 0.44,
      usd: 0.31,
      oil: 0.52,
    };

    const priorData: RadarData = {
      growth: 0.55,
      inflation: -0.10,
      rates: -0.25,
      credit: 0.40,
      usd: 0.28,
      oil: 0.48,
    };

    drawRadarChart(radarCanvasRef.current, radarData, priorData);
  }, []);

  useEffect(() => {
    if (!mapCanvasRef.current) return;

    const countryNodes: CountryNode[] = [
      { code: "US", name: "United States", lat: 37.7749, lng: -122.4194, change: 0.17 },
      { code: "JP", name: "Japan", lat: 35.6762, lng: 139.6503, change: 0.18 },
      { code: "DE", name: "Germany", lat: 52.52, lng: 13.405, change: -0.69 },
      { code: "UK", name: "United Kingdom", lat: 51.5074, lng: -0.1278, change: 0.17 },
      { code: "CN", name: "China", lat: 39.9042, lng: 116.4074, change: 0.0 },
      { code: "IN", name: "India", lat: 28.7041, lng: 77.1025, change: 0.0 },
      { code: "BR", name: "Brazil", lat: -23.5505, lng: -46.6333, change: 0.0 },
      { code: "MX", name: "Mexico", lat: 19.4326, lng: -99.1332, change: -0.57 },
    ];

    drawEquirectangularMap(mapCanvasRef.current, countryNodes);
  }, []);

  useEffect(() => {
    if (!orbitCanvasRef.current) return;
    const exchangeMarkers: ExchangeMarker[] = [
      { code: "NYSE", hour: 14, isOpen: true },
      { code: "LSE", hour: 16, isOpen: false },
      { code: "FX", hour: 0, isOpen: true },
      { code: "JPX", hour: 8, isOpen: false },
      { code: "HKE", hour: 9, isOpen: true },
      { code: "SSE", hour: 9, isOpen: true },
      { code: "NSE", hour: 3, isOpen: false },
      { code: "B3", hour: 12, isOpen: false },
    ];
    drawExchangeOrbit(orbitCanvasRef.current, exchangeMarkers);
  }, []);

  useEffect(() => {
    if (!moonCanvasRef.current) return;
    drawVolatilityMoon(moonCanvasRef.current, 18.5, 112.3, 104.2, "waxing gibbous");
  }, []);

  useEffect(() => {
    if (!roseCanvasRef.current) return;
    const sectorPerf = [
      { name: "TECH", value: 2.1 },
      { name: "COMM", value: -1.3 },
      { name: "DISC", value: 0.8 },
      { name: "FIN", value: 1.2 },
      { name: "INDU", value: 0.5 },
      { name: "MATS", value: -0.9 },
      { name: "ENER", value: 2.4 },
      { name: "HLTH", value: -0.2 },
      { name: "STAP", value: 0.3 },
      { name: "UTIL", value: -0.5 },
      { name: "REAL", value: 1.1 },
    ];
    drawSectorRose(roseCanvasRef.current, sectorPerf);
  }, []);

  useEffect(() => {
    if (!chladniCanvasRef.current) return;
    drawChladniPlate(chladniCanvasRef.current, []);
  }, []);

  useEffect(() => {
    if (!liquidityCanvasRef.current) return;
    drawLiquidityDepth(liquidityCanvasRef.current, [100, 200, 150, 180, 120], [110, 190, 160, 170, 130], 150);
  }, []);

  useEffect(() => {
    if (!volatilityCanvasRef.current) return;
    drawVolatilityCurve(volatilityCanvasRef.current, [18.5, 17.2, 16.8, 16.5, 16.2, 16.0], [19.1, 18.3, 17.9, 17.5, 17.2, 17.0]);
  }, []);

  useEffect(() => {
    if (!heatmapCanvasRef.current) return;
    const tickers = ["SPY", "QQQ", "IWM", "ACWI", "EFA", "EEM", "EWJ", "MCHI", "INDA", "EWZ", "EWG", "EWU", "TLT", "GLD"];
    const correlationMatrix = Array(14)
      .fill(0)
      .map(() => Array(14).fill(0).map(() => Math.random() * 2 - 1));
    drawCorrelationHeatmap(heatmapCanvasRef.current, correlationMatrix);
  }, []);

  const etfData = etfPrices.data || [];
  const sectors = sectorData.data || [];
  const regions = regionalIndices.data || [];
  const fx = fxRates.data || [];

  const formatPercent = (val: string | number | null | undefined) => {
    if (!val) return "—";
    const num = typeof val === "string" ? parseFloat(val) : val;
    return `${num > 0 ? "+" : ""}${num.toFixed(2)}%`;
  };

  const formatPrice = (val: string | number | null | undefined) => {
    if (!val) return "—";
    const num = typeof val === "string" ? parseFloat(val) : val;
    return num.toFixed(2);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#F1ECE0" }}>
      {/* Meta Bar */}
      <div className="aesop-meta">
        <div className="aesop-meta-left">
          <span className="aesop-dot live"></span>
          <span>LIVE FEED</span>
        </div>
        <div style={{ textAlign: "center", fontSize: "9px", color: "#5A574C" }}>
          {lastUpdated.toLocaleTimeString()}
        </div>
        <div className="aesop-meta-right">
          <span>ASIA-EUROPE HANDOVER</span>
        </div>
      </div>

      {/* Masthead */}
      <div className="aesop-masthead">
        <div>
          <h1 className="aesop-title">The Observatory of<br />World Exchange-Traded Funds</h1>
          <p className="aesop-subtitle">A quiet instrument for watching capital move across latitudes — geographies, sectors, currencies and the slow weather of correlation.</p>
        </div>
        <div className="aesop-stat-block">
          <span className="aesop-caps">Composite Breadth</span>
          <span className="aesop-val">70</span>
          <span className="aesop-foot">/ 100 advancers<br />Δ +4 vs. prev. session · 10 issues</span>
        </div>
        <div className="aesop-stat-block">
          <span className="aesop-caps">Global Dispersion</span>
          <span className="aesop-val">0.47</span>
          <span className="aesop-foot">σ regional<br />Low regime · 25d avg 1.61</span>
        </div>
        <div className="aesop-stat-block">
          <span className="aesop-caps">Liquidity Pulse</span>
          <span className="aesop-val">$220</span>
          <span className="aesop-foot">B ADV<br />+12.4% wow · 1y percentile 71</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="aesop-nav">
        {["I. OBSERVATORY", "II. REGIONS", "III. SECTORS", "IV. FACTORS", "V. CORRELATION", "VI. FUNDAMENTALS", "VII. TECHNICALS", "VIII. FLOWS", "IX. JOURNAL"].map((tab, i) => (
          <div key={i} className={`aesop-nav-item ${activeTab === String.fromCharCode(73 + i) ? "active" : ""}`} onClick={() => setActiveTab(String.fromCharCode(73 + i))}>
            {tab}
          </div>
        ))}
      </div>

      {/* Main Container */}
      <div className="aesop-container">
        {/* Center Column */}
        <div className="aesop-center">
          {/* ETF Table */}
          <div className="aesop-etf-table">
            <table>
              <thead>
                <tr>
                  <th>TICKER</th>
                  <th>PRICE</th>
                  <th>1D%</th>
                  <th>5D%</th>
                  <th>YTD%</th>
                  <th>AUM</th>
                  <th>P/E</th>
                  <th>YIELD</th>
                  <th>RSI</th>
                  <th>SIGNAL</th>
                </tr>
              </thead>
              <tbody>
                {etfData.slice(0, 14).map((etf, i) => (
                  <tr key={i} onClick={() => setSelectedETF(etf.ticker || "SPY")}>
                    <td>{etf.ticker}</td>
                    <td>{formatPrice(etf.price)}</td>
                    <td className={etf.d1 && parseFloat(etf.d1) > 0 ? "pos" : "neg"}>{formatPercent(etf.d1)}</td>
                    <td className={etf.d5 && parseFloat(etf.d5) > 0 ? "pos" : "neg"}>{formatPercent(etf.d5)}</td>
                    <td className={etf.ytd && parseFloat(etf.ytd) > 0 ? "pos" : "neg"}>{formatPercent(etf.ytd)}</td>
                    <td>{etf.aum || "—"}</td>
                    <td>{etf.pe || "—"}</td>
                    <td>{formatPercent(etf.yld)}</td>
                    <td>{etf.rsi ? etf.rsi.toFixed(0) : "—"}</td>
                    <td>{etf.signal || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sector Grid */}
          <div className="aesop-sector-grid">
            {sectors.map((sector, i) => {
              const val = parseFloat(sector.value || "0");
              return (
                <div key={i} className={`aesop-sector ${val > 0 ? "pos" : "neg"}`}>
                  <div className="aesop-sector-label">{sector.sector}</div>
                  <div className="aesop-sector-value">{formatPercent(sector.value)}</div>
                </div>
              );
            })}
          </div>

          {/* Charts Grid */}
          <div className="aesop-charts-grid">
            <div className="aesop-chart-panel">
              <h4 className="aesop-chart-title">III. Radar — regime & style</h4>
              <canvas ref={radarCanvasRef} className="aesop-chart-canvas" width="200" height="120"></canvas>
            </div>
            <div className="aesop-chart-panel">
              <h4 className="aesop-chart-title">II. Earth — geographic monitor</h4>
              <canvas ref={mapCanvasRef} className="aesop-chart-canvas" width="200" height="120"></canvas>
            </div>
            <div className="aesop-chart-panel">
              <h4 className="aesop-chart-title">Exchange Orbit</h4>
              <canvas ref={orbitCanvasRef} className="aesop-chart-canvas" width="200" height="120"></canvas>
            </div>
            <div className="aesop-chart-panel">
              <h4 className="aesop-chart-title">Volatility Phase</h4>
              <canvas ref={moonCanvasRef} className="aesop-chart-canvas" width="200" height="120"></canvas>
            </div>
            <div className="aesop-chart-panel">
              <h4 className="aesop-chart-title">IV. Sectors — 11 performance</h4>
              <canvas ref={roseCanvasRef} className="aesop-chart-canvas" width="200" height="120"></canvas>
            </div>
            <div className="aesop-chart-panel">
              <h4 className="aesop-chart-title">Chladni Plate</h4>
              <canvas ref={chladniCanvasRef} className="aesop-chart-canvas" width="200" height="120"></canvas>
            </div>
            <div className="aesop-chart-panel">
              <h4 className="aesop-chart-title">Liquidity Depth</h4>
              <canvas ref={liquidityCanvasRef} className="aesop-chart-canvas" width="200" height="120"></canvas>
            </div>
            <div className="aesop-chart-panel">
              <h4 className="aesop-chart-title">Volatility Curve</h4>
              <canvas ref={volatilityCanvasRef} className="aesop-chart-canvas" width="200" height="120"></canvas>
            </div>
          </div>
        </div>

        {/* Right Rail */}
        <div className="aesop-right-rail">
          {/* Connections */}
          <div className="aesop-right-section">
            <h3>Connections</h3>
            <div className="aesop-heatmap-container">
              <canvas ref={heatmapCanvasRef} className="aesop-heatmap-canvas" width="300" height="280"></canvas>
            </div>
          </div>

          {/* Strongest Links */}
          <div className="aesop-right-section">
            <h3>Strongest Links</h3>
            <ul className="aesop-list">
              <li className="aesop-list-item">
                <span className="aesop-list-item-label">EFA · EWG</span>
                <span className="aesop-list-item-value pos">+0.94</span>
              </li>
              <li className="aesop-list-item">
                <span className="aesop-list-item-label">SPY · QQQ</span>
                <span className="aesop-list-item-value pos">+0.92</span>
              </li>
              <li className="aesop-list-item">
                <span className="aesop-list-item-label">EEM · INDA</span>
                <span className="aesop-list-item-value pos">+0.88</span>
              </li>
              <li className="aesop-list-item">
                <span className="aesop-list-item-label">TLT · GLD</span>
                <span className="aesop-list-item-value pos">+0.71</span>
              </li>
              <li className="aesop-list-item">
                <span className="aesop-list-item-label">QQQ · IWM</span>
                <span className="aesop-list-item-value pos">+0.68</span>
              </li>
            </ul>
          </div>

          {/* Selected ETF */}
          <div className="aesop-right-section">
            <h3>Selected — {selectedETF}</h3>
            <div className="aesop-stat-item">
              <span className="aesop-stat-item-label">Price</span>
              <span className="aesop-stat-item-value">{formatPrice(etfData.find((e) => e.ticker === selectedETF)?.price)}</span>
              <span className="aesop-stat-item-detail">1D: {formatPercent(etfData.find((e) => e.ticker === selectedETF)?.d1)}</span>
            </div>
            <div className="aesop-stat-item">
              <span className="aesop-stat-item-label">AUM</span>
              <span className="aesop-stat-item-value">{etfData.find((e) => e.ticker === selectedETF)?.aum || "—"}</span>
            </div>
            <div className="aesop-stat-item">
              <span className="aesop-stat-item-label">P/E Ratio</span>
              <span className="aesop-stat-item-value">{etfData.find((e) => e.ticker === selectedETF)?.pe || "—"}</span>
            </div>
            <div className="aesop-stat-item">
              <span className="aesop-stat-item-label">Dividend Yield</span>
              <span className="aesop-stat-item-value">{formatPercent(etfData.find((e) => e.ticker === selectedETF)?.yld)}</span>
            </div>
          </div>

          {/* Journal */}
          <div className="aesop-right-section">
            <h3>Journal</h3>
            <ul className="aesop-list">
              <li className="aesop-list-item">
                <span className="aesop-list-item-label">Fed signals rate pause</span>
                <span className="aesop-list-item-detail">Markets rally on dovish signals</span>
              </li>
              <li className="aesop-list-item">
                <span className="aesop-list-item-label">Tech earnings beat</span>
                <span className="aesop-list-item-detail">QQQ leads market higher</span>
              </li>
              <li className="aesop-list-item">
                <span className="aesop-list-item-label">Oil prices surge</span>
                <span className="aesop-list-item-detail">Energy sector outperforms</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
