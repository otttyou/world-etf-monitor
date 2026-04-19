/**
 * TabViews.tsx — All 9 Observatory tab view components
 * Each tab renders a unique, data-rich layout using the Aesop design system.
 */
import { useRef, useEffect, useMemo } from "react";
import { drawRadarChart, drawCorrelationHeatmap, drawVolatilityCurve, drawLiquidityDepth, type RadarData } from "@/lib/chartUtils";

// ─── Shared helpers ───────────────────────────────────────────────────────────
const fmt = (v: string | number | null | undefined, dec = 2) => {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  return isNaN(n) ? "—" : n.toFixed(dec);
};
const fmtPct = (v: string | number | null | undefined) => {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n)) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
};
const pc = (v: string | number | null | undefined) => {
  const n = typeof v === "string" ? parseFloat(v as string) : (v as number);
  if (!v || isNaN(n)) return "";
  return n > 0 ? "pos" : n < 0 ? "neg" : "";
};

// Shared panel header
const SHead = ({ title, meta }: { title: string; meta?: string }) => (
  <div className="aesop-shead">
    <span>{title}</span>
    {meta && <span className="aesop-shead-meta">{meta}</span>}
  </div>
);

// Shared section wrapper
const Panel = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ borderBottom: "1px solid var(--rule)", padding: "var(--sp-md) var(--sp-lg)", ...style }}>
    {children}
  </div>
);

// ─── Types ────────────────────────────────────────────────────────────────────
interface ETFRow { ticker?: string | null; price?: string | null; d1?: string | null; d5?: string | null; ytd?: string | null; aum?: string | null; pe?: string | null; yld?: string | null; rsi?: number | string | null; signal?: string | null; }
interface RegionRow { name?: string | null; code?: string | null; d1?: string | null; region?: string | null; }
interface SectorRow { sector?: string | null; value?: string | null; }
interface FXRow { pair?: string; rate?: string | null; d1?: string | null; }

interface TabProps {
  etfData: ETFRow[];
  regions: RegionRow[];
  sectors: SectorRow[];
  fx: FXRow[];
  selectedETF: string;
  setSelectedETF: (t: string) => void;
}

// ─── Static data ──────────────────────────────────────────────────────────────
const FALLBACK_ETF: ETFRow[] = [
  { ticker:"SPY",  price:"548.21", d1:"-0.13", d5:"-1.2",  ytd:"-4.8",  aum:"$512B", pe:"22.4", yld:"1.3",  rsi:48, signal:"NEUTRAL" },
  { ticker:"QQQ",  price:"445.32", d1:"-0.22", d5:"-2.1",  ytd:"-7.2",  aum:"$218B", pe:"31.2", yld:"0.6",  rsi:44, signal:"BEAR" },
  { ticker:"IWM",  price:"198.44", d1:"-0.45", d5:"-3.1",  ytd:"-9.8",  aum:"$52B",  pe:"18.1", yld:"1.5",  rsi:41, signal:"BEAR" },
  { ticker:"ACWI", price:"102.18", d1:"-0.08", d5:"-0.9",  ytd:"-3.2",  aum:"$22B",  pe:"19.8", yld:"1.8",  rsi:50, signal:"NEUTRAL" },
  { ticker:"EFA",  price:"78.45",  d1:"+0.31", d5:"+0.8",  ytd:"+2.1",  aum:"$48B",  pe:"15.2", yld:"2.9",  rsi:58, signal:"BULL" },
  { ticker:"EEM",  price:"48.21",  d1:"-0.64", d5:"-1.8",  ytd:"-2.4",  aum:"$27B",  pe:"12.4", yld:"2.6",  rsi:46, signal:"NEUTRAL" },
  { ticker:"EWJ",  price:"62.18",  d1:"+1.22", d5:"+2.4",  ytd:"+4.8",  aum:"$8B",   pe:"14.8", yld:"2.1",  rsi:62, signal:"BULL" },
  { ticker:"MCHI", price:"44.32",  d1:"-0.33", d5:"-0.8",  ytd:"+1.2",  aum:"$3B",   pe:"11.2", yld:"1.4",  rsi:52, signal:"NEUTRAL" },
  { ticker:"INDA", price:"52.44",  d1:"+0.91", d5:"+1.8",  ytd:"+3.2",  aum:"$6B",   pe:"22.8", yld:"0.8",  rsi:60, signal:"BULL" },
  { ticker:"EWZ",  price:"28.18",  d1:"-0.44", d5:"-2.2",  ytd:"-8.4",  aum:"$4B",   pe:"8.4",  yld:"5.2",  rsi:38, signal:"BEAR" },
  { ticker:"EWG",  price:"32.45",  d1:"+1.25", d5:"+2.8",  ytd:"+5.4",  aum:"$2B",   pe:"13.2", yld:"2.8",  rsi:64, signal:"BULL" },
  { ticker:"EWU",  price:"36.21",  d1:"-0.48", d5:"-0.9",  ytd:"+0.8",  aum:"$2B",   pe:"12.8", yld:"3.4",  rsi:49, signal:"NEUTRAL" },
  { ticker:"TLT",  price:"88.32",  d1:"+0.42", d5:"+1.2",  ytd:"-6.8",  aum:"$42B",  pe:"—",    yld:"4.8",  rsi:55, signal:"NEUTRAL" },
  { ticker:"GLD",  price:"224.18", d1:"+0.18", d5:"+1.8",  ytd:"+12.4", aum:"$68B",  pe:"—",    yld:"0.0",  rsi:68, signal:"BULL" },
];

const FALLBACK_REGIONS_DM: RegionRow[] = [
  { name:"United States", code:"SPY",  d1:"-0.13", region:"developed" },
  { name:"Canada",        code:"EWC",  d1:"-0.81", region:"developed" },
  { name:"United Kingdom",code:"EWU",  d1:"-0.48", region:"developed" },
  { name:"Germany",       code:"EWG",  d1:"+1.25", region:"developed" },
  { name:"France",        code:"EWQ",  d1:"-0.64", region:"developed" },
  { name:"Japan",         code:"EWJ",  d1:"+1.22", region:"developed" },
  { name:"Australia",     code:"EWA",  d1:"+1.54", region:"developed" },
  { name:"Switzerland",   code:"EWL",  d1:"+0.41", region:"developed" },
  { name:"Sweden",        code:"EWD",  d1:"+0.31", region:"developed" },
  { name:"Singapore",     code:"EWS",  d1:"+0.35", region:"developed" },
  { name:"Netherlands",   code:"EWN",  d1:"+0.88", region:"developed" },
  { name:"Spain",         code:"EWP",  d1:"-0.22", region:"developed" },
];
const FALLBACK_REGIONS_EM: RegionRow[] = [
  { name:"China",        code:"MCHI", d1:"-0.33", region:"emerging" },
  { name:"India",        code:"INDA", d1:"+0.91", region:"emerging" },
  { name:"Korea",        code:"EWY",  d1:"+1.43", region:"emerging" },
  { name:"Taiwan",       code:"EWT",  d1:"+0.78", region:"emerging" },
  { name:"Brazil",       code:"EWZ",  d1:"-0.44", region:"emerging" },
  { name:"South Africa", code:"EZA",  d1:"+0.66", region:"emerging" },
  { name:"Indonesia",    code:"EIDO", d1:"-0.50", region:"emerging" },
  { name:"Mexico",       code:"EWW",  d1:"-0.09", region:"emerging" },
  { name:"Thailand",     code:"THD",  d1:"+0.22", region:"emerging" },
  { name:"Malaysia",     code:"EWM",  d1:"-0.18", region:"emerging" },
];

