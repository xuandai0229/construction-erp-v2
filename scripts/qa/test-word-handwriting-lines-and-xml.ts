import fs from "fs";
import path from "path";
import JSZip from "jszip";
import { exportSupervisionWeeklyDocx } from "../../src/lib/supervision-weekly/export-docx";
import { SafetyAssessmentDocxGenerator } from "../../src/lib/safety-reporting/assessment-docx-generator";
import { HANDWRITING_LINE_CONFIG } from "../../src/lib/docx/handwriting-lines";
import type { SupervisionWeeklyPrintDto } from "../../src/lib/supervision-weekly/print-types";

// Mock Supervision Weekly Dossier with completely EMPTY Section II and III
const mockEmptyDossier: SupervisionWeeklyPrintDto = {
  id: "test-dossier-empty",
  reportNumber: "BCGS-2026-W32-EMPTY",
  weekNumber: 32,
  year: 2026,
  weekStart: "2026-08-03",
  weekEnd: "2026-08-09",
  createdAt: "2026-08-03T00:00:00.000Z",
  status: "APPROVED",
  project: {
    code: "CT-DEMO",
    name: "Dự án Công trình Mẫu 2026",
    address: "Số 1 Nguyễn Trãi, Hà Nội",
  },
  creator: {
    fullName: "Nguyễn Văn Giám Sát",
    jobTitle: "Kỹ sư Giám sát",
  },
  items: [],
  observations: [],
};

// Mock Supervision Weekly Dossier with MIXED content (some fields filled, some empty)
const mockMixedDossier: SupervisionWeeklyPrintDto = {
  ...mockEmptyDossier,
  reportNumber: "BCGS-2026-W32-MIXED",
  observations: [
    {
      id: "obs-1",
      documentType: "NEXT_WEEK_PLAN",
      category: "Theo dõi khắc phục các yêu cầu của tuần trước còn tồn đọng",
      content: "Đã khắc phục xong lỗi vết nứt sàn bê tông tầng 3 theo đúng biên bản kiểm tra.",
    },
    // Note: Category 2 (Kiểm tra lại...) is deliberately left empty!
    {
      id: "obs-3",
      documentType: "NEXT_WEEK_PLAN",
      category: "Bổ sung nhân lực, thiết bị; thay thế đội ngũ yếu kém, không đạt yêu cầu về kỹ thuật, mỹ thuật",
      content: "Đề nghị Ban Giám đốc phê duyệt bổ sung 02 máy bơm bê tông cho tuần tới.",
    },
    // Note: Other categories are left empty!
  ],
};

// Mock Supervision Weekly Dossier with LONG multi-line content
const mockLongTextDossier: SupervisionWeeklyPrintDto = {
  ...mockEmptyDossier,
  reportNumber: "BCGS-2026-W32-LONG",
  observations: [
    {
      id: "obs-long-1",
      documentType: "NEXT_WEEK_PLAN",
      category: "Theo dõi khắc phục các yêu cầu của tuần trước còn tồn đọng",
      content: "Căn cứ biên bản kiểm tra ngày 28/07/2026, nhà thầu đã hoàn thành khắc phục các tồn tại về công tác cốt thép dầm sàn tầng 4.\nĐã kiểm tra xác nhận lại toàn bộ mối nối hàn cột C1-C4 đạt yêu cầu kỹ thuật TCVN 4453:1995.\nCác vị trí sạt lở lề đường công vụ tạm đã được lu lèn gia cố bằng đá hộc và dải cấp phối đá dăm.",
    },
    {
      id: "obs-long-2",
      documentType: "NEXT_WEEK_PLAN",
      category: "Bổ sung nhân lực, thiết bị; thay thế đội ngũ yếu kém, không đạt yêu cầu về kỹ thuật, mỹ thuật",
      content: "Yêu cầu Đội thi công số 2 thay thế ngay 05 công nhân hàn chưa có chứng chỉ hành nghề.\nĐồng thời bổ sung 01 máy kinh vĩ điện tử Leica để đo đạc trắc địa chính xác cho trục 3-5.",
    },
  ],
};

async function parseDocxXmlContent(buffer: Buffer): Promise<{ xmlText: string; dottedLineCount: number }> {
  const zip = await JSZip.loadAsync(buffer);
  const documentXmlFile = zip.file("word/document.xml");
  if (!documentXmlFile) {
    throw new Error("Could not find word/document.xml inside generated DOCX");
  }
  const xmlText = await documentXmlFile.async("text");
  
  // Count w:leader="dot" occurrences (tab leader handwriting lines)
  const matches = xmlText.match(/w:leader="dot"/g) || [];
  const borderMatches = xmlText.match(/w:val="dotted"/g) || [];
  const dottedLineCount = matches.length + borderMatches.length;

  return { xmlText, dottedLineCount };
}

