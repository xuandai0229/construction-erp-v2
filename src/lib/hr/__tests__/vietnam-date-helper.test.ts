import { describe, it, expect } from "vitest";
import {
  parseVietnamDateOnly,
  formatVietnamDateOnly,
  isValidVietnamDateString,
} from "../vietnam-date-helper";

describe("Vietnam Date-Only Helper (DEC-03)", () => {
  it("should validate valid ISO YYYY-MM-DD date strings", () => {
    expect(isValidVietnamDateString("2026-01-01")).toBe(true);
    expect(isValidVietnamDateString("2026-12-31")).toBe(true);
    expect(isValidVietnamDateString("2028-02-29")).toBe(true); // 2028 is leap year
  });

  it("should reject invalid date strings and non-existent calendar dates", () => {
    expect(isValidVietnamDateString("2026-02-29")).toBe(false); // 2026 is NOT leap year
    expect(isValidVietnamDateString("10/08/2026")).toBe(false); // Wrong format
    expect(isValidVietnamDateString("2026-13-01")).toBe(false); // Invalid month
    expect(isValidVietnamDateString("2026-04-31")).toBe(false); // April has 30 days
    expect(isValidVietnamDateString("abc")).toBe(false);
    expect(isValidVietnamDateString("")).toBe(false);
  });

  it("should parse valid dates to Date objects at 00:00:00 Asia/Ho_Chi_Minh timezone", () => {
    const date = parseVietnamDateOnly("2026-08-10");
    expect(date).toBeInstanceOf(Date);
    expect(isNaN(date.getTime())).toBe(false);
    expect(formatVietnamDateOnly(date)).toBe("2026-08-10");
  });

  it("should throw informative errors when parsing invalid dates", () => {
    expect(() => parseVietnamDateOnly("2026-02-29")).toThrow(/không hợp lệ/i);
    expect(() => parseVietnamDateOnly("10/08/2026")).toThrow(/định dạng ISO YYYY-MM-DD/i);
    expect(() => parseVietnamDateOnly("2026-04-31")).toThrow(/không hợp lệ/i);
  });

  it("should maintain date integrity in round-trip conversion regardless of machine timezone", () => {
    const dateStr = "2026-12-31";
    const parsed = parseVietnamDateOnly(dateStr);
    const formatted = formatVietnamDateOnly(parsed);
    expect(formatted).toBe(dateStr);
  });
});
