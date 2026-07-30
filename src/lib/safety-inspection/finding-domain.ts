import type {
  SafetyCorrectiveActionStatus,
  SafetyFindingStatus,
  SafetyReinspectionDecision,
  SafetySeverity,
} from "./types";

export type SafetyFindingOverdueView = {
  status: SafetyFindingStatus;
  effectiveDueAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
};

export function isSafetyFindingOverdue(
  finding: SafetyFindingOverdueView,
  now: Date,
): boolean {
  if (!finding.effectiveDueAt || Number.isNaN(now.getTime())) return false;
  if (
    finding.status === "COMPLETED" ||
    finding.status === "CANCELLED" ||
    finding.completedAt ||
    finding.cancelledAt
  ) {
    return false;
  }
  return finding.effectiveDueAt.getTime() < now.getTime();
}

export function assertIndependentReinspection(input: {
  remediationSubmittedById: string | null;
  inspectorId: string;
  independentReviewRequired: boolean;
}): void {
  if (
    input.independentReviewRequired &&
    input.remediationSubmittedById === input.inspectorId
  ) {
    throw new Error("Người gửi khắc phục không được tự kiểm tra lại.");
  }
}

export function completeFindingFromReinspection(input: {
  findingStatus: SafetyFindingStatus;
  decision: SafetyReinspectionDecision;
  inspectedAt: Date;
}): { status: "COMPLETED"; completedAt: Date } {
  if (input.findingStatus !== "WAITING_REINSPECTION") {
    throw new Error("Tồn tại chưa ở trạng thái chờ kiểm tra lại.");
  }
  if (input.decision !== "ACCEPT_COMPLETION") {
    throw new Error("Chỉ kết luận chấp thuận mới được hoàn thành tồn tại.");
  }
  return { status: "COMPLETED", completedAt: input.inspectedAt };
}

export type SafetyDueDateExtensionHistory = {
  findingId: string;
  previousDueAt: Date;
  newDueAt: Date;
  reason: string;
  actorId: string;
  occurredAt: Date;
};

export function applySafetyDueDateExtension(input: SafetyDueDateExtensionHistory): {
  effectiveDueAt: Date;
  history: SafetyDueDateExtensionHistory;
} {
  if (!input.reason.trim()) {
    throw new Error("Gia hạn phải có lý do.");
  }
  if (input.newDueAt.getTime() <= input.previousDueAt.getTime()) {
    throw new Error("Hạn mới phải sau hạn hiện tại.");
  }
  return { effectiveDueAt: input.newDueAt, history: { ...input } };
}

const SEVERITY_ORDER: Readonly<Record<SafetySeverity, number>> = {
  REMINDER: 0,
  MEDIUM: 1,
  SERIOUS: 2,
  IMMEDIATE_DANGER: 3,
};

export type SafetyReinspectionTransitionInput = {
  findingStatus: SafetyFindingStatus;
  actionStatus: SafetyCorrectiveActionStatus;
  findingCompletedAt: Date | null;
  effectiveDueAt: Date | null;
  currentSeverity: SafetySeverity;
  decision: SafetyReinspectionDecision;
  conclusion: string;
  reason: string | null;
  newDueAt: Date | null;
  newSeverity: SafetySeverity | null;
  suspensionReason: string | null;
  canSuspendWork: boolean;
  inspectedAt: Date;
};

export type SafetyReinspectionTransition = {
  findingStatus: SafetyFindingStatus;
  actionStatus: SafetyCorrectiveActionStatus;
  completedAt: Date | null;
  effectiveDueAt: Date | null;
  severity: SafetySeverity;
  workSuspended: boolean;
};

export function deriveSafetyReinspectionTransition(
  input: SafetyReinspectionTransitionInput,
): SafetyReinspectionTransition {
  if (
    input.findingStatus === "COMPLETED" ||
    input.findingStatus === "CANCELLED"
  ) {
    throw new Error("Tồn tại đã kết thúc, không thể thực hiện transition này.");
  }

  const result: SafetyReinspectionTransition = {
    findingStatus: input.findingStatus,
    actionStatus: input.actionStatus,
    completedAt: null,
    effectiveDueAt: input.effectiveDueAt,
    severity: input.currentSeverity,
    workSuspended: false,
  };

  if (input.decision === "ACCEPT_COMPLETION") {
    if (
      input.findingStatus !== "WAITING_REINSPECTION" ||
      input.actionStatus !== "SUBMITTED"
    ) {
      throw new Error(
        "Chấp thuận chỉ hợp lệ khi tồn tại chờ kiểm tra lại và yêu cầu đã gửi.",
      );
    }
    if (!input.conclusion.trim()) {
      throw new Error("Chấp thuận hoàn thành phải có kết luận.");
    }
    return {
      ...result,
      findingStatus: "COMPLETED",
      actionStatus: "ACCEPTED",
      completedAt: input.inspectedAt,
    };
  }

  if (input.decision === "REJECT_REWORK") {
    if (
      input.findingStatus !== "WAITING_REINSPECTION" ||
      input.actionStatus !== "SUBMITTED"
    ) {
      throw new Error(
        "Yêu cầu làm lại chỉ hợp lệ khi đang chờ kiểm tra lại.",
      );
    }
    if (!input.conclusion.trim() || !input.reason?.trim()) {
      throw new Error("Yêu cầu làm lại phải có kết luận và lý do.");
    }
    return {
      ...result,
      findingStatus: "IN_REMEDIATION",
      actionStatus: "REWORK_REQUIRED",
      completedAt: null,
    };
  }

  if (input.decision === "EXTEND_DUE_DATE") {
    if (!input.effectiveDueAt || !input.newDueAt) {
      throw new Error("Gia hạn phải có hạn hiệu lực hiện tại và hạn mới.");
    }
    if (!input.reason?.trim()) {
      throw new Error("Gia hạn phải có lý do.");
    }
    if (input.newDueAt.getTime() <= input.effectiveDueAt.getTime()) {
      throw new Error("Hạn gia hạn phải sau hạn hiệu lực hiện tại.");
    }
    return {
      ...result,
      effectiveDueAt: input.newDueAt,
      actionStatus: "EXTENDED",
    };
  }

  if (input.decision === "ESCALATE_SEVERITY") {
    if (
      !input.newSeverity ||
      SEVERITY_ORDER[input.newSeverity] <= SEVERITY_ORDER[input.currentSeverity]
    ) {
      throw new Error("Mức độ mới phải cao hơn mức độ hiện tại.");
    }
    return { ...result, severity: input.newSeverity };
  }

  if (!input.canSuspendWork) {
    throw new Error("Bạn không có quyền đình chỉ công việc.");
  }
  if (!input.suspensionReason?.trim()) {
    throw new Error("Đình chỉ công việc phải có lý do.");
  }
  return {
    ...result,
    findingStatus: "IN_REMEDIATION",
    actionStatus: "REWORK_REQUIRED",
    workSuspended: true,
  };
}

export function resolveSafetyReinspectionPolicy(input: {
  actorId: string;
  remediationSubmittedById: string | null;
  permissions: ReadonlySet<string>;
}): {
  independentReviewRequired: true;
  canSuspendWork: boolean;
} {
  if (!input.permissions.has("safety.reinspection.decide")) {
    throw new Error("Bạn không có quyền kiểm tra lại tồn tại.");
  }
  assertIndependentReinspection({
    remediationSubmittedById: input.remediationSubmittedById,
    inspectorId: input.actorId,
    independentReviewRequired: true,
  });
  return {
    independentReviewRequired: true,
    canSuspendWork: input.permissions.has("safety.work.suspend"),
  };
}
