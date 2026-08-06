import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const dbUrl = process.env.QA_DATABASE_URL;
if (!dbUrl) throw new Error("QA_DATABASE_URL is required; credential fallback is prohibited");

describe("Phase 6 — Singleton Database Guarantee Integration Test", () => {
  let pool: Pool;
  let adapter: PrismaPg;
  let prisma: PrismaClient;

  let createdGlobalSetting = false;

  beforeAll(async () => {
    pool = new Pool({ connectionString: dbUrl });
    adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });

    const count = await prisma.systemSetting.count();
    if (count === 0) {
      createdGlobalSetting = true;
      await prisma.systemSetting.create({
        data: {
          id: "global",
          singletonKey: "DEFAULT_SETTINGS",
          companyName: "Công ty Cổ phần Xây dựng ERP",
          taxCode: "0101234567",
          hotline: "19001000",
          timezone: "Asia/Ho_Chi_Minh",
          currency: "VND",
        },
      });
    }
  });

  afterAll(async () => {
    if (createdGlobalSetting) {
      await prisma.systemSetting.delete({ where: { singletonKey: "DEFAULT_SETTINGS" } });
    }
    await prisma.$disconnect();
    await pool.end();
  });

  it("1. Database contains exactly 1 SystemSetting singleton row", async () => {
    const count = await prisma.systemSetting.count();
    expect(count).toBe(1);
  });

  it("2. Database rejects a second row even when it uses another singletonKey", async () => {
    const client = await pool.connect();
    let rejected = false;
    try {
      await client.query("BEGIN");
      await client.query(
        'INSERT INTO "SystemSetting" (id, "singletonKey", "companyName", "taxCode", hotline, timezone, currency, "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())',
        ["settings_second_row_probe", "ANOTHER_VALUE", "Second row probe", "probe", "probe", "Asia/Ho_Chi_Minh", "VND"],
      );
    } catch (error) {
      rejected = !!error;
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
    expect(rejected).toBe(true);
  });
});
