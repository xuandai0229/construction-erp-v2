import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";

export interface StorageGuardResult {
  isSafe: boolean;
  storageRoot: string;
  markerPath: string;
  reason: string;
}

export async function assertSafeStorage(
  customStorageRoot?: string,
  environment: NodeJS.ProcessEnv = process.env
): Promise<StorageGuardResult> {
  const rawRoot =
    customStorageRoot ||
    environment.STORAGE_ROOT ||
    environment.E2E_STORAGE_ROOT ||
    path.join(process.cwd(), "storage_e2e");

  const resolvedRoot = path.resolve(rawRoot);
  const cwd = path.resolve(process.cwd());

  // Check path traversal
  if (rawRoot.includes("..")) {
    throw new Error("STORAGE GUARD REJECTED: Path traversal ('..') detected in storage root.");
  }

  // Check root directories
  const parsed = path.parse(resolvedRoot);
  if (resolvedRoot === parsed.root) {
    throw new Error(`STORAGE GUARD REJECTED: Storage root cannot be a system root directory '${resolvedRoot}'.`);
  }

  // Must not be primary production storage directory
  const primaryStorage = path.resolve(cwd, "storage");
  if (resolvedRoot === primaryStorage) {
    throw new Error(
      `STORAGE GUARD REJECTED: E2E storage root cannot be identical to primary application storage directory ('${primaryStorage}').`
    );
  }

  // Must contain qa, e2e, or test keyword in basename or path
  const folderName = path.basename(resolvedRoot).toLowerCase();
  if (!/(qa|e2e|test)/.test(folderName) && !/(qa|e2e|test)/.test(resolvedRoot.toLowerCase())) {
    throw new Error(
      `STORAGE GUARD REJECTED: E2E storage root '${folderName}' must contain a recognized test keyword ('qa', 'e2e', or 'test').`
    );
  }

  // Create directory if not exists
  if (!existsSync(resolvedRoot)) {
    await fs.mkdir(resolvedRoot, { recursive: true });
  }

  // Check/create ownership marker
  const markerPath = path.join(resolvedRoot, ".qa-e2e-storage-marker.json");
  if (!existsSync(markerPath)) {
    const markerContent = {
      owner: "E2E_QA_SETTINGS",
      purpose: "Isolated E2E document & file storage",
      createdAt: new Date().toISOString(),
      storageRoot: resolvedRoot,
    };
    await fs.writeFile(markerPath, JSON.stringify(markerContent, null, 2), "utf-8");
  }

  return {
    isSafe: true,
    storageRoot: resolvedRoot,
    markerPath,
    reason: "Isolated E2E storage directory verified with ownership marker.",
  };
}

if (process.argv[1]?.endsWith("assert-safe-storage.ts")) {
  assertSafeStorage()
    .then((res) => console.log(JSON.stringify(res, null, 2)))
    .catch((err) => {
      console.error(err instanceof Error ? err.message : "Storage guard failed");
      process.exitCode = 1;
    });
}
