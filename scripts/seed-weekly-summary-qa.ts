/**
 * QA Seed: Weekly Company Summary Test Data
 * 
 * Creates 5 projects with varied weekly report statuses across 2 weeks,
 * plus daily reports to verify type filtering.
 * 
 * Namespace: QA_WEEKLY_SUMMARY_*
 * Guard: process.env.NODE_ENV must NOT be "production"
 * Idempotent: deletes existing QA data before re-creating
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const QA_PREFIX = "QA_WS_";
const QA_USER_EMAIL = "qa-weekly-summary@erp-test.vn";

// Week 1: 2026-07-20 (Mon) to 2026-07-26 (Sun) – mixed statuses
// Week 2: 2026-07-27 (Mon) to 2026-08-02 (Sun) – all approved

const WEEK1_START = "2026-07-20";
const WEEK1_END = "2026-07-26";
const WEEK2_START = "2026-07-27";
const WEEK2_END = "2026-08-02";

function toUtcStart(dateStr: string) {
  return new Date(`${dateStr}T00:00:00+07:00`);
}
function toUtcEnd(dateStr: string) {
  return new Date(`${dateStr}T23:59:59.999+07:00`);
}
function toReportDate(dateStr: string) {
  return new Date(`${dateStr}T08:00:00+07:00`);
}

const PROJECTS = [
  { code: `${QA_PREFIX}VPH`, name: "Nhà văn phòng điều hành 5 tầng – Khu công nghiệp Từ Hiệp" },
  { code: `${QA_PREFIX}NXD`, name: "Nhà xưởng sản xuất cơ khí Đông Phú" },
  { code: `${QA_PREFIX}TGL`, name: "Trường tiểu học Gia Lâm" },
  { code: `${QA_PREFIX}NOH`, name: "Khối nhà ở xã hội Hoài Đức" },
  { code: `${QA_PREFIX}HTK`, name: "Hạ tầng kỹ thuật Khu công nghiệp Quang Minh" },
];

async function cleanup() {
  console.log("🧹 Cleaning up existing QA data...");

  // Delete reports by QA user
  const qaUser = await prisma.user.findUnique({ where: { email: QA_USER_EMAIL } });
  if (qaUser) {
    await prisma.siteReportLine.deleteMany({ where: { siteReport: { createdById: qaUser.id } } });
    await prisma.siteReportAttachment.deleteMany({ where: { report: { createdById: qaUser.id } } });
    await prisma.siteReportPhoto.deleteMany({ where: { report: { createdById: qaUser.id } } });
    await prisma.siteReport.deleteMany({ where: { createdById: qaUser.id } });
  }

  // Delete QA projects
  const qaCodes = PROJECTS.map((p) => p.code);
  await prisma.project.deleteMany({ where: { code: { in: qaCodes } } });

  // Delete QA user
  if (qaUser) {
    await prisma.user.delete({ where: { id: qaUser.id } });
  }

  console.log("✅ Cleanup complete");
}

async function seed() {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ GUARD: Cannot run QA seed in production!");
    process.exit(1);
  }

  await cleanup();

  console.log("📦 Creating QA user...");
  const qaUser = await prisma.user.create({
    data: {
      email: QA_USER_EMAIL,
      username: "qa_weekly_summary",
      password: "$2b$10$dummyhashforqauserdontuse",
      name: "QA Kiểm thử tổng hợp tuần",
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log("🏗️ Creating QA projects...");
  const projects = [];
  for (const p of PROJECTS) {
    const project = await prisma.project.create({
      data: {
        code: p.code,
        name: p.name,
        status: "ACTIVE",
        description: `[QA] Dữ liệu kiểm thử tổng hợp báo cáo tuần`,
      },
    });
    projects.push(project);
  }

  const [vpProject, nxProject, tgProject, noProject, htProject] = projects;

  // ─── Week 1: Mixed statuses ───────────────────────────────
  console.log("📋 Creating Week 1 reports (mixed statuses)...");

  // Project 1 (VPH): APPROVED weekly
  await createWeeklyReport(vpProject.id, qaUser.id, WEEK1_START, WEEK1_END, {
    status: "APPROVED",
    summary: "Hoàn thành đổ bê tông cột tầng 3, lắp dựng cốp pha sàn tầng 4. Tiến độ đạt 92% kế hoạch tuần.",
    issues: "Thiếu thép phi 18 cho sàn tầng 4, nhà cung cấp hẹn giao muộn 2 ngày.",
    materials: "Đã nhập 45m³ bê tông, 12 tấn thép. Còn thiếu 3 tấn thép phi 18.",
    labor: "35 công nhân, 2 kỹ sư. Đủ nhân lực.",
    quality: "Kiểm tra độ sụt bê tông đạt yêu cầu. Lấy mẫu nén 3 tổ.",
    recommendations: "Cần Ban Giám đốc liên hệ nhà cung cấp thép để đảm bảo tiến độ.",
    generalNote: JSON.stringify({
      version: 2,
      weeklyAssessment: { progressStatus: "ON_TRACK", qualityStatus: "PASSED", safetyStatus: "SAFE" },
      nextWeekPlan: [
        { fieldProgressItemId: "plan1", workContent: "Đổ bê tông sàn tầng 4" },
        { fieldProgressItemId: "plan2", workContent: "Lắp dựng cốp pha cột tầng 4" },
      ],
    }),
    reporterName: "Nguyễn Văn Hùng",
    approvedAt: toReportDate(WEEK1_END),
    approvedById: qaUser.id,
  });

  // Project 2 (NXD): SUBMITTED (pending)
  await createWeeklyReport(nxProject.id, qaUser.id, WEEK1_START, WEEK1_END, {
    status: "SUBMITTED",
    summary: "Thi công móng nhà xưởng hoàn thành 60%. Đào đất móng M5-M8 xong, đang đổ bê tông lót.",
    issues: "Mưa lớn ngày 22-23/07, phải bơm nước hố móng liên tục.",
    materials: "Đủ vật tư cho 2 tuần tới.",
    labor: "28 công nhân. Thiếu 5 thợ hàn.",
    quality: "Cao độ đáy móng đạt yêu cầu thiết kế.",
    recommendations: null,
    generalNote: JSON.stringify({
      version: 2,
      weeklyAssessment: { progressStatus: "DELAYED", qualityStatus: "PASSED", safetyStatus: "SAFE" },
      nextWeekPlan: [
        { fieldProgressItemId: "plan3", workContent: "Đổ bê tông móng M5-M8" },
        { fieldProgressItemId: "plan4", workContent: "Gia công cốt thép dầm móng" },
      ],
    }),
    reporterName: "Trần Đức Mạnh",
  });

  // Project 3 (TGL): REVISION_REQUESTED
  await createWeeklyReport(tgProject.id, qaUser.id, WEEK1_START, WEEK1_END, {
    status: "REVISION_REQUESTED",
    summary: "Đang xây dựng khối lớp học, hoàn thành xây tường tầng 1.",
    issues: "Phát hiện vết nứt tại vị trí dầm D3, cần đánh giá lại.",
    materials: "Gạch xây tường đang thiếu, cần bổ sung.",
    labor: "20 công nhân.",
    quality: "Cần bổ sung báo cáo kiểm tra vết nứt dầm D3.",
    recommendations: "Cần kỹ sư kết cấu kiểm tra vết nứt.",
    generalNote: JSON.stringify({
      version: 2,
      weeklyAssessment: { progressStatus: "WATCHING", qualityStatus: "NEED_RECHECK", safetyStatus: "RISK" },
    }),
    reporterName: "Lê Hoàng Anh",
  });

  // Project 4 (NOH): No report (MISSING) → don't create any

  // Project 5 (HTK): REJECTED
  await createWeeklyReport(htProject.id, qaUser.id, WEEK1_START, WEEK1_END, {
    status: "REJECTED",
    summary: "Thi công hệ thống thoát nước.",
    issues: null,
    materials: null,
    labor: null,
    quality: null,
    recommendations: null,
    generalNote: null,
    reporterName: "Phạm Quốc Bảo",
    rejectedReason: "Báo cáo chưa đầy đủ thông tin vật tư và nhân lực.",
  });

  // ─── Week 2: All approved ─────────────────────────────────
  console.log("📋 Creating Week 2 reports (all approved)...");

  const week2Data = [
    {
      projectId: vpProject.id,
      summary: "Hoàn thành đổ bê tông sàn tầng 4, lắp dựng cốp pha cột tầng 4. Tiến độ tốt.",
      issues: "Không có vướng mắc lớn.",
      materials: "Đã nhập đủ thép phi 18. Tổng 50m³ bê tông, 15 tấn thép.",
      labor: "37 công nhân, 2 kỹ sư.",
      quality: "Kết quả nén mẫu bê tông tầng 3 đạt R400. Tốt.",
      recommendations: null,
      reporterName: "Nguyễn Văn Hùng",
      nextWeekPlan: [
        { fieldProgressItemId: "w2p1", workContent: "Xây tường tầng 4" },
        { fieldProgressItemId: "w2p2", workContent: "Lắp đặt hệ thống điện tầng 3" },
      ],
    },
    {
      projectId: nxProject.id,
      summary: "Hoàn thành đổ bê tông móng M5-M8. Bắt đầu thi công cột thép nhà xưởng.",
      issues: "Cần bổ sung 3 bộ dụng cụ hàn chuyên dụng.",
      materials: "Thép hình H300 đã nhập kho. Đủ cho 3 tuần.",
      labor: "32 công nhân, 5 thợ hàn (đã bổ sung).",
      quality: "Kiểm tra mối hàn đạt yêu cầu.",
      recommendations: "Đề nghị mua thêm 3 bộ dụng cụ hàn để tăng năng suất.",
      reporterName: "Trần Đức Mạnh",
      nextWeekPlan: [
        { fieldProgressItemId: "w2p3", workContent: "Dựng cột thép trục A-D" },
      ],
    },
    {
      projectId: tgProject.id,
      summary: "Đã xử lý vết nứt dầm D3 bằng phương pháp bơm keo Sikadur. Tiếp tục xây tường tầng 2.",
      issues: "Cần thêm thời gian để chờ keo khô (7 ngày).",
      materials: "Gạch xây tường đã bổ sung đủ.",
      labor: "22 công nhân.",
      quality: "Vết nứt đã được xử lý. Kỹ sư kết cấu đã kiểm tra và chấp thuận.",
      recommendations: null,
      reporterName: "Lê Hoàng Anh",
      nextWeekPlan: [
        { fieldProgressItemId: "w2p5", workContent: "Hoàn thành tường tầng 2" },
        { fieldProgressItemId: "w2p6", workContent: "Chuẩn bị cốp pha sàn tầng 2" },
      ],
    },
    {
      projectId: noProject.id,
      summary: "Bắt đầu thi công phần thô khối A. Đào đất móng hoàn thành 100%.",
      issues: "Giao thông vận chuyển vật liệu vào công trường khó khăn do đường hẹp.",
      materials: "Cần bổ sung 200 tấn cát san nền.",
      labor: "45 công nhân, 3 máy đào.",
      quality: "Đạt yêu cầu.",
      recommendations: "Cần Ban Giám đốc phối hợp UBND phường để mở rộng lối vào.",
      reporterName: "Vũ Đình Toàn",
      nextWeekPlan: [
        { fieldProgressItemId: "w2p7", workContent: "Đổ bê tông lót móng khối A" },
      ],
    },
    {
      projectId: htProject.id,
      summary: "Lắp đặt cống thoát nước D800 từ hố ga HG1 đến HG5. Đào rãnh cáp điện tuyến 1.",
      issues: "Va chạm đường ống nước cũ tại vị trí HG3, cần xử lý.",
      materials: "Ống cống D800 đủ cho 2 tuần. Cáp điện đang chờ nhập.",
      labor: "25 công nhân, 1 máy đào, 1 cẩu.",
      quality: "Nghiệm thu cao độ cống đạt yêu cầu.",
      recommendations: "Cần xử lý đường ống nước cũ giao cắt tại HG3.",
      reporterName: "Phạm Quốc Bảo",
      nextWeekPlan: [
        { fieldProgressItemId: "w2p9", workContent: "Lắp đặt cống HG5-HG8" },
        { fieldProgressItemId: "w2p10", workContent: "Kéo cáp điện tuyến 1" },
      ],
    },
  ];

  for (const data of week2Data) {
    await createWeeklyReport(data.projectId, qaUser.id, WEEK2_START, WEEK2_END, {
      status: "APPROVED",
      summary: data.summary,
      issues: data.issues,
      materials: data.materials,
      labor: data.labor,
      quality: data.quality,
      recommendations: data.recommendations,
      generalNote: JSON.stringify({
        version: 2,
        weeklyAssessment: { progressStatus: "ON_TRACK", qualityStatus: "PASSED", safetyStatus: "SAFE" },
        nextWeekPlan: data.nextWeekPlan,
      }),
      reporterName: data.reporterName,
      approvedAt: toReportDate(WEEK2_END),
      approvedById: qaUser.id,
    });
  }

  // ─── Daily reports (to verify they don't appear in summary) ─
  console.log("📋 Creating daily reports (verification data)...");

  for (const project of projects) {
    // Create 2 daily reports per project in week 1
    for (const day of ["2026-07-21", "2026-07-23"]) {
      await prisma.siteReport.create({
        data: {
          type: "DAILY",
          projectId: project.id,
          createdById: qaUser.id,
          reportDate: toReportDate(day),
          status: "APPROVED",
          summary: `[QA] Báo cáo ngày ${day} - ${project.name}. KHÔNG ĐƯỢC XUẤT HIỆN TRONG BẢN TỔNG HỢP.`,
          reporterName: "QA Tester",
          approvedById: qaUser.id,
          approvedAt: toReportDate(day),
        },
      });
    }
  }

  // ─── Summary ──────────────────────────────────────────────
  console.log("\n✅ QA Seed Complete!");
  console.log(`   Projects: ${projects.length}`);
  console.log(`   Week 1 weekly reports: 4 (1 approved, 1 pending, 1 revision, 1 rejected, 1 missing)`);
  console.log(`   Week 2 weekly reports: 5 (all approved)`);
  console.log(`   Daily reports: ${projects.length * 2} (must NOT appear in summary)`);
  console.log(`   QA user: ${QA_USER_EMAIL}`);
}

async function createWeeklyReport(
  projectId: string,
  createdById: string,
  weekStart: string,
  weekEnd: string,
  data: {
    status: string;
    summary: string;
    issues: string | null;
    materials: string | null;
    labor: string | null;
    quality: string | null;
    recommendations: string | null;
    generalNote: string | null;
    reporterName: string;
    approvedAt?: Date;
    approvedById?: string;
    rejectedReason?: string;
  },
) {
  return prisma.siteReport.create({
    data: {
      type: "WEEKLY",
      projectId,
      createdById,
      reportDate: toReportDate(weekEnd),
      weekStartDate: toUtcStart(weekStart),
      weekEndDate: toUtcEnd(weekEnd),
      status: data.status,
      summary: data.summary,
      issues: data.issues,
      materials: data.materials,
      labor: data.labor,
      quality: data.quality,
      recommendations: data.recommendations,
      generalNote: data.generalNote,
      reporterName: data.reporterName,
      submittedAt: toReportDate(weekEnd),
      approvedAt: data.approvedAt,
      approvedById: data.approvedById,
      rejectedReason: data.rejectedReason,
    },
  });
}

seed()
  .catch((error) => {
    console.error("❌ Seed error:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
