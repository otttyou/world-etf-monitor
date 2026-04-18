import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, etfPrices, regionalIndices, fxRates, sectorData } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ETF Price helpers
export async function getAllETFPrices() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(etfPrices);
}

export async function getETFPrice(ticker: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(etfPrices).where(eq(etfPrices.ticker, ticker)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertETFPrice(data: {
  ticker: string;
  name?: string;
  price?: string;
  d1?: string;
  d5?: string;
  ytd?: string;
  aum?: string;
  pe?: string;
  yld?: string;
  signal?: string;
  rsi?: number;
  vol?: string;
}) {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(etfPrices).values(data).onDuplicateKeyUpdate({
    set: {
      name: data.name,
      price: data.price,
      d1: data.d1,
      d5: data.d5,
      ytd: data.ytd,
      aum: data.aum,
      pe: data.pe,
      yld: data.yld,
      signal: data.signal,
      rsi: data.rsi,
      vol: data.vol,
      lastUpdated: new Date(),
    },
  });
}

// Regional Index helpers
export async function getAllRegionalIndices() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(regionalIndices);
}

export async function upsertRegionalIndex(data: {
  code: string;
  name: string;
  d1?: string;
  region: string;
}) {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(regionalIndices).values(data).onDuplicateKeyUpdate({
    set: {
      name: data.name,
      d1: data.d1,
      region: data.region,
      lastUpdated: new Date(),
    },
  });
}

// FX Rate helpers
export async function getAllFXRates() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(fxRates);
}

export async function upsertFXRate(data: {
  pair: string;
  rate?: string;
  d1?: string;
}) {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(fxRates).values(data).onDuplicateKeyUpdate({
    set: {
      rate: data.rate,
      d1: data.d1,
      lastUpdated: new Date(),
    },
  });
}

// Sector Data helpers
export async function getAllSectorData() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(sectorData);
}

export async function upsertSectorData(data: {
  sector: string;
  value?: string;
}) {
  const db = await getDb();
  if (!db) return;
  
  await db.insert(sectorData).values(data).onDuplicateKeyUpdate({
    set: {
      value: data.value,
      lastUpdated: new Date(),
    },
  });
}
