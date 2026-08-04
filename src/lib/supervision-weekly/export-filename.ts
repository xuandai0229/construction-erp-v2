import type { WeeklyDocumentType } from "./editor-types";

export function sanitizeFilenameToken(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function formatDateToken(dateStr?: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr.replace(/[^0-9-]/g, "-");
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export function buildSupervisionExportFilename({
  reportNumber,
  weekStart,
  weekEnd,
  nextWeekStart,
  nextWeekEnd,
  documentType,
  extension,
}: {
  reportNumber?: string | null;
  weekStart?: string | null;
  weekEnd?: string | null;
  nextWeekStart?: string | null;
  nextWeekEnd?: string | null;
  documentType: WeeklyDocumentType;
  extension: "pdf" | "docx";
}): string {
  const docPrefix = documentType === "RESULT" ? "Bao-cao-ket-qua-tuan" : "Ke-hoach-kiem-tra-tuan-sau";

  let sStart = weekStart;
  let sEnd = weekEnd;

  if (documentType === "NEXT_WEEK_PLAN") {
    if (nextWeekStart && nextWeekEnd) {
      sStart = nextWeekStart;
      sEnd = nextWeekEnd;
    } else if (weekStart) {
      const parseLocal = (str: string) => {
        const [y, m, d] = str.split("T")[0].split("-").map(Number);
        return new Date(y, m - 1, d);
      };
      const dStart = parseLocal(weekStart);
      dStart.setDate(dStart.getDate() + 7);
      
      const yStart = dStart.getFullYear();
      const mStart = (dStart.getMonth() + 1).toString().padStart(2, "0");
      const dayStart = dStart.getDate().toString().padStart(2, "0");
      sStart = `${yStart}-${mStart}-${dayStart}`;

      if (weekEnd) {
        const dEnd = parseLocal(weekEnd);
        dEnd.setDate(dEnd.getDate() + 7);
        const yEnd = dEnd.getFullYear();
        const mEnd = (dEnd.getMonth() + 1).toString().padStart(2, "0");
        const dayEnd = dEnd.getDate().toString().padStart(2, "0");
        sEnd = `${yEnd}-${mEnd}-${dayEnd}`;
      }
    }
  }

  const startToken = formatDateToken(sStart);
  const endToken = formatDateToken(sEnd);

  if (startToken && endToken) {
    return `${docPrefix}_${startToken}_${endToken}.${extension}`;
  }

  let code = (reportNumber || "").trim();
  if (!code || /^bcgs-w[a-z0-9]+/i.test(code)) {
    code = "2026";
  }

  const cleanCode = sanitizeFilenameToken(code);
  return `${docPrefix}_${cleanCode}.${extension}`;
}
