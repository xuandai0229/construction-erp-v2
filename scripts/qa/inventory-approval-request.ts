import { Client } from "pg";
import { writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { loadCutoverEnv, parseDbUrl } from "./cutover-rehearsal-lib";

async function main() {
  const { sourceUrl } = loadCutoverEnv();
  if (!sourceUrl) {
    throw new Error("BLOCKED: CUTOVER_SOURCE_DATABASE_URL is missing");
  }
  const dbConfig = parseDbUrl(sourceUrl);
  const client = new Client({ host: dbConfig.host, port: parseInt(dbConfig.port || "5432", 10), user: dbConfig.user, password: dbConfig.password, database: dbConfig.database });
  
  try {
    await client.connect();
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    
    // Only select fields needed for inventory and canonical hashing
    const r = await client.query('SELECT * FROM "ApprovalRequest" ORDER BY id');
    
    const quarantineDir = join(process.cwd(), ".local-audit-quarantine");
    if (!existsSync(quarantineDir)) mkdirSync(quarantineDir, { recursive: true });
    
    const timestamp = Date.now().toString();
    const archivePath = join(quarantineDir, `approval-request-legacy-excluded_${timestamp}.json`);
    
    const rows = r.rows;
    if (rows.length !== 2) {
      throw new Error("BLOCKED: Expected exactly 2 legacy rows.");
    }

    const rowHashes = [];
    for (const row of rows) {
      // Create canonical representation
      // We will hash the exact json string of the row object with keys sorted
      const sortedObj: any = {};
      Object.keys(row).sort().forEach(k => {
        sortedObj[k] = row[k];
      });
      const str = JSON.stringify(sortedObj);
      rowHashes.push(createHash("sha256").update(str).digest("hex"));
    }

    const archiveData = JSON.stringify(rows, null, 2);
    writeFileSync(archivePath, archiveData, "utf-8");
    const archiveChecksum = createHash("sha256").update(archiveData).digest("hex");
    const archiveSize = statSync(archivePath).size;

    const manifestDir = join(process.cwd(), "docs/qa");
    if (!existsSync(manifestDir)) mkdirSync(manifestDir, { recursive: true });

    const manifest = {
      approvedDecision: "BUSINESS_APPROVED_EXCLUSION_AND_ARCHIVE",
      timestamp,
      archiveChecksum,
      archiveSize,
      rowCount: rows.length,
      rowHashes,
      identities: rows.map(r => ({
        idPrefix: r.id.substring(0, 8) + "***",
        type: r.type,
        status: r.status,
        hasSourceType: r.sourceType !== null,
        hasSourceId: r.sourceId !== null,
      })),
      approvalReason: "Orphaned legacy rows. No entityType/entityId present. Impossible to map securely. Excluded and archived.",
      approvedBy: "BUSINESS_OWNER"
    };

    writeFileSync(join(manifestDir, "APPROVALREQUEST_LEGACY_EXCLUSION_MANIFEST.json"), JSON.stringify(manifest, null, 2), "utf-8");

    const md = `# APPROVALREQUEST LEGACY EXCLUSION APPROVAL

## Business Decision
**BUSINESS_APPROVED_EXCLUSION_AND_ARCHIVE**

## Reason
Hai bản ghi không liên kết với bất kỳ entity nghiệp vụ nào. Không thể xác định entityType/entityId trung thực. Không được tạo placeholder hoặc quan hệ giả. Chúng không thể hoạt động hợp lệ trong V2. Bản ghi APPROVED được giữ dưới dạng lịch sử audit. Bản ghi PENDING được coi là workflow legacy không thể tiếp tục.

## Identities (Masked)
${manifest.identities.map((id, i) => `- Row ${i+1}: ID ${id.idPrefix}, Type: ${id.type}, Status: ${id.status}`).join("\n")}

## Security
- Archive path: \`.local-audit-quarantine/approval-request-legacy-excluded_${timestamp}.json\`
- Archive Checksum (SHA-256): ${archiveChecksum}
- Size: ${archiveSize} bytes
- Exact Row Hashes:
${rowHashes.map(h => `  - ${h}`).join("\n")}

*Approved by: BUSINESS_OWNER*
`;

    writeFileSync(join(manifestDir, "APPROVALREQUEST_LEGACY_EXCLUSION_APPROVAL.md"), md, "utf-8");
    console.log("Inventory and archive complete.");
  } finally {
    try { await client.query("ROLLBACK"); } catch {}
    try { await client.end(); } catch {}
  }
}

main();
