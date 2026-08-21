import "server-only";
import {
  DataQualityStatus,
  DataQualityAssessment,
  DomainApplicability,
  DomainApplicabilityStatus,
} from "../contracts/fact-and-quality-contracts";

export const AI_DATA_QUALITY_POLICY_V1 = {
  policyId: "AI_DATA_QUALITY_POLICY_V1",
  version: "1.0.0",
  status: "PROVISIONAL" as const,
  approvalStatus: "INTERNAL_DEFAULT" as const,
  effectiveFrom: "2026-08-21",
  source: "AI Internal Operational Baseline (Subject to Executive Approval)",
  thresholds: {
    REPORT_FRESHNESS_THRESHOLD_DAYS: 7,
    PROGRESS_FRESHNESS_THRESHOLD_DAYS: 14,
    MATERIAL_FRESHNESS_THRESHOLD_DAYS: 14,
    PENDING_AGED_THRESHOLD_DAYS: 7,
    PROGRESS_CONFLICT_TOLERANCE_PP: 5.0,
  },
} as const;

export const AI_SIGNAL_POLICY_V1 = {
  policyId: "AI_SIGNAL_POLICY_V1",
  version: "1.0.0",
  status: "PROVISIONAL" as const,
  approvalStatus: "INTERNAL_DEFAULT" as const,
  effectiveFrom: "2026-08-21",
  source: "AI Internal Operational Baseline",
  severityTiers: {
    OVERDUE_CRITICAL_DAYS: 90,
    OVERDUE_HIGH_DAYS: 30,
    OVERDUE_MEDIUM_DAYS: 7,
    PROGRESS_VARIANCE_CRITICAL_PP: -20.0,
    PROGRESS_VARIANCE_HIGH_PP: -10.0,
    PROGRESS_VARIANCE_MEDIUM_PP: -5.0,
    PENDING_AGED_HIGH_DAYS: 14,
    PENDING_AGED_MEDIUM_DAYS: 7,
  },
} as const;

export interface DataConflict {
  conflictCode: string;
  entity: string;
  property: string;
  values: Array<{ sourceName: string; value: string | number; asOf?: string }>;
  sourceIds: string[];
  severity: "WARNING" | "CRITICAL";
  detectedAt: string;
  message: string;
  comparability: {
    sameScope: boolean;
    compatibleTimeWindow: boolean;
    compatibleMeasurementBasis: boolean;
  };
}

export interface DomainQualityInput {
  domain: string;
  recordCount: number;
  lastUpdatedDate?: Date | null;
  hasInvalidFields?: boolean;
  conflicts?: DataConflict[];
  asOf: Date;
  freshnessThresholdDays: number;
  applicabilityStatus?: DomainApplicabilityStatus;
  applicabilityReason?: string;
  isOperationalZeroAllowed?: boolean; // When true, count === 0 means AVAILABLE_EMPTY (e.g. 0 pending items = healthy 0)
}

/**
 * Assesses the Data Quality status for a specific project business domain.
 *
 * Rules:
 * - NOT_CONFIGURED: Module/template has never been configured for this project -> NOT_CONFIGURED.
 * - NOT_APPLICABLE: Feature not applicable for this project category -> NOT_APPLICABLE.
 * - Invalid format/corrupted -> INVALID.
 * - Detected source conflicts -> CONFLICTING.
 * - count === 0 with isOperationalZeroAllowed === true -> AVAILABLE_EMPTY (Healthy 0, not missing).
 * - count === 0 without operational zero -> MISSING (Data gap).
 * - Exceeds freshness threshold -> STALE.
 * - Records exist and are fresh -> AVAILABLE.
 */
