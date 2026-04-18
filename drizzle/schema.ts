import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const etfPrices = mysqlTable("etf_prices", {
  id: int("id").autoincrement().primaryKey(),
  ticker: varchar("ticker", { length: 10 }).notNull().unique(),
  name: text("name"),
  price: varchar("price", { length: 20 }),
  d1: varchar("d1", { length: 20 }), // 1-day change %
  d5: varchar("d5", { length: 20 }), // 5-day change %
  ytd: varchar("ytd", { length: 20 }), // YTD change %
  aum: varchar("aum", { length: 20 }), // Assets under management
  pe: varchar("pe", { length: 20 }), // P/E ratio
  yld: varchar("yld", { length: 20 }), // Yield
  signal: varchar("signal", { length: 20 }), // Bullish/Bearish/Neutral
  rsi: int("rsi"), // RSI indicator
  vol: varchar("vol", { length: 20 }), // Volatility
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
});

export const regionalIndices = mysqlTable("regional_indices", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(), // e.g., "US", "JP", "CN"
  name: varchar("name", { length: 100 }).notNull(),
  d1: varchar("d1", { length: 20 }),
  region: varchar("region", { length: 20 }), // "DM", "EM", "AGG"
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
});

export const fxRates = mysqlTable("fx_rates", {
  id: int("id").autoincrement().primaryKey(),
  pair: varchar("pair", { length: 20 }).notNull().unique(), // e.g., "EUR/USD"
  rate: varchar("rate", { length: 20 }),
  d1: varchar("d1", { length: 20 }),
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
});

export const sectorData = mysqlTable("sector_data", {
  id: int("id").autoincrement().primaryKey(),
  sector: varchar("sector", { length: 20 }).notNull().unique(), // TECH, COMM, etc.
  value: varchar("value", { length: 20 }),
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
});

export type ETFPrice = typeof etfPrices.$inferSelect;
export type RegionalIndex = typeof regionalIndices.$inferSelect;
export type FXRate = typeof fxRates.$inferSelect;
export type SectorData = typeof sectorData.$inferSelect;