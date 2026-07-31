import {
  formatIsoDateOnly,
  formatVnDate,
  formatVnPeriod,
  getWeekRange,
  normalizeNfc,
  normalizeVietnameseText,
  SAFETY_SHIFT_LABELS,
  SAFETY_WEEKDAY_LABELS,
} from "./date-utils";

export { SAFETY_SHIFT_LABELS, SAFETY_WEEKDAY_LABELS };

export interface SafetyPlanPreviewEntry {
  id: string;
  projectId: string;
  projectName: string;
  inspectionContent: string;
  note: string;
  sortOrder: number;
}

export interface SafetyPlanPreviewShift {
  shiftKey: "MORNING" | "AFTERNOON" | "EVENING";
  shiftLabel: string; // "Sáng:", "Chiều:", "Tối:"
  entries: SafetyPlanPreviewEntry[];
}

export interface SafetyPlanPreviewDay {
  dateIso: string;
  dayName: string; // "Thứ Hai, 20/07/2026"
  dateFormatted: string; // "20/07/2026"
  hasSchedule: boolean;
  totalEntriesCount: number;
  shifts: {
    MORNING: SafetyPlanPreviewShift;
    AFTERNOON: SafetyPlanPreviewShift;
    EVENING: SafetyPlanPreviewShift;
  };
}

export interface SafetyPlanPreviewViewModel {
  internalCode: string; // "KH-ATLD-2026-0003"
  officialDocumentNumber: string | null; // User typed "12/ct2" or null
  displayDocumentNumber: string; // "12/ct2" or "....../......"
  createdDateFormatted: string;
  periodLabel: string;
  authorName: string;
  place: string; // e.g. "Hà Nội"
  recipientName: string; // e.g. "Ban Giám đốc Công ty, Ban chỉ huy các công trình"
  recipientTitle: string; // e.g. "Phòng kỹ thuật, Các BCH công trường"
  days: SafetyPlanPreviewDay[];
}

/**
 * Format day label in Asia/Ho_Chi_Minh timezone: "Thứ Hai, 20/07/2026"
 */
export function formatSafetyDayLabel(dateInput: Date | string): string {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "";

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(d);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || "";

  const weekdayStr = getPart("weekday");
  const day = getPart("day");
  const month = getPart("month");
  const year = getPart("year");

  let vnWeekday = "";
  switch (weekdayStr) {
    case "Monday": vnWeekday = SAFETY_WEEKDAY_LABELS.monday; break;
    case "Tuesday": vnWeekday = SAFETY_WEEKDAY_LABELS.tuesday; break;
    case "Wednesday": vnWeekday = SAFETY_WEEKDAY_LABELS.wednesday; break;
    case "Thursday": vnWeekday = SAFETY_WEEKDAY_LABELS.thursday; break;
    case "Friday": vnWeekday = SAFETY_WEEKDAY_LABELS.friday; break;
    case "Saturday": vnWeekday = SAFETY_WEEKDAY_LABELS.saturday; break;
    case "Sunday": vnWeekday = SAFETY_WEEKDAY_LABELS.sunday; break;
    default: vnWeekday = ""; break;
  }

  return normalizeVietnameseText(`${vnWeekday}, ${day}/${month}/${year}`);
}

/**
 * Format shift label: "Sáng:", "Chiều:", "Tối:"
 */
export function formatSafetyShiftLabel(shiftKey: string): string {
  switch (shiftKey) {
    case "MORNING": return normalizeVietnameseText(SAFETY_SHIFT_LABELS.MORNING);
    case "AFTERNOON": return normalizeVietnameseText(SAFETY_SHIFT_LABELS.AFTERNOON);
    case "EVENING": return normalizeVietnameseText(SAFETY_SHIFT_LABELS.EVENING);
    default: return normalizeVietnameseText(`${shiftKey}:`);
  }
}

/**
 * Builds the canonical 21-shift view model for HTML Preview, Word export, and PDF export.
 */
