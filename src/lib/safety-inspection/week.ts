import { SAFETY_TIME_ZONE } from "./types";

const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function assertBusinessDate(value: string): void {
  if (!BUSINESS_DATE_PATTERN.test(value)) {
    throw new Error("Ngày nghiệp vụ không hợp lệ.");
  }
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error("Ngày nghiệp vụ không hợp lệ.");
  }
}

function addBusinessDays(value: string, amount: number): string {
  assertBusinessDate(value);
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return date.toISOString().slice(0, 10);
}

export function getSafetyBusinessDate(timestamp: Date): string {
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error("Thời điểm không hợp lệ.");
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SAFETY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(timestamp);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

export function getSafetyWeekRange(
  reference: string | Date,
): { weekStart: string; weekEnd: string } {
  const businessDate =
    reference instanceof Date ? getSafetyBusinessDate(reference) : reference;
  assertBusinessDate(businessDate);
  const [year, month, day] = businessDate.split("-").map(Number);
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = addBusinessDays(businessDate, -daysFromMonday);
  return { weekStart, weekEnd: addBusinessDays(weekStart, 6) };
}

export type SafetyWeekInput = {
  weekStart: string;
  weekEnd: string;
  isException: boolean;
  exceptionReason: string | null;
};

export function validateSafetyWeek(input: SafetyWeekInput): void {
  assertBusinessDate(input.weekStart);
  assertBusinessDate(input.weekEnd);
  if (input.weekEnd < input.weekStart) {
    throw new Error("Ngày kết thúc tuần không được trước ngày bắt đầu.");
  }
  const standard = getSafetyWeekRange(input.weekStart);
  const isStandard =
    standard.weekStart === input.weekStart && standard.weekEnd === input.weekEnd;
  if (!isStandard && !input.isException) {
    throw new Error("Khoảng thời gian phải từ Thứ Hai đến Chủ nhật.");
  }
  if (input.isException && !input.exceptionReason?.trim()) {
    throw new Error("Tuần ngoại lệ phải có lý do.");
  }
}

export function isScheduleDateAllowed(
  input: SafetyWeekInput & { scheduleDate: string },
): boolean {
  assertBusinessDate(input.scheduleDate);
  const inside =
    input.scheduleDate >= input.weekStart && input.scheduleDate <= input.weekEnd;
  return inside || Boolean(input.isException && input.exceptionReason?.trim());
}
