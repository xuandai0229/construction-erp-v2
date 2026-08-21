import "server-only";

export type MetricStatus = "AVAILABLE" | "UNAVAILABLE" | "ERROR";

export interface DerivedMetric<T = number | string | boolean> {
  metricCode: string;
  name: string;
  value: T | null;
  unit?: string;
  status: MetricStatus;
  formulaVersion: string;
  formulaDescription: string;
  inputEvidenceIds: string[];
  asOf: string;
}

export interface MetricInputData {
  asOf: Date;
  startDate?: Date | null;
  endDate?: Date | null;
  actualProgressPercentage?: number | null;
  plannedProgressPercentage?: number | null;
  latestProgressDate?: Date | null;
  latestSiteReportDate?: Date | null;
  oldestPendingCreatedAt?: Date | null;
  latestMaterialStockUpdate?: Date | null;
  lowStockItemsCount?: number | null;
}

/**
 * Derived Metric Engine — Deterministic Centralized Calculations
 * Version: derived-metric-engine-v1
 *
 * Rules:
 * 1. LLMs are NEVER permitted to calculate days or progress variances arbitrarily.
 * 2. If inputs are missing/null, status must be "UNAVAILABLE" (never substitute 0).
 * 3. Every metric maintains formula version, description, and input evidence IDs.
 */