export function buildSafetyPlanPreviewModel(plan: any): SafetyPlanPreviewViewModel {
  const periodStart = plan.periodStart ? new Date(plan.periodStart) : new Date();
  const { weekStart, weekEnd } = getWeekRange(periodStart);

  const internalCode = normalizeVietnameseText(plan.documentNumber || `KH-ATLD-${new Date().getFullYear()}-0001`);
  
  const rawDocNo = plan.officialDocumentNumber ? String(plan.officialDocumentNumber).trim() : "";
  const officialDocNo = rawDocNo ? normalizeVietnameseText(rawDocNo) : null;
  const displayDocumentNumber = officialDocNo || "......./.......";

  const createdDate = plan.createdDate ? new Date(plan.createdDate) : new Date();
  const createdDateFormatted = formatVnDate(createdDate);
  const periodLabel = normalizeVietnameseText(formatVnPeriod(weekStart, weekEnd));
  const authorName = normalizeVietnameseText(plan.createdBy?.name || "Cán bộ Safety");

  // Parse recipients metadata JSON or legacy arrays safely
  const recipientsRaw = plan.recipients as any;
  let place = "Hà Nội";
  let recipientName = "Ban Giám đốc Công ty, Ban chỉ huy các công trình";
  let recipientTitle = "Phòng kỹ thuật, Các BCH công trường";

  if (recipientsRaw && typeof recipientsRaw === "object" && !Array.isArray(recipientsRaw)) {
    if (recipientsRaw.place) place = recipientsRaw.place;
    if (recipientsRaw.recipientName) recipientName = recipientsRaw.recipientName;
    if (recipientsRaw.recipientTitle) recipientTitle = recipientsRaw.recipientTitle;
  } else if (Array.isArray(recipientsRaw) && recipientsRaw.length > 0) {
    recipientName = recipientsRaw.join(", ");
  }

  place = normalizeVietnameseText(place);
  recipientName = normalizeVietnameseText(recipientName);
  recipientTitle = normalizeVietnameseText(recipientTitle);

  // 7 days Monday to Sunday
  const days: SafetyPlanPreviewDay[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const dateIso = formatIsoDateOnly(d);
    const dayName = formatSafetyDayLabel(d); // "Thứ Hai, 20/07/2026"
    const dateFormatted = formatVnDate(d);

    return {
      dateIso,
      dayName,
      dateFormatted,
      hasSchedule: false,
      totalEntriesCount: 0,
      shifts: {
        MORNING: { shiftKey: "MORNING", shiftLabel: formatSafetyShiftLabel("MORNING"), entries: [] },
        AFTERNOON: { shiftKey: "AFTERNOON", shiftLabel: formatSafetyShiftLabel("AFTERNOON"), entries: [] },
        EVENING: { shiftKey: "EVENING", shiftLabel: formatSafetyShiftLabel("EVENING"), entries: [] },
      },
    };
  });

  const dayMap = new Map<string, SafetyPlanPreviewDay>();
  days.forEach((day) => dayMap.set(day.dateIso, day));

  const rawEntries = plan.entries || [];
  rawEntries.forEach((e: any, idx: number) => {
    const d = new Date(e.inspectionDate);
    const dIso = formatIsoDateOnly(d);
    const targetDay = dayMap.get(dIso);
    if (!targetDay) return;

    const shiftKey = (e.shift as "MORNING" | "AFTERNOON" | "EVENING") || "MORNING";
    const projectName = e.location || e.projectNameSnapshot || "Công trình";

    targetDay.shifts[shiftKey].entries.push({
      id: e.id || `entry-${idx}`,
      projectId: e.projectId || "",
      projectName: normalizeNfc(projectName),
      inspectionContent: normalizeNfc(e.inspectionContent || ""),
      note: normalizeNfc(e.note || ""),
      sortOrder: e.sortOrder ?? idx,
    });
  });

  // Sort entries inside each shift by sortOrder & compute total entries / hasSchedule
  days.forEach((day) => {
    let count = 0;
    (["MORNING", "AFTERNOON", "EVENING"] as const).forEach((sKey) => {
      day.shifts[sKey].entries.sort((a, b) => a.sortOrder - b.sortOrder);
      count += day.shifts[sKey].entries.length;
    });
    day.totalEntriesCount = count;
    day.hasSchedule = count > 0;
  });

  return {
    internalCode,
    officialDocumentNumber: officialDocNo,
    displayDocumentNumber,
    createdDateFormatted,
    periodLabel,
    authorName,
    place,
    recipientName,
    recipientTitle,
    days,
  };
}

export const buildSafetyPlanDocumentDTO = buildSafetyPlanPreviewModel;
