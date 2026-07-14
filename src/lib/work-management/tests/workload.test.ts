import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateWorkload,
  type WorkloadCalculationInput,
  type WorkloadResult,
  type WorkloadTaskInput,
} from "../domain/workload";
import { WorkManagementDomainError } from "../errors/codes";

const activeTask: WorkloadTaskInput = {
  workloadWeight: 1,
  estimatedEffortHours: 4,
  priority: "NORMAL",
  lifecycle: "IN_PROGRESS",
  deadline: "NOT_DUE",
  execution: "ACTIVE",
};

function expectWorkloadError(
  callback: () => unknown,
  code: WorkManagementDomainError["code"],
): void {
  assert.throws(callback, (error: unknown) => {
    return error instanceof WorkManagementDomainError && error.code === code;
  });
}

function assertFiniteResult(result: WorkloadResult): void {
  for (const [field, value] of Object.entries(result)) {
    if (typeof value === "number") {
      assert.ok(Number.isFinite(value), `${field} must be finite`);
    }
  }
}

test("rejects every invalid workload number with its workload error code", async (t) => {
  const cases: ReadonlyArray<{
    name: string;
    input: WorkloadCalculationInput;
    code: WorkManagementDomainError["code"];
  }> = [
    {
      name: "negative capacity",
      input: { weeklyCapacityHours: -1, tasks: [] },
      code: "WORKLOAD_CAPACITY_INVALID",
    },
    {
      name: "capacity NaN",
      input: { weeklyCapacityHours: Number.NaN, tasks: [] },
      code: "WORKLOAD_CAPACITY_INVALID",
    },
    {
      name: "capacity Infinity",
      input: { weeklyCapacityHours: Number.POSITIVE_INFINITY, tasks: [] },
      code: "WORKLOAD_CAPACITY_INVALID",
    },
    {
      name: "negative effort",
      input: { weeklyCapacityHours: 8, tasks: [{ ...activeTask, estimatedEffortHours: -1 }] },
      code: "WORKLOAD_EFFORT_INVALID",
    },
    {
      name: "effort NaN",
      input: { weeklyCapacityHours: 8, tasks: [{ ...activeTask, estimatedEffortHours: Number.NaN }] },
      code: "WORKLOAD_EFFORT_INVALID",
    },
    {
      name: "effort Infinity",
      input: { weeklyCapacityHours: 8, tasks: [{ ...activeTask, estimatedEffortHours: Number.POSITIVE_INFINITY }] },
      code: "WORKLOAD_EFFORT_INVALID",
    },
    {
      name: "negative weight",
      input: { weeklyCapacityHours: 8, tasks: [{ ...activeTask, workloadWeight: -1 }] },
      code: "WORKLOAD_WEIGHT_INVALID",
    },
    {
      name: "zero weight",
      input: { weeklyCapacityHours: 8, tasks: [{ ...activeTask, workloadWeight: 0 }] },
      code: "WORKLOAD_WEIGHT_INVALID",
    },
    {
      name: "weight NaN",
      input: { weeklyCapacityHours: 8, tasks: [{ ...activeTask, workloadWeight: Number.NaN }] },
      code: "WORKLOAD_WEIGHT_INVALID",
    },
    {
      name: "weight Infinity",
      input: { weeklyCapacityHours: 8, tasks: [{ ...activeTask, workloadWeight: Number.POSITIVE_INFINITY }] },
      code: "WORKLOAD_WEIGHT_INVALID",
    },
    {
      name: "weight above maxWeight",
      input: { weeklyCapacityHours: 8, thresholds: { maxWeight: 2 }, tasks: [{ ...activeTask, workloadWeight: 3 }] },
      code: "WORKLOAD_WEIGHT_INVALID",
    },
    {
      name: "maxWeight zero",
      input: { weeklyCapacityHours: 8, thresholds: { maxWeight: 0 }, tasks: [] },
      code: "WORKLOAD_THRESHOLD_INVALID",
    },
    {
      name: "maxWeight NaN",
      input: { weeklyCapacityHours: 8, thresholds: { maxWeight: Number.NaN }, tasks: [] },
      code: "WORKLOAD_THRESHOLD_INVALID",
    },
    {
      name: "maxWeight Infinity",
      input: { weeklyCapacityHours: 8, thresholds: { maxWeight: Number.POSITIVE_INFINITY }, tasks: [] },
      code: "WORKLOAD_THRESHOLD_INVALID",
    },
    {
      name: "negative high threshold",
      input: { weeklyCapacityHours: 8, thresholds: { highCapacityPercent: -1 }, tasks: [] },
      code: "WORKLOAD_THRESHOLD_INVALID",
    },
    {
      name: "high threshold NaN",
      input: { weeklyCapacityHours: 8, thresholds: { highCapacityPercent: Number.NaN }, tasks: [] },
      code: "WORKLOAD_THRESHOLD_INVALID",
    },
    {
      name: "high threshold Infinity",
      input: { weeklyCapacityHours: 8, thresholds: { highCapacityPercent: Number.POSITIVE_INFINITY }, tasks: [] },
      code: "WORKLOAD_THRESHOLD_INVALID",
    },
    {
      name: "full threshold below high",
      input: { weeklyCapacityHours: 8, thresholds: { highCapacityPercent: 80, fullCapacityPercent: 79 }, tasks: [] },
      code: "WORKLOAD_THRESHOLD_INVALID",
    },
    {
      name: "full threshold NaN",
      input: { weeklyCapacityHours: 8, thresholds: { fullCapacityPercent: Number.NaN }, tasks: [] },
      code: "WORKLOAD_THRESHOLD_INVALID",
    },
    {
      name: "full threshold Infinity",
      input: { weeklyCapacityHours: 8, thresholds: { fullCapacityPercent: Number.POSITIVE_INFINITY }, tasks: [] },
      code: "WORKLOAD_THRESHOLD_INVALID",
    },
  ];

  for (const invalidCase of cases) {
    await t.test(invalidCase.name, () => {
      expectWorkloadError(
        () => calculateWorkload(invalidCase.input),
        invalidCase.code,
      );
    });
  }
});

