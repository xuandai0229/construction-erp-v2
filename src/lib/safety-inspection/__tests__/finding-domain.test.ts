import { describe, expect, it } from "vitest";
import {
  applySafetyDueDateExtension,
  assertIndependentReinspection,
  completeFindingFromReinspection,
  isSafetyFindingOverdue,
} from "../finding-domain";
import { summarizeSafetyFindings } from "../selectors";

describe("domain tồn tại và kiểm tra lại", () => {
  it("quá hạn là giá trị dẫn xuất", () => {
    expect(
      isSafetyFindingOverdue(
        {
          status: "WAITING_REINSPECTION",
          effectiveDueAt: new Date("2026-07-29T17:00:00.000Z"),
          completedAt: null,
          cancelledAt: null,
        },
        new Date("2026-07-30T00:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("không quá hạn khi đã hoàn thành hoặc đã hủy", () => {
    const now = new Date("2026-07-30T00:00:00.000Z");
    expect(
      isSafetyFindingOverdue(
        {
          status: "COMPLETED",
          effectiveDueAt: new Date("2026-07-01T00:00:00.000Z"),
          completedAt: new Date("2026-07-02T00:00:00.000Z"),
          cancelledAt: null,
        },
        now,
      ),
    ).toBe(false);
  });

  it("người gửi khắc phục không được tự kiểm tra lại", () => {
    expect(() =>
      assertIndependentReinspection({
        remediationSubmittedById: "user-1",
        inspectorId: "user-1",
        independentReviewRequired: true,
      }),
    ).toThrow("không được tự kiểm tra lại");
  });

  it("chỉ ACCEPT_COMPLETION mới hoàn thành finding", () => {
    expect(() =>
      completeFindingFromReinspection({
        findingStatus: "WAITING_REINSPECTION",
        decision: "REJECT_REWORK",
        inspectedAt: new Date(),
      }),
    ).toThrow("Chỉ kết luận chấp thuận");
  });

  it("gia hạn tạo thay đổi hạn có lịch sử, không ghi đè im lặng", () => {
    const result = applySafetyDueDateExtension({
      findingId: "finding-1",
      previousDueAt: new Date("2026-07-30T10:00:00.000Z"),
      newDueAt: new Date("2026-08-02T10:00:00.000Z"),
      reason: "Chờ thay thế thiết bị",
      actorId: "user-2",
      occurredAt: new Date("2026-07-30T00:00:00.000Z"),
    });
    expect(result.effectiveDueAt.toISOString()).toBe("2026-08-02T10:00:00.000Z");
    expect(result.history.previousDueAt.toISOString()).toBe("2026-07-30T10:00:00.000Z");
  });

  it("selector tổng hợp không đếm trùng và dùng cùng hàm overdue", () => {
    const overdue = {
      id: "finding-1",
      status: "ASSIGNED" as const,
      effectiveDueAt: new Date("2026-07-29T00:00:00.000Z"),
      completedAt: null,
      cancelledAt: null,
    };
    expect(
      summarizeSafetyFindings(
        [
          overdue,
          overdue,
          {
            id: "finding-2",
            status: "COMPLETED",
            effectiveDueAt: new Date("2026-07-20T00:00:00.000Z"),
            completedAt: new Date("2026-07-21T00:00:00.000Z"),
            cancelledAt: null,
          },
        ],
        new Date("2026-07-30T00:00:00.000Z"),
      ),
    ).toEqual({
      total: 2,
      open: 1,
      completed: 1,
      cancelled: 0,
      overdue: 1,
    });
  });
});
