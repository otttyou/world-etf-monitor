import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock context for testing
function createMockContext(): TrpcContext {
  const user = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "test",
    role: "user" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Market Data Procedures", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    const ctx = createMockContext();
    caller = appRouter.createCaller(ctx);
  });

  describe("ETF Prices", () => {
    it("should return ETF prices array", async () => {
      const result = await caller.market.etfPrices();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should return live Yahoo tickers, not hardcoded placeholders", async () => {
      const result = await caller.market.etfPrices();
      expect(result.length).toBeGreaterThan(0);
      const spy = result.find((e) => e.ticker === "SPY");
      expect(spy).toBeTruthy();
      const price = parseFloat(spy!.price || "");
      expect(Number.isFinite(price)).toBe(true);
      expect(spy!.price).not.toBe("548.21");
    });

    it("should have required fields in ETF data", async () => {
      const result = await caller.market.etfPrices();
      if (result.length > 0) {
        const etf = result[0];
        expect(etf).toHaveProperty("ticker");
        expect(etf).toHaveProperty("price");
        expect(etf).toHaveProperty("d1");
      }
    });

    it("should handle refresh ETF data mutation", async () => {
      const result = await caller.market.refreshETFData();
      expect(result).toEqual({ success: true });
    });
  });

  describe("Regional Indices", () => {
    it("should return regional indices array", async () => {
      const result = await caller.market.regionalIndices();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should have required fields in regional data", async () => {
      const result = await caller.market.regionalIndices();
      if (result.length > 0) {
        const region = result[0];
        expect(region).toHaveProperty("code");
        expect(region).toHaveProperty("name");
        expect(region).toHaveProperty("region");
        expect(["DM", "EM", "developed", "emerging"]).toContain(region.region);
      }
    });

    it("should handle refresh regional data mutation", async () => {
      const result = await caller.market.refreshRegionalData();
      expect(result).toEqual({ success: true });
    });
  });

  describe("FX Rates", () => {
    it("should return FX rates array", async () => {
      const result = await caller.market.fxRates();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should have required fields in FX data", async () => {
      const result = await caller.market.fxRates();
      if (result.length > 0) {
        const fx = result[0];
        expect(fx).toHaveProperty("pair");
        expect(fx).toHaveProperty("rate");
      }
    });

    it("should handle refresh FX data mutation", async () => {
      const result = await caller.market.refreshFXData();
      expect(result).toEqual({ success: true });
    });
  });

  describe("Sector Data", () => {
    it("should return sector data array", async () => {
      const result = await caller.market.sectorData();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should have required fields in sector data", async () => {
      const result = await caller.market.sectorData();
      if (result.length > 0) {
        const sector = result[0];
        expect(sector).toHaveProperty("sector");
        expect(sector).toHaveProperty("value");
      }
    });

    it("should handle refresh sector data mutation", async () => {
      const result = await caller.market.refreshSectorData();
      expect(result).toEqual({ success: true });
    });
  });

  describe("Live snapshot extras", () => {
    it("should return a correlation matrix for the 14 ETF universe", async () => {
      const result = await caller.market.correlation();
      expect(result.tickers.length).toBe(14);
      expect(result.matrix.length).toBe(14);
      expect(result.matrix[0][0]).toBe(1);
    });

    it("should return live factor quotes", async () => {
      const result = await caller.market.factors();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("ticker");
      expect(result[0]).toHaveProperty("d1");
    });
  });

  describe("Data Validation", () => {
    it("should not return NaN values in ETF prices", async () => {
      const result = await caller.market.etfPrices();
      result.forEach((etf) => {
        if (etf.price) {
          const price = parseFloat(etf.price);
          expect(isNaN(price)).toBe(false);
        }
        if (etf.d1) {
          const d1 = parseFloat(etf.d1);
          expect(isNaN(d1)).toBe(false);
        }
      });
    });

    it("should not return NaN values in regional data", async () => {
      const result = await caller.market.regionalIndices();
      result.forEach((region) => {
        if (region.d1) {
          const d1 = parseFloat(region.d1);
          expect(isNaN(d1)).toBe(false);
        }
      });
    });

    it("should not return NaN values in FX rates", async () => {
      const result = await caller.market.fxRates();
      result.forEach((fx) => {
        if (fx.rate) {
          const rate = parseFloat(fx.rate);
          expect(isNaN(rate)).toBe(false);
        }
        if (fx.d1) {
          const d1 = parseFloat(fx.d1);
          expect(isNaN(d1)).toBe(false);
        }
      });
    });

    it("should not return NaN values in sector data", async () => {
      const result = await caller.market.sectorData();
      result.forEach((sector) => {
        if (sector.value) {
          const value = parseFloat(sector.value);
          expect(isNaN(value)).toBe(false);
        }
      });
    });
  });
});
