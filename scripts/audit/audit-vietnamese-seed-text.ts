import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const PROJECT_CODE = "HN-TH-2026-001";

async function main() {
  const project = await prisma.project.findUnique({ where: { code: PROJECT_CODE } });
  if (!project) {
    console.error(`Project ${PROJECT_CODE} not found.`);
    return;
  }

  let totalFields = 0;
  let accentedCount = 0;
  let unaccentedCount = 0;
  let skippedCount = 0;
  const unaccentedList: string[] = [];

  const hasVietnamese = (text: string | null | undefined) => {
    if (!text) return false;
    return /[àáãạảăắằẳẵặâấầẩẫậèéẹẻẽêềếểễệđìíĩỉịòóõọỏôốồổỗộơớờởỡợùúũụủưứừửữựỳýỵỷỹÀÁÃẠẢĂẮẰẲẴẶÂẤẦẨẪẬÈÉẸẺẼÊỀẾỂỄỆĐÌÍĨỈỊÒÓÕỌỎÔỐỒỔỖỘƠỚỜỞMỠỢÙÚŨỤỦƯỨỪỬỮỰỲÝỴỶỸ]/u.test(text);
  };

  const hasUnaccentedPhrases = (text: string | null | undefined) => {
    if (!text) return false;
    if (text.includes("HN-TH") || text.includes(".pdf") || text.includes("@construction.local")) return false;
    
    const badPhrases = [
      "Cong trinh", "Nha van phong", "Hop dong", "Ban ve", "Nghiem thu", "Hoa don", 
      "Thanh toan", "Phe duyet", "Bao cao", "Vat tu", "Thep ", "Xi mang", "Cat vang", 
      "Day dien", "Giam doc", "Chi huy truong", "Ky su", "Ke toan"
    ];
    for (const p of badPhrases) {
      if (text.includes(p)) return true;
    }
    return false;
  };

  function check(model: string, field: string, id: string, text: string | null | undefined, isTech = false) {
    if (!text) return;
    totalFields++;
    
    if (isTech) {
      skippedCount++;
      return;
    }

    if (hasVietnamese(text)) {
      accentedCount++;
    } else if (hasUnaccentedPhrases(text)) {
      unaccentedCount++;
      unaccentedList.push(`[${model}] ${field} (ID: ${id}): ${text}`);
    } else {
      // It might be valid English or numbers, let's just count it as accented if it doesn't have bad phrases
      accentedCount++;
    }
  }

  // 1. Project
  check("Project", "name", project.id, project.name);
  check("Project", "investor", project.id, project.investor);
  check("Project", "location", project.id, project.location);
  check("Project", "description", project.id, project.description);
  check("Project", "code", project.id, project.code, true);

  // 2. Users
  const members = await prisma.projectMember.findMany({ where: { projectId: project.id }, include: { user: true } });
  for (const m of members) {
    check("User", "name", m.user.id, m.user.name);
    check("User", "email", m.user.id, m.user.email, true);
  }

  // 3. DocumentFolder
  const folders = await prisma.documentFolder.findMany({ where: { projectId: project.id } });
  for (const f of folders) {
    check("DocumentFolder", "name", f.id, f.name);
  }

  // 4. Document
  const docs = await prisma.document.findMany({ where: { projectId: project.id } });
  for (const d of docs) {
    check("Document", "displayName", d.id, d.displayName);
    check("Document", "originalName", d.id, d.originalName, true);
    check("Document", "storagePath", d.id, d.storagePath, true);
  }

  // 5. MaterialItem
  const materials = await prisma.materialItem.findMany({ where: { projectId: project.id } });
  for (const m of materials) {
    check("MaterialItem", "name", m.id, m.name);
    check("MaterialItem", "group", m.id, m.group);
  }

  // 6. Contract
  const contracts = await prisma.contract.findMany({ where: { projectId: project.id } });
  for (const c of contracts) {
    check("Contract", "name", c.id, c.name);
    check("Contract", "contractNo", c.id, c.contractNo, true);
  }

  // 7. Supplier
  const suppliers = await prisma.supplier.findMany({});
  for (const s of suppliers) {
    check("Supplier", "name", s.id, s.name);
    check("Supplier", "address", s.id, s.address);
    check("Supplier", "contactPerson", s.id, s.contactPerson);
  }

  // 8. PaymentRequest
  const payments = await prisma.paymentRequest.findMany({ where: { projectId: project.id } });
  for (const p of payments) {
    check("PaymentRequest", "title", p.id, p.title);
    check("PaymentRequest", "notes", p.id, p.notes);
    check("PaymentRequest", "rejectedReason", p.id, p.rejectedReason);
  }

  // 9. SiteReport & Lines
  const reports = await prisma.siteReport.findMany({ where: { projectId: project.id } });
  for (const r of reports) {
    check("SiteReport", "title", r.id, r.title);
    check("SiteReport", "summary", r.id, r.summary);
    check("SiteReport", "quality", r.id, r.quality);
    check("SiteReport", "weatherNote", r.id, r.weatherNote);
    check("SiteReport", "materials", r.id, r.materials);
    check("SiteReport", "issues", r.id, r.issues);
    check("SiteReport", "recommendations", r.id, r.recommendations);
  }

  const reportLines = await prisma.siteReportLine.findMany({ where: { siteReport: { projectId: project.id } } });
  for (const rl of reportLines) {
    check("SiteReportLine", "workContent", rl.id, rl.workContent);
    check("SiteReportLine", "note", rl.id, rl.note);
  }

  // 10. ApprovalRequest
  const approvals = await prisma.approvalRequest.findMany({ where: { projectId: project.id } });
  for (const a of approvals) {
    check("ApprovalRequest", "title", a.id, a.title);
    check("ApprovalRequest", "description", a.id, a.description);
  }

  // 11. ChatMessage
  const chats = await prisma.chatMessage.findMany({ where: { content: { contains: PROJECT_CODE } } });
  for (const c of chats) {
    check("ChatMessage", "content", c.id, c.content);
  }

  console.log(`=== AUDIT VIETNAMESE TEXT FOR ${PROJECT_CODE} ===`);
  console.log(`Total fields checked: ${totalFields}`);
  console.log(`Accented fields: ${accentedCount}`);
  console.log(`Technical fields bypassed: ${skippedCount}`);
  console.log(`Unaccented fields (Errors): ${unaccentedCount}`);
  
  if (unaccentedCount > 0) {
    console.log(`\n=== LIST OF ERRORS ===`);
    unaccentedList.forEach(e => console.log(e));
    process.exitCode = 1;
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
