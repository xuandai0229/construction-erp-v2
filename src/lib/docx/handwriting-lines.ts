import * as docx from "docx";

/**
 * Central configuration object for handwriting line counts across report templates.
 * Enforces business rules: 3 to 4 lines per empty section based on field importance.
 */
export const HANDWRITING_LINE_CONFIG = {
  // Section II: Đánh giá kết quả, xử lý tồn tại của tuần trước (Supervision Next Week Plan)
  previousWeekFollowUp: 4,          // 1. Theo dõi khắc phục các yêu cầu còn tồn đọng -> 4 lines
  verificationAfterCorrection: 3,   // 2. Kiểm tra lại sau khắc phục -> 3 lines

  // Section III: Kiến nghị, đề xuất Ban Giám đốc (Supervision Next Week Plan)
  manpowerAndEquipment: 4,          // 1. Bổ sung nhân lực, thiết bị... -> 4 lines
  progressDirection: 4,             // 2. Chỉ đạo tiến độ các đội chưa đạt... -> 4 lines
  technicalMaterialIssues: 3,       // 3. Xử lý phát sinh kỹ thuật, vật liệu -> 3 lines
  otherComments: 4,                 // 4. Ý kiến khác -> 4 lines

  // Default fallback for narrative sections
  defaultNarrative: 3,
};

export interface WordWritingLinesOptions {
  count?: number;
  width?: number;
  rowHeightDxa?: number;
  borderColor?: string;
}

/**
 * Creates a specialized 1-column DOCX Table for handwriting lines (`WordWritingLines`).
 * Each row has only a bottom dotted border, with exact height ~7-8mm.
 * NO dot strings ("........"), NO tab leaders, NO empty paragraphs with huge spacing.
 */
export function createWordWritingLinesTable(options?: WordWritingLinesOptions): docx.Table {
  const count = options?.count ?? HANDWRITING_LINE_CONFIG.defaultNarrative;
  const width = options?.width ?? 9922;
  const rowHeight = options?.rowHeightDxa ?? 420;
  const borderColor = options?.borderColor ?? "94A3B8";

  const rows = Array.from({ length: count }, () => {
    return new docx.TableRow({
      cantSplit: true,
      height: { value: rowHeight, rule: docx.HeightRule.ATLEAST },
      children: [
        new docx.TableCell({
          width: { size: width, type: docx.WidthType.DXA },
          margins: { top: 40, bottom: 40, left: 60, right: 60 },
          borders: {
            top: { style: docx.BorderStyle.NONE, size: 0, color: "auto" },
            left: { style: docx.BorderStyle.NONE, size: 0, color: "auto" },
            right: { style: docx.BorderStyle.NONE, size: 0, color: "auto" },
            bottom: { style: docx.BorderStyle.DOTTED, size: 8, color: borderColor },
          },
          children: [
            new docx.Paragraph({
              children: [
                new docx.TextRun({
                  text: "",
                  font: "Times New Roman",
                  size: 22,
                  language: { value: "vi-VN" },
                }),
              ],
              spacing: { before: 0, after: 0, line: 240 },
            }),
          ],
          verticalAlign: docx.VerticalAlign.BOTTOM,
        }),
      ],
    });
  });

  return new docx.Table({
    rows,
    width: { size: width, type: docx.WidthType.DXA },
    layout: docx.TableLayoutType.FIXED,
    borders: docx.TableBorders.NONE,
  });
}

/**
 * Backwards compatibility helper for safety assessment docx generator
 */
export function createWordHandwritingLines(options?: {
  count?: number;
  leftIndent?: number;
  rightPosition?: number;
}): docx.Paragraph[] {
  const count = options?.count ?? HANDWRITING_LINE_CONFIG.defaultNarrative;
  const leftIndent = options?.leftIndent ?? 567;
  const rightPosition = options?.rightPosition ?? 9922;

  return Array.from({ length: count }, () => {
    return new docx.Paragraph({
      indent: { left: leftIndent },
      border: {
        bottom: {
          style: docx.BorderStyle.DOTTED,
          size: 8,
          color: "94A3B8",
          space: 1,
        },
      },
      tabStops: [
        {
          type: docx.TabStopType.RIGHT,
          position: rightPosition,
        },
      ],
      spacing: { before: 140, after: 140 },
    });
  });
}
