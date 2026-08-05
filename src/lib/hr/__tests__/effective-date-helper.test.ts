import { describe, it, expect } from "vitest";
import {
  isEffectiveAt,
  intervalsOverlap,
  getAllocationEffectiveEnd,
  INFINITY_DATE,
} from "../effective-date-helper";
import { parseVietnamDateOnly } from "../vietnam-date-helper";

describe("HR Effective-Date Utilities (DEC-01)", () => {
  const d2026_01_01 = parseVietnamDateOnly("2026-01-01");
  const d2026_06_01 = parseVietnamDateOnly("2026-06-01");
  const d2026_12_31 = parseVietnamDateOnly("2026-12-31");

  describe("isEffectiveAt [startDate, endDate)", () => {
    it("should be effective when at = startDate (inclusive)", () => {
      expect(isEffectiveAt(d2026_01_01, d2026_06_01, d2026_01_01)).toBe(true);
    });

    it("should NOT be effective when at < startDate", () => {
      const beforeStart = parseVietnamDateOnly("2025-12-31");
      expect(isEffectiveAt(d2026_01_01, d2026_06_01, beforeStart)).toBe(false);
    });

    it("should NOT be effective when at = endDate (exclusive)", () => {
      expect(isEffectiveAt(d2026_01_01, d2026_06_01, d2026_06_01)).toBe(false);
    });

    it("should be effective infinitely when endDate is null", () => {
      expect(isEffectiveAt(d2026_01_01, null, d2026_12_31)).toBe(true);
    });

    it("should NOT overlap when assignment A ends at date D and assignment B starts at date D", () => {
      // Assignment A: [2026-01-01, 2026-06-01)
      // Assignment B: [2026-06-01, 2026-12-31)
      expect(intervalsOverlap(d2026_01_01, d2026_06_01, d2026_06_01, d2026_12_31)).toBe(false);
    });
  });

  describe("getAllocationEffectiveEnd rules (DEC-01)", () => {
    const referenceAt = parseVietnamDateOnly("2026-05-01"); // Reference point

    it("1. Started assignment with expectedEndDate passed & endDate null -> returns Infinity", () => {
      // Started at 2026-01-01, expectedEndDate was 2026-04-01 (passed), endDate is null
      const startDate = parseVietnamDateOnly("2026-01-01");
      const expectedEndDate = parseVietnamDateOnly("2026-04-01");

      const result = getAllocationEffectiveEnd({
        startDate,
        expectedEndDate,
        endDate: null,
        referenceAt,
      });

      expect(result.getTime()).toBe(INFINITY_DATE.getTime());
    });

    it("2. Unstarted assignment with expectedEndDate -> returns expectedEndDate", () => {
      // Unstarted: starts at 2026-06-01 (future), expectedEndDate 2026-09-01
      const startDate = parseVietnamDateOnly("2026-06-01");
      const expectedEndDate = parseVietnamDateOnly("2026-09-01");

      const result = getAllocationEffectiveEnd({
        startDate,
        expectedEndDate,
        endDate: null,
        referenceAt,
      });

      expect(result.getTime()).toBe(expectedEndDate.getTime());
    });

    it("3. Unstarted assignment without expectedEndDate & endDate -> returns Infinity", () => {
      const startDate = parseVietnamDateOnly("2026-06-01");

      const result = getAllocationEffectiveEnd({
        startDate,
        expectedEndDate: null,
        endDate: null,
        referenceAt,
      });

      expect(result.getTime()).toBe(INFINITY_DATE.getTime());
    });

    it("4. Assignment with explicit endDate -> ALWAYS returns endDate", () => {
      const startDate = parseVietnamDateOnly("2026-01-01");
      const endDate = parseVietnamDateOnly("2026-05-15");
      const expectedEndDate = parseVietnamDateOnly("2026-08-01");

      const result = getAllocationEffectiveEnd({
        startDate,
        expectedEndDate,
        endDate,
        referenceAt,
      });

      expect(result.getTime()).toBe(endDate.getTime());
    });
  });
});
