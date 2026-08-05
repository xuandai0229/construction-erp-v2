import { describe, it, expect } from "vitest";
import {
  isCurrentlyEffective,
  getVietnamTodayDateString,
  validateEffectiveDateRange,
  validateTransferEffectiveDate,
  buildEffectiveDateWhere,
} from "../effective-date-helper";

describe("HR Effective-Date Helper Unit Tests", () => {
  it("evaluates [startDate, endDate) boundaries correctly", () => {
    const startDate = new Date("2026-01-01T00:00:00.000Z");
    const endDate = new Date("2026-07-01T00:00:00.000Z");

    const beforeStart = new Date("2025-12-31T23:59:59.999Z");
    const atStart = new Date("2026-01-01T00:00:00.000Z");
    const insideRange = new Date("2026-03-15T12:00:00.000Z");
    const beforeEnd = new Date("2026-06-30T23:59:59.999Z");
    const atEnd = new Date("2026-07-01T00:00:00.000Z");
    const afterEnd = new Date("2026-07-01T00:00:00.001Z");

    expect(isCurrentlyEffective(startDate, endDate, beforeStart)).toBe(false);
    expect(isCurrentlyEffective(startDate, endDate, atStart)).toBe(true);
    expect(isCurrentlyEffective(startDate, endDate, insideRange)).toBe(true);
    expect(isCurrentlyEffective(startDate, endDate, beforeEnd)).toBe(true);
    expect(isCurrentlyEffective(startDate, endDate, atEnd)).toBe(false); // Exclusive end
    expect(isCurrentlyEffective(startDate, endDate, afterEnd)).toBe(false);
  });

  it("handles null endDate as indefinitely effective", () => {
    const startDate = new Date("2026-01-01T00:00:00.000Z");
    const farFuture = new Date("2099-12-31T23:59:59.999Z");

    expect(isCurrentlyEffective(startDate, null, startDate)).toBe(true);
    expect(isCurrentlyEffective(startDate, null, farFuture)).toBe(true);
  });

  it("formats date in Asia/Ho_Chi_Minh timezone", () => {
    const date = new Date("2026-08-04T00:00:00.000Z");
    const str = getVietnamTodayDateString(date);
    expect(str).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("validates date range boundaries and throws error when endDate < startDate", () => {
    const start = new Date("2026-07-01");
    const endInvalid = new Date("2026-06-30");
    const endValid = new Date("2026-07-02");

    expect(() => validateEffectiveDateRange(start, endInvalid)).toThrow();
    expect(() => validateEffectiveDateRange(start, endValid)).not.toThrow();
  });

  it("validates transfer date against current start date", () => {
    const currentStart = new Date("2026-01-01");
    const newEffectiveInvalid = new Date("2025-12-31");
    const newEffectiveValid = new Date("2026-02-01");

    expect(() => validateTransferEffectiveDate(currentStart, newEffectiveInvalid)).toThrow();
    expect(() => validateTransferEffectiveDate(currentStart, newEffectiveValid)).not.toThrow();
  });

  it("constructs correct Prisma where clause for effective date", () => {
    const now = new Date("2026-08-04T00:00:00.000Z");
    const where = buildEffectiveDateWhere(now);

    expect(where.startDate).toEqual({ lte: now });
    expect(where.OR).toEqual([
      { endDate: null },
      { endDate: { gt: now } },
    ]);
  });
});
