/**
 * Phase 3.1: Verify and Normalize Site Report Attachments
 * Converts legacy absolute paths to relative paths safely.
 * Run with: node -r dotenv/config node_modules/tsx/dist/cli.mjs scripts/verify-and-normalize-site-report-attachments.ts
 */

import prisma from "../src/lib/prisma";
import path from "path";

async function main() {
  console.log("=== Phase 3.1: Normalize Attachment Paths ===\n");

  const attachments = await prisma.siteReportAttachment.findMany();
  
  console.log(`Total attachments found: ${attachments.length}`);

  let normalizedCount = 0;
  let untouchedCount = 0;
  let errorCount = 0;

  const storageRoot = path.join(process.cwd(), "storage", "site-reports");

  for (const att of attachments) {
    if (path.isAbsolute(att.storagePath)) {
      // It's an absolute path, let's see if we can normalize it
      if (att.storagePath.startsWith(storageRoot)) {
        // Safe to normalize: it is inside our storage folder
        const relativePath = path.relative(process.cwd(), att.storagePath);
        
        try {
          // Update DB
          await prisma.siteReportAttachment.update({
            where: { id: att.id },
            data: { storagePath: relativePath }
          });
          console.log(`✅ Normalized: ${att.id} -> ${relativePath}`);
          normalizedCount++;
        } catch (e) {
          console.error(`❌ Failed to update ${att.id}:`, e);
          errorCount++;
        }
      } else {
        console.warn(`⚠️ Foreign absolute path (ignored): ${att.storagePath}`);
        untouchedCount++;
      }
    } else {
      // Already relative
      untouchedCount++;
    }
  }

  console.log("\n=== SUMMARY ===");
  console.log(`Normalized to relative paths: ${normalizedCount}`);
  console.log(`Left untouched (already relative or foreign): ${untouchedCount}`);
  console.log(`Errors during update: ${errorCount}`);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
