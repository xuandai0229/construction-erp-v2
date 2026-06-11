import {
  formatWorkDate,
  getWorkDateRange,
  parseWorkDate,
} from "../src/lib/date/work-date";

const dates = ["2026-06-09", "2026-06-10", "2026-06-11"];

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

for (const dateStr of dates) {
  const parsed = parseWorkDate(dateStr);
  const formatted = formatWorkDate(parsed);
  const { start, end } = getWorkDateRange(dateStr);
  const expectedNext = parseWorkDate(
    dateStr === "2026-06-09"
      ? "2026-06-10"
      : dateStr === "2026-06-10"
        ? "2026-06-11"
        : "2026-06-12",
  );

  assert(formatted === dateStr, `${dateStr}: formatWorkDate(parseWorkDate()) returned ${formatted}`);
  assert(start.toISOString() === `${dateStr}T00:00:00.000Z`, `${dateStr}: start is ${start.toISOString()}`);
  assert(end.toISOString() === expectedNext.toISOString(), `${dateStr}: end is ${end.toISOString()}`);
  assert(start <= parsed && parsed < end, `${dateStr}: parsed date is outside [start, end)`);
}

const { start: june10Start, end: june10End } = getWorkDateRange("2026-06-10");
const june09Late = new Date("2026-06-09T23:59:59.999Z");
const june10Midnight = new Date("2026-06-10T00:00:00.000Z");
const june10Late = new Date("2026-06-10T23:59:59.999Z");
const june11Midnight = new Date("2026-06-11T00:00:00.000Z");

assert(!(june09Late >= june10Start && june09Late < june10End), "June 9 late must not match June 10 range");
assert(june10Midnight >= june10Start && june10Midnight < june10End, "June 10 midnight must match June 10 range");
assert(june10Late >= june10Start && june10Late < june10End, "June 10 late must match June 10 range");
assert(!(june11Midnight >= june10Start && june11Midnight < june10End), "June 11 midnight must not match June 10 range");

console.table(
  dates.map((dateStr) => {
    const { start, end } = getWorkDateRange(dateStr);
    return {
      "Ngay test": dateStr,
      "Nhap ngay": dateStr,
      "DB/API start": start.toISOString(),
      "DB/API end exclusive": end.toISOString(),
      "Reload daily": formatWorkDate(start),
      Summary: formatWorkDate(start),
      "Ket qua": "PASS",
    };
  }),
);
