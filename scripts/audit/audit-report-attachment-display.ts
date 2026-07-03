import "dotenv/config";
import prisma from "../src/lib/prisma";
import { promises as fs } from "fs";
import path from "path";

async function main() {
  console.log("Auditing SiteReportAttachment...");
  
  const attachments = await prisma.siteReportAttachment.findMany({
    include: {
      report: true
    }
  });

  let missingFiles = 0;
  let zeroSizeFiles = 0;
  let photos = 0;
  let files = 0;
  const missingAttachments: any[] = [];
  const zeroSizeAttachments: any[] = [];
  
  for (const att of attachments) {
    if (att.kind === 'PHOTO') photos++;
    if (att.kind === 'FILE') files++;

    if (att.sizeBytes === 0) {
      zeroSizeFiles++;
      zeroSizeAttachments.push(att);
    }

    const absolutePath = path.join(process.cwd(), att.storagePath);
    try {
      await fs.access(absolutePath);
    } catch (e) {
      missingFiles++;
      missingAttachments.push({ id: att.id, path: absolutePath, reportId: att.reportId });
    }
  }

  console.log("======================================");
  console.log(`Total attachments: ${attachments.length}`);
  console.log(`Photos: ${photos}`);
  console.log(`Files: ${files}`);
  console.log(`Missing physical files: ${missingFiles}`);
  console.log(`Zero size files: ${zeroSizeFiles}`);
  
  if (missingFiles > 0) {
    console.log("Sample missing files:", missingAttachments.slice(0, 5));
  }
  if (zeroSizeFiles > 0) {
    console.log("Sample zero size files:", zeroSizeAttachments.slice(0, 5));
  }
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
