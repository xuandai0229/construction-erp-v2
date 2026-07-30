import { describe, expect, it } from "vitest";
import {
  assertChecklistItemEligibleForSession,
  assertCompletedAtMatchesFindingStatus,
  assertInspectionResultTransition,
  assertSafetySessionMutable,
  assertSafetySessionSourceInvariant,
} from "../inspection-domain";
import {
  deriveSafetyReinspectionTransition,
  resolveSafetyReinspectionPolicy,
} from "../finding-domain";

describe("session và result hardening", () => {
  it("phiên đột xuất bắt buộc có lý do và quyền riêng", () => {
    expect(() =>
      assertSafetySessionSourceInvariant({
        schedule: null,
        planId: null,
        projectId: "project-a",
        occurredAt: new Date("2026-07-30T02:00:00.000Z"),
        constructionType: "BUILDING",
        unplannedReason: " ",
        canInspectUnplanned: true,
        projectAllowed: true,
      }),
    ).toThrow("Phiên kiểm tra đột xuất phải có lý do");
  });

  it("phiên có schedule phải khớp plan, project và loại công trình", () => {
    expect(() =>
      assertSafetySessionSourceInvariant({
        schedule: {
          planId: "plan-a",
          projectId: "project-a",
          scheduledDate: "2026-07-30",
          constructionType: "BUILDING",
        },
        planId: "plan-a",
        projectId: "project-b",
        occurredAt: new Date("2026-07-30T02:00:00.000Z"),
        constructionType: "BUILDING",
        unplannedReason: null,
        canInspectUnplanned: false,
        projectAllowed: true,
      }),
    ).toThrow("không khớp công trình");
  });

  it("không sửa session COMPLETED hoặc CANCELLED", () => {
    expect(() => assertSafetySessionMutable("COMPLETED")).toThrow(
      "Phiên kiểm tra đã hoàn thành",
    );
    expect(() => assertSafetySessionMutable("CANCELLED")).toThrow(
      "Phiên kiểm tra đã hủy",
    );
  });

  it("chặn checklist item ngoài template/session", () => {
    expect(() =>
      assertChecklistItemEligibleForSession({
        sessionTemplateId: "template-a",
        itemTemplateId: "template-b",
        scheduleId: null,
        selectedOnSchedule: false,
        itemActive: true,
      }),
    ).toThrow("không thuộc checklist");
  });

  it("chặn FAIL chuyển PASS khi đã có finding", () => {
    expect(() =>
      assertInspectionResultTransition({
        currentStatus: "FAIL",
        nextStatus: "PASS",
        existingFindingCount: 2,
        newFindingCount: 0,
        notApplicableReason: null,
      }),
    ).toThrow("Không thể đổi kết quả FAIL");
  });

  it("NOT_APPLICABLE không nhận chuỗi trắng", () => {
    expect(() =>
      assertInspectionResultTransition({
        currentStatus: null,
        nextStatus: "NOT_APPLICABLE",
        existingFindingCount: 0,
        newFindingCount: 0,
        notApplicableReason: "   ",
      }),
    ).toThrow("Không áp dụng phải có lý do");
  });

  it("FAIL phải có ít nhất một finding hiện hữu hoặc mới", () => {
    expect(() =>
      assertInspectionResultTransition({
        currentStatus: null,
        nextStatus: "FAIL",
        existingFindingCount: 0,
        newFindingCount: 0,
        notApplicableReason: null,
      }),
    ).toThrow("phải có ít nhất một tồn tại");
  });
});

describe("reinspection transition matrix", () => {
  const base = {
    findingStatus: "WAITING_REINSPECTION" as const,
    actionStatus: "SUBMITTED" as const,
    findingCompletedAt: null,
    effectiveDueAt: new Date("2026-07-30T10:00:00.000Z"),
    currentSeverity: "MEDIUM" as const,
    conclusion: "Đã kiểm tra tại hiện trường",
    reason: "Bằng chứng chưa đạt yêu cầu",
    newDueAt: null,
    newSeverity: null,
    suspensionReason: null,
    canSuspendWork: false,
    inspectedAt: new Date("2026-07-30T11:00:00.000Z"),
  };

  it("ACCEPT chỉ từ WAITING_REINSPECTION + SUBMITTED", () => {
    expect(
      deriveSafetyReinspectionTransition({
        ...base,
        decision: "ACCEPT_COMPLETION",
      }),
    ).toMatchObject({
      findingStatus: "COMPLETED",
      actionStatus: "ACCEPTED",
      completedAt: base.inspectedAt,
    });
  });

  it("REJECT đưa finding về IN_REMEDIATION và xóa completedAt", () => {
    expect(
      deriveSafetyReinspectionTransition({
        ...base,
        decision: "REJECT_REWORK",
      }),
    ).toMatchObject({
      findingStatus: "IN_REMEDIATION",
      actionStatus: "REWORK_REQUIRED",
      completedAt: null,
    });
  });

  it("không gia hạn bằng hoặc trước hạn hiệu lực", () => {
    expect(() =>
      deriveSafetyReinspectionTransition({
        ...base,
        decision: "EXTEND_DUE_DATE",
        newDueAt: new Date("2026-07-30T10:00:00.000Z"),
      }),
    ).toThrow("Hạn gia hạn phải sau hạn hiệu lực hiện tại");
  });

  it("không hạ hoặc giữ nguyên severity khi escalate", () => {
    expect(() =>
      deriveSafetyReinspectionTransition({
        ...base,
        decision: "ESCALATE_SEVERITY",
        newSeverity: "REMINDER",
      }),
    ).toThrow("Mức độ mới phải cao hơn");
  });

  it("đình chỉ cần permission riêng", () => {
    expect(() =>
      deriveSafetyReinspectionTransition({
        ...base,
        decision: "SUSPEND_WORK",
        suspensionReason: "Nguy cơ sập đổ",
      }),
    ).toThrow("không có quyền đình chỉ");
  });

  it("completedAt chỉ tồn tại khi finding COMPLETED", () => {
    expect(() =>
      assertCompletedAtMatchesFindingStatus(
        "IN_REMEDIATION",
        new Date("2026-07-30T11:00:00.000Z"),
      ),
    ).toThrow("completedAt chỉ được ghi");
  });

  it("policy độc lập luôn được tính server-side", () => {
    expect(
      resolveSafetyReinspectionPolicy({
        actorId: "inspector-a",
        remediationSubmittedById: "commander-a",
        permissions: new Set(["safety.reinspection.decide"]),
      }),
    ).toEqual({
      independentReviewRequired: true,
      canSuspendWork: false,
    });
  });
});
