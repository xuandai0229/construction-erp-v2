/**
 * Vietnam Date-Only Helper (DEC-03)
 * Standardizes date parsing and formatting for Vietnam timezone (Asia/Ho_Chi_Minh).
 * Strictly requires YYYY-MM-DD ISO date-only format and rejects non-existent calendar dates.
 */

const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Validates whether a string is a valid ISO YYYY-MM-DD date that exists on the calendar.
 */
export function isValidVietnamDateString(value: string): boolean {
  if (typeof value !== "string" || !DATE_REGEX.test(value)) {
    return false;
  }

  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // Check JavaScript Date constructor bounds
  const testDate = new Date(year, month - 1, day);
  return (
    testDate.getFullYear() === year &&
    testDate.getMonth() === month - 1 &&
    testDate.getDate() === day
  );
}

/**
 * Parses an ISO YYYY-MM-DD string to a Date object set at 00:00:00 Asia/Ho_Chi_Minh timezone.
 */
export function parseVietnamDateOnly(value: string): Date {
  if (!isValidVietnamDateString(value)) {
    throw new Error(
      `Ngày '${value}' không hợp lệ. Ngày phải theo định dạng ISO YYYY-MM-DD và phải là ngày có thực trên lịch.`
    );
  }

  const [yearStr, monthStr, dayStr] = value.split("-");
  // Construct UTC date matching 00:00:00 UTC for consistent storage
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  const date = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  return date;
}

/**
 * Formats a Date object to YYYY-MM-DD string in Asia/Ho_Chi_Minh timezone.
 */
export function formatVietnamDateOnly(value: Date): string {
  if (!(value instanceof Date) || isNaN(value.getTime())) {
    throw new Error("Invalid Date instance passed to formatVietnamDateOnly");
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(value);
}
