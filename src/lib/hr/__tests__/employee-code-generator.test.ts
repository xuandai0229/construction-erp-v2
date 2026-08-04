import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import {
  getCurrentVietnamYear,
  formatEmployeeCode,
  generateNextEmployeeCode,
} from "../employee-code-generator";

describe("Employee Code Generator - Unit & Concurrency Tests", () => {
  let pool: Pool;
  let adapter: PrismaPg;
  let prisma: PrismaClient;

  beforeAll(() => {
    const connectionString = process.env.QA_DATABASE_URL || process.env.DATABASE_URL;
    pool = new Pool({ connectionString });
    adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  it("extracts current Vietnam year accurately", () => {
    const fixedDate = new Date("2026-08-04T02:00:00Z");
    const year = getCurrentVietnamYear(fixedDate);
    expect(year).toBe(2026);
  });

  it("formats employee code to NV-YYYY-NNNN format", () => {
    expect(formatEmployeeCode(2026, 1)).toBe("NV-2026-0001");
    expect(formatEmployeeCode(2026, 99)).toBe("NV-2026-0099");
    expect(formatEmployeeCode(2026, 1000)).toBe("NV-2026-1000");
  });

  it("generates sequential codes atomically in real DB", async () => {
    const testYear = 2099;
    const testDate = new Date(`${testYear}-01-01T00:00:00Z`);

    const code1 = await generateNextEmployeeCode(prisma, testDate);
    const code2 = await generateNextEmployeeCode(prisma, testDate);

    expect(code1).toMatch(/^NV-2099-\d{4}$/);
    expect(code2).toMatch(/^NV-2099-\d{4}$/);

    const seq1 = Number.parseInt(code1.split("-")[2], 10);
    const seq2 = Number.parseInt(code2.split("-")[2], 10);
    expect(seq2).toBe(seq1 + 1);

    // Cleanup sequence record
    await prisma.employeeCodeSequence.deleteMany({ where: { year: testYear } });
  });

  it("handles 20 concurrent code generation requests without duplicates", async () => {
    const testYear = 2098;
    const testDate = new Date(`${testYear}-01-01T00:00:00Z`);

    const promises = Array.from({ length: 20 }, () =>
      generateNextEmployeeCode(prisma, testDate)
    );

    const results = await Promise.all(promises);

    expect(results).toHaveLength(20);
    const uniqueSet = new Set(results);
    expect(uniqueSet.size).toBe(20);

    // Verify all formatted properly
    results.forEach((code) => {
      expect(code).toMatch(/^NV-2098-\d{4}$/);
    });

    // Cleanup sequence record
    await prisma.employeeCodeSequence.deleteMany({ where: { year: testYear } });
  });
});