export function calculateProjectDerivedMetrics(
  projectId: string,
  input: MetricInputData,
): Record<string, DerivedMetric> {
  const asOfTime = input.asOf.getTime();
  const asOfIso = input.asOf.toISOString();
  const metrics: Record<string, DerivedMetric> = {};

  // 1. Days to Deadline
  if (input.endDate instanceof Date && !isNaN(input.endDate.getTime())) {
    const days = Math.ceil((input.endDate.getTime() - asOfTime) / 86_400_000);
    metrics.daysToDeadline = {
      metricCode: "DAYS_TO_DEADLINE",
      name: "Số ngày đến hạn kết thúc",
      value: days,
      unit: "DAYS",
      status: "AVAILABLE",
      formulaVersion: "days-to-deadline-v1",
      formulaDescription: "ceil((endDate - asOf) / 86,400,000)",
      inputEvidenceIds: [`project:${projectId}:endDate`],
      asOf: asOfIso,
    };

    // 2. Schedule Overdue Days
    const overdueDays = days < 0 ? Math.abs(days) : 0;
    metrics.scheduleOverdueDays = {
      metricCode: "SCHEDULE_OVERDUE_DAYS",
      name: "Số ngày quá hạn kết thúc",
      value: overdueDays,
      unit: "DAYS",
      status: "AVAILABLE",
      formulaVersion: "schedule-overdue-v1",
      formulaDescription: "max(0, ceil((asOf - endDate) / 86,400,000))",
      inputEvidenceIds: [`project:${projectId}:endDate`],
      asOf: asOfIso,
    };
  } else {
    metrics.daysToDeadline = {
      metricCode: "DAYS_TO_DEADLINE",
      name: "Số ngày đến hạn kết thúc",
      value: null,
      unit: "DAYS",
      status: "UNAVAILABLE",
      formulaVersion: "days-to-deadline-v1",
      formulaDescription: "ceil((endDate - asOf) / 86,400,000)",
      inputEvidenceIds: [],
      asOf: asOfIso,
    };
    metrics.scheduleOverdueDays = {
      metricCode: "SCHEDULE_OVERDUE_DAYS",
      name: "Số ngày quá hạn kết thúc",
      value: null,
      unit: "DAYS",
      status: "UNAVAILABLE",
      formulaVersion: "schedule-overdue-v1",
      formulaDescription: "max(0, ceil((asOf - endDate) / 86,400,000))",
      inputEvidenceIds: [],
      asOf: asOfIso,
    };
  }

  // 3. Progress Variance (Percentage Points)
  if (
    typeof input.actualProgressPercentage === "number" &&
    typeof input.plannedProgressPercentage === "number"
  ) {
    const variance = Math.round((input.actualProgressPercentage - input.plannedProgressPercentage) * 10) / 10;
    metrics.progressVariancePercentagePoints = {
      metricCode: "PROGRESS_VARIANCE_PP",
      name: "Độ lệch tiến độ thực tế so với kế hoạch",
      value: variance,
      unit: "PERCENTAGE_POINTS",
      status: "AVAILABLE",
      formulaVersion: "progress-variance-v1",
      formulaDescription: "actualProgressPercentage - plannedProgressPercentage",
      inputEvidenceIds: [
        `project:${projectId}:actualProgress`,
        `project:${projectId}:plannedProgress`,
      ],
      asOf: asOfIso,
    };
  } else {
    metrics.progressVariancePercentagePoints = {
      metricCode: "PROGRESS_VARIANCE_PP",
      name: "Độ lệch tiến độ thực tế so với kế hoạch",
      value: null,
      unit: "PERCENTAGE_POINTS",
      status: "UNAVAILABLE",
      formulaVersion: "progress-variance-v1",
      formulaDescription: "actualProgressPercentage - plannedProgressPercentage",
      inputEvidenceIds: [],
      asOf: asOfIso,
    };
  }

  // 4. Latest Field Report Age (Days)
  if (input.latestSiteReportDate instanceof Date && !isNaN(input.latestSiteReportDate.getTime())) {
    const ageDays = Math.max(0, Math.floor((asOfTime - input.latestSiteReportDate.getTime()) / 86_400_000));
    metrics.latestFieldReportAgeDays = {
      metricCode: "LATEST_FIELD_REPORT_AGE_DAYS",
      name: "Số ngày kể từ nhật ký thi công gần nhất",
      value: ageDays,
      unit: "DAYS",
      status: "AVAILABLE",
      formulaVersion: "report-age-v1",
      formulaDescription: "floor((asOf - latestSiteReportDate) / 86,400,000)",
      inputEvidenceIds: [`siteReport:${projectId}:latest`],
      asOf: asOfIso,
    };
  } else {
    metrics.latestFieldReportAgeDays = {
      metricCode: "LATEST_FIELD_REPORT_AGE_DAYS",
      name: "Số ngày kể từ nhật ký thi công gần nhất",
      value: null,
      unit: "DAYS",
      status: "UNAVAILABLE",
      formulaVersion: "report-age-v1",
      formulaDescription: "floor((asOf - latestSiteReportDate) / 86,400,000)",
      inputEvidenceIds: [],
      asOf: asOfIso,
    };
  }

  // 5. Latest Progress Age (Days)
  if (input.latestProgressDate instanceof Date && !isNaN(input.latestProgressDate.getTime())) {
    const ageDays = Math.max(0, Math.floor((asOfTime - input.latestProgressDate.getTime()) / 86_400_000));
    metrics.latestProgressAgeDays = {
      metricCode: "LATEST_PROGRESS_AGE_DAYS",
      name: "Số ngày kể từ lần cập nhật tiến độ gần nhất",
      value: ageDays,
      unit: "DAYS",
      status: "AVAILABLE",
      formulaVersion: "progress-age-v1",
      formulaDescription: "floor((asOf - latestProgressDate) / 86,400,000)",
      inputEvidenceIds: [`fieldProgress:${projectId}:latest`],
      asOf: asOfIso,
    };
  } else {
    metrics.latestProgressAgeDays = {
      metricCode: "LATEST_PROGRESS_AGE_DAYS",
      name: "Số ngày kể từ lần cập nhật tiến độ gần nhất",
      value: null,
      unit: "DAYS",
      status: "UNAVAILABLE",
      formulaVersion: "progress-age-v1",
      formulaDescription: "floor((asOf - latestProgressDate) / 86,400,000)",
      inputEvidenceIds: [],
      asOf: asOfIso,
    };
  }

  // 6. Oldest Pending Item Age (Days)
  if (input.oldestPendingCreatedAt instanceof Date && !isNaN(input.oldestPendingCreatedAt.getTime())) {
    const ageDays = Math.max(0, Math.floor((asOfTime - input.oldestPendingCreatedAt.getTime()) / 86_400_000));
    metrics.oldestPendingItemAgeDays = {
      metricCode: "OLDEST_PENDING_ITEM_AGE_DAYS",
      name: "Số ngày tồn đọng của tờ trình/phê duyệt lâu nhất",
      value: ageDays,
      unit: "DAYS",
      status: "AVAILABLE",
      formulaVersion: "pending-age-v1",
      formulaDescription: "floor((asOf - oldestPendingCreatedAt) / 86,400,000)",
      inputEvidenceIds: [`approvalRequest:${projectId}:oldest`],
      asOf: asOfIso,
    };
  } else {
    metrics.oldestPendingItemAgeDays = {
      metricCode: "OLDEST_PENDING_ITEM_AGE_DAYS",
      name: "Số ngày tồn đọng của tờ trình/phê duyệt lâu nhất",
      value: null,
      unit: "DAYS",
      status: "UNAVAILABLE",
      formulaVersion: "pending-age-v1",
      formulaDescription: "floor((asOf - oldestPendingCreatedAt) / 86,400,000)",
      inputEvidenceIds: [],
      asOf: asOfIso,
    };
  }

  // 7. Low Stock Items Count
  if (typeof input.lowStockItemsCount === "number") {
    metrics.lowStockItemsCount = {
      metricCode: "LOW_STOCK_ITEMS_COUNT",
      name: "Số lượng vật tư hết hoặc dưới ngưỡng tối thiểu",
      value: input.lowStockItemsCount,
      unit: "ITEMS",
      status: "AVAILABLE",
      formulaVersion: "low-stock-count-v1",
      formulaDescription: "count(stock <= minStockLevel)",
      inputEvidenceIds: [`materialStock:${projectId}:lowStock`],
      asOf: asOfIso,
    };
  } else {
    metrics.lowStockItemsCount = {
      metricCode: "LOW_STOCK_ITEMS_COUNT",
      name: "Số lượng vật tư hết hoặc dưới ngưỡng tối thiểu",
      value: null,
      unit: "ITEMS",
      status: "UNAVAILABLE",
      formulaVersion: "low-stock-count-v1",
      formulaDescription: "count(stock <= minStockLevel)",
      inputEvidenceIds: [],
      asOf: asOfIso,
    };
  }

  return metrics;
}
