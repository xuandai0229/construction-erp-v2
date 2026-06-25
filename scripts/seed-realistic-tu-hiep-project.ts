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
    note: "Chi huy truong cong trinh, duoc phep tao va gui bao cao.",
  },
  {
    userKey: "engineer",
    role: "SUPERVISOR",
    note: "Ky su hien truong phu trach nhap khoi luong ngay va bao cao ngay.",
  },
  {
    userKey: "accountant",
    role: "VIEWER",
    note: "Ke toan cong trinh, test quyen xem va tai lieu ke toan.",
  },
  {
    userKey: "viewer",
    role: "VIEWER",
    note: "Nhan vien chi xem trong cong trinh.",
  },
];

const folderNames = [
  "01_Hop dong",
  "02_Ban ve",
  "03_Du toan",
  "04_Nghiem thu",
  "05_Hoa don",
  "06_Thanh toan",
  "07_Hinh anh hien truong",
  "08_Bao cao ngay",
  "09_Vat tu",
  "10_Phat sinh",
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
  { code: "G-01", type: "GROUP", name: "Cong tac chuan bi", note: "Giai doan setup truoc thi cong mong" },
  {
    code: "PRE-001",
    type: "WORK",
    parentCode: "G-01",
    name: "Don dep mat bang, boc lop huu co",
    crew: "Mui chuan bi",
    unit: "m2",
    quantity: 1850,
    note: "Bao gom thu gom phe thai, san gat so bo",
    status: "IN_PROGRESS",
  },
  {
    code: "PRE-002",
    type: "WORK",
    parentCode: "G-01",
    name: "Dinh vi tim truc, cao do chuan",
    crew: "To trac dac",
    unit: "diem",
    quantity: 72,
    note: "Co nghiem thu moc gui chu dau tu",
    status: "IN_PROGRESS",
  },
  {
    code: "PRE-003",
    type: "WORK",
    parentCode: "G-01",
    name: "Lan trai, kho vat tu, dien nuoc tam",
    crew: "Mui chuan bi",
    unit: "m2",
    quantity: 120,
    note: "Lap container van phong va kho nho",
    status: "IN_PROGRESS",
  },
  { code: "G-02", type: "GROUP", name: "Phan mong", note: "Mong coc va dai giang be tong cot thep" },
  {
    code: "FND-001",
    type: "WORK",
    parentCode: "G-02",
    name: "Dao dat ho mong, van chuyen noi bo",
    crew: "Mui mong A",
    unit: "m3",
    quantity: 980,
    note: "Dao theo tung phan khu A/B",
    status: "IN_PROGRESS",
  },
  {
    code: "FND-002",
    type: "WORK",
    parentCode: "G-02",
    name: "Do be tong lot mong M100",
    crew: "Mui be tong",
    unit: "m3",
    quantity: 82,
    note: "Day 100 mm duoi dai va giang mong",
    status: "IN_PROGRESS",
  },
  {
    code: "FND-003",
    type: "WORK",
    parentCode: "G-02",
    name: "Gia cong lap dung cot thep mong",
    crew: "To thep mong",
    unit: "kg",
    quantity: 42000,
    note: "Thep CB400, nghiem thu truoc khi do",
    status: "IN_PROGRESS",
  },
  {
    code: "FND-004",
    type: "WORK",
    parentCode: "G-02",
    name: "Lap dung cop pha mong",
    crew: "To cop pha",
    unit: "m2",
    quantity: 1350,
    note: "Cop pha thep ket hop van phu phim",
    status: "IN_PROGRESS",
  },
  {
    code: "FND-005",
    type: "WORK",
    parentCode: "G-02",
    name: "Do be tong mong M300",
    crew: "Mui be tong",
    unit: "m3",
    quantity: 430,
    note: "Chia 3 dot do, co lay mau nen",
    status: "IN_PROGRESS",
  },
  { code: "G-03", type: "GROUP", name: "Phan than tang 1 den tang 5", note: "Khung BTCT toan khoi" },
  { code: "STR-101", type: "WORK", parentCode: "G-03", name: "Cot thep cot tang 1", crew: "To thep than", unit: "kg", quantity: 12500, note: "Cot truc A-D/1-6", status: "IN_PROGRESS" },
  { code: "STR-102", type: "WORK", parentCode: "G-03", name: "Cop pha cot tang 1", crew: "To cop pha than", unit: "m2", quantity: 520, note: "Can kiem tra tim cot sau ghep", status: "IN_PROGRESS" },
  { code: "STR-103", type: "WORK", parentCode: "G-03", name: "Be tong cot tang 1", crew: "Mui be tong", unit: "m3", quantity: 86, note: "Do bang bom can" },
  { code: "STR-104", type: "WORK", parentCode: "G-03", name: "Cot thep dam san tang 1", crew: "To thep than", unit: "kg", quantity: 23500, note: "Bao gom dam chinh/phu va thep san" },
  { code: "STR-105", type: "WORK", parentCode: "G-03", name: "Cop pha dam san tang 1", crew: "To cop pha than", unit: "m2", quantity: 1460, note: "Co chong tang va kiem tra cao do" },
  { code: "STR-106", type: "WORK", parentCode: "G-03", name: "Be tong dam san tang 1", crew: "Mui be tong", unit: "m3", quantity: 285, note: "Do lien tuc trong 1 ca dai" },
  { code: "STR-201", type: "WORK", parentCode: "G-03", name: "Cot, dam, san tang 2", crew: "Mui than tang 2", unit: "m2 san", quantity: 970, note: "Tong hop theo tang cho test dai han" },
  { code: "STR-301", type: "WORK", parentCode: "G-03", name: "Cot, dam, san tang 3", crew: "Mui than tang 3", unit: "m2 san", quantity: 970, note: "Chua trien khai trong 14 ngay dau" },
  { code: "STR-401", type: "WORK", parentCode: "G-03", name: "Cot, dam, san tang 4", crew: "Mui than tang 4", unit: "m2 san", quantity: 970, note: "Chua trien khai trong 14 ngay dau" },
  { code: "STR-501", type: "WORK", parentCode: "G-03", name: "Cot, dam, san tang 5", crew: "Mui than tang 5", unit: "m2 san", quantity: 970, note: "Chua trien khai trong 14 ngay dau" },
  { code: "STR-STAIR", type: "WORK", parentCode: "G-03", name: "Cau thang bo tang 1 den tang 5", crew: "To hoan thien tho", unit: "m3", quantity: 155, note: "Thi cong xen ke theo tang" },
  { code: "STR-WALL", type: "WORK", parentCode: "G-03", name: "Xay tuong bao va tuong ngan", crew: "To xay", unit: "m2", quantity: 3620, note: "Gach AAC/tuong bao gach dac theo thiet ke" },
  { code: "G-04", type: "GROUP", name: "Hoan thien", note: "Chua thi cong chinh trong 14 ngay dau" },
  { code: "FIN-001", type: "WORK", parentCode: "G-04", name: "Trat tuong trong/ngoai", crew: "To trat", unit: "m2", quantity: 7200, note: "Tinh theo dien tich tuong" },
  { code: "FIN-002", type: "WORK", parentCode: "G-04", name: "Lat nen gach porcelain", crew: "To lat nen", unit: "m2", quantity: 4300, note: "Khu van phong, hanh lang, sanh" },
  { code: "FIN-003", type: "WORK", parentCode: "G-04", name: "Son ba hoan thien", crew: "To son ba", unit: "m2", quantity: 8600, note: "Bao gom ba, son lot va phu" },
  { code: "FIN-004", type: "WORK", parentCode: "G-04", name: "Lap cua nhom kinh, cua thep chong chay", crew: "To cua", unit: "bo", quantity: 138, note: "Bao gom cua di va cua so" },
  { code: "FIN-005", type: "WORK", parentCode: "G-04", name: "Tran thach cao", crew: "To tran", unit: "m2", quantity: 3900, note: "Khung xuong chim, tam chong am khu ve sinh" },
  { code: "G-05", type: "GROUP", name: "MEP", note: "Thi cong am cho song song phan than" },
  { code: "MEP-001", type: "WORK", parentCode: "G-05", name: "Dien am tuong, ong cho san", crew: "To dien", unit: "m", quantity: 9800, note: "Ong PVC, hop noi, tu tang" },
  { code: "MEP-002", type: "WORK", parentCode: "G-05", name: "Cap thoat nuoc am san/tuong", crew: "To nuoc", unit: "m", quantity: 2600, note: "PPR/uPVC theo shopdrawing" },
  { code: "MEP-003", type: "WORK", parentCode: "G-05", name: "Dieu hoa thong gio", crew: "To HVAC", unit: "m", quantity: 1800, note: "Ong gio, ong dong, gia treo" },
  { code: "MEP-004", type: "WORK", parentCode: "G-05", name: "PCCC co ban", crew: "To PCCC", unit: "m", quantity: 1450, note: "Ong sprinkler/hop chua chay hanh lang" },
];

