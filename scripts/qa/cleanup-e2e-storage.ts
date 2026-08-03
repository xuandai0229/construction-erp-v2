import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { assertSafeStorage } from "./assert-safe-storage";

export async function cleanupE2eStorage(runId?: string, isDryRun = false) {
  const guard = await assertSafeStorage();
  const root = guard.storageRoot;

  console.log(`[Storage Cleanup] Target Root: ${root}`);
  console.log(`[Storage Cleanup] Run ID Filter: ${runId || "ALL_TEST_OBJECTS"}`);
  console.log(`[Storage Cleanup] Mode: ${isDryRun ? "DRY-RUN (No files deleted)" : "ACTIVE CLEANUP"}`);

  const markerPath = guard.markerPath;
  if (!existsSync(markerPath)) {
    throw new Error(`[Storage Cleanup] Safety marker missing at ${markerPath}. Refusing to cleanup.`);
  }

  const deletedFiles: string[] = [];

  async function scanAndDelete(dirPath: string) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.name === ".qa-e2e-storage-marker.json") continue;

      if (entry.isDirectory()) {
        await scanAndDelete(fullPath);
        const remaining = await fs.readdir(fullPath);
        if (remaining.length === 0) {
          if (!isDryRun) {
            await fs.rmdir(fullPath);
          }
          console.log(`[Storage Cleanup] Removed empty dir: ${fullPath}`);
        }
      } else {
        if (!runId || entry.name.includes(runId) || fullPath.includes(runId)) {
          deletedFiles.push(fullPath);
          if (!isDryRun) {
            await fs.unlink(fullPath);
          }
          console.log(`[Storage Cleanup] Deleted file: ${fullPath}`);
        }
      }
    }
  }

  await scanAndDelete(root);

  return {
    storageRoot: root,
    isDryRun,
    deletedFilesCount: deletedFiles.length,
    deletedFiles,
  };
}

if (process.argv[1]?.endsWith("cleanup-e2e-storage.ts")) {
  const isDryRun = process.argv.includes("--dry-run");
  const runIdArg = process.argv.find((arg) => arg.startsWith("--run-id="))?.split("=")[1];

  cleanupE2eStorage(runIdArg, isDryRun)
    .then((res) => console.log(JSON.stringify(res, null, 2)))
    .catch((err) => {
      console.error("STORAGE_CLEANUP_FAILED:", err.message);
      process.exitCode = 1;
    });
}
