import "dotenv/config";
import { PrismaClient, SiteReportStatus } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { assertSafeDatabase } from "./assert-safe-weekly-summary-database";
import { vietnamStartOfDayUtc, vietnamEndOfDayUtc } from "../../src/lib/reports/report-timezone";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const NAMESPACE = "QA-WEEKLY-STRESS-2026";
const QA_EMAIL = "qa-weekly-stress@erp-test.vn";

const WEEKS = [
  { weekStart: "2026-06-22", weekEnd: "2026-06-28", num: 26 },
  { weekStart: "2026-06-29", weekEnd: "2026-07-05", num: 27 },
  { weekStart: "2026-07-06", weekEnd: "2026-07-12", num: 28 },
  { weekStart: "2026-07-13", weekEnd: "2026-07-19", num: 29 },
  { weekStart: "2026-07-20", weekEnd: "2026-07-26", num: 30 },
  { weekStart: "2026-07-27", weekEnd: "2026-08-02", num: 31 },
];

const PROJECTS_SEED = [
  { code: "QA-STRESS-01", name: "Dự án Khu Đô thị Mới Vinhomes Smart City - Phân khu Sapphire 1 (Tòa S1.01 đến S1.06)" },
  { code: "QA-STRESS-02", name: "Tổ hợp Căn hộ Cao cấp King Palace Nguyễn Trãi" },
  { code: "QA-STRESS-03", name: "Dự án Nâng cấp và Mở rộng Quốc lộ 1A Đoạn qua tỉnh Thanh Hóa" },
  { code: "QA-STRESS-04", name: "Nhà máy Sản xuất Linh kiện Điện tử Pegatron Hải Phòng - Giai đoạn 2" },
  { code: "QA-STRESS-05", name: "Bệnh viện Đa khoa Quốc tế Vinmec Smart City" },
  { code: "QA-STRESS-06", name: "Trung tâm Thương mại Aeon Mall Hoàng Mai" },
  { code: "QA-STRESS-07", name: "Cầu Vĩnh Tuy - Giai đoạn 2 (Gói thầu XL-01 Thi công trụ T1 đến T8)" },
  { code: "QA-STRESS-08", name: "Dự án Hạ tầng Kỹ thuật Khu Công nghiệp Sông Khoai Quảng Ninh" },
  { code: "QA-STRESS-09", name: "Khách sạn 5 sao Silk Path Grand Resort & Spa Sa Pa - Khối mở rộng" },
  { code: "QA-STRESS-10", name: "Chung cư Xã hội IEC Residence Thanh Trì" },
  { code: "QA-STRESS-11", name: "Trường Đại học Phenikaa - Tòa nhà Khoa Y Dược" },
  { code: "QA-STRESS-12", name: "Hệ thống Cấp thoát nước và Xử lý Nước thải Thành phố Bắc Ninh" },
];

const RICH_RESULTS = [
  "Hoàn thành 100% công tác bê tông móng dầm đài T1-T4, lắp dựng xong 450 tấn cốp pha nhôm tầng 8 và gia công 380 tấn cốt thép dầm sàn. Đo dạc trắc địa đảm bảo độ lệch nằm trong giới hạn cho phép ±3mm.",
  "Thi công hoàn thiện 1.200m2 tường gạch dầy 220mm tầng 5, hoàn thành nghiệm thu công tác trát trong tòa nhà khối B. Công tác đi ống ghen PCCC và cấp thoát nước đạt 85% kế hoạch đề ra.",
  "Đào hố móng tầng hầm 2 đạt 90% khối lượng, gia cố xong 120md tường vằn barrette. Đã bơm hạ mực nước ngầm thành công, đảm bảo khô ráo tuyệt đối cho công tác đổ bê tông lót móng.",
  "Lắp đặt xong 85% kết cấu khung nhà xưởng thép tiền chế rộng 15.000m2. Hoàn thành lợp tôn mái dầy 0.5mm chống nóng và thi công đường nội bộ bê tông nhựa hạt trung dầy 7cm.",
  "Thí nghiệm áp lực thành công đường ống cấp nước D300 dài 2.5km. Lắp đặt 14 hố ga thu nước mưa và dải thảm bê tông nhựa C19 dày 7cm mặt đường trục chính.",
];

