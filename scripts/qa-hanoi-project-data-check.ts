import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { Pool } from "pg";

dotenv.config();

const PROJECT_CODE = "HN-TH-2026-001";
const storageRoot = path.resolve(process.env.STORAGE_ROOT || path.join(process.cwd(), "storage"));

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const pool = new Pool({ connectionString: requireEnv("DATABASE_URL") });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

type Check = { name: string; ok: boolean; detail: string };
const checks: Check[] = [];

function check(name: string, ok: boolean, passDetail: string, failDetail = passDetail) {
  checks.push({ name, ok, detail: ok ? passDetail : failDetail });
}

function resolveStoragePath(storagePath: string) {
  if (path.isAbsolute(storagePath)) return storagePath;
  return path.join(storageRoot, storagePath);
}

async function main() {
  const projects = await prisma.project.findMany();
  const project = projects.find((item) => item.code === PROJECT_CODE);
  check("Only Hanoi project remains", projects.length === 1 && !!project, `Projects: ${projects.map((item) => item.code).join(", ")}`, `Unexpected projects: ${JSON.stringify(projects)}`);
  if (!project) return printAndExit();

  const projectSuppliers = await prisma.supplier.findMany({});

  const [
    members,
    folders,
    documents,
    templates,
    items,
    entries,
    reports,
    reportAttachments,
    materialItems,
    materialMovements,
    materialRequests,
    contracts,
    paymentRequests,
    paymentPlans,
    approvals,
  ] = await Promise.all([
    prisma.projectMember.findMany({ where: { projectId: project.id, deletedAt: null }, include: { user: true } }),
    prisma.documentFolder.findMany({ where: { projectId: project.id, deletedAt: null } }),
    prisma.document.findMany({ where: { projectId: project.id, deletedAt: null }, include: { folder: true } }),
    prisma.fieldProgressTemplate.findMany({ where: { projectId: project.id, deletedAt: null } }),
    prisma.fieldProgressItem.findMany({ where: { projectId: project.id, deletedAt: null } }),
    prisma.fieldProgressEntry.findMany({ where: { projectId: project.id, deletedAt: null }, include: { item: true } }),
    prisma.siteReport.findMany({ where: { projectId: project.id, deletedAt: null }, include: { lines: true } }),
    prisma.siteReportAttachment.findMany({ where: { report: { projectId: project.id } } }),
    prisma.materialItem.findMany({ where: { projectId: project.id } }),
    prisma.materialMovement.findMany({ where: { projectId: project.id }, include: { materialItem: true } }),
    prisma.materialRequest.findMany({ where: { projectId: project.id, deletedAt: null }, include: { items: true } }),
    prisma.contract.findMany({ where: { projectId: project.id, deletedAt: null } }),
    prisma.paymentRequest.findMany({ where: { projectId: project.id, deletedAt: null } }),
    prisma.paymentPlan.findMany({ where: { projectId: project.id } }),
    prisma.approvalRequest.findMany({ where: { projectId: project.id, deletedAt: null } }),
  ]);

  check("Members seeded", members.length >= 8, `${members.length} members`);
  check("Document folders seeded", folders.length >= 30, `${folders.length} folders`);
  check("Document metadata seeded", documents.length >= 10, `${documents.length} documents`);
  check("Field template seeded", templates.length === 1, `${templates.length} templates`);
  check("Field progress master seeded", items.filter((item) => item.itemType === "WORK").length >= 30, `${items.length} total field items`);
  check("Daily entries seeded", entries.length >= 35, `${entries.length} field entries`);
  check("Reports seeded", reports.length >= 15, `${reports.length} reports`);
  check("Materials seeded", materialItems.length >= 10 && materialMovements.length >= 10 && materialRequests.length >= 2, `${materialItems.length} materials, ${materialMovements.length} movements, ${materialRequests.length} requests`);
  check("Contracts seeded", contracts.length >= 5, `${contracts.length} contracts`);
  check("Payments seeded", paymentRequests.length >= 5 && paymentPlans.length >= 4, `${paymentRequests.length} requests, ${paymentPlans.length} plans`);
  check("Approvals seeded", approvals.length >= 5, `${approvals.length} approvals`);

  const folderIds = new Set(folders.map((folder) => folder.id));
  check("Documents scoped to project folders", documents.every((doc) => doc.projectId === project.id && folderIds.has(doc.folderId)), "All documents point to Hanoi folders");

  const invalidDocumentPaths = documents.filter((doc) => path.isAbsolute(doc.storagePath) || doc.storagePath.includes(".."));
  const missingDocumentFiles = documents.filter((doc) => !fs.existsSync(resolveStoragePath(doc.storagePath)));
  check("Document paths are relative and safe", invalidDocumentPaths.length === 0, "No absolute/path-traversal document paths", invalidDocumentPaths.map((doc) => doc.storagePath).join(", "));
  check("Document physical files exist", missingDocumentFiles.length === 0, "All document sample files exist", missingDocumentFiles.map((doc) => doc.storagePath).join(", "));

  const invalidAttachmentPaths = reportAttachments.filter((attachment) => path.isAbsolute(attachment.storagePath) || attachment.storagePath.includes(".."));
  const missingAttachmentFiles = reportAttachments.filter((attachment) => !fs.existsSync(resolveStoragePath(attachment.storagePath)));
  check("Report attachment paths are relative and safe", invalidAttachmentPaths.length === 0, "No unsafe report attachment paths", invalidAttachmentPaths.map((item) => item.storagePath).join(", "));
  check("Report attachment files exist", missingAttachmentFiles.length === 0, "All report attachment sample files exist", missingAttachmentFiles.map((item) => item.storagePath).join(", "));

  const itemById = new Map(items.map((item) => [item.id, item]));
  const entrySums = await prisma.fieldProgressEntry.groupBy({
    by: ["itemId"],
    where: { projectId: project.id, deletedAt: null },
    _sum: { quantity: true },
  });
  const overDesign = entrySums.filter((sum) => {
    const item = itemById.get(sum.itemId);
    if (!item?.designQuantity || !sum._sum.quantity) return false;
    return new Prisma.Decimal(sum._sum.quantity).gt(item.designQuantity);
  });
  check("Daily quantities do not exceed design quantities", overDesign.length === 0, "No cumulative over-design field item", overDesign.map((item) => item.itemId).join(", "));

  const reportLineBadScope = reports.flatMap((report) => report.lines).filter((line) => line.projectId !== project.id);
  check("Report lines scoped to project", reportLineBadScope.length === 0, "All report lines scoped to Hanoi project");

  const paymentRequestMismatch = paymentRequests.filter((pr) => {
    if (!pr.contractId) return false;
    const contract = contracts.find((c) => c.id === pr.contractId);
    return contract && pr.supplierId !== contract.supplierId;
  });
  check("Payment requests have matching supplier", paymentRequestMismatch.length === 0, "No supplier mismatch in payment requests", paymentRequestMismatch.map((pr) => pr.requestCode).join(", "));

  const materialBadScope = materialMovements.filter((movement) => movement.materialItem.projectId !== project.id);
  check("Material movements scoped to project items", materialBadScope.length === 0, "All material movements point to Hanoi material items");

  const hasVietnamese = (text: string | null | undefined) => {
    if (!text) return false;
    return /[àáãạảăắằẳẵặâấầẩẫậèéẹẻẽêềếểễệđìíĩỉịòóõọỏôốồổỗộơớờởỡợùúũụủưứừửữựỳýỵỷỹÀÁÃẠẢĂẮẰẲẴẶÂẤẦẨẪẬÈÉẸẺẼÊỀẾỂỄỆĐÌÍĨỈỊÒÓÕỌỎÔỐỒỔỖỘƠỚỜỞMỠỢÙÚŨỤỦƯỨỪỬỮỰỲÝỴỶỸ]/u.test(text);
  };
  
  const hasMojibake = (text: string | null | undefined) => {
    if (!text) return false;
    return /CÃ|Há»|Ä‘|Æ°|Ã¡|Ã©/.test(text);
  };

  const hasUnaccentedPhrases = (text: string | null | undefined) => {
    if (!text) return false;
    // Bỏ qua các text thuần kỹ thuật
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

  // 1. Mojibake check
  const allTexts = [
    project.name, project.location, project.description,
    ...projectSuppliers.map(s => s.name),
    ...materialItems.map(m => m.name),
    ...reports.map(r => r.summary),
    ...reports.map(r => r.title)
  ];
  const mojibakes = allTexts.filter(t => hasMojibake(t));
  check("No mojibake detected", mojibakes.length === 0, "All text fields are clean", `Found mojibake in: ${mojibakes.join(", ")}`);

  // 2. Unaccented phrases check
  const unaccented = allTexts.filter(t => hasUnaccentedPhrases(t));
  check("No unaccented phrases", unaccented.length === 0, "All UI text is accented", `Found unaccented in: ${unaccented.join(", ")}`);

  // 3. Must have Vietnamese accents
  check("Project name has diacritics", hasVietnamese(project.name), "Project name has Vietnamese accents");
  check("Project location has diacritics", hasVietnamese(project.location), "Project location has Vietnamese accents");
  
  const vnSuppliers = projectSuppliers.filter(s => hasVietnamese(s.name));
  check("Supplier display names have diacritics", vnSuppliers.length > 0, "Suppliers have Vietnamese accents");

  const vnMaterials = materialItems.filter(m => hasVietnamese(m.name));
  check("Material names have diacritics", vnMaterials.length > 0, `${vnMaterials.length} material items have Vietnamese accents`);

  const vnContracts = contracts.filter(c => hasVietnamese(c.name));
  check("Contract names have diacritics", vnContracts.length > 0, "Contracts have Vietnamese accents");

  const vnPayments = paymentRequests.filter(p => hasVietnamese(p.title));
  check("Payment titles have diacritics", vnPayments.length > 0, "Payments have Vietnamese accents");

  const vnReports = reports.filter(r => hasVietnamese(r.summary) || hasVietnamese(r.title));
  check("Report content has diacritics", vnReports.length > 0, `${vnReports.length} reports have Vietnamese accents`);

  const vnApprovals = approvals.filter(a => hasVietnamese(a.title));
  check("Approval titles have diacritics", vnApprovals.length > 0, "Approvals have Vietnamese accents");

  const hanoiChats = await prisma.chatMessage.findMany({ where: { content: { contains: "HN-TH-2026-001" } } });
  const vnChats = hanoiChats.filter(c => hasVietnamese(c.content));
  check("Chat messages have diacritics", vnChats.length > 0, "Chat messages have Vietnamese accents");

  printAndExit();
}

function printAndExit() {
  console.log(`=== HANOI PROJECT QA CHECK (${PROJECT_CODE}) ===`);
  for (const item of checks) {
    console.log(`${item.ok ? "PASS" : "FAIL"} | ${item.name} | ${item.detail}`);
  }
  const failures = checks.filter((item) => !item.ok);
  console.log(`QA RESULT: ${failures.length === 0 ? "PASS" : "FAIL"} (${checks.length - failures.length}/${checks.length} passed)`);
  if (failures.length > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
