import "server-only";
import { DerivedMetric } from "./derived-metric-engine";
import { DataConflict } from "./data-quality-engine";
import { DataQualityAssessment } from "../contracts/fact-and-quality-contracts";

export type SignalCategory = "SCHEDULE" | "PROGRESS" | "MATERIAL" | "APPROVAL" | "DATA_QUALITY";
export type SignalType = "BUSINESS_RISK" | "DATA_QUALITY";
export type SignalSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ConstructionSignal {
  signalCode: string;
  category: SignalCategory;
  signalType: SignalType;
  severity: SignalSeverity;
  projectId: string;
  title: string;
  explanationCode: string;
  derivedMetricIds: string[];
  evidenceIds: string[];
  thresholdVersion: string;
  asOf: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  summary: string;
}

export interface SignalEngineInput {
  projectId: string;
  projectCode: string;
  projectName: string;
  derivedMetrics: Record<string, DerivedMetric>;
  qualityAssessments: Record<string, DataQualityAssessment>;
  conflicts: DataConflict[];
  asOf: Date;
}

const SIGNAL_THRESHOLD_VERSION = "construction-signal-rules-v1";

/**
 * Deterministic Construction Signal Engine V1
 *
 * Enforces absolute separation between:
 * 1. BUSINESS_RISK: Genuine schedule delays, progress slips, material shortages, aged approvals.
 * 2. DATA_QUALITY: Missing reports, missing progress, stale stock, data discrepancies.
 *
 * Severity is strictly computed using centralized threshold rules; LLMs NEVER decide severity.
 */
