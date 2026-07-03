import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import Decimal from 'decimal.js';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("--- FIELD PROGRESS DATA AUDIT FOR TH-125 ---");
  const project = await prisma.project.findUnique({
    where: { code: "TH-125" }
  });

  if (!project) {
    console.error("Project TH-125 not found.");
    return;
  }

  const template = await prisma.fieldProgressTemplate.findFirst({
    where: { projectId: project.id, deletedAt: null }
  });

  if (!template) {
    console.error("No active template found.");
    return;
  }

  const items = await prisma.fieldProgressItem.findMany({
    where: { templateId: template.id, deletedAt: null, itemType: "WORK" },
    orderBy: { sortOrder: "asc" }
  });

  const entries = await prisma.fieldProgressEntry.findMany({
    where: { templateId: template.id, deletedAt: null }
  });

  console.log(`| Work Item | Unit | Design Qty | Approved/Existing Qty | Input Entries Total | Remaining Qty | Over Qty | Issue |`);
  console.log(`| --------- | ---- | ---------: | --------------------: | ------------------: | ------------: | -------: | ----- |`);

  for (const item of items) {
    const itemEntries = entries.filter(e => e.itemId === item.id);
    let totalApproved = new Decimal(0);
    let totalAll = new Decimal(0);

    for (const e of itemEntries) {
      if (e.status === "APPROVED") totalApproved = totalApproved.plus(e.quantity);
      totalAll = totalAll.plus(e.quantity);
    }

    const design = item.designQuantity ? new Decimal(Number(item.designQuantity)) : new Decimal(0);
    const remaining = design.minus(totalApproved);
    let over = new Decimal(0);
    let issue = "";

    if (totalApproved.greaterThan(design)) {
      over = totalApproved.minus(design);
      issue = "OVER_QUANTITY";
    }

    if (totalAll.lessThan(0)) issue += " NEGATIVE_ENTRY";
    
    const overText = over.toNumber() > 0 ? over.toNumber().toString() : "";
    const remText = remaining.toNumber() >= 0 ? remaining.toNumber().toString() : "0";

    console.log(`| ${item.workContent?.substring(0, 30)} | ${item.unit} | ${design.toNumber()} | ${totalApproved.toNumber()} | ${totalAll.toNumber()} | ${remText} | ${overText} | ${issue} |`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
