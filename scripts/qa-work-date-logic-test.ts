import {
  formatWorkDate,
  getWorkDateRange,
  parseWorkDate,
  todayWorkDate,
} from "../src/lib/date/work-date";

const dates = ["2026-06-09", "2026-06-10", "2026-06-11"];

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

// =========================================================
// SECTION 1: Existing parseWorkDate / getWorkDateRange tests
// =========================================================

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

console.log("✅ Section 1: parseWorkDate / getWorkDateRange — PASS");

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

// =========================================================
// SECTION 2: todayWorkDate() timezone tests (FP-L01 fix)
// =========================================================

console.log("\n🧪 Section 2: todayWorkDate() timezone tests (FP-L01)...\n");

const tzTests = [
  {
    name: "Case 1 — Server UTC, VN early morning (01:30 VN = 18:30 UTC prev day)",
    utcIso: "2026-06-10T18:30:00.000Z",
    expectedVnDate: "2026-06-11",
  },
  {
    name: "Case 2 — Server UTC, VN normal daytime (09:00 VN = 02:00 UTC)",
    utcIso: "2026-06-11T02:00:00.000Z",
    expectedVnDate: "2026-06-11",
  },
  {
    name: "Case 3 — VN late night (23:59 VN = 16:59 UTC)",
    utcIso: "2026-06-11T16:59:00.000Z",
    expectedVnDate: "2026-06-11",
  },
  {
    name: "Case 4 — VN next day (00:00 VN = 17:00 UTC)",
    utcIso: "2026-06-11T17:00:00.000Z",
    expectedVnDate: "2026-06-12",
  },
];

let tzPassCount = 0;
let tzFailCount = 0;

for (const tc of tzTests) {
  const fakeNow = new Date(tc.utcIso);
  const result = todayWorkDate(fakeNow);
  const passed = result === tc.expectedVnDate;

  if (passed) {
    console.log(`✅ PASS: ${tc.name}`);
    console.log(`   UTC: ${tc.utcIso} → todayWorkDate() = ${result}`);
    tzPassCount++;
  } else {
    console.error(`❌ FAIL: ${tc.name}`);
    console.error(`   UTC: ${tc.utcIso}`);
    console.error(`   Expected: ${tc.expectedVnDate}, Got: ${result}`);
    tzFailCount++;
  }
}

console.log(`\n📊 todayWorkDate timezone tests: ${tzPassCount} passed, ${tzFailCount} failed`);

if (tzFailCount > 0) {
  console.error("\n❌ TIMEZONE TESTS FAILED");
  process.exit(1);
}

// =========================================================
// Verify todayWorkDate does NOT break existing parse/format
// =========================================================

const todayStr = todayWorkDate();
const todayParsed = parseWorkDate(todayStr);
const todayFormatted = formatWorkDate(todayParsed);
assert(todayFormatted === todayStr, `todayWorkDate() round-trip failed: ${todayStr} → ${todayFormatted}`);

const todayRange = getWorkDateRange(todayStr);
assert(
  todayRange.start.toISOString() === `${todayStr}T00:00:00.000Z`,
  `todayWorkDate() range start mismatch: ${todayRange.start.toISOString()}`,
);

console.log(`\n✅ todayWorkDate() = "${todayStr}" round-trip and range OK`);
console.log("\n🎉 ALL WORK DATE TESTS PASSED");