const dailyEntries = [
  { date: "2026-07-01", status: "APPROVED", code: "PRE-001", quantity: 500, note: "Bat dau don mat bang phan khu A." },
  { date: "2026-07-01", status: "APPROVED", code: "PRE-002", quantity: 24, note: "Dinh vi truc khu van phong chinh." },
  { date: "2026-07-01", status: "APPROVED", code: "PRE-003", quantity: 35, note: "Lap container van phong va kho tam." },
  { date: "2026-07-02", status: "APPROVED", code: "PRE-001", quantity: 650, note: "Don mat bang phan khu B." },
  { date: "2026-07-02", status: "APPROVED", code: "PRE-002", quantity: 24, note: "Bo sung moc cao do chuan." },
  { date: "2026-07-02", status: "APPROVED", code: "PRE-003", quantity: 45, note: "Hoan thien dien nuoc tam." },
  { date: "2026-07-03", status: "SUBMITTED", code: "PRE-001", quantity: 700, note: "Hoan thanh don dep mat bang." },
  { date: "2026-07-03", status: "SUBMITTED", code: "PRE-002", quantity: 20, note: "Con 4 diem can kiem tra lai sau mua." },
  { date: "2026-07-03", status: "SUBMITTED", code: "PRE-003", quantity: 40, note: "Lan trai dat 100%." },
  { date: "2026-07-04", status: "DRAFT", code: "FND-001", quantity: 160, note: "Dao mong khu A, dang cho xac nhan cao do pit." },
  { date: "2026-07-04", status: "DRAFT", code: "FND-003", quantity: 5000, note: "Gia cong thep dai mong dot 1." },
  { date: "2026-07-06", status: "APPROVED", code: "FND-001", quantity: 180, note: "Tiep tuc dao mong sau ngay trong." },
  { date: "2026-07-06", status: "APPROVED", code: "FND-003", quantity: 7000, note: "Thep mong dot 1." },
  { date: "2026-07-06", status: "APPROVED", code: "FND-004", quantity: 200, note: "Bat dau cop pha dai mong." },
  { date: "2026-07-07", status: "SUBMITTED", code: "FND-001", quantity: 150, note: "Dao mong dat moc 50%." },
  { date: "2026-07-07", status: "SUBMITTED", code: "FND-002", quantity: 20, note: "Do be tong lot khu A." },
  { date: "2026-07-07", status: "SUBMITTED", code: "FND-004", quantity: 250, note: "Cop pha tiep tuc khu A/B." },
  { date: "2026-07-08", status: "APPROVED", code: "FND-001", quantity: 170, note: "Dao mong khu B." },
  { date: "2026-07-08", status: "APPROVED", code: "FND-002", quantity: 25, note: "Be tong lot phan con lai khu A." },
  { date: "2026-07-08", status: "APPROVED", code: "FND-003", quantity: 9000, note: "Thep mong dat 50%." },
  { date: "2026-07-09", status: "DRAFT", code: "FND-001", quantity: 150, issueNote: "Mua nhe buoi chieu.", proposalNote: "Tang ca sang 2026-07-10 de bat kip tien do.", note: "Draft gan hoan thanh dao mong." },
  { date: "2026-07-09", status: "DRAFT", code: "FND-004", quantity: 300, issueNote: "Thieu mot lo van phu phim.", proposalNote: "Bo sung 120 tam van phu phim.", note: "Cop pha co phat sinh vat tu." },
  { date: "2026-07-10", status: "APPROVED", code: "FND-001", quantity: 170, note: "Dao mong dat dung khoi luong thiet ke 100%." },
  { date: "2026-07-10", status: "APPROVED", code: "FND-002", quantity: 30, note: "Be tong lot dat 91.46%, case near-limit." },
  { date: "2026-07-10", status: "APPROVED", code: "FND-003", quantity: 8000, note: "Tiep tuc thep mong." },
  { date: "2026-07-11", status: "SUBMITTED", code: "FND-004", quantity: 280, note: "Cop pha dat 76.30%." },
  { date: "2026-07-11", status: "SUBMITTED", code: "FND-005", quantity: 120, note: "Bat dau be tong mong dot 1." },
  { date: "2026-07-11", status: "SUBMITTED", code: "STR-101", quantity: 2500, note: "Gia cong thep cot tang 1 tai bai." },
  { date: "2026-07-12", status: "APPROVED", code: "FND-003", quantity: 8500, note: "Thep mong dat 89.29%." },
  { date: "2026-07-12", status: "APPROVED", code: "FND-004", quantity: 250, note: "Cop pha mong dat 94.81%, sat gioi han." },
  { date: "2026-07-12", status: "APPROVED", code: "FND-005", quantity: 130, note: "Be tong mong dot 2." },
  { date: "2026-07-13", status: "APPROVED", code: "FND-005", quantity: 150, note: "Be tong mong dat 93.02%, near-limit." },
  { date: "2026-07-13", status: "APPROVED", code: "STR-101", quantity: 3000, note: "Thep cot tang 1 dat 44%." },
  { date: "2026-07-13", status: "APPROVED", code: "STR-102", quantity: 120, note: "Bat dau cop pha cot tang 1." },
] as const;

