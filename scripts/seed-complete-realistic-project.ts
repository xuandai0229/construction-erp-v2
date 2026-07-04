import "dotenv/config";

import { Prisma, PrismaClient } from "@prisma/client";
import {
  ApprovalPriority,
  ApprovalRequestStatus,
  ApprovalRequestType,
  ContractStatus,
  ContractType,
  DocumentStatus,
  FieldMaterialPriority,
  FieldMaterialRequestStatus,
  FieldProgressEntryStatus,
  FieldProgressItemStatus,
  FieldProgressItemType,
  MaterialMovementType,
  MaterialRequestPriority,
  MaterialRequestStatus,
  PaymentRequestStatus,
  PaymentRequestType,
  PaymentStatus,
  ProjectRole,
  ProjectStatus,
  SiteReportAttachmentKind,
  SiteReportStatus,
  SiteReportType,
  UserRole,
  WBSItemStatus,
  WeatherCondition,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import * as fs from "fs/promises";
import * as path from "path";

const SEED_TAG = "COMPLETE_REALISTIC_PROJECT_TAY_HO_2026";
const PROJECT_CODE = "CT-TAYHO-2026-001";
const PROJECT_NAME = "Dự án Nhà Văn Phòng Kết Hợp Căn Hộ Dịch Vụ Tây Hồ";
const DEFAULT_PASSWORD = process.env.COMPLETE_REALISTIC_PROJECT_SEED_PASSWORD || "CompleteSeed@2026!";
const STORAGE_ROOT = path.resolve(process.env.STORAGE_ROOT || path.join(process.cwd(), "storage"));
const SEED_REFERENCE_DATE = "2026-07-04";

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

if (process.env.NODE_ENV === "production" && process.env.ALLOW_COMPLETE_REALISTIC_PROJECT_SEED_PRODUCTION !== "true") {
  throw new Error("Refusing to seed production without ALLOW_COMPLETE_REALISTIC_PROJECT_SEED_PRODUCTION=true");
}

const pool = new Pool({ connectionString: requireEnv("DATABASE_URL") });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function d(value: string, hour = 0) {
  return new Date(`${value}T${String(hour).padStart(2, "0")}:00:00.000Z`);
}

function dec(value: number | string) {
  return new Prisma.Decimal(value);
}

function seedId(scope: string, key: string) {
  const hash = crypto.createHash("sha1").update(`${SEED_TAG}:${scope}:${key}`).digest("hex").slice(0, 26);
  return `seed_${hash}`;
}

function sha256(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function safeFileName(name: string) {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "_");
}

function mimeFor(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".dwg") return "application/acad";
  if (ext === ".docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === ".xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  return "application/octet-stream";
}

function fileBuffer(fileName: string, label: string) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".pdf") {
    return Buffer.from(
      `%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n2 0 obj\n<< /Length 44 >>\nstream\n${label}\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n`,
      "utf8",
    );
  }
  if (ext === ".jpg" || ext === ".jpeg") {
    return Buffer.from(
      "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
      "base64",
    );
  }
  if (ext === ".png") {
    return Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
      "base64",
    );
  }
  return Buffer.from(`${label}\nSEED_TAG=${SEED_TAG}\nPROJECT_CODE=${PROJECT_CODE}\n`, "utf8");
}

