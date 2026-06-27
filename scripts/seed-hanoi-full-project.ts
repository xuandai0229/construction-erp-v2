import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { Pool } from "pg";
import * as XLSX from "xlsx";

dotenv.config();

const PROJECT_CODE = "HN-TH-2026-001";
const PROJECT_NAME = "Công trình Nhà văn phòng kết hợp căn hộ dịch vụ Tây Hồ";
const DEFAULT_PASSWORD = process.env.HANOI_SEED_USER_PASSWORD || "HanoiSeed@2026!";
const storageRoot = path.resolve(process.env.STORAGE_ROOT || path.join(process.cwd(), "storage"));

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

if (process.env.NODE_ENV === "production" && process.env.ALLOW_HANOI_SEED_PRODUCTION !== "true") {
  throw new Error("Refusing to seed production without ALLOW_HANOI_SEED_PRODUCTION=true");
}

const pool = new Pool({ connectionString: requireEnv("DATABASE_URL") });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function d(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function dec(value: number | string) {
  return new Prisma.Decimal(value);
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function sha256(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function mimeFor(ext: string) {
  const normalized = ext.toLowerCase();
  if (normalized === ".pdf") return "application/pdf";
  if (normalized === ".jpg" || normalized === ".jpeg") return "image/jpeg";
  if (normalized === ".png") return "image/png";
  if (normalized === ".dwg") return "application/acad";
  if (normalized === ".xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (normalized === ".docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (normalized === ".xml") return "application/xml";
  return "application/octet-stream";
}

function createFileBuffer(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".pdf") {
    return Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n");
  }
  if (ext === ".jpg" || ext === ".jpeg") {
    return Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", "base64");
  }
  if (ext === ".png") {
    return Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64");
  }
  if (ext === ".xlsx") {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Ma", "Noi dung", "Gia tri"],
      ["HN-TH", "Ho so mau", 1],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Hanoi");
    return XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer;
  }
  return Buffer.from(`Sample construction file for ${PROJECT_CODE}: ${fileName}\n`);
}

async function removeExistingProject(projectId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.auditLog.deleteMany({ where: { OR: [{ projectId }, { entityId: projectId }] } });
    await tx.fieldMaterialRequestItem.deleteMany({ where: { request: { projectId } } });
    await tx.fieldMaterialRequest.deleteMany({ where: { projectId } });
    await tx.materialRequestItem.deleteMany({ where: { materialRequest: { projectId } } });
    await tx.materialRequest.deleteMany({ where: { projectId } });
    await tx.siteReportAttachment.deleteMany({ where: { report: { projectId } } });
    await tx.siteReportPhoto.deleteMany({ where: { report: { projectId } } });
    await tx.siteReportLine.deleteMany({ where: { projectId } });
    await tx.siteReport.deleteMany({ where: { projectId } });
    await tx.paymentRecord.deleteMany({ where: { projectId } });
    await tx.paymentPlan.deleteMany({ where: { projectId } });
    await tx.paymentRequest.deleteMany({ where: { projectId } });
    await tx.approvalRequest.deleteMany({ where: { projectId } });
    await tx.contract.deleteMany({ where: { projectId } });
    await tx.materialMovement.deleteMany({ where: { projectId } });
    await tx.projectMaterialStock.deleteMany({ where: { projectId } });
    await tx.materialItem.deleteMany({ where: { projectId } });
    await tx.fieldProgressEntry.deleteMany({ where: { projectId } });
    await tx.fieldProgressItem.deleteMany({ where: { projectId } });
    await tx.fieldProgressTemplate.deleteMany({ where: { projectId } });
    await tx.document.deleteMany({ where: { projectId } });
    await tx.documentFolder.deleteMany({ where: { projectId } });
    await tx.wBSItem.deleteMany({ where: { projectId, parentId: { not: null } } });
    await tx.wBSItem.deleteMany({ where: { projectId } });
    await tx.projectMember.deleteMany({ where: { projectId } });
    await tx.project.delete({ where: { id: projectId } });
    await tx.chatMessage.deleteMany({ where: { content: { contains: PROJECT_CODE } } });
  });
}

async function upsertSeedUsers() {
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const admin =
    (await prisma.user.findFirst({
      where: { role: "ADMIN", isActive: true, deletedAt: null },
      orderBy: { createdAt: "asc" },
    })) ||
    (await prisma.user.upsert({
      where: { email: "admin@construction.local" },
      update: { role: "ADMIN", isActive: true },
      create: {
        email: "admin@construction.local",
        username: "dev_admin_test",
        name: "System Admin",
        role: "ADMIN",
        password: hashedPassword,
        isActive: true,
      },
    }));

  const users = [
    ["director", "hanoi.director@construction.local", "ban_giam_doc_hanoi", "Ban giám đốc - Phạm Minh Đức", "DIRECTOR", "0902001001"],
    ["pm", "hanoi.pm@construction.local", "gd_du_an_tay_ho", "Nguyễn Đức Anh - Giám đốc dự án", "MANAGER", "0902001002"],
    ["commander", "hanoi.commander@construction.local", "chi_huy_tay_ho", "Trần Quang Hiếu - Chỉ huy trưởng", "CHIEF_COMMANDER", "0902001003"],
    ["engineer", "hanoi.engineer@construction.local", "ky_su_hien_truong_tay_ho", "Lê Minh Quân - Kỹ sư hiện trường", "ENGINEER", "0902001004"],
    ["qs", "hanoi.qs@construction.local", "ky_su_qs_tay_ho", "Đỗ Thu Hà - Kỹ sư QS", "ENGINEER", "0902001005"],
    ["accountant", "hanoi.accountant@construction.local", "ke_toan_tay_ho", "Vũ Mai Linh - Kế toán công trình", "ACCOUNTANT", "0902001006"],
    ["storekeeper", "hanoi.storekeeper@construction.local", "thu_kho_tay_ho", "Hoàng Văn Phúc - Thủ kho", "STAFF", "0902001007"],
    ["safety", "hanoi.safety@construction.local", "hse_tay_ho", "Phạm Ngọc Sơn - Cán bộ an toàn", "STAFF", "0902001008"],
    ["viewer", "hanoi.viewer@construction.local", "viewer_tay_ho", "Đại diện chủ đầu tư", "STAFF", "0902001009"],
  ] as const;

  const result: Record<string, { id: string; name: string; email: string }> = {
    admin: { id: admin.id, name: admin.name, email: admin.email },
  };

  for (const [key, email, username, name, role, phone] of users) {
    const user = await prisma.user.upsert({
      where: { email },
      update: { username, name, role, phone, isActive: true, password: hashedPassword },
      create: { email, username, name, role, phone, isActive: true, password: hashedPassword },
    });
    result[key] = { id: user.id, name: user.name, email: user.email };
  }
  return result;
}

async function main() {
  console.log(`=== SEED FULL HANOI PROJECT ${PROJECT_CODE} ===`);
  const existing = await prisma.project.findUnique({ where: { code: PROJECT_CODE }, select: { id: true } });
  if (existing) {
    console.log(`Existing ${PROJECT_CODE} found; removing project-scoped data for idempotent reseed.`);
    await removeExistingProject(existing.id);
  }

  await prisma.systemSetting.updateMany({
    data: {
      maxUploadSizeMb: 0,
      allowedExtensions: "pdf, doc, docx, xls, xlsx, dwg, dxf, jpg, jpeg, png, heic, webp, xml",
    },
  });

  const users = await upsertSeedUsers();

  const project = await prisma.project.create({
    data: {
      code: PROJECT_CODE,
      name: PROJECT_NAME,
      description:
        "Dự án dân dụng gồm 02 tầng hầm, 09 tầng nổi và 01 tum kỹ thuật; móng cọc khoan nhồi, kết cấu bê tông cốt thép toàn khối, hoàn thiện văn phòng - căn hộ dịch vụ - MEP/PCCC - cảnh quan.",
      investor: "Công ty Cổ phần Đầu tư Tây Hồ Xanh",
      location: "Số 88 đường Võ Chí Công, phường Xuân La, quận Tây Hồ, Hà Nội",
      status: "ACTIVE",
      startDate: d("2026-01-15"),
      endDate: d("2026-12-30"),
      budget: dec("86500000000"),
    },
  });

  const memberSeeds = [
    ["admin", "PROJECT_MANAGER", "Admin hệ thống có quyền kiểm tra toàn bộ dự án"],
    ["director", "VIEWER", "Ban giám đốc theo dõi và phê duyệt"],
    ["pm", "PROJECT_MANAGER", "Giám đốc dự án phụ trách tổng thể"],
    ["commander", "CHIEF_COMMANDER", "Chỉ huy trưởng điều phối hiện trường"],
    ["engineer", "SUPERVISOR", "Kỹ sư hiện trường phụ trách nhật ký và khối lượng"],
    ["qs", "QA_QC", "Kỹ sư QS kiểm tra khối lượng và hồ sơ thanh toán"],
    ["accountant", "VIEWER", "Kế toán công trình theo dõi hợp đồng và thanh toán"],
    ["storekeeper", "SUPERVISOR", "Thủ kho quản lý nhập xuất vật tư"],
    ["safety", "HSE", "Cán bộ an toàn HSE"],
    ["viewer", "VIEWER", "Đại diện chủ đầu tư"],
  ] as const;
  for (const [key, role, note] of memberSeeds) {
    await prisma.projectMember.create({
      data: { projectId: project.id, userId: users[key].id, role, assignedById: users.admin.id, note, isActive: true },
    });
  }

  const supplierSeeds = [
    ["THX", "Công ty Cổ phần Đầu tư Tây Hồ Xanh", "0109865001", "Số 88 Võ Chí Công, Tây Hồ, Hà Nội", "02438260001", "legal@tayhoxanh.vn", "Bà Nguyễn Thu Trang"],
    ["MINHAN", "Công ty TNHH Xây dựng và Cơ điện Minh An", "0109865002", "Lô C2 KCN Từ Liêm, Hà Nội", "02438260002", "pm@minhanmep.vn", "Ông Trần Minh An"],
    ["HOAPHAT", "Tập đoàn Hòa Phát - Chi nhánh Hà Nội", "0109865003", "66 Nguyễn Du, Hai Bà Trưng, Hà Nội", "02438260003", "sales.hanoi@hoaphat.com.vn", "Ông Vũ Quốc Bảo"],
    ["BIMSON", "Công ty Xi măng Bỉm Sơn", "0109865004", "Thanh Hóa - VP Hà Nội", "02438260004", "sales@ximangbimson.vn", "Bà Lê Thị Hạnh"],
    ["VIGLACERA", "Tổng công ty Viglacera", "0109865005", "Số 1 Thăng Long, Hà Nội", "02438260005", "sales@viglacera.vn", "Ông Nguyễn Tiến Đạt"],
    ["CADIVI", "Công ty CP Dây cáp điện Việt Nam - CADIVI", "0109865006", "Kho Hà Đông, Hà Nội", "02438260006", "saleshn@cadivi.vn", "Bà Phạm Diệu Linh"],
    ["BINHMINH", "Công ty CP Nhựa Bình Minh", "0109865007", "Kho Long Biên, Hà Nội", "02438260007", "hn@binhminhplastic.com", "Ông Hoàng Minh"],
    ["JOTUN", "Công ty TNHH Sơn Jotun Việt Nam", "0109865008", "Văn phòng Mỹ Đình, Hà Nội", "02438260008", "project@jotun.vn", "Bà Đỗ Mai Phương"],
  ];
  const suppliers: Record<string, string> = {};
  for (const [code, name, taxCode, address, phone, email, contactPerson] of supplierSeeds) {
    const supplier = await prisma.supplier.upsert({
      where: { code },
      update: { name, taxCode, address, phone, email, contactPerson, deletedAt: null },
      create: { code, name, taxCode, address, phone, email, contactPerson },
    });
    suppliers[code] = supplier.id;
  }

  const folders: Record<string, string> = {};
  async function createFolder(name: string, parentKey?: string) {
    const folder = await prisma.documentFolder.create({
      data: { projectId: project.id, name, parentId: parentKey ? folders[parentKey] : null },
    });
    folders[name] = folder.id;
    return folder;
  }

  const folderTree: Record<string, string[]> = {
    "01_Hop_dong_Phap_ly": ["01_Hop_dong", "02_Phu_luc_hop_dong", "03_Bao_lanh_Bao_hiem"],
    "02_Ban_ve_Thiet_ke": ["01_Kien_truc", "02_Ket_cau", "03_MEP", "04_PCCC", "05_Shopdrawing"],
    "03_Bien_ban_Nghiem_thu": ["01_Nghiem_thu_vat_lieu", "02_Nghiem_thu_cong_viec", "03_Nghiem_thu_giai_doan"],
    "04_Vat_tu_Thiet_bi": ["01_Phieu_nhap_kho", "02_Phieu_xuat_kho", "03_Hoa_don_Chung_tu", "04_Bao_gia_NCC"],
    "05_Hinh_anh_Tien_do": ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"],
    "06_Bao_cao_Hien_truong": ["Bao_cao_ngay", "Bao_cao_tuan", "Su_co_An_toan"],
    "07_Thanh_toan_Quyet_toan": ["Dot_1_Tam_ung", "Dot_2_Mong_ham", "Dot_3_Than_tang_1_3", "Ho_so_thanh_toan"],
  };
  for (const [root, children] of Object.entries(folderTree)) {
    await createFolder(root);
    for (const child of children) await createFolder(child, root);
  }

  async function createDocument(folderName: string, fileName: string, uploadedById = users.engineer.id, status: "SUBMITTED" | "APPROVED" | "DRAFT" = "SUBMITTED") {
    const folderId = folders[folderName];
    if (!folderId) throw new Error(`Missing folder ${folderName}`);
    const buffer = createFileBuffer(fileName);
    const storedName = `${Date.now()}_${safeFileName(fileName)}`;
    const relativePath = path.join("projects", PROJECT_CODE, "documents", folderId, storedName).replace(/\\/g, "/");
    const absolutePath = path.join(storageRoot, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, buffer);
    const ext = path.extname(fileName).toLowerCase();
    return prisma.document.create({
      data: {
        projectId: project.id,
        folderId,
        originalName: fileName,
        displayName: fileName,
        documentType: null,
        status,
        metadata: { source: "hanoi-full-seed", note: `Ho so mau ${PROJECT_CODE}` },
        fileHash: sha256(buffer),
        storedName,
        mimeType: mimeFor(ext),
        extension: ext,
        size: buffer.length,
        storagePath: relativePath,
        uploadedById,
        reviewedById: status === "APPROVED" ? users.pm.id : null,
        reviewedAt: status === "APPROVED" ? new Date() : null,
      },
    });
  }

  await createDocument("01_Hop_dong", "HDTC-HN-TH-2026-001-Hop-dong-thi-cong.pdf", users.accountant.id, "APPROVED");
  await createDocument("02_Phu_luc_hop_dong", "PLHD-01-HNTH-Dieu-chinh-tien-do.pdf", users.accountant.id);
  await createDocument("03_Bao_lanh_Bao_hiem", "BLTH-HNTH-2026-Bao-lanh-thuc-hien-hop-dong.pdf", users.accountant.id);
  await createDocument("02_Ket_cau", "BV-KC-Rev03-Ket-cau-mong-tang-ham.dwg", users.engineer.id, "APPROVED");
  await createDocument("03_MEP", "BV-MEP-Rev02-He-thong-cap-thoat-nuoc.pdf", users.engineer.id);
  await createDocument("04_PCCC", "BV-PCCC-Rev01-Mat-bang-sprinkler-tang-1.pdf", users.engineer.id);
  await createDocument("02_Nghiem_thu_cong_viec", "BBNT-2026-03-18-Nghiem-thu-cot-thep-san-ham-B1.pdf", users.qs.id, "APPROVED");
  await createDocument("01_Phieu_nhap_kho", "PNK-2026-04-05-Thep-D16-D20.pdf", users.storekeeper.id);
  await createDocument("03_Hoa_don_Chung_tu", "HDVAT-2026-04-06-Xi-mang-Bim-Son.pdf", users.accountant.id);
  await createDocument("2026-05", "IMG-2026-05-22-Thi-cong-cot-tang-2.jpg", users.engineer.id);
  await createDocument("Bao_cao_ngay", "BCHT-2026-06-15-Bao-cao-ngay.pdf", users.commander.id);
  await createDocument("Ho_so_thanh_toan", "HSTT-Dot-3-Than-tang-1-3.xlsx", users.accountant.id, "DRAFT");

  const template = await prisma.fieldProgressTemplate.create({
    data: {
      projectId: project.id,
      name: "Bang khoi luong goc - HN-TH-2026-001",
      description: "Khoi luong thiet ke phuc vu nhap san luong hien truong hang ngay",
      status: "ACTIVE",
      createdById: users.qs.id,
    },
  });

  const itemByCode = new Map<string, { id: string; designQuantity: Prisma.Decimal | null; unit: string | null; workContent: string | null }>();
  const groups = [
    ["G01", "Chuan bi mat bang"],
    ["G02", "Coc khoan nhoi"],
    ["G03", "Tang ham"],
    ["G04", "Phan than"],
    ["G05", "Xay to hoan thien"],
    ["G06", "MEP PCCC"],
  ];
  let sortOrder = 1;
  for (const [code, name] of groups) {
    const group = await prisma.fieldProgressItem.create({
      data: { projectId: project.id, templateId: template.id, itemType: "GROUP", code, categoryName: name, sortOrder: sortOrder++, level: 0, createdById: users.qs.id },
    });
    itemByCode.set(code, { id: group.id, designQuantity: null, unit: null, workContent: name });
  }

  const works = [
    ["CB-001", "G01", "Rao chan cong truong", "m", 180, 145000],
    ["CB-002", "G01", "Nhà tạm, kho bãi", "m2", 260, 1850000],
    ["CB-003", "G01", "Dinh vi tim truc", "diem", 64, 650000],
    ["CB-004", "G01", "Lap dat dien nuoc tam", "goi", 1, 185000000],
    ["CKN-001", "G02", "Coc D800 sau 45m", "coc", 72, 118000000],
    ["CKN-002", "G02", "Sieu am coc", "coc", 72, 4200000],
    ["CKN-003", "G02", "Thi nghiem PIT", "coc", 20, 3100000],
    ["CKN-004", "G02", "Be tong thuong pham coc", "m3", 1820, 1380000],
    ["TH-001", "G03", "Dao dat ho mong", "m3", 18500, 95000],
    ["TH-002", "G03", "Be tong lot mong M100", "m3", 420, 1120000],
    ["TH-003", "G03", "Cốt thép móng, dầm móng", "kg", 385000, 17800],
    ["TH-004", "G03", "Be tong mong M350", "m3", 2850, 1510000],
    ["TH-005", "G03", "Chong tham tang ham", "m2", 4600, 225000],
    ["TH-006", "G03", "Van khuon vach ham B2-B1", "m2", 5800, 265000],
    ["TH-007", "G03", "Be tong san ham B1", "m3", 940, 1490000],
    ["PT-001", "G04", "Cốt thép cột/vách tầng 1-3", "kg", 210000, 18200],
    ["PT-002", "G04", "Cop pha cot/vach tang 1-3", "m2", 7200, 275000],
    ["PT-003", "G04", "Be tong cot/vach tang 1-3", "m3", 1150, 1520000],
    ["PT-004", "G04", "Cốt thép sàn tầng 1-3", "kg", 260000, 18100],
    ["PT-005", "G04", "Cop pha san tang 1-3", "m2", 9600, 258000],
    ["PT-006", "G04", "Be tong san tang 1-3", "m3", 1850, 1500000],
    ["PT-007", "G04", "Cốt thép tầng 4", "kg", 72000, 18200],
    ["PT-008", "G04", "Be tong san tang 4", "m3", 560, 1500000],
    ["HT-001", "G05", "Xay tuong gach AAC", "m2", 8500, 185000],
    ["HT-002", "G05", "To trat tuong trong", "m2", 16000, 145000],
    ["HT-003", "G05", "Lang nen", "m2", 8800, 125000],
    ["HT-004", "G05", "Op lat gach", "m2", 6200, 285000],
    ["HT-005", "G05", "Sơn bả hoàn thiện", "m2", 22000, 82000],
    ["HT-006", "G05", "Lap dat cua nhom kinh", "m2", 2100, 1850000],
    ["MEP-001", "G06", "Ống cấp nước PPR", "m", 3200, 98000],
    ["MEP-002", "G06", "Ống thoát nước uPVC", "m", 2850, 116000],
    ["MEP-003", "G06", "Ống luồn dây điện", "m", 18000, 18500],
    ["MEP-004", "G06", "Cap dien dong luc", "m", 9500, 76000],
    ["MEP-005", "G06", "Dau bao chay", "cai", 420, 385000],
    ["MEP-006", "G06", "Sprinkler", "cai", 680, 245000],
    ["MEP-007", "G06", "Tu dien tang", "tu", 22, 28500000],
    ["MEP-008", "G06", "Quat thong gio tang ham", "bo", 18, 42000000],
  ] as const;

  for (const [code, parentCode, name, unit, quantity] of works) {
    const parent = itemByCode.get(parentCode);
    if (!parent) throw new Error(`Missing parent ${parentCode}`);
    const item = await prisma.fieldProgressItem.create({
      data: {
        projectId: project.id,
        templateId: template.id,
        parentId: parent.id,
        itemType: "WORK",
        code,
        workContent: name,
        constructionCrew: code.startsWith("MEP") ? "Doi MEP Minh An" : code.startsWith("PT") ? "Doi ket cau so 2" : "Doi thi cong chinh",
        unit,
        designQuantity: quantity,
        status: code.startsWith("HT") ? "PLANNED" : "IN_PROGRESS",
        sortOrder: sortOrder++,
        level: 1,
        createdById: users.qs.id,
      },
    });
    itemByCode.set(code, { id: item.id, designQuantity: item.designQuantity, unit: item.unit, workContent: item.workContent });
  }

  for (const [code, parentCode, name, unit, quantity] of works.slice(0, 18)) {
    const parent = itemByCode.get(parentCode);
    await prisma.wBSItem.create({
      data: {
        projectId: project.id,
        parentId: null,
        code: `WBS-${code}`,
        name,
        unit,
        designQuantity: quantity,
        plannedStartDate: d("2026-01-15"),
        plannedEndDate: d("2026-09-30"),
        status: "IN_PROGRESS",
        createdById: users.qs.id,
        description: `WBS sync tu field progress ${parentCode}`,
      },
    });
  }

  const entrySeeds: Array<[string, string, number, "DRAFT" | "SUBMITTED" | "APPROVED", string?]> = [
    ["2026-01-16", "CB-001", 80, "APPROVED"], ["2026-01-18", "CB-001", 100, "APPROVED"], ["2026-01-20", "CB-002", 140, "APPROVED"], ["2026-01-22", "CB-002", 120, "APPROVED"], ["2026-01-25", "CB-003", 64, "APPROVED"],
    ["2026-02-03", "CKN-001", 8, "APPROVED"], ["2026-02-07", "CKN-001", 10, "APPROVED"], ["2026-02-12", "CKN-001", 12, "APPROVED"], ["2026-02-18", "CKN-001", 14, "APPROVED"], ["2026-02-24", "CKN-001", 12, "APPROVED"], ["2026-02-26", "CKN-002", 36, "SUBMITTED"], ["2026-02-28", "CKN-003", 12, "APPROVED"],
    ["2026-03-05", "TH-001", 2800, "APPROVED"], ["2026-03-09", "TH-001", 3200, "APPROVED"], ["2026-03-14", "TH-001", 2500, "APPROVED", "Mua nho, giam nang suat buoi chieu"], ["2026-03-18", "TH-002", 220, "APPROVED"], ["2026-03-21", "TH-002", 200, "APPROVED"], ["2026-03-25", "TH-003", 68000, "APPROVED"], ["2026-03-29", "TH-003", 75000, "SUBMITTED"],
    ["2026-04-02", "TH-003", 82000, "APPROVED"], ["2026-04-06", "TH-004", 580, "APPROVED"], ["2026-04-10", "TH-004", 620, "APPROVED"], ["2026-04-15", "TH-005", 1200, "APPROVED"], ["2026-04-19", "TH-006", 1800, "APPROVED"], ["2026-04-23", "TH-007", 460, "APPROVED"], ["2026-04-28", "TH-007", 480, "SUBMITTED"],
    ["2026-05-03", "PT-001", 45000, "APPROVED"], ["2026-05-07", "PT-002", 1600, "APPROVED"], ["2026-05-11", "PT-003", 260, "APPROVED"], ["2026-05-15", "PT-004", 62000, "APPROVED"], ["2026-05-20", "PT-005", 2100, "APPROVED"], ["2026-05-24", "PT-006", 380, "APPROVED"], ["2026-05-28", "PT-004", 58000, "SUBMITTED"],
    ["2026-06-02", "PT-001", 52000, "APPROVED"], ["2026-06-05", "PT-002", 1800, "APPROVED"], ["2026-06-09", "PT-003", 310, "APPROVED"], ["2026-06-12", "PT-005", 1900, "APPROVED"], ["2026-06-15", "PT-006", 420, "APPROVED"], ["2026-06-18", "MEP-003", 2200, "SUBMITTED"], ["2026-06-21", "MEP-001", 360, "DRAFT"], ["2026-06-25", "PT-007", 18000, "DRAFT", "Dang lap nhap, chua gui duyet"],
  ];

  for (const [date, code, quantity, status, note] of entrySeeds) {
    const item = itemByCode.get(code);
    if (!item) throw new Error(`Missing item ${code}`);
    await prisma.fieldProgressEntry.create({
      data: {
        projectId: project.id,
        templateId: template.id,
        itemId: item.id,
        entryDate: d(date),
        quantity,
        status,
        note,
        issueNote: note?.includes("Mua") ? "Mua lon buoi chieu, tam dung do be tong sau 15h30" : null,
        proposalNote: note ? "Dieu chinh ke hoach ca sang ngay tiep theo" : null,
        createdById: users.engineer.id,
        submittedAt: status === "SUBMITTED" || status === "APPROVED" ? d(date) : null,
        approvedById: status === "APPROVED" ? users.commander.id : null,
        approvedAt: status === "APPROVED" ? d(date) : null,
      },
    });
  }

  const reportDates = ["2026-01-16", "2026-01-25", "2026-02-07", "2026-02-18", "2026-02-26", "2026-03-05", "2026-03-14", "2026-03-25", "2026-04-06", "2026-04-15", "2026-04-23", "2026-05-03", "2026-05-15", "2026-05-24", "2026-06-02", "2026-06-09", "2026-06-15", "2026-06-18", "2026-06-21", "2026-06-25"];
  let reportIndex = 1;
  for (const date of reportDates) {
    const status = reportIndex % 11 === 0 ? "REVISION_REQUESTED" : reportIndex % 7 === 0 ? "SUBMITTED" : reportIndex % 5 === 0 ? "DRAFT" : "APPROVED";
    const weatherCondition = date === "2026-03-14" || date === "2026-06-21" ? "HEAVY_RAIN" : reportIndex % 4 === 0 ? "LIGHT_RAIN" : "CLOUDY";
    const report = await prisma.siteReport.create({
      data: {
        reportNo: `BCHT-HNTH-2026-${String(reportIndex).padStart(3, "0")}`,
        type: reportIndex % 6 === 0 ? "WEEKLY" : "DAILY",
        projectId: project.id,
        title: `Báo cáo hiện trường ngày ${date}`,
        reportDate: d(date),
        weekStartDate: reportIndex % 6 === 0 ? d(date) : null,
        weekEndDate: reportIndex % 6 === 0 ? d(date) : null,
        weatherCondition,
        weatherTemperature: weatherCondition === "HEAVY_RAIN" ? 25 : 31,
        weatherNote: weatherCondition === "HEAVY_RAIN" ? "Mưa lớn buổi chiều, ưu tiên gia công thép tại bãi" : "Thời tiết phù hợp thi công",
        summary: reportIndex % 3 === 0 ? "Thi công cốt thép dầm sàn khu trục A-D/1-5, nghiệm thu nội bộ đạt yêu cầu." : "Duy trì thi công theo kế hoạch, phối hợp TVGS kiểm tra vật liệu đầu vào.",
        materials: "Thép D16/D20, xi măng PCB40, bê tông thương phẩm, ống điện âm sàn.",
        labor: `${58 + reportIndex} công nhân, 6 kỹ sư, 2 cán bộ an toàn`,
        equipment: "02 cần cẩu tháp, 01 máy bơm bê tông, 03 máy cắt uốn thép, 04 xe trộn bê tông",
        quality: "Các hạng mục nghiệm thu nội bộ đạt yêu cầu, đã lưu biên bản và ảnh hiện trường.",
        issues: reportIndex === 17 ? "Nhà cung cấp giao thiếu 12 tấn thép D20 so với kế hoạch, đã lập phiếu chờ bổ sung." : weatherCondition === "HEAVY_RAIN" ? "Mưa lớn làm giảm năng suất, cần che chắn vật tư." : "Không có sự cố nghiêm trọng.",
        recommendations: "Bổ sung vật tư theo tiến độ và xác nhận lịch đổ bê tông trước 24h.",
        reporterName: users.commander.name,
        manpowerCount: 64 + reportIndex,
        status,
        createdById: users.commander.id,
        submittedAt: status !== "DRAFT" ? d(date) : null,
        approvedById: status === "APPROVED" ? users.pm.id : null,
        approvedAt: status === "APPROVED" ? d(date) : null,
      },
    });
    const linked = entrySeeds[Math.min(reportIndex - 1, entrySeeds.length - 1)];
    const item = itemByCode.get(linked[1]);
    await prisma.siteReportLine.create({
      data: {
        siteReportId: report.id,
        projectId: project.id,
        fieldProgressItemId: item?.id,
        workContent: item?.workContent || "Công việc hiện trường",
        area: reportIndex < 8 ? "Khu mong/tang ham" : reportIndex < 15 ? "Tang 1-2" : "Tang 3-4",
        constructionCrew: "Doi thi cong chinh",
        unit: item?.unit || "lan",
        designQuantity: item?.designQuantity || dec(1),
        quantityToday: dec(linked[2]),
        quantityBefore: dec(0),
        quantityCumulative: dec(linked[2]),
        progressPercent: item?.designQuantity ? dec(Math.min(100, (linked[2] / Number(item.designQuantity)) * 100).toFixed(2)) : dec(0),
        note: "Dong bo tu du lieu seed tien do hien truong",
      },
    });
    if (reportIndex % 4 === 0) {
      const fileName = `BCHT-${date}-anh-hien-truong.jpg`;
      const buffer = createFileBuffer(fileName);
      const relativePath = path.join("projects", PROJECT_CODE, "reports", report.id, safeFileName(fileName)).replace(/\\/g, "/");
      const absolutePath = path.join(storageRoot, relativePath);
      fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
      fs.writeFileSync(absolutePath, buffer);
      await prisma.siteReportAttachment.create({
        data: {
          reportId: report.id,
          kind: "PHOTO",
          fileName,
          originalName: fileName,
          mimeType: "image/jpeg",
          sizeBytes: buffer.length,
          storagePath: relativePath,
          publicUrl: null,
          caption: "Ảnh hiện trường kèm báo cáo",
        },
      });
    }
    reportIndex += 1;
  }

  const materialSeeds = [
    ["THEP-D10", "Thép D10 Hòa Phát", "kg", "Thép", 45000, 17800, 12000],
    ["THEP-D16", "Thép D16 Hòa Phát", "kg", "Thép", 82000, 18100, 18000],
    ["THEP-D20", "Thép D20 Hòa Phát", "kg", "Thép", 76000, 18300, 15000],
    ["THEP-D25", "Thép D25 Hòa Phát", "kg", "Thép", 42000, 18600, 8000],
    ["XM-PCB40", "Xi măng Bỉm Sơn PCB40", "bao", "Xi măng", 5200, 89000, 800],
    ["CAT-VANG", "Cát vàng sông Lô", "m3", "Vật liệu rời", 950, 285000, 120],
    ["DA-1X2", "Đá 1x2", "m3", "Vật liệu rời", 820, 305000, 100],
    ["GACH-AAC", "Gạch AAC 600x200x100", "vien", "Hoàn thiện", 26000, 18500, 3000],
    ["UPVC-D110", "Ống uPVC D110 Bình Minh", "m", "MEP", 1600, 69000, 250],
    ["DAY-CADIVI", "Dây điện Cadivi CV 2.5", "m", "MEP", 6200, 11500, 1000],
    ["SON-JOTUN", "Sơn lót/sơn phủ Jotun", "thung", "Hoàn thiện", 180, 1650000, 25],
  ] as const;
  const materialByCode: Record<string, string> = {};
  for (const [code, name, unit, group, importQty, unitPrice, minStock] of materialSeeds) {
    const material = await prisma.materialItem.create({ data: { projectId: project.id, code, name, unit, group, isActive: true } });
    materialByCode[code] = material.id;
    await prisma.materialMovement.create({
      data: { projectId: project.id, materialItemId: material.id, type: "IMPORT", quantity: importQty, unitPrice, movementDate: d("2026-04-05"), notes: `PNK-HNTH-2026-${code}` },
    });
    const exportQty = Math.round(Number(importQty) * 0.38);
    await prisma.materialMovement.create({
      data: { projectId: project.id, materialItemId: material.id, type: "EXPORT", quantity: exportQty, unitPrice, movementDate: d("2026-05-20"), notes: `PXK-HNTH-2026-${code}` },
    });
    await prisma.projectMaterialStock.create({
      data: { projectId: project.id, materialItemId: material.id, stock: Number(importQty) - exportQty, minStockLevel: minStock, lastUpdated: d("2026-06-25") },
    });
  }

  const mr1 = await prisma.materialRequest.create({
    data: { projectId: project.id, requestNo: "DMVT-HNTH-2026-0001", requestedById: users.storekeeper.id, requestDate: d("2026-04-01"), neededDate: d("2026-04-05"), status: "RECEIVED", priority: "HIGH", note: "Đề xuất mua thép đợt 1 phục vụ tầng hầm" },
  });
  await prisma.materialRequestItem.createMany({
    data: [
      { materialRequestId: mr1.id, materialCode: "THEP-D16", materialName: "Thép D16 Hòa Phát", unit: "kg", requestedQuantity: 82000, issuedQuantity: 70000, receivedQuantity: 82000, remainingQuantity: 12000, reason: "Cốt thép móng và dầm móng" },
      { materialRequestId: mr1.id, materialCode: "THEP-D20", materialName: "Thép D20 Hòa Phát", unit: "kg", requestedQuantity: 76000, issuedQuantity: 64000, receivedQuantity: 64000, remainingQuantity: 12000, reason: "Nhà cung cấp giao thiếu 12 tấn D20" },
    ],
  });
  const mr2 = await prisma.materialRequest.create({
    data: { projectId: project.id, requestNo: "DMVT-HNTH-2026-0002", requestedById: users.engineer.id, requestDate: d("2026-06-18"), neededDate: d("2026-06-25"), status: "SUBMITTED", priority: "MEDIUM", note: "Vật tư MEP âm sàn tầng 3" },
  });
  await prisma.materialRequestItem.createMany({
    data: [
      { materialRequestId: mr2.id, materialCode: "UPVC-D110", materialName: "Ống uPVC D110 Bình Minh", unit: "m", requestedQuantity: 380, issuedQuantity: 0, receivedQuantity: 0, remainingQuantity: 380, reason: "Thi công thoát nước âm sàn" },
      { materialRequestId: mr2.id, materialCode: "DAY-CADIVI", materialName: "Dây điện Cadivi CV 2.5", unit: "m", requestedQuantity: 1400, issuedQuantity: 0, receivedQuantity: 0, remainingQuantity: 1400, reason: "Thi công ống/đầu chờ điện nhẹ" },
    ],
  });

  const contracts = [
    ["HDTC-HNTH-2026-001", "Hợp đồng tổng thầu thi công xây dựng", "CLIENT", "ACTIVE", "86500000000", "THX", "2026-01-10", "2026-01-15", "2026-12-30"],
    ["HDCC-HNTH-2026-STEEL-002", "Hợp đồng cung cấp thép Hòa Phát", "SUPPLIER", "ACTIVE", "12800000000", "HOAPHAT", "2026-01-20", "2026-02-01", "2026-09-30"],
    ["HDCC-HNTH-2026-CONC-003", "Hợp đồng bê tông thương phẩm", "SUPPLIER", "ACTIVE", "9600000000", "MINHAN", "2026-02-05", "2026-02-10", "2026-10-30"],
    ["HDMEP-HNTH-2026-004", "Hợp đồng thi công MEP và PCCC", "SUBCONTRACTOR", "ACTIVE", "18400000000", "MINHAN", "2026-04-15", "2026-05-01", "2026-12-15"],
    ["HDNC-HNTH-2026-005", "Hợp đồng nhân công hoàn thiện", "LABOR", "DRAFT", "7200000000", "JOTUN", "2026-06-15", "2026-07-01", "2026-12-20"],
  ] as const;
  const contractByNo: Record<string, string> = {};
  const contractSupplierCode: Record<string, string> = {};
  for (const [contractNo, name, type, status, value, supplierCode, signDate, startDate, endDate] of contracts) {
    const contract = await prisma.contract.create({
      data: { projectId: project.id, supplierId: suppliers[supplierCode], contractNo, name, type, status, value: dec(value), signDate: d(signDate), startDate: d(startDate), endDate: d(endDate) },
    });
    contractByNo[contractNo] = contract.id;
    contractSupplierCode[contractNo] = supplierCode;
  }

  const paymentRequests = [
    ["HSTT-HNTH-2026-0001", "Đợt 1 - Tạm ứng 10% hợp đồng tổng thầu", "ADVANCE", "PAID", "7863636363.64", "786363636.36", "8650000000", "HDTC-HNTH-2026-001", "2026-01-25"],
    ["HSTT-HNTH-2026-0002", "Đợt 2 - Hoàn thành cọc và móng", "PROGRESS", "PAID", "14154545454.55", "1415454545.45", "15570000000", "HDTC-HNTH-2026-001", "2026-03-30"],
    ["HSTT-HNTH-2026-0003", "Đợt 3 - Hoàn thành tầng hầm", "PROGRESS", "APPROVED", "12500000000", "1250000000", "13750000000", "HDTC-HNTH-2026-001", "2026-05-10"],
    ["HSTT-HNTH-2026-0004", "Đợt 4 - Thân tầng 1 đến tầng 3", "PROGRESS", "SUBMITTED", "9800000000", "980000000", "10780000000", "HDTC-HNTH-2026-001", "2026-06-28"],
    ["HSTT-HNTH-2026-0005", "Thanh toán vật tư thép đợt 2", "PROGRESS", "REJECTED", "3181818181.82", "318181818.18", "3500000000", "HDCC-HNTH-2026-STEEL-002", "2026-06-20"],
    ["HSTT-HNTH-2026-0006", "Tam ung nha thau MEP", "ADVANCE", "DRAFT", "2000000000", "200000000", "2200000000", "HDMEP-HNTH-2026-004", "2026-07-05"],
  ] as const;
  for (const [requestCode, title, type, status, subTotal, vatAmount, totalAmount, contractNo, dueDate] of paymentRequests) {
    await prisma.paymentRequest.create({
      data: {
        requestCode,
        projectId: project.id,
        title,
        supplierId: contractNo ? suppliers[contractSupplierCode[contractNo]] : null,
        contractId: contractByNo[contractNo],
        type,
        status,
        subTotal: dec(subTotal),
        vatAmount: dec(vatAmount),
        totalAmount: dec(totalAmount),
        dueDate: d(dueDate),
        notes: status === "REJECTED" ? "Cần bổ sung hóa đơn VAT và biên bản đối chiếu khối lượng." : "Hồ sơ seed phục vụ UAT module thanh toán.",
        createdById: users.accountant.id,
        approvedById: status === "APPROVED" || status === "PAID" ? users.director.id : null,
        approvedAt: status === "APPROVED" || status === "PAID" ? d(dueDate) : null,
        paidAt: status === "PAID" ? d(dueDate) : null,
        rejectedReason: status === "REJECTED" ? "Thiếu hóa đơn VAT bản gốc và biên bản giao nhận đợt 2" : null,
      },
    });
  }

  const approvalSeeds = [
    ["PD-HNTH-2026-0001", "Duyệt đề xuất mua thép đợt 1", "MATERIAL", "APPROVED", "HIGH", "12800000000", users.storekeeper.id, users.director.id, "Đã duyệt mua theo tiến độ tầng hầm"],
    ["PD-HNTH-2026-0002", "Duyệt hồ sơ thanh toán đợt 3", "PAYMENT", "APPROVED", "HIGH", "13750000000", users.accountant.id, users.director.id, "Hồ sơ đủ điều kiện thanh toán"],
    ["PD-HNTH-2026-0003", "Duyệt biên bản nghiệm thu cốt thép sàn tầng 2", "REPORT", "PENDING", "NORMAL", null, users.qs.id, null, null],
    ["PD-HNTH-2026-0004", "Duyet phat sinh chong tham bo sung khu ham B2", "CHANGE_ORDER", "PENDING", "URGENT", "485000000", users.commander.id, null, null],
    ["PD-HNTH-2026-0005", "Bổ sung hồ sơ VAT thanh toán thép đợt 2", "PAYMENT", "REJECTED", "NORMAL", "3500000000", users.accountant.id, users.director.id, "Yêu cầu bổ sung hóa đơn VAT bản gốc"],
    ["PD-HNTH-2026-0006", "Duyệt hợp đồng nhân công hoàn thiện", "CONTRACT", "CANCELLED", "LOW", "7200000000", users.pm.id, users.director.id, "Tạm dừng do thay đổi phạm vi"],
  ] as const;
  for (const [code, title, type, status, priority, amount, requesterId, decidedById, decisionNote] of approvalSeeds) {
    await prisma.approvalRequest.create({
      data: {
        code,
        projectId: project.id,
        title,
        description: `Yêu cầu phê duyệt liên quan ${PROJECT_CODE}`,
        type,
        status,
        priority,
        amount: amount ? dec(amount) : null,
        dueDate: d("2026-06-30"),
        requesterId,
        decidedById,
        decidedAt: decidedById ? d("2026-06-20") : null,
        decisionNote,
        sourceType: type,
        sourceId: code,
      },
    });
  }

  await prisma.paymentPlan.createMany({
    data: [
      { projectId: project.id, contractId: contractByNo["HDTC-HNTH-2026-001"], name: "Dot 1 - Tam ung 10%", amount: dec("8650000000"), plannedDate: d("2026-01-25"), status: "PAID" },
      { projectId: project.id, contractId: contractByNo["HDTC-HNTH-2026-001"], name: "Dot 2 - Coc va mong", amount: dec("15570000000"), plannedDate: d("2026-03-30"), status: "PAID" },
      { projectId: project.id, contractId: contractByNo["HDTC-HNTH-2026-001"], name: "Dot 3 - Tang ham", amount: dec("13750000000"), plannedDate: d("2026-05-10"), status: "APPROVED" },
      { projectId: project.id, contractId: contractByNo["HDTC-HNTH-2026-001"], name: "Dot 4 - Than tang 1-3", amount: dec("10780000000"), plannedDate: d("2026-06-28"), status: "PENDING" },
    ],
  });

  const plans = await prisma.paymentPlan.findMany({ where: { projectId: project.id, status: "PAID" } });
  for (const plan of plans) {
    await prisma.paymentRecord.create({
      data: { projectId: project.id, paymentPlanId: plan.id, amount: plan.amount, paymentDate: plan.plannedDate, referenceNo: `UNC-${PROJECT_CODE}-${plan.name.slice(0, 5).replace(/\W/g, "")}`, notes: "Đã thanh toán theo tiến độ hợp đồng" },
    });
  }

  const chatLines = [
    "Chỉ huy trưởng: 06h30 ngày mai họp an toàn trước khi đổ bê tông sàn tầng 3.",
    "QS: Đề nghị cập nhật khối lượng cốt thép sàn tầng 2 trước 17h.",
    "Kế toán: Hồ sơ VAT thép đợt 2 còn thiếu bản gốc, nhờ thủ kho kiểm tra.",
    "Thủ kho: Thép D20 giao thiếu 12 tấn, đã lập biên bản cho NCC bổ sung.",
    "Giám đốc dự án: Đồng ý chuyển ca đổ bê tông sang sáng ngày mai do mưa lớn.",
  ];
  for (let index = 0; index < 30; index += 1) {
    const senderId = [users.commander.id, users.qs.id, users.accountant.id, users.storekeeper.id, users.pm.id][index % 5];
    await prisma.chatMessage.create({
      data: { senderId, content: `[${PROJECT_CODE}] ${chatLines[index % chatLines.length]} (#${String(index + 1).padStart(2, "0")})` },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: users.admin.id,
      projectId: project.id,
      action: "SEED_HANOI_FULL_PROJECT",
      entityType: "Project",
      entityId: project.id,
      afterData: JSON.stringify({ code: PROJECT_CODE, name: PROJECT_NAME }),
    },
  });

  const counts = {
    projects: await prisma.project.count(),
    members: await prisma.projectMember.count({ where: { projectId: project.id } }),
    folders: await prisma.documentFolder.count({ where: { projectId: project.id } }),
    documents: await prisma.document.count({ where: { projectId: project.id } }),
    fieldItems: await prisma.fieldProgressItem.count({ where: { projectId: project.id } }),
    fieldEntries: await prisma.fieldProgressEntry.count({ where: { projectId: project.id } }),
    reports: await prisma.siteReport.count({ where: { projectId: project.id } }),
    reportAttachments: await prisma.siteReportAttachment.count({ where: { report: { projectId: project.id } } }),
    materialItems: await prisma.materialItem.count({ where: { projectId: project.id } }),
    materialMovements: await prisma.materialMovement.count({ where: { projectId: project.id } }),
    materialRequests: await prisma.materialRequest.count({ where: { projectId: project.id } }),
    contracts: await prisma.contract.count({ where: { projectId: project.id } }),
    paymentRequests: await prisma.paymentRequest.count({ where: { projectId: project.id } }),
    paymentPlans: await prisma.paymentPlan.count({ where: { projectId: project.id } }),
    approvals: await prisma.approvalRequest.count({ where: { projectId: project.id } }),
    chatMessages: await prisma.chatMessage.count({ where: { content: { contains: PROJECT_CODE } } }),
  };

  console.log(JSON.stringify({ projectId: project.id, code: PROJECT_CODE, counts }, null, 2));
  console.log(`Seed users password for hanoi.* accounts: ${DEFAULT_PASSWORD}`);
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
