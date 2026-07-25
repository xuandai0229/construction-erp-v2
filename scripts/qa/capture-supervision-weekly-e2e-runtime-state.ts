import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assertSafeQaDatabase } from "./assert-safe-qa-database";
import { createSafeQaPrismaClient } from "./create-safe-qa-prisma-client";

const artifactsDirectory = join(process.cwd(), "artifacts", "supervision-weekly-e2e");
const manifestPath = join(artifactsDirectory, "fixture-manifest-20260723.json");
const statePath = join(artifactsDirectory, "runtime-state.json");

type Manifest = {
  status: string;
  prefix: string;
  databaseFingerprint: {
    database: string;
    host: string;
    port: string;
  };
  dossiers: {
    result: string;
    nextWeek: string;
  };
  runtimeRows?: Record<string, string[]>;
  [key: string]: unknown;
};

async function main() {
  const safety = assertSafeQaDatabase();
  const qaUrl = process.env.QA_DATABASE_URL;
  if (!qaUrl) throw new Error("QA_DATABASE_URL is required");

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
  if (manifest.status !== "READY") throw new Error("Fixture manifest is not READY");
  if (JSON.stringify(manifest.databaseFingerprint) !== JSON.stringify(safety.qaDatabase)) {
    throw new Error("Fixture manifest database fingerprint does not match QA_DATABASE_URL");
  }

  const dossierIds = [manifest.dossiers.result, manifest.dossiers.nextWeek];
  const { prisma, close } = createSafeQaPrismaClient(qaUrl);
  try {
    const dossiers = await prisma.supervisionWeeklyDossier.findMany({
      where: { id: { in: dossierIds } },
      select: {
        id: true,
        reportNumber: true,
        status: true,
        version: true,
        lockVersion: true,
        submittedAt: true,
        reviewedAt: true,
        lockedAt: true,
        createdById: true,
        reviewedById: true,
        shiftSelections: {
          orderBy: [{ documentType: "asc" }, { entryDate: "asc" }, { shift: "asc" }],
        },
        entries: {
          orderBy: [{ documentType: "asc" }, { entryDate: "asc" }, { shift: "asc" }, { sortOrder: "asc" }],
        },
        transitions: { orderBy: { sortOrder: "asc" } },
        quantities: { orderBy: { sortOrder: "asc" } },
        progressRows: { orderBy: { sortOrder: "asc" } },
        observations: { orderBy: [{ documentType: "asc" }, { category: "asc" }, { sortOrder: "asc" }] },
        revisions: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { reportNumber: "asc" },
    });
    if (dossiers.length !== dossierIds.length) {
      throw new Error(`Expected ${dossierIds.length} fixture dossiers but found ${dossiers.length}`);
    }
    if (dossiers.some((dossier) => !dossier.reportNumber?.startsWith(manifest.prefix))) {
      throw new Error("A fixture dossier does not have the required QA prefix");
    }

    const runtimeRows = {
      shiftSelections: dossiers.flatMap((dossier) => dossier.shiftSelections.map((row) => row.id)),
      entries: dossiers.flatMap((dossier) => dossier.entries.map((row) => row.id)),
      transitions: dossiers.flatMap((dossier) => dossier.transitions.map((row) => row.id)),
      quantities: dossiers.flatMap((dossier) => dossier.quantities.map((row) => row.id)),
      progressRows: dossiers.flatMap((dossier) => dossier.progressRows.map((row) => row.id)),
      observations: dossiers.flatMap((dossier) => dossier.observations.map((row) => row.id)),
      revisions: dossiers.flatMap((dossier) => dossier.revisions.map((row) => row.id)),
    };

    const captured = {
      capturedAt: new Date().toISOString(),
      databaseFingerprint: safety.qaDatabase,
      dossiers,
      runtimeRows,
    };
    writeFileSync(statePath, JSON.stringify(captured, null, 2), "utf8");
    writeFileSync(
      manifestPath,
      JSON.stringify({ ...manifest, runtimeRows, runtimeCapturedAt: captured.capturedAt }, null, 2),
      "utf8",
    );

    console.log(JSON.stringify({
      captured: true,
      statePath,
      databaseFingerprint: safety.qaDatabase,
      dossiers: dossiers.map((dossier) => ({
        id: dossier.id,
        reportNumber: dossier.reportNumber,
        status: dossier.status,
        lockVersion: dossier.lockVersion,
        counts: {
          shiftSelections: dossier.shiftSelections.length,
          entries: dossier.entries.length,
          transitions: dossier.transitions.length,
          quantities: dossier.quantities.length,
          progressRows: dossier.progressRows.length,
          observations: dossier.observations.length,
          revisions: dossier.revisions.length,
        },
      })),
    }, null, 2));
  } finally {
    await close();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown runtime-state capture failure");
  process.exitCode = 1;
});
