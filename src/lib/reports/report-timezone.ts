export const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type Ymd = {
  year: number;
  month: number;
  day: number;
};

export type VietnamIsoWeekInfo = {
  weekNumber: number;
  weekStartDate: string;
  weekEndDate: string;
  label: string;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function ymdToString(value: Ymd): string {
  return `${value.year}-${pad2(value.month)}-${pad2(value.day)}`;
}

function parseYmd(value: string): Ymd {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error(`Ngày không hợp lệ: ${value}`);
  }
  return { year, month, day };
}

function ymdToUtcDate(value: Ymd): Date {
  return new Date(Date.UTC(value.year, value.month - 1, value.day));
}

function utcDateToYmd(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

export function getVietnamDateString(date: Date | string | number): string {
  const d = new Date(date);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VIETNAM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

export function getVietnamTimeString(date: Date | string | number): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: VIETNAM_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export function vietnamDateTimeToUtc(date: string, time: string = "00:00"): Date {
  const normalizedTime = time.length === 5 ? `${time}:00.000` : time;
  return new Date(`${date}T${normalizedTime}+07:00`);
}

export function vietnamStartOfDayUtc(date: string): Date {
  return vietnamDateTimeToUtc(date, "00:00:00.000");
}

export function vietnamEndOfDayUtc(date: string): Date {
  return vietnamDateTimeToUtc(date, "23:59:59.999");
}

function getIsoWeekNumberFromYmd(dateString: string): number {
  const value = parseYmd(dateString);
  const date = ymdToUtcDate(value);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / ONE_DAY_MS + 1) / 7);
}

export function getVietnamIsoWeekInfo(input: Date | string): VietnamIsoWeekInfo {
  const dateString = typeof input === "string" ? input : getVietnamDateString(input);
  const date = ymdToUtcDate(parseYmd(dateString));
  const day = date.getUTCDay() || 7;

  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - day + 1);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const weekStartDate = utcDateToYmd(monday);
  const weekEndDate = utcDateToYmd(sunday);
  const weekNumber = getIsoWeekNumberFromYmd(dateString);

  return {
    weekNumber,
    weekStartDate,
    weekEndDate,
    label: `Tuần ${weekNumber}: ${weekStartDate} - ${weekEndDate}`,
  };
}

export function getVietnamTodayRange(now: Date = new Date()) {
  const date = getVietnamDateString(now);
  return {
    date,
    start: vietnamStartOfDayUtc(date),
    end: vietnamEndOfDayUtc(date),
  };
}

export function getVietnamWeekRange(now: Date = new Date()) {
  const week = getVietnamIsoWeekInfo(now);
  return {
    ...week,
    start: vietnamStartOfDayUtc(week.weekStartDate),
    end: vietnamEndOfDayUtc(week.weekEndDate),
  };
}

export function getVietnamMonthRange(now: Date = new Date()) {
  const today = parseYmd(getVietnamDateString(now));
  const startDate = ymdToString({ year: today.year, month: today.month, day: 1 });
  const endUtc = new Date(Date.UTC(today.year, today.month, 0));
  const endDate = utcDateToYmd(endUtc);

  return {
    startDate,
    endDate,
    start: vietnamStartOfDayUtc(startDate),
    end: vietnamEndOfDayUtc(endDate),
  };
}

export function getVietnamCustomDateRange(startDate: string, endDate: string) {
  return {
    start: vietnamStartOfDayUtc(startDate),
    end: vietnamEndOfDayUtc(endDate),
  };
}