test("counts execution states before missing-estimate handling", () => {
  const activeMissing = calculateWorkload({
    weeklyCapacityHours: 8,
    tasks: [{ ...activeTask, estimatedEffortHours: null }],
  });
  assert.equal(activeMissing.activeTaskCount, 1);
  assert.equal(activeMissing.missingEstimateCount, 1);

  const pausedMissing = calculateWorkload({
    weeklyCapacityHours: 8,
    tasks: [{ ...activeTask, execution: "PAUSED", estimatedEffortHours: null }],
  });
  assert.equal(pausedMissing.pausedTaskCount, 1);
  assert.ok(pausedMissing.warnings.includes("PAUSED_TASKS_PRESENT"));

  const blockedMissing = calculateWorkload({
    weeklyCapacityHours: 8,
    tasks: [{ ...activeTask, execution: "BLOCKED", estimatedEffortHours: null }],
  });
  assert.equal(blockedMissing.blockedTaskCount, 1);
  assert.ok(blockedMissing.warnings.includes("BLOCKED_TASKS_PRESENT"));
});

test("correlates urgent and overdue status on the same task only", () => {
  const urgentOverdue = calculateWorkload({
    weeklyCapacityHours: 8,
    tasks: [{ ...activeTask, priority: "URGENT", deadline: "OVERDUE" }],
  });
  assert.equal(urgentOverdue.urgentOverdueTaskCount, 1);
  assert.ok(urgentOverdue.warnings.includes("URGENT_OVERDUE_TASKS_PRESENT"));
  assert.equal(urgentOverdue.deliveryRiskLevel, "HIGH");

  const unrelatedUrgentAndOverdue = calculateWorkload({
    weeklyCapacityHours: 8,
    tasks: [
      { ...activeTask, priority: "URGENT" },
      { ...activeTask, deadline: "OVERDUE" },
    ],
  });
  assert.equal(unrelatedUrgentAndOverdue.urgentOverdueTaskCount, 0);
  assert.ok(
    !unrelatedUrgentAndOverdue.warnings.includes("URGENT_OVERDUE_TASKS_PRESENT"),
  );
  assert.equal(unrelatedUrgentAndOverdue.deliveryRiskLevel, "ELEVATED");
});

