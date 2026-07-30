import type {
  SafetyConstructionType,
  SafetyInspectionStatus,
  SafetyInspectionResultStatus,
  SafetyPlanStatus,
  SafetyReportStatus,
} from "./types";
import { getSafetyBusinessDate } from "./week";

const PLAN_TRANSITIONS: Readonly<Record<SafetyPlanStatus, readonly SafetyPlanStatus[]>> = {
  DRAFT: ["PENDING_APPROVAL", "CANCELLED"],
  PENDING_APPROVAL: ["APPROVED", "REVISION_REQUIRED", "CANCELLED"],
  APPROVED: ["LOCKED", "REVISION_REQUIRED", "CANCELLED"],
  REVISION_REQUIRED: ["DRAFT", "PENDING_APPROVAL", "CANCELLED"],
  LOCKED: [],
  CANCELLED: [],
};

export function canTransitionSafetyPlan(
  current: SafetyPlanStatus,
  next: SafetyPlanStatus,
): boolean {
  return PLAN_TRANSITIONS[current].includes(next);
}

export function assertPlanMutable(status: SafetyPlanStatus): void {
  if (status === "LOCKED") {
    throw new Error("Kế hoạch đã khóa, không thể chỉnh sửa.");
  }
  if (status === "CANCELLED") {
    throw new Error("Kế hoạch đã hủy, không thể chỉnh sửa.");
  }
}

export function assertReportMutable(status: SafetyReportStatus): void {
  if (status === "LOCKED") {
    throw new Error("Báo cáo đã khóa, không thể chỉnh sửa.");
  }
  if (status === "CANCELLED") {
    throw new Error("Báo cáo đã hủy, không thể chỉnh sửa.");
  }
}

export function assertChecklistResultInvariant(input: {
  status: SafetyInspectionResultStatus;
  notApplicableReason: string | null;
  hasFinding: boolean;
}): void {
  if (
    input.status === "NOT_APPLICABLE" &&
    !input.notApplicableReason?.trim()
  ) {
    throw new Error("Không áp dụng phải có lý do.");
  }
  if (input.status === "FAIL" && !input.hasFinding) {
    throw new Error("Kết quả chưa đạt phải có tồn tại trong cùng giao dịch.");
  }
}

export function assertScheduleProjectInvariant(input: {
  planProjectIds: readonly string[];
  scheduleProjectId: string;
}): void {
  if (!input.planProjectIds.includes(input.scheduleProjectId)) {
    throw new Error("Công trình của lịch không thuộc phạm vi kế hoạch.");
  }
}

export function assertSafetyProjectMatches(
  expectedProjectId: string,
  actualProjectId: string,
  resourceLabel: string,
): void {
  if (expectedProjectId !== actualProjectId) {
    throw new Error(`${resourceLabel} không thuộc đúng công trình nguồn.`);
  }
}

export function assertChecklistTemplateVersionMutable(input: {
  hasInspectionResults: boolean;
  hasScheduleSelections: boolean;
}): void {
  if (input.hasInspectionResults || input.hasScheduleSelections) {
    throw new Error(
      "Mẫu checklist đã được sử dụng; hãy tạo phiên bản mới thay vì sửa trực tiếp.",
    );
  }
}

export function assertSafetySessionMutable(
  status: SafetyInspectionStatus,
): void {
  if (status === "COMPLETED") {
    throw new Error(
      "Phiên kiểm tra đã hoàn thành; chỉ có thể mở lại bằng transition riêng.",
    );
  }
  if (status === "CANCELLED") {
    throw new Error("Phiên kiểm tra đã hủy, không thể chỉnh sửa.");
  }
}

export function assertSafetySessionSourceInvariant(input: {
  schedule: {
    planId: string;
    projectId: string;
    scheduledDate: string;
    constructionType: SafetyConstructionType;
  } | null;
  planId: string | null;
  projectId: string;
  occurredAt: Date;
  constructionType: SafetyConstructionType;
  unplannedReason: string | null;
  canInspectUnplanned: boolean;
  projectAllowed: boolean;
}): void {
  if (!input.projectAllowed) {
    throw new Error("Công trình không thuộc phạm vi kiểm tra được phép.");
  }

  if (!input.schedule) {
    if (!input.unplannedReason?.trim()) {
      throw new Error("Phiên kiểm tra đột xuất phải có lý do.");
    }
    if (!input.canInspectUnplanned) {
      throw new Error("Bạn không có quyền thực hiện kiểm tra đột xuất.");
    }
    return;
  }

  if (input.planId !== input.schedule.planId) {
    throw new Error("Phiên kiểm tra không khớp kế hoạch của lịch.");
  }
  if (input.projectId !== input.schedule.projectId) {
    throw new Error("Phiên kiểm tra không khớp công trình của lịch.");
  }
  if (input.constructionType !== input.schedule.constructionType) {
    throw new Error("Phiên kiểm tra không khớp loại công trình của lịch.");
  }
  if (getSafetyBusinessDate(input.occurredAt) !== input.schedule.scheduledDate) {
    throw new Error("Ngày kiểm tra thực tế không khớp ngày của lịch.");
  }
}

export function assertChecklistItemEligibleForSession(input: {
  sessionTemplateId: string;
  itemTemplateId: string;
  scheduleId: string | null;
  selectedOnSchedule: boolean;
  itemActive: boolean;
}): void {
  if (
    !input.itemActive ||
    input.sessionTemplateId !== input.itemTemplateId ||
    (input.scheduleId !== null && !input.selectedOnSchedule)
  ) {
    throw new Error(
      "Mục kiểm tra không thuộc checklist hợp lệ của phiên kiểm tra.",
    );
  }
}

export function assertInspectionResultTransition(input: {
  currentStatus: SafetyInspectionResultStatus | null;
  nextStatus: SafetyInspectionResultStatus;
  existingFindingCount: number;
  newFindingCount: number;
  notApplicableReason: string | null;
}): void {
  if (
    input.currentStatus === "FAIL" &&
    input.nextStatus !== "FAIL" &&
    input.existingFindingCount > 0
  ) {
    throw new Error(
      "Không thể đổi kết quả FAIL khi đã có tồn tại; hãy dùng nghiệp vụ sửa kết quả nhập nhầm.",
    );
  }
  if (
    input.nextStatus === "NOT_APPLICABLE" &&
    !input.notApplicableReason?.trim()
  ) {
    throw new Error("Không áp dụng phải có lý do.");
  }
  if (
    input.nextStatus === "FAIL" &&
    input.existingFindingCount + input.newFindingCount < 1
  ) {
    throw new Error("Kết quả FAIL phải có ít nhất một tồn tại.");
  }
}

export function assertCompletedAtMatchesFindingStatus(
  status: import("./types").SafetyFindingStatus,
  completedAt: Date | null,
): void {
  if (status !== "COMPLETED" && completedAt !== null) {
    throw new Error("completedAt chỉ được ghi khi tồn tại ở trạng thái COMPLETED.");
  }
  if (status === "COMPLETED" && completedAt === null) {
    throw new Error("Tồn tại COMPLETED bắt buộc có completedAt.");
  }
}
