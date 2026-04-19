/**
 * Chart utility functions for rendering all Observatory visualizations
 * Aesop Warm Minimal design system — cream, ink, amber, sage, taupe palette
 * All charts support HiDPI / Retina via setupHiDPI helper
 */

// ─── Aesop Palette ────────────────────────────────────────────────────────────
const C = {
  cream:    "#F6F1EB",
  paper:    "#EDE7DC",
  offwhite: "#E8E2D6",
  ink:      "#1A1916",
  ink2:     "#2E2C26",
  taupe:    "#8C7F6E",
  amber:    "#B5864A",
  sage:     "#6B7B6E",
  rule:     "#D9D0C2",
  rule2:    "#C8C0B0",
  pos:      "#3A5C2A",   // deep forest green
  neg:      "#7A2E1A",   // deep terra red
  posLight: "rgba(58,92,42,0.12)",
  negLight: "rgba(122,46,26,0.12)",
  grid:     "rgba(217,208,194,0.6)",
};

// ─── HiDPI Setup ──────────────────────────────────────────────────────────────
export function setupHiDPI(canvas: HTMLCanvasElement, w: number, h: number) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width  = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  return { ctx, w, h, dpr };
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface RadarData {
  growth: number;
  inflation: number;
  rates: number;
  credit: number;
  usd: number;
  oil: number;
}

export interface CountryNode {
  code: string;
  name: string;
  lat: number;
  lng: number;
  change: number;
}

export interface ExchangeMarker {
  code: string;
  hour: number;
  isOpen: boolean;
}