async function writeStoredFile(relativePath: string, buffer: Buffer) {
  const absolutePath = path.resolve(STORAGE_ROOT, relativePath);
  const root = path.resolve(STORAGE_ROOT);
  const rel = path.relative(root, absolutePath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Unsafe storage path: ${relativePath}`);
  }
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);
}

type SeedUserKey =
  | "admin"
  | "director"
  | "projectManager"
  | "siteManager"
  | "engineer"
  | "accountant"
  | "warehouse"
  | "documentStaff"
  | "viewer";

type SeedUsers = Record<SeedUserKey, { id: string; email: string; name: string; role: UserRole }>;

async function seedUsers() {
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const seeds: Array<{
    key: SeedUserKey;
    email: string;
    username: string;
    name: string;
    role: UserRole;
    phone: string;
  }> = [
    {
      key: "admin",
      email: "tayho.admin@seed.local",
      username: "tayho_seed_admin",
      name: "Nguyễn Minh Đức - Admin hệ thống",
      role: UserRole.ADMIN,
      phone: "0906001001",
    },
    {
      key: "director",
      email: "tayho.director@seed.local",
      username: "tayho_seed_director",
      name: "Phạm Thu Hằng - Ban giám đốc",
      role: UserRole.DIRECTOR,
      phone: "0906001002",
    },
    {
      key: "projectManager",
      email: "tayho.pm@seed.local",
      username: "tayho_seed_project_manager",
      name: "Lê Hoàng Nam - Quản lý dự án",
      role: UserRole.MANAGER,
      phone: "0906001003",
    },
    {
      key: "siteManager",
      email: "tayho.site@seed.local",
      username: "tayho_seed_site_manager",
      name: "Trần Quang Huy - Chỉ huy trưởng",
      role: UserRole.CHIEF_COMMANDER,
      phone: "0906001004",
    },
    {
      key: "engineer",
      email: "tayho.engineer@seed.local",
      username: "tayho_seed_engineer",
      name: "Đỗ Minh Quân - Kỹ sư hiện trường",
      role: UserRole.ENGINEER,
      phone: "0906001005",
    },
    {
      key: "accountant",
      email: "tayho.accountant@seed.local",
      username: "tayho_seed_accountant",
      name: "Vũ Mai Linh - Kế toán công trình",
      role: UserRole.ACCOUNTANT,
      phone: "0906001006",
    },
    {
      key: "warehouse",
      email: "tayho.warehouse@seed.local",
      username: "tayho_seed_warehouse",
      name: "Hoàng Văn Phúc - Thủ kho",
      role: UserRole.STAFF,
      phone: "0906001007",
    },
    {
      key: "documentStaff",
      email: "tayho.document@seed.local",
      username: "tayho_seed_document_staff",
      name: "Nguyễn Bảo Anh - Nhân sự hồ sơ",
      role: UserRole.STAFF,
      phone: "0906001008",
    },
    {
      key: "viewer",
      email: "tayho.viewer@seed.local",
      username: "tayho_seed_viewer",
      name: "Đại diện Chủ đầu tư - Chỉ xem",
      role: UserRole.STAFF,
      phone: "0906001009",
    },
  ];

  const users = {} as SeedUsers;
  for (const seed of seeds) {
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: {
        username: seed.username,
        name: seed.name,
        role: seed.role,
        phone: seed.phone,
        password: hashedPassword,
        isActive: true,
        deletedAt: null,
      },
      create: {
        email: seed.email,
        username: seed.username,
        name: seed.name,
        role: seed.role,
        phone: seed.phone,
        password: hashedPassword,
        isActive: true,
      },
    });
    users[seed.key] = { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  console.log(`Created/Updated users: ${seeds.length}`);
  return users;
}

async function seedProject(users: SeedUsers) {
  const existing = await prisma.project.findUnique({ where: { code: PROJECT_CODE } });
  if (existing && !(existing.description || "").includes(SEED_TAG)) {
    throw new Error(`Project code ${PROJECT_CODE} already exists without ${SEED_TAG}; refusing to overwrite real project.`);
  }

  const description = [
    `${SEED_TAG}`,
    "Công trình hỗn hợp văn phòng kết hợp căn hộ dịch vụ tại Tây Hồ, Hà Nội.",
    "Quy mô demo/UAT: 02 tầng hầm, 12 tầng nổi, 01 tầng kỹ thuật, diện tích xây dựng khoảng 1.850 m2, tổng diện tích sàn khoảng 24.600 m2.",
    "Hệ kết cấu bê tông cốt thép toàn khối, móng cọc khoan nhồi, có MEP/PCCC/hoàn thiện/cảnh quan.",
    "Tọa độ tham chiếu dùng trong báo cáo hiện trường: 21.072320, 105.817210.",
  ].join("\n");

  const project = await prisma.project.upsert({
    where: { code: PROJECT_CODE },
    update: {
      name: PROJECT_NAME,
      description,
      investor: "Công ty Cổ phần Đầu tư Tây Hồ Xanh",
      location: "Lô đất CX-03, đường Võ Chí Công, phường Xuân La, quận Tây Hồ, Hà Nội",
      status: ProjectStatus.ACTIVE,
      startDate: d("2026-06-15"),
      endDate: d("2027-04-30"),
      budget: dec("98500000000"),
      deletedAt: null,
    },
    create: {
      code: PROJECT_CODE,
      name: PROJECT_NAME,
      description,
      investor: "Công ty Cổ phần Đầu tư Tây Hồ Xanh",
      location: "Lô đất CX-03, đường Võ Chí Công, phường Xuân La, quận Tây Hồ, Hà Nội",
      status: ProjectStatus.ACTIVE,
      startDate: d("2026-06-15"),
      endDate: d("2027-04-30"),
      budget: dec("98500000000"),
    },
  });

  const memberSeeds: Array<{ user: SeedUserKey; role: ProjectRole; note: string }> = [
    { user: "admin", role: ProjectRole.PROJECT_MANAGER, note: "ADMIN hệ thống kiểm tra toàn bộ dữ liệu seed UAT." },
    { user: "director", role: ProjectRole.PROJECT_MANAGER, note: "Ban giám đốc xem dashboard và phê duyệt." },
    { user: "projectManager", role: ProjectRole.PROJECT_MANAGER, note: "Quản lý dự án chịu trách nhiệm tổng thể." },
    { user: "siteManager", role: ProjectRole.SITE_COMMANDER, note: "Chỉ huy trưởng điều phối hiện trường." },
    { user: "engineer", role: ProjectRole.SUPERVISOR, note: "Kỹ sư hiện trường nhập khối lượng và báo cáo ngày." },
    { user: "accountant", role: ProjectRole.VIEWER, note: "Kế toán theo dõi hợp đồng và thanh toán." },
    { user: "warehouse", role: ProjectRole.SUPERVISOR, note: "Thủ kho nhập/xuất vật tư; hệ thống map STAFF + SUPERVISOR." },
    { user: "documentStaff", role: ProjectRole.QA_QC, note: "Nhân sự hồ sơ; hệ thống chưa có role DOCUMENT_STAFF riêng." },
    { user: "viewer", role: ProjectRole.VIEWER, note: "Nhân sự chỉ xem/đại diện chủ đầu tư." },
  ];

  for (const seed of memberSeeds) {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: project.id, userId: users[seed.user].id } },
      update: {
        role: seed.role,
        assignedById: users.admin.id,
        isActive: true,
        note: `${seed.note} ${SEED_TAG}`,
        leftAt: null,
        deletedAt: null,
      },
      create: {
        projectId: project.id,
        userId: users[seed.user].id,
        role: seed.role,
        assignedById: users.admin.id,
        isActive: true,
        note: `${seed.note} ${SEED_TAG}`,
        joinedAt: d("2026-06-10"),
      },
    });
  }

  console.log(`Created/Updated project: ${PROJECT_CODE}`);
  console.log(`Created/Updated project users: ${memberSeeds.length}`);
  return project;
}

async function seedSuppliers() {
  const supplierSeeds = [
    ["SEED-TAYHO-INVESTOR", "Công ty Cổ phần Đầu tư Tây Hồ Xanh", "0109902601", "Tây Hồ, Hà Nội", "02439990001", "legal@tayhoxanh.example", "Bà Phạm Thu Trang"],
    ["SEED-TAYHO-HOAPHAT", "Tập đoàn Hòa Phát - Chi nhánh Hà Nội", "0109902602", "66 Nguyễn Du, Hai Bà Trưng, Hà Nội", "02439990002", "sales.hanoi@hoaphat.example", "Ông Vũ Quốc Bảo"],
    ["SEED-TAYHO-BIMSON", "Công ty Xi măng Bỉm Sơn", "0109902603", "VP Hà Nội, Cầu Giấy, Hà Nội", "02439990003", "sales@bimson.example", "Bà Lê Thị Hạnh"],
    ["SEED-TAYHO-MEP", "Công ty TNHH Cơ điện Minh An", "0109902604", "KCN Bắc Thăng Long, Hà Nội", "02439990004", "pm@minhanmep.example", "Ông Trần Minh An"],
    ["SEED-TAYHO-FINISH", "Công ty CP Hoàn thiện Xây dựng Việt", "0109902605", "Nam Từ Liêm, Hà Nội", "02439990005", "contact@finishviet.example", "Bà Đỗ Mai Phương"],
  ] as const;

  const suppliers: Record<string, string> = {};
  for (const [code, name, taxCode, address, phone, email, contactPerson] of supplierSeeds) {
    const supplier = await prisma.supplier.upsert({
      where: { code },
      update: { name, taxCode, address, phone, email, contactPerson, deletedAt: null },
      create: { code, name, taxCode, address, phone, email, contactPerson },
    });
    suppliers[code] = supplier.id;
  }

  console.log(`Created/Updated suppliers: ${supplierSeeds.length}`);
  return suppliers;
}

async function ensureFolder(projectId: string, name: string, parentId: string | null) {
  const existing = await prisma.documentFolder.findFirst({
    where: { projectId, name, parentId },
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    return prisma.documentFolder.update({
      where: { id: existing.id },
      data: { deletedAt: null },
    });
  }

  return prisma.documentFolder.create({
    data: { projectId, name, parentId },
  });
}

async function seedFolders(projectId: string) {
  const rootNames = [
    "01_Bản_vẽ_thi_công",
    "02_Hợp_đồng",
    "03_Biên_bản_nghiệm_thu",
    "04_Hóa_đơn_chứng_từ",
    "05_Hình_ảnh_tiến_độ",
    "06_Báo_cáo_ngày",
    "07_An_toàn_lao_động",
  ];
  const childMap: Record<string, string[]> = {
    "01_Bản_vẽ_thi_công": ["Kết_cấu", "Kiến_trúc", "MEP_PCCC", "Shopdrawing"],
    "02_Hợp_đồng": ["Chủ_đầu_tư", "Nhà_cung_cấp", "Nhà_thầu_phụ"],
    "03_Biên_bản_nghiệm_thu": ["Móng", "Tầng_hầm", "Kết_cấu_thân"],
    "04_Hóa_đơn_chứng_từ": ["Vật_tư", "Thanh_toán", "Bảo_lãnh"],
    "05_Hình_ảnh_tiến_độ": ["2026-06", "2026-07"],
    "06_Báo_cáo_ngày": ["DRAFT", "SUBMITTED", "APPROVED"],
    "07_An_toàn_lao_động": ["Huấn_luyện", "Biên_bản_ATLD"],
  };

  const folders: Record<string, string> = {};
  for (const rootName of rootNames) {
    const root = await ensureFolder(projectId, rootName, null);
    folders[rootName] = root.id;
    for (const childName of childMap[rootName] || []) {
      const child = await ensureFolder(projectId, childName, root.id);
      folders[`${rootName}/${childName}`] = child.id;
    }
  }

  console.log(`Created/Updated folders: ${Object.keys(folders).length}`);
  return folders;
}

async function seedWbs(projectId: string, users: SeedUsers) {
  const groups = [
    ["WBS-01", "Chuẩn bị công trường", WBSItemStatus.COMPLETED, 100],
    ["WBS-02", "Móng", WBSItemStatus.IN_PROGRESS, 62],
    ["WBS-03", "Tầng hầm", WBSItemStatus.PLANNED, 12],
    ["WBS-04", "Kết cấu thân", WBSItemStatus.PLANNED, 0],
    ["WBS-05", "Xây trát", WBSItemStatus.PLANNED, 0],
    ["WBS-06", "MEP điện nước", WBSItemStatus.PLANNED, 0],
    ["WBS-07", "Hoàn thiện", WBSItemStatus.PLANNED, 0],
    ["WBS-08", "Nghiệm thu bàn giao", WBSItemStatus.PLANNED, 0],
  ] as const;

  const wbsByCode: Record<string, string> = {};
  for (const [code, name, status, progress] of groups) {
    const item = await prisma.wBSItem.upsert({
      where: { projectId_code: { projectId, code } },
      update: {
        name,
        status,
        progress: dec(progress),
        unit: "gói",
        designQuantity: dec(1),
        note: `${SEED_TAG} - WBS phụ trợ cho báo cáo/material request`,
        deletedAt: null,
      },
      create: {
        projectId,
        code,
        name,
        status,
        progress: dec(progress),
        unit: "gói",
        designQuantity: dec(1),
        plannedStartDate: d("2026-06-15"),
        plannedEndDate: d("2027-04-30"),
        note: `${SEED_TAG} - WBS phụ trợ cho báo cáo/material request`,
        createdById: users.projectManager.id,
      },
    });
    wbsByCode[code] = item.id;
  }

  console.log(`Created/Updated WBS items: ${groups.length}`);
  return wbsByCode;
}

async function seedFieldProgress(projectId: string, users: SeedUsers) {
  const template = await prisma.fieldProgressTemplate.upsert({
    where: { id: seedId("field-template", PROJECT_CODE) },
    update: {
      name: "Bảng khối lượng hiện trường - Tây Hồ",
      description: `${SEED_TAG} - khối lượng gốc phục vụ nhập sản lượng hằng ngày`,
      status: "ACTIVE",
      deletedAt: null,
    },
    create: {
      id: seedId("field-template", PROJECT_CODE),
      projectId,
      name: "Bảng khối lượng hiện trường - Tây Hồ",
      description: `${SEED_TAG} - khối lượng gốc phục vụ nhập sản lượng hằng ngày`,
      status: "ACTIVE",
      createdById: users.engineer.id,
    },
  });

  const groupSeeds = [
    ["FP-G01", "Chuẩn bị công trường"],
    ["FP-G02", "Móng"],
    ["FP-G03", "Tầng hầm"],
    ["FP-G04", "Kết cấu thân"],
    ["FP-G05", "Xây trát"],
    ["FP-G06", "MEP điện nước"],
    ["FP-G07", "Hoàn thiện"],
    ["FP-G08", "Nghiệm thu bàn giao"],
  ] as const;

  const fieldItems: Record<string, { id: string; designQuantity: Prisma.Decimal | null; unit: string | null; name: string }> = {};
  let sortOrder = 1;
  for (const [code, name] of groupSeeds) {
    const item = await prisma.fieldProgressItem.upsert({
      where: { id: seedId("field-item", code) },
      update: {
        projectId,
        templateId: template.id,
        parentId: null,
        sortOrder: sortOrder++,
        level: 0,
        itemType: FieldProgressItemType.GROUP,
        code,
        categoryName: name,
        workContent: null,
        status: FieldProgressItemStatus.IN_PROGRESS,
        deletedAt: null,
      },
      create: {
        id: seedId("field-item", code),
        projectId,
        templateId: template.id,
        sortOrder: sortOrder - 1,
        level: 0,
        itemType: FieldProgressItemType.GROUP,
        code,
        categoryName: name,
        status: FieldProgressItemStatus.IN_PROGRESS,
        createdById: users.engineer.id,
      },
    });
    fieldItems[code] = { id: item.id, designQuantity: item.designQuantity, unit: item.unit, name };
  }

  const workSeeds = [
    ["FP-CB-001", "FP-G01", "Lắp dựng hàng rào tôn và cổng công trường", "Đội chuẩn bị", "m", 180, FieldProgressItemStatus.COMPLETED],
    ["FP-CB-002", "FP-G01", "Lắp đặt nhà tạm, kho bãi, biển báo", "Đội chuẩn bị", "m2", 240, FieldProgressItemStatus.IN_PROGRESS],
    ["FP-CB-003", "FP-G01", "Định vị tim trục và mốc cao độ", "Trắc đạc", "điểm", 48, FieldProgressItemStatus.COMPLETED],
    ["FP-M-001", "FP-G02", "Khoan cọc D800 sâu 42m", "Đội cọc khoan nhồi", "cọc", 68, FieldProgressItemStatus.IN_PROGRESS],
    ["FP-M-002", "FP-G02", "Bê tông cọc khoan nhồi M300", "Đội bê tông", "m3", 1620, FieldProgressItemStatus.IN_PROGRESS],
    ["FP-M-003", "FP-G02", "Đào đất hố móng", "Đội đào đất", "m3", 11800, FieldProgressItemStatus.IN_PROGRESS],
    ["FP-M-004", "FP-G02", "Cốt thép đài móng và dầm móng", "Đội cốt thép", "kg", 285000, FieldProgressItemStatus.PLANNED],
    ["FP-H-001", "FP-G03", "Bê tông lót đáy tầng hầm", "Đội bê tông", "m3", 360, FieldProgressItemStatus.PLANNED],
    ["FP-H-002", "FP-G03", "Chống thấm đáy và vách tầng hầm", "Đội chống thấm", "m2", 4200, FieldProgressItemStatus.PLANNED],
    ["FP-H-003", "FP-G03", "Cốp pha vách tầng hầm B2-B1", "Đội cốp pha", "m2", 5200, FieldProgressItemStatus.PLANNED],
    ["FP-KC-001", "FP-G04", "Cốt thép cột/vách tầng 1-3", "Đội cốt thép", "kg", 215000, FieldProgressItemStatus.PLANNED],
    ["FP-KC-002", "FP-G04", "Cốp pha sàn tầng 1-3", "Đội cốp pha", "m2", 9400, FieldProgressItemStatus.PLANNED],
    ["FP-KC-003", "FP-G04", "Bê tông sàn tầng 1-3", "Đội bê tông", "m3", 1780, FieldProgressItemStatus.PLANNED],
    ["FP-XT-001", "FP-G05", "Xây tường gạch AAC", "Đội xây trát", "m2", 8200, FieldProgressItemStatus.PLANNED],
    ["FP-XT-002", "FP-G05", "Tô trát tường trong", "Đội xây trát", "m2", 15800, FieldProgressItemStatus.PLANNED],
    ["FP-MEP-001", "FP-G06", "Ống cấp thoát nước âm sàn", "Đội MEP", "m", 3150, FieldProgressItemStatus.PLANNED],
    ["FP-MEP-002", "FP-G06", "Ống luồn dây điện và hộp chờ", "Đội MEP", "m", 6100, FieldProgressItemStatus.PLANNED],
    ["FP-HT-001", "FP-G07", "Sơn bả hoàn thiện", "Đội hoàn thiện", "m2", 21600, FieldProgressItemStatus.PLANNED],
    ["FP-HT-002", "FP-G07", "Lắp đặt cửa nhôm kính", "Đội nhôm kính", "m2", 1980, FieldProgressItemStatus.PLANNED],
    ["FP-NT-001", "FP-G08", "Nghiệm thu hoàn thành và bàn giao", "QA/QC", "hồ sơ", 1, FieldProgressItemStatus.PLANNED],
  ] as const;

  for (const [code, parentCode, workContent, crew, unit, designQuantity, status] of workSeeds) {
    const item = await prisma.fieldProgressItem.upsert({
      where: { id: seedId("field-item", code) },
      update: {
        projectId,
        templateId: template.id,
        parentId: fieldItems[parentCode].id,
        sortOrder: sortOrder++,
        level: 1,
        itemType: FieldProgressItemType.WORK,
        code,
        categoryName: fieldItems[parentCode].name,
        workContent,
        constructionCrew: crew,
        designQuantity: dec(designQuantity),
        unit,
        status,
        note: `${SEED_TAG} - đơn giá/thành tiền không có field riêng trong FieldProgressItem`,
        deletedAt: null,
      },
      create: {
        id: seedId("field-item", code),
        projectId,
        templateId: template.id,
        parentId: fieldItems[parentCode].id,
        sortOrder: sortOrder - 1,
        level: 1,
        itemType: FieldProgressItemType.WORK,
        code,
        categoryName: fieldItems[parentCode].name,
        workContent,
        constructionCrew: crew,
        designQuantity: dec(designQuantity),
        unit,
        status,
        note: `${SEED_TAG} - đơn giá/thành tiền không có field riêng trong FieldProgressItem`,
        createdById: users.engineer.id,
      },
    });
    fieldItems[code] = { id: item.id, designQuantity: item.designQuantity, unit: item.unit, name: workContent };
  }

  const entrySeeds: Array<[string, string, number, FieldProgressEntryStatus, SeedUserKey, string]> = [
    ["2026-06-24", "FP-CB-001", 80, FieldProgressEntryStatus.APPROVED, "engineer", "Hoàn thành hàng rào khu phía Bắc."],
    ["2026-06-25", "FP-CB-001", 100, FieldProgressEntryStatus.APPROVED, "engineer", "Hoàn thành 100% hàng rào và cổng."],
    ["2026-06-25", "FP-CB-003", 48, FieldProgressEntryStatus.APPROVED, "engineer", "Đã bàn giao mốc tim trục cho TVGS."],
    ["2026-06-26", "FP-CB-002", 80, FieldProgressEntryStatus.APPROVED, "engineer", "Lắp nhà bảo vệ và kho vật tư tạm."],
    ["2026-06-27", "FP-CB-002", 60, FieldProgressEntryStatus.SUBMITTED, "engineer", "Chờ chỉ huy trưởng kiểm tra khu kho thép."],
    ["2026-06-28", "FP-M-001", 8, FieldProgressEntryStatus.APPROVED, "engineer", "Khoan cọc khu trục A-D/1-3."],
    ["2026-06-29", "FP-M-001", 10, FieldProgressEntryStatus.APPROVED, "engineer", "Khoan cọc đạt chiều sâu thiết kế."],
    ["2026-06-30", "FP-M-002", 220, FieldProgressEntryStatus.APPROVED, "engineer", "Đổ bê tông cọc trong ca đêm."],
    ["2026-07-01", "FP-M-001", 9, FieldProgressEntryStatus.APPROVED, "engineer", "Bổ sung 01 máy khoan cọc."],
    ["2026-07-01", "FP-M-002", 260, FieldProgressEntryStatus.APPROVED, "engineer", "Kiểm tra slump đạt yêu cầu."],
    ["2026-07-02", "FP-M-003", 1450, FieldProgressEntryStatus.APPROVED, "engineer", "Đào đất hố móng khu A."],
    ["2026-07-03", "FP-M-003", 1180, FieldProgressEntryStatus.SUBMITTED, "engineer", "Mưa nhẹ buổi chiều, giảm năng suất."],
    ["2026-07-03", "FP-M-004", 12500, FieldProgressEntryStatus.DRAFT, "engineer", "Gia công thép đài móng, đang chờ nghiệm thu nội bộ."],
    ["2026-07-04", "FP-M-001", 6, FieldProgressEntryStatus.APPROVED, "engineer", "Hoàn thành thêm 6 cọc khu B."],
    ["2026-07-04", "FP-M-002", 180, FieldProgressEntryStatus.SUBMITTED, "engineer", "Chờ duyệt phiếu bê tông cuối ngày."],
    ["2026-07-04", "FP-M-003", 980, FieldProgressEntryStatus.DRAFT, "engineer", "Dự kiến cập nhật sau khi cân đối xe vận chuyển đất."],
  ];

  for (const [date, itemCode, quantity, status, createdBy, note] of entrySeeds) {
    const fieldItem = fieldItems[itemCode];
    await prisma.fieldProgressEntry.upsert({
      where: { id: seedId("field-entry", `${itemCode}:${date}`) },
      update: {
        quantity: dec(quantity),
        status,
        issueNote: note.includes("Mưa") ? "Mưa làm giảm năng suất, cần bố trí bạt che và tăng ca sáng." : null,
        proposalNote: status === FieldProgressEntryStatus.DRAFT ? "Cần kiểm tra trước khi submit." : null,
        note: `${note} ${SEED_TAG}`,
        submittedAt: status === FieldProgressEntryStatus.DRAFT ? null : d(date, 17),
        approvedById: status === FieldProgressEntryStatus.APPROVED ? users.siteManager.id : null,
        approvedAt: status === FieldProgressEntryStatus.APPROVED ? d(date, 18) : null,
        rejectedReason: null,
        deletedAt: null,
      },
      create: {
        id: seedId("field-entry", `${itemCode}:${date}`),
        projectId,
        templateId: template.id,
        itemId: fieldItem.id,
        entryDate: d(date),
        quantity: dec(quantity),
        status,
        issueNote: note.includes("Mưa") ? "Mưa làm giảm năng suất, cần bố trí bạt che và tăng ca sáng." : null,
        proposalNote: status === FieldProgressEntryStatus.DRAFT ? "Cần kiểm tra trước khi submit." : null,
        note: `${note} ${SEED_TAG}`,
        createdById: users[createdBy].id,
        submittedAt: status === FieldProgressEntryStatus.DRAFT ? null : d(date, 17),
        approvedById: status === FieldProgressEntryStatus.APPROVED ? users.siteManager.id : null,
        approvedAt: status === FieldProgressEntryStatus.APPROVED ? d(date, 18) : null,
      },
    });
  }

  console.log(`Created/Updated progress items: ${groupSeeds.length + workSeeds.length}`);
  console.log(`Created/Updated daily progress entries: ${entrySeeds.length}`);
  return { templateId: template.id, fieldItems };
}

async function seedMaterials(projectId: string, users: SeedUsers, fieldItems: Record<string, { id: string; name: string }>) {
  const materialSeeds = [
    ["THEP-D10", "Thép D10 Hòa Phát", "kg", "Thép", 24000, 6500, 17800, 4200],
    ["THEP-D16", "Thép D16 Hòa Phát", "kg", "Thép", 52000, 15500, 18100, 9000],
    ["THEP-D20", "Thép D20 Hòa Phát", "kg", "Thép", 46000, 12500, 18300, 8500],
    ["XM-PCB40", "Xi măng PCB40", "bao", "Xi măng", 2600, 860, 89000, 500],
    ["CAT-VANG", "Cát vàng", "m3", "Vật liệu rời", 520, 190, 285000, 100],
    ["DA-1X2", "Đá 1x2", "m3", "Vật liệu rời", 480, 160, 305000, 90],
    ["GACH-XAY", "Gạch xây", "viên", "Xây trát", 18000, 0, 1850, 3000],
    ["ONG-PVC", "Ống PVC", "m", "MEP", 1400, 180, 69000, 250],
    ["DAY-DIEN", "Dây điện", "m", "MEP", 3600, 0, 11500, 800],
    ["SON-NUOC", "Sơn nước", "thùng", "Hoàn thiện", 120, 0, 1650000, 24],
  ] as const;

  const materialByCode: Record<string, string> = {};
  for (const [code, name, unit, group, importQty, exportQty, unitPrice, minStockLevel] of materialSeeds) {
    const material = await prisma.materialItem.upsert({
      where: { projectId_code: { projectId, code } },
      update: {
        name,
        unit,
        group,
        description: `${SEED_TAG} - vật tư mẫu cho công trình Tây Hồ`,
        isActive: true,
      },
      create: {
        projectId,
        code,
        name,
        unit,
        group,
        description: `${SEED_TAG} - vật tư mẫu cho công trình Tây Hồ`,
        isActive: true,
      },
    });
    materialByCode[code] = material.id;

    await prisma.materialMovement.upsert({
      where: { id: seedId("material-movement", `${code}:IMPORT`) },
      update: {
        quantity: dec(importQty),
        unitPrice: dec(unitPrice),
        movementDate: d("2026-06-20"),
        notes: `${SEED_TAG} PNK-TAYHO-${code}-001`,
      },
      create: {
        id: seedId("material-movement", `${code}:IMPORT`),
        projectId,
        materialItemId: material.id,
        type: MaterialMovementType.IMPORT,
        quantity: dec(importQty),
        unitPrice: dec(unitPrice),
        movementDate: d("2026-06-20"),
        notes: `${SEED_TAG} PNK-TAYHO-${code}-001`,
      },
    });

    if (exportQty > 0) {
      await prisma.materialMovement.upsert({
        where: { id: seedId("material-movement", `${code}:EXPORT`) },
        update: {
          quantity: dec(exportQty),
          unitPrice: dec(unitPrice),
          movementDate: d("2026-07-02"),
          notes: `${SEED_TAG} PXK-TAYHO-${code}-001`,
        },
        create: {
          id: seedId("material-movement", `${code}:EXPORT`),
          projectId,
          materialItemId: material.id,
          type: MaterialMovementType.EXPORT,
          quantity: dec(exportQty),
          unitPrice: dec(unitPrice),
          movementDate: d("2026-07-02"),
          notes: `${SEED_TAG} PXK-TAYHO-${code}-001`,
        },
      });
    }

    await prisma.projectMaterialStock.upsert({
      where: { projectId_materialItemId: { projectId, materialItemId: material.id } },
      update: {
        stock: dec(importQty - exportQty),
        minStockLevel: dec(minStockLevel),
        lastUpdated: d("2026-07-04"),
      },
      create: {
        projectId,
        materialItemId: material.id,
        stock: dec(importQty - exportQty),
        minStockLevel: dec(minStockLevel),
        lastUpdated: d("2026-07-04"),
      },
    });
  }

  const request = await prisma.materialRequest.upsert({
    where: { requestNo: "MR-TAYHO-2026-0001" },
    update: {
      projectId,
      requestedById: users.warehouse.id,
      requestDate: d("2026-07-01"),
      neededDate: d("2026-07-05"),
      status: MaterialRequestStatus.SUBMITTED,
      priority: MaterialRequestPriority.HIGH,
      note: `${SEED_TAG} - yêu cầu bổ sung thép và xi măng phục vụ đài móng`,
      deletedAt: null,
    },
    create: {
      projectId,
      requestNo: "MR-TAYHO-2026-0001",
      requestedById: users.warehouse.id,
      requestDate: d("2026-07-01"),
      neededDate: d("2026-07-05"),
      status: MaterialRequestStatus.SUBMITTED,
      priority: MaterialRequestPriority.HIGH,
      note: `${SEED_TAG} - yêu cầu bổ sung thép và xi măng phục vụ đài móng`,
    },
  });

  const requestItems = [
    ["THEP-D16", "Thép D16 Hòa Phát", "kg", 12000, "Bổ sung cốt thép đài móng", "FP-M-004"],
    ["THEP-D20", "Thép D20 Hòa Phát", "kg", 9000, "Thiếu thép D20 theo kế hoạch tuần", "FP-M-004"],
    ["XM-PCB40", "Xi măng PCB40", "bao", 420, "Trộn vữa lót và công tác phụ trợ", "FP-M-003"],
  ] as const;
  for (const [code, name, unit, quantity, reason, fieldCode] of requestItems) {
    await prisma.materialRequestItem.upsert({
      where: { id: seedId("material-request-item", `${request.requestNo}:${code}`) },
      update: {
        fieldProgressItemId: fieldItems[fieldCode].id,
        workItemNameSnapshot: fieldItems[fieldCode].name,
        materialCode: code,
        materialName: name,
        unit,
        requestedQuantity: dec(quantity),
        issuedQuantity: dec(0),
        receivedQuantity: dec(0),
        remainingQuantity: dec(quantity),
        reason,
        note: SEED_TAG,
        deletedAt: null,
      },
      create: {
        id: seedId("material-request-item", `${request.requestNo}:${code}`),
        materialRequestId: request.id,
        fieldProgressItemId: fieldItems[fieldCode].id,
        workItemNameSnapshot: fieldItems[fieldCode].name,
        materialCode: code,
        materialName: name,
        unit,
        requestedQuantity: dec(quantity),
        issuedQuantity: dec(0),
        receivedQuantity: dec(0),
        remainingQuantity: dec(quantity),
        reason,
        note: SEED_TAG,
      },
    });
  }

  const receivedRequest = await prisma.materialRequest.upsert({
    where: { requestNo: "MR-TAYHO-2026-0002" },
    update: {
      projectId,
      requestedById: users.engineer.id,
      requestDate: d("2026-06-22"),
      neededDate: d("2026-06-25"),
      status: MaterialRequestStatus.RECEIVED,
      priority: MaterialRequestPriority.MEDIUM,
      note: `${SEED_TAG} - yêu cầu vật tư đã nhận cho hàng rào và kho bãi`,
      deletedAt: null,
    },
    create: {
      projectId,
      requestNo: "MR-TAYHO-2026-0002",
      requestedById: users.engineer.id,
      requestDate: d("2026-06-22"),
      neededDate: d("2026-06-25"),
      status: MaterialRequestStatus.RECEIVED,
      priority: MaterialRequestPriority.MEDIUM,
      note: `${SEED_TAG} - yêu cầu vật tư đã nhận cho hàng rào và kho bãi`,
    },
  });

  await prisma.materialRequestItem.upsert({
    where: { id: seedId("material-request-item", `${receivedRequest.requestNo}:CAT-VANG`) },
    update: {
      materialCode: "CAT-VANG",
      materialName: "Cát vàng",
      unit: "m3",
      requestedQuantity: dec(60),
      issuedQuantity: dec(60),
      receivedQuantity: dec(60),
      remainingQuantity: dec(0),
      reason: "Vật tư phụ trợ chuẩn bị mặt bằng",
      note: SEED_TAG,
      deletedAt: null,
    },
    create: {
      id: seedId("material-request-item", `${receivedRequest.requestNo}:CAT-VANG`),
      materialRequestId: receivedRequest.id,
      materialCode: "CAT-VANG",
      materialName: "Cát vàng",
      unit: "m3",
      requestedQuantity: dec(60),
      issuedQuantity: dec(60),
      receivedQuantity: dec(60),
      remainingQuantity: dec(0),
      reason: "Vật tư phụ trợ chuẩn bị mặt bằng",
      note: SEED_TAG,
    },
  });

  console.log(`Created/Updated materials: ${materialSeeds.length}`);
  console.log("Created/Updated material requests: 2");
  return materialByCode;
}

async function seedFieldMaterialRequests(
  projectId: string,
  templateId: string,
  users: SeedUsers,
  fieldItems: Record<string, { id: string; name: string }>,
) {
  const req = await prisma.fieldMaterialRequest.upsert({
    where: { id: seedId("field-material-request", "FMREQ-001") },
    update: {
      requestDate: d("2026-07-04"),
      neededDate: d("2026-07-06"),
      requestedById: users.engineer.id,
      status: FieldMaterialRequestStatus.SUBMITTED,
      priority: FieldMaterialPriority.URGENT,
      note: `${SEED_TAG} - yêu cầu từ màn hình field progress`,
      deletedAt: null,
    },
    create: {
      id: seedId("field-material-request", "FMREQ-001"),
      projectId,
      templateId,
      itemId: fieldItems["FP-M-004"].id,
      requestDate: d("2026-07-04"),
      neededDate: d("2026-07-06"),
      requestedById: users.engineer.id,
      status: FieldMaterialRequestStatus.SUBMITTED,
      priority: FieldMaterialPriority.URGENT,
      note: `${SEED_TAG} - yêu cầu từ màn hình field progress`,
    },
  });

  const items = [
    ["Thép D16 Hòa Phát", "kg", 8500, "Bổ sung cho đài móng khu B"],
    ["Dây thép buộc", "kg", 350, "Gia công lồng thép"],
  ] as const;
  for (const [name, unit, quantity, reason] of items) {
    await prisma.fieldMaterialRequestItem.upsert({
      where: { id: seedId("field-material-request-item", `${req.id}:${name}`) },
      update: {
        materialName: name,
        unit,
        requestedQuantity: dec(quantity),
        reason,
        note: SEED_TAG,
        deletedAt: null,
      },
      create: {
        id: seedId("field-material-request-item", `${req.id}:${name}`),
        requestId: req.id,
        materialName: name,
        unit,
        requestedQuantity: dec(quantity),
        reason,
        note: SEED_TAG,
      },
    });
  }

  console.log("Created/Updated field material requests: 1");
}

async function seedContractsAndPayments(projectId: string, users: SeedUsers, suppliers: Record<string, string>) {
  const contractSeeds = [
    ["HD-TAYHO-2026-001", "Hợp đồng chính thi công xây dựng dự án Tây Hồ", ContractType.CLIENT, ContractStatus.ACTIVE, "98500000000", "SEED-TAYHO-INVESTOR", "2026-06-10", "2026-06-15", "2027-04-30"],
    ["HD-TAYHO-2026-STEEL", "Hợp đồng cung cấp thép Hòa Phát", ContractType.SUPPLIER, ContractStatus.ACTIVE, "12800000000", "SEED-TAYHO-HOAPHAT", "2026-06-12", "2026-06-20", "2026-12-31"],
    ["HD-TAYHO-2026-CEMENT", "Hợp đồng cung cấp xi măng PCB40", ContractType.SUPPLIER, ContractStatus.ACTIVE, "4200000000", "SEED-TAYHO-BIMSON", "2026-06-12", "2026-06-20", "2026-11-30"],
    ["HD-TAYHO-2026-MEP", "Hợp đồng thầu phụ MEP và PCCC", ContractType.SUBCONTRACTOR, ContractStatus.DRAFT, "18600000000", "SEED-TAYHO-MEP", "2026-07-01", "2026-07-15", "2027-03-31"],
    ["HD-TAYHO-2026-FINISH", "Hợp đồng nhân công hoàn thiện", ContractType.LABOR, ContractStatus.DRAFT, "7600000000", "SEED-TAYHO-FINISH", "2026-07-02", "2026-09-01", "2027-04-15"],
  ] as const;

  const contractByNo: Record<string, { id: string; supplierId: string | null }> = {};
  for (const [contractNo, name, type, status, value, supplierCode, signDate, startDate, endDate] of contractSeeds) {
    const supplierId = suppliers[supplierCode];
    const contract = await prisma.contract.upsert({
      where: { contractNo },
      update: {
        projectId,
        supplierId,
        name,
        type,
        status,
        value: dec(value),
        signDate: d(signDate),
        startDate: d(startDate),
        endDate: d(endDate),
        deletedAt: null,
      },
      create: {
        projectId,
        supplierId,
        contractNo,
        name,
        type,
        status,
        value: dec(value),
        signDate: d(signDate),
        startDate: d(startDate),
        endDate: d(endDate),
      },
    });
    contractByNo[contractNo] = { id: contract.id, supplierId };
  }

  const planSeeds = [
    ["PAYPLAN-001", "Đợt 1 - Tạm ứng 10% hợp đồng chính", "HD-TAYHO-2026-001", "9850000000", "2026-06-20", PaymentStatus.PAID],
    ["PAYPLAN-002", "Đợt 2 - Hoàn thành cọc và móng", "HD-TAYHO-2026-001", "14775000000", "2026-07-25", PaymentStatus.APPROVED],
    ["PAYPLAN-003", "Đợt 3 - Hoàn thành tầng hầm", "HD-TAYHO-2026-001", "19700000000", "2026-09-15", PaymentStatus.PENDING],
    ["PAYPLAN-004", "Đợt thép 1 - Thanh toán nhà cung cấp", "HD-TAYHO-2026-STEEL", "4100000000", "2026-07-10", PaymentStatus.PENDING],
  ] as const;

  for (const [key, name, contractNo, amount, plannedDate, status] of planSeeds) {
    await prisma.paymentPlan.upsert({
      where: { id: seedId("payment-plan", key) },
      update: {
        name,
        amount: dec(amount),
        plannedDate: d(plannedDate),
        status,
      },
      create: {
        id: seedId("payment-plan", key),
        projectId,
        contractId: contractByNo[contractNo].id,
        name,
        amount: dec(amount),
        plannedDate: d(plannedDate),
        status,
      },
    });
  }

  await prisma.paymentRecord.upsert({
    where: { id: seedId("payment-record", "PAYPLAN-001") },
    update: {
      amount: dec("9850000000"),
      paymentDate: d("2026-06-21"),
      referenceNo: "UNC-TAYHO-2026-0001",
      notes: `${SEED_TAG} - đã nhận/tạm ứng đợt 1`,
    },
    create: {
      id: seedId("payment-record", "PAYPLAN-001"),
      projectId,
      paymentPlanId: seedId("payment-plan", "PAYPLAN-001"),
      amount: dec("9850000000"),
      paymentDate: d("2026-06-21"),
      referenceNo: "UNC-TAYHO-2026-0001",
      notes: `${SEED_TAG} - đã nhận/tạm ứng đợt 1`,
    },
  });

  const paymentRequestSeeds = [
    ["PR-TAYHO-2026-0001", "Đề nghị thanh toán tạm ứng 10% hợp đồng chính", PaymentRequestType.ADVANCE, PaymentRequestStatus.PAID, "8954545454.55", "895454545.45", "9850000000", "HD-TAYHO-2026-001", "2026-06-20", null],
    ["PR-TAYHO-2026-0002", "Đề nghị thanh toán cọc khoan nhồi và đào móng", PaymentRequestType.PROGRESS, PaymentRequestStatus.APPROVED, "13431818181.82", "1343181818.18", "14775000000", "HD-TAYHO-2026-001", "2026-07-25", null],
    ["PR-TAYHO-2026-0003", "Thanh toán thép Hòa Phát đợt 1", PaymentRequestType.PROGRESS, PaymentRequestStatus.SUBMITTED, "3727272727.27", "372727272.73", "4100000000", "HD-TAYHO-2026-STEEL", "2026-07-10", null],
    ["PR-TAYHO-2026-0004", "Tạm ứng thầu phụ MEP", PaymentRequestType.ADVANCE, PaymentRequestStatus.DRAFT, "1800000000", "180000000", "1980000000", "HD-TAYHO-2026-MEP", "2026-07-18", null],
    ["PR-TAYHO-2026-0005", "Thanh toán hóa đơn thép thiếu chứng từ gốc", PaymentRequestType.PROGRESS, PaymentRequestStatus.REJECTED, "1363636363.64", "136363636.36", "1500000000", "HD-TAYHO-2026-STEEL", "2026-07-03", "Thiếu hóa đơn VAT bản gốc và biên bản giao nhận."],
  ] as const;

  for (const [requestCode, title, type, status, subTotal, vatAmount, totalAmount, contractNo, dueDate, rejectedReason] of paymentRequestSeeds) {
    const contract = contractByNo[contractNo];
    await prisma.paymentRequest.upsert({
      where: { requestCode },
      update: {
        projectId,
        title,
        supplierId: contract.supplierId,
        contractId: contract.id,
        type,
        status,
        subTotal: dec(subTotal),
        vatAmount: dec(vatAmount),
        totalAmount: dec(totalAmount),
        dueDate: d(dueDate),
        notes: `${SEED_TAG} - hồ sơ thanh toán mẫu cho UAT`,
        approvedById: status === PaymentRequestStatus.APPROVED || status === PaymentRequestStatus.PAID ? users.director.id : null,
        approvedAt: status === PaymentRequestStatus.APPROVED || status === PaymentRequestStatus.PAID ? d("2026-07-02", 10) : null,
        paidAt: status === PaymentRequestStatus.PAID ? d("2026-06-21", 11) : null,
        rejectedReason,
        deletedAt: null,
      },
      create: {
        requestCode,
        projectId,
        title,
        supplierId: contract.supplierId,
        contractId: contract.id,
        type,
        status,
        subTotal: dec(subTotal),
        vatAmount: dec(vatAmount),
        totalAmount: dec(totalAmount),
        dueDate: d(dueDate),
        notes: `${SEED_TAG} - hồ sơ thanh toán mẫu cho UAT`,
        createdById: users.accountant.id,
        approvedById: status === PaymentRequestStatus.APPROVED || status === PaymentRequestStatus.PAID ? users.director.id : null,
        approvedAt: status === PaymentRequestStatus.APPROVED || status === PaymentRequestStatus.PAID ? d("2026-07-02", 10) : null,
        paidAt: status === PaymentRequestStatus.PAID ? d("2026-06-21", 11) : null,
        rejectedReason,
      },
    });
  }

  console.log(`Created/Updated contracts/payments: ${contractSeeds.length} contracts, ${planSeeds.length} plans, 1 record, ${paymentRequestSeeds.length} requests`);
  return contractByNo;
}

async function seedReports(
  projectId: string,
  users: SeedUsers,
  fieldItems: Record<string, { id: string; designQuantity: Prisma.Decimal | null; unit: string | null; name: string }>,
) {
  const reportSeeds = [
    ["BCHT-TAYHO-2026-0001", "2026-06-24", SiteReportStatus.APPROVED, WeatherCondition.CLOUDY, "Hoàn thành hàng rào khu phía Bắc, kiểm tra an toàn điện tạm.", "FP-CB-001", 80],
    ["BCHT-TAYHO-2026-0002", "2026-06-25", SiteReportStatus.APPROVED, WeatherCondition.SUNNY, "Hoàn thành mốc tim trục, nghiệm thu nội bộ đạt yêu cầu.", "FP-CB-003", 48],
    ["BCHT-TAYHO-2026-0003", "2026-06-28", SiteReportStatus.APPROVED, WeatherCondition.OVERCAST, "Khoan cọc khu trục A-D/1-3, bê tông đạt yêu cầu độ sụt.", "FP-M-001", 8],
    ["BCHT-TAYHO-2026-0004", "2026-07-02", SiteReportStatus.SUBMITTED, WeatherCondition.LIGHT_RAIN, "Đào đất hố móng khu A; mưa nhẹ cuối ngày.", "FP-M-003", 1450],
    ["BCHT-TAYHO-2026-0005", "2026-07-03", SiteReportStatus.DRAFT, WeatherCondition.HEAVY_RAIN, "Gia công thép đài móng tại bãi, chưa submit do thiếu ảnh nghiệm thu.", "FP-M-004", 12500],
    ["BCHT-TAYHO-2026-0006", "2026-07-04", SiteReportStatus.REJECTED, WeatherCondition.CLOUDY, "Báo cáo cần bổ sung ảnh khu vực đổ bê tông cọc cuối ngày.", "FP-M-002", 180],
  ] as const;

  for (const [reportNo, date, status, weatherCondition, summary, fieldCode, quantityToday] of reportSeeds) {
    const item = fieldItems[fieldCode];
    const report = await prisma.siteReport.upsert({
      where: { id: seedId("site-report", reportNo) },
      update: {
        reportNo,
        type: SiteReportType.DAILY,
        title: `Báo cáo hiện trường ngày ${date}`,
        reportDate: d(date),
        weatherCondition,
        weatherTemperature: weatherCondition === WeatherCondition.HEAVY_RAIN ? 25 : 31,
        weatherNote: weatherCondition === WeatherCondition.HEAVY_RAIN ? "Mưa lớn buổi chiều, chuyển gia công thép vào khu có mái che." : "Thời tiết phù hợp thi công.",
        gpsLat: 21.07232,
        gpsLng: 105.81721,
        summary,
        materials: "Thép D16/D20, xi măng PCB40, cát vàng, đá 1x2.",
        labor: "42 công nhân, 04 kỹ sư, 02 cán bộ an toàn, 01 thủ kho.",
        equipment: "01 máy khoan cọc, 02 máy đào, 04 xe ben, 01 máy bơm bê tông.",
        quality: "Kiểm tra vật liệu đầu vào và nghiệm thu nội bộ theo checklist.",
        issues: status === SiteReportStatus.REJECTED ? "Thiếu ảnh chứng minh khu vực đổ bê tông cuối ca." : "Không có sự cố nghiêm trọng.",
        recommendations: "Bổ sung vật tư theo kế hoạch tuần và cập nhật ảnh hiện trường trước 17h.",
        reporterName: users.siteManager.name,
        weather: null,
        manpowerCount: 49,
        equipmentNote: null,
        generalNote: `${SEED_TAG} - báo cáo ngày mẫu`,
        status,
        submittedAt: status === SiteReportStatus.DRAFT ? null : d(date, 17),
        approvedById: status === SiteReportStatus.APPROVED ? users.director.id : null,
        approvedAt: status === SiteReportStatus.APPROVED ? d(date, 18) : null,
        rejectedReason: status === SiteReportStatus.REJECTED ? "Cần bổ sung ảnh và ghi rõ vị trí nghiệm thu." : null,
        deletedAt: null,
      },
      create: {
        id: seedId("site-report", reportNo),
        reportNo,
        type: SiteReportType.DAILY,
        projectId,
        title: `Báo cáo hiện trường ngày ${date}`,
        reportDate: d(date),
        weatherCondition,
        weatherTemperature: weatherCondition === WeatherCondition.HEAVY_RAIN ? 25 : 31,
        weatherNote: weatherCondition === WeatherCondition.HEAVY_RAIN ? "Mưa lớn buổi chiều, chuyển gia công thép vào khu có mái che." : "Thời tiết phù hợp thi công.",
        gpsLat: 21.07232,
        gpsLng: 105.81721,
        summary,
        materials: "Thép D16/D20, xi măng PCB40, cát vàng, đá 1x2.",
        labor: "42 công nhân, 04 kỹ sư, 02 cán bộ an toàn, 01 thủ kho.",
        equipment: "01 máy khoan cọc, 02 máy đào, 04 xe ben, 01 máy bơm bê tông.",
        quality: "Kiểm tra vật liệu đầu vào và nghiệm thu nội bộ theo checklist.",
        issues: status === SiteReportStatus.REJECTED ? "Thiếu ảnh chứng minh khu vực đổ bê tông cuối ca." : "Không có sự cố nghiêm trọng.",
        recommendations: "Bổ sung vật tư theo kế hoạch tuần và cập nhật ảnh hiện trường trước 17h.",
        reporterName: users.siteManager.name,
        manpowerCount: 49,
        generalNote: `${SEED_TAG} - báo cáo ngày mẫu`,
        status,
        createdById: users.siteManager.id,
        submittedAt: status === SiteReportStatus.DRAFT ? null : d(date, 17),
        approvedById: status === SiteReportStatus.APPROVED ? users.director.id : null,
        approvedAt: status === SiteReportStatus.APPROVED ? d(date, 18) : null,
        rejectedReason: status === SiteReportStatus.REJECTED ? "Cần bổ sung ảnh và ghi rõ vị trí nghiệm thu." : null,
      },
    });

    const designQuantity = item.designQuantity || dec(1);
    await prisma.siteReportLine.upsert({
      where: { id: seedId("site-report-line", reportNo) },
      update: {
        fieldProgressItemId: item.id,
        workName: item.name,
        workContent: item.name,
        area: "Khu A - Trục 1-5",
        constructionCrew: "Đội thi công chính",
        unit: item.unit,
        designQuantity,
        quantityToday: dec(quantityToday),
        quantityBefore: dec(0),
        quantityCumulative: dec(quantityToday),
        progressPercent: dec(Math.min(100, (quantityToday / Number(designQuantity)) * 100).toFixed(2)),
        note: `${SEED_TAG} - line báo cáo liên kết FieldProgressItem`,
        issueNote: status === SiteReportStatus.REJECTED ? "Thiếu ảnh nghiệm thu" : null,
        proposalNote: "Cập nhật khối lượng lũy kế sau khi được duyệt.",
        deletedAt: null,
      },
      create: {
        id: seedId("site-report-line", reportNo),
        siteReportId: report.id,
        projectId,
        fieldProgressItemId: item.id,
        workName: item.name,
        workContent: item.name,
        area: "Khu A - Trục 1-5",
        constructionCrew: "Đội thi công chính",
        unit: item.unit,
        designQuantity,
        quantityToday: dec(quantityToday),
        quantityBefore: dec(0),
        quantityCumulative: dec(quantityToday),
        progressPercent: dec(Math.min(100, (quantityToday / Number(designQuantity)) * 100).toFixed(2)),
        note: `${SEED_TAG} - line báo cáo liên kết FieldProgressItem`,
        issueNote: status === SiteReportStatus.REJECTED ? "Thiếu ảnh nghiệm thu" : null,
        proposalNote: "Cập nhật khối lượng lũy kế sau khi được duyệt.",
      },
    });

    const photoName = `${reportNo}-anh-hien-truong.jpg`;
    const photoPath = `projects/${PROJECT_CODE}/reports/${report.id}/${safeFileName(photoName)}`;
    const photoBuffer = fileBuffer(photoName, `${SEED_TAG} ${reportNo} photo`);
    await writeStoredFile(photoPath, photoBuffer);
    await prisma.siteReportAttachment.upsert({
      where: { id: seedId("site-report-attachment", `${reportNo}:photo`) },
      update: {
        kind: SiteReportAttachmentKind.PHOTO,
        fileName: photoName,
        originalName: photoName,
        mimeType: mimeFor(photoName),
        sizeBytes: photoBuffer.length,
        storagePath: photoPath,
        caption: "Ảnh hiện trường dummy phục vụ UAT",
      },
      create: {
        id: seedId("site-report-attachment", `${reportNo}:photo`),
        reportId: report.id,
        kind: SiteReportAttachmentKind.PHOTO,
        fileName: photoName,
        originalName: photoName,
        mimeType: mimeFor(photoName),
        sizeBytes: photoBuffer.length,
        storagePath: photoPath,
        caption: "Ảnh hiện trường dummy phục vụ UAT",
      },
    });
    await prisma.siteReportPhoto.upsert({
      where: { id: seedId("site-report-photo", reportNo) },
      update: {
        storageKey: photoPath,
        description: `${SEED_TAG} - ảnh hiện trường ${date}`,
      },
      create: {
        id: seedId("site-report-photo", reportNo),
        reportId: report.id,
        storageKey: photoPath,
        description: `${SEED_TAG} - ảnh hiện trường ${date}`,
      },
    });
  }

  const weekly = await prisma.siteReport.upsert({
    where: { id: seedId("site-report", "BCT-TAYHO-2026-W27") },
    update: {
      reportNo: "BCT-TAYHO-2026-W27",
      type: SiteReportType.WEEKLY,
      title: "Báo cáo tuần W27/2026",
      reportDate: d("2026-07-04"),
      weekStartDate: d("2026-06-29"),
      weekEndDate: d("2026-07-04"),
      summary: `${SEED_TAG} - tuần trọng tâm khoan cọc, đào móng và chuẩn bị cốt thép đài móng.`,
      status: SiteReportStatus.SUBMITTED,
      submittedAt: d("2026-07-04", 17),
      deletedAt: null,
    },
    create: {
      id: seedId("site-report", "BCT-TAYHO-2026-W27"),
      reportNo: "BCT-TAYHO-2026-W27",
      type: SiteReportType.WEEKLY,
      projectId,
      title: "Báo cáo tuần W27/2026",
      reportDate: d("2026-07-04"),
      weekStartDate: d("2026-06-29"),
      weekEndDate: d("2026-07-04"),
      summary: `${SEED_TAG} - tuần trọng tâm khoan cọc, đào móng và chuẩn bị cốt thép đài móng.`,
      materials: "Thép, xi măng, cát, đá đã nhập đủ cho giai đoạn móng.",
      labor: "Trung bình 48 nhân sự/ngày.",
      equipment: "Máy khoan cọc, máy đào, xe ben hoạt động ổn định.",
      quality: "Các hạng mục đã duyệt đạt yêu cầu.",
      issues: "Mưa ngày 03/07 làm giảm năng suất đào đất.",
      recommendations: "Tăng ca sáng, bổ sung ảnh báo cáo và hoàn tất hồ sơ vật tư.",
      reporterName: users.projectManager.name,
      status: SiteReportStatus.SUBMITTED,
      createdById: users.projectManager.id,
      submittedAt: d("2026-07-04", 17),
    },
  });

  console.log(`Created/Updated reports: ${reportSeeds.length + 1}, weekly report id: ${weekly.id}`);
}

async function seedDocuments(projectId: string, users: SeedUsers, folders: Record<string, string>) {
  const documentSeeds = [
    ["DOC-001", "01_Bản_vẽ_thi_công/Kết_cấu", "BV-KC-MONG-REV01.pdf", "Bản vẽ móng PDF", DocumentStatus.APPROVED, users.engineer.id, "DRAWING"],
    ["DOC-002", "01_Bản_vẽ_thi_công/Kết_cấu", "BV-KC-MONG-REV01.dwg", "Bản vẽ móng DWG", DocumentStatus.SUBMITTED, users.engineer.id, "DRAWING"],
    ["DOC-003", "02_Hợp_đồng/Chủ_đầu_tư", "HD-TAYHO-2026-001-Hop-dong-chinh.pdf", "Hợp đồng chính PDF", DocumentStatus.APPROVED, users.accountant.id, "CONTRACT"],
    ["DOC-004", "03_Biên_bản_nghiệm_thu/Móng", "BBNT-MONG-2026-07-02.pdf", "Biên bản nghiệm thu móng PDF", DocumentStatus.SUBMITTED, users.documentStaff.id, "ACCEPTANCE"],
    ["DOC-005", "04_Hóa_đơn_chứng_từ/Vật_tư", "HDVAT-THEP-2026-07-01.pdf", "Hóa đơn thép PDF", DocumentStatus.SUBMITTED, users.accountant.id, "INVOICE"],
    ["DOC-006", "05_Hình_ảnh_tiến_độ/2026-07", "IMG-TAYHO-2026-07-04.png", "Ảnh tiến độ PNG", DocumentStatus.SUBMITTED, users.engineer.id, "PHOTO"],
    ["DOC-007", "06_Báo_cáo_ngày/SUBMITTED", "BCHT-TAYHO-2026-07-04.docx", "Báo cáo ngày DOCX", DocumentStatus.SUBMITTED, users.siteManager.id, "REPORT"],
    ["DOC-008", "07_An_toàn_lao_động/Huấn_luyện", "BB-HUAN-LUYEN-ATLD-2026-06-20.pdf", "Biên bản an toàn lao động PDF", DocumentStatus.APPROVED, users.documentStaff.id, "SAFETY"],
  ] as const;

  for (const [key, folderKey, originalName, displayName, status, uploadedById, documentType] of documentSeeds) {
    const folderId = folders[folderKey];
    if (!folderId) throw new Error(`Missing document folder for seed: ${folderKey}`);
    const buffer = fileBuffer(originalName, `${SEED_TAG} ${displayName}`);
    const storedName = `${seedId("document-file", key)}_${safeFileName(originalName)}`;
    const storagePath = `projects/${PROJECT_CODE}/documents/${folderId}/${storedName}`;
    await writeStoredFile(storagePath, buffer);

    await prisma.document.upsert({
      where: { id: seedId("document", key) },
      update: {
        projectId,
        folderId,
        originalName,
        storedName,
        mimeType: mimeFor(originalName),
        extension: path.extname(originalName).toLowerCase(),
        size: buffer.length,
        storagePath,
        uploadedById,
        displayName,
        documentType,
        status,
        metadata: { seedTag: SEED_TAG, projectCode: PROJECT_CODE, dummyFile: true, folderKey },
        fileHash: sha256(buffer),
        reviewedById: status === DocumentStatus.APPROVED ? users.director.id : null,
        reviewedAt: status === DocumentStatus.APPROVED ? d("2026-07-04", 9) : null,
        rejectedReason: null,
        version: 1,
        deletedAt: null,
      },
      create: {
        id: seedId("document", key),
        projectId,
        folderId,
        originalName,
        storedName,
        mimeType: mimeFor(originalName),
        extension: path.extname(originalName).toLowerCase(),
        size: buffer.length,
        storagePath,
        uploadedById,
        displayName,
        documentType,
        status,
        metadata: { seedTag: SEED_TAG, projectCode: PROJECT_CODE, dummyFile: true, folderKey },
        fileHash: sha256(buffer),
        reviewedById: status === DocumentStatus.APPROVED ? users.director.id : null,
        reviewedAt: status === DocumentStatus.APPROVED ? d("2026-07-04", 9) : null,
        version: 1,
      },
    });
  }

  console.log(`Created/Updated documents: ${documentSeeds.length}`);
}

async function seedApprovals(projectId: string, users: SeedUsers) {
  const approvalSeeds = [
    ["APP-TAYHO-2026-0001", "Duyệt yêu cầu vật tư thép và xi măng đợt móng", ApprovalRequestType.MATERIAL, ApprovalRequestStatus.PENDING, ApprovalPriority.URGENT, "1850000000", users.warehouse.id, null, null, "MATERIAL_REQUEST", "MR-TAYHO-2026-0001"],
    ["APP-TAYHO-2026-0002", "Duyệt thanh toán tạm ứng 10% hợp đồng chính", ApprovalRequestType.PAYMENT, ApprovalRequestStatus.APPROVED, ApprovalPriority.HIGH, "9850000000", users.accountant.id, users.director.id, "Đồng ý thanh toán theo điều khoản hợp đồng.", "PAYMENT_REQUEST", "PR-TAYHO-2026-0001"],
    ["APP-TAYHO-2026-0003", "Duyệt báo cáo hiện trường ngày 04/07", ApprovalRequestType.REPORT, ApprovalRequestStatus.REJECTED, ApprovalPriority.NORMAL, null, users.siteManager.id, users.director.id, "Cần bổ sung ảnh khu vực đổ bê tông cuối ca.", "SITE_REPORT", seedId("site-report", "BCHT-TAYHO-2026-0006")],
    ["APP-TAYHO-2026-0004", "Duyệt hợp đồng thầu phụ MEP", ApprovalRequestType.CONTRACT, ApprovalRequestStatus.PENDING, ApprovalPriority.HIGH, "18600000000", users.projectManager.id, null, null, "CONTRACT", "HD-TAYHO-2026-MEP"],
    ["APP-TAYHO-2026-0005", "Duyệt phát sinh bạt che mưa khu gia công thép", ApprovalRequestType.CHANGE_ORDER, ApprovalRequestStatus.CANCELLED, ApprovalPriority.LOW, "38000000", users.siteManager.id, users.projectManager.id, "Hủy do chuyển phương án che chắn sẵn có.", "CHANGE_ORDER", null],
  ] as const;

  for (const [code, title, type, status, priority, amount, requesterId, decidedById, decisionNote, sourceType, sourceId] of approvalSeeds) {
    await prisma.approvalRequest.upsert({
      where: { code },
      update: {
        projectId,
        title,
        description: `${SEED_TAG} - luồng phê duyệt mẫu cho công trình Tây Hồ`,
        type,
        status,
        priority,
        amount: amount ? dec(amount) : null,
        dueDate: d("2026-07-08"),
        requesterId,
        decidedById,
        decidedAt: decidedById ? d("2026-07-04", 10) : null,
        decisionNote,
        sourceType,
        sourceId,
        deletedAt: null,
      },
      create: {
        code,
        projectId,
        title,
        description: `${SEED_TAG} - luồng phê duyệt mẫu cho công trình Tây Hồ`,
        type,
        status,
        priority,
        amount: amount ? dec(amount) : null,
        dueDate: d("2026-07-08"),
        requesterId,
        decidedById,
        decidedAt: decidedById ? d("2026-07-04", 10) : null,
        decisionNote,
        sourceType,
        sourceId,
      },
    });
  }

  console.log(`Created/Updated approvals: ${approvalSeeds.length}`);
}

async function seedNotificationsAndChat(projectId: string, users: SeedUsers) {
  const notifications = [
    ["director", "APPROVAL_PENDING", "WARNING", "Có yêu cầu vật tư chờ duyệt", "Yêu cầu MR-TAYHO-2026-0001 cần xử lý trước 08/07.", "/approvals"],
    ["projectManager", "REPORT_SUBMITTED", "INFO", "Báo cáo tuần mới đã gửi", "Báo cáo tuần W27/2026 đã được submit.", `/reports?projectId=${projectId}`],
    ["accountant", "PAYMENT_PENDING", "WARNING", "Thanh toán thép đang chờ duyệt", "PR-TAYHO-2026-0003 đang ở trạng thái SUBMITTED.", "/accounting"],
    ["warehouse", "MATERIAL_LOW", "ERROR", "Cảnh báo vật tư gần ngưỡng tối thiểu", "Một số vật tư MEP/hoàn thiện chưa nhập kho, cần theo dõi kế hoạch.", "/materials"],
  ] as const;

  for (const [userKey, type, severity, title, message, href] of notifications) {
    const user = users[userKey as SeedUserKey];
    await prisma.notification.upsert({
      where: { id: seedId("notification", `${userKey}:${type}`) },
      update: {
        userId: user.id,
        projectId,
        type,
        severity,
        title,
        message: `${message} ${SEED_TAG}`,
        href,
        isRead: false,
        readAt: null,
      },
      create: {
        id: seedId("notification", `${userKey}:${type}`),
        userId: user.id,
        projectId,
        type,
        severity,
        title,
        message: `${message} ${SEED_TAG}`,
        href,
        isRead: false,
      },
    });
  }

  const chats = [
    ["siteManager", "Chỉ huy trưởng báo: hôm nay đã hoàn thành thêm 6 cọc khu B, cần cập nhật ảnh trước 17h."],
    ["accountant", "Kế toán hỏi: hồ sơ VAT thép đợt 1 đã có bản gốc chưa để hoàn tất PR-TAYHO-2026-0003?"],
    ["director", "Giám đốc yêu cầu: bổ sung ảnh tiến độ khu đào móng và ghi rõ vị trí GPS trong báo cáo."],
    ["warehouse", "Thủ kho cập nhật: tồn thép D16 còn đủ cho 2 ngày, đang chờ duyệt yêu cầu bổ sung."],
  ] as const;

  for (let index = 0; index < chats.length; index += 1) {
    const [userKey, content] = chats[index];
    await prisma.chatMessage.upsert({
      where: { id: seedId("chat", `${PROJECT_CODE}:${index + 1}`) },
      update: {
        senderId: users[userKey as SeedUserKey].id,
        content: `[${PROJECT_CODE}] ${content} ${SEED_TAG}`,
      },
      create: {
        id: seedId("chat", `${PROJECT_CODE}:${index + 1}`),
        senderId: users[userKey as SeedUserKey].id,
        content: `[${PROJECT_CODE}] ${content} ${SEED_TAG}`,
        createdAt: d("2026-07-04", 16 + index),
      },
    });
  }

  console.log(`Created/Updated notifications/chat: ${notifications.length} notifications, ${chats.length} chat messages`);
}

async function seedSettingsIfMissing(users: SeedUsers) {
  const existing = await prisma.systemSetting.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) {
    console.log("System settings: existing settings detected, left untouched");
    return;
  }

  await prisma.systemSetting.create({
    data: {
      companyName: "CT2 Hanoi Construction",
      taxCode: "0100000000",
      hotline: "02439990000",
      timezone: "Asia/Bangkok",
      currency: "VND",
      fiscalYearStartMonth: "1",
      requireTwoFactorForAdmins: true,
      sessionTimeoutMinutes: 60,
      passwordRotationDays: 90,
      allowedIpMode: "restricted",
      trustedDeviceReviewDays: 30,
      auditSensitiveActions: true,
      requireProjectCodeBeforeSpending: true,
      materialRequestApproval: true,
      paymentTwoStepApproval: true,
      reportLockAfterApproval: true,
      contractValueThreshold: dec("5000000000"),
      enforceNamingConvention: true,
      autoVersioning: true,
      allowedExtensions: "pdf, doc, docx, xls, xlsx, dwg, dxf, jpg, jpeg, png, heic, webp, xml",
      documentRetentionYears: 10,
      emailDailyDigest: false,
      approvalEscalation: true,
      fieldReportReminder: true,
      reminderTime: "17:30",
      escalationHours: 24,
      automaticBackup: true,
      backupFrequency: "daily",
      retentionYears: 7,
      exportRequiresApproval: true,
      maintenanceWindow: "22:00 - 23:00",
      updatedById: users.admin.id,
    },
  });
  console.log("System settings: created default settings because none existed");
}

async function seedAuditLog(projectId: string, users: SeedUsers) {
  await prisma.auditLog.upsert({
    where: { id: seedId("audit", PROJECT_CODE) },
    update: {
      userId: users.admin.id,
      projectId,
      action: "SEED_COMPLETE_REALISTIC_PROJECT",
      entityType: "Project",
      entityId: projectId,
      beforeData: null,
      afterData: JSON.stringify({ seedTag: SEED_TAG, projectCode: PROJECT_CODE, projectName: PROJECT_NAME }),
      ipAddress: "127.0.0.1",
      userAgent: "scripts/seed-complete-realistic-project.ts",
    },
    create: {
      id: seedId("audit", PROJECT_CODE),
      userId: users.admin.id,
      projectId,
      action: "SEED_COMPLETE_REALISTIC_PROJECT",
      entityType: "Project",
      entityId: projectId,
      afterData: JSON.stringify({ seedTag: SEED_TAG, projectCode: PROJECT_CODE, projectName: PROJECT_NAME }),
      ipAddress: "127.0.0.1",
      userAgent: "scripts/seed-complete-realistic-project.ts",
    },
  });
}

async function verifySeed(projectId: string) {
  const [
    usersCount,
    projectMembers,
    folders,
    documents,
    wbsItems,
    fieldItems,
    fieldEntries,
    materialItems,
    materialMovements,
    materialRequests,
    fieldMaterialRequests,
    contracts,
    paymentPlans,
    paymentRecords,
    paymentRequests,
    approvals,
    reports,
    reportAttachments,
    notifications,
    chatMessages,
  ] = await Promise.all([
    prisma.user.count({ where: { email: { endsWith: "@seed.local" } } }),
    prisma.projectMember.count({ where: { projectId, deletedAt: null } }),
    prisma.documentFolder.count({ where: { projectId, deletedAt: null } }),
    prisma.document.count({ where: { projectId, deletedAt: null } }),
    prisma.wBSItem.count({ where: { projectId, deletedAt: null } }),
    prisma.fieldProgressItem.count({ where: { projectId, deletedAt: null } }),
    prisma.fieldProgressEntry.count({ where: { projectId, deletedAt: null } }),
    prisma.materialItem.count({ where: { projectId } }),
    prisma.materialMovement.count({ where: { projectId } }),
    prisma.materialRequest.count({ where: { projectId, deletedAt: null } }),
    prisma.fieldMaterialRequest.count({ where: { projectId, deletedAt: null } }),
    prisma.contract.count({ where: { projectId, deletedAt: null } }),
    prisma.paymentPlan.count({ where: { projectId } }),
    prisma.paymentRecord.count({ where: { projectId } }),
    prisma.paymentRequest.count({ where: { projectId, deletedAt: null } }),
    prisma.approvalRequest.count({ where: { projectId, deletedAt: null } }),
    prisma.siteReport.count({ where: { projectId, deletedAt: null } }),
    prisma.siteReportAttachment.count({ where: { report: { projectId } } }),
    prisma.notification.count({ where: { projectId } }),
    prisma.chatMessage.count({ where: { content: { contains: SEED_TAG } } }),
  ]);

  const entries = await prisma.fieldProgressEntry.findMany({
    where: { projectId, deletedAt: null, status: { not: FieldProgressEntryStatus.CANCELLED } },
    include: { item: true },
  });
  const totalsByItem = new Map<string, Prisma.Decimal>();
  for (const entry of entries) {
    const current = totalsByItem.get(entry.itemId) || dec(0);
    totalsByItem.set(entry.itemId, current.plus(entry.quantity));
  }
  const overDesigned = entries.filter((entry) => {
    const designQuantity = entry.item.designQuantity;
    if (!designQuantity) return false;
    const total = totalsByItem.get(entry.itemId) || dec(0);
    return total.gt(designQuantity);
  });

  const docs = await prisma.document.findMany({
    where: { projectId, deletedAt: null },
    select: { storagePath: true, originalName: true },
  });
  const missingFiles: string[] = [];
  for (const doc of docs) {
    try {
      await fs.access(path.resolve(STORAGE_ROOT, doc.storagePath));
    } catch {
      missingFiles.push(doc.originalName);
    }
  }

  const stockRows = await prisma.projectMaterialStock.findMany({
    where: { projectId },
    select: { stock: true, minStockLevel: true },
  });

  const dashboardReadable = {
    totalProjects: await prisma.project.count({ where: { deletedAt: null } }),
    activeProjects: await prisma.project.count({ where: { status: ProjectStatus.ACTIVE, deletedAt: null } }),
    entriesOnReferenceDate: await prisma.fieldProgressEntry.count({
      where: { projectId, entryDate: d(SEED_REFERENCE_DATE), deletedAt: null },
    }),
    pendingApprovals: await prisma.approvalRequest.count({
      where: { projectId, status: ApprovalRequestStatus.PENDING, deletedAt: null },
    }),
    pendingPaymentRequests: await prisma.paymentRequest.count({
      where: { projectId, status: { in: [PaymentRequestStatus.SUBMITTED, PaymentRequestStatus.APPROVED] }, deletedAt: null },
    }),
    recentReports: reports,
    documentCount: documents,
    lowStockItems: stockRows.filter((row) => row.stock.lte(row.minStockLevel)).length,
  };

  const counts = {
    usersCount,
    projectMembers,
    folders,
    documents,
    wbsItems,
    fieldItems,
    fieldEntries,
    materialItems,
    materialMovements,
    materialRequests,
    fieldMaterialRequests,
    contracts,
    paymentPlans,
    paymentRecords,
    paymentRequests,
    approvals,
    reports,
    reportAttachments,
    notifications,
    chatMessages,
    dashboardReadable,
  };

  const failures = [
    projectMembers < 9 ? "Expected at least 9 project members" : null,
    folders < 7 ? "Expected at least 7 document root folders" : null,
    fieldItems < 28 ? "Expected field progress groups and work items" : null,
    fieldEntries < 16 ? "Expected daily progress entries" : null,
    materialItems < 8 ? "Expected required materials" : null,
    contracts < 3 ? "Expected contracts" : null,
    paymentRequests < 5 ? "Expected payment requests" : null,
    approvals < 5 ? "Expected approvals" : null,
    reports < 6 ? "Expected reports" : null,
    overDesigned.length > 0 ? `Progress entries exceed design quantity: ${overDesigned.map((entry) => entry.item.code).join(", ")}` : null,
    missingFiles.length > 0 ? `Missing document files: ${missingFiles.join(", ")}` : null,
    dashboardReadable.entriesOnReferenceDate < 1 ? "Dashboard reference date has no field progress entries" : null,
  ].filter(Boolean);

  console.log("Post-seed verification counts:");
  console.log(JSON.stringify(counts, null, 2));

  if (failures.length > 0) {
    throw new Error(`Seed verification failed:\n- ${failures.join("\n- ")}`);
  }

  console.log("Post-seed verification: PASS");
  return counts;
}

async function main() {
  console.log(`=== ${SEED_TAG} ===`);
  console.log(`Project: ${PROJECT_CODE} - ${PROJECT_NAME}`);

  const users = await seedUsers();
  await seedSettingsIfMissing(users);
  const project = await seedProject(users);
  const suppliers = await seedSuppliers();
  const folders = await seedFolders(project.id);
  await seedWbs(project.id, users);
  const { templateId, fieldItems } = await seedFieldProgress(project.id, users);
  await seedMaterials(project.id, users, fieldItems);
  await seedFieldMaterialRequests(project.id, templateId, users, fieldItems);
  await seedContractsAndPayments(project.id, users, suppliers);
  await seedReports(project.id, users, fieldItems);
  await seedDocuments(project.id, users, folders);
  await seedApprovals(project.id, users);
  await seedNotificationsAndChat(project.id, users);
  await seedAuditLog(project.id, users);
  await verifySeed(project.id);

  console.log(`Seed completed for ${PROJECT_CODE}`);
  console.log(`Seed user emails use @seed.local. Default password can be overridden with COMPLETE_REALISTIC_PROJECT_SEED_PASSWORD.`);
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