const RICH_ISSUES = [
  "Thời tiết mưa lớn kéo dài 3 ngày làm sạt lở cục bộ mái taluy hố móng khu vực phía Tây. Máy băm nát cốt thép bị hỏng bo mạch chính chờ linh kiện thay thế.",
  "Nguồn cung ứng xi măng Hoàng Thạch bị gián đoạn do xe vận chuyển tắc nghẽn tại phà. Thiếu 15 công nhân cốp pha chuyên nghiệp do đợt gặt lúa địa phương.",
  "Chưa nhận được bản vẽ thiết kế thi công điều chỉnh hệ thống M&E tầng 12 từ Chủ đầu tư. Mặt bằng thi công hố ga số 8 vướng đường cáp ngầm 22kV chưa di dời.",
  "Giá thép biến động tăng 8% làm nhà thầu phụ thi công kết cấu thép kiến nghị điều chỉnh đơn giá. Tiếng ồn ban đêm bị người dân xung quanh phản ánh.",
];

const RICH_SUPPORT = [
  "Đề nghị Ban Giám đốc làm việc gấp với Chủ đầu tư để bàn giao mặt bằng thi công tầng hầm B3 trước ngày 30/07/2026 và phê duyệt đơn giá phát sinh đống cọc nhồi D1200.",
  "Đề nghị Phòng VTTB điều chuyển khẩn cấp 1 máy phát điện dự phòng 250kVA từ công trình Nam Định về công trình và bổ sung 20 công nhân cốp pha.",
  "Kính đề nghị Ban Điều hành phê duyệt tạm ứng 800 triệu đồng để thanh toán tiền vật tư gạch xây cho nhà cung cấp và quyết toán đợt 3 cho tổ thợ nêm.",
  "Kính đề nghị Phòng Kế toán giải ngân kinh phí thưởng tiến độ cho tổ thợ bê tông để động viên tinh thần tăng ca làm đêm.",
];

const STATUSES: SiteReportStatus[] = ["APPROVED", "SUBMITTED", "REVISION_REQUESTED", "REJECTED", "DRAFT", "LOCKED"];