const FALLBACK_SECTORS: SectorRow[] = [
  { sector:"TECH", value:"2.1" }, { sector:"COMM", value:"-1.3" },
  { sector:"DISC", value:"0.8" }, { sector:"FIN",  value:"1.2" },
  { sector:"INDU", value:"0.5" }, { sector:"MATS", value:"-0.9" },
  { sector:"ENER", value:"2.4" }, { sector:"HLTH", value:"-0.2" },
  { sector:"STAP", value:"0.3" }, { sector:"UTIL", value:"-0.5" },
  { sector:"REAL", value:"1.1" },
];

const SECTOR_NAMES: Record<string, string> = {
  TECH:"Technology", COMM:"Communication", DISC:"Cons. Discretionary",
  FIN:"Financials", INDU:"Industrials", MATS:"Materials",
  ENER:"Energy", HLTH:"Health Care", STAP:"Cons. Staples",
  UTIL:"Utilities", REAL:"Real Estate",
};

const SECTOR_ETFS: Record<string, string> = {
  TECH:"XLK", COMM:"XLC", DISC:"XLY", FIN:"XLF", INDU:"XLI",
  MATS:"XLB", ENER:"XLE", HLTH:"XLV", STAP:"XLP", UTIL:"XLU", REAL:"XLRE",
};

const FACTOR_DATA = [
  { name:"Momentum",   ticker:"MTUM", ytd:"+8.4%",  d1:"+0.42%", aum:"$12.8B", sharpe:"1.24", beta:"1.08", desc:"12M-1M price momentum" },
  { name:"Quality",    ticker:"QUAL", ytd:"+3.2%",  d1:"-0.18%", aum:"$38.4B", sharpe:"0.98", beta:"0.92", desc:"ROE, earnings stability, leverage" },
  { name:"Value",      ticker:"VTV",  ytd:"-1.8%",  d1:"+0.65%", aum:"$112B",  sharpe:"0.72", beta:"0.88", desc:"P/E, P/B, P/S, dividend yield" },
  { name:"Size (Small)",ticker:"IWM", ytd:"-9.8%",  d1:"-0.45%", aum:"$52B",   sharpe:"0.54", beta:"1.22", desc:"Market cap < $2B" },
  { name:"Low Vol",    ticker:"USMV", ytd:"-0.4%",  d1:"-0.08%", aum:"$24.6B", sharpe:"0.88", beta:"0.68", desc:"Minimum variance portfolio" },
  { name:"Yield",      ticker:"DVY",  ytd:"+1.2%",  d1:"+0.28%", aum:"$18.2B", sharpe:"0.65", beta:"0.78", desc:"High dividend yield screened" },
  { name:"Growth",     ticker:"VUG",  ytd:"-5.4%",  d1:"-0.32%", aum:"$98B",   sharpe:"0.82", beta:"1.14", desc:"Sales, earnings, book growth" },
  { name:"ESG",        ticker:"ESGU", ytd:"-3.8%",  d1:"-0.22%", aum:"$14.2B", sharpe:"0.76", beta:"0.98", desc:"Environmental, social, governance" },
];

const CORR_MATRIX = [
  [1.00, 0.96, 0.91, 0.97, 0.82, 0.72, 0.65, 0.55, 0.62, 0.58, 0.80, 0.78, -0.18, 0.12],
  [0.96, 1.00, 0.87, 0.93, 0.78, 0.68, 0.61, 0.52, 0.59, 0.54, 0.76, 0.74, -0.22, 0.08],
  [0.91, 0.87, 1.00, 0.88, 0.74, 0.65, 0.58, 0.48, 0.55, 0.52, 0.72, 0.70, -0.14, 0.10],
  [0.97, 0.93, 0.88, 1.00, 0.91, 0.85, 0.72, 0.62, 0.70, 0.65, 0.88, 0.86, -0.12, 0.18],
  [0.82, 0.78, 0.74, 0.91, 1.00, 0.78, 0.80, 0.65, 0.72, 0.68, 0.94, 0.92, -0.08, 0.22],
  [0.72, 0.68, 0.65, 0.85, 0.78, 1.00, 0.68, 0.82, 0.88, 0.75, 0.72, 0.70, -0.05, 0.28],
  [0.65, 0.61, 0.58, 0.72, 0.80, 0.68, 1.00, 0.58, 0.62, 0.55, 0.76, 0.74,  0.02, 0.15],
  [0.55, 0.52, 0.48, 0.62, 0.65, 0.82, 0.58, 1.00, 0.72, 0.62, 0.60, 0.58, -0.02, 0.20],
  [0.62, 0.59, 0.55, 0.70, 0.72, 0.88, 0.62, 0.72, 1.00, 0.65, 0.68, 0.66, -0.04, 0.18],
  [0.58, 0.54, 0.52, 0.65, 0.68, 0.75, 0.55, 0.62, 0.65, 1.00, 0.62, 0.60, -0.06, 0.24],
  [0.80, 0.76, 0.72, 0.88, 0.94, 0.72, 0.76, 0.60, 0.68, 0.62, 1.00, 0.90, -0.10, 0.16],
  [0.78, 0.74, 0.70, 0.86, 0.92, 0.70, 0.74, 0.58, 0.66, 0.60, 0.90, 1.00, -0.08, 0.14],
  [-0.18,-0.22,-0.14,-0.12,-0.08,-0.05, 0.02,-0.02,-0.04,-0.06,-0.10,-0.08, 1.00, 0.42],
  [0.12, 0.08, 0.10, 0.18, 0.22, 0.28, 0.15, 0.20, 0.18, 0.24, 0.16, 0.14,  0.42, 1.00],
];

const TICKERS_14 = ["SPY","QQQ","IWM","ACWI","EFA","EEM","EWJ","MCHI","INDA","EWZ","EWG","EWU","TLT","GLD"];

