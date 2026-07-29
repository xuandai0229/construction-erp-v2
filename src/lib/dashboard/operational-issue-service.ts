import type { SiteReportStatus } from "@prisma/client";

export type OperationalIssueSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NORMAL";

export interface OperationalIssueInput {
  issues?: string | null;
  recommendations?: string | null; // Cần Ban Giám Đốc / BĐH xử lý
  qualityNote?: string | null;
  laborNote?: string | null;
  materialsNote?: string | null;
  safetyStatus?: string | null; // e.g. "RISK" | "ACCIDENT" | "SAFE"
  daysRemaining?: number | null; // timeline remaining
  actualProgressPercent?: number | null;
  plannedProgressPercent?: number | null; // planned progress
  isResolved?: boolean;
  status?: SiteReportStatus | string;
}

export interface OperationalIssueState {
  hasIssue: boolean;
  severity: OperationalIssueSeverity;
  reasonCodes: string[];
  isResolved: boolean;
  displayLabel: string;
}

/**
 * Derives operational issue state based purely on structured domain data
 * without relying on administrative approval status (APPROVED/SUBMITTED/DRAFT/etc.).
 */
export function deriveOperationalIssueState(input: OperationalIssueInput): OperationalIssueState {
  const reasons: string[] = [];
  let severity: OperationalIssueSeverity = "NORMAL";

  const rawIssues = (input.issues ?? "").trim();
  const rawSupport = (input.recommendations ?? "").trim();
  const rawQuality = (input.qualityNote ?? "").trim();
  const rawSafety = (input.safetyStatus ?? "").trim().toUpperCase();

  const isMeaningfulText = (str: string) => {
    if (!str) return false;
    const lower = str.toLowerCase();
    return (
      lower.length > 0 &&
      !lower.startsWith("không") &&
      !lower.startsWith("khong") &&
      !lower.startsWith("bình thường") &&
      !lower.startsWith("binh thuong")
    );
  };

  // 1. Safety Accidents / Critical Incidents
  if (rawSafety === "RISK" || rawSafety === "ACCIDENT" || lowerContains(rawIssues, ["tai nạn", "sạt lở", "sập", "cháy", "nguy hiểm"])) {
    severity = "CRITICAL";
    reasons.push("Sự cố an toàn lao động");
  }

  // 2. Urgent Executive Support Requested
  if (isMeaningfulText(rawSupport)) {
    if (severity !== "CRITICAL") severity = "HIGH";
    reasons.push("Cần Ban Giám đốc / Phòng ban xử lý");
  }

  // 3. Technical Issues / Site Obstacles
  if (isMeaningfulText(rawIssues)) {
    if (severity !== "CRITICAL") severity = "HIGH";
    reasons.push("Vướng mắc / Sự cố hiện trường");
  }

  // 4. Quality Defects
  if (isMeaningfulText(rawQuality) && lowerContains(rawQuality, ["lỗi", "nứt", "sự cố", "không đạt", "từ chối nghiệm thu"])) {
    if (severity !== "CRITICAL") severity = "HIGH";
    reasons.push("Vấn đề chất lượng công trình");
  }

  // 5. Schedule Delay Calculation (Variance)
  if (input.daysRemaining !== null && input.daysRemaining !== undefined && input.daysRemaining < 0) {
    if (severity !== "CRITICAL") severity = "HIGH";
    reasons.push(`Trễ tiến độ (${Math.abs(input.daysRemaining)} ngày)`);
  } else if (
    input.plannedProgressPercent !== null &&
    input.plannedProgressPercent !== undefined &&
    input.actualProgressPercent !== null &&
    input.actualProgressPercent !== undefined
  ) {
    const variance = input.actualProgressPercent - input.plannedProgressPercent;
    if (variance < -15) {
      if (severity !== "CRITICAL") severity = "HIGH";
      reasons.push(`Chậm tiến độ nặng (${variance.toFixed(1)}%)`);
    } else if (variance < -5) {
      if ((severity as string) === "NORMAL" || (severity as string) === "LOW") severity = "MEDIUM";
      reasons.push(`Chậm tiến độ nhẹ (${variance.toFixed(1)}%)`);
    }
  }

  const hasIssue = reasons.length > 0;
  const isResolved = input.isResolved ?? false;

  let displayLabel = "Bình thường";
  if (hasIssue) {
    if (severity === "CRITICAL") displayLabel = "Khẩn cấp";
    else if (severity === "HIGH") displayLabel = "Cần xử lý";
    else if (severity === "MEDIUM") displayLabel = "Có phát sinh";
    else displayLabel = "Có chú ý";
  }

  return {
    hasIssue,
    severity: hasIssue ? severity : "NORMAL",
    reasonCodes: reasons,
    isResolved,
    displayLabel,
  };
}

function lowerContains(str: string, keywords: string[]): boolean {
  const lower = str.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}