test("keeps deadline counters separate", () => {
  const result = calculateWorkload({
    weeklyCapacityHours: 12,
    tasks: [
      { ...activeTask, deadline: "DUE_SOON" },
      { ...activeTask, deadline: "DUE_TODAY" },
      { ...activeTask, deadline: "OVERDUE" },
    ],
  });

  assert.equal(result.dueSoonTaskCount, 1);
  assert.equal(result.dueTodayTaskCount, 1);
  assert.equal(result.overdueTaskCount, 1);
});

test("handles zero capacity without non-finite output", () => {
  const noActiveEffort = calculateWorkload({
    weeklyCapacityHours: 0,
    tasks: [{ ...activeTask, execution: "PAUSED", estimatedEffortHours: 0 }],
  });
  assert.equal(noActiveEffort.activeCapacityUsagePercent, 0);
  assert.equal(noActiveEffort.assignedCapacityUsagePercent, 0);
  assert.equal(noActiveEffort.capacityLevel, "NORMAL");
  assert.ok(
    !noActiveEffort.warnings.includes("ZERO_CAPACITY_WITH_ASSIGNED_WORK"),
  );
  assertFiniteResult(noActiveEffort);

  const activeEffort = calculateWorkload({
    weeklyCapacityHours: 0,
    tasks: [activeTask],
  });
  assert.equal(activeEffort.activeCapacityUsagePercent, null);
  assert.equal(activeEffort.assignedCapacityUsagePercent, null);
  assert.equal(activeEffort.capacityLevel, "NO_CAPACITY");
  assert.ok(
    activeEffort.warnings.includes("ZERO_CAPACITY_WITH_ASSIGNED_WORK"),
  );
  assertFiniteResult(activeEffort);
});

test("derives assigned capacity level at every threshold boundary", () => {
  const levels: ReadonlyArray<{
    name: string;
    effort: number;
    expected: WorkloadResult["capacityLevel"];
  }> = [
    { name: "below high", effort: 79, expected: "NORMAL" },
    { name: "exactly high", effort: 80, expected: "HIGH" },
    { name: "between high and full", effort: 90, expected: "HIGH" },
    { name: "exactly full", effort: 100, expected: "AT_CAPACITY" },
    { name: "above full", effort: 101, expected: "EXCEEDED" },
  ];

  for (const level of levels) {
    const result = calculateWorkload({
      weeklyCapacityHours: 100,
      tasks: [{ ...activeTask, estimatedEffortHours: level.effort }],
    });
    assert.equal(result.capacityLevel, level.expected, level.name);
  }
});

test("separates active and assigned capacity usage", () => {
  const result = calculateWorkload({
    weeklyCapacityHours: 20,
    tasks: [
      { ...activeTask, estimatedEffortHours: 10 },
      { ...activeTask, execution: "PAUSED", estimatedEffortHours: 5 },
      { ...activeTask, execution: "BLOCKED", estimatedEffortHours: 5 },
    ],
  });

  assert.equal(result.activeCapacityUsagePercent, 50);
  assert.equal(result.assignedCapacityUsagePercent, 100);
  assert.equal(result.capacityLevel, "AT_CAPACITY");
});