export function evaluateConstructionSignals(input: SignalEngineInput): ConstructionSignal[] {
  const signals: ConstructionSignal[] = [];
  const asOfIso = input.asOf.toISOString();
  const { projectId, derivedMetrics, qualityAssessments, conflicts } = input;

  // -------------------------------------------------------------
  // 1. BUSINESS RISKS (Thực trạng Rủi ro Dự án Thực tế)
  // -------------------------------------------------------------

  // 1.1. Schedule Overdue Signal
  const overdueMetric = derivedMetrics.scheduleOverdueDays;
  if (overdueMetric && overdueMetric.status === "AVAILABLE" && typeof overdueMetric.value === "number") {
    const overdueDays = overdueMetric.value;
    if (overdueDays > 0) {
      let severity: SignalSeverity = "LOW";
      if (overdueDays > 90) severity = "CRITICAL";
      else if (overdueDays > 30) severity = "HIGH";
      else if (overdueDays > 7) severity = "MEDIUM";

      signals.push({
        signalCode: "PROJECT_OVERDUE",
        category: "SCHEDULE",
        signalType: "BUSINESS_RISK",
        severity,
        projectId,
        title: `Công trình đã quá hạn ${overdueDays} ngày`,
        explanationCode: "SCHEDULE_OVERDUE_EXCEEDED",
        derivedMetricIds: ["SCHEDULE_OVERDUE_DAYS"],
        evidenceIds: overdueMetric.inputEvidenceIds,
        thresholdVersion: SIGNAL_THRESHOLD_VERSION,
        asOf: asOfIso,
        confidence: "HIGH",
        summary: `Hạn kết thúc của dự án đã qua ${overdueDays} ngày so với ngày bàn giao dự kiến.`,
      });
    }
  }

  // 1.2. Progress Variance Signal (Chậm tiến độ so với kế hoạch)
  const varianceMetric = derivedMetrics.progressVariancePercentagePoints;
  if (varianceMetric && varianceMetric.status === "AVAILABLE" && typeof varianceMetric.value === "number") {
    const variance = varianceMetric.value;
    if (variance < -5.0) {
      let severity: SignalSeverity = "LOW";
      if (variance < -20.0) severity = "CRITICAL";
      else if (variance < -10.0) severity = "HIGH";
      else severity = "MEDIUM";

      signals.push({
        signalCode: "PROGRESS_BEHIND_PLAN",
        category: "PROGRESS",
        signalType: "BUSINESS_RISK",
        severity,
        projectId,
        title: `Tiến độ thực tế chậm ${Math.abs(variance)}% so với kế hoạch`,
        explanationCode: "PROGRESS_VARIANCE_NEGATIVE",
        derivedMetricIds: ["PROGRESS_VARIANCE_PP"],
        evidenceIds: varianceMetric.inputEvidenceIds,
        thresholdVersion: SIGNAL_THRESHOLD_VERSION,
        asOf: asOfIso,
        confidence: "HIGH",
        summary: `Tiến độ thực tế thấp hơn kế hoạch được duyệt ${Math.abs(variance)} điểm phần trăm.`,
      });
    }
  }

  // 1.3. Aged Pending Approval Signal (Tờ trình tồn đọng lâu)
  const pendingAgeMetric = derivedMetrics.oldestPendingItemAgeDays;
  if (pendingAgeMetric && pendingAgeMetric.status === "AVAILABLE" && typeof pendingAgeMetric.value === "number") {
    const age = pendingAgeMetric.value;
    if (age > 7) {
      const severity: SignalSeverity = age > 14 ? "HIGH" : "MEDIUM";
      signals.push({
        signalCode: "AGED_PENDING_DECISION",
        category: "APPROVAL",
        signalType: "BUSINESS_RISK",
        severity,
        projectId,
        title: `Có phê duyệt/tờ trình tồn đọng ${age} ngày`,
        explanationCode: "PENDING_APPROVAL_OVERDUE",
        derivedMetricIds: ["OLDEST_PENDING_ITEM_AGE_DAYS"],
        evidenceIds: pendingAgeMetric.inputEvidenceIds,
        thresholdVersion: SIGNAL_THRESHOLD_VERSION,
        asOf: asOfIso,
        confidence: "HIGH",
        summary: `Tồn tại hạng mục tờ trình đang chờ phê duyệt quá ${age} ngày chưa có kết quả xử lý.`,
      });
    }
  }

  // 1.4. Material Low Stock Signal (Thiếu hụt vật tư)
  const lowStockMetric = derivedMetrics.lowStockItemsCount;
  if (lowStockMetric && lowStockMetric.status === "AVAILABLE" && typeof lowStockMetric.value === "number") {
    const lowCount = lowStockMetric.value;
    if (lowCount > 0) {
      const severity: SignalSeverity = lowCount >= 3 ? "HIGH" : "MEDIUM";
      signals.push({
        signalCode: "MATERIAL_SHORTAGE",
        category: "MATERIAL",
        signalType: "BUSINESS_RISK",
        severity,
        projectId,
        title: `Có ${lowCount} loại vật tư chạm ngưỡng tối thiểu hoặc hết hàng`,
        explanationCode: "MATERIAL_STOCK_BELOW_MINIMUM",
        derivedMetricIds: ["LOW_STOCK_ITEMS_COUNT"],
        evidenceIds: lowStockMetric.inputEvidenceIds,
        thresholdVersion: SIGNAL_THRESHOLD_VERSION,
        asOf: asOfIso,
        confidence: "HIGH",
        summary: `Có ${lowCount} vật tư tại công trình đang có lượng tồn thực tế nhỏ hơn hoặc bằng định mức an toàn.`,
      });
    }
  }

  // -------------------------------------------------------------
  // 2. DATA QUALITY SIGNALS (Khoảng trống / Độ tin cậy Dữ liệu)
  // -------------------------------------------------------------

  // 2.1. Missing Progress Signal
  const progressQuality = qualityAssessments.progress;
  if (progressQuality && progressQuality.status === "MISSING") {
    signals.push({
      signalCode: "MISSING_PROGRESS",
      category: "DATA_QUALITY",
      signalType: "DATA_QUALITY",
      severity: "LOW",
      projectId,
      title: "Chưa có dữ liệu tiến độ thi công",
      explanationCode: "PROGRESS_DATA_NOT_RECORDED",
      derivedMetricIds: [],
      evidenceIds: [],
      thresholdVersion: SIGNAL_THRESHOLD_VERSION,
      asOf: asOfIso,
      confidence: "HIGH",
      summary: "Công trình chưa có dữ liệu tiến độ thực tế được nhập trên hệ thống ERP.",
    });
  }

  // 2.2. No Recent Field Report / Missing Field Report
  const reportQuality = qualityAssessments.fieldActivity;
  if (reportQuality) {
    if (reportQuality.status === "MISSING") {
      signals.push({
        signalCode: "NO_FIELD_REPORTS",
        category: "DATA_QUALITY",
        signalType: "DATA_QUALITY",
        severity: "LOW",
        projectId,
        title: "Chưa có nhật ký thi công nào",
        explanationCode: "FIELD_REPORTS_NOT_FOUND",
        derivedMetricIds: [],
        evidenceIds: [],
        thresholdVersion: SIGNAL_THRESHOLD_VERSION,
        asOf: asOfIso,
        confidence: "HIGH",
        summary: "Công trình chưa từng có nhật ký thi công nào được lập.",
      });
    } else if (reportQuality.status === "STALE") {
      const reportAge = derivedMetrics.latestFieldReportAgeDays?.value ?? reportQuality.ageDays ?? 7;
      signals.push({
        signalCode: "NO_RECENT_FIELD_REPORT",
        category: "DATA_QUALITY",
        signalType: "DATA_QUALITY",
        severity: "MEDIUM",
        projectId,
        title: `Nhật ký thi công chưa cập nhật trong ${reportAge} ngày`,
        explanationCode: "FIELD_REPORT_STALE",
        derivedMetricIds: ["LATEST_FIELD_REPORT_AGE_DAYS"],
        evidenceIds: [`siteReport:${projectId}:latest`],
        thresholdVersion: SIGNAL_THRESHOLD_VERSION,
        asOf: asOfIso,
        confidence: "HIGH",
        summary: `Nhật ký công trường đã không được cập nhật trong ${reportAge} ngày qua (ngưỡng an toàn: 7 ngày).`,
      });
    }
  }

  // 2.3. Missing Material Stock Signal
  const materialQuality = qualityAssessments.materials;
  if (materialQuality && materialQuality.status === "MISSING") {
    signals.push({
      signalCode: "MISSING_MATERIAL_DATA",
      category: "DATA_QUALITY",
      signalType: "DATA_QUALITY",
      severity: "LOW",
      projectId,
      title: "Chưa có dữ liệu theo dõi kho vật tư",
      explanationCode: "MATERIAL_DATA_NOT_RECORDED",
      derivedMetricIds: [],
      evidenceIds: [],
      thresholdVersion: SIGNAL_THRESHOLD_VERSION,
      asOf: asOfIso,
      confidence: "HIGH",
      summary: "Dữ liệu tồn kho công trình chưa được thiết lập (danh mục dùng chung không được dùng làm số tồn thay thế).",
    });
  }

  // 2.4. Conflicting Progress Signal
  if (conflicts && conflicts.length > 0) {
    for (const conflict of conflicts) {
      signals.push({
        signalCode: "CONFLICTING_PROGRESS",
        category: "DATA_QUALITY",
        signalType: "DATA_QUALITY",
        severity: "HIGH",
        projectId,
        title: "Bất đồng số liệu tiến độ giữa các nguồn",
        explanationCode: "DATA_CONFLICT_DETECTED",
        derivedMetricIds: [],
        evidenceIds: conflict.sourceIds,
        thresholdVersion: SIGNAL_THRESHOLD_VERSION,
        asOf: asOfIso,
        confidence: "HIGH",
        summary: conflict.message,
      });
    }
  }

  return signals;
}