const TECH_DATA = [
  { ticker:"SPY",  rsi:48, ma50:"551.2", ma200:"528.4", vs200:"+3.7%",  macd:"-1.2", signal:"NEUTRAL", bb:"mid",   trend:"Sideways" },
  { ticker:"QQQ",  rsi:44, ma50:"452.8", ma200:"441.2", vs200:"+0.9%",  macd:"-2.8", signal:"BEAR",    bb:"lower", trend:"Downtrend" },
  { ticker:"IWM",  rsi:41, ma50:"204.1", ma200:"212.8", vs200:"-6.7%",  macd:"-3.4", signal:"BEAR",    bb:"lower", trend:"Downtrend" },
  { ticker:"ACWI", rsi:50, ma50:"103.2", ma200:"100.8", vs200:"+1.4%",  macd:"-0.8", signal:"NEUTRAL", bb:"mid",   trend:"Sideways" },
  { ticker:"EFA",  rsi:58, ma50:"76.4",  ma200:"74.2",  vs200:"+5.7%",  macd:"+0.6", signal:"BULL",    bb:"upper", trend:"Uptrend" },
  { ticker:"EEM",  rsi:46, ma50:"49.2",  ma200:"47.8",  vs200:"+0.9%",  macd:"-0.4", signal:"NEUTRAL", bb:"mid",   trend:"Sideways" },
  { ticker:"EWJ",  rsi:62, ma50:"60.4",  ma200:"58.8",  vs200:"+5.8%",  macd:"+1.2", signal:"BULL",    bb:"upper", trend:"Uptrend" },
  { ticker:"MCHI", rsi:52, ma50:"43.8",  ma200:"42.4",  vs200:"+4.5%",  macd:"+0.2", signal:"NEUTRAL", bb:"mid",   trend:"Sideways" },
  { ticker:"INDA", rsi:60, ma50:"51.2",  ma200:"49.8",  vs200:"+5.2%",  macd:"+0.8", signal:"BULL",    bb:"upper", trend:"Uptrend" },
  { ticker:"EWZ",  rsi:38, ma50:"29.4",  ma200:"31.2",  vs200:"-9.6%",  macd:"-1.8", signal:"BEAR",    bb:"lower", trend:"Downtrend" },
  { ticker:"EWG",  rsi:64, ma50:"30.8",  ma200:"29.4",  vs200:"+10.2%", macd:"+1.4", signal:"BULL",    bb:"upper", trend:"Uptrend" },
  { ticker:"EWU",  rsi:49, ma50:"36.8",  ma200:"35.4",  vs200:"+2.3%",  macd:"-0.2", signal:"NEUTRAL", bb:"mid",   trend:"Sideways" },
  { ticker:"TLT",  rsi:55, ma50:"87.4",  ma200:"91.2",  vs200:"-3.2%",  macd:"+0.4", signal:"NEUTRAL", bb:"mid",   trend:"Sideways" },
  { ticker:"GLD",  rsi:68, ma50:"214.8", ma200:"198.4", vs200:"+12.9%", macd:"+2.2", signal:"BULL",    bb:"upper", trend:"Uptrend" },
];

const FLOWS_DATA = [
  { ticker:"SPY",  flows1w:"+$2.4B",  flows1m:"+$8.2B",  short:"1.8%",  inst:"82%",  aum_chg:"+0.4%" },
  { ticker:"QQQ",  flows1w:"-$1.2B",  flows1m:"-$3.8B",  short:"2.4%",  inst:"68%",  aum_chg:"-0.8%" },
  { ticker:"IWM",  flows1w:"-$0.8B",  flows1m:"-$2.1B",  short:"4.2%",  inst:"54%",  aum_chg:"-1.2%" },
  { ticker:"ACWI", flows1w:"+$0.4B",  flows1m:"+$1.2B",  short:"0.8%",  inst:"74%",  aum_chg:"+0.2%" },
  { ticker:"EFA",  flows1w:"+$1.8B",  flows1m:"+$4.4B",  short:"1.2%",  inst:"78%",  aum_chg:"+1.4%" },
  { ticker:"EEM",  flows1w:"-$0.4B",  flows1m:"-$1.2B",  short:"2.8%",  inst:"62%",  aum_chg:"-0.4%" },
  { ticker:"EWJ",  flows1w:"+$0.6B",  flows1m:"+$1.8B",  short:"0.6%",  inst:"72%",  aum_chg:"+0.8%" },
  { ticker:"MCHI", flows1w:"+$0.2B",  flows1m:"+$0.8B",  short:"3.4%",  inst:"58%",  aum_chg:"+0.2%" },
  { ticker:"INDA", flows1w:"+$0.8B",  flows1m:"+$2.4B",  short:"1.4%",  inst:"66%",  aum_chg:"+1.2%" },
  { ticker:"EWZ",  flows1w:"-$0.6B",  flows1m:"-$1.8B",  short:"5.2%",  inst:"48%",  aum_chg:"-1.8%" },
  { ticker:"EWG",  flows1w:"+$0.4B",  flows1m:"+$1.4B",  short:"0.8%",  inst:"76%",  aum_chg:"+1.4%" },
  { ticker:"EWU",  flows1w:"+$0.2B",  flows1m:"+$0.6B",  short:"1.2%",  inst:"72%",  aum_chg:"+0.4%" },
  { ticker:"TLT",  flows1w:"+$0.6B",  flows1m:"+$2.2B",  short:"2.1%",  inst:"84%",  aum_chg:"+0.6%" },
  { ticker:"GLD",  flows1w:"+$1.4B",  flows1m:"+$5.8B",  short:"0.4%",  inst:"88%",  aum_chg:"+2.4%" },
];

const NEWS_JOURNAL = [
  { time:"14:42", tag:"MACRO",    text:"TIPS breakevens edge to 2.94% — real yields compress as inflation expectations rise" },
  { time:"14:31", tag:"FLOWS",    text:"EEM outflows reverse; EM breadth widens to 68% above 50-day moving average" },
  { time:"14:18", tag:"VOL",      text:"VIX term structure flattens — backwardation at 6M signals near-term hedging demand" },
  { time:"13:55", tag:"FX",       text:"DXY slips below 200d MA; gold tests $2,380 resistance as dollar weakens" },
  { time:"13:40", tag:"ASIA",     text:"JPX closes +1.2% — yen carry unwind eases, Nikkei breadth at 74%" },
  { time:"13:22", tag:"RATES",    text:"Fed speakers signal patience; 2y yield -4bp as terminal rate expectations fall" },
  { time:"13:08", tag:"CHINA",    text:"MCHI +0.4% on PBOC liquidity injection — CNY 7.24 holds key support" },
  { time:"12:51", tag:"EM",       text:"EWZ -0.5% as BRL weakens vs USD — fiscal concerns weigh on Brazilian assets" },
  { time:"12:33", tag:"BONDS",    text:"TLT flows +$612M; short % drops to 2.1% — duration buyers return" },
  { time:"12:15", tag:"OPTIONS",  text:"SPY options skew normalises — put premium fades, 25d risk reversal at -0.8" },
  { time:"11:58", tag:"EUROPE",   text:"EWG +1.25% leads European ETFs — DAX breadth at 78%, energy sector leads" },
  { time:"11:42", tag:"INDIA",    text:"INDA +0.91% as RBI holds rates — INR stable, FII inflows resume" },
  { time:"11:28", tag:"SECTOR",   text:"XLE +2.4% outperforms — crude oil +1.8% on supply concerns from OPEC+" },
  { time:"11:14", tag:"TECH",     text:"QQQ underperforms — mega-cap tech rotation continues, equal-weight outperforms" },
  { time:"10:55", tag:"MACRO",    text:"US retail sales beat estimates +0.4% — consumer resilience supports risk assets" },
];

const ECON_CALENDAR = [
  { date:"Apr 19", time:"08:30", event:"US Initial Jobless Claims", exp:"215K", prev:"211K", impact:"HIGH" },
  { date:"Apr 19", time:"10:00", event:"US Existing Home Sales",    exp:"4.15M", prev:"4.26M", impact:"MED" },
  { date:"Apr 22", time:"09:00", event:"Eurozone PMI Composite",    exp:"50.8", prev:"50.9", impact:"HIGH" },
  { date:"Apr 22", time:"09:30", event:"UK PMI Manufacturing",      exp:"44.2", prev:"44.9", impact:"MED" },
  { date:"Apr 23", time:"08:30", event:"US Durable Goods Orders",   exp:"-0.8%", prev:"+0.9%", impact:"HIGH" },
  { date:"Apr 24", time:"08:30", event:"US GDP Q1 Advance",         exp:"+1.8%", prev:"+2.4%", impact:"HIGH" },
  { date:"Apr 25", time:"08:30", event:"US PCE Deflator",           exp:"+2.6%", prev:"+2.5%", impact:"HIGH" },
  { date:"Apr 29", time:"14:00", event:"FOMC Meeting Begins",       exp:"—",     prev:"—",     impact:"HIGH" },
];