const reportSeeds = [
  { no: "BCN-QA-TUHIEP-20260701", type: "DAILY", date: "2026-07-01", status: "APPROVED", creator: "engineer", title: "Bao cao ngay 01/07/2026", summary: "Don mat bang, dinh vi moc va lap lan trai trong ngay khoi cong.", weather: "SUNNY", temp: 32, labor: "38 cong nhan, 2 ky su hien truong, 1 chi huy truong.", equipment: "May toan dac, xe ben 5 tan, may phat dien 50kVA.", issues: "Khong co van de lon.", recommendations: "Hoan tat moc gui chu dau tu truoc khi dao mong." },
  { no: "BCN-QA-TUHIEP-20260702", type: "DAILY", date: "2026-07-02", status: "APPROVED", creator: "engineer", title: "Bao cao ngay 02/07/2026", summary: "Hoan thien phan lon cong tac chuan bi va dien nuoc tam.", weather: "CLOUDY", temp: 31, labor: "42 cong nhan, 2 ky su, 1 can bo an toan.", equipment: "Xe ben, may dam ban, may cat sat.", issues: "Khu tap ket vat tu can bo tri lai loi vao.", recommendations: "Bo sung bien bao an toan tai cong tam." },
  { no: "BCN-QA-TUHIEP-20260703", type: "DAILY", date: "2026-07-03", status: "SUBMITTED", creator: "engineer", title: "Bao cao ngay 03/07/2026", summary: "Cong tac chuan bi dat gan 100%, cho duyet nghiem thu moc.", weather: "LIGHT_RAIN", temp: 29, labor: "30 cong nhan, 2 ky su.", equipment: "May toan dac, xe tai nho.", issues: "Con 4 diem moc can kiem tra lai sau mua.", recommendations: "Kiem tra lai moc vao sang 04/07." },
  { no: "BCN-QA-TUHIEP-20260704", type: "DAILY", date: "2026-07-04", status: "DRAFT", creator: "engineer", title: "Bao cao ngay 04/07/2026", summary: "Bat dau dao mong va gia cong thep mong dot 1.", weather: "OVERCAST", temp: 30, labor: "34 cong nhan, 2 ky su.", equipment: "May dao 1.0m3, xe ben, may uon sat.", issues: "Dang cho xac nhan cao do ho pit.", recommendations: "Bo sung anh nghiem thu truoc khi gui." },
  { no: "BCN-QA-TUHIEP-20260706", type: "DAILY", date: "2026-07-06", status: "APPROVED", creator: "commander", title: "Bao cao ngay 06/07/2026", summary: "Phan mong A trien khai on dinh sau mot ngay khong nhap du lieu.", weather: "SUNNY", temp: 33, labor: "46 cong nhan, 2 ky su, 1 chi huy truong.", equipment: "May dao, xe ben, may cat uon thep, dam coc tay.", issues: "Kho bai thep can che mua.", recommendations: "Lap mai che tam cho khu gia cong." },
  { no: "BCN-QA-TUHIEP-20260707", type: "DAILY", date: "2026-07-07", status: "SUBMITTED", creator: "engineer", title: "Bao cao ngay 07/07/2026", summary: "Be tong lot bat dau, cop pha tiep tuc tren nhieu mui.", weather: "CLOUDY", temp: 32, labor: "48 cong nhan, 2 ky su.", equipment: "Xe tron be tong, may dam dui, may cat sat.", issues: "Can bo sung chung chi vat lieu be tong lot.", recommendations: "Cap nhat ho so vat lieu truoc ngay 08/07." },
  { no: "BCN-QA-TUHIEP-20260709", type: "DAILY", date: "2026-07-09", status: "REJECTED", creator: "engineer", title: "Bao cao ngay 09/07/2026", summary: "Dao mong gan hoan thanh, cop pha co phat sinh thieu vat tu.", weather: "LIGHT_RAIN", temp: 28, labor: "44 cong nhan, 2 ky su.", equipment: "May dao, xe ben, may uon sat.", issues: "Thieu anh nghiem thu cop pha va thieu van phu phim.", recommendations: "Bo sung anh va cap vat tu trong ngay tiep theo.", rejectedReason: "Thieu anh nghiem thu cop pha truoc khi gui duyet." },
  { no: "BCN-QA-TUHIEP-20260710", type: "DAILY", date: "2026-07-10", status: "APPROVED", creator: "commander", title: "Bao cao ngay 10/07/2026", summary: "Dao mong dat 100%, be tong lot dat gan gioi han thiet ke.", weather: "SUNNY", temp: 34, labor: "52 cong nhan, 2 ky su, 1 chi huy truong.", equipment: "May dao, xe ben, may dam dui.", issues: "Kiem soat khoi luong be tong lot sat thiet ke.", recommendations: "Khong nhap them be tong lot neu khong co phat sinh duyet." },
  { no: "BCN-QA-TUHIEP-20260712", type: "DAILY", date: "2026-07-12", status: "APPROVED", creator: "engineer", title: "Bao cao ngay 12/07/2026", summary: "Cop pha mong dat 94.81%, thep mong dat 89.29%.", weather: "CLOUDY", temp: 31, labor: "55 cong nhan, 2 ky su.", equipment: "May uon sat, may han, dam dui.", issues: "Can chot lich do be tong dot tiep.", recommendations: "Xac nhan lich xe be tong ngay 13/07." },
  { no: "BCN-QA-TUHIEP-20260713", type: "DAILY", date: "2026-07-13", status: "APPROVED", creator: "engineer", title: "Bao cao ngay 13/07/2026", summary: "Be tong mong dat 93.02%, bat dau thep va cop pha cot tang 1.", weather: "SUNNY", temp: 33, labor: "58 cong nhan, 3 ky su.", equipment: "Bom be tong, may dam dui, may uon sat.", issues: "Can tach luong vat tu cho phan than tang 1.", recommendations: "Len phieu yeu cau thep cot tang 1 va cop pha than." },
  { no: "BCT-QA-TUHIEP-20260701-20260707", type: "WEEKLY", date: "2026-07-07", weekStart: "2026-07-01", weekEnd: "2026-07-07", status: "APPROVED", creator: "commander", title: "Bao cao tuan 01/07 - 07/07/2026", summary: "Tuan 1 hoan thanh phan chuan bi, bat dau phan mong va co du lieu draft/submitted.", weather: "CLOUDY", temp: 31, labor: "Binh quan 40-48 nhan su/ngay.", equipment: "May dao, xe ben, may toan dac, may gia cong thep.", issues: "Ngay 05/07 chua nhap du lieu, can test calendar empty day.", recommendations: "Duy tri nhap lieu hang ngay va chot anh nghiem thu." },
  { no: "BCT-QA-TUHIEP-20260708-20260714", type: "WEEKLY", date: "2026-07-14", weekStart: "2026-07-08", weekEnd: "2026-07-14", status: "SUBMITTED", creator: "commander", title: "Bao cao tuan 08/07 - 14/07/2026", summary: "Tuan 2 co nhieu hang muc near-limit va ngay 14/07 chua nhap du lieu.", weather: "SUNNY", temp: 32, labor: "Binh quan 48-58 nhan su/ngay.", equipment: "May dao, xe ben, bom be tong, may dam dui.", issues: "Can test guard chong vuot khoi luong FND-001/FND-004/FND-005.", recommendations: "Chi cho phep nhap phat sinh neu co phe duyet thay doi thiet ke." },
] as const;

