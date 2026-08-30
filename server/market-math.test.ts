import { describe, it, expect } from "vitest";
import {
  pearson,
  correlationMatrix,
  dailyReturns,
  calculateRSI,
  isDevelopedRegion,
  isEmergingRegion,
  vixPhase,
  radarFromMarket,
  strongestLinks,
  axisFromPct,
  parsePct,
} from "@shared/market-math";

describe("market-math", () => {
  it("returns 1 for identical series", () => {
    const a = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(pearson(a, a)).toBeCloseTo(1, 5);
  });

  it("returns -1 for perfectly inverted series", () => {
    const a = [1, 2, 3, 4, 5, 6, 7, 8];
    const b = a.map((v) => -v);
    expect(pearson(a, b)).toBeCloseTo(-1, 5);
  });

  it("builds a symmetric correlation matrix with 1s on the diagonal", () => {
    const series = [
      [0.01, 0.02, -0.01, 0.00, 0.03, 0.01],
      [0.02, 0.01, -0.02, 0.01, 0.02, 0.00],
      [-0.01, -0.02, 0.01, 0.00, -0.01, -0.02],
    ];
    const m = correlationMatrix(series);
    expect(m.length).toBe(3);
    expect(m[0][0]).toBe(1);
    expect(m[1][1]).toBe(1);
    expect(m[0][1]).toBeCloseTo(m[1][0], 8);
  });

  it("computes daily returns from closes", () => {
    expect(dailyReturns([100, 110, 99])).toEqual([0.1, -0.1]);
  });

  it("computes RSI in 0–100", () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 + i);
    const rsi = calculateRSI(closes);
    expect(rsi).toBeGreaterThanOrEqual(50);
    expect(rsi).toBeLessThanOrEqual(100);
  });

  it("classifies DM/EM region labels from either stored form", () => {
    expect(isDevelopedRegion("DM")).toBe(true);
    expect(isDevelopedRegion("developed")).toBe(true);
    expect(isDevelopedRegion("EM")).toBe(false);
    expect(isEmergingRegion("EM")).toBe(true);
    expect(isEmergingRegion("emerging")).toBe(true);
    expect(isEmergingRegion("DM")).toBe(false);
  });

  it("maps VIX to a moon phase without randomness", () => {
    expect(vixPhase(10)).toBe("new moon");
    expect(vixPhase(16)).toBe("first qtr");
    expect(vixPhase(30)).toBe("waning gibbous");
  });

  it("derives radar axes from live percent moves, not random numbers", () => {
    const radar = radarFromMarket({
      equityD1: [1.2, 0.8, 1.0],
      tltD1: -0.4,
      gldD1: 0.3,
      dxyD1: -0.2,
      energyD1: 2.0,
    });
    expect(radar.growth).toBeGreaterThan(0);
    expect(radar.oil).toBeGreaterThan(0);
    expect(radar.usd).toBeLessThan(0);
    expect(radar.growth).toBe(axisFromPct(1.0, 1.5));
  });

  it("ranks strongest correlation links from the live matrix", () => {
    const tickers = ["SPY", "QQQ", "TLT"];
    const matrix = [
      [1, 0.96, -0.2],
      [0.96, 1, -0.18],
      [-0.2, -0.18, 1],
    ];
    const links = strongestLinks(tickers, matrix, 2);
    expect(links[0]).toEqual({ a: "SPY", b: "QQQ", r: 0.96 });
  });

  it("parses percent strings without NaN", () => {
    expect(parsePct("+1.25")).toBe(1.25);
    expect(parsePct("n/a")).toBe(0);
    expect(parsePct(null)).toBe(0);
  });
});
