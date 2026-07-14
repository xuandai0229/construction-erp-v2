import { WorkManagementDomainError } from "../errors/codes";
import type {
  DeadlineStatus,
  ExecutionCondition,
  TaskLifecycle,
  TaskPriority,
} from "./types";

export type WorkloadWarning =
  | "CAPACITY_EXCEEDED"
  | "ZERO_CAPACITY_WITH_ASSIGNED_WORK"
  | "MISSING_EFFORT_ESTIMATES"
  | "PARTIAL_EFFORT_ESTIMATE"
  | "BLOCKED_TASKS_PRESENT"
  | "PAUSED_TASKS_PRESENT"
  | "URGENT_OVERDUE_TASKS_PRESENT";

export type CapacityLevel =
  | "UNKNOWN"
  | "NORMAL"
  | "HIGH"
  | "AT_CAPACITY"
  | "EXCEEDED"
  | "NO_CAPACITY";

export type CapacityEstimateBasis =
  | "COMPLETE"
  | "KNOWN_EFFORT_LOWER_BOUND"
  | "UNAVAILABLE";

export type WorkloadTaskInput = {
  workloadWeight: number;
  estimatedEffortHours: number | null;
  priority: TaskPriority;
  lifecycle: TaskLifecycle;
  deadline: DeadlineStatus;
  execution: ExecutionCondition;
};

export type WorkloadThresholds = {
  highCapacityPercent: number;
  fullCapacityPercent: number;
  maxWeight: number;
};

export type WorkloadCalculationInput = {
  weeklyCapacityHours: number | null;
  thresholds?: Partial<WorkloadThresholds>;
  tasks: readonly WorkloadTaskInput[];
};

export type WorkloadResult = {
  weeklyCapacityHours: number | null;

  openTaskCount: number;
  activeTaskCount: number;
  pausedTaskCount: number;
  blockedTaskCount: number;

  urgentTaskCount: number;
  dueSoonTaskCount: number;
  dueTodayTaskCount: number;
  overdueTaskCount: number;
  urgentOverdueTaskCount: number;

  rawEstimatedEffortHours: number;
  weightedEffortScore: number;
  activeEffortHours: number;
  pausedEffortHours: number;
  blockedEffortHours: number;

  missingEstimateCount: number;
  estimatedTaskCount: number;
  workloadConfidence: "COMPLETE" | "PARTIAL" | "UNKNOWN";
  capacityEstimateBasis: CapacityEstimateBasis;

  activeCapacityUsagePercent: number | null;
  assignedCapacityUsagePercent: number | null;
  capacityLevel: CapacityLevel;
  deliveryRiskLevel: "NORMAL" | "ELEVATED" | "HIGH";

  warnings: readonly WorkloadWarning[];
};

const DEFAULT_THRESHOLDS: WorkloadThresholds = {
  highCapacityPercent: 80,
  fullCapacityPercent: 100,
  maxWeight: 10,
};

const CLOSED_LIFECYCLES: readonly TaskLifecycle[] = [
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
];

function isClosedLifecycle(lifecycle: TaskLifecycle): boolean {
  return CLOSED_LIFECYCLES.includes(lifecycle);
}

function resolveWorkloadThresholds(
  thresholds: Partial<WorkloadThresholds> | undefined,
): WorkloadThresholds {
  const resolved = { ...DEFAULT_THRESHOLDS, ...thresholds };
  validateWorkloadThresholds(resolved);
  return resolved;
}

function validateWorkloadThresholds(thresholds: WorkloadThresholds): void {
  const { fullCapacityPercent, highCapacityPercent, maxWeight } = thresholds;

  if (
    !Number.isFinite(highCapacityPercent) ||
    highCapacityPercent < 0 ||
    !Number.isFinite(fullCapacityPercent) ||
    fullCapacityPercent < highCapacityPercent ||
    !Number.isFinite(maxWeight) ||
    maxWeight <= 0
  ) {
    throw new WorkManagementDomainError("WORKLOAD_THRESHOLD_INVALID");
  }
}

function validateCapacity(capacity: number | null): void {
  if (capacity !== null && (!Number.isFinite(capacity) || capacity < 0)) {
    throw new WorkManagementDomainError("WORKLOAD_CAPACITY_INVALID");
  }
}

