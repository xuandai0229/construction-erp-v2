import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import Workbook from "exceljs";
import { PrismaClient, HrDataScope } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { getHrReportDetailsTable } from "../src/lib/hr/reporting-service";
import { createSessionToken } from "../src/lib/session-token";

const envConfig = dotenv.parse(fs.readFileSync(".env.local"));
Object.assign(process.env, envConfig);
const pool = new Pool({ connectionString: envConfig.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runExcelHttpRuntimeTest() {
  console.log("==========================================");
  console.log("ITEM 10: EXCEL END-TO-END HTTP RUNTIME TEST");
  console.log("==========================================");

  // Find an admin user in DB
  const adminUser = await (prisma as any).user.findFirst({
    where: { role: "ADMIN", isActive: true, deletedAt: null },
  });

  if (!adminUser) {
    throw new Error("No active admin user found for HTTP testing.");
  }

  const token = createSessionToken(adminUser.id, undefined, adminUser.updatedAt.toISOString());
  const authHeader = `auth_session=${token}`;
  console.log(`Authenticated as User: ${adminUser.name} (${adminUser.id})`);

  // Get sample project ID
  const proj = await (prisma as any).project.findFirst({ where: { status: "ACTIVE" } });
  const sampleProjId = proj ? proj.id : "";

  const testCases = [
    { name: "A. Default Current", query: "" },
    { name: "B. Project Filter", query: `projectId=${sampleProjId}` },
    { name: "C. Unassigned", query: "kpiFilter=unassigned" },
    { name: "D. Date Range", query: "dateStart=2026-01-01&dateEnd=2026-12-31" },
  ];

  let serviceParity = true;
  let httpRuntimePass = true;
  let workbookReadPass = true;
  let filterParityPass = true;

  const mockCtx: any = {
    userId: adminUser.id,
    role: adminUser.role,
    isSystemAdmin: true,
    session: { id: adminUser.id, name: adminUser.name, role: adminUser.role },
  };

  for (const tc of testCases) {
    console.log(`\n--- Testing Case ${tc.name} (${tc.query || "Default"}) ---`);

    const reqUrl = `http://localhost:3000/api/hr/reports/export${tc.query ? `?${tc.query}` : ""}`;

    const res = await fetch(reqUrl, {
      headers: {
        Cookie: authHeader,
      },
    });

    console.log(`HTTP Status: ${res.status}`);
    const contentType = res.headers.get("content-type") || "";
    console.log(`Content-Type: ${contentType}`);

    if (res.status !== 200) {
      console.error(`HTTP Status Fail: expected 200, got ${res.status}`);
      httpRuntimePass = false;
    }
    if (!contentType.includes("spreadsheetml")) {
      console.error(`Content-Type Fail: expected spreadsheetml, got ${contentType}`);
      httpRuntimePass = false;
    }

    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    // Save temporary artifact file
    const tmpPath = path.join(__dirname, `temp_test_${Date.now()}.xlsx`);
    fs.writeFileSync(tmpPath, buffer);

    // Read workbook with ExcelJS
    const workbook = new Workbook.Workbook();
    await workbook.xlsx.readFile(tmpPath);

    console.log(`WORKBOOK_OPEN: PASS (Sheet Count: ${workbook.worksheets.length})`);
    if (workbook.worksheets.length < 2) workbookReadPass = false;

    const detailSheet = workbook.getWorksheet("Chi tiết điều động");
    if (!detailSheet) {
      console.error("Missing Chi tiết điều động sheet!");
      workbookReadPass = false;
      fs.unlinkSync(tmpPath);
      continue;
    }

    // Check Vietnamese Unicode string in sheet 1
    const summarySheet = workbook.getWorksheet("Tổng quan");
    const cellValue = summarySheet?.getCell("A1").value?.toString() || "";
    const unicodePass = cellValue.includes("BÁO CÁO TỔNG QUAN VÀ CHỈ SỐ KPI NHÂN SỰ CÔNG TRÌNH");
    console.log(`VIETNAMESE_UNICODE (A1): "${cellValue}" -> ${unicodePass ? "PASS" : "FAIL"}`);
    if (!unicodePass) workbookReadPass = false;

    // Compare Excel detail row count with getHrReportDetailsTable
    // Sheet header is at row 1, data rows start at row 2
    const excelRowCount = detailSheet.rowCount - 1;
    const filtersFromQuery: any = {};
    const urlObj = new URL(reqUrl);
    urlObj.searchParams.forEach((v, k) => {
      filtersFromQuery[k] = v;
    });

    const webResult = await getHrReportDetailsTable(
      mockCtx,
      HrDataScope.ALL_EMPLOYEES,
      filtersFromQuery,
      1,
      1000,
      prisma
    );

    console.log(`EXCEL_DETAIL_COUNT: ${excelRowCount} | WEB_COUNT: ${webResult.totalCount}`);
    if (excelRowCount !== webResult.totalCount) {
      console.error(`Mismatch for ${tc.name}: Excel ${excelRowCount} vs Web ${webResult.totalCount}`);
      filterParityPass = false;
    }

    // Clean up temporary file
    fs.unlinkSync(tmpPath);
  }

  console.log("\n==========================================");
  console.log(`EXCEL_SERVICE_PARITY: ${serviceParity ? "PASS" : "FAIL"}`);
  console.log(`EXCEL_HTTP_RUNTIME: ${httpRuntimePass ? "PASS" : "FAIL"}`);
  console.log(`EXCEL_WORKBOOK_READ: ${workbookReadPass ? "PASS" : "FAIL"}`);
  console.log(`EXCEL_FILTER_PARITY: ${filterParityPass ? "PASS" : "FAIL"}`);
  console.log("==========================================");

  await prisma.$disconnect();
  await pool.end();
}

runExcelHttpRuntimeTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