test("reports complete, partial, and unknown estimate confidence", () => {
  const complete = calculateWorkload({ weeklyCapacityHours: 8, tasks: [activeTask] });
  const partial = calculateWorkload({
    weeklyCapacityHours: 8,
    tasks: [activeTask, { ...activeTask, estimatedEffortHours: null }],
  });
  const unknown = calculateWorkload({
    weeklyCapacityHours: 8,
    tasks: [{ ...activeTask, estimatedEffortHours: null }],
  });

  assert.equal(complete.workloadConfidence, "COMPLETE");
  assert.equal(partial.workloadConfidence, "PARTIAL");
  assert.equal(unknown.workloadConfidence, "UNKNOWN");
});

test("excludes closed tasks from workload, risk, and warnings", () => {
  const result = calculateWorkload({
    weeklyCapacityHours: 8,
    tasks: [
      { ...activeTask, lifecycle: "COMPLETED", estimatedEffortHours: 99, priority: "URGENT", deadline: "OVERDUE" },
      { ...activeTask, lifecycle: "CANCELLED", execution: "BLOCKED", estimatedEffortHours: 99 },
      { ...activeTask, lifecycle: "ARCHIVED", execution: "PAUSED", estimatedEffortHours: 99 },
    ],
  });

  assert.equal(result.openTaskCount, 0);
  assert.equal(result.rawEstimatedEffortHours, 0);
  assert.equal(result.assignedCapacityUsagePercent, 0);
  assert.equal(result.deliveryRiskLevel, "NORMAL");
  assert.deepEqual(result.warnings, []);
});

test("is order-independent, immutable, and deduplicates warnings", () => {
  const input: WorkloadCalculationInput = {
    weeklyCapacityHours: 12,
    thresholds: { highCapacityPercent: 75 },
    tasks: [
      { ...activeTask, execution: "BLOCKED", estimatedEffortHours: 3 },
      { ...activeTask, execution: "BLOCKED", estimatedEffortHours: 2 },
      { ...activeTask, execution: "PAUSED", estimatedEffortHours: 1 },
      { ...activeTask, execution: "PAUSED", estimatedEffortHours: 1 },
    ],
  };
  const original = structuredClone(input);
  const result = calculateWorkload(input);
  const reversed = calculateWorkload({ ...input, tasks: [...input.tasks].reverse() });

  assert.deepEqual(result, reversed);
  assert.deepEqual(input, original);
  assert.equal(
    result.warnings.filter((warning) => warning === "BLOCKED_TASKS_PRESENT").length,
    1,
  );
  assert.equal(
    result.warnings.filter((warning) => warning === "PAUSED_TASKS_PRESENT").length,
    1,
  );
  assertFiniteResult(result);
});

test("returns finite numeric output for empty, null-capacity, and all-closed input", () => {
  const results = [
    calculateWorkload({ weeklyCapacityHours: 8, tasks: [] }),
    calculateWorkload({ weeklyCapacityHours: null, tasks: [activeTask] }),
    calculateWorkload({
      weeklyCapacityHours: 8,
      tasks: [{ ...activeTask, lifecycle: "COMPLETED" }],
    }),
  ];

  for (const result of results) {
    assertFiniteResult(result);
  }
});

test("all-open missing estimates make capacity unavailable instead of normal", () => {
  const result = calculateWorkload({
    weeklyCapacityHours: 8,
    tasks: [{ ...activeTask, estimatedEffortHours: null }],
  });

  assert.equal(result.workloadConfidence, "UNKNOWN");
  assert.equal(result.capacityEstimateBasis, "UNAVAILABLE");
  assert.equal(result.activeCapacityUsagePercent, null);
  assert.equal(result.assignedCapacityUsagePercent, null);
  assert.equal(result.capacityLevel, "UNKNOWN");
  assert.ok(result.warnings.includes("MISSING_EFFORT_ESTIMATES"));
  assert.notEqual(result.capacityLevel, "NORMAL");
});

