import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import type { DatabaseFingerprint } from "./assert-safe-qa-database";

export type SafeQaPrisma = { prisma: PrismaClient; close: () => Promise<void> };

/** Creates an isolated Prisma client pinned to the supplied QA URL; never import the app singleton here. */
export function createSafeQaPrismaClient(qaDatabaseUrl: string): SafeQaPrisma {
  const pool = new Pool({ connectionString: qaDatabaseUrl, max: 2 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  return { prisma, close: async () => { await prisma.$disconnect(); await pool.end(); } };
}

export async function verifyQaPrismaFingerprint(prisma: PrismaClient, expected: DatabaseFingerprint): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<DatabaseFingerprint[]>(
    "SELECT current_database() AS database, current_user AS user, inet_server_addr()::text AS host, inet_server_port() AS port",
  );
  const actual = rows[0];
  if (!actual || actual.database !== expected.database || actual.host !== expected.host || Number(actual.port) !== Number(expected.port)) {
    throw new Error("QA Prisma client fingerprint không khớp QA_DATABASE_URL; đã dừng trước fixture.");
  }
}