export function assessDomainDataQuality(input: DomainQualityInput): DataQualityAssessment {
  const asOfTime = input.asOf.getTime();
  const lastUpdatedIso = input.lastUpdatedDate ? input.lastUpdatedDate.toISOString() : undefined;
  const ageDays = input.lastUpdatedDate
    ? Math.max(0, Math.floor((asOfTime - input.lastUpdatedDate.getTime()) / 86_400_000))
    : undefined;

  const isStale = typeof ageDays === "number" && ageDays > input.freshnessThresholdDays;

  let status: DataQualityStatus = "MISSING";
  let notes = "Không có bản ghi nào trong hệ thống.";

  const applicability: DomainApplicability = {
    domain: input.domain,
    status: input.applicabilityStatus || "REQUIRED",
    reason: input.applicabilityReason || "Domain vận hành tiêu chuẩn cho công trình xây dựng.",
    source: "ERP_CONFIGURATION",
  };

  if (input.applicabilityStatus === "NOT_CONFIGURED") {
    status = "NOT_CONFIGURED";
    notes = "Hạng mục này chưa được cấu hình biểu mẫu hoặc mẫu theo dõi cho công trình.";
  } else if (input.applicabilityStatus === "NOT_APPLICABLE") {
    status = "NOT_APPLICABLE";
    notes = "Hạng mục này không áp dụng cho loại hình hoặc giai đoạn hiện tại của công trình.";
  } else if (input.hasInvalidFields) {
    status = "INVALID";
    notes = "Dữ liệu chứa trường không hợp lệ hoặc sai định dạng.";
  } else if (input.conflicts && input.conflicts.length > 0) {
    status = "CONFLICTING";
    notes = `Phát hiện ${input.conflicts.length} mâu thuẫn số liệu giữa các nguồn.`;
  } else if (input.recordCount === 0 && input.isOperationalZeroAllowed) {
    status = "AVAILABLE_EMPTY";
    notes = "Quy trình đang hoạt động bình thường, hiện tại không có hạng mục tồn đọng cần xử lý.";
  } else if (input.recordCount === 0) {
    status = "MISSING";
    notes = "Chưa có dữ liệu vận hành nào được ghi nhận cho hạng mục này.";
  } else if (isStale) {
    status = "STALE";
    notes = `Dữ liệu đã cũ (${ageDays} ngày trước, vượt ngưỡng ${input.freshnessThresholdDays} ngày).`;
  } else {
    status = "AVAILABLE";
    notes = `Dữ liệu tươi mới (cập nhật ${ageDays ?? 0} ngày trước, ${input.recordCount} bản ghi).`;
  }

  return {
    domain: input.domain,
    status,
    applicability,
    lastUpdated: lastUpdatedIso,
    ageDays,
    freshnessThresholdDays: input.freshnessThresholdDays,
    isStale,
    notes,
  };
}

export interface ProgressConflictCheckOptions {
  sameScope?: boolean;
  compatibleTimeWindow?: boolean;
  compatibleMeasurementBasis?: boolean;
}

/**
 * Deterministic Conflict Detection V2 with Comparability Gates
 *
 * Rules:
 * - Conflict is ONLY triggered if sources share the same entity scope, compatible time window, and measurement basis.
 * - If sources represent different WBS packages or measurement methods, it evaluates to NOT_COMPARABLE (no false conflict).
 */
export function detectProgressConflicts(
  projectId: string,
  approvedProgressPercent?: number | null,
  siteDiaryReportedPercent?: number | null,
  asOf = new Date(),
  options: ProgressConflictCheckOptions = {},
): DataConflict[] {
  const conflicts: DataConflict[] = [];
  const sameScope = options.sameScope ?? true;
  const compatibleTimeWindow = options.compatibleTimeWindow ?? true;
  const compatibleMeasurementBasis = options.compatibleMeasurementBasis ?? true;

  // Comparability Gate
  if (!sameScope || !compatibleTimeWindow || !compatibleMeasurementBasis) {
    return conflicts; // Sources are not directly comparable, avoid false positive conflict
  }

  const tolerance = AI_DATA_QUALITY_POLICY_V1.thresholds.PROGRESS_CONFLICT_TOLERANCE_PP;

  if (
    typeof approvedProgressPercent === "number" &&
    typeof siteDiaryReportedPercent === "number" &&
    Math.abs(approvedProgressPercent - siteDiaryReportedPercent) > tolerance
  ) {
    const diff = Math.round(Math.abs(approvedProgressPercent - siteDiaryReportedPercent) * 10) / 10;
    conflicts.push({
      conflictCode: "PROGRESS_DATA_CONFLICT",
      entity: "Project",
      property: "actualProgressPercentage",
      values: [
        {
          sourceName: "FieldProgressEntry (Phê duyệt chính thức)",
          value: approvedProgressPercent,
          asOf: asOf.toISOString(),
        },
        {
          sourceName: "SiteReport (Nhật ký hiện trường)",
          value: siteDiaryReportedPercent,
          asOf: asOf.toISOString(),
        },
      ],
      sourceIds: [`fieldProgress:${projectId}:approved`, `siteReport:${projectId}:latest`],
      severity: "WARNING",
      detectedAt: asOf.toISOString(),
      message: `Chênh lệch ${diff}% giữa tiến độ nghiệm thu chính thức (${approvedProgressPercent}%) và nhật ký công trường (${siteDiaryReportedPercent}%).`,
      comparability: {
        sameScope,
        compatibleTimeWindow,
        compatibleMeasurementBasis,
      },
    });
  }

  return conflicts;
}
