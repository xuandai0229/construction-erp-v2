import "dotenv/config";
import prisma from "../src/lib/prisma";
import { normalizeNfc, cleanContentValue, hasBrokenVietnameseText } from "../src/lib/safety-reporting/date-utils";

async function main() {
  const isFixMode = process.argv.includes("--fix");
  console.log(`=======================================================`);
  console.log(` AUDIT LEGACY SELF-ASSESSMENT REPORTS (${isFixMode ? "FIX MODE" : "DRY RUN MODE"})`);
  console.log(`=======================================================\n`);

  const reports = await prisma.safetySelfAssessmentReport.findMany({
    include: {
      entries: true,
    },
  });

  console.log(`Found ${reports.length} total Self-Assessment report(s) in DB.\n`);

  let affectedReportsCount = 0;
  let affectedFieldsCount = 0;

  for (const report of reports) {
    let reportHasIssues = false;
    const reportUpdates: Record<string, string> = {};

    const reportFieldsToScan: Array<{ key: keyof typeof report; name: string }> = [
      { key: "officialDocumentNumber", name: "Số hiệu công văn" },
      { key: "documentPlace", name: "Địa danh" },
      { key: "recipientText", name: "Nơi nhận" },
      { key: "reporterName", name: "Người báo cáo" },
      { key: "reporterTitle", name: "Chức danh" },
      { key: "reporterDepartment", name: "Phòng ban" },
      { key: "internalNote", name: "Ghi chú nội bộ" },
      { key: "previousWeekRemediation", name: "Phần I.1: Theo dõi khắc phục" },
      { key: "reinspectionConfirmation", name: "Phần I.2: Tái kiểm tra" },
      { key: "managementRecommendation", name: "Phần II.1: Kiến nghị BGĐ" },
      { key: "otherOpinion", name: "Phần II.2: Ý kiến khác" },
    ];

    for (const field of reportFieldsToScan) {
      const rawVal = report[field.key] as string | null | undefined;
      if (!rawVal) continue;

      const cleaned = cleanContentValue(rawVal);
      const isMojibake = hasBrokenVietnameseText(rawVal);
      const isPlaceholder = rawVal !== cleaned;

      if (isPlaceholder || isMojibake) {
        reportHasIssues = true;
        affectedFieldsCount++;
        console.log(`[Report ID: ${report.id}]`);
        console.log(`  - Trường: ${field.name} (${field.key})`);
        console.log(`  - Giá trị cũ: "${rawVal}"`);
        console.log(`  - Giá trị đề xuất: "${cleaned}"`);
        console.log(`  - Lý do: ${isPlaceholder ? "Chứa legacy placeholder (None/null/-)" : ""} ${isMojibake ? "Lỗi phông / Mojibake" : ""}\n`);
        
        reportUpdates[field.key] = cleaned;
      }
    }

    // Scan entries
    for (const entry of report.entries) {
      const entryFieldsToScan: Array<{ key: keyof typeof entry; name: string }> = [
        { key: "inspectionContent", name: "Nội dung kiểm tra" },
        { key: "assessment", name: "Đánh giá công trình" },
        { key: "recommendation", name: "Kiến nghị yêu cầu" },
        { key: "implementationResult", name: "Kết quả thực hiện" },
        { key: "customProjectName", name: "Tên công trình tùy chỉnh" },
      ];

      const entryUpdates: Record<string, string> = {};
      let entryHasIssues = false;

      for (const eField of entryFieldsToScan) {
        const eRawVal = entry[eField.key] as string | null | undefined;
        if (!eRawVal) continue;

        const eCleaned = cleanContentValue(eRawVal);
        const eIsMojibake = hasBrokenVietnameseText(eRawVal);
        const eIsPlaceholder = eRawVal !== eCleaned;

        if (eIsPlaceholder || eIsMojibake) {
          reportHasIssues = true;
          entryHasIssues = true;
          affectedFieldsCount++;
          console.log(`[Entry ID: ${entry.id}] (Report ID: ${report.id}, Date: ${entry.inspectionDate.toISOString().slice(0, 10)}, Shift: ${entry.shift})`);
          console.log(`  - Trường: ${eField.name} (${eField.key})`);
          console.log(`  - Giá trị cũ: "${eRawVal}"`);
          console.log(`  - Giá trị đề xuất: "${eCleaned}"`);
          console.log(`  - Lý do: ${eIsPlaceholder ? "Chứa legacy placeholder" : ""} ${eIsMojibake ? "Lỗi phông / Mojibake" : ""}\n`);

          entryUpdates[eField.key] = eCleaned;
        }
      }

      if (isFixMode && entryHasIssues) {
        await prisma.safetySelfAssessmentEntry.update({
          where: { id: entry.id },
          data: entryUpdates,
        });
      }
    }

    if (isFixMode && Object.keys(reportUpdates).length > 0) {
      await prisma.safetySelfAssessmentReport.update({
        where: { id: report.id },
        data: reportUpdates,
      });
    }

    if (reportHasIssues) {
      affectedReportsCount++;
    }
  }

  console.log(`=======================================================`);
  console.log(` SUMMARY REPORT`);
  console.log(`=======================================================`);
  console.log(`Total Reports Scanned   : ${reports.length}`);
  console.log(`Affected Reports        : ${affectedReportsCount}`);
  console.log(`Affected Fields Total   : ${affectedFieldsCount}`);
  console.log(`Execution Mode          : ${isFixMode ? "FIX APPLIED TO DB" : "DRY RUN ONLY (Pass --fix to apply)"}`);
  console.log(`=======================================================\n`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Error running audit script:", err);
  process.exit(1);
});
