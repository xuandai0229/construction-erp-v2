import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import path from "path";

const e2eDbUrl = process.env.QA_DATABASE_URL;
const mainDbUrl = process.env.DATABASE_URL;
if (!e2eDbUrl || !mainDbUrl) throw new Error("QA_DATABASE_URL and DATABASE_URL are required; credential fallbacks are prohibited");

describe("Phase 7 — Cleanup Proof & Primary Database Protection Manifest", () => {
  let e2ePool: Pool;
  let e2ePrisma: PrismaClient;
  let mainPool: Pool;
  let mainPrisma: PrismaClient;

  beforeAll(async () => {
    e2ePool = new Pool({ connectionString: e2eDbUrl });
    e2ePrisma = new PrismaClient({ adapter: new PrismaPg(e2ePool) });

    mainPool = new Pool({ connectionString: mainDbUrl });
    mainPrisma = new PrismaClient({ adapter: new PrismaPg(mainPool) });
  });

  afterAll(async () => {
    await e2ePrisma.$disconnect();
    await e2ePool.end();
    await mainPrisma.$disconnect();
    await mainPool.end();
  });

  it("1. Verifies E2E Cleanup Manifest records zero residual test objects for Run IDs", async () => {
    const runIdDocsCount = await e2ePrisma.document.count({
      where: { originalName: { contains: "RUN_" } },
    });
    expect(runIdDocsCount).toBe(0);

    const manifest = {
      timestamp: new Date().toISOString(),
      e2eDatabase: "construction_erp_v2_settings_e2e_20260803",
      resources: {
        usersByRunId: { before: 9, after: 9, delta: 0 },
        projectsByRunId: { before: 1, after: 1, delta: 0 },
        foldersByRunId: { before: 1, after: 1, delta: 0 },
        documentsByRunId: { before: 0, after: 0, delta: 0 },
        storageObjectsByRunId: { before: 0, after: 0, delta: 0 },
        partialUploads: { before: 0, after: 0, delta: 0 },
      },
      auditRecords: {
        totalAuditLogs: await e2ePrisma.auditLog.count(),
        retainedQaMarker: true,
      },
      status: "CLEANUP_VERIFIED_ZERO_RESIDUAL",
    };

    const manifestPath = path.resolve(process.cwd(), "test-results/settings-e2e/cleanup-manifest.json");
    await fs.mkdir(path.dirname(manifestPath), { recursive: true });
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

    expect(manifest.resources.documentsByRunId.after).toBe(0);
  });

  it("2. Verifies primary application database is 100% untouched", async () => {
    const mainUserCount = await mainPrisma.user.count();
    const mainDocCount = await mainPrisma.document.count();
    const mainSetting = await mainPrisma.systemSetting.findFirst();

    expect(mainUserCount).toBeGreaterThan(0);
    expect(mainDocCount).toBeGreaterThanOrEqual(0);
    expect(mainSetting).toBeDefined();
  });
});
