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

export function buildSupervisionExportFilename({
  reportNumber,
  weekStart,
  documentType,
  extension,
}: {
  reportNumber?: string | null;
  weekStart?: string | null;
  documentType: WeeklyDocumentType;
  extension: "pdf" | "docx";
}): string {
  let code = (reportNumber || "").trim();

  // If report number is missing or contains internal fallback prefix, construct a clean display code
  if (!code || /^bcgs-w[a-z0-9]+/i.test(code)) {
    if (weekStart) {
      const d = new Date(weekStart);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const target = new Date(d.valueOf());
        const dayNr = (d.getDay() + 6) % 7;
        target.setDate(target.getDate() - dayNr + 3);
        const firstThursday = target.valueOf();
        target.setMonth(0, 1);
        if (target.getDay() !== 4) {
          target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
        }
        const weekNum = 1 + Math.round((firstThursday - target.valueOf()) / 604800000);
        code = `BCGS-${year}-W${weekNum.toString().padStart(2, "0")}`;
      }
    }
    if (!code || /^bcgs-w[a-z0-9]+/i.test(code)) {
      code = "BCGS-2026-W01";
    }
  }

  const cleanCode = sanitizeFilenameToken(code);
  const docLabel = documentType === "RESULT" ? "Ket-qua" : "Ke-hoach-tuan-sau";
  return `Bao-cao-giam-sat-tuan_${cleanCode}_${docLabel}.${extension}`;
}