// ─── Radar Chart ──────────────────────────────────────────────────────────────
export function drawRadarChart(
  canvas: HTMLCanvasElement,
  currentData: RadarData,
  priorData: RadarData
) {
  const W = 340, H = 300;
  const { ctx, w, h } = setupHiDPI(canvas, W, H);
  const cx = w / 2, cy = h / 2 - 10;
  const radius = Math.min(w, h) / 2 - 52;

  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, w, h);

  const axes = ["GROWTH", "INFLATION", "RATES", "CREDIT", "USD", "OIL"];
  const slice = (Math.PI * 2) / axes.length;

  // Grid rings
  for (let i = 1; i <= 5; i++) {
    const r = (radius / 5) * i;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = i === 5 ? C.rule2 : C.grid;
    ctx.lineWidth = i === 5 ? 1 : 0.5;
    ctx.stroke();
  }

  // Axis spokes
  axes.forEach((label, i) => {
    const angle = slice * i - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.strokeStyle = C.rule2;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Labels
    const lx = cx + (radius + 22) * Math.cos(angle);
    const ly = cy + (radius + 22) * Math.sin(angle);
    ctx.fillStyle = C.taupe;
    ctx.font = "500 9px 'DM Sans', Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, lx, ly);
  });

  const drawPolygon = (values: number[], color: string, fill: string, dash: number[]) => {
    ctx.beginPath();
    ctx.setLineDash(dash);
    values.forEach((v, i) => {
      const angle = slice * i - Math.PI / 2;
      const r = (radius / 5) * Math.max(0, Math.min(5, (v + 1) * 2.5));
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const priorVals = [priorData.growth, priorData.inflation, priorData.rates, priorData.credit, priorData.usd, priorData.oil];
  const currVals  = [currentData.growth, currentData.inflation, currentData.rates, currentData.credit, currentData.usd, currentData.oil];

  drawPolygon(priorVals, C.taupe, "rgba(140,127,110,0.08)", [4, 3]);
  drawPolygon(currVals, C.pos, C.posLight, []);

  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fillStyle = C.amber;
  ctx.fill();

  // Legend
  ctx.font = "9px 'DM Sans', Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const ly = h - 14;
  ctx.strokeStyle = C.pos; ctx.lineWidth = 1.5; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(16, ly); ctx.lineTo(32, ly); ctx.stroke();
  ctx.fillStyle = C.taupe; ctx.fillText("current 60d", 36, ly);
  ctx.strokeStyle = C.taupe; ctx.setLineDash([4,3]);
  ctx.beginPath(); ctx.moveTo(110, ly); ctx.lineTo(126, ly); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillText("prior 60d", 130, ly);
}

// ─── Equirectangular Map ──────────────────────────────────────────────────────
export function drawEquirectangularMap(
  canvas: HTMLCanvasElement,
  nodes: CountryNode[]
) {
  const W = 700, H = 320;
  const { ctx, w, h } = setupHiDPI(canvas, W, H);

  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = C.grid;
  ctx.lineWidth = 0.5;
  for (let lat = -60; lat <= 80; lat += 30) {
    const y = ((90 - lat) / 180) * h;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  for (let lng = -180; lng <= 180; lng += 60) {
    const x = ((lng + 180) / 360) * w;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }

  // Continent outlines (simplified polygons)
  const continents: [number, number][][] = [
    // North America
    [[-125,48],[-70,48],[-65,44],[-60,46],[-55,47],[-52,47],[-66,44],[-80,25],[-87,15],[-90,15],[-105,20],[-117,32],[-125,38],[-125,48]],
    // South America
    [[-80,10],[-60,12],[-50,5],[-35,-5],[-35,-20],[-50,-35],[-65,-55],[-70,-55],[-75,-50],[-80,-35],[-80,-20],[-75,-10],[-80,10]],
    // Europe
    [[-10,36],[30,36],[30,45],[40,42],[42,42],[40,38],[28,36],[36,37],[36,42],[42,42],[40,48],[30,55],[25,60],[20,63],[15,65],[10,63],[5,60],[-5,58],[-10,52],[-8,44],[-10,36]],
    // Africa
    [[-18,15],[50,15],[50,10],[42,10],[42,0],[40,-10],[35,-25],[25,-35],[18,-35],[12,-25],[10,-10],[8,5],[0,5],[-18,15]],
    // Asia
    [[25,40],[180,40],[180,70],[140,70],[130,60],[120,55],[100,50],[80,45],[70,40],[60,25],[55,20],[50,15],[40,15],[30,15],[25,40]],
    // Australia
    [[115,-20],[155,-20],[155,-40],[145,-45],[135,-40],[125,-35],[115,-30],[115,-20]],
  ];

  ctx.fillStyle = "rgba(140,127,110,0.12)";
  ctx.strokeStyle = C.rule2;
  ctx.lineWidth = 0.8;

  continents.forEach(poly => {
    ctx.beginPath();
    poly.forEach(([lng, lat], i) => {
      const x = ((lng + 180) / 360) * w;
      const y = ((90 - lat) / 180) * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  // Country nodes
  nodes.forEach(node => {
    const x = ((node.lng + 180) / 360) * w;
    const y = ((90 - node.lat) / 180) * h;
    const isPos = node.change >= 0;

    // Outer ring
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fillStyle = isPos ? "rgba(58,92,42,0.15)" : "rgba(122,46,26,0.15)";
    ctx.fill();

    // Inner dot
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = isPos ? C.pos : C.neg;
    ctx.fill();

    // Label
    const sign = node.change >= 0 ? "+" : "";
    const label = `${node.code} ${sign}${node.change.toFixed(2)}%`;
    ctx.font = "bold 8px 'JetBrains Mono', monospace";
    ctx.textAlign = x > w * 0.75 ? "right" : "left";
    ctx.textBaseline = "middle";
    const lx = x > w * 0.75 ? x - 12 : x + 12;
    // Background pill
    const tw = ctx.measureText(label).width;
    const pill = { x: lx - (x > w * 0.75 ? tw : 0) - 3, y: y - 7, w: tw + 6, h: 14 };
    ctx.fillStyle = "rgba(246,241,235,0.88)";
    ctx.beginPath();
    ctx.roundRect(pill.x, pill.y, pill.w, pill.h, 2);
    ctx.fill();
    ctx.fillStyle = isPos ? C.pos : C.neg;
    ctx.fillText(label, lx, y);
  });

  // Legend
  ctx.font = "9px 'DM Sans', Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const ly = h - 12;
  ctx.beginPath(); ctx.arc(16, ly, 4, 0, Math.PI * 2);
  ctx.fillStyle = C.pos; ctx.fill();
  ctx.fillStyle = C.taupe; ctx.fillText("Advance", 24, ly);
  ctx.beginPath(); ctx.arc(82, ly, 4, 0, Math.PI * 2);
  ctx.fillStyle = C.neg; ctx.fill();
  ctx.fillStyle = C.taupe; ctx.fillText("Decline", 90, ly);
  ctx.beginPath(); ctx.arc(148, ly, 4, 0, Math.PI * 2);
  ctx.fillStyle = C.taupe; ctx.fill();
  ctx.fillText("Neutral", 156, ly);
}

// ─── Exchange Orbit ───────────────────────────────────────────────────────────
export function drawExchangeOrbit(
  canvas: HTMLCanvasElement,
  markers: ExchangeMarker[]
) {
  const W = 320, H = 280;
  const { ctx, w, h } = setupHiDPI(canvas, W, H);
  const cx = w / 2, cy = h / 2;
  const r = Math.min(w, h) / 2 - 48;

  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, w, h);

  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, r + 16, 0, Math.PI * 2);
  ctx.strokeStyle = C.rule;
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Inner ring
  ctx.beginPath();
  ctx.arc(cx, cy, r - 16, 0, Math.PI * 2);
  ctx.strokeStyle = C.grid;
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Hour ticks
  for (let h24 = 0; h24 < 24; h24++) {
    const angle = (h24 / 24) * Math.PI * 2 - Math.PI / 2;
    const inner = r - 8;
    const outer = r + 8;
    ctx.beginPath();
    ctx.moveTo(cx + inner * Math.cos(angle), cy + inner * Math.sin(angle));
    ctx.lineTo(cx + outer * Math.cos(angle), cy + outer * Math.sin(angle));
    ctx.strokeStyle = h24 % 6 === 0 ? C.rule2 : C.grid;
    ctx.lineWidth = h24 % 6 === 0 ? 1 : 0.5;
    ctx.stroke();

    if (h24 % 6 === 0) {
      const lx = cx + (r + 26) * Math.cos(angle);
      const ly = cy + (r + 26) * Math.sin(angle);
      ctx.fillStyle = C.taupe;
      ctx.font = "9px 'DM Sans', Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${h24}Z`, lx, ly);
    }
  }

  // Current time hand
  const now = new Date();
  const utcHour = now.getUTCHours() + now.getUTCMinutes() / 60;
  const timeAngle = (utcHour / 24) * Math.PI * 2 - Math.PI / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + (r - 20) * Math.cos(timeAngle), cy + (r - 20) * Math.sin(timeAngle));
  ctx.strokeStyle = C.amber;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Exchange markers
  markers.forEach(m => {
    const angle = (m.hour / 24) * Math.PI * 2 - Math.PI / 2;
    const mx = cx + r * Math.cos(angle);
    const my = cy + r * Math.sin(angle);

    ctx.beginPath();
    ctx.arc(mx, my, 6, 0, Math.PI * 2);
    ctx.fillStyle = m.isOpen ? C.pos : C.taupe;
    ctx.fill();
    ctx.strokeStyle = C.cream;
    ctx.lineWidth = 1;
    ctx.stroke();

    const lx = cx + (r + 22) * Math.cos(angle);
    const ly = cy + (r + 22) * Math.sin(angle);
    ctx.fillStyle = m.isOpen ? C.ink : C.taupe;
    ctx.font = `${m.isOpen ? "600" : "400"} 9px 'DM Sans', Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(m.code, lx, ly);
  });

  // Center label
  ctx.fillStyle = C.ink2;
  ctx.font = "bold 13px 'Cormorant Garamond', Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("EARTH", cx, cy - 6);
  ctx.fillStyle = C.taupe;
  ctx.font = "9px 'DM Sans', Inter, sans-serif";
  ctx.fillText("24H UTC", cx, cy + 8);
}

// ─── Volatility Moon ─────────────────────────────────────────────────────────
export function drawVolatilityMoon(
  canvas: HTMLCanvasElement,
  vix: number,
  move: number,
  dxy: number,
  phase: string
) {
  const W = 320, H = 280;
  const { ctx, w, h } = setupHiDPI(canvas, W, H);
  const cx = w / 2, cy = h / 2 - 20;
  const r = Math.min(w, h) / 2 - 56;

  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, w, h);

  // Moon shadow
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(140,127,110,0.15)";
  ctx.fill();

  // Moon body
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = C.offwhite;
  ctx.fill();
  ctx.strokeStyle = C.rule2;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Phase shadow
  const phaseVal = getPhaseValue(phase);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const shadowX = cx + (phaseVal - 0.5) * r * 2;
  ctx.beginPath();
  ctx.arc(shadowX, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(44,41,36,0.55)";
  ctx.fill();
  ctx.restore();

  // Moon outline again
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = C.rule2;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Phase label
  ctx.fillStyle = C.taupe;
  ctx.font = "italic 10px 'Cormorant Garamond', Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(phase, cx, cy + r + 16);

  // Stats row
  const stats = [
    { label: "VIX", value: vix.toFixed(1) },
    { label: "MOVE", value: move.toFixed(0) },
    { label: "DXY σ", value: dxy.toFixed(2) },
  ];
  const statY = h - 32;
  stats.forEach((s, i) => {
    const sx = (i + 0.5) * (w / 3);
    ctx.fillStyle = C.taupe;
    ctx.font = "9px 'DM Sans', Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s.label, sx, statY);
    ctx.fillStyle = C.ink;
    ctx.font = "bold 14px 'JetBrains Mono', monospace";
    ctx.fillText(s.value, sx, statY + 16);
  });
}

function getPhaseValue(phase: string): number {
  const phases: Record<string, number> = {
    "new moon": 0, "waxing crescent": 0.125, "first qtr": 0.25,
    "waxing gibbous": 0.375, "full moon": 0.5, "waning gibbous": 0.625,
    "last qtr": 0.75, "waning crescent": 0.875,
  };
  return phases[phase.toLowerCase()] ?? 0.5;
}

// ─── Sector Rose ──────────────────────────────────────────────────────────────
export function drawSectorRose(
  canvas: HTMLCanvasElement,
  sectors: Array<{ name: string; value: number }>
) {
  const W = 320, H = 280;
  const { ctx, w, h } = setupHiDPI(canvas, W, H);
  const cx = w / 2, cy = h / 2;
  const r = Math.min(w, h) / 2 - 44;

  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, w, h);

  const maxVal = Math.max(...sectors.map(s => Math.abs(s.value)), 0.01);
  const slice = (Math.PI * 2) / sectors.length;

  // Grid rings
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, (r / 4) * i, 0, Math.PI * 2);
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  sectors.forEach((s, i) => {
    const startAngle = slice * i - Math.PI / 2;
    const endAngle   = slice * (i + 1) - Math.PI / 2;
    const sr = (Math.abs(s.value) / maxVal) * r;
    const isPos = s.value >= 0;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, sr, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = isPos ? "rgba(58,92,42,0.65)" : "rgba(122,46,26,0.65)";
    ctx.fill();
    ctx.strokeStyle = isPos ? C.pos : C.neg;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Label
    const midAngle = (startAngle + endAngle) / 2;
    const lx = cx + (r + 20) * Math.cos(midAngle);
    const ly = cy + (r + 20) * Math.sin(midAngle);
    ctx.fillStyle = C.taupe;
    ctx.font = "bold 8px 'DM Sans', Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s.name, lx, ly);
  });

  // Center
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = C.amber;
  ctx.fill();
}

// ─── Chladni Plate ────────────────────────────────────────────────────────────
export function drawChladniPlate(
  canvas: HTMLCanvasElement,
  etfNodes: Array<{ ticker: string; x: number; y: number; change: number }>
) {
  const W = 320, H = 280;
  const { ctx, w, h } = setupHiDPI(canvas, W, H);

  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, w, h);

  // Chladni pattern — draw in Aesop palette
  const imageData = ctx.createImageData(w, h);
  const data = imageData.data;
  for (let i = 0; i < w; i++) {
    for (let j = 0; j < h; j++) {
      const x = (i / w) * 4 - 2;
      const y = (j / h) * 4 - 2;
      const v = Math.sin(x * Math.PI) * Math.sin(y * Math.PI)
              + 0.5 * Math.sin(2 * x * Math.PI) * Math.sin(2 * y * Math.PI);
      const t = Math.abs(v);
      const idx = (j * w + i) * 4;
      // Cream base with ink nodal lines
      const base = 240 - t * 60;
      data[idx]   = Math.round(base * 0.97);
      data[idx+1] = Math.round(base * 0.94);
      data[idx+2] = Math.round(base * 0.88);
      data[idx+3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  // ETF nodes
  etfNodes.forEach(node => {
    const nx = (node.x / 100) * w;
    const ny = (node.y / 100) * h;
    const isPos = node.change >= 0;

    ctx.beginPath();
    ctx.arc(nx, ny, 7, 0, Math.PI * 2);
    ctx.fillStyle = isPos ? C.pos : C.neg;
    ctx.fill();
    ctx.strokeStyle = C.cream;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = C.cream;
    ctx.font = "bold 7px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(node.ticker, nx, ny);
  });

  // Border
  ctx.strokeStyle = C.rule;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
}

// ─── Liquidity Depth ──────────────────────────────────────────────────────────
export function drawLiquidityDepth(
  canvas: HTMLCanvasElement,
  bids: number[],
  asks: number[],
  mid: number
) {
  const W = 320, H = 240;
  const { ctx, w, h } = setupHiDPI(canvas, W, H);
  const pad = { t: 20, r: 20, b: 36, l: 36 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;

  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, w, h);

  const allVals = [...bids, ...asks].filter(v => v > 0);
  const maxDepth = allVals.length > 0 ? Math.max(...allVals) : 1;
  const barW = cw / (bids.length + asks.length);

  // Bids
  bids.forEach((depth, i) => {
    const bh = (depth / maxDepth) * ch;
    const bx = pad.l + i * barW;
    const by = pad.t + ch - bh;
    ctx.fillStyle = "rgba(58,92,42,0.7)";
    ctx.fillRect(bx + 1, by, barW - 2, bh);
  });

  // Asks
  asks.forEach((depth, i) => {
    const bh = (depth / maxDepth) * ch;
    const bx = pad.l + (bids.length + i) * barW;
    const by = pad.t + ch - bh;
    ctx.fillStyle = "rgba(122,46,26,0.7)";
    ctx.fillRect(bx + 1, by, barW - 2, bh);
  });

  // Mid line
  if (mid > 0) {
    const midY = pad.t + ch - (mid / maxDepth) * ch;
    ctx.beginPath();
    ctx.moveTo(pad.l, midY);
    ctx.lineTo(w - pad.r, midY);
    ctx.strokeStyle = C.amber;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Axes
  ctx.strokeStyle = C.rule2;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t + ch);
  ctx.lineTo(w - pad.r, pad.t + ch);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, pad.t + ch);
  ctx.stroke();

  // Divider
  const midX = pad.l + bids.length * barW;
  ctx.beginPath();
  ctx.moveTo(midX, pad.t);
  ctx.lineTo(midX, pad.t + ch);
  ctx.strokeStyle = C.rule;
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Labels
  ctx.fillStyle = C.taupe;
  ctx.font = "9px 'DM Sans', Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("BIDS", pad.l + (bids.length * barW) / 2, pad.t + ch + 8);
  ctx.fillText("ASKS", pad.l + bids.length * barW + (asks.length * barW) / 2, pad.t + ch + 8);
}

// ─── Volatility Curve ─────────────────────────────────────────────────────────
export function drawVolatilityCurve(
  canvas: HTMLCanvasElement,
  current: number[],
  prior: number[]
) {
  const W = 320, H = 240;
  const { ctx, w, h } = setupHiDPI(canvas, W, H);
  const pad = { t: 20, r: 20, b: 36, l: 40 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;

  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, w, h);

  const allVals = [...current, ...prior].filter(v => v > 0);
  const maxVol = allVals.length > 0 ? Math.max(...allVals) * 1.15 : 30;
  const terms = ["1M", "3M", "6M", "12M", "18M", "24M"];
  const spacing = cw / (terms.length - 1);

  // Grid
  for (let i = 0; i <= 4; i++) {
    const gy = pad.t + (ch / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.l, gy);
    ctx.lineTo(w - pad.r, gy);
    ctx.strokeStyle = C.grid;
    ctx.lineWidth = 0.5;
    ctx.stroke();
    const val = maxVol - (maxVol / 4) * i;
    ctx.fillStyle = C.taupe;
    ctx.font = "8px 'DM Sans', Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(val.toFixed(0) + "%", pad.l - 6, gy);
  }

  const drawLine = (vals: number[], color: string, dash: number[], lw: number) => {
    if (vals.length < 2) return;
    ctx.beginPath();
    ctx.setLineDash(dash);
    vals.forEach((v, i) => {
      const x = pad.l + i * spacing;
      const y = pad.t + ch - (v / maxVol) * ch;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.setLineDash([]);
  };

  drawLine(prior,   C.taupe, [4, 3], 1);
  drawLine(current, C.pos,   [],     2);

  // Dots on current
  current.forEach((v, i) => {
    const x = pad.l + i * spacing;
    const y = pad.t + ch - (v / maxVol) * ch;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = C.pos;
    ctx.fill();
  });

  // Axes
  ctx.strokeStyle = C.rule2;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t + ch);
  ctx.lineTo(w - pad.r, pad.t + ch);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, pad.t + ch);
  ctx.stroke();

  // Term labels
  ctx.fillStyle = C.taupe;
  ctx.font = "9px 'DM Sans', Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  terms.forEach((t, i) => {
    ctx.fillText(t, pad.l + i * spacing, pad.t + ch + 8);
  });

  // Legend
  const ly = h - 10;
  ctx.strokeStyle = C.pos; ctx.lineWidth = 2; ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(pad.l, ly); ctx.lineTo(pad.l + 18, ly); ctx.stroke();
  ctx.fillStyle = C.taupe; ctx.font = "8px 'DM Sans', Inter, sans-serif";
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText("current", pad.l + 22, ly);
  ctx.strokeStyle = C.taupe; ctx.lineWidth = 1; ctx.setLineDash([4,3]);
  ctx.beginPath(); ctx.moveTo(pad.l + 72, ly); ctx.lineTo(pad.l + 90, ly); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillText("prior", pad.l + 94, ly);
}

// ─── Correlation Heatmap ──────────────────────────────────────────────────────
export function drawCorrelationHeatmap(
  canvas: HTMLCanvasElement,
  correlationMatrix: number[][]
) {
  const W = 420, H = 380;
  const { ctx, w, h } = setupHiDPI(canvas, W, H);
  const tickers = ["SPY","QQQ","IWM","ACWI","EFA","EEM","EWJ","MCHI","INDA","EWZ","EWG","EWU","TLT","GLD"];
  const n = tickers.length;
  const padL = 48, padT = 48, padR = 16, padB = 32;
  const cellW = (w - padL - padR) / n;
  const cellH = (h - padT - padB) / n;

  ctx.fillStyle = C.cream;
  ctx.fillRect(0, 0, w, h);

  // Cells
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const corr = correlationMatrix[i]?.[j] ?? (i === j ? 1 : 0);
      const x = padL + j * cellW;
      const y = padT + i * cellH;

      // Aesop palette: amber-tinted warm scale
      let color: string;
      if (i === j) {
        color = C.amber; // diagonal
      } else if (corr > 0) {
        // Positive: cream → sage/forest
        const t = Math.min(corr, 1);
        const r = Math.round(246 - t * 120);
        const g = Math.round(241 - t * 100);
        const b = Math.round(235 - t * 150);
        color = `rgb(${r},${g},${b})`;
      } else {
        // Negative: cream → terra red
        const t = Math.min(Math.abs(corr), 1);
        const r = Math.round(246 - t * 60);
        const g = Math.round(241 - t * 150);
        const b = Math.round(235 - t * 180);
        color = `rgb(${r},${g},${b})`;
      }

      ctx.fillStyle = color;
      ctx.fillRect(x, y, cellW, cellH);

      // Cell border
      ctx.strokeStyle = C.cream;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, cellW, cellH);

      // Value text for larger cells
      if (cellW > 20 && i !== j) {
        ctx.fillStyle = Math.abs(corr) > 0.5 ? C.cream : C.taupe;
        ctx.font = "7px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(corr.toFixed(2), x + cellW / 2, y + cellH / 2);
      }
    }
  }

  // Row labels
  ctx.fillStyle = C.taupe;
  ctx.font = "bold 8px 'JetBrains Mono', monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  tickers.forEach((t, i) => {
    ctx.fillText(t, padL - 6, padT + i * cellH + cellH / 2);
  });

  // Column labels (rotated)
  ctx.font = "bold 8px 'JetBrains Mono', monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  tickers.forEach((t, j) => {
    const x = padL + j * cellW + cellW / 2;
    ctx.save();
    ctx.translate(x, padT - 6);
    ctx.rotate(-Math.PI / 3);
    ctx.fillStyle = C.taupe;
    ctx.fillText(t, 0, 0);
    ctx.restore();
  });

  // Legend bar
  const legX = padL, legY = h - 20, legW = 120, legH = 8;
  for (let i = 0; i < legW; i++) {
    const t = i / legW;
    const corr = t * 2 - 1;
    let r, g, b;
    if (corr > 0) {
      r = Math.round(246 - corr * 120);
      g = Math.round(241 - corr * 100);
      b = Math.round(235 - corr * 150);
    } else {
      const a = Math.abs(corr);
      r = Math.round(246 - a * 60);
      g = Math.round(241 - a * 150);
      b = Math.round(235 - a * 180);
    }
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(legX + i, legY, 1, legH);
  }
  ctx.strokeStyle = C.rule;
  ctx.lineWidth = 0.5;
  ctx.strokeRect(legX, legY, legW, legH);

  ctx.fillStyle = C.taupe;
  ctx.font = "8px 'DM Sans', Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("−1.0", legX, legY + legH + 3);
  ctx.textAlign = "center";
  ctx.fillText("0", legX + legW / 2, legY + legH + 3);
  ctx.textAlign = "right";
  ctx.fillText("+1.0", legX + legW, legY + legH + 3);
  ctx.textAlign = "left";
  ctx.fillText("60D return correlation", legX + legW + 10, legY + legH / 2);
}
