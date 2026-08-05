/**
 * HR Effective-Date Utilities & Allocation Effective End Policies (DEC-01 & DEC-03)
 * Enforces [startDate, endDate) date-range semantics system-wide:
 * - startDate is inclusive
 * - endDate is exclusive
 * - Active condition: startDate <= at AND (endDate IS NULL OR at < endDate)
 */

export const INFINITY_DATE = new Date("9999-12-31T23:59:59.999Z");

/**
 * Returns Prisma filter object for active record at date `at`.
 */
export function buildEffectiveDateWhere(at: Date = new Date()) {
  return {
    startDate: { lte: at },
    OR: [
      { endDate: null },
      { endDate: { gt: at } },
    ],
  };
}

/**
 * Checks whether an assignment is active at a given date 'at' under [startDate, endDate) rules.
 */
export function isEffectiveAt(
  startDate: Date,
  endDate: Date | null,
  at: Date = new Date()
): boolean {
  const atTime = at.getTime();
  const startTime = startDate.getTime();
  const endTime = endDate ? endDate.getTime() : Infinity;

  return startTime <= atTime && atTime < endTime;
}

export function isCurrentlyEffective(
  startDate: Date | string,
  endDate: Date | string | null,
  at: Date = new Date()
): boolean {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  return start <= at && (end === null || at < end);
}

/**
 * Returns YYYY-MM-DD formatted date string in Asia/Ho_Chi_Minh timezone.
 */
export function getVietnamTodayDateString(at: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(at);
}

/**
 * Validates that endDate is after or equal to startDate.
 */
export function validateEffectiveDateRange(
  startDate: Date,
  endDate: Date | null,
  fieldName = "Ngày kết thúc"
): void {
  if (endDate && endDate < startDate) {
    const formattedStart = startDate.toISOString().split("T")[0];
    throw new Error(`${fieldName} không thể trước ngày bắt đầu (${formattedStart}).`);
  }
}

/**
 * Validates transfer or manager change parameters to ensure no negative range or invalid transition.
 */
export function validateTransferEffectiveDate(
  currentStartDate: Date | null,
  newEffectiveDate: Date
): void {
  if (currentStartDate && newEffectiveDate < currentStartDate) {
    const formattedCurrent = currentStartDate.toISOString().split("T")[0];
    const formattedNew = newEffectiveDate.toISOString().split("T")[0];
    throw new Error(
      `Ngày hiệu lực mới (${formattedNew}) không thể trước ngày bắt đầu phân công hiện tại (${formattedCurrent}).`
    );
  }
}

/**
 * Checks whether two time intervals [start1, end1) and [start2, end2) overlap.
 * Zero-length touch at exact boundary (end1 === start2) does NOT count as overlap.
 */
export function intervalsOverlap(
  start1: Date,
  end1: Date | null,
  start2: Date,
  end2: Date | null
): boolean {
  const tStart1 = start1.getTime();
  const tEnd1 = end1 ? end1.getTime() : Infinity;
  const tStart2 = start2.getTime();
  const tEnd2 = end2 ? end2.getTime() : Infinity;

  return tStart1 < tEnd2 && tStart2 < tEnd1;
}

export interface GetAllocationEffectiveEndParams {
  startDate: Date;
  expectedEndDate?: Date | null;
  endDate?: Date | null;
  referenceAt?: Date;
}

/**
 * Computes allocationEffectiveEnd based on started vs unstarted rules (DEC-01):
 * - If explicit endDate exists: returns endDate.
 * - If started (startDate <= referenceAt): returns endDate ?? Infinity (allocation NOT auto-released after expectedEndDate).
 * - If unstarted (startDate > referenceAt): returns endDate ?? expectedEndDate ?? Infinity.
 */
export function getAllocationEffectiveEnd(params: GetAllocationEffectiveEndParams): Date {
  const { startDate, expectedEndDate, endDate, referenceAt = new Date() } = params;

  if (endDate) {
    return endDate;
  }

  const isStarted = startDate.getTime() <= referenceAt.getTime();

  if (isStarted) {
    return INFINITY_DATE;
  }

  // Unstarted assignment
  return expectedEndDate ?? INFINITY_DATE;
}
