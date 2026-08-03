import * as docx from "docx";

/**
 * Central configuration object for handwriting line counts across report templates.
 * Enforces business rules: 3 to 4 lines per empty section based on field importance.
 * Hardcoded line counts scattered across individual templates are strictly prohibited.
 */
export const HANDWRITING_LINE_CONFIG = {
  // Section II: Đánh giá kết quả, xử lý tồn tại của tuần trước (Supervision Next Week Plan)
  previousWeekFollowUp: 4,          // 1. Theo dõi khắc phục các yêu cầu còn tồn đọng -> 4 lines
  verificationAfterCorrection: 3,   // 2. Kiểm tra lại sau khắc phục -> 3 lines

  // Section III: Kiến nghị, đề xuất Ban Giám đốc (Supervision Next Week Plan)
  manpowerAndEquipment: 4,          // 1. Bổ sung nhân lực, thiết bị... -> 4 lines
  progressDirection: 4,             // 2. Chỉ đạo tiến độ các đội chưa đạt... -> 4 lines
  technicalMaterialIssues: 3,       // 3. Xử lý phát sinh kỹ thuật, vật liệu -> 3 lines
  otherComments: 3,                 // 4. Ý kiến khác -> 3 lines

  // Default fallback for narrative sections in other reporting modules
  defaultNarrative: 3,
};

export interface HandwritingLinesOptions {
  /**
   * Number of handwriting lines to render (default: 3)
   */
  count?: number;
  /**
   * Left indent in twips/DXA (default: 567 = 1cm)
   */
  leftIndent?: number;
  /**
   * Right position in twips/DXA for tab leader mode (default: 9922 DXA for A4 page width)
   */
  rightPosition?: number;
  /**
   * Spacing before first line (default: 100 DXA = 5pt)
   */
  spacingBefore?: number;
  /**
   * Spacing after each line (default: 60 DXA = 3pt)
   */
  spacingAfter?: number;
  /**
   * Font size in half-points (default: 26 = 13pt)
   */
  fontSize?: number;
  /**
   * Mode: 'tab_stop' (uses tab leader dot) or 'bottom_border' (uses paragraph bottom dotted border)
   */
  mode?: "tab_stop" | "bottom_border";
}

/**
 * Creates clean, professional handwriting lines for DOCX exports when fields are empty.
 * Uses structured DOCX tab stops with dot leaders or paragraph bottom dotted borders.
 * NEVER outputs raw manual dot strings ("...........") or placeholder text ("Chưa có ghi nhận").
 */
export function createWordHandwritingLines(options?: HandwritingLinesOptions): docx.Paragraph[] {
  const count = options?.count ?? HANDWRITING_LINE_CONFIG.defaultNarrative;
  const leftIndent = options?.leftIndent ?? 567;
  const rightPosition = options?.rightPosition ?? 9922;
  const spacingBefore = options?.spacingBefore ?? 100;
  const spacingAfter = options?.spacingAfter ?? 60;
  const fontSize = options?.fontSize ?? 26;
  const mode = options?.mode ?? "tab_stop";

  return Array.from({ length: count }, (_, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === count - 1;

    if (mode === "bottom_border") {
      return new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: "",
            font: "Times New Roman",
            size: fontSize,
          }),
        ],
        indent: { left: leftIndent },
        spacing: {
          before: isFirst ? spacingBefore : Math.floor(spacingBefore / 2),
          after: spacingAfter,
          line: 240,
        },
        border: {
          bottom: {
            color: "888888",
            space: 1,
            style: docx.BorderStyle.DOTTED,
            size: 12,
          },
        },
        keepNext: !isLast,
      });
    }

    // Default tab_stop mode with LeaderType.DOT
    return new docx.Paragraph({
      spacing: {
        before: isFirst ? spacingBefore : Math.floor(spacingBefore / 2),
        after: spacingAfter,
        line: 280,
        lineRule: docx.LineRuleType.AUTO,
      },
      indent: { left: leftIndent },
      tabStops: [
        {
          type: docx.TabStopType.RIGHT,
          position: rightPosition,
          leader: docx.LeaderType.DOT,
        },
      ],
      children: [
        new docx.TextRun({
          text: "\t",
          font: "Times New Roman",
          size: fontSize,
        }),
      ],
      keepNext: !isLast,
    });
  });
}
