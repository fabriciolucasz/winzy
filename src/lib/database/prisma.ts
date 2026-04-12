
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
  pool?: Pool;
};

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL não está definida.");
}

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const poolMax = envNumber("PG_POOL_MAX", 10);
const idleTimeoutMillis = envNumber("PG_IDLE_TIMEOUT_MS", 30_000);
const connectionTimeoutMillis = envNumber("PG_CONNECTION_TIMEOUT_MS", 10_000);
const enableSsl = process.env.PG_SSL === "true";

const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString: DATABASE_URL,
    max: poolMax,
    idleTimeoutMillis,
    connectionTimeoutMillis,
    keepAlive: true,
    ssl: enableSsl ? { rejectUnauthorized: false } : undefined,
  });

const adapter = new PrismaPg(pool as any);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}

export default prisma;