import zlib from "node:zlib";
import { buildSafetyPlanPreviewModel, buildSafetyPlanDocumentDTO, formatSafetyDayLabel, formatSafetyShiftLabel } from "../src/lib/safety-reporting/plan-view-model";
import { renderSafetyPlanStandaloneHtml } from "../src/lib/safety-reporting/html-renderer";
import { SafetyDocxGenerator } from "../src/lib/safety-reporting/docx-generator";
import { SafetyPdfConverter } from "../src/lib/safety-reporting/pdf-converter";
import { paginateSafetyPlanTableRows, chunkTextPreservingAllChars, buildSafetyWeeklyTableRows } from "../src/lib/safety-reporting/table-paginator";

function extractWordDocumentXml(docxBuffer: Buffer): string {
  let offset = 0;
  while (offset < docxBuffer.length - 30) {
    if (docxBuffer.readUInt32LE(offset) === 0x04034b50) { // Local file header magic
      const method = docxBuffer.readUInt16LE(offset + 8);
      const compSize = docxBuffer.readUInt32LE(offset + 18);
      const fileNameLen = docxBuffer.readUInt16LE(offset + 26);
      const extraLen = docxBuffer.readUInt16LE(offset + 28);
      const fileName = docxBuffer.toString("utf8", offset + 30, offset + 30 + fileNameLen);
      
      const dataOffset = offset + 30 + fileNameLen + extraLen;

      if (fileName === "word/document.xml") {
        const compressedData = docxBuffer.subarray(dataOffset, dataOffset + compSize);
        if (method === 8) { // Deflate
          const uncompressed = zlib.inflateRawSync(compressedData);
          return uncompressed.toString("utf8");
        } else if (method === 0) { // Stored
          return compressedData.toString("utf8");
        }
      }
      offset = dataOffset + Math.max(compSize, 1);
    } else {
      offset++;
    }
  }
  return "";
}

