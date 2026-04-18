/**
 * Chart utility functions for rendering all Observatory visualizations
 */

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
  hour: number; // 0-24
  isOpen: boolean;
}

// Draw radar chart on canvas
export function drawRadarChart(
  canvas: HTMLCanvasElement,
  currentData: RadarData,
  priorData: RadarData
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 40;

  ctx.fillStyle = "#EAE3D2";
  ctx.fillRect(0, 0, width, height);

  const axes = ["GROWTH", "INFLATION", "RATES", "CREDIT", "USD", "OIL"];
  const angleSlice = (Math.PI * 2) / axes.length;

  // Draw grid circles
  ctx.strokeStyle = "#D4CEC1";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 5; i++) {
    const r = (radius / 5) * i;
    ctx.beginPath();
    ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Draw axes
  ctx.strokeStyle = "#A89F92";
  ctx.lineWidth = 1;
  axes.forEach((_, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(x, y);
    ctx.stroke();

    // Draw axis labels
    ctx.fillStyle = "#4A4A4A";
    ctx.font = "11px Inter";
    ctx.textAlign = "center";
    ctx.fillText(axes[i], x * 1.15, y * 1.15);
  });

  // Draw current data polygon (solid)
  const currentValues = [
    currentData.growth,
    currentData.inflation,
    currentData.rates,
    currentData.credit,
    currentData.usd,
    currentData.oil,
  ];

  ctx.strokeStyle = "#2D5016";
  ctx.fillStyle = "rgba(45, 80, 22, 0.1)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  currentValues.forEach((value, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const r = (radius / 5) * Math.max(0, Math.min(5, value));
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Draw prior data polygon (dashed)
  const priorValues = [
    priorData.growth,
    priorData.inflation,
    priorData.rates,
    priorData.credit,
    priorData.usd,
    priorData.oil,
  ];

  ctx.strokeStyle = "#A89F92";
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  priorValues.forEach((value, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const r = (radius / 5) * Math.max(0, Math.min(5, value));
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
}

// Draw equirectangular map with country nodes
export function drawEquirectangularMap(
  canvas: HTMLCanvasElement,
  countries: CountryNode[]
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  // Background
  ctx.fillStyle = "#F5F3ED";
  ctx.fillRect(0, 0, width, height);

  // Draw simplified world map outline
  ctx.strokeStyle = "#D4CEC1";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#FAFAF8";

  // Draw country nodes
  countries.forEach((country) => {
    // Convert lat/lng to canvas coordinates (equirectangular projection)
    const x = ((country.lng + 180) / 360) * width;
    const y = ((90 - country.lat) / 180) * height;

    // Draw node
    const color = country.change >= 0 ? "#2D5016" : "#8B4513";
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();

    // Draw label
    ctx.fillStyle = "#4A4A4A";
    ctx.font = "10px Inter";
    ctx.textAlign = "center";
    ctx.fillText(country.code, x, y - 12);

    // Draw change percentage
    ctx.fillStyle = color;
    ctx.font = "bold 9px JetBrains Mono";
    ctx.fillText(
      (country.change >= 0 ? "+" : "") + country.change.toFixed(2) + "%",
      x,
      y + 14
    );
  });

  // Draw grid
  ctx.strokeStyle = "#E8E3D8";
  ctx.lineWidth = 0.5;
  for (let lat = -90; lat <= 90; lat += 30) {
    const y = ((90 - lat) / 180) * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  for (let lng = -180; lng <= 180; lng += 30) {
    const x = ((lng + 180) / 360) * width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
}

// Draw exchange orbit (24H UTC circular)
export function drawExchangeOrbit(
  canvas: HTMLCanvasElement,
  exchanges: ExchangeMarker[]
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 30;

  // Background
  ctx.fillStyle = "#EAE3D2";
  ctx.fillRect(0, 0, width, height);

  // Draw concentric circles
  ctx.strokeStyle = "#D4CEC1";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 3; i++) {
    const r = (radius / 3) * i;
    ctx.beginPath();
    ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Draw 24H markers
  ctx.strokeStyle = "#A89F92";
  ctx.lineWidth = 1;
  for (let hour = 0; hour < 24; hour += 6) {
    const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2;
    const x1 = centerX + (radius + 10) * Math.cos(angle);
    const y1 = centerY + (radius + 10) * Math.sin(angle);
    const x2 = centerX + (radius + 20) * Math.cos(angle);
    const y2 = centerY + (radius + 20) * Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Draw hour label
    ctx.fillStyle = "#4A4A4A";
    ctx.font = "10px Inter";
    ctx.textAlign = "center";
    ctx.fillText(hour + "Z", centerX + (radius + 35) * Math.cos(angle), centerY + (radius + 35) * Math.sin(angle));
  }

  // Draw exchanges
  exchanges.forEach((exchange) => {
    const angle = (exchange.hour / 24) * Math.PI * 2 - Math.PI / 2;
    const x = centerX + (radius * 0.7) * Math.cos(angle);
    const y = centerY + (radius * 0.7) * Math.sin(angle);

    // Draw marker
    const color = exchange.isOpen ? "#2D5016" : "#A89F92";
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();

    // Draw label
    ctx.fillStyle = color;
    ctx.font = "9px JetBrains Mono";
    ctx.textAlign = "center";
    ctx.fillText(exchange.code, x, y - 10);
  });

  // Draw center circle
  ctx.fillStyle = "#EAE3D2";
  ctx.strokeStyle = "#D4CEC1";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#4A4A4A";
  ctx.font = "bold 11px Inter";
  ctx.textAlign = "center";
  ctx.fillText("EARTH", centerX, centerY + 4);
}

// Draw volatility phase moon
export function drawVolatilityMoon(
  canvas: HTMLCanvasElement,
  vix: number,
  move: number,
  dxy: number,
  phase: string
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 30;

  // Background
  ctx.fillStyle = "#EAE3D2";
  ctx.fillRect(0, 0, width, height);

  // Draw moon
  ctx.fillStyle = "#F5F3ED";
  ctx.strokeStyle = "#4A4A4A";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Draw phase (simplified)
  const phaseValue = getPhaseValue(phase);
  ctx.fillStyle = "#8B7355";
  ctx.beginPath();
  if (phaseValue < 0.5) {
    // Waxing
    ctx.arc(centerX, centerY, radius, Math.PI / 2, (Math.PI * 3) / 2);
  } else {
    // Waning
    ctx.arc(centerX, centerY, radius, (Math.PI * 3) / 2, Math.PI / 2);
  }
  ctx.lineTo(centerX, centerY);
  ctx.fill();

  // Draw labels
  ctx.fillStyle = "#4A4A4A";
  ctx.font = "11px Inter";
  ctx.textAlign = "center";
  ctx.fillText("VIX", centerX - 40, centerY + 60);
  ctx.font = "bold 14px JetBrains Mono";
  ctx.fillText(vix.toFixed(1), centerX - 40, centerY + 80);

  ctx.font = "11px Inter";
  ctx.fillText("MOVE", centerX, centerY + 60);
  ctx.font = "bold 14px JetBrains Mono";
  ctx.fillText(move.toFixed(0), centerX, centerY + 80);

  ctx.font = "11px Inter";
  ctx.fillText("DXY σ", centerX + 40, centerY + 60);
  ctx.font = "bold 14px JetBrains Mono";
  ctx.fillText(dxy.toFixed(2), centerX + 40, centerY + 80);

  ctx.font = "10px Inter";
  ctx.fillStyle = "#A89F92";
  ctx.fillText(phase, centerX, centerY + 110);
}

function getPhaseValue(phase: string): number {
  const phases: Record<string, number> = {
    "new moon": 0,
    "waxing crescent": 0.125,
    "first qtr": 0.25,
    "waxing gibbous": 0.375,
    "full moon": 0.5,
    "waning gibbous": 0.625,
    "last qtr": 0.75,
    "waning crescent": 0.875,
  };
  return phases[phase.toLowerCase()] || 0.5;
}

// Draw sector rose (radial chart)
export function drawSectorRose(
  canvas: HTMLCanvasElement,
  sectors: Array<{ name: string; value: number }>
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 30;

  // Background
  ctx.fillStyle = "#EAE3D2";
  ctx.fillRect(0, 0, width, height);

  const sliceAngle = (Math.PI * 2) / sectors.length;

  sectors.forEach((sector, i) => {
    const angle = sliceAngle * i - Math.PI / 2;
    const nextAngle = sliceAngle * (i + 1) - Math.PI / 2;

    // Scale value to radius
    const maxValue = Math.max(...sectors.map((s) => Math.abs(s.value)));
    const sectorRadius = (Math.abs(sector.value) / maxValue) * radius;

    // Draw sector
    const color = sector.value >= 0 ? "#2D5016" : "#8B4513";
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, sectorRadius, angle, nextAngle);
    ctx.lineTo(centerX, centerY);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Draw label
    const labelAngle = (angle + nextAngle) / 2;
    const labelRadius = radius + 20;
    const labelX = centerX + labelRadius * Math.cos(labelAngle);
    const labelY = centerY + labelRadius * Math.sin(labelAngle);

    ctx.fillStyle = "#4A4A4A";
    ctx.font = "10px Inter";
    ctx.textAlign = "center";
    ctx.fillText(sector.name, labelX, labelY);
  });
}

// Draw Chladni correlation plate with ETF nodes
export function drawChladniPlate(
  canvas: HTMLCanvasElement,
  etfNodes: Array<{ ticker: string; x: number; y: number; change: number }>
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  // Draw correlation pattern background
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      const x = (i / width) * 4 - 2;
      const y = (j / height) * 4 - 2;

      // Chladni plate equation
      const value =
        Math.sin(x * Math.PI) * Math.sin(y * Math.PI) +
        0.5 * Math.sin(2 * x * Math.PI) * Math.sin(2 * y * Math.PI);

      const brightness = Math.abs(value) * 200 + 55;
      const idx = (j * width + i) * 4;

      data[idx] = brightness * 0.9;
      data[idx + 1] = brightness * 0.85;
      data[idx + 2] = brightness * 0.8;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Draw ETF nodes
  etfNodes.forEach((node) => {
    const x = (node.x / 100) * width;
    const y = (node.y / 100) * height;

    // Draw node circle
    const color = node.change >= 0 ? "#2D5016" : "#8B4513";
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Draw label background
    ctx.fillStyle = "rgba(234, 227, 210, 0.9)";
    ctx.fillRect(x - 25, y - 20, 50, 18);

    // Draw label
    ctx.fillStyle = "#4A4A4A";
    ctx.font = "bold 10px JetBrains Mono";
    ctx.textAlign = "center";
    ctx.fillText(node.ticker, x, y - 8);

    // Draw change
    ctx.fillStyle = color;
    ctx.font = "9px JetBrains Mono";
    ctx.fillText(
      (node.change >= 0 ? "+" : "") + node.change.toFixed(2) + "%",
      x,
      y + 6
    );
  });
}

// Draw liquidity depth cathedral
export function drawLiquidityDepth(
  canvas: HTMLCanvasElement,
  bids: number[],
  asks: number[],
  mid: number
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Background
  ctx.fillStyle = "#EAE3D2";
  ctx.fillRect(0, 0, width, height);

  const maxDepth = Math.max(...bids, ...asks);
  const barWidth = chartWidth / (bids.length + asks.length);

  // Draw bids (left side, blue)
  bids.forEach((depth, i) => {
    const x = padding + i * barWidth;
    const barHeight = (depth / maxDepth) * chartHeight;
    const y = height - padding - barHeight;

    ctx.fillStyle = "#2D5016";
    ctx.globalAlpha = 0.6;
    ctx.fillRect(x, y, barWidth * 0.9, barHeight);
    ctx.globalAlpha = 1;
  });

  // Draw asks (right side, red)
  asks.forEach((depth, i) => {
    const x = padding + (bids.length + i) * barWidth;
    const barHeight = (depth / maxDepth) * chartHeight;
    const y = height - padding - barHeight;

    ctx.fillStyle = "#8B4513";
    ctx.globalAlpha = 0.6;
    ctx.fillRect(x, y, barWidth * 0.9, barHeight);
    ctx.globalAlpha = 1;
  });

  // Draw mid-price line
  ctx.strokeStyle = "#4A4A4A";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  const midY = height - padding - (mid / maxDepth) * chartHeight;
  ctx.beginPath();
  ctx.moveTo(padding, midY);
  ctx.lineTo(width - padding, midY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw axes
  ctx.strokeStyle = "#A89F92";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  // Draw labels
  ctx.fillStyle = "#4A4A4A";
  ctx.font = "10px Inter";
  ctx.textAlign = "center";
  ctx.fillText("BIDS", padding + chartWidth / 4, height - 10);
  ctx.fillText("ASKS", width - padding - chartWidth / 4, height - 10);
}

// Draw volatility term structure curve
export function drawVolatilityCurve(
  canvas: HTMLCanvasElement,
  current: number[],
  prior: number[]
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Background
  ctx.fillStyle = "#EAE3D2";
  ctx.fillRect(0, 0, width, height);

  const maxVol = Math.max(...current, ...prior);
  const terms = ["1M", "3M", "6M", "12M", "18M", "24M"];
  const spacing = chartWidth / (terms.length - 1);

  // Draw grid
  ctx.strokeStyle = "#E8E3D8";
  ctx.lineWidth = 1;
  for (let i = 0; i < terms.length; i++) {
    const x = padding + i * spacing;
    ctx.beginPath();
    ctx.moveTo(x, padding);
    ctx.lineTo(x, height - padding);
    ctx.stroke();
  }

  // Draw current curve (solid)
  ctx.strokeStyle = "#2D5016";
  ctx.lineWidth = 2;
  ctx.beginPath();
  current.forEach((vol, i) => {
    const x = padding + i * spacing;
    const y = height - padding - (vol / maxVol) * chartHeight;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Draw prior curve (dashed)
  ctx.strokeStyle = "#A89F92";
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  prior.forEach((vol, i) => {
    const x = padding + i * spacing;
    const y = height - padding - (vol / maxVol) * chartHeight;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw axes
  ctx.strokeStyle = "#A89F92";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.stroke();

  // Draw term labels
  ctx.fillStyle = "#4A4A4A";
  ctx.font = "10px Inter";
  ctx.textAlign = "center";
  terms.forEach((term, i) => {
    const x = padding + i * spacing;
    ctx.fillText(term, x, height - 10);
  });

  // Draw vol labels
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const vol = (maxVol / 4) * i;
    const y = height - padding - (vol / maxVol) * chartHeight;
    ctx.fillText(vol.toFixed(0) + "%", padding - 10, y + 4);
  }
}
