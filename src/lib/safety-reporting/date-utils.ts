/**
 * Robust date utilities and Vietnamese text constants for Safety Reporting (Asia/Ho_Chi_Minh timezone)
 */

export const SAFETY_WEEKDAY_LABELS = {
  monday: "Thứ Hai",
  tuesday: "Thứ Ba",
  wednesday: "Thứ Tư",
  thursday: "Thứ Năm",
  friday: "Thứ Sáu",
  saturday: "Thứ Bảy",
  sunday: "Chủ Nhật",
} as const;

export const SAFETY_SHIFT_LABELS = {
  MORNING: "Sáng:",
  AFTERNOON: "Chiều:",
  EVENING: "Tối:",
} as const;

/**
 * Centralized typography config for official Vietnamese administrative documents.
 * All Preview HTML, Print CSS, DOCX TextRun, and PDF generation MUST reference this
 * to guarantee uniform font rendering across all outputs.
 *
 * CRITICAL: Do NOT use Tailwind's `font-serif` class (which resolves to
 * `ui-serif, Georgia, Cambria, "Times New Roman", Times, serif`) because the
 * `ui-serif` / `Georgia` / `Cambria` fallback fonts on many Linux/CI systems
 * render Vietnamese combining diacritics incorrectly in bold weight, causing
 * "Chiều:" → "Chiề u:" and "Tối:" → "Tố i:" visual bugs.
 */
export const SAFETY_DOCUMENT_TYPOGRAPHY = {
  /** CSS font-family value — use in inline style or CSS rules */
  fontFamily: '"Times New Roman", Times, serif',
  /** DOCX/OOXML font name for w:rFonts */
  fontName: "Times New Roman",
  /** BCP 47 language tag for DOCX w:lang and HTML lang attribute */
  language: "vi-VN",
} as const;

/**
 * Normalizes Vietnamese text into canonical Unicode NFC form without altering deliberate line breaks or spacing.
 */
export function normalizeVietnameseText(value: string | null | undefined): string {
  if (!value) return "";
  return value.normalize("NFC");
}

export const normalizeNfc = normalizeVietnameseText;

/**
 * Detects broken Vietnamese encoding, replacement characters (), mojibake patterns (e.g. UTF-8 misdecoded as Win-1252),
 * or suspicious whitespace insertions inside Vietnamese words (e.g. "Chiề u", "Tố i").
 */
export function hasBrokenVietnameseText(value: string | null | undefined): boolean {
  if (!value) return false;
  const str = String(value);

  // 1. Replacement character \uFFFD or question mark replacement inside Vietnamese words
  if (str.includes("\uFFFD") || /Chi\?u|T\?i|Th\?|Ch\?/i.test(str)) return true;

  // 2. Mojibake strings (e.g. UTF-8 misdecoded as Win-1252)
  if (str.includes("Thá»©") || str.includes("\u00EF\u00BF\u00BD")) return true;

  // 3. Suspicious whitespace splitting inside accented words (e.g., "Chiề u", "Tố i", "Thứ T ư")
  const brokenSplitRegex = /(?:Chiề\s+u|Tố\s+i|Thứ\s+T\s+ư|Ch\s+iều|T\s+ối|Chủ\s+Nhậ\s+t|Công\s+trìn\s+h|Kiể\s+m\s+tra)/i;
  if (brokenSplitRegex.test(str)) return true;

  return false;
}

export function getWeekRange(dateInput: string | Date = new Date()) {
  let year: number;
  let month: number;
  let date: number;

  if (typeof dateInput === "string") {
    const datePart = dateInput.split("T")[0];
    const parts = datePart.split("-");
    if (parts.length === 3) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      date = parseInt(parts[2], 10);
    } else {
      const parsed = new Date(dateInput);
      year = parsed.getFullYear();
      month = parsed.getMonth();
      date = parsed.getDate();
    }
  } else {
    year = dateInput.getFullYear();
    month = dateInput.getMonth();
    date = dateInput.getDate();
  }

  // Noon local time to avoid timezone boundary shifts
  const target = new Date(year, month, date, 12, 0, 0, 0);
  const day = target.getDay(); // 0 is Sun, 1 is Mon, ..., 6 is Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(target);
  monday.setDate(target.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { weekStart: monday, weekEnd: sunday };
}

export function formatIsoDateOnly(dateInput: string | Date): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatVnDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "…";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return "…";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatVnLongDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "ngày… tháng… năm 2026";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return "ngày… tháng… năm 2026";
  return `ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
}

export function formatVnPeriod(startInput: string | Date, endInput: string | Date): string {
  const start = typeof startInput === "string" ? new Date(startInput) : startInput;
  const end = typeof endInput === "string" ? new Date(endInput) : endInput;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "…";
  return `từ ngày ${start.getDate()}/${start.getMonth() + 1} đến ngày ${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`;
}
