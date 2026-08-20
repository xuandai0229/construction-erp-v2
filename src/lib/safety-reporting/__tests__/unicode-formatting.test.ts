import { describe, it, expect } from "vitest";
import {
  SAFETY_SHIFT_LABELS,
  hasBrokenVietnameseText,
} from "../date-utils";
import {
  buildSafetyPlanPreviewModel,
} from "../plan-view-model";
import { renderSafetyPlanStandaloneHtml } from "../html-renderer";
import { SafetyDocxGenerator } from "../docx-generator";
import { SafetyPdfConverter } from "../pdf-converter";
import zlib from "node:zlib";

function extractWordDocumentXml(docxBuffer: Buffer): string {
  let offset = 0;
  while (offset < docxBuffer.length - 30) {
    if (docxBuffer.readUInt32LE(offset) === 0x04034b50) {
      const method = docxBuffer.readUInt16LE(offset + 8);
      const compSize = docxBuffer.readUInt32LE(offset + 18);
      const fileNameLen = docxBuffer.readUInt16LE(offset + 26);
      const extraLen = docxBuffer.readUInt16LE(offset + 28);
      const fileName = docxBuffer.toString("utf8", offset + 30, offset + 30 + fileNameLen);
      const dataOffset = offset + 30 + fileNameLen + extraLen;

      if (fileName === "word/document.xml") {
        const compressedData = docxBuffer.subarray(dataOffset, dataOffset + compSize);
        if (method === 8) {
          return zlib.inflateRawSync(compressedData).toString("utf8");
        } else if (method === 0) {
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

describe("Safety Reporting Vietnamese Text & Unicode Integrity", () => {
  const mandatoryStrings = [
    SAFETY_SHIFT_LABELS.MORNING,
    SAFETY_SHIFT_LABELS.AFTERNOON,
    SAFETY_SHIFT_LABELS.EVENING,
    "Thứ Tư, 29/07/2026",
    "Chủ Nhật, 02/08/2026",
    "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
    "Độc lập - Tự do - Hạnh phúc",
    "KẾ HOẠCH KIỂM TRA ATLĐ, PCCC, VSMT CÔNG TRÌNH",
    "NỘI DUNG KIỂM TRA, HUẤN LUYỆN",
    "PHÁT SINH THAY ĐỔI",
  ];

  it("should ensure all mandatory strings equal their NFC normalized form", () => {
    mandatoryStrings.forEach((str) => {
      expect(str, `String failed NFC check: ${str}`).toBe(str.normalize("NFC"));
      expect(hasBrokenVietnameseText(str), `String failed broken check: "${str}"`).toBe(false);
    });
  });

  it("should detect broken Vietnamese strings and mojibake", () => {
    expect(hasBrokenVietnameseText("Chiề u:")).toBe(true);
    expect(hasBrokenVietnameseText("Tố i:")).toBe(true);
    expect(hasBrokenVietnameseText("Chi?u:")).toBe(true);
    expect(hasBrokenVietnameseText("Thá»© Hai")).toBe(true);
  });

  it("should build canonical preview model with 100% NFC normalized Vietnamese day & shift labels", () => {
    const mockPlan = {
      id: "unicode-test-plan",
      documentNumber: "KH-ATLD-2026-0001",
      officialDocumentNumber: "12/ct2",
      periodStart: "2026-07-27T00:00:00.000Z",
      createdDate: "2026-07-27T08:00:00.000Z",
      createdBy: { name: "Nguyễn Văn Kiểm Trực" },
      entries: [
        {
          id: "entry-1",
          inspectionDate: "2026-07-29T00:00:00.000Z", // Wednesday
          shift: "AFTERNOON",
          location: "Nhà văn phòng điều hành 5 tầng – Khu công nghiệp Từ Hiệp",
          inspectionContent: "Kiểm tra hệ thống điện thi công, tủ điện, dây dẫn, biển cảnh báo và trang thiết bị bảo hộ lao động.",
          note: "Điều chỉnh thời gian huấn luyện cho công nhân vào buổi chiều.",
          sortOrder: 1,
        },
      ],
    };

    const model = buildSafetyPlanPreviewModel(mockPlan);
    expect(model.days.length).toBe(7);

    // Wednesday
    const wed = model.days[2];
    expect(wed.dayName).toBe("Thứ Tư, 29/07/2026");
    expect(wed.shifts.AFTERNOON.shiftLabel).toBe("Chiều:");
    expect(wed.shifts.AFTERNOON.entries[0].note).toBe(
      "Điều chỉnh thời gian huấn luyện cho công nhân vào buổi chiều.".normalize("NFC")
    );
  });

  it("should generate HTML preview with complete Vietnamese words and 0% broken spaces", () => {
    const mockPlan = {
      id: "unicode-test-plan-html",
      periodStart: "2026-07-27T00:00:00.000Z",
      entries: [],
    };
    const model = buildSafetyPlanPreviewModel(mockPlan);
    const html = renderSafetyPlanStandaloneHtml(model);

    expect(html).toContain("<strong>Thứ Hai, 27/07/2026</strong>");
    expect(html).toContain("<strong>Sáng:</strong>");
    expect(html).toContain("<strong>Chiều:</strong>");
    expect(html).toContain("<strong>Tối:</strong>");

    expect(html.includes("Chiề u:")).toBe(false);
    expect(html.includes("Tố i:")).toBe(false);
    expect(html.includes("Ch iều:")).toBe(false);
  });

  it("should generate DOCX buffer where word/document.xml contains contiguous NFC text runs for Sáng, Chiều, Tối", async () => {
    const mockPlan = {
      id: "unicode-test-docx",
      periodStart: "2026-07-27T00:00:00.000Z",
      entries: [
        {
          id: "entry-1",
          inspectionDate: "2026-07-27T00:00:00.000Z",
          shift: "AFTERNOON",
          location: "Công trình A",
          inspectionContent: "Nội dung kiểm tra",
          note: "Ghi chú",
        },
      ],
    };

    const docxBuffer = await SafetyDocxGenerator.generatePlanDocx(mockPlan);
    const docXml = extractWordDocumentXml(docxBuffer);

    expect(docXml).toContain("Sáng:");
    expect(docXml).toContain("Chiều:");
    expect(docXml).toContain("Tối:");

    expect(docXml.includes("Chiề u")).toBe(false);
    expect(docXml.includes("Tố i")).toBe(false);
  });

  it("should generate valid PDF buffer starting with %PDF", async () => {
    const mockPlan = {
      id: "unicode-test-pdf",
      periodStart: "2026-07-27T00:00:00.000Z",
      entries: [],
    };
    const pdfBuffer = await SafetyPdfConverter.generatePlanPdf(mockPlan);
    expect(pdfBuffer.slice(0, 4).toString("ascii")).toBe("%PDF");
  }, 30000);
});
