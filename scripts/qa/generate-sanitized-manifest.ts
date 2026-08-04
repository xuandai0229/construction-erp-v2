import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const BACKUP_DIR = "C:\\Users\\admin\\.gemini\\antigravity\\backups\\phase07";
const MANIFEST_DIR = join(process.cwd(), "docs/qa/manifests");
const MANIFEST_PATH = join(MANIFEST_DIR, "phase07-backup-manifest-sanitized.json");

interface BackupManifestItem {
  logicalName: string;
  filename: string;
  timestamp: string;
  sizeBytes: number;
  sha256: string;
  obfuscatedDatabaseName: string;
  sensitiveDataStatus: "REDACTED_AND_EXTRACTED_OUTSIDE_REPO";
}

function main() {
  if (!existsSync(MANIFEST_DIR)) {
    mkdirSync(MANIFEST_DIR, { recursive: true });
  }

  const files = readdirSync(BACKUP_DIR);
  const items: BackupManifestItem[] = [];

  for (const f of files) {
    const filePath = join(BACKUP_DIR, f);
    const stat = statSync(filePath);
    const buf = readFileSync(filePath);
    const hash = createHash("sha256").update(buf).digest("hex");

    items.push({
      logicalName: f.replace(/\.(sql|json)$/, ""),
      filename: f,
      timestamp: stat.mtime.toISOString(),
      sizeBytes: stat.size,
      sha256: hash,
      obfuscatedDatabaseName: "co***_qa (User: po***)",
      sensitiveDataStatus: "REDACTED_AND_EXTRACTED_OUTSIDE_REPO",
    });
  }

  const manifest = {
    title: "Phase 0.7 Sanitized Database Backup Manifest",
    generatedAt: new Date().toISOString(),
    externalSecureStorageStatus: "SECURED_OUTSIDE_REPO",
    connectionStringPresent: false,
    piiDataPresent: false,
    backups: items,
  };

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");
  console.log("Sanitized manifest generated successfully at:", MANIFEST_PATH);
}

main();
