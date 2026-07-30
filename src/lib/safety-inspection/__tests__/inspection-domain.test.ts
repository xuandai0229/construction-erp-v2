import { describe, expect, it } from "vitest";
import {
  assertChecklistResultInvariant,
  assertPlanMutable,
  assertReportMutable,
  assertScheduleProjectInvariant,
  assertChecklistTemplateVersionMutable,
  canTransitionSafetyPlan,
} from "../inspection-domain";

describe("domain kế hoạch và phiên kiểm tra", () => {
  it("không cho sửa kế hoạch đã khóa", () => {
    expect(() => assertPlanMutable("LOCKED")).toThrow("Kế hoạch đã khóa");
  });

  it("không cho sửa báo cáo đã khóa", () => {
    expect(() => assertReportMutable("LOCKED")).toThrow("Báo cáo đã khóa");
  });

  it("không sửa trực tiếp checklist template đã được sử dụng", () => {
    expect(() =>
      assertChecklistTemplateVersionMutable({
        hasInspectionResults: true,
        hasScheduleSelections: false,
      }),
    ).toThrow("hãy tạo phiên bản mới");
  });

  it("chỉ cho transition kế hoạch hợp lệ", () => {
    expect(canTransitionSafetyPlan("DRAFT", "PENDING_APPROVAL")).toBe(true);
    expect(canTransitionSafetyPlan("LOCKED", "DRAFT")).toBe(false);
  });

  it("NOT_APPLICABLE bắt buộc có lý do", () => {
    expect(() =>
      assertChecklistResultInvariant({
        status: "NOT_APPLICABLE",
        notApplicableReason: "",
        hasFinding: false,
      }),
    ).toThrow("Không áp dụng phải có lý do");
  });

  it("FAIL bắt buộc có finding trong cùng transaction", () => {
    expect(() =>
      assertChecklistResultInvariant({
        status: "FAIL",
        notApplicableReason: null,
        hasFinding: false,
      }),
    ).toThrow("Kết quả chưa đạt phải có tồn tại");
  });

  it("result/finding phải cùng project với session nguồn", () => {
    expect(() =>
      assertScheduleProjectInvariant({
        planProjectIds: ["project-a", "project-b"],
        scheduleProjectId: "project-c",
      }),
    ).toThrow("Công trình của lịch không thuộc phạm vi kế hoạch");
  });
});