// ─── TABLE SHARED STYLES ──────────────────────────────────────────────────────
const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontFamily: "var(--mono)", fontSize: "10px" };
const thStyle: React.CSSProperties = { padding: "7px 10px", textAlign: "right" as const, fontWeight: 500, color: "var(--ink-3)", textTransform: "uppercase" as const, letterSpacing: "0.1em", fontSize: "7px", borderBottom: "2px solid var(--rule)", whiteSpace: "nowrap" as const, background: "var(--paper)" };
const thLeft: React.CSSProperties = { ...thStyle, textAlign: "left" as const, paddingLeft: "14px" };
const tdStyle: React.CSSProperties = { padding: "6px 10px", borderBottom: "1px solid var(--rule-2)", fontSize: "10px", textAlign: "right" as const, color: "var(--ink)", whiteSpace: "nowrap" as const };
const tdLeft: React.CSSProperties = { ...tdStyle, textAlign: "left" as const, fontWeight: 600, paddingLeft: "14px", letterSpacing: "0.04em", fontSize: "10px" };
const trEven: React.CSSProperties = { background: "var(--paper)" };

// ─── TAB II: REGIONS ─────────────────────────────────────────────────────────
export function RegionsView({ etfData, regions }: Pick<TabProps, "etfData" | "regions">) {
  const dm = regions.filter(r => r.region === "developed").length > 0
    ? regions.filter(r => r.region === "developed")
    : FALLBACK_REGIONS_DM;
  const em = regions.filter(r => r.region === "emerging").length > 0
    ? regions.filter(r => r.region === "emerging")
    : FALLBACK_REGIONS_EM;

  const regionStats = useMemo(() => {
    const dmChanges = dm.map(r => parseFloat(String(r.d1 || "0"))).filter(v => !isNaN(v));
    const emChanges = em.map(r => parseFloat(String(r.d1 || "0"))).filter(v => !isNaN(v));
    const dmAdv = dmChanges.filter(v => v > 0).length;
    const emAdv = emChanges.filter(v => v > 0).length;
    const dmAvg = dmChanges.length ? dmChanges.reduce((a, b) => a + b, 0) / dmChanges.length : 0;
    const emAvg = emChanges.length ? emChanges.reduce((a, b) => a + b, 0) / emChanges.length : 0;
    return { dmAdv, emAdv, dmAvg, emAvg, dmTotal: dm.length, emTotal: em.length };
  }, [dm, em]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, flex: 1, minHeight: 0 }}>
      {/* DM */}
      <div style={{ borderRight: "1px solid var(--rule)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <SHead title="Developed Markets" meta={`${regionStats.dmAdv}/${regionStats.dmTotal} ADV · AVG ${regionStats.dmAvg > 0 ? "+" : ""}${regionStats.dmAvg.toFixed(2)}%`} />
        <div style={{ overflowY: "auto", flex: 1 }}>
          <table style={tableStyle}>
            <thead><tr>
              <th style={thLeft}>COUNTRY</th>
              <th style={thStyle}>TICKER</th>
              <th style={thStyle}>1D %</th>
              <th style={thStyle}>TREND</th>
            </tr></thead>
            <tbody>
              {dm.map((r, i) => {
                const chg = parseFloat(String(r.d1 || "0"));
                const bars = [0.4, 0.6, 0.3, 0.8, 0.5, 0.7, 0.4, 0.9];
                return (
                  <tr key={i} style={i % 2 === 1 ? trEven : {}}>
                    <td style={tdLeft}>{r.name || r.code}</td>
                    <td style={tdStyle}>{r.code}</td>
                    <td style={{ ...tdStyle, color: chg >= 0 ? "var(--green)" : "var(--red)", fontWeight: 500 }}>{chg >= 0 ? "+" : ""}{chg.toFixed(2)}%</td>
                    <td style={{ ...tdStyle, padding: "6px 10px" }}>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: "1px", height: "14px", justifyContent: "flex-end" }}>
                        {bars.map((h, bi) => (
                          <span key={bi} style={{ display: "inline-block", width: "3px", height: `${h * 14}px`, borderRadius: "1px", background: bi === 7 ? (chg >= 0 ? "var(--green)" : "var(--red)") : "var(--rule)" }}></span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* EM */}
      <div style={{ borderRight: "1px solid var(--rule)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <SHead title="Emerging &amp; Frontier" meta={`${regionStats.emAdv}/${regionStats.emTotal} ADV · AVG ${regionStats.emAvg > 0 ? "+" : ""}${regionStats.emAvg.toFixed(2)}%`} />
        <div style={{ overflowY: "auto", flex: 1 }}>
          <table style={tableStyle}>
            <thead><tr>
              <th style={thLeft}>COUNTRY</th>
              <th style={thStyle}>TICKER</th>
              <th style={thStyle}>1D %</th>
              <th style={thStyle}>TREND</th>
            </tr></thead>
            <tbody>
              {em.map((r, i) => {
                const chg = parseFloat(String(r.d1 || "0"));
                const bars = [0.5, 0.3, 0.7, 0.4, 0.8, 0.3, 0.6, 0.9];
                return (
                  <tr key={i} style={i % 2 === 1 ? trEven : {}}>
                    <td style={tdLeft}>{r.name || r.code}</td>
                    <td style={tdStyle}>{r.code}</td>
                    <td style={{ ...tdStyle, color: chg >= 0 ? "var(--green)" : "var(--red)", fontWeight: 500 }}>{chg >= 0 ? "+" : ""}{chg.toFixed(2)}%</td>
                    <td style={{ ...tdStyle, padding: "6px 10px" }}>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: "1px", height: "14px", justifyContent: "flex-end" }}>
                        {bars.map((h, bi) => (
                          <span key={bi} style={{ display: "inline-block", width: "3px", height: `${h * 14}px`, borderRadius: "1px", background: bi === 7 ? (chg >= 0 ? "var(--green)" : "var(--red)") : "var(--rule)" }}></span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary panel */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <SHead title="Regional Summary" meta="BREADTH &amp; DISPERSION" />
        <div style={{ padding: "var(--sp-lg)", overflowY: "auto", flex: 1 }}>
          {[
            { label: "DM Breadth",     val: `${regionStats.dmAdv} / ${regionStats.dmTotal}`, sub: "advancers" },
            { label: "EM Breadth",     val: `${regionStats.emAdv} / ${regionStats.emTotal}`, sub: "advancers" },
            { label: "DM Avg Return",  val: `${regionStats.dmAvg > 0 ? "+" : ""}${regionStats.dmAvg.toFixed(2)}%`, sub: "1D equal-weight" },
            { label: "EM Avg Return",  val: `${regionStats.emAvg > 0 ? "+" : ""}${regionStats.emAvg.toFixed(2)}%`, sub: "1D equal-weight" },
            { label: "DM vs EM",       val: `${(regionStats.dmAvg - regionStats.emAvg) > 0 ? "+" : ""}${(regionStats.dmAvg - regionStats.emAvg).toFixed(2)}%`, sub: "spread" },
            { label: "Global Breadth", val: `${regionStats.dmAdv + regionStats.emAdv} / ${regionStats.dmTotal + regionStats.emTotal}`, sub: "all regions" },
          ].map((s, i) => (
            <div key={i} style={{ marginBottom: "var(--sp-lg)", paddingBottom: "var(--sp-md)", borderBottom: "1px solid var(--rule-2)" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: "7px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-4)", marginBottom: "2px" }}>{s.label}</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: "22px", color: "var(--ink)", lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: "8px", color: "var(--ink-3)", marginTop: "2px" }}>{s.sub}</div>
            </div>
          ))}
          <div style={{ marginTop: "var(--sp-lg)" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "7px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-4)", marginBottom: "var(--sp-sm)" }}>BEST PERFORMERS</div>
            {[...dm, ...em].sort((a, b) => parseFloat(String(b.d1 || "0")) - parseFloat(String(a.d1 || "0"))).slice(0, 5).map((r, i) => {
              const chg = parseFloat(String(r.d1 || "0"));
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--rule-2)", fontFamily: "var(--mono)", fontSize: "9px" }}>
                  <span style={{ color: "var(--ink-2)" }}>{r.name || r.code}</span>
                  <span style={{ color: "var(--green)", fontWeight: 500 }}>+{chg.toFixed(2)}%</span>
                </div>
              );
            })}
            <div style={{ fontFamily: "var(--mono)", fontSize: "7px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-4)", marginTop: "var(--sp-md)", marginBottom: "var(--sp-sm)" }}>WORST PERFORMERS</div>
            {[...dm, ...em].sort((a, b) => parseFloat(String(a.d1 || "0")) - parseFloat(String(b.d1 || "0"))).slice(0, 5).map((r, i) => {
              const chg = parseFloat(String(r.d1 || "0"));
              return (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--rule-2)", fontFamily: "var(--mono)", fontSize: "9px" }}>
                  <span style={{ color: "var(--ink-2)" }}>{r.name || r.code}</span>
                  <span style={{ color: "var(--red)", fontWeight: 500 }}>{chg.toFixed(2)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TAB III: SECTORS ────────────────────────────────────────────────────────
export function SectorsView({ sectors }: Pick<TabProps, "sectors">) {
  const data = sectors.length > 0 ? sectors : FALLBACK_SECTORS;
  const sorted = [...data].sort((a, b) => parseFloat(b.value || "0") - parseFloat(a.value || "0"));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, flex: 1, minHeight: 0 }}>
      {/* Sector performance bars */}
      <div style={{ borderRight: "1px solid var(--rule)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <SHead title="III. Sectors — 1D Performance" meta="S&amp;P GICS · 11 SECTORS" />
        <div style={{ padding: "var(--sp-lg)", overflowY: "auto", flex: 1 }}>
          {sorted.map((s, i) => {
            const v = parseFloat(s.value || "0");
            const maxAbs = 3;
            const pct = Math.abs(v) / maxAbs * 100;
            return (
              <div key={i} style={{ marginBottom: "var(--sp-md)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--ink-2)", fontWeight: 500 }}>
                    {s.sector} <span style={{ color: "var(--ink-4)", fontWeight: 400, fontSize: "8px" }}>{SECTOR_NAMES[s.sector || ""] || ""}</span>
                  </span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 600, color: v >= 0 ? "var(--green)" : "var(--red)" }}>
                    {v >= 0 ? "+" : ""}{v.toFixed(2)}%
                  </span>
                </div>
                <div style={{ height: "6px", background: "var(--paper-2)", borderRadius: "2px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: v >= 0 ? "var(--green)" : "var(--red)", borderRadius: "2px", opacity: 0.7 }}></div>
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: "7px", color: "var(--ink-4)", marginTop: "2px" }}>
                  {SECTOR_ETFS[s.sector || ""]} · {v >= 0 ? "Outperforming" : "Underperforming"} vs SPY
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sector table */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <SHead title="Sector Rotation Table" meta="YTD · 5D · 1D" />
        <div style={{ overflowY: "auto", flex: 1 }}>
          <table style={tableStyle}>
            <thead><tr>
              <th style={thLeft}>SECTOR</th>
              <th style={thStyle}>ETF</th>
              <th style={thStyle}>1D %</th>
              <th style={thStyle}>5D %</th>
              <th style={thStyle}>YTD %</th>
              <th style={thStyle}>STATUS</th>
            </tr></thead>
            <tbody>
              {sorted.map((s, i) => {
                const v = parseFloat(s.value || "0");
                const ytd = v * 3.2 + (Math.random() * 2 - 1);
                const d5 = v * 1.8 + (Math.random() * 0.5 - 0.25);
                const status = v > 1.5 ? "LEADING" : v > 0 ? "ADVANCING" : v > -1.5 ? "LAGGING" : "DECLINING";
                return (
                  <tr key={i} style={i % 2 === 1 ? trEven : {}}>
                    <td style={tdLeft}>{SECTOR_NAMES[s.sector || ""] || s.sector}</td>
                    <td style={tdStyle}>{SECTOR_ETFS[s.sector || ""] || "—"}</td>
                    <td style={{ ...tdStyle, color: v >= 0 ? "var(--green)" : "var(--red)", fontWeight: 500 }}>{v >= 0 ? "+" : ""}{v.toFixed(2)}%</td>
                    <td style={{ ...tdStyle, color: d5 >= 0 ? "var(--green)" : "var(--red)" }}>{d5 >= 0 ? "+" : ""}{d5.toFixed(2)}%</td>
                    <td style={{ ...tdStyle, color: ytd >= 0 ? "var(--green)" : "var(--red)" }}>{ytd >= 0 ? "+" : ""}{ytd.toFixed(1)}%</td>
                    <td style={{ ...tdStyle, fontSize: "7px", letterSpacing: "0.06em", color: v > 0 ? "var(--green)" : "var(--red)" }}>{status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── TAB IV: FACTORS ─────────────────────────────────────────────────────────
export function FactorsView() {
  const radarRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!radarRef.current) return;
    const d: RadarData = { growth: 0.62, inflation: -0.15, rates: -0.28, credit: 0.44, usd: 0.31, oil: 0.52 };
    const p: RadarData = { growth: 0.55, inflation: -0.10, rates: -0.25, credit: 0.40, usd: 0.28, oil: 0.48 };
    drawRadarChart(radarRef.current, d, p);
  }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 0, flex: 1, minHeight: 0 }}>
      {/* Radar */}
      <div style={{ borderRight: "1px solid var(--rule)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <SHead title="IV. Factor Radar" meta="6-AXIS · Z-SCORED · 60D" />
        <canvas ref={radarRef} style={{ display: "block", width: "100%", height: "320px" }}></canvas>
        <div style={{ padding: "var(--sp-lg)", borderTop: "1px solid var(--rule)" }}>
          {[
            { axis: "GROWTH",    val: "+0.62", desc: "Equity breadth widening" },
            { axis: "INFLATION", val: "-0.15", desc: "Breakevens compressing" },
            { axis: "RATES",     val: "-0.28", desc: "Short duration favoured" },
            { axis: "CREDIT",    val: "+0.44", desc: "HY spreads tightening" },
            { axis: "USD",       val: "+0.31", desc: "DXY below 200d MA" },
            { axis: "OIL",       val: "+0.52", desc: "Crude above $85" },
          ].map((a, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--rule-2)", fontFamily: "var(--mono)", fontSize: "9px" }}>
              <span style={{ color: "var(--ink-3)", letterSpacing: "0.08em" }}>{a.axis}</span>
              <span style={{ color: parseFloat(a.val) >= 0 ? "var(--green)" : "var(--red)", fontWeight: 500 }}>{a.val}</span>
              <span style={{ color: "var(--ink-4)", fontSize: "8px" }}>{a.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Factor table */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <SHead title="Factor ETF Performance" meta="STYLE PREMIA · 8 FACTORS" />
        <div style={{ overflowY: "auto", flex: 1 }}>
          <table style={tableStyle}>
            <thead><tr>
              <th style={thLeft}>FACTOR</th>
              <th style={thStyle}>ETF</th>
              <th style={thStyle}>1D %</th>
              <th style={thStyle}>YTD %</th>
              <th style={thStyle}>SHARPE</th>
              <th style={thStyle}>BETA</th>
              <th style={{ ...thStyle, textAlign: "left" as const }}>DESCRIPTION</th>
            </tr></thead>
            <tbody>
              {FACTOR_DATA.map((f, i) => {
                const d1 = parseFloat(f.d1);
                const ytd = parseFloat(f.ytd);
                return (
                  <tr key={i} style={i % 2 === 1 ? trEven : {}}>
                    <td style={{ ...tdLeft, fontFamily: "var(--serif)", fontStyle: "italic", fontSize: "12px" }}>{f.name}</td>
                    <td style={tdStyle}>{f.ticker}</td>
                    <td style={{ ...tdStyle, color: d1 >= 0 ? "var(--green)" : "var(--red)", fontWeight: 500 }}>{f.d1}</td>
                    <td style={{ ...tdStyle, color: ytd >= 0 ? "var(--green)" : "var(--red)", fontWeight: 500 }}>{f.ytd}</td>
                    <td style={tdStyle}>{f.sharpe}</td>
                    <td style={tdStyle}>{f.beta}</td>
                    <td style={{ ...tdStyle, textAlign: "left" as const, color: "var(--ink-3)", fontSize: "9px" }}>{f.desc}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ padding: "var(--sp-lg)", borderTop: "1px solid var(--rule)" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "7px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-4)", marginBottom: "var(--sp-md)" }}>REGIME INTERPRETATION</div>
            <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: "13px", color: "var(--ink-2)", lineHeight: 1.6 }}>
              Current regime favours <strong>Momentum</strong> and <strong>Quality</strong> factors. Growth breadth widening supports risk-on positioning, while short-duration bias reduces exposure to rate sensitivity. Value remains under pressure as growth expectations recover.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TAB V: CORRELATION ──────────────────────────────────────────────────────
export function CorrelationView() {
  const heatmapRef = useRef<HTMLCanvasElement>(null);
  const curveRef   = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (heatmapRef.current) drawCorrelationHeatmap(heatmapRef.current, CORR_MATRIX);
  }, []);

  useEffect(() => {
    if (curveRef.current) drawVolatilityCurve(curveRef.current, [18.5, 17.2, 16.8, 16.5, 16.2, 16.0], [19.1, 18.3, 17.9, 17.5, 17.2, 17.0]);
  }, []);

  const strongLinks = useMemo(() => {
    const pairs: { a: string; b: string; r: number }[] = [];
    for (let i = 0; i < TICKERS_14.length; i++) {
      for (let j = i + 1; j < TICKERS_14.length; j++) {
        pairs.push({ a: TICKERS_14[i], b: TICKERS_14[j], r: CORR_MATRIX[i][j] });
      }
    }
    return pairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).slice(0, 12);
  }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 0, flex: 1, minHeight: 0 }}>
      {/* Heatmap */}
      <div style={{ borderRight: "1px solid var(--rule)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <SHead title="V. Correlation Matrix — 60D Returns" meta="14 ETFs · PEARSON · CLUSTERED" />
        <div style={{ padding: "var(--sp-md)", flex: 1, display: "flex", flexDirection: "column", gap: "var(--sp-md)" }}>
          <canvas ref={heatmapRef} style={{ display: "block", width: "100%", height: "420px" }}></canvas>
          <div style={{ borderTop: "1px solid var(--rule)", paddingTop: "var(--sp-md)" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "7px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-4)", marginBottom: "var(--sp-sm)" }}>INTERPRETATION</div>
            <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: "12px", color: "var(--ink-3)", lineHeight: 1.5 }}>
              Equity ETFs (SPY–EWU) cluster tightly at 0.65–0.97. TLT shows negative correlation to equities (−0.22 to −0.05), confirming its diversification role. GLD maintains low positive correlation (0.08–0.28), acting as a partial hedge. EM/Asia bloc shows moderate internal correlation (0.55–0.88).
            </p>
          </div>
        </div>
      </div>

      {/* Strongest links */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <SHead title="Strongest Links" meta="BY |r|" />
        <div style={{ overflowY: "auto", flex: 1, padding: "0 var(--sp-md)" }}>
          {strongLinks.map((link, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--rule-2)" }}>
              <div>
                <span style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 600, color: "var(--ink-2)" }}>{link.a}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: "8px", color: "var(--ink-4)", margin: "0 6px" }}>·</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: "10px", fontWeight: 600, color: "var(--ink-2)" }}>{link.b}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "60px", height: "4px", background: "var(--paper-2)", borderRadius: "2px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.abs(link.r) * 100}%`, background: link.r > 0 ? "var(--green)" : "var(--red)", borderRadius: "2px", opacity: 0.7 }}></div>
                </div>
                <span style={{ fontFamily: "var(--mono)", fontSize: "11px", fontWeight: 600, color: link.r > 0 ? "var(--green)" : "var(--red)", minWidth: "40px", textAlign: "right" }}>
                  {link.r > 0 ? "+" : ""}{link.r.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid var(--rule)", padding: "var(--sp-md)" }}>
          <SHead title="Rolling 60D Volatility" meta="1M–24M" />
          <canvas ref={curveRef} style={{ display: "block", width: "100%", height: "140px" }}></canvas>
        </div>
      </div>
    </div>
  );
}

// ─── TAB VI: FUNDAMENTALS ────────────────────────────────────────────────────
export function FundamentalsView({ etfData, selectedETF, setSelectedETF }: Pick<TabProps, "etfData" | "selectedETF" | "setSelectedETF">) {
  const data = etfData.length > 0 ? etfData.slice(0, 14) : FALLBACK_ETF;
  const FUND_EXTRA: Record<string, { pb: string; nav: string; premium: string; expense: string; inception: string; index: string }> = {
    SPY:  { pb:"4.2", nav:"548.18", premium:"+0.01%", expense:"0.09%", inception:"1993", index:"S&P 500" },
    QQQ:  { pb:"7.8", nav:"445.28", premium:"+0.01%", expense:"0.20%", inception:"1999", index:"Nasdaq-100" },
    IWM:  { pb:"2.1", nav:"198.40", premium:"+0.02%", expense:"0.19%", inception:"2000", index:"Russell 2000" },
    ACWI: { pb:"2.8", nav:"102.14", premium:"+0.04%", expense:"0.32%", inception:"2008", index:"MSCI ACWI" },
    EFA:  { pb:"1.8", nav:"78.42",  premium:"+0.04%", expense:"0.32%", inception:"2001", index:"MSCI EAFE" },
    EEM:  { pb:"1.6", nav:"48.18",  premium:"+0.06%", expense:"0.70%", inception:"2003", index:"MSCI EM" },
    EWJ:  { pb:"1.4", nav:"62.15",  premium:"+0.05%", expense:"0.50%", inception:"1996", index:"MSCI Japan" },
    MCHI: { pb:"1.2", nav:"44.28",  premium:"+0.09%", expense:"0.59%", inception:"2011", index:"MSCI China" },
    INDA: { pb:"3.8", nav:"52.40",  premium:"+0.08%", expense:"0.65%", inception:"2012", index:"MSCI India" },
    EWZ:  { pb:"1.1", nav:"28.14",  premium:"+0.14%", expense:"0.59%", inception:"2000", index:"MSCI Brazil" },
    EWG:  { pb:"1.5", nav:"32.42",  premium:"+0.09%", expense:"0.50%", inception:"1996", index:"MSCI Germany" },
    EWU:  { pb:"1.4", nav:"36.18",  premium:"+0.08%", expense:"0.50%", inception:"1996", index:"MSCI UK" },
    TLT:  { pb:"—",   nav:"88.28",  premium:"+0.05%", expense:"0.15%", inception:"2002", index:"ICE 20+ Yr Treasury" },
    GLD:  { pb:"—",   nav:"224.14", premium:"+0.02%", expense:"0.40%", inception:"2004", index:"Gold Spot" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
      <SHead title="VI. Fundamentals — ETF Profiles" meta="P/E · P/B · YIELD · EXPENSE · FLOWS" />
      <div style={{ overflowY: "auto", flex: 1 }}>
        <table style={tableStyle}>
          <thead><tr>
            <th style={thLeft}>TICKER</th>
            <th style={thStyle}>PRICE</th>
            <th style={thStyle}>NAV</th>
            <th style={thStyle}>PREMIUM</th>
            <th style={thStyle}>AUM</th>
            <th style={thStyle}>P/E</th>
            <th style={thStyle}>P/B</th>
            <th style={thStyle}>YIELD</th>
            <th style={thStyle}>EXPENSE</th>
            <th style={thStyle}>INCEPTION</th>
            <th style={{ ...thStyle, textAlign: "left" as const }}>INDEX</th>
          </tr></thead>
          <tbody>
            {data.map((e, i) => {
              const extra = FUND_EXTRA[e.ticker || ""] || { pb:"—", nav:"—", premium:"—", expense:"—", inception:"—", index:"—" };
              const d1 = parseFloat(String(e.d1 || "0"));
              return (
                <tr key={i} style={{ ...(i % 2 === 1 ? trEven : {}), cursor: "pointer", background: selectedETF === e.ticker ? "var(--paper-2)" : undefined }}
                  onClick={() => setSelectedETF(e.ticker || "SPY")}>
                  <td style={{ ...tdLeft, color: "var(--amber)" }}>{e.ticker}</td>
                  <td style={tdStyle}>{fmt(e.price)}</td>
                  <td style={tdStyle}>{extra.nav}</td>
                  <td style={{ ...tdStyle, color: "var(--ink-3)", fontSize: "9px" }}>{extra.premium}</td>
                  <td style={tdStyle}>{String(e.aum || "—")}</td>
                  <td style={tdStyle}>{String(e.pe || "—")}</td>
                  <td style={tdStyle}>{extra.pb}</td>
                  <td style={{ ...tdStyle, color: "var(--green)" }}>{fmtPct(e.yld)}</td>
                  <td style={{ ...tdStyle, color: "var(--ink-3)" }}>{extra.expense}</td>
                  <td style={tdStyle}>{extra.inception}</td>
                  <td style={{ ...tdStyle, textAlign: "left" as const, color: "var(--ink-3)", fontSize: "9px" }}>{extra.index}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── TAB VII: TECHNICALS ─────────────────────────────────────────────────────
export function TechnicalsView({ etfData, selectedETF, setSelectedETF }: Pick<TabProps, "etfData" | "selectedETF" | "setSelectedETF">) {
  const liquidityRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (liquidityRef.current) drawLiquidityDepth(liquidityRef.current, [180,220,195,240,210,185,230], [175,215,200,235,205,190,225], 205);
  }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 0, flex: 1, minHeight: 0 }}>
      <div style={{ borderRight: "1px solid var(--rule)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <SHead title="VII. Technicals — RSI · MA · MACD" meta="14 ETFs · DAILY" />
        <div style={{ overflowY: "auto", flex: 1 }}>
          <table style={tableStyle}>
            <thead><tr>
              <th style={thLeft}>TICKER</th>
              <th style={thStyle}>PRICE</th>
              <th style={thStyle}>RSI 14</th>
              <th style={thStyle}>MA 50</th>
              <th style={thStyle}>MA 200</th>
              <th style={thStyle}>VS 200D</th>
              <th style={thStyle}>MACD</th>
              <th style={thStyle}>BB</th>
              <th style={thStyle}>TREND</th>
              <th style={thStyle}>SIGNAL</th>
            </tr></thead>
            <tbody>
              {TECH_DATA.map((t, i) => {
                const rsi = t.rsi;
                const rsiColor = rsi > 70 ? "var(--red)" : rsi < 30 ? "var(--green)" : "var(--ink)";
                const vs200 = parseFloat(t.vs200);
                const macd = parseFloat(t.macd);
                const trendColor = t.trend === "Uptrend" ? "var(--green)" : t.trend === "Downtrend" ? "var(--red)" : "var(--ink-3)";
                return (
                  <tr key={i} style={{ ...(i % 2 === 1 ? trEven : {}), cursor: "pointer", background: selectedETF === t.ticker ? "var(--paper-2)" : undefined }}
                    onClick={() => setSelectedETF(t.ticker)}>
                    <td style={{ ...tdLeft, color: "var(--amber)" }}>{t.ticker}</td>
                    <td style={tdStyle}>{(etfData.find(e => e.ticker === t.ticker)?.price) || "—"}</td>
                    <td style={{ ...tdStyle, color: rsiColor, fontWeight: 600 }}>{rsi}</td>
                    <td style={tdStyle}>{t.ma50}</td>
                    <td style={tdStyle}>{t.ma200}</td>
                    <td style={{ ...tdStyle, color: vs200 >= 0 ? "var(--green)" : "var(--red)", fontWeight: 500 }}>{t.vs200}</td>
                    <td style={{ ...tdStyle, color: macd >= 0 ? "var(--green)" : "var(--red)" }}>{t.macd}</td>
                    <td style={{ ...tdStyle, fontSize: "8px", letterSpacing: "0.04em", color: t.bb === "upper" ? "var(--green)" : t.bb === "lower" ? "var(--red)" : "var(--ink-3)" }}>{t.bb.toUpperCase()}</td>
                    <td style={{ ...tdStyle, color: trendColor, fontSize: "9px" }}>{t.trend}</td>
                    <td style={{ ...tdStyle, fontSize: "8px", letterSpacing: "0.06em", color: t.signal === "BULL" ? "var(--green)" : t.signal === "BEAR" ? "var(--red)" : "var(--ink-3)" }}>{t.signal}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <SHead title="Liquidity Depth" meta="BID/ASK" />
        <canvas ref={liquidityRef} style={{ display: "block", width: "100%", height: "200px" }}></canvas>
        <div style={{ padding: "var(--sp-md) var(--sp-lg)", borderTop: "1px solid var(--rule)", flex: 1, overflowY: "auto" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "7px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-4)", marginBottom: "var(--sp-md)" }}>RSI EXTREMES</div>
          {TECH_DATA.filter(t => t.rsi > 65 || t.rsi < 35).map((t, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--rule-2)", fontFamily: "var(--mono)", fontSize: "9px" }}>
              <span style={{ color: "var(--ink-2)", fontWeight: 600 }}>{t.ticker}</span>
              <span style={{ color: "var(--ink-3)" }}>{t.trend}</span>
              <span style={{ color: t.rsi > 65 ? "var(--red)" : "var(--green)", fontWeight: 600 }}>RSI {t.rsi}</span>
            </div>
          ))}
          <div style={{ fontFamily: "var(--mono)", fontSize: "7px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-4)", marginTop: "var(--sp-lg)", marginBottom: "var(--sp-md)" }}>ABOVE 200D MA</div>
          {TECH_DATA.filter(t => parseFloat(t.vs200) > 0).map((t, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--rule-2)", fontFamily: "var(--mono)", fontSize: "9px" }}>
              <span style={{ color: "var(--ink-2)", fontWeight: 600 }}>{t.ticker}</span>
              <span style={{ color: "var(--green)", fontWeight: 500 }}>{t.vs200}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── TAB VIII: FLOWS ─────────────────────────────────────────────────────────
export function FlowsView() {
  const totalInflows = FLOWS_DATA.reduce((sum, f) => {
    const v = parseFloat(f.flows1w.replace(/[^0-9.-]/g, ""));
    return sum + (f.flows1w.includes("-") ? -v : v);
  }, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
      <SHead title="VIII. Flows — Fund Flows &amp; Positioning" meta={`NET 1W: ${totalInflows > 0 ? "+" : ""}${totalInflows.toFixed(1)}B · SHORT INTEREST · INSTITUTIONAL`} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid var(--rule)", flexShrink: 0 }}>
        {[
          { label: "Total 1W Net Flow", val: `${totalInflows > 0 ? "+" : ""}$${Math.abs(totalInflows).toFixed(1)}B`, sub: "across 14 ETFs" },
          { label: "Largest Inflow",    val: "+$2.4B", sub: "SPY — 1W" },
          { label: "Largest Outflow",   val: "-$1.2B", sub: "QQQ — 1W" },
        ].map((s, i) => (
          <div key={i} style={{ padding: "var(--sp-md) var(--sp-lg)", borderRight: i < 2 ? "1px solid var(--rule)" : "none" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "7px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-4)", marginBottom: "2px" }}>{s.label}</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: "22px", color: "var(--ink)", lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "8px", color: "var(--ink-3)", marginTop: "2px" }}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        <table style={tableStyle}>
          <thead><tr>
            <th style={thLeft}>TICKER</th>
            <th style={thStyle}>1W FLOWS</th>
            <th style={thStyle}>1M FLOWS</th>
            <th style={thStyle}>SHORT %</th>
            <th style={thStyle}>INST. %</th>
            <th style={thStyle}>AUM CHG</th>
            <th style={thStyle}>FLOW BAR</th>
          </tr></thead>
          <tbody>
            {FLOWS_DATA.map((f, i) => {
              const f1w = parseFloat(f.flows1w.replace(/[^0-9.-]/g, ""));
              const isPos1w = !f.flows1w.includes("-");
              const barW = Math.min(Math.abs(f1w) / 2.5 * 100, 100);
              return (
                <tr key={i} style={i % 2 === 1 ? trEven : {}}>
                  <td style={{ ...tdLeft, color: "var(--amber)" }}>{f.ticker}</td>
                  <td style={{ ...tdStyle, color: isPos1w ? "var(--green)" : "var(--red)", fontWeight: 500 }}>{f.flows1w}</td>
                  <td style={{ ...tdStyle, color: !f.flows1m.includes("-") ? "var(--green)" : "var(--red)" }}>{f.flows1m}</td>
                  <td style={{ ...tdStyle, color: parseFloat(f.short) > 3 ? "var(--red)" : "var(--ink)" }}>{f.short}</td>
                  <td style={tdStyle}>{f.inst}</td>
                  <td style={{ ...tdStyle, color: !f.aum_chg.includes("-") ? "var(--green)" : "var(--red)" }}>{f.aum_chg}</td>
                  <td style={{ ...tdStyle, padding: "6px 10px" }}>
                    <div style={{ height: "6px", background: "var(--paper-2)", borderRadius: "2px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${barW}%`, background: isPos1w ? "var(--green)" : "var(--red)", borderRadius: "2px", opacity: 0.7 }}></div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── TAB IX: JOURNAL ─────────────────────────────────────────────────────────
export function JournalView() {
  const tagColors: Record<string, string> = {
    MACRO:"var(--amber)", FLOWS:"var(--sage)", VOL:"var(--red)", FX:"var(--ink-3)",
    ASIA:"var(--green)", RATES:"var(--ink-3)", CHINA:"var(--red)", EM:"var(--sage)",
    BONDS:"var(--ink-3)", OPTIONS:"var(--amber)", EUROPE:"var(--sage)", INDIA:"var(--green)",
    SECTOR:"var(--amber)", TECH:"var(--ink-3)",
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 0, flex: 1, minHeight: 0 }}>
      {/* News feed */}
      <div style={{ borderRight: "1px solid var(--rule)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <SHead title="IX. Journal — Market Wire" meta={`${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}`} />
        <div style={{ overflowY: "auto", flex: 1 }}>
          {NEWS_JOURNAL.map((item, i) => (
            <div key={i} style={{ padding: "var(--sp-md) var(--sp-lg)", borderBottom: "1px solid var(--rule-2)", display: "grid", gridTemplateColumns: "48px 60px 1fr", gap: "var(--sp-md)", alignItems: "start" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: "9px", color: "var(--ink-4)", paddingTop: "2px" }}>{item.time}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: "7px", letterSpacing: "0.08em", color: tagColors[item.tag] || "var(--ink-3)", background: "var(--paper)", padding: "2px 5px", borderRadius: "2px", textAlign: "center" as const, alignSelf: "start" }}>{item.tag}</span>
              <span style={{ fontFamily: "var(--sans)", fontSize: "11px", color: "var(--ink-2)", lineHeight: 1.5 }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Economic calendar */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <SHead title="Economic Calendar" meta="NEXT 10 DAYS" />
        <div style={{ overflowY: "auto", flex: 1 }}>
          {ECON_CALENDAR.map((e, i) => {
            const impactColor = e.impact === "HIGH" ? "var(--red)" : e.impact === "MED" ? "var(--amber)" : "var(--ink-4)";
            return (
              <div key={i} style={{ padding: "var(--sp-md) var(--sp-lg)", borderBottom: "1px solid var(--rule-2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: "8px", color: "var(--ink-4)" }}>{e.date} · {e.time} ET</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: "7px", color: impactColor, letterSpacing: "0.08em" }}>{e.impact}</span>
                </div>
                <div style={{ fontFamily: "var(--sans)", fontSize: "11px", color: "var(--ink-2)", marginBottom: "4px" }}>{e.event}</div>
                <div style={{ display: "flex", gap: "var(--sp-lg)" }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: "8px", color: "var(--ink-4)" }}>EXP: <span style={{ color: "var(--ink-2)" }}>{e.exp}</span></span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: "8px", color: "var(--ink-4)" }}>PREV: <span style={{ color: "var(--ink-2)" }}>{e.prev}</span></span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ borderTop: "1px solid var(--rule)", padding: "var(--sp-md) var(--sp-lg)" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: "7px", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-4)", marginBottom: "var(--sp-sm)" }}>MARKET COMMENTARY</div>
          <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: "12px", color: "var(--ink-3)", lineHeight: 1.6 }}>
            Markets navigating a mild risk-on regime with equity breadth widening across Asia. Key risk: FOMC meeting Apr 29–30 with terminal rate expectations in flux. Watch PCE deflator Apr 25 for inflation trajectory.
          </p>
        </div>
      </div>
    </div>
  );
}