function validateWorkloadTask(
  task: WorkloadTaskInput,
  thresholds: WorkloadThresholds,
): void {
  if (
    !Number.isFinite(task.workloadWeight) ||
    task.workloadWeight <= 0 ||
    task.workloadWeight > thresholds.maxWeight
  ) {
    throw new WorkManagementDomainError("WORKLOAD_WEIGHT_INVALID");
  }

  if (
    task.estimatedEffortHours !== null &&
    (!Number.isFinite(task.estimatedEffortHours) || task.estimatedEffortHours < 0)
  ) {
    throw new WorkManagementDomainError("WORKLOAD_EFFORT_INVALID");
  }
}

function assertFiniteCalculation(value: number): number {
  if (!Number.isFinite(value)) {
    throw new WorkManagementDomainError("WORKLOAD_INPUT_INVALID");
  }

  return value;
}

function isApproximatelyEqual(
  left: number,
  right: number,
  epsilon = 1e-9,
): boolean {
  return Math.abs(left - right) <= epsilon;
}

function calculateUsagePercent(
  effortHours: number,
  weeklyCapacityHours: number | null,
): number | null {
  if (weeklyCapacityHours === null) {
    return null;
  }

  if (weeklyCapacityHours === 0) {
    return effortHours === 0 ? 0 : null;
  }

  return assertFiniteCalculation((effortHours / weeklyCapacityHours) * 100);
}

function calculateCapacityLevel(
  weeklyCapacityHours: number | null,
  assignedEffortHours: number,
  assignedCapacityUsagePercent: number | null,
  thresholds: WorkloadThresholds,
): CapacityLevel {
  if (weeklyCapacityHours === null) {
    return "UNKNOWN";
  }

  if (weeklyCapacityHours === 0) {
    return assignedEffortHours > 0 ? "NO_CAPACITY" : "NORMAL";
  }

  if (assignedCapacityUsagePercent === null) {
    throw new WorkManagementDomainError("WORKLOAD_INPUT_INVALID");
  }

  if (
    assignedCapacityUsagePercent > thresholds.fullCapacityPercent &&
    !isApproximatelyEqual(
      assignedCapacityUsagePercent,
      thresholds.fullCapacityPercent,
    )
  ) {
    return "EXCEEDED";
  }

  if (
    isApproximatelyEqual(
      assignedCapacityUsagePercent,
      thresholds.fullCapacityPercent,
    )
  ) {
    return "AT_CAPACITY";
  }

  if (assignedCapacityUsagePercent >= thresholds.highCapacityPercent) {
    return "HIGH";
  }

  return "NORMAL";
}

function calculateDeliveryRisk(
  urgentOverdueTaskCount: number,
  overdueTaskCount: number,
  blockedTaskCount: number,
): WorkloadResult["deliveryRiskLevel"] {
  if (urgentOverdueTaskCount > 0) {
    return "HIGH";
  }

  if (overdueTaskCount > 0 || blockedTaskCount > 0) {
    return "ELEVATED";
  }

  return "NORMAL";
}