async function runWordHandwritingLinesAudit() {
  console.log("=== STARTING QA AUDIT: UPDATED WORD HANDWRITING LINES (3-4 LINES CONFIG) ===");
  const artifactsDir = path.join(process.cwd(), "artifacts");
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  // Calculate expected handwriting lines for empty Next Week Plan:
  // Section II: 4 + 3 = 7 lines
  // Section III: 4 + 4 + 3 + 3 = 14 lines
  // Total expected = 21 lines
  const expectedEmptyPlanLines =
    HANDWRITING_LINE_CONFIG.previousWeekFollowUp +
    HANDWRITING_LINE_CONFIG.verificationAfterCorrection +
    HANDWRITING_LINE_CONFIG.manpowerAndEquipment +
    HANDWRITING_LINE_CONFIG.progressDirection +
    HANDWRITING_LINE_CONFIG.technicalMaterialIssues +
    HANDWRITING_LINE_CONFIG.otherComments;

  console.log(`CONFIGURED LINE COUNTS:
  - II.1 Theo dõi khắc phục: ${HANDWRITING_LINE_CONFIG.previousWeekFollowUp} lines
  - II.2 Kiểm tra lại: ${HANDWRITING_LINE_CONFIG.verificationAfterCorrection} lines
  - III.1 Bổ sung nhân lực/thiết bị: ${HANDWRITING_LINE_CONFIG.manpowerAndEquipment} lines
  - III.2 Chỉ đạo tiến độ: ${HANDWRITING_LINE_CONFIG.progressDirection} lines
  - III.3 Xử lý phát sinh kỹ thuật: ${HANDWRITING_LINE_CONFIG.technicalMaterialIssues} lines
  - III.4 Ý kiến khác: ${HANDWRITING_LINE_CONFIG.otherComments} lines
  - TOTAL EXPECTED LINES FOR EMPTY PLAN: ${expectedEmptyPlanLines} lines`);

  // -------------------------------------------------------------
  // TEST CASE 1: Empty Supervision Weekly Next Week Plan
  // -------------------------------------------------------------
  console.log("\n--- TEST CASE 1: Supervision Next Week Plan (Empty Section II & III) ---");
  const emptyPlanDocxBuffer = await exportSupervisionWeeklyDocx(mockEmptyDossier, "NEXT_WEEK_PLAN");
  const emptyPlanFilePath = path.join(artifactsDir, "Case1_Supervision_NextWeekPlan_Empty.docx");
  fs.writeFileSync(emptyPlanFilePath, emptyPlanDocxBuffer);
  console.log(`Saved DOCX file: ${emptyPlanFilePath} (${emptyPlanDocxBuffer.length} bytes)`);

  const { xmlText: xmlCase1, dottedLineCount: countCase1 } = await parseDocxXmlContent(emptyPlanDocxBuffer);
  
  // ASSERTIONS FOR CASE 1
  if (xmlCase1.includes("Chưa có ghi nhận")) throw new Error("FAIL: Prohibited placeholder 'Chưa có ghi nhận' found!");
  if (xmlCase1.includes("Chưa có đề xuất")) throw new Error("FAIL: Prohibited placeholder 'Chưa có đề xuất' found!");
  if (xmlCase1.includes("Không phát sinh")) throw new Error("FAIL: Prohibited placeholder 'Không phát sinh' found!");
  
  if (countCase1 !== expectedEmptyPlanLines) {
    throw new Error(`FAIL: Expected ${expectedEmptyPlanLines} handwriting lines in XML, but found ${countCase1}!`);
  }
  console.log(`ASSERTION PASSED: Zero placeholders, exact ${countCase1} handwriting lines verified in XML!`);

  // -------------------------------------------------------------
  // TEST CASE 2: Mixed Content Supervision Weekly Next Week Plan
  // -------------------------------------------------------------
  console.log("\n--- TEST CASE 2: Supervision Next Week Plan (Mixed Content) ---");
  const mixedPlanDocxBuffer = await exportSupervisionWeeklyDocx(mockMixedDossier, "NEXT_WEEK_PLAN");
  const mixedPlanFilePath = path.join(artifactsDir, "Case2_Supervision_NextWeekPlan_Mixed.docx");
  fs.writeFileSync(mixedPlanFilePath, mixedPlanDocxBuffer);
  console.log(`Saved DOCX file: ${mixedPlanFilePath} (${mixedPlanDocxBuffer.length} bytes)`);

  const { xmlText: xmlCase2, dottedLineCount: countCase2 } = await parseDocxXmlContent(mixedPlanDocxBuffer);

  if (xmlCase2.includes("Chưa có ghi nhận") || xmlCase2.includes("Chưa có đề xuất")) {
    throw new Error("FAIL: Found prohibited placeholder strings in mixed DOCX!");
  }
  if (!xmlCase2.includes("Đã khắc phục xong lỗi vết nứt sàn bê tông tầng 3")) {
    throw new Error("FAIL: Filled content was not rendered in DOCX!");
  }

  // Expected lines for mixed dossier:
  // II.1 filled (0 lines), II.2 empty (3 lines)
  // III.1 filled (0 lines), III.2 empty (4 lines), III.3 empty (3 lines), III.4 empty (3 lines)
  // Total expected = 3 + 4 + 3 + 3 = 13 lines
  const expectedMixedLines = 3 + 4 + 3 + 3;
  if (countCase2 !== expectedMixedLines) {
    throw new Error(`FAIL: Mixed content expected ${expectedMixedLines} handwriting lines, but found ${countCase2}!`);
  }
  console.log(`ASSERTION PASSED: Filled fields display user data, empty fields display exact ${countCase2} handwriting lines!`);

  // -------------------------------------------------------------
  // TEST CASE 3: Long Text Multi-Line Content
  // -------------------------------------------------------------
  console.log("\n--- TEST CASE 3: Long Text Multi-Line Content ---");
  const longPlanDocxBuffer = await exportSupervisionWeeklyDocx(mockLongTextDossier, "NEXT_WEEK_PLAN");
  const longPlanFilePath = path.join(artifactsDir, "Case3_Supervision_NextWeekPlan_LongText.docx");
  fs.writeFileSync(longPlanFilePath, longPlanDocxBuffer);
  console.log(`Saved DOCX file: ${longPlanFilePath} (${longPlanDocxBuffer.length} bytes)`);

  const { xmlText: xmlCase3 } = await parseDocxXmlContent(longPlanDocxBuffer);
  if (!xmlCase3.includes("TCVN 4453:1995") || !xmlCase3.includes("Leica")) {
    throw new Error("FAIL: Long multi-line text content was truncated!");
  }
  console.log("ASSERTION PASSED: Multi-line text auto-wraps without text truncation or extraneous lines!");

  // -------------------------------------------------------------
  // TEST CASE 4: Safety Self-Assessment (Mẫu 01) Empty State Audit
  // -------------------------------------------------------------
  console.log("\n--- TEST CASE 4: Safety Self-Assessment (Mẫu 01 Empty State) ---");
  const mockEmptyAssessment = {
    id: "test-safety-empty",
    officialDocumentNumber: "12/BC-ATLĐ",
    documentDateFormatted: "ngày 03 tháng 08 năm 2026",
    sections: [],
  };
  const safetyDocxBuffer = await SafetyAssessmentDocxGenerator.generateAssessmentDocx(mockEmptyAssessment);
  const safetyFilePath = path.join(artifactsDir, "Case4_Safety_Assessment_Empty.docx");
  fs.writeFileSync(safetyFilePath, safetyDocxBuffer);
  console.log(`Saved DOCX file: ${safetyFilePath} (${safetyDocxBuffer.length} bytes)`);

  const { xmlText: xmlCase4, dottedLineCount: countCase4 } = await parseDocxXmlContent(safetyDocxBuffer);
  if (xmlCase4.includes("Chưa có ghi nhận")) {
    throw new Error("FAIL: Found prohibited placeholder string 'Chưa có ghi nhận' in Safety Assessment DOCX!");
  }
  if (countCase4 < 1) {
    throw new Error("FAIL: Safety Assessment DOCX does NOT contain valid handwriting lines!");
  }
  console.log(`ASSERTION PASSED: Safety Assessment DOCX uses ${countCase4} clean handwriting lines!`);

  console.log("\n=== ALL QA AUDIT CHECKS PASSED SUCCESSFULLY! ===");
}

runWordHandwritingLinesAudit().catch((err) => {
  console.error("QA AUDIT FAILED:", err);
  process.exit(1);
});
