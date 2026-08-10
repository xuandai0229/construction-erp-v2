import dotenv from "dotenv";
import fs from "fs";
import { PrismaClient, HrDataScope } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  getHrReportKpis,
  getHrReportCharts,
  getHrReportDetailsTable,
  generateHrExcelReportBuffer,
} from "../src/lib/hr/reporting-service";
import ExcelJS from "exceljs";

const envConfig = dotenv.parse(fs.readFileSync(".env.local"));
const pool = new Pool({ connectionString: envConfig.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runExcelExportRuntimeTest() {
  console.log("==========================================");
  console.log("PHASE 13: EXCEL EXPORT RUNTIME VERIFICATION");
  console.log("==========================================");

  const ctx: any = {
    userId: "dev-admin-user",
    role: "ADMIN",
    isSystemAdmin: true,
    session: { id: "dev-admin-user", name: "System Admin", role: "ADMIN" },
  };
  const scope = HrDataScope.ALL_EMPLOYEES;

  const firstProject = await prisma.project.findFirst();

  const testScenarios = [
    { name: "Scenario A: Default / Current Report", filters: {} },
    {
      name: "Scenario B: Project Filter",
      filters: { projectId: firstProject?.id },
    },
    { name: "Scenario C: Unassigned Filter", filters: { kpiFilter: "unassigned" } },
    {
      name: "Scenario D: Date Range Filter",
      filters: { dateStart: "2025-01-01", dateEnd: "2026-12-31" },
    },
  ];

  let allPassed = true;

  for (const scenario of testScenarios) {
    console.log(`\n--- Testing ${scenario.name} ---`);

    const details = await getHrReportDetailsTable(
      ctx,
      scope,
      scenario.filters,
      1,
      1000,
      prisma
    );

    const webDetailCount = details.totalCount;

    // Generate Excel Buffer
    const buffer = await generateHrExcelReportBuffer(ctx, scope, scenario.filters, prisma);
    console.log(`Buffer generated successfully. Size: ${buffer.byteLength} bytes.`);

    // Read back workbook using ExcelJS
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    console.log("Workbook sheets:", workbook.worksheets.map((w) => w.name).join(", "));

    // Verify Sheet 2 (Chi tiết điều động)
    const sheet2 = workbook.getWorksheet("Chi tiết điều động");
    if (!sheet2) {
      console.error("FAIL: Sheet 'Chi tiết điều động' missing");
      allPassed = false;
      continue;
    }

    let excelDetailRows = 0;
    if (sheet2.rowCount > 1) {
      const cellA2 = sheet2.getCell("A2").value;
      if (typeof cellA2 === "string" && cellA2.includes("Không có dữ liệu")) {
        excelDetailRows = 0;
      } else {
        excelDetailRows = sheet2.rowCount - 1; // Subtract header row
      }
    }

    console.log(`WEB_FILTER_COUNT: ${webDetailCount} | EXCEL_EXPORT_COUNT: ${excelDetailRows}`);

    if (webDetailCount === excelDetailRows) {
      console.log(`PASS: WEB_FILTER_COUNT === EXCEL_EXPORT_COUNT (${webDetailCount})`);
    } else {
      console.error(
        `FAIL: Mismatch for ${scenario.name}! WEB: ${webDetailCount}, EXCEL: ${excelDetailRows}`
      );
      allPassed = false;
    }
  }

  console.log("\n==========================================");
  console.log(`EXCEL EXPORT VERIFICATION RESULT: ${allPassed ? "PASS" : "FAIL"}`);
  console.log("==========================================");

  await prisma.$disconnect();
  await pool.end();
}

runExcelExportRuntimeTest().catch((err) => {
  console.error("Excel Export Test Failed:", err);
  process.exit(1);
});
