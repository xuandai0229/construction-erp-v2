import { describe, expect, it } from "vitest";
import {
  getSafetyBusinessDate,
  getSafetyWeekRange,
  isScheduleDateAllowed,
  validateSafetyWeek,
} from "../week";

describe("tuần nghiệp vụ ATLĐ", () => {
  it("dùng múi giờ Asia/Ho_Chi_Minh khi đổi timestamp UTC sang ngày nghiệp vụ", () => {
    expect(getSafetyBusinessDate(new Date("2026-07-26T18:30:00.000Z"))).toBe("2026-07-27");
  });

  it("tính tuần từ Thứ Hai đến Chủ nhật", () => {
    expect(getSafetyWeekRange("2026-07-30")).toEqual({
      weekStart: "2026-07-27",
      weekEnd: "2026-08-02",
    });
  });

  it("yêu cầu lý do nếu kỳ không phải tuần chuẩn", () => {
    expect(() =>
      validateSafetyWeek({
        weekStart: "2026-07-28",
        weekEnd: "2026-08-02",
        isException: true,
        exceptionReason: " ",
      }),
    ).toThrow("Tuần ngoại lệ phải có lý do");
  });

  it("chặn lịch ngoài kỳ nếu không có ngoại lệ hợp lệ", () => {
    expect(
      isScheduleDateAllowed({
        scheduleDate: "2026-08-03",
        weekStart: "2026-07-27",
        weekEnd: "2026-08-02",
        isException: false,
        exceptionReason: null,
      }),
    ).toBe(false);
  });
});