async function main() {
  assertSafeDatabase();

  console.log(`🧹 Cleaning old ${NAMESPACE} records...`);
  await prisma.siteReport.deleteMany({
    where: { project: { code: { startsWith: "QA-STRESS-" } } },
  });
  await prisma.project.deleteMany({
    where: { code: { startsWith: "QA-STRESS-" } },
  });

  // Ensure QA user
  const qaUser = await prisma.user.upsert({
    where: { email: QA_EMAIL },
    update: {},
    create: {
      email: QA_EMAIL,
      username: "qa_weekly_stress",
      password: "$2b$10$dummyhashforqauserdontuse",
      name: "QA Stress Tester",
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log("🏗️ Creating 12 QA stress test projects...");
  const createdProjects = [];
  for (const p of PROJECTS_SEED) {
    const proj = await prisma.project.create({
      data: {
        code: p.code,
        name: p.name,
        status: "ACTIVE",
        budget: 50000000000,
      },
    });
    createdProjects.push(proj);
  }

  console.log("📋 Seeding 72 Weekly Reports + 360 Daily Reports...");

  let totalWeeklyCount = 0;
  let totalDailyCount = 0;

  for (let wIdx = 0; wIdx < WEEKS.length; wIdx++) {
    const w = WEEKS[wIdx];
    const weekStartUtc = vietnamStartOfDayUtc(w.weekStart);
    const weekEndUtc = vietnamEndOfDayUtc(w.weekEnd);

    for (let pIdx = 0; pIdx < createdProjects.length; pIdx++) {
      const proj = createdProjects[pIdx];

      // Edge case: In week 31, Project 12 has NO weekly report (missing report test)
      if (wIdx === 5 && pIdx === 11) {
        continue;
      }

      const status = STATUSES[(wIdx + pIdx) % STATUSES.length];
      const result = RICH_RESULTS[(wIdx + pIdx) % RICH_RESULTS.length];
      const issues = (wIdx + pIdx) % 2 === 0 ? RICH_ISSUES[(wIdx + pIdx) % RICH_ISSUES.length] : null;
      const support = (wIdx + pIdx) % 3 === 0 ? RICH_SUPPORT[(wIdx + pIdx) % RICH_SUPPORT.length] : null;

      const reporterName = `Kỹ sư Nguyễn Văn ${String.fromCharCode(65 + (pIdx % 10))}`;

      const generalNote = JSON.stringify({
        version: 2,
        nextWeekPlan: [
          { fieldProgressItemId: "act-1", workContent: `Gia công cốt thép dầm sàn đợt ${wIdx + 1}` },
          { fieldProgressItemId: "act-2", workContent: `Đổ bê tông dầm sàn diện tích 800m2` },
        ],
        weeklyAssessment: {
          safetyStatus: (wIdx + pIdx) % 5 === 0 ? "RISK" : "SAFE",
        },
      });

      // Edge case: Project 1 has 2 weekly reports in Week 30 (testing selection of latest version by updatedAt)
      if (wIdx === 4 && pIdx === 0) {
        // Older report
        await prisma.siteReport.create({
          data: {
            type: "WEEKLY",
            project: { connect: { id: proj.id } },
            createdBy: { connect: { id: qaUser.id } },
            status: "APPROVED",
            weekStartDate: weekStartUtc,
            weekEndDate: weekEndUtc,
            reportDate: weekEndUtc,
            summary: "Bản cũ tuần 30 (KHÔNG ĐƯỢC CHỌN)",
            reporterName,
            updatedAt: new Date("2026-07-21T08:00:00.000Z"),
          },
        });
        totalWeeklyCount++;

        // Newer report (must be selected by updatedAt desc)
        await prisma.siteReport.create({
          data: {
            type: "WEEKLY",
            project: { connect: { id: proj.id } },
            createdBy: { connect: { id: qaUser.id } },
            status: "REJECTED",
            weekStartDate: weekStartUtc,
            weekEndDate: weekEndUtc,
            reportDate: weekEndUtc,
            summary: "Bản mới hơn tuần 30 (PHẢI ĐƯỢC CHỌN VÌ UPDATEDAT MỚI HƠN)",
            issues: "Có lỗi kĩ thuật cần sửa",
            recommendations: "Đề nghị kiểm tra gấp",
            reporterName,
            updatedAt: new Date("2026-07-25T16:00:00.000Z"),
          },
        });
        totalWeeklyCount++;
      } else {
        await prisma.siteReport.create({
          data: {
            type: "WEEKLY",
            project: { connect: { id: proj.id } },
            createdBy: { connect: { id: qaUser.id } },
            status,
            weekStartDate: weekStartUtc,
            weekEndDate: weekEndUtc,
            reportDate: weekEndUtc,
            summary: result,
            issues,
            recommendations: support,
            generalNote,
            reporterName,
            materials: "Đã nhận 45 tấn thép Hòa Phát D18-D25, 300 bao xi măng.",
            labor: "42 công nhân (18 thợ cốp pha, 14 thợ sắt, 10 thợ xây).",
            quality: "Đạt chuẩn TCVN 4453:1995, không phát sinh lỗi nứt dầm.",
            updatedAt: new Date(weekStartUtc.getTime() + (pIdx + 1) * 3600000),
          },
        });
        totalWeeklyCount++;
      }

      // Seed 5 Daily Reports for each week+project (total 5 x 6 x 12 = 360 daily reports)
      for (let d = 1; d <= 5; d++) {
        const reportDate = new Date(weekStartUtc);
        reportDate.setDate(reportDate.getDate() + d - 1);

        await prisma.siteReport.create({
          data: {
            type: "DAILY",
            project: { connect: { id: proj.id } },
            createdBy: { connect: { id: qaUser.id } },
            status: "APPROVED",
            reportDate,
            summary: `Báo cáo ngày ${d} của ${proj.code} (TUYỆT ĐỐI KHÔNG ĐƯỢC TỔNG HỢP VÀO BÁO CÁO TUẦN)`,
            reporterName,
          },
        });
        totalDailyCount++;
      }
    }
  }

  console.log(`\n✅ QA STRESS SEED SUCCESSFUL!`);
  console.log(`   - Projects created: ${createdProjects.length}`);
  console.log(`   - Weeks seeded: ${WEEKS.length}`);
  console.log(`   - Weekly Reports created: ${totalWeeklyCount}`);
  console.log(`   - Daily Reports created: ${totalDailyCount}`);
  console.log(`   - Namespace: ${NAMESPACE}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