test("partial estimates expose a known-effort lower-bound capacity basis", () => {
  const result = calculateWorkload({
    weeklyCapacityHours: 8,
    tasks: [
      { ...activeTask, estimatedEffortHours: 4 },
      { ...activeTask, estimatedEffortHours: null },
    ],
  });

  assert.equal(result.workloadConfidence, "PARTIAL");
  assert.equal(result.capacityEstimateBasis, "KNOWN_EFFORT_LOWER_BOUND");
  assert.equal(result.activeCapacityUsagePercent, 50);
  assert.equal(result.assignedCapacityUsagePercent, 50);
  assert.ok(result.warnings.includes("PARTIAL_EFFORT_ESTIMATE"));
});

test("complete estimates use the complete capacity basis", () => {
  const result = calculateWorkload({ weeklyCapacityHours: 8, tasks: [activeTask] });

  assert.equal(result.workloadConfidence, "COMPLETE");
  assert.equal(result.capacityEstimateBasis, "COMPLETE");
});

test("floating-point values near the full threshold are at capacity", () => {
  const result = calculateWorkload({
    weeklyCapacityHours: 0.3,
    tasks: [{ ...activeTask, estimatedEffortHours: 0.30000000000000004 }],
  });

  assert.equal(result.capacityLevel, "AT_CAPACITY");
  assert.ok(!result.warnings.includes("CAPACITY_EXCEEDED"));
});

test("zero capacity with paused assigned effort is no-capacity", () => {
  const result = calculateWorkload({
    weeklyCapacityHours: 0,
    tasks: [{ ...activeTask, execution: "PAUSED", estimatedEffortHours: 2 }],
  });

  assert.equal(result.capacityLevel, "NO_CAPACITY");
  assert.equal(result.activeCapacityUsagePercent, null);
  assert.equal(result.assignedCapacityUsagePercent, null);
  assert.ok(result.warnings.includes("ZERO_CAPACITY_WITH_ASSIGNED_WORK"));
});

test("zero capacity with blocked assigned effort is no-capacity", () => {
  const result = calculateWorkload({
    weeklyCapacityHours: 0,
    tasks: [{ ...activeTask, execution: "BLOCKED", estimatedEffortHours: 2 }],
  });

  assert.equal(result.capacityLevel, "NO_CAPACITY");
  assert.equal(result.activeCapacityUsagePercent, null);
  assert.equal(result.assignedCapacityUsagePercent, null);
  assert.ok(result.warnings.includes("ZERO_CAPACITY_WITH_ASSIGNED_WORK"));
});

test("weighted score remains separate from capacity-hours usage", () => {
  const result = calculateWorkload({
    weeklyCapacityHours: 10,
    tasks: [{ ...activeTask, estimatedEffortHours: 5, workloadWeight: 2 }],
  });

  assert.equal(result.rawEstimatedEffortHours, 5);
  assert.equal(result.weightedEffortScore, 10);
  assert.equal(result.activeCapacityUsagePercent, 50);
  assert.equal(result.assignedCapacityUsagePercent, 50);
});

test("exceeded assigned capacity emits its dedicated warning", () => {
  const result = calculateWorkload({
    weeklyCapacityHours: 10,
    tasks: [{ ...activeTask, estimatedEffortHours: 11 }],
  });

  assert.equal(result.capacityLevel, "EXCEEDED");
  assert.ok(result.warnings.includes("CAPACITY_EXCEEDED"));
});

test("closed legacy tasks bypass workload numeric validation", () => {
  const result = calculateWorkload({
    weeklyCapacityHours: 8,
    tasks: [
      {
        ...activeTask,
        lifecycle: "COMPLETED",
        estimatedEffortHours: Number.NaN,
        workloadWeight: 0,
      },
    ],
  });

  assert.equal(result.openTaskCount, 0);
  assert.equal(result.workloadConfidence, "COMPLETE");
  assert.equal(result.capacityLevel, "NORMAL");
});
