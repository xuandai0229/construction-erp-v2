import assert from "node:assert/strict";
import test from "node:test";
import { addDays, isWithinInclusive, startOfMonday } from "@/lib/supervision-weekly/date";

test("calculates the report week from Monday through Sunday", () => {
  const monday = startOfMonday(new Date("2026-07-22T09:00:00"));
  assert.equal(monday.getDay(), 1);
  assert.equal(addDays(monday, 6).getDay(), 0);
  assert.equal(addDays(monday, 7).getDay(), 1);
});

test("rejects entries outside their assigned report period", () => {
  const start = new Date("2026-07-20T00:00:00");
  const end = addDays(start, 6);
  assert.equal(isWithinInclusive(new Date("2026-07-20T00:00:00"), start, end), true);
  assert.equal(isWithinInclusive(new Date("2026-07-26T23:59:59"), start, end), true);
  assert.equal(isWithinInclusive(new Date("2026-07-27T00:00:00"), start, end), false);
});