const documentSeeds = [
  { folder: "01_Hop dong", name: "HD_QA-TUHIEP-5F-001_Hop-dong-thi-cong.pdf", mime: "application/pdf", ext: ".pdf", status: "APPROVED", type: "CONTRACT" },
  { folder: "01_Hop dong", name: "PLHD_QA-TUHIEP-5F-001_Tien-do-thanh-toan.pdf", mime: "application/pdf", ext: ".pdf", status: "SUBMITTED", type: "CONTRACT_APPENDIX" },
  { folder: "02_Ban ve", name: "BV_KT_Tong-mat-bang_V01.pdf", mime: "application/pdf", ext: ".pdf", status: "APPROVED", type: "DRAWING" },
  { folder: "02_Ban ve", name: "BV_KC_Mong_V01.pdf", mime: "application/pdf", ext: ".pdf", status: "APPROVED", type: "DRAWING" },
  { folder: "02_Ban ve", name: "BV_MEP_Tang-1_V01.pdf", mime: "application/pdf", ext: ".pdf", status: "SUBMITTED", type: "DRAWING" },
  { folder: "03_Du toan", name: "DT_Goc_QA-TUHIEP-5F-001.xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ext: ".xlsx", status: "APPROVED", type: "ESTIMATE" },
  { folder: "04_Nghiem thu", name: "NT_Dinh-vi-tim-truc_20260701.pdf", mime: "application/pdf", ext: ".pdf", status: "APPROVED", type: "ACCEPTANCE" },
  { folder: "04_Nghiem thu", name: "NT_Cot-thep-mong-dot-1_20260712.pdf", mime: "application/pdf", ext: ".pdf", status: "SUBMITTED", type: "ACCEPTANCE" },
  { folder: "07_Hinh anh hien truong", name: "IMG_Hien-truong_20260701.jpg", mime: "image/jpeg", ext: ".jpg", status: "APPROVED", type: "SITE_PHOTO" },
  { folder: "08_Bao cao ngay", name: "BCN_20260710_NguyenHoangNam.pdf", mime: "application/pdf", ext: ".pdf", status: "SUBMITTED", type: "DAILY_REPORT" },
  { folder: "09_Vat tu", name: "YC_Vat-tu_Cop-pha-dot-1.xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ext: ".xlsx", status: "DRAFT", type: "MATERIAL" },
  { folder: "10_Phat sinh", name: "PS_Xu-ly-cao-do-ho-pit.pdf", mime: "application/pdf", ext: ".pdf", status: "DRAFT", type: "ISSUE" },
] as const;

const reportAttachmentSeeds = [
  { reportNo: "BCN-QA-TUHIEP-20260701", kind: "PHOTO", name: "QA_TUHIEP_20260701_hien-truong.jpg", mime: "image/jpeg", ext: ".jpg", caption: "Anh mat bang ngay khoi cong." },
  { reportNo: "BCN-QA-TUHIEP-20260702", kind: "PHOTO", name: "QA_TUHIEP_20260702_lan-trai.jpg", mime: "image/jpeg", ext: ".jpg", caption: "Anh lan trai va dien nuoc tam." },
  { reportNo: "BCN-QA-TUHIEP-20260702", kind: "FILE", name: "QA_TUHIEP_20260702_bien-ban.pdf", mime: "application/pdf", ext: ".pdf", caption: "Bien ban kiem tra moc tam." },
  { reportNo: "BCN-QA-TUHIEP-20260710", kind: "PHOTO", name: "QA_TUHIEP_20260710_dao-mong-100.jpg", mime: "image/jpeg", ext: ".jpg", caption: "Dao mong dat 100% thiet ke." },
  { reportNo: "BCN-QA-TUHIEP-20260713", kind: "FILE", name: "QA_TUHIEP_20260713_bao-cao-nhanh.pdf", mime: "application/pdf", ext: ".pdf", caption: "Bao cao nhanh be tong mong va thep cot." },
] as const;

const materialRequests = [
  {
    requestNo: "YCVT-QA-TUHIEP-20260706-001",
    requester: "engineer",
    date: "2026-07-06",
    needed: "2026-07-08",
    status: "SUBMITTED",
    priority: "HIGH",
    note: "Bo sung thep va van phu phim cho mong dot 1.",
    items: [
      { code: "FND-003", materialCode: "THEP-CB400-D16", materialName: "Thep CB400 D16", unit: "kg", qty: 8500, reason: "Gia cong lap dung cot thep mong dot 1" },
      { code: "FND-004", materialCode: "VAN-PHU-PHIM-18", materialName: "Van phu phim 18mm", unit: "tam", qty: 120, reason: "Lap dung cop pha mong" },
    ],
  },
  {
    requestNo: "YCVT-QA-TUHIEP-20260710-001",
    requester: "commander",
    date: "2026-07-10",
    needed: "2026-07-11",
    status: "APPROVED",
    priority: "URGENT",
    note: "Cap vat tu cho be tong mong dot 1 va dam dui.",
    items: [
      { code: "FND-005", materialCode: "BT-M300-S12", materialName: "Be tong thuong pham M300, slump 12", unit: "m3", qty: 150, issued: 0, received: 0, reason: "Do be tong mong dot 1" },
      { code: "FND-005", materialCode: "PHU-GIA-R7", materialName: "Phu gia tang cuong do som R7", unit: "lit", qty: 80, issued: 0, received: 0, reason: "Dam bao tien do thao cop pha" },
    ],
  },
  {
    requestNo: "YCVT-QA-TUHIEP-20260712-001",
    requester: "engineer",
    date: "2026-07-12",
    needed: "2026-07-13",
    status: "ISSUED",
    priority: "HIGH",
    note: "Vat tu phan than tang 1.",
    items: [
      { code: "STR-101", materialCode: "THEP-CB400-D20", materialName: "Thep CB400 D20", unit: "kg", qty: 3200, issued: 3200, received: 2800, reason: "Gia cong cot tang 1" },
      { code: "STR-102", materialCode: "COPPHA-THEP", materialName: "Bo cop pha cot thep module", unit: "bo", qty: 18, issued: 18, received: 18, reason: "Cop pha cot tang 1" },
    ],
  },
  {
    requestNo: "YCVT-QA-TUHIEP-20260714-001",
    requester: "engineer",
    date: "2026-07-14",
    needed: "2026-07-16",
    status: "DRAFT",
    priority: "MEDIUM",
    note: "Phieu draft de test sua/xoa truoc khi submit.",
    items: [
      { code: "MEP-001", materialCode: "ONG-PVC-D25", materialName: "Ong PVC D25", unit: "m", qty: 600, reason: "Dien am san tang 1 sap trien khai" },
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
      name: "Nha Van Phong Dieu Hanh 5 Tang - Khu Cong Nghiep Tu Hiep",
      investor: "Cong ty TNHH Phat Trien Ha Tang Tu Hiep",
      location: "Lo A3-2, Khu Cong Nghiep Tu Hiep, huyen Thanh Tri, Ha Noi",
      status: "ACTIVE",
      startDate: dateOnly("2026-07-01"),
      endDate: dateOnly("2027-03-31"),
      budget: decimal("68500000000.0000"),
      deletedAt: null,
      description:
        [
          "Du lieu QA realistic/fake, khong phai ho so phap ly that.",
          "Quy mo: nha van phong dieu hanh 5 tang noi + 1 tum ky thuat, mong coc BTCT, ket cau khung BTCT toan khoi.",
          "Dien tich san: 4.850 m2. Gia tri hop dong tham chieu: 68.500.000.000 VND.",
          "Nguoi phu trach: Tran Minh Khoi. Chi huy truong: Nguyen Hoang Nam.",
          "Ky su hien truong: Le Quang Huy, Pham Gia Linh. Ke toan: Vu Thi Mai Anh.",
        ].join("\n"),
    },
    create: {
      code: PROJECT_CODE,
      name: "Nha Van Phong Dieu Hanh 5 Tang - Khu Cong Nghiep Tu Hiep",
      investor: "Cong ty TNHH Phat Trien Ha Tang Tu Hiep",
      location: "Lo A3-2, Khu Cong Nghiep Tu Hiep, huyen Thanh Tri, Ha Noi",
      status: "ACTIVE",
      startDate: dateOnly("2026-07-01"),
      endDate: dateOnly("2027-03-31"),
      budget: decimal("68500000000.0000"),
      description:
        [
          "Du lieu QA realistic/fake, khong phai ho so phap ly that.",
          "Quy mo: nha van phong dieu hanh 5 tang noi + 1 tum ky thuat, mong coc BTCT, ket cau khung BTCT toan khoi.",
          "Dien tich san: 4.850 m2. Gia tri hop dong tham chieu: 68.500.000.000 VND.",
          "Nguoi phu trach: Tran Minh Khoi. Chi huy truong: Nguyen Hoang Nam.",
          "Ky su hien truong: Le Quang Huy, Pham Gia Linh. Ke toan: Vu Thi Mai Anh.",
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
      weatherNote: "Du lieu thoi tiet QA gia lap.",
      summary: seed.summary,
      materials: "Thep CB400, be tong thuong pham, van phu phim, ong PVC va vat tu phu tro theo tung ngay.",
      labor: seed.labor,
      equipment: seed.equipment,
      quality: "Kiem tra tim truc, cao do, nghiem thu cot thep/cop pha va lay mau be tong theo quy trinh QA.",
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
          note: `Seed line ${line.code}`,
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
