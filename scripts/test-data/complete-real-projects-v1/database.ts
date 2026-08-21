import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ path: ".env", quiet: true, override: false });

export type DatabaseInfo = {
  host: string;
  name: string;
  environment: string;
};

export function getDatabaseInfo(): DatabaseInfo {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("Thiếu DATABASE_URL trong .env.local hoặc .env");
  }

  const url = new URL(connectionString);
  return {
    host: url.hostname,
    name: url.pathname.replace(/^\//, ""),
    environment: process.env.NODE_ENV || "development",
  };
}

export function assertSafeNonProductionDatabase(info: DatabaseInfo): void {
  const fingerprint = `${info.host}/${info.name}/${info.environment}`.toLowerCase();
  if (fingerprint.includes("prod") || info.environment.toLowerCase() === "production") {
    throw new Error(
      `Từ chối thao tác dữ liệu test trên môi trường production (${info.host}/${info.name}).`,
    );
  }
}

export function createDatabase() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("Thiếu DATABASE_URL trong .env.local hoặc .env");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  return {
    prisma,
    pool,
    async close() {
      await prisma.$disconnect();
      await pool.end();
    },
  };
}

