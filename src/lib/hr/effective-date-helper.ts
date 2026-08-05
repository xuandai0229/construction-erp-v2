/**
 * HR Effective-Date Utilities and Date Range Helpers
 * Enforces [startDate, endDate) date-range semantics system-wide:
 * - startDate is inclusive (effective starting at startDate)
 * - endDate is exclusive (NO LONGER effective starting at endDate)
 * - Active condition at time `at`: startDate <= at AND (endDate IS NULL OR at < endDate)
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
 * Returns YYYY-MM-DD formatted date string in Asia/Ho_Chi_Minh timezone
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
 * Validates that endDate is after or equal to startDate, and throws Error if invalid range.
 */
export function validateEffectiveDateRange(
  startDate: Date,
  endDate: Date | null,
  fieldName = "Ngày kết thúc"
): void {
  if (endDate && endDate < startDate) {
    throw new Error(`${fieldName} không thể trước ngày bắt đầu (${startDate.toISOString().split("T")[0]}).`);
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
    throw new Error(
      `Ngày hiệu lực mới (${newEffectiveDate.toISOString().split("T")[0]}) không thể trước ngày bắt đầu phân công hiện tại (${currentStartDate.toISOString().split("T")[0]}).`
    );
  }
}