export function calculateWorkload(
  input: WorkloadCalculationInput,
): WorkloadResult {
  validateCapacity(input.weeklyCapacityHours);
  const thresholds = resolveWorkloadThresholds(input.thresholds);

  let openTaskCount = 0;
  let activeTaskCount = 0;
  let pausedTaskCount = 0;
  let blockedTaskCount = 0;
  let urgentTaskCount = 0;
  let dueSoonTaskCount = 0;
  let dueTodayTaskCount = 0;
  let overdueTaskCount = 0;
  let urgentOverdueTaskCount = 0;
  let rawEstimatedEffortHours = 0;
  let weightedEffortScore = 0;
  let activeEffortHours = 0;
  let pausedEffortHours = 0;
  let blockedEffortHours = 0;
  let missingEstimateCount = 0;
  let estimatedTaskCount = 0;

  for (const task of input.tasks) {
    if (isClosedLifecycle(task.lifecycle)) {
      continue;
    }

    validateWorkloadTask(task, thresholds);

    openTaskCount += 1;

    if (task.execution === "ACTIVE") {
      activeTaskCount += 1;
    } else if (task.execution === "PAUSED") {
      pausedTaskCount += 1;
    } else if (task.execution === "BLOCKED") {
      blockedTaskCount += 1;
    }

    if (task.priority === "URGENT") {
      urgentTaskCount += 1;
    }

    if (task.deadline === "DUE_SOON") {
      dueSoonTaskCount += 1;
    } else if (task.deadline === "DUE_TODAY") {
      dueTodayTaskCount += 1;
    } else if (task.deadline === "OVERDUE") {
      overdueTaskCount += 1;
    }

    if (task.priority === "URGENT" && task.deadline === "OVERDUE") {
      urgentOverdueTaskCount += 1;
    }

    if (task.estimatedEffortHours === null) {
      missingEstimateCount += 1;
      continue;
    }

    estimatedTaskCount += 1;
    rawEstimatedEffortHours = assertFiniteCalculation(
      rawEstimatedEffortHours + task.estimatedEffortHours,
    );
    weightedEffortScore = assertFiniteCalculation(
      weightedEffortScore + task.estimatedEffortHours * task.workloadWeight,
    );

    if (task.execution === "ACTIVE") {
      activeEffortHours = assertFiniteCalculation(
        activeEffortHours + task.estimatedEffortHours,
      );
    } else if (task.execution === "PAUSED") {
      pausedEffortHours = assertFiniteCalculation(
        pausedEffortHours + task.estimatedEffortHours,
      );
    } else if (task.execution === "BLOCKED") {
      blockedEffortHours = assertFiniteCalculation(
        blockedEffortHours + task.estimatedEffortHours,
      );
    }
  }

  const assignedEffortHours = assertFiniteCalculation(
    activeEffortHours + pausedEffortHours + blockedEffortHours,
  );
  const workloadConfidence =
    missingEstimateCount === 0
      ? "COMPLETE"
      : estimatedTaskCount === 0
        ? "UNKNOWN"
        : "PARTIAL";
  const capacityEstimateBasis: CapacityEstimateBasis =
    workloadConfidence === "COMPLETE"
      ? "COMPLETE"
      : workloadConfidence === "PARTIAL"
        ? "KNOWN_EFFORT_LOWER_BOUND"
        : "UNAVAILABLE";
  const zeroCapacityWithAssignedWork =
    input.weeklyCapacityHours === 0 && assignedEffortHours > 0;
  const activeCapacityUsagePercent =
    capacityEstimateBasis === "UNAVAILABLE" || zeroCapacityWithAssignedWork
      ? null
      : calculateUsagePercent(activeEffortHours, input.weeklyCapacityHours);
  const assignedCapacityUsagePercent =
    capacityEstimateBasis === "UNAVAILABLE" || zeroCapacityWithAssignedWork
      ? null
      : calculateUsagePercent(assignedEffortHours, input.weeklyCapacityHours);
  const capacityLevel =
    capacityEstimateBasis === "UNAVAILABLE"
      ? "UNKNOWN"
      : calculateCapacityLevel(
          input.weeklyCapacityHours,
          assignedEffortHours,
          assignedCapacityUsagePercent,
          thresholds,
        );
  const warnings = new Set<WorkloadWarning>();

  if (missingEstimateCount === openTaskCount && openTaskCount > 0) {
    warnings.add("MISSING_EFFORT_ESTIMATES");
  } else if (missingEstimateCount > 0) {
    warnings.add("PARTIAL_EFFORT_ESTIMATE");
  }

  if (blockedTaskCount > 0) {
    warnings.add("BLOCKED_TASKS_PRESENT");
  }

  if (pausedTaskCount > 0) {
    warnings.add("PAUSED_TASKS_PRESENT");
  }

  if (urgentOverdueTaskCount > 0) {
    warnings.add("URGENT_OVERDUE_TASKS_PRESENT");
  }

  if (capacityLevel === "EXCEEDED") {
    warnings.add("CAPACITY_EXCEEDED");
  }

  if (zeroCapacityWithAssignedWork) {
    warnings.add("ZERO_CAPACITY_WITH_ASSIGNED_WORK");
  }

  return {
    weeklyCapacityHours: input.weeklyCapacityHours,
    openTaskCount,
    activeTaskCount,
    pausedTaskCount,
    blockedTaskCount,
    urgentTaskCount,
    dueSoonTaskCount,
    dueTodayTaskCount,
    overdueTaskCount,
    urgentOverdueTaskCount,
    rawEstimatedEffortHours,
    weightedEffortScore,
    activeEffortHours,
    pausedEffortHours,
    blockedEffortHours,
    missingEstimateCount,
    estimatedTaskCount,
    workloadConfidence,
    capacityEstimateBasis,
    activeCapacityUsagePercent,
    assignedCapacityUsagePercent,
    capacityLevel,
    deliveryRiskLevel: calculateDeliveryRisk(
      urgentOverdueTaskCount,
      overdueTaskCount,
      blockedTaskCount,
    ),
    warnings: [...warnings],
  };
}
