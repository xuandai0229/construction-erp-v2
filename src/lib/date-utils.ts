const DATE_INPUT_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATETIME_LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export type DateValue = Date | string | number | null | undefined;

export function safeParseDate(value: DateValue): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function safeFormatDateVN(value: DateValue): string {
  const date = safeParseDate(value);
  if (!date) return "—";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function safeFormatDateTimeVN(value: DateValue): string {
  const date = safeParseDate(value);
  if (!date) return "—";

  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  return `${hours}:${minutes} ${safeFormatDateVN(date)}`;
}

export function toDateInputValue(value: DateValue): string {
  const date = safeParseDate(value);
  if (!date) return "";

  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function toDateTimeLocalInputValue(value: DateValue): string {
  const date = safeParseDate(value);
  if (!date) return "";

  return `${toDateInputValue(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function fromDateInputValue(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = DATE_INPUT_RE.exec(value);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function fromDateTimeLocalInputValue(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = DATETIME_LOCAL_RE.exec(value);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}
