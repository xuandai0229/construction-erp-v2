import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { getWeeklyCompanySummary } from "@/lib/reports/weekly-company-summary";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🔍 Running QA Stress Data Verification Audit...");

  let errorsCount = 0;

  // 1. Verify projects count
  const projects = await prisma.project.findMany({
    where: { code: { startsWith: "QA-STRESS-" }, deletedAt: null },
  });

  if (projects.length !== 12) {
    console.error(`❌ Expected 12 QA projects, found ${projects.length}`);
    errorsCount++;
  } else {
    console.log("  ✓ Found exactly 12 QA stress projects.");
  }

  // 2. Verify summary aggregation for Week 30 (2026-07-20)
  const summaryWeek30 = await getWeeklyCompanySummary("2026-07-20");

  if (summaryWeek30.projects.length < 12) {
    console.error(`❌ Expected at least 12 projects in Week 30 summary, found ${summaryWeek30.projects.length}`);
    errorsCount++;
  } else {
    console.log("  ✓ Week 30 summary contains all projects.");
  }

  // 3. Verify latest version selection (Project 1 in Week 30 has 2 reports, must pick newer one)
  const prj1 = summaryWeek30.projects.find((p) => p.code === "QA-STRESS-01");
  if (!prj1 || !prj1.result?.includes("PHẢI ĐƯỢC CHỌN VÌ UPDATEDAT MỚI HƠN")) {
    console.error(`❌ Latest report selection failed for QA-STRESS-01. Got: ${prj1?.result}`);
    errorsCount++;
  } else {
    console.log("  ✓ Correctly selected latest report version by updatedAt desc for QA-STRESS-01.");
  }

  // 4. Verify no DAILY reports included
  const dailyReportsInSummary = summaryWeek30.projects.filter(
    (p) => p.result && p.result.includes("TUYỆT ĐỐI KHÔNG ĐƯỢC TỔNG HỢP VÀO BÁO CÁO TUẦN"),
  );

  if (dailyReportsInSummary.length > 0) {
    console.error(`❌ Found ${dailyReportsInSummary.length} DAILY reports leaked into weekly summary!`);
    errorsCount++;
  } else {
    console.log("  ✓ Zero DAILY reports leaked into weekly summary.");
  }

  // 5. Verify missing report text for Week 31 (Project 12 has no weekly report)
  const summaryWeek31 = await getWeeklyCompanySummary("2026-07-27");
  const prj12Week31 = summaryWeek31.projects.find((p) => p.code === "QA-STRESS-12");

  if (!prj12Week31 || prj12Week31.result !== "Chưa có báo cáo tuần.") {
    console.error(`❌ Expected 'Chưa có báo cáo tuần.' for missing report in Week 31. Got: ${prj12Week31?.result}`);
    errorsCount++;
  } else {
    console.log("  ✓ Missing report rendered correctly as 'Chưa có báo cáo tuần.'");
  }

  // 6. Verify NO approval status fields present in project entries
  const prjKeys = Object.keys(summaryWeek30.projects[0]);
  if (prjKeys.includes("status") || prjKeys.includes("approvalStatus")) {
    console.error(`❌ Approval status leak detected in project entry keys: ${prjKeys.join(", ")}`);
    errorsCount++;
  } else {
    console.log("  ✓ No approval status fields present in Unified View Model.");
  }

  if (errorsCount > 0) {
    console.error(`\n❌ VERIFICATION FAILED with ${errorsCount} errors.`);
    process.exit(1);
  }

  console.log("\n🎉 ALL QA STRESS DATA VERIFICATION CHECKS PASSED SUCCESSFULLY!");
  process.exit(0);
}

main()
  .catch((e) => {
    console.error("❌ Fatal Verification Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