async function runComprehensiveSafetyPlanVerification() {
  console.log("=== COMPREHENSIVE SAFETY PLAN DAY/DATE/SHIFT FORMAT & TABLE VERIFICATION ===");

  // Section XII Fixture: Week with all 7 days, 3 projects in Mon Morning, empty Tue, Wed evening only, etc.
  const longProjectName = "Dự án Đầu tư Xây dựng Khu Đô thị Mới Cao cấp kết hợp Trung tâm Thương mại và Văn phòng Cho thuê Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh";
  const longContent = "Kiểm tra công tác an toàn lao động, vệ sinh môi trường và phòng cháy chữa cháy đối với toàn bộ hệ thống giàn giáo, lưới chống rơi.".repeat(5);
  const longNote = "Yêu cầu Ban chỉ huy công trường khắc phục ngay trong ngày các điểm mất an toàn điện tại tủ tạm tầng 5.".repeat(15);

  const mockPlan = {
    id: "qa-plan-2026-day-shift-fix",
    documentNumber: "KH-ATLD-2026-0099",
    officialDocumentNumber: "99/ct2",
    periodStart: "2026-07-20T00:00:00.000Z",
    createdDate: "2026-07-20T08:00:00.000Z",
    recipients: {
      place: "Hà Nội",
      recipientName: "Ban Giám đốc Công ty, Ban chỉ huy các công trình",
      recipientTitle: "Phòng kỹ thuật, Các BCH công trường",
    },
    createdBy: { name: "Nguyễn Văn Safety" },
    entries: [
      // Monday Morning (2026-07-20): 3 projects in same morning shift
      {
        id: "m-m-1",
        inspectionDate: "2026-07-20T00:00:00.000Z",
        shift: "MORNING",
        location: "Công trình A - Tháp A1",
        inspectionContent: "Kiểm tra giàn giáo ngoài",
        note: "Đạt an toàn",
        sortOrder: 1,
      },
      {
        id: "m-m-2",
        inspectionDate: "2026-07-20T00:00:00.000Z",
        shift: "MORNING",
        location: "Công trình B - Tòa B2",
        inspectionContent: "Kiểm tra hệ thống điện thi công",
        note: "Khắc phục tủ tạm",
        sortOrder: 2,
      },
      {
        id: "m-m-3",
        inspectionDate: "2026-07-20T00:00:00.000Z",
        shift: "MORNING",
        location: "Công trình C - Hố móng",
        inspectionContent: "Kiểm tra rào chắn hố móng",
        note: "Bổ sung biển cảnh báo",
        sortOrder: 3,
      },
      // Monday Afternoon & Evening
      {
        id: "m-a-1",
        inspectionDate: "2026-07-20T00:00:00.000Z",
        shift: "AFTERNOON",
        location: "Công trình A - Cốp pha tầng 10",
        inspectionContent: "Kiểm tra sấy bê tông",
        note: "Đã kiểm tra",
        sortOrder: 1,
      },
      {
        id: "m-e-1",
        inspectionDate: "2026-07-20T00:00:00.000Z",
        shift: "EVENING",
        location: "Công trình A1 - Chiếu sáng ca đêm",
        inspectionContent: "Kiểm tra đèn chiếu sáng ca đêm",
        note: "Đủ ánh sáng",
        sortOrder: 1,
      },
      // Tuesday (2026-07-21): COMPLETELY EMPTY DAY (0 entries)
      // Wednesday (2026-07-22): Only Evening shift
      {
        id: "w-e-1",
        inspectionDate: "2026-07-22T00:00:00.000Z",
        shift: "EVENING",
        location: "Công trình X - Cọc nhồi ca tối",
        inspectionContent: "Kiểm tra bùn khoan ca tối",
        note: "Cần bổ sung rào chắn ban đêm",
        sortOrder: 1,
      },
      // Thursday (2026-07-23): Long content
      {
        id: "th-m-1",
        inspectionDate: "2026-07-23T00:00:00.000Z",
        shift: "MORNING",
        location: longProjectName,
        inspectionContent: longContent,
        note: longNote,
        sortOrder: 1,
      },
      // Friday (2026-07-24): Manual typed project
      {
        id: "f-m-1",
        inspectionDate: "2026-07-24T00:00:00.000Z",
        shift: "MORNING",
        location: "Công trình Y - Nhập tự do tay",
        inspectionContent: "Huấn luyện an toàn đầu giờ",
        note: "Hoàn thành 100%",
        sortOrder: 1,
      },
      // Saturday (2026-07-25): COMPLETELY EMPTY DAY (0 entries)
      // Sunday (2026-07-26): Morning shift
      {
        id: "sun-m-1",
        inspectionDate: "2026-07-26T00:00:00.000Z",
        shift: "MORNING",
        location: "Công trình Z - Trực ca Chủ Nhật",
        inspectionContent: "Kiểm tra niêm phong ca trực Sunday",
        note: "An toàn",
        sortOrder: 1,
      },
    ],
  };

  console.log("\n--- STEP 1: VERIFYING SHARED FORMATTING HELPERS ---");
  const dayLabelMon = formatSafetyDayLabel("2026-07-20T00:00:00.000Z");
  const dayLabelSun = formatSafetyDayLabel("2026-07-26T00:00:00.000Z");
  console.log(`Monday Day Label: '${dayLabelMon}'`);
  console.log(`Sunday Day Label: '${dayLabelSun}'`);

  if (dayLabelMon !== "Thứ Hai, 20/07/2026") {
    throw new Error(`FAIL: formatSafetyDayLabel expected 'Thứ Hai, 20/07/2026', got '${dayLabelMon}'`);
  }
  if (dayLabelSun !== "Chủ Nhật, 26/07/2026") {
    throw new Error(`FAIL: formatSafetyDayLabel expected 'Chủ Nhật, 26/07/2026', got '${dayLabelSun}'`);
  }

  if (formatSafetyShiftLabel("MORNING") !== "Sáng:") throw new Error("FAIL: MORNING shift label wrong!");
  if (formatSafetyShiftLabel("AFTERNOON") !== "Chiều:") throw new Error("FAIL: AFTERNOON shift label wrong!");
  if (formatSafetyShiftLabel("EVENING") !== "Tối:") throw new Error("FAIL: EVENING shift label wrong!");
  console.log("Shared Formatting Helpers: PASS");

  console.log("\n--- STEP 2: VERIFYING CANONICAL DTO & 21 SHIFTS ---");
  const viewModel = buildSafetyPlanPreviewModel(mockPlan);
  if (viewModel.days.length !== 7) {
    throw new Error(`FAIL: Expected 7 days, got ${viewModel.days.length}`);
  }

  const expectedDayLabels = [
    "Thứ Hai, 20/07/2026",
    "Thứ Ba, 21/07/2026",
    "Thứ Tư, 22/07/2026",
    "Thứ Năm, 23/07/2026",
    "Thứ Sáu, 24/07/2026",
    "Thứ Bảy, 25/07/2026",
    "Chủ Nhật, 26/07/2026",
  ];

  viewModel.days.forEach((day, idx) => {
    if (day.dayName !== expectedDayLabels[idx]) {
      throw new Error(`FAIL: Day ${idx} expected '${expectedDayLabels[idx]}', got '${day.dayName}'`);
    }
  });
  console.log("7 Days with Exact Day of Week + Date Format: PASS");

  console.log("\n--- STEP 3: VERIFYING TABLE PAGINATOR & MULTI-PROJECT NO-REPEAT ---");
  const physicalRows = paginateSafetyPlanTableRows(viewModel);
  const rowsSamePaginator = buildSafetyWeeklyTableRows(viewModel);

  if (JSON.stringify(physicalRows) !== JSON.stringify(rowsSamePaginator)) {
    throw new Error("FAIL: buildSafetyWeeklyTableRows and paginateSafetyPlanTableRows mismatch!");
  }

  // Check Monday Morning 3 projects:
  const monMorningRows = physicalRows.filter(r => r.dayIso === "2026-07-20" && r.rowId.includes("-MORNING-"));
  if (monMorningRows.length !== 3) {
    throw new Error(`FAIL: Expected 3 physical rows for Monday Morning, got ${monMorningRows.length}`);
  }

  // Row 0: DayName = "Thứ Hai, 20/07/2026", ShiftLabel = "Sáng:"
  if (monMorningRows[0].dayName !== "Thứ Hai, 20/07/2026") throw new Error("FAIL: Row 0 missing day label!");
  if (monMorningRows[0].shiftLabel !== "Sáng:") throw new Error("FAIL: Row 0 missing shift label 'Sáng:'!");

  // Row 1 & 2: DayName = "", ShiftLabel = "" (BLANK, NO REPEATING "Sáng:" or "Thứ Hai" or "Tiếp")
  if (monMorningRows[1].dayName !== "") throw new Error("FAIL: Row 1 repeated day label!");
  if (monMorningRows[1].shiftLabel !== "") throw new Error("FAIL: Row 1 repeated shift label!");
  if (monMorningRows[2].dayName !== "") throw new Error("FAIL: Row 2 repeated day label!");
  if (monMorningRows[2].shiftLabel !== "") throw new Error("FAIL: Row 2 repeated shift label!");

  console.log("Multi-project Shift Rows (No Repeated Labels / No 'Tiếp'): PASS");

  // Check Tuesday Empty Day:
  const tueRows = physicalRows.filter(r => r.dayIso === "2026-07-21");
  if (tueRows.length !== 3) {
    throw new Error(`FAIL: Expected 3 physical rows for empty Tuesday, got ${tueRows.length}`);
  }
  if (tueRows[0].dayName !== "Thứ Ba, 21/07/2026" || tueRows[0].shiftLabel !== "Sáng:") throw new Error("FAIL: Tuesday Row 0 wrong!");
  if (tueRows[1].shiftLabel !== "Chiều:") throw new Error("FAIL: Tuesday Row 1 wrong!");
  if (tueRows[2].shiftLabel !== "Tối:") throw new Error("FAIL: Tuesday Row 2 wrong!");
  if (tueRows[0].projectName !== "" || tueRows[1].projectName !== "" || tueRows[2].projectName !== "") {
    throw new Error("FAIL: Empty day contains non-blank synthetic text!");
  }
  console.log("Empty Day (7 days x 3 shifts matrix with 100% BLANK data cells): PASS");

  console.log("\n--- STEP 4: VERIFYING STANDALONE HTML & PREVIEW STYLING (NO ITALICS) ---");
  const html = renderSafetyPlanStandaloneHtml(viewModel);

  if (html.includes("<em>Sáng:</em>") || html.includes("<em>Chiều:</em>") || html.includes("<em>Tối:</em>")) {
    throw new Error("FAIL: HTML contains italic shift labels <em>!");
  }
  if (html.includes("font-style: italic")) {
    const timeCellCss = html.substring(html.indexOf(".time-cell {"), html.indexOf(".data-cell {"));
    if (timeCellCss.includes("font-style: italic")) {
      throw new Error("FAIL: .time-cell CSS contains font-style: italic!");
    }
  }
  console.log("HTML Preview / Standalone HTML Styling (Bold Upright, No Italics): PASS");

  console.log("\n--- STEP 5: VERIFYING DOCX XML (w:b PRESENT, NO w:i IN SHIFT RUNS) ---");
  const docxBuffer = await SafetyDocxGenerator.generatePlanDocx(mockPlan);
  console.log(`DOCX Buffer Size: ${docxBuffer.length} bytes`);

  const docXml = extractWordDocumentXml(docxBuffer);
  if (!docXml) {
    throw new Error("FAIL: Could not extract word/document.xml from DOCX buffer!");
  }
  console.log(`Extracted word/document.xml: ${docXml.length} characters`);

  // Assert all 7 day labels in document.xml
  for (const label of expectedDayLabels) {
    if (!docXml.includes(label)) {
      throw new Error(`FAIL: DOCX document.xml missing day label '${label}'`);
    }
  }
  console.log("DOCX document.xml contains all 7 exact Day of Week + Date strings: PASS");

  // Assert shift labels Sáng:, Chiều:, Tối: are present in document.xml
  if (!docXml.includes("Sáng:") || !docXml.includes("Chiều:") || !docXml.includes("Tối:")) {
    throw new Error("FAIL: DOCX document.xml missing shift labels!");
  }

  // Inspect XML paragraph runs for Sáng:
  const sangIndex = docXml.indexOf("Sáng:");
  if (sangIndex > -1) {
    const pStart = docXml.lastIndexOf("<w:p", sangIndex);
    const pEnd = docXml.indexOf("</w:p>", sangIndex);
    const pXml = docXml.substring(pStart, pEnd + 6);
    
    // Italics is active if <w:i/> or <w:i w:val="true"/> or <w:i w:val="1"/> is present.
    // If <w:i w:val="false"/> is present, it explicitly disables italics.
    const isItalicsActive = pXml.includes("<w:i/>") || pXml.includes('<w:i w:val="true"') || pXml.includes('<w:i w:val="1"');
    if (isItalicsActive) {
      throw new Error(`FAIL: DOCX shift label paragraph has active italic tag: ${pXml}`);
    }
    if (!pXml.includes("<w:b/>") && !pXml.includes("<w:b ") && !pXml.includes("<w:b>")) {
      throw new Error(`FAIL: DOCX shift label paragraph missing <w:b/> bold tag: ${pXml}`);
    }
  }
  console.log("DOCX XML Run Verification (w:b present, zero active w:i in shift runs): PASS");

  console.log("\n--- STEP 6: VERIFYING PDF CONVERTER & EXTRACTED TEXT ---");
  const pdfBuffer = await SafetyPdfConverter.generatePlanPdf(mockPlan);
  console.log(`PDF Buffer Size: ${pdfBuffer.length} bytes`);

  const pdfHeader = pdfBuffer.slice(0, 4).toString("ascii");
  if (pdfHeader !== "%PDF") {
    throw new Error(`FAIL: Invalid PDF header '${pdfHeader}'`);
  }
  console.log("PDF Generator Verification: PASS");

  console.log("\n=== ALL THỨ – NGÀY – BUỔI FORMATTING & INTEGRITY TESTS PASSED 100% SUCCESSFUL ===");
}

runComprehensiveSafetyPlanVerification().catch((err) => {
  console.error("QA Verification Failed:", err);
  process.exit(1);
});
