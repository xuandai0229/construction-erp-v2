import { $Enums, Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import * as dotenv from "dotenv";
import * as fs from "fs/promises";
import * as path from "path";
import { Pool } from "pg";
import * as XLSX from "xlsx";

dotenv.config();

const PROJECT_CODE = "QA-TUHIEP-5F-001";
const TEMPLATE_NAME = "Bang khoi luong thi cong - QA Tu Hiep 5F";
const QA_STORAGE_DIR = "qa-realistic-tu-hiep";
const DEFAULT_PASSWORD = "QaRealistic@2026!";

const args = new Set(process.argv.slice(2));
const shouldExecute = args.has("--execute");
const isDryRun = args.has("--dry-run") || !shouldExecute;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

if (process.env.NODE_ENV === "production" && process.env.ALLOW_QA_REALISTIC_SEED_PRODUCTION !== "true") {
  throw new Error("Refusing to seed production without ALLOW_QA_REALISTIC_SEED_PRODUCTION=true");
}

const connectionString = requireEnv("DATABASE_URL");
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const storageRoot = process.env.STORAGE_ROOT || path.join(process.cwd(), "storage");

function dateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function decimal(value: number | string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function toStoragePath(...parts: string[]): string {
  return path.join(...parts).replace(/\\/g, "/");
}

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function sha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

type QaUserKey =
  | "admin"
  | "director"
  | "commander"
  | "engineer"
  | "accountant"
  | "viewer"
  | "outsider";

const users: Array<{
  key: QaUserKey;
  email: string;
  username: string;
  name: string;
  role: $Enums.UserRole;
  phone?: string;
}> = [
  {
    key: "admin",
    email: "qa.admin.tuhiep@example.test",
    username: "qa_admin_tuhiep",
    name: "QA Admin Tu Hiep",
    role: "ADMIN",
    phone: "0900000001",
  },
  {
    key: "director",
    email: "qa.director.tuhiep@example.test",
    username: "qa_director_tuhiep",
    name: "Tran Minh Khoi",
    role: "DIRECTOR",
    phone: "0900000002",
  },
  {
    key: "commander",
    email: "qa.commander.tuhiep@example.test",
    username: "qa_commander_tuhiep",
    name: "Nguyen Hoang Nam",
    role: "CHIEF_COMMANDER",
    phone: "0900000003",
  },
  {
    key: "engineer",
    email: "qa.engineer.tuhiep@example.test",
    username: "qa_engineer_tuhiep",
    name: "Le Quang Huy",
    role: "ENGINEER",
    phone: "0900000004",
  },
  {
    key: "accountant",
    email: "qa.accountant.tuhiep@example.test",
    username: "qa_accountant_tuhiep",
    name: "Vu Thi Mai Anh",
    role: "ACCOUNTANT",
    phone: "0900000005",
  },
  {
    key: "viewer",
    email: "qa.viewer.tuhiep@example.test",
    username: "qa_viewer_tuhiep",
    name: "Pham Gia Linh",
    role: "STAFF",
    phone: "0900000006",
  },
  {
    key: "outsider",
    email: "qa.outsider@example.test",
    username: "qa_outsider",
    name: "QA User Ngoai Cong Trinh",
    role: "ENGINEER",
    phone: "0900000007",
  },
];

const projectMembers: Array<{
  userKey: QaUserKey;
  role: $Enums.ProjectRole;
  note: string;
}> = [
  {
    userKey: "commander",
    role: "CHIEF_COMMANDER",
    note: "Chỉ huy trưởng công trình, được phép tạo và gửi báo cáo.",
  },
  {
    userKey: "engineer",
    role: "SUPERVISOR",
    note: "Kỹ sư hiện trường phụ trách nhập khối lượng ngày và báo cáo ngày.",
  },
  {
    userKey: "accountant",
    role: "VIEWER",
    note: "Kế toán công trình, test quyền xem và tài liệu kế toán.",
  },
  {
    userKey: "viewer",
    role: "VIEWER",
    note: "Nhân viên chỉ xem trong công trình.",
  },
];

const folderNames = [
  "01_Hợp đồng",
  "02_Bản vẽ",
  "03_Dự toán",
  "04_Nghiệm thu",
  "05_Hóa đơn",
  "06_Thanh toán",
  "07_Hình ảnh hiện trường",
  "08_Báo cáo ngày",
  "09_Vật tư",
  "10_Phát sinh",
];

type WorkItemSeed = {
  code: string;
  type: $Enums.FieldProgressItemType;
  parentCode?: string;
  name: string;
  crew?: string;
  unit?: string;
  quantity?: number;
  note: string;
  status?: $Enums.FieldProgressItemStatus;
};

const fieldItems: WorkItemSeed[] = [
  { code: "G-01", type: "GROUP", name: "Công tác chuẩn bị", note: "Giai đoạn chuẩn bị trước khi thi công móng" },
  {
    code: "PRE-001",
    type: "WORK",
    parentCode: "G-01",
    name: "Dọn dẹp mặt bằng, bóc lớp hữu cơ",
    crew: "Mũi chuẩn bị",
    unit: "m2",
    quantity: 1850,
    note: "Bao gồm thu gom phế thải và san gạt sơ bộ",
    status: "IN_PROGRESS",
  },
  {
    code: "PRE-002",
    type: "WORK",
    parentCode: "G-01",
    name: "Định vị tim trục, cao độ chuẩn",
    crew: "Tổ trắc đạc",
    unit: "điểm",
    quantity: 72,
    note: "Có nghiệm thu mốc gửi chủ đầu tư",
    status: "IN_PROGRESS",
  },
  {
    code: "PRE-003",
    type: "WORK",
    parentCode: "G-01",
    name: "Lán trại, kho vật tư, điện nước tạm",
    crew: "Mũi chuẩn bị",
    unit: "m2",
    quantity: 120,
    note: "Lắp container văn phòng và kho nhỏ",
    status: "IN_PROGRESS",
  },
  { code: "G-02", type: "GROUP", name: "Phần móng", note: "Móng cọc và đài giằng bê tông cốt thép" },
  {
    code: "FND-001",
    type: "WORK",
    parentCode: "G-02",
    name: "Đào đất hố móng, vận chuyển nội bộ",
    crew: "Mũi móng A",
    unit: "m3",
    quantity: 980,
    note: "Đào theo từng phân khu A/B",
    status: "IN_PROGRESS",
  },
  {
    code: "FND-002",
    type: "WORK",
    parentCode: "G-02",
    name: "Đổ bê tông lót móng M100",
    crew: "Mũi bê tông",
    unit: "m3",
    quantity: 82,
    note: "Dày 100 mm dưới đài và giằng móng",
    status: "IN_PROGRESS",
  },
  {
    code: "FND-003",
    type: "WORK",
    parentCode: "G-02",
    name: "Gia công lắp dựng cốt thép móng",
    crew: "Tổ thép móng",
    unit: "kg",
    quantity: 42000,
    note: "Thép CB400, nghiệm thu trước khi đổ",
    status: "IN_PROGRESS",
  },
  {
    code: "FND-004",
    type: "WORK",
    parentCode: "G-02",
    name: "Lắp dựng cốp pha móng",
    crew: "Tổ cốp pha",
    unit: "m2",
    quantity: 1350,
    note: "Cốp pha thép kết hợp ván phủ phim",
    status: "IN_PROGRESS",
  },
  {
    code: "FND-005",
    type: "WORK",
    parentCode: "G-02",
    name: "Đổ bê tông móng M300",
    crew: "Mũi bê tông",
    unit: "m3",
    quantity: 430,
    note: "Chia 3 đợt đổ, có lấy mẫu nén",
    status: "IN_PROGRESS",
  },
  { code: "G-03", type: "GROUP", name: "Phần thân tầng 1 đến tầng 5", note: "Khung bê tông cốt thép toàn khối" },
  { code: "STR-101", type: "WORK", parentCode: "G-03", name: "Cốt thép cột tầng 1", crew: "Tổ thép thân", unit: "kg", quantity: 12500, note: "Cột trục A-D/1-6", status: "IN_PROGRESS" },
  { code: "STR-102", type: "WORK", parentCode: "G-03", name: "Cốp pha cột tầng 1", crew: "Tổ cốp pha thân", unit: "m2", quantity: 520, note: "Cần kiểm tra tim cột sau ghép", status: "IN_PROGRESS" },
  { code: "STR-103", type: "WORK", parentCode: "G-03", name: "Bê tông cột tầng 1", crew: "Mũi bê tông", unit: "m3", quantity: 86, note: "Đổ bằng bơm cần" },
  { code: "STR-104", type: "WORK", parentCode: "G-03", name: "Cốt thép dầm sàn tầng 1", crew: "Tổ thép thân", unit: "kg", quantity: 23500, note: "Bao gồm dầm chính/phụ và thép sàn" },
  { code: "STR-105", type: "WORK", parentCode: "G-03", name: "Cốp pha dầm sàn tầng 1", crew: "Tổ cốp pha thân", unit: "m2", quantity: 1460, note: "Có chống tăng và kiểm tra cao độ" },
  { code: "STR-106", type: "WORK", parentCode: "G-03", name: "Bê tông dầm sàn tầng 1", crew: "Mũi bê tông", unit: "m3", quantity: 285, note: "Đổ liên tục trong 1 ca dài" },
  { code: "STR-201", type: "WORK", parentCode: "G-03", name: "Cột, dầm, sàn tầng 2", crew: "Mũi thân tầng 2", unit: "m2 sàn", quantity: 970, note: "Tổng hợp theo tầng cho test dài hạn" },
  { code: "STR-301", type: "WORK", parentCode: "G-03", name: "Cột, dầm, sàn tầng 3", crew: "Mũi thân tầng 3", unit: "m2 sàn", quantity: 970, note: "Chưa triển khai trong 14 ngày đầu" },
  { code: "STR-401", type: "WORK", parentCode: "G-03", name: "Cột, dầm, sàn tầng 4", crew: "Mũi thân tầng 4", unit: "m2 sàn", quantity: 970, note: "Chưa triển khai trong 14 ngày đầu" },
  { code: "STR-501", type: "WORK", parentCode: "G-03", name: "Cột, dầm, sàn tầng 5", crew: "Mũi thân tầng 5", unit: "m2 sàn", quantity: 970, note: "Chưa triển khai trong 14 ngày đầu" },
  { code: "STR-STAIR", type: "WORK", parentCode: "G-03", name: "Cầu thang bộ tầng 1 đến tầng 5", crew: "Tổ hoàn thiện thô", unit: "m3", quantity: 155, note: "Thi công xen kẽ theo tầng" },
  { code: "STR-WALL", type: "WORK", parentCode: "G-03", name: "Xây tường bao và tường ngăn", crew: "Tổ xây", unit: "m2", quantity: 3620, note: "Gạch AAC/tường bao gạch đặc theo thiết kế" },
  { code: "G-04", type: "GROUP", name: "Hoàn thiện", note: "Chưa thi công chính trong 14 ngày đầu" },
  { code: "FIN-001", type: "WORK", parentCode: "G-04", name: "Trát tường trong/ngoài", crew: "Tổ trát", unit: "m2", quantity: 7200, note: "Tính theo diện tích tường" },
  { code: "FIN-002", type: "WORK", parentCode: "G-04", name: "Lát nền gạch porcelain", crew: "Tổ lát nền", unit: "m2", quantity: 4300, note: "Khu văn phòng, hành lang, sảnh" },
  { code: "FIN-003", type: "WORK", parentCode: "G-04", name: "Sơn bả hoàn thiện", crew: "Tổ sơn bả", unit: "m2", quantity: 8600, note: "Bao gồm bả, sơn lót và phủ" },
  { code: "FIN-004", type: "WORK", parentCode: "G-04", name: "Lắp cửa nhôm kính, cửa thép chống cháy", crew: "Tổ cửa", unit: "bộ", quantity: 138, note: "Bao gồm cửa đi và cửa sổ" },
  { code: "FIN-005", type: "WORK", parentCode: "G-04", name: "Trần thạch cao", crew: "Tổ trần", unit: "m2", quantity: 3900, note: "Khung xương chìm, tấm chống ẩm khu vệ sinh" },
  { code: "G-05", type: "GROUP", name: "MEP", note: "Thi công âm chờ song song phần thân" },
  { code: "MEP-001", type: "WORK", parentCode: "G-05", name: "Điện âm tường, ống chờ sàn", crew: "Tổ điện", unit: "m", quantity: 9800, note: "Ống PVC, hộp nối, tủ tầng" },
  { code: "MEP-002", type: "WORK", parentCode: "G-05", name: "Cấp thoát nước âm sàn/tường", crew: "Tổ nước", unit: "m", quantity: 2600, note: "PPR/uPVC theo shopdrawing" },
  { code: "MEP-003", type: "WORK", parentCode: "G-05", name: "Điều hòa thông gió", crew: "Tổ HVAC", unit: "m", quantity: 1800, note: "Ống gió, ống đồng, giá treo" },
  { code: "MEP-004", type: "WORK", parentCode: "G-05", name: "PCCC cơ bản", crew: "Tổ PCCC", unit: "m", quantity: 1450, note: "Ống sprinkler/hộp chữa cháy hành lang" },
];

const dailyEntries = [
  { date: "2026-07-01", status: "APPROVED", code: "PRE-001", quantity: 500, note: "Bắt đầu dọn mặt bằng phân khu A." },
  { date: "2026-07-01", status: "APPROVED", code: "PRE-002", quantity: 24, note: "Định vị trục khu văn phòng chính." },
  { date: "2026-07-01", status: "APPROVED", code: "PRE-003", quantity: 35, note: "Lắp container văn phòng và kho tạm." },
  { date: "2026-07-02", status: "APPROVED", code: "PRE-001", quantity: 650, note: "Dọn mặt bằng phân khu B." },
  { date: "2026-07-02", status: "APPROVED", code: "PRE-002", quantity: 24, note: "Bổ sung mốc cao độ chuẩn." },
  { date: "2026-07-02", status: "APPROVED", code: "PRE-003", quantity: 45, note: "Hoàn thiện điện nước tạm." },
  { date: "2026-07-03", status: "SUBMITTED", code: "PRE-001", quantity: 700, note: "Hoàn thành dọn dẹp mặt bằng." },
  { date: "2026-07-03", status: "SUBMITTED", code: "PRE-002", quantity: 20, note: "Còn 4 điểm cần kiểm tra lại sau mưa." },
  { date: "2026-07-03", status: "SUBMITTED", code: "PRE-003", quantity: 40, note: "Lán trại đạt 100%." },
  { date: "2026-07-04", status: "DRAFT", code: "FND-001", quantity: 160, note: "Đào móng khu A, đang chờ xác nhận cao độ pit." },
  { date: "2026-07-04", status: "DRAFT", code: "FND-003", quantity: 5000, note: "Gia công thép đài móng đợt 1." },
  { date: "2026-07-06", status: "APPROVED", code: "FND-001", quantity: 180, note: "Tiếp tục đào móng sau ngày trống." },
  { date: "2026-07-06", status: "APPROVED", code: "FND-003", quantity: 7000, note: "Thép móng đợt 1." },
  { date: "2026-07-06", status: "APPROVED", code: "FND-004", quantity: 200, note: "Bắt đầu cốp pha đài móng." },
  { date: "2026-07-07", status: "SUBMITTED", code: "FND-001", quantity: 150, note: "Đào móng đạt mốc 50%." },
  { date: "2026-07-07", status: "SUBMITTED", code: "FND-002", quantity: 20, note: "Đổ bê tông lót khu A." },
  { date: "2026-07-07", status: "SUBMITTED", code: "FND-004", quantity: 250, note: "Cốp pha tiếp tục khu A/B." },
  { date: "2026-07-08", status: "APPROVED", code: "FND-001", quantity: 170, note: "Đào móng khu B." },
  { date: "2026-07-08", status: "APPROVED", code: "FND-002", quantity: 25, note: "Bê tông lót phần còn lại khu A." },
  { date: "2026-07-08", status: "APPROVED", code: "FND-003", quantity: 9000, note: "Thép móng đạt 50%." },
  { date: "2026-07-09", status: "DRAFT", code: "FND-001", quantity: 150, issueNote: "Mưa nhẹ buổi chiều.", proposalNote: "Tăng ca sáng 2026-07-10 để bắt kịp tiến độ.", note: "Draft gần hoàn thành đào móng." },
  { date: "2026-07-09", status: "DRAFT", code: "FND-004", quantity: 300, issueNote: "Thiếu một lô ván phủ phim.", proposalNote: "Bổ sung 120 tấm ván phủ phim.", note: "Cốp pha có phát sinh vật tư." },
  { date: "2026-07-10", status: "APPROVED", code: "FND-001", quantity: 170, note: "Đào móng đạt đúng khối lượng thiết kế 100%." },
  { date: "2026-07-10", status: "APPROVED", code: "FND-002", quantity: 30, note: "Bê tông lót đạt 91.46%, case near-limit." },
  { date: "2026-07-10", status: "APPROVED", code: "FND-003", quantity: 8000, note: "Tiếp tục thép móng." },
  { date: "2026-07-11", status: "SUBMITTED", code: "FND-004", quantity: 280, note: "Cốp pha đạt 76.30%." },
  { date: "2026-07-11", status: "SUBMITTED", code: "FND-005", quantity: 120, note: "Bắt đầu bê tông móng đợt 1." },
  { date: "2026-07-11", status: "SUBMITTED", code: "STR-101", quantity: 2500, note: "Gia công thép cột tầng 1 tại bãi." },
  { date: "2026-07-12", status: "APPROVED", code: "FND-003", quantity: 8500, note: "Thép móng đạt 89.29%." },
  { date: "2026-07-12", status: "APPROVED", code: "FND-004", quantity: 250, note: "Cốp pha móng đạt 94.81%, sát giới hạn." },
  { date: "2026-07-12", status: "APPROVED", code: "FND-005", quantity: 130, note: "Bê tông móng đợt 2." },
  { date: "2026-07-13", status: "APPROVED", code: "FND-005", quantity: 150, note: "Bê tông móng đạt 93.02%, near-limit." },
  { date: "2026-07-13", status: "APPROVED", code: "STR-101", quantity: 3000, note: "Thép cột tầng 1 đạt 44%." },
  { date: "2026-07-13", status: "APPROVED", code: "STR-102", quantity: 120, note: "Bắt đầu cốp pha cột tầng 1." },
] as const;

const reportSeeds = [
  { no: "BCN-QA-TUHIEP-20260701", type: "DAILY", date: "2026-07-01", status: "APPROVED", creator: "engineer", title: "Báo cáo ngày 01/07/2026", summary: "Dọn mặt bằng, định vị mốc và lập lán trại trong ngày khởi công.", weather: "SUNNY", temp: 32, labor: "38 công nhân, 2 kỹ sư hiện trường, 1 chỉ huy trưởng.", equipment: "Máy toàn đạc, xe ben 5 tấn, máy phát điện 50kVA.", issues: "Không có vấn đề lớn.", recommendations: "Hoàn tất mốc gửi chủ đầu tư trước khi đào móng." },
  { no: "BCN-QA-TUHIEP-20260702", type: "DAILY", date: "2026-07-02", status: "APPROVED", creator: "engineer", title: "Báo cáo ngày 02/07/2026", summary: "Hoàn thiện phần lớn công tác chuẩn bị và điện nước tạm.", weather: "CLOUDY", temp: 31, labor: "42 công nhân, 2 kỹ sư, 1 cán bộ an toàn.", equipment: "Xe ben, máy đầm bàn, máy cắt sắt.", issues: "Khu tập kết vật tư cần bố trí lại lối vào.", recommendations: "Bổ sung biển báo an toàn tại cổng tạm." },
  { no: "BCN-QA-TUHIEP-20260703", type: "DAILY", date: "2026-07-03", status: "SUBMITTED", creator: "engineer", title: "Báo cáo ngày 03/07/2026", summary: "Công tác chuẩn bị đạt gần 100%, chờ duyệt nghiệm thu mốc.", weather: "LIGHT_RAIN", temp: 29, labor: "30 công nhân, 2 kỹ sư.", equipment: "Máy toàn đạc, xe tải nhỏ.", issues: "Con 4 diem moc can kiem tra lai sau mua.", recommendations: "Kiểm tra lại mốc vào sáng 04/07." },
  { no: "BCN-QA-TUHIEP-20260704", type: "DAILY", date: "2026-07-04", status: "DRAFT", creator: "engineer", title: "Báo cáo ngày 04/07/2026", summary: "Bắt đầu đào móng và gia công thép móng đợt 1.", weather: "OVERCAST", temp: 30, labor: "34 công nhân, 2 kỹ sư.", equipment: "Máy đào 1.0m3, xe ben, máy uốn sắt.", issues: "Đang chờ xác nhận cao độ hố pit.", recommendations: "Bổ sung ảnh nghiệm thu trước khi gửi." },
  { no: "BCN-QA-TUHIEP-20260706", type: "DAILY", date: "2026-07-06", status: "APPROVED", creator: "commander", title: "Báo cáo ngày 06/07/2026", summary: "Phần móng A triển khai ổn định sau một ngày không nhập dữ liệu.", weather: "SUNNY", temp: 33, labor: "46 công nhân, 2 kỹ sư, 1 chỉ huy trưởng.", equipment: "Máy đào, xe ben, máy cắt uốn thép, đầm cóc tay.", issues: "Kho bãi thép cần che mưa.", recommendations: "Lập mái che tạm cho khu gia công." },
  { no: "BCN-QA-TUHIEP-20260707", type: "DAILY", date: "2026-07-07", status: "SUBMITTED", creator: "engineer", title: "Báo cáo ngày 07/07/2026", summary: "Bê tông lót bắt đầu, cốp pha tiếp tục trên nhiều mũi.", weather: "CLOUDY", temp: 32, labor: "48 công nhân, 2 kỹ sư.", equipment: "Xe trộn bê tông, máy đầm dùi, máy cắt sắt.", issues: "Cần bổ sung chứng chỉ vật liệu bê tông lót.", recommendations: "Cập nhật hồ sơ vật liệu trước ngày 08/07." },
  { no: "BCN-QA-TUHIEP-20260709", type: "DAILY", date: "2026-07-09", status: "REJECTED", creator: "engineer", title: "Báo cáo ngày 09/07/2026", summary: "Đào móng gần hoàn thành, cốp pha có phát sinh thiếu vật tư.", weather: "LIGHT_RAIN", temp: 28, labor: "44 công nhân, 2 kỹ sư.", equipment: "Máy đào, xe ben, máy uốn sắt.", issues: "Thiếu ảnh nghiệm thu cốp pha và thiếu ván phủ phim.", recommendations: "Bổ sung ảnh và cấp vật tư trong ngày tiếp theo.", rejectedReason: "Thiếu ảnh nghiệm thu cốp pha trước khi gửi duyệt." },
  { no: "BCN-QA-TUHIEP-20260710", type: "DAILY", date: "2026-07-10", status: "APPROVED", creator: "commander", title: "Báo cáo ngày 10/07/2026", summary: "Đào móng đạt 100%, bê tông lót đạt gần giới hạn thiết kế.", weather: "SUNNY", temp: 34, labor: "52 công nhân, 2 kỹ sư, 1 chỉ huy trưởng.", equipment: "Máy đào, xe ben, máy đầm dùi.", issues: "Kiểm soát khối lượng bê tông lót sát thiết kế.", recommendations: "Không nhập thêm bê tông lót nếu không có phát sinh duyệt." },
  { no: "BCN-QA-TUHIEP-20260712", type: "DAILY", date: "2026-07-12", status: "APPROVED", creator: "engineer", title: "Báo cáo ngày 12/07/2026", summary: "Cốp pha móng đạt 94.81%, thép móng đạt 89.29%.", weather: "CLOUDY", temp: 31, labor: "55 công nhân, 2 kỹ sư.", equipment: "Máy uốn sắt, máy hàn, đầm dùi.", issues: "Cần chốt lịch đổ bê tông đợt tiếp.", recommendations: "Xác nhận lịch xe bê tông ngày 13/07." },
  { no: "BCN-QA-TUHIEP-20260713", type: "DAILY", date: "2026-07-13", status: "APPROVED", creator: "engineer", title: "Báo cáo ngày 13/07/2026", summary: "Bê tông móng đạt 93.02%, bắt đầu thép và cốp pha cột tầng 1.", weather: "SUNNY", temp: 33, labor: "58 công nhân, 3 kỹ sư.", equipment: "Bơm bê tông, máy đầm dùi, máy uốn sắt.", issues: "Cần tách luồng vật tư cho phần thân tầng 1.", recommendations: "Lên phiếu yêu cầu thép cột tầng 1 và cốp pha thân." },
  { no: "BCT-QA-TUHIEP-20260701-20260707", type: "WEEKLY", date: "2026-07-07", weekStart: "2026-07-01", weekEnd: "2026-07-07", status: "APPROVED", creator: "commander", title: "Báo cáo tuần 01/07 - 07/07/2026", summary: "Tuần 1 hoàn thành phần chuẩn bị, bắt đầu phần móng và có dữ liệu draft/submitted.", weather: "CLOUDY", temp: 31, labor: "Bình quân 40-48 nhân sự/ngày.", equipment: "Máy đào, xe ben, máy toàn đạc, máy gia công thép.", issues: "Ngày 05/07 chưa nhập dữ liệu, cần test calendar empty day.", recommendations: "Duy trì nhập liệu hàng ngày và chốt ảnh nghiệm thu." },
  { no: "BCT-QA-TUHIEP-20260708-20260714", type: "WEEKLY", date: "2026-07-14", weekStart: "2026-07-08", weekEnd: "2026-07-14", status: "SUBMITTED", creator: "commander", title: "Báo cáo tuần 08/07 - 14/07/2026", summary: "Tuần 2 có nhiều hạng mục near-limit và ngày 14/07 chưa nhập dữ liệu.", weather: "SUNNY", temp: 32, labor: "Bình quân 48-58 nhân sự/ngày.", equipment: "Máy đào, xe ben, bơm bê tông, máy đầm dùi.", issues: "Cần test guard chống vượt khối lượng FND-001/FND-004/FND-005.", recommendations: "Chỉ cho phép nhập phát sinh nếu có phê duyệt thay đổi thiết kế." },
] as const;

const documentSeeds = [
  { folder: "01_Hợp đồng", name: "HD_QA-TUHIEP-5F-001_Hop-dong-thi-cong.pdf", mime: "application/pdf", ext: ".pdf", status: "APPROVED", type: "CONTRACT" },
  { folder: "01_Hợp đồng", name: "PLHD_QA-TUHIEP-5F-001_Tien-do-thanh-toan.pdf", mime: "application/pdf", ext: ".pdf", status: "SUBMITTED", type: "CONTRACT_APPENDIX" },
  { folder: "02_Bản vẽ", name: "BV_KT_Tong-mat-bang_V01.pdf", mime: "application/pdf", ext: ".pdf", status: "APPROVED", type: "DRAWING" },
  { folder: "02_Bản vẽ", name: "BV_KC_Mong_V01.pdf", mime: "application/pdf", ext: ".pdf", status: "APPROVED", type: "DRAWING" },
  { folder: "02_Bản vẽ", name: "BV_MEP_Tang-1_V01.pdf", mime: "application/pdf", ext: ".pdf", status: "SUBMITTED", type: "DRAWING" },
  { folder: "03_Dự toán", name: "DT_Goc_QA-TUHIEP-5F-001.xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ext: ".xlsx", status: "APPROVED", type: "ESTIMATE" },
  { folder: "04_Nghiệm thu", name: "NT_Dinh-vi-tim-truc_20260701.pdf", mime: "application/pdf", ext: ".pdf", status: "APPROVED", type: "ACCEPTANCE" },
  { folder: "04_Nghiệm thu", name: "NT_Cot-thep-mong-dot-1_20260712.pdf", mime: "application/pdf", ext: ".pdf", status: "SUBMITTED", type: "ACCEPTANCE" },
  { folder: "07_Hình ảnh hiện trường", name: "IMG_Hien-truong_20260701.jpg", mime: "image/jpeg", ext: ".jpg", status: "APPROVED", type: "SITE_PHOTO" },
  { folder: "08_Báo cáo ngày", name: "BCN_20260710_NguyenHoangNam.pdf", mime: "application/pdf", ext: ".pdf", status: "SUBMITTED", type: "DAILY_REPORT" },
  { folder: "09_Vật tư", name: "YC_Vat-tu_Cop-pha-dot-1.xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ext: ".xlsx", status: "DRAFT", type: "MATERIAL" },
  { folder: "10_Phát sinh", name: "PS_Xu-ly-cao-do-ho-pit.pdf", mime: "application/pdf", ext: ".pdf", status: "DRAFT", type: "ISSUE" },
] as const;

const reportAttachmentSeeds = [
  { reportNo: "BCN-QA-TUHIEP-20260701", kind: "PHOTO", name: "QA_TUHIEP_20260701_hien-truong.jpg", mime: "image/jpeg", ext: ".jpg", caption: "Ảnh mặt bằng ngày khởi công." },
  { reportNo: "BCN-QA-TUHIEP-20260702", kind: "PHOTO", name: "QA_TUHIEP_20260702_lan-trai.jpg", mime: "image/jpeg", ext: ".jpg", caption: "Ảnh lán trại và điện nước tạm." },
  { reportNo: "BCN-QA-TUHIEP-20260702", kind: "FILE", name: "QA_TUHIEP_20260702_bien-ban.pdf", mime: "application/pdf", ext: ".pdf", caption: "Biên bản kiểm tra mốc tạm." },
  { reportNo: "BCN-QA-TUHIEP-20260710", kind: "PHOTO", name: "QA_TUHIEP_20260710_dao-mong-100.jpg", mime: "image/jpeg", ext: ".jpg", caption: "Đào móng đạt 100% thiết kế." },
  { reportNo: "BCN-QA-TUHIEP-20260713", kind: "FILE", name: "QA_TUHIEP_20260713_bao-cao-nhanh.pdf", mime: "application/pdf", ext: ".pdf", caption: "Báo cáo nhanh bê tông móng và thép cột." },
] as const;

const materialRequests = [
  {
    requestNo: "YCVT-QA-TUHIEP-20260706-001",
    requester: "engineer",
    date: "2026-07-06",
    needed: "2026-07-08",
    status: "SUBMITTED",
    priority: "HIGH",
    note: "Bổ sung thép và ván phủ phim cho móng đợt 1.",
    items: [
      { code: "FND-003", materialCode: "THEP-CB400-D16", materialName: "Thép CB400 D16", unit: "kg", qty: 8500, reason: "Gia công lắp dựng cốt thép móng đợt 1" },
      { code: "FND-004", materialCode: "VAN-PHU-PHIM-18", materialName: "Ván phủ phim 18mm", unit: "tam", qty: 120, reason: "Lắp dựng cốp pha móng" },
    ],
  },
  {
    requestNo: "YCVT-QA-TUHIEP-20260710-001",
    requester: "commander",
    date: "2026-07-10",
    needed: "2026-07-11",
    status: "APPROVED",
    priority: "URGENT",
    note: "Cấp vật tư cho bê tông móng đợt 1 và đầm dùi.",
    items: [
      { code: "FND-005", materialCode: "BT-M300-S12", materialName: "Bê tông thương phẩm M300, slump 12", unit: "m3", qty: 150, issued: 0, received: 0, reason: "Đổ bê tông móng đợt 1" },
      { code: "FND-005", materialCode: "PHU-GIA-R7", materialName: "Phụ gia tăng cường độ sớm R7", unit: "lit", qty: 80, issued: 0, received: 0, reason: "Đảm bảo tiến độ tháo cốp pha" },
    ],
  },
  {
    requestNo: "YCVT-QA-TUHIEP-20260712-001",
    requester: "engineer",
    date: "2026-07-12",
    needed: "2026-07-13",
    status: "ISSUED",
    priority: "HIGH",
    note: "Vật tư phần thân tầng 1.",
    items: [
      { code: "STR-101", materialCode: "THEP-CB400-D20", materialName: "Thép CB400 D20", unit: "kg", qty: 3200, issued: 3200, received: 2800, reason: "Gia công cột tầng 1" },
      { code: "STR-102", materialCode: "COPPHA-THEP", materialName: "Bộ cốp pha cốt thép module", unit: "bo", qty: 18, issued: 18, received: 18, reason: "Cốp pha cột tầng 1" },
    ],
  },
  {
    requestNo: "YCVT-QA-TUHIEP-20260714-001",
    requester: "engineer",
    date: "2026-07-14",
    needed: "2026-07-16",
    status: "DRAFT",
    priority: "MEDIUM",
    note: "Phiếu draft để test sửa/xóa trước khi submit.",
    items: [
      { code: "MEP-001", materialCode: "ONG-PVC-D25", materialName: "Ống PVC D25", unit: "m", qty: 600, reason: "Điện âm sàn tầng 1 sắp triển khai" },
    ],
  },
] as const;

function makePdfBuffer(title: string): Buffer {
  const safeTitle = title.replace(/[()\\]/g, " ");
  const body = `BT\n/F1 14 Tf\n72 740 Td\n(${safeTitle}) Tj\n0 -24 Td\n(QA dummy file for ${PROJECT_CODE}) Tj\nET`;
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${Buffer.byteLength(body)} >>\nstream\n${body}\nendstream\nendobj\n`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += object;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf);
}

function makeJpegBuffer(): Buffer {
  return Buffer.from(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/Aaf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/Aaf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Aqf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP/EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QH//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QH//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QH//Z",
    "base64",
  );
}

function makeXlsxBuffer(name: string): Buffer {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Ma cong trinh", PROJECT_CODE],
    ["Ten file", name],
    ["Loai", "QA dummy workbook"],
    ["Ghi chu", "File mau nho dung cho test metadata/download"],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, "QA");
  return XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer;
}

function makeFileBuffer(seed: { name: string; ext: string }): Buffer {
  if (seed.ext === ".jpg") return makeJpegBuffer();
  if (seed.ext === ".xlsx") return makeXlsxBuffer(seed.name);
  return makePdfBuffer(seed.name);
}

async function writeSeedFile(relativeStoragePath: string, buffer: Buffer): Promise<number> {
  const absolutePath = path.isAbsolute(relativeStoragePath)
    ? relativeStoragePath
    : path.join(process.cwd(), relativeStoragePath.startsWith("storage/") ? relativeStoragePath : path.join("storage", relativeStoragePath));
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);
  return buffer.length;
}

async function printDryRunSummary() {
  const project = await prisma.project.findUnique({ where: { code: PROJECT_CODE } });
  const qaUserCount = await prisma.user.count({ where: { email: { endsWith: "@example.test" } } });
  const existingCounts = project
    ? {
        projectMembers: await prisma.projectMember.count({ where: { projectId: project.id } }),
        folders: await prisma.documentFolder.count({ where: { projectId: project.id } }),
        fieldItems: await prisma.fieldProgressItem.count({ where: { projectId: project.id } }),
        entries: await prisma.fieldProgressEntry.count({ where: { projectId: project.id } }),
        reports: await prisma.siteReport.count({ where: { projectId: project.id } }),
        documents: await prisma.document.count({ where: { projectId: project.id } }),
        materialRequests: await prisma.materialRequest.count({ where: { projectId: project.id } }),
      }
    : null;

  console.log("=== REALISTIC TU HIEP PROJECT SEED DRY RUN ===");
  console.log(`Mode: ${shouldExecute ? "EXECUTE" : "DRY_RUN"}`);
  console.log(`Project code: ${PROJECT_CODE}`);
  console.log(`Project exists: ${project ? `yes (${project.id})` : "no"}`);
  console.log(`Existing @example.test users: ${qaUserCount}`);
  console.log("Will upsert:");
  console.log(`- Users: ${users.length}`);
  console.log(`- Project members: ${projectMembers.length}`);
  console.log(`- Document folders: ${folderNames.length}`);
  console.log(`- Field progress items: ${fieldItems.length}`);
  console.log(`- Field progress entries: ${dailyEntries.length} rows across 12 data days + 2 empty days`);
  console.log(`- Site reports: ${reportSeeds.length}`);
  console.log(`- Documents with small physical dummy files: ${documentSeeds.length}`);
  console.log(`- Report attachments with small physical dummy files: ${reportAttachmentSeeds.length}`);
  console.log(`- Material requests: ${materialRequests.length}`);
  if (existingCounts) console.log("Existing counts for this project:", existingCounts);
  console.log("No data will be written unless you pass --execute.");
}

function validatePlannedQuantities() {
  const designByCode = new Map<string, number>();
  for (const item of fieldItems) {
    if (item.type === "WORK" && item.quantity !== undefined) {
      designByCode.set(item.code, item.quantity);
    }
  }

  const cumulative = new Map<string, number>();
  for (const row of dailyEntries) {
    const next = (cumulative.get(row.code) || 0) + row.quantity;
    const design = designByCode.get(row.code);
    if (design === undefined) throw new Error(`Missing design quantity for ${row.code}`);
    if (next > design) {
      throw new Error(`Planned seed quantity exceeds design quantity for ${row.code}: ${next}/${design}`);
    }
    cumulative.set(row.code, next);
  }
}

async function auditOnce(data: {
  userId?: string;
  projectId: string;
  action: string;
  entityType: string;
  entityId: string;
  afterData?: unknown;
}) {
  const existing = await prisma.auditLog.findFirst({
    where: {
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      projectId: data.projectId,
    },
  });
  if (existing) return;
  await prisma.auditLog.create({
    data: {
      userId: data.userId,
      projectId: data.projectId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      afterData: data.afterData ? JSON.stringify(data.afterData) : undefined,
    },
  });
}

async function seedUsers(passwordHash: string) {
  const result = new Map<QaUserKey, Awaited<ReturnType<typeof prisma.user.upsert>>>();
  for (const user of users) {
    const saved = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        username: user.username,
        password: passwordHash,
        name: user.name,
        role: user.role,
        phone: user.phone,
        isActive: true,
        deletedAt: null,
      },
      create: {
        email: user.email,
        username: user.username,
        password: passwordHash,
        name: user.name,
        role: user.role,
        phone: user.phone,
        isActive: true,
      },
    });
    result.set(user.key, saved);
  }
  return result;
}

async function seedProject() {
  return prisma.project.upsert({
    where: { code: PROJECT_CODE },
    update: {
      name: "Nhà Văn Phòng Điều Hành 5 Tầng - Khu Công Nghiệp Tứ Hiệp",
      investor: "Công ty TNHH Phát Triển Hạ Tầng Tứ Hiệp",
      location: "Lô A3-2, Khu Công Nghiệp Tứ Hiệp, huyện Thanh Trì, Hà Nội",
      status: "ACTIVE",
      startDate: dateOnly("2026-07-01"),
      endDate: dateOnly("2027-03-31"),
      budget: decimal("68500000000.0000"),
      deletedAt: null,
      description:
        [
          "Dữ liệu QA realistic/fake, không phải hồ sơ pháp lý thật.",
          "Quy mô: nhà văn phòng điều hành 5 tầng nổi + 1 tum kỹ thuật, móng cọc BTCT, kết cấu khung BTCT toàn khối.",
          "Diện tích sàn: 4.850 m2. Giá trị hợp đồng tham chiếu: 68.500.000.000 VND.",
          "Người phụ trách: Trần Minh Khôi. Chỉ huy trưởng: Nguyễn Hoàng Nam.",
          "Kỹ sư hiện trường: Lê Quang Huy, Phạm Gia Linh. Kế toán: Vũ Thị Mai Anh.",
        ].join("\n"),
    },
    create: {
      code: PROJECT_CODE,
      name: "Nhà Văn Phòng Điều Hành 5 Tầng - Khu Công Nghiệp Tứ Hiệp",
      investor: "Công ty TNHH Phát Triển Hạ Tầng Tứ Hiệp",
      location: "Lô A3-2, Khu Công Nghiệp Tứ Hiệp, huyện Thanh Trì, Hà Nội",
      status: "ACTIVE",
      startDate: dateOnly("2026-07-01"),
      endDate: dateOnly("2027-03-31"),
      budget: decimal("68500000000.0000"),
      description:
        [
          "Dữ liệu QA realistic/fake, không phải hồ sơ pháp lý thật.",
          "Quy mô: nhà văn phòng điều hành 5 tầng nổi + 1 tum kỹ thuật, móng cọc BTCT, kết cấu khung BTCT toàn khối.",
          "Diện tích sàn: 4.850 m2. Giá trị hợp đồng tham chiếu: 68.500.000.000 VND.",
          "Người phụ trách: Trần Minh Khôi. Chỉ huy trưởng: Nguyễn Hoàng Nam.",
          "Kỹ sư hiện trường: Lê Quang Huy, Phạm Gia Linh. Kế toán: Vũ Thị Mai Anh.",
        ].join("\n"),
    },
  });
}

async function seedProjectMembers(
  projectId: string,
  userByKey: Map<QaUserKey, Awaited<ReturnType<typeof prisma.user.upsert>>>,
) {
  const admin = userByKey.get("admin");
  if (!admin) throw new Error("Missing admin user");
  for (const member of projectMembers) {
    const user = userByKey.get(member.userKey);
    if (!user) throw new Error(`Missing user for project member: ${member.userKey}`);
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: user.id } },
      update: {
        role: member.role,
        assignedById: admin.id,
        isActive: true,
        note: member.note,
        deletedAt: null,
        leftAt: null,
      },
      create: {
        projectId,
        userId: user.id,
        role: member.role,
        assignedById: admin.id,
        isActive: true,
        note: member.note,
      },
    });
  }
}

async function seedFolders(projectId: string) {
  const folderByName = new Map<string, Awaited<ReturnType<typeof prisma.documentFolder.create>>>();
  for (const name of folderNames) {
    const existing = await prisma.documentFolder.findFirst({ where: { projectId, name } });
    const folder = existing
      ? await prisma.documentFolder.update({ where: { id: existing.id }, data: { deletedAt: null, parentId: null } })
      : await prisma.documentFolder.create({ data: { projectId, name } });
    folderByName.set(name, folder);
  }
  return folderByName;
}

async function seedFieldProgress(
  projectId: string,
  userByKey: Map<QaUserKey, Awaited<ReturnType<typeof prisma.user.upsert>>>,
) {
  const admin = userByKey.get("admin");
  if (!admin) throw new Error("Missing admin user");
  let template = await prisma.fieldProgressTemplate.findFirst({
    where: { projectId, name: TEMPLATE_NAME, deletedAt: null },
  });
  if (!template) {
    template = await prisma.fieldProgressTemplate.create({
      data: {
        projectId,
        name: TEMPLATE_NAME,
        description: `Seed realistic field progress template for ${PROJECT_CODE}`,
        status: "ACTIVE",
        createdById: admin.id,
      },
    });
  } else {
    template = await prisma.fieldProgressTemplate.update({
      where: { id: template.id },
      data: { status: "ACTIVE", deletedAt: null, description: `Seed realistic field progress template for ${PROJECT_CODE}` },
    });
  }

  const itemByCode = new Map<string, Awaited<ReturnType<typeof prisma.fieldProgressItem.create>>>();
  let sortOrder = 1;
  for (const seed of fieldItems) {
    const existing = await prisma.fieldProgressItem.findFirst({
      where: { projectId, templateId: template.id, code: seed.code },
    });
    const parent = seed.parentCode ? itemByCode.get(seed.parentCode) : null;
    if (seed.parentCode && !parent) throw new Error(`Missing parent ${seed.parentCode} for ${seed.code}`);
    const data = {
      projectId,
      templateId: template.id,
      parentId: parent?.id || null,
      sortOrder: sortOrder++,
      level: seed.type === "GROUP" ? 0 : 1,
      itemType: seed.type,
      code: seed.code,
      categoryName: seed.type === "GROUP" ? seed.name : undefined,
      workContent: seed.type === "WORK" ? seed.name : undefined,
      constructionCrew: seed.crew,
      designQuantity: seed.quantity === undefined ? undefined : decimal(seed.quantity),
      unit: seed.unit,
      status: seed.status || "PLANNED",
      note: seed.note,
      createdById: admin.id,
      deletedAt: null,
    };
    const item = existing
      ? await prisma.fieldProgressItem.update({ where: { id: existing.id }, data })
      : await prisma.fieldProgressItem.create({ data });
    itemByCode.set(seed.code, item);
  }

  return { template, itemByCode };
}

function reportWorkflowDates(status: string, reportDate: string) {
  const submittedAt = ["SUBMITTED", "APPROVED", "REJECTED", "REVISION_REQUESTED", "LOCKED"].includes(status)
    ? new Date(`${reportDate}T18:00:00.000Z`)
    : null;
  const reviewedAt = ["APPROVED", "REJECTED"].includes(status) ? new Date(`${reportDate}T20:00:00.000Z`) : null;
  return { submittedAt, reviewedAt };
}

async function seedEntries(
  projectId: string,
  templateId: string,
  itemByCode: Map<string, Awaited<ReturnType<typeof prisma.fieldProgressItem.create>>>,
  userByKey: Map<QaUserKey, Awaited<ReturnType<typeof prisma.user.upsert>>>,
) {
  const engineer = userByKey.get("engineer");
  const director = userByKey.get("director");
  if (!engineer || !director) throw new Error("Missing engineer/director user");

  for (const row of dailyEntries) {
    const item = itemByCode.get(row.code);
    if (!item) throw new Error(`Missing field item for daily entry: ${row.code}`);
    const entryDate = dateOnly(row.date);
    const existing = await prisma.fieldProgressEntry.findFirst({
      where: { projectId, templateId, itemId: item.id, entryDate, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
    const workflow = reportWorkflowDates(row.status, row.date);
    const data = {
      projectId,
      templateId,
      itemId: item.id,
      entryDate,
      quantity: decimal(row.quantity),
      issueNote: "issueNote" in row ? row.issueNote : undefined,
      proposalNote: "proposalNote" in row ? row.proposalNote : undefined,
      note: row.note,
      status: row.status,
      createdById: engineer.id,
      submittedAt: workflow.submittedAt,
      approvedById: row.status === "APPROVED" ? director.id : null,
      approvedAt: row.status === "APPROVED" ? workflow.reviewedAt : null,
      rejectedReason: null,
      deletedAt: null,
    };
    if (existing) {
      await prisma.fieldProgressEntry.update({ where: { id: existing.id }, data });
    } else {
      await prisma.fieldProgressEntry.create({ data });
    }
  }
}

type CumulativeLine = {
  code: string;
  date: string;
  quantityToday: number;
  quantityBefore: number;
  quantityCumulative: number;
  progressPercent: number;
};

function buildCumulativeLines(): CumulativeLine[] {
  const designByCode = new Map<string, number>();
  for (const item of fieldItems) {
    if (item.type === "WORK" && item.quantity !== undefined) designByCode.set(item.code, item.quantity);
  }
  const cumulative = new Map<string, number>();
  return dailyEntries.map((row) => {
    const before = cumulative.get(row.code) || 0;
    const after = before + row.quantity;
    cumulative.set(row.code, after);
    const design = designByCode.get(row.code) || 0;
    return {
      code: row.code,
      date: row.date,
      quantityToday: row.quantity,
      quantityBefore: before,
      quantityCumulative: after,
      progressPercent: design > 0 ? Math.round((after / design) * 10000) / 100 : 0,
    };
  });
}

async function seedReports(
  projectId: string,
  itemByCode: Map<string, Awaited<ReturnType<typeof prisma.fieldProgressItem.create>>>,
  userByKey: Map<QaUserKey, Awaited<ReturnType<typeof prisma.user.upsert>>>,
) {
  const director = userByKey.get("director");
  if (!director) throw new Error("Missing director user");
  const cumulativeLines = buildCumulativeLines();

  for (const seed of reportSeeds) {
    const creator = userByKey.get(seed.creator as QaUserKey);
    if (!creator) throw new Error(`Missing report creator ${seed.creator}`);
    const workflow = reportWorkflowDates(seed.status, seed.date);
    const existing = await prisma.siteReport.findFirst({ where: { reportNo: seed.no } });
    const reportData = {
      reportNo: seed.no,
      type: seed.type,
      projectId,
      title: seed.title,
      reportDate: dateOnly(seed.date),
      weekStartDate: "weekStart" in seed ? dateOnly(seed.weekStart) : null,
      weekEndDate: "weekEnd" in seed ? dateOnly(seed.weekEnd) : null,
      weatherCondition: seed.weather,
      weatherTemperature: seed.temp,
      weatherNote: "Dữ liệu thời tiết QA giả lập.",
      summary: seed.summary,
      materials: "Thép CB400, bê tông thương phẩm, ván phủ phim, ống PVC và vật tư phụ trợ theo từng ngày.",
      labor: seed.labor,
      equipment: seed.equipment,
      quality: "Kiểm tra tim trục, cao độ, nghiệm thu cốt thép/cốp pha và lấy mẫu bê tông theo quy trình QA.",
      issues: seed.issues,
      recommendations: seed.recommendations,
      reporterName: creator.name,
      manpowerCount: seed.type === "DAILY" ? 48 : 52,
      equipmentNote: seed.equipment,
      generalNote: "Seed realistic QA data.",
      status: seed.status,
      createdById: creator.id,
      submittedAt: workflow.submittedAt,
      approvedById: seed.status === "APPROVED" || seed.status === "REJECTED" ? director.id : null,
      approvedAt: seed.status === "APPROVED" ? workflow.reviewedAt : null,
      rejectedReason: "rejectedReason" in seed ? seed.rejectedReason : null,
      deletedAt: null,
    };

    const report = existing
      ? await prisma.siteReport.update({ where: { id: existing.id }, data: reportData })
      : await prisma.siteReport.create({ data: reportData });

    await prisma.siteReportLine.deleteMany({ where: { siteReportId: report.id } });

    const lineSeeds = seed.type === "DAILY"
      ? cumulativeLines.filter((line) => line.date === seed.date)
      : cumulativeLines.filter((line) =>
          "weekStart" in seed && "weekEnd" in seed && line.date >= seed.weekStart && line.date <= seed.weekEnd,
        );

    let sortOrder = 1;
    for (const line of lineSeeds) {
      const item = itemByCode.get(line.code);
      if (!item) continue;
      await prisma.siteReportLine.create({
        data: {
          siteReportId: report.id,
          projectId,
          fieldProgressItemId: item.id,
          workName: item.workContent,
          workContent: item.workContent || item.code || "Cong viec",
          area: line.code.startsWith("PRE") ? "Khu phu tro va mat bang" : line.code.startsWith("FND") ? "Khu mong A/B" : "Tang 1",
          constructionCrew: item.constructionCrew,
          unit: item.unit,
          designQuantity: item.designQuantity,
          quantityToday: decimal(line.quantityToday),
          quantityBefore: decimal(line.quantityBefore),
          quantityCumulative: decimal(line.quantityCumulative),
          progressPercent: decimal(line.progressPercent),
          note: "Tổng hợp từ nhật ký thi công đã nhập.",
          sortOrder: sortOrder++,
        },
      });
    }

    await auditOnce({
      userId: creator.id,
      projectId,
      action: "SITE_REPORT_CREATED",
      entityType: "SiteReport",
      entityId: report.id,
      afterData: { note: "Seed realistic report created/updated", reportNo: seed.no },
    });
    if (workflow.submittedAt) {
      await auditOnce({
        userId: creator.id,
        projectId,
        action: "SITE_REPORT_SUBMITTED",
        entityType: "SiteReport",
        entityId: report.id,
        afterData: { note: "Seed workflow: submitted" },
      });
    }
    if (seed.status === "APPROVED") {
      await auditOnce({
        userId: director.id,
        projectId,
        action: "SITE_REPORT_APPROVED",
        entityType: "SiteReport",
        entityId: report.id,
        afterData: { note: "Seed workflow: approved" },
      });
    }
    if (seed.status === "REJECTED") {
      await auditOnce({
        userId: director.id,
        projectId,
        action: "SITE_REPORT_REJECTED",
        entityType: "SiteReport",
        entityId: report.id,
        afterData: { reason: "rejectedReason" in seed ? seed.rejectedReason : "Seed rejected case" },
      });
    }
  }
}

async function seedDocuments(
  projectId: string,
  folderByName: Map<string, Awaited<ReturnType<typeof prisma.documentFolder.create>>>,
  userByKey: Map<QaUserKey, Awaited<ReturnType<typeof prisma.user.upsert>>>,
) {
  const uploader = userByKey.get("engineer") || userByKey.get("admin");
  const reviewer = userByKey.get("director");
  if (!uploader || !reviewer) throw new Error("Missing document uploader/reviewer user");
  for (const seed of documentSeeds) {
    const folder = folderByName.get(seed.folder);
    if (!folder) throw new Error(`Missing document folder: ${seed.folder}`);
    const storedName = `QA_TUHIEP_${safeFileName(seed.name)}`;
    const relativeStoragePath = toStoragePath(QA_STORAGE_DIR, "documents", storedName);
    const buffer = makeFileBuffer(seed);
    const size = await writeSeedFile(relativeStoragePath, buffer);
    const existing = await prisma.document.findFirst({ where: { projectId, originalName: seed.name } });
    const data = {
      projectId,
      folderId: folder.id,
      originalName: seed.name,
      storedName,
      mimeType: seed.mime,
      extension: seed.ext,
      size,
      storagePath: relativeStoragePath,
      uploadedById: uploader.id,
      displayName: seed.name,
      documentType: seed.type,
      status: seed.status,
      metadata: {
        seed: "realistic-tu-hiep",
        projectCode: PROJECT_CODE,
        fakeFile: true,
      } as Prisma.InputJsonValue,
      fileHash: sha256(buffer),
      reviewedById: seed.status === "APPROVED" ? reviewer.id : null,
      reviewedAt: seed.status === "APPROVED" ? new Date() : null,
      rejectedReason: null,
      version: 1,
      deletedAt: null,
    };
    if (existing) {
      await prisma.document.update({ where: { id: existing.id }, data });
    } else {
      await prisma.document.create({ data });
    }
  }
}

async function seedReportAttachments() {
  for (const seed of reportAttachmentSeeds) {
    const report = await prisma.siteReport.findFirst({ where: { reportNo: seed.reportNo } });
    if (!report) throw new Error(`Missing report for attachment: ${seed.reportNo}`);
    const storedName = `QA_TUHIEP_${safeFileName(seed.name)}`;
    const storagePath = toStoragePath("storage", QA_STORAGE_DIR, "reports", seed.reportNo, storedName);
    const buffer = makeFileBuffer(seed);
    const size = await writeSeedFile(storagePath, buffer);
    const existing = await prisma.siteReportAttachment.findFirst({
      where: { reportId: report.id, originalName: seed.name },
    });
    const data = {
      reportId: report.id,
      kind: seed.kind,
      fileName: storedName,
      originalName: seed.name,
      mimeType: seed.mime,
      sizeBytes: size,
      storagePath,
      publicUrl: `/${storagePath}`,
      caption: seed.caption,
    };
    if (existing) {
      await prisma.siteReportAttachment.update({ where: { id: existing.id }, data });
    } else {
      await prisma.siteReportAttachment.create({ data });
    }
  }
}

async function seedMaterialRequests(
  projectId: string,
  itemByCode: Map<string, Awaited<ReturnType<typeof prisma.fieldProgressItem.create>>>,
  userByKey: Map<QaUserKey, Awaited<ReturnType<typeof prisma.user.upsert>>>,
) {
  for (const seed of materialRequests) {
    const requester = userByKey.get(seed.requester as QaUserKey);
    if (!requester) throw new Error(`Missing material requester: ${seed.requester}`);
    const existing = await prisma.materialRequest.findFirst({ where: { requestNo: seed.requestNo } });
    const requestData = {
      projectId,
      requestNo: seed.requestNo,
      requestedById: requester.id,
      requestDate: dateOnly(seed.date),
      neededDate: dateOnly(seed.needed),
      status: seed.status,
      priority: seed.priority,
      note: seed.note,
      cancelReason: null,
      deletedAt: null,
    };
    const request = existing
      ? await prisma.materialRequest.update({ where: { id: existing.id }, data: requestData })
      : await prisma.materialRequest.create({ data: requestData });

    await prisma.materialRequestItem.deleteMany({ where: { materialRequestId: request.id } });
    for (const item of seed.items) {
      const workItem = itemByCode.get(item.code);
      const issued = "issued" in item ? item.issued || 0 : 0;
      const received = "received" in item ? item.received || 0 : 0;
      const remaining = Math.max(item.qty - Math.max(issued, received), 0);
      await prisma.materialRequestItem.create({
        data: {
          materialRequestId: request.id,
          fieldProgressItemId: workItem?.id,
          workItemNameSnapshot: workItem?.workContent || item.code,
          materialCode: item.materialCode,
          materialName: item.materialName,
          unit: item.unit,
          requestedQuantity: decimal(item.qty),
          issuedQuantity: decimal(issued),
          receivedQuantity: decimal(received),
          remainingQuantity: decimal(remaining),
          reason: item.reason,
        },
      });
    }
  }
}

async function verifySeed(projectId: string) {
  const counts = {
    users: await prisma.user.count({ where: { email: { in: users.map((user) => user.email) } } }),
    members: await prisma.projectMember.count({ where: { projectId } }),
    folders: await prisma.documentFolder.count({ where: { projectId, deletedAt: null } }),
    fieldItems: await prisma.fieldProgressItem.count({ where: { projectId, deletedAt: null } }),
    entries: await prisma.fieldProgressEntry.count({ where: { projectId, deletedAt: null } }),
    reports: await prisma.siteReport.count({ where: { projectId, deletedAt: null } }),
    reportAttachments: await prisma.siteReportAttachment.count({ where: { report: { projectId } } }),
    documents: await prisma.document.count({ where: { projectId, deletedAt: null } }),
    materialRequests: await prisma.materialRequest.count({ where: { projectId, deletedAt: null } }),
  };

  const entryTotals = await prisma.fieldProgressEntry.groupBy({
    by: ["itemId"],
    where: { projectId, deletedAt: null },
    _sum: { quantity: true },
  });
  const itemIds = entryTotals.map((entry) => entry.itemId);
  const items = await prisma.fieldProgressItem.findMany({
    where: { id: { in: itemIds } },
    select: { id: true, code: true, designQuantity: true },
  });
  const itemById = new Map(items.map((item) => [item.id, item]));
  const overDesign = entryTotals.filter((entry) => {
    const item = itemById.get(entry.itemId);
    if (!item?.designQuantity || !entry._sum.quantity) return false;
    return new Prisma.Decimal(entry._sum.quantity).gt(item.designQuantity);
  });

  if (overDesign.length > 0) {
    throw new Error(`Seed verification failed: ${overDesign.length} work items exceed design quantity`);
  }

  console.log("=== REALISTIC TU HIEP PROJECT SEED VERIFY ===");
  console.log(counts);
  console.log("Quantity guard: OK, no seeded entry exceeds design quantity.");
}

async function main() {
  validatePlannedQuantities();

  if (isDryRun) {
    await printDryRunSummary();
    return;
  }

  console.log("=== REALISTIC TU HIEP PROJECT SEED EXECUTE ===");
  console.log(`Project code: ${PROJECT_CODE}`);
  console.log("No reset, no broad delete, no real-data delete. Upserting QA-prefixed records only.");

  const passwordHash = await bcrypt.hash(process.env.QA_REALISTIC_SEED_PASSWORD || DEFAULT_PASSWORD, 10);
  const userByKey = await seedUsers(passwordHash);
  const project = await seedProject();
  await seedProjectMembers(project.id, userByKey);
  const folderByName = await seedFolders(project.id);
  const { template, itemByCode } = await seedFieldProgress(project.id, userByKey);
  await seedEntries(project.id, template.id, itemByCode, userByKey);
  await seedReports(project.id, itemByCode, userByKey);
  await seedDocuments(project.id, folderByName, userByKey);
  await seedReportAttachments();
  await seedMaterialRequests(project.id, itemByCode, userByKey);
  await auditOnce({
    userId: userByKey.get("admin")?.id,
    projectId: project.id,
    action: "QA_REALISTIC_SEED_EXECUTED",
    entityType: "Project",
    entityId: project.id,
    afterData: { projectCode: PROJECT_CODE, script: "scripts/seed-realistic-tu-hiep-project.ts" },
  });
  await verifySeed(project.id);
  console.log("Seed completed.");
  console.log(`QA test password for seeded users: ${process.env.QA_REALISTIC_SEED_PASSWORD ? "(from QA_REALISTIC_SEED_PASSWORD)" : DEFAULT_PASSWORD}`);
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