export interface DeterministicActionSuggestion {
  signalCode: string;
  category: SignalCategory;
  suggestionText: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  provenanceType: "DETERMINISTIC_ACTION_SUGGESTION";
  ruleReference: string;
}

/**
 * Deterministic Action Suggestion Generator
 * Produces structured, provenance-tagged suggestions from deterministic signals without invoking an LLM.
 */
export function generateDeterministicActionSuggestions(
  signals: ConstructionSignal[],
): DeterministicActionSuggestion[] {
  const suggestions: DeterministicActionSuggestion[] = [];

  for (const s of signals) {
    if (s.signalCode === "PROJECT_OVERDUE") {
      suggestions.push({
        signalCode: s.signalCode,
        category: "SCHEDULE",
        suggestionText: "Rà soát nguyên nhân quá hạn, kế hoạch phục hồi tiến độ và căn cứ cho phương án xử lý thời hạn.",
        priority: "HIGH",
        provenanceType: "DETERMINISTIC_ACTION_SUGGESTION",
        ruleReference: "REVIEW_SCHEDULE_RECOVERY",
      });
    } else if (s.signalCode === "PROGRESS_BEHIND_PLAN") {
      suggestions.push({
        signalCode: s.signalCode,
        category: "PROGRESS",
        suggestionText: "Tổ chức họp giao ban hiện trường để bổ sung nhân lực/thiết bị bù tiến độ chậm.",
        priority: "HIGH",
        provenanceType: "DETERMINISTIC_ACTION_SUGGESTION",
        ruleReference: "RULE_PROGRESS_COMPENSATION_PLAN",
      });
    } else if (s.signalCode === "AGED_PENDING_DECISION") {
      suggestions.push({
        signalCode: s.signalCode,
        category: "APPROVAL",
        suggestionText: "Đôn đốc cấp có thẩm quyền phê duyệt các tờ trình/đề xuất đang tồn đọng.",
        priority: "MEDIUM",
        provenanceType: "DETERMINISTIC_ACTION_SUGGESTION",
        ruleReference: "RULE_EXPEDITE_PENDING_APPROVALS",
      });
    } else if (s.signalCode === "MATERIAL_SHORTAGE") {
      suggestions.push({
        signalCode: s.signalCode,
        category: "MATERIAL",
        suggestionText: "Phát hành phiếu yêu cầu cấp bổ sung vật tư để tránh gián đoạn thi công.",
        priority: "HIGH",
        provenanceType: "DETERMINISTIC_ACTION_SUGGESTION",
        ruleReference: "RULE_REPLENISH_CRITICAL_STOCK",
      });
    } else if (s.signalCode === "NO_RECENT_FIELD_REPORT" || s.signalCode === "NO_FIELD_REPORTS") {
      suggestions.push({
        signalCode: s.signalCode,
        category: "DATA_QUALITY",
        suggestionText: "Yêu cầu kỹ sư công trường cập nhật nhật ký thi công hàng ngày lên hệ thống.",
        priority: "LOW",
        provenanceType: "DETERMINISTIC_ACTION_SUGGESTION",
        ruleReference: "RULE_REQUIRE_FIELD_REPORT_UPDATE",
      });
    } else if (s.signalCode === "MISSING_PROGRESS") {
      suggestions.push({
        signalCode: s.signalCode,
        category: "DATA_QUALITY",
        suggestionText: "Thiết lập danh mục công việc và cập nhật sản lượng nghiệm thu thực tế.",
        priority: "LOW",
        provenanceType: "DETERMINISTIC_ACTION_SUGGESTION",
        ruleReference: "RULE_INITIATE_PROGRESS_TRACKING",
      });
    }
  }

  return suggestions;
}
