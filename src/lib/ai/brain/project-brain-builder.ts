import "server-only";
import { AIRequestContext, AISource } from "../types";
import { executeAIToolGateway } from "../gateway/ai-tool-gateway";
import { calculateProjectDerivedMetrics, DerivedMetric } from "./derived-metric-engine";
import {
  assessDomainDataQuality,
  detectProgressConflicts,
  DataConflict,
  AI_DATA_QUALITY_POLICY_V1,
} from "./data-quality-engine";
import { evaluateConstructionSignals, ConstructionSignal } from "./construction-signal-engine";
import { DataQualityAssessment } from "../contracts/fact-and-quality-contracts";
import { AIApplicationError } from "../errors";

export interface EvidenceNode {
  evidenceId: string;
  sourceType: string;
  recordId: string;
  projectId: string;
  field?: string;
  valueSummary: string;
  asOf: string;
  route?: string;
  authorizationClassification: "READ_SAFE" | "READ_SENSITIVE";
  provenanceType: "ERP_FACT" | "DERIVED_METRIC" | "DETERMINISTIC_ACTION_SUGGESTION";
}

export interface EvidenceEdge {
  fromId: string;
  toId: string;
  relationship: string;
}

export interface EvidenceGraph {
  nodes: EvidenceNode[];
  edges: EvidenceEdge[];
}

export interface ProjectIntelligenceSnapshot {
  project: {
    id: string;
    code: string;
    name: string;
    displayName?: string | null;
    status: string;
    location?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  };
  people: {
    memberCount: number;
    members: Array<{ userId: string; name: string; role: string; phone?: string | null }>;
  };
  schedule: {
    status: string;
    daysToDeadline: number | null;
    isOverdue: boolean;
    overdueDays: number;
  };
  progress: {
    status: string;
    actualPercentage: number | null;
    plannedPercentage: number | null;
    variancePercentagePoints: number | null;
    lastUpdated?: string;
  };
  fieldActivity: {
    status: string;
    latestReportDate?: string;
    ageDays?: number;
    recentReportsCount: number;
  };
  materials: {
    status: string;
    trackedItemsCount: number;
    lowStockItemsCount: number;
  };
  pending: {
    status: string;
    pendingCount: number;
    oldestPendingAgeDays?: number;
  };
  dataQuality: Record<string, DataQualityAssessment>;
  derivedMetrics: Record<string, DerivedMetric>;
  signals: ConstructionSignal[];
  conflicts: DataConflict[];
  evidenceGraph: EvidenceGraph;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT_DATA";
  asOf: string;
}

/**
 * Calculates Deterministic Confidence of the Project Intelligence Snapshot.
 * Formula: based on authoritative data coverage, presence of conflicts, and freshness.
 */
function calculateSnapshotConfidence(
  qualityMap: Record<string, DataQualityAssessment>,
  conflicts: DataConflict[],
): "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT_DATA" {
  if (conflicts.length > 0) return "MEDIUM";

  let availableCount = 0;
  let missingCount = 0;

  const domains = ["progress", "fieldActivity", "materials", "pending"];
  for (const dom of domains) {
    const q = qualityMap[dom];
    if (q?.status === "AVAILABLE") availableCount++;
    else if (q?.status === "MISSING") missingCount++;
  }

  if (availableCount >= 3) return "HIGH";
  if (availableCount >= 1) return "MEDIUM";
  if (missingCount >= 3) return "INSUFFICIENT_DATA";
  return "LOW";
}

/**
 * Builds Project Brain Snapshot V1 for an authorized project.
 *
 * Rules:
 * 1. Consumes already-authorized tools via executeAIToolGateway.
 * 2. Assembles 5 layers deterministically (Facts -> Derived Metrics -> Data Quality -> Signals -> Evidence Graph).
 * 3. Never writes synthetic records or duplicates PostgreSQL tables.
 */
export async function buildProjectIntelligenceSnapshot(
  projectId: string,
  context: AIRequestContext,
  asOf = new Date(),
): Promise<ProjectIntelligenceSnapshot> {
  const asOfIso = asOf.toISOString();

  // 1. Fetch Project Core Facts & Summary via Gateway
  const summaryRes = await executeAIToolGateway({
    toolName: "get_project_summary",
    input: { projectId },
    explicitContext: context,
  });

  const summaryData = summaryRes.success ? (summaryRes.data as any) : null;
  if (!summaryRes.success || !summaryData?.id) {
    throw new AIApplicationError(
      (summaryRes.error?.code as any) || "PROJECT_NOT_FOUND",
      summaryRes.error?.message || "Không thể truy cập dữ liệu công trình.",
      404,
    );
  }

  const proj = summaryData;
  const members = summaryData.members || [];
  const progressData = summaryData.actualProgress;
  const projectEndDate = proj.endDate ? new Date(proj.endDate) : null;
  const projectStartDate = proj.startDate ? new Date(proj.startDate) : null;

  // 2. Fetch Field Activity, Materials, Pending Items in Parallel via Gateway
  const [fieldReportRes, materialRes, pendingRes] = await Promise.all([
    executeAIToolGateway({
      toolName: "get_latest_field_reports",
      input: { projectId, limit: 5 },
      explicitContext: context,
    }),
    executeAIToolGateway({
      toolName: "get_project_material_summary",
      input: { projectId },
      explicitContext: context,
    }),
    executeAIToolGateway({
      toolName: "get_pending_items",
      input: { projectId },
      explicitContext: context,
    }),
  ]);

  const fieldReportData = fieldReportRes.success ? (fieldReportRes.data as any) : null;
  const fieldReports = Array.isArray(fieldReportData?.reports)
    ? fieldReportData.reports
    : Array.isArray(fieldReportData)
      ? fieldReportData
      : [];
  const latestReport = fieldReports[0];
  const latestReportDate = latestReport?.reportDate ? new Date(latestReport.reportDate) : null;

  const materialData = materialRes.success ? (materialRes.data as any) : null;
  const materialItems = Array.isArray(materialData?.items)
    ? materialData.items
    : Array.isArray(materialData)
      ? materialData
      : [];
  const lowStockCount = materialItems.filter((item: any) => item.status === "OUT_OF_STOCK" || item.status === "LOW_STOCK" || item.stockStatus !== "AVAILABLE").length;

  const pendingData = pendingRes.success ? (pendingRes.data as any) : null;
  const pendingItems = Array.isArray(pendingData?.items)
    ? pendingData.items
    : Array.isArray(pendingData)
      ? pendingData
      : [];
  const oldestPending = pendingItems.length > 0
    ? pendingItems.reduce((oldest: any, item: any) => {
        const itemDate = new Date(item.submittedDate || item.createdAt);
        const oldestDate = new Date(oldest.submittedDate || oldest.createdAt);
        return itemDate < oldestDate ? item : oldest;
      }, pendingItems[0])
    : null;
  const oldestPendingDate = oldestPending?.submittedDate || oldestPending?.createdAt
    ? new Date(oldestPending.submittedDate || oldestPending.createdAt)
    : null;

  // 3. Layer 2: Derived Metric Engine
  const derivedMetrics = calculateProjectDerivedMetrics(projectId, {
    asOf,
    startDate: projectStartDate,
    endDate: projectEndDate,
    actualProgressPercentage: progressData?.actualPercentage ?? null,
    plannedProgressPercentage: progressData?.plannedPercentage ?? null,
    latestProgressDate: progressData?.lastUpdated ? new Date(progressData.lastUpdated) : null,
    latestSiteReportDate: latestReportDate,
    oldestPendingCreatedAt: oldestPendingDate,
    lowStockItemsCount: materialItems.length > 0 ? lowStockCount : null,
  });

  // 4. Layer 3: Data Quality & Conflict Detection
  const conflicts = detectProgressConflicts(
    projectId,
    progressData?.actualPercentage,
    latestReport?.reportedProgressPercentage,
    asOf,
  );

  const qualityAssessments: Record<string, DataQualityAssessment> = {
    schedule: assessDomainDataQuality({
      domain: "SCHEDULE",
      recordCount: projectEndDate ? 1 : 0,
      lastUpdatedDate: proj.updatedAt ? new Date(proj.updatedAt) : null,
      asOf,
      freshnessThresholdDays: 30,
    }),
    progress: assessDomainDataQuality({
      domain: "PROGRESS",
      recordCount: progressData?.actualPercentage !== undefined && progressData?.actualPercentage !== null ? 1 : 0,
      lastUpdatedDate: progressData?.lastUpdated ? new Date(progressData.lastUpdated) : null,
      conflicts,
      asOf,
      freshnessThresholdDays: AI_DATA_QUALITY_POLICY_V1.thresholds.PROGRESS_FRESHNESS_THRESHOLD_DAYS,
    }),
    fieldActivity: assessDomainDataQuality({
      domain: "FIELD_ACTIVITY",
      recordCount: fieldReports.length,
      lastUpdatedDate: latestReportDate,
      asOf,
      freshnessThresholdDays: AI_DATA_QUALITY_POLICY_V1.thresholds.REPORT_FRESHNESS_THRESHOLD_DAYS,
    }),
    materials: assessDomainDataQuality({
      domain: "MATERIAL_STOCK",
      recordCount: materialItems.length,
      lastUpdatedDate: materialItems[0]?.lastUpdated ? new Date(materialItems[0].lastUpdated) : null,
      asOf,
      freshnessThresholdDays: AI_DATA_QUALITY_POLICY_V1.thresholds.MATERIAL_FRESHNESS_THRESHOLD_DAYS,
    }),
    pending: assessDomainDataQuality({
      domain: "PENDING_APPROVALS",
      recordCount: pendingItems.length,
      lastUpdatedDate: oldestPendingDate,
      asOf,
      freshnessThresholdDays: AI_DATA_QUALITY_POLICY_V1.thresholds.PENDING_AGED_THRESHOLD_DAYS,
      isOperationalZeroAllowed: pendingRes.success,
    }),
  };

  // 5. Layer 4: Construction Signal Engine
  const signals = evaluateConstructionSignals({
    projectId,
    projectCode: proj.code,
    projectName: proj.name,
    derivedMetrics,
    qualityAssessments,
    conflicts,
    asOf,
  });

  // 6. Layer 5: Evidence Graph Assembly
  const nodes: EvidenceNode[] = [
    {
      evidenceId: `project:${projectId}:endDate`,
      sourceType: "PROJECT_RECORD",
      recordId: projectId,
      projectId,
      field: "endDate",
      valueSummary: proj.endDate ? `Hạn kết thúc: ${new Date(proj.endDate).toLocaleDateString("vi-VN")}` : "Chưa có hạn",
      asOf: asOfIso,
      route: `/projects/${projectId}`,
      authorizationClassification: "READ_SAFE",
      provenanceType: "ERP_FACT",
    },
  ];

  const edges: EvidenceEdge[] = [];

  if (latestReport) {
    const reportEvidenceId = `siteReport:${projectId}:${latestReport.id}`;
    nodes.push({
      evidenceId: reportEvidenceId,
      sourceType: "SITE_REPORT",
      recordId: latestReport.id,
      projectId,
      field: "reportDate",
      valueSummary: `Nhật ký ${latestReport.reportDate}: ${latestReport.summary || "Báo cáo ngày"}`,
      asOf: asOfIso,
      route: `/projects/${projectId}/reports/${latestReport.id}`,
      authorizationClassification: "READ_SAFE",
      provenanceType: "ERP_FACT",
    });
    edges.push({
      fromId: `project:${projectId}:id`,
      toId: reportEvidenceId,
      relationship: "HAS_LATEST_REPORT",
    });
  }

  // Link signals to evidence nodes
  for (const sig of signals) {
    for (const evidId of sig.evidenceIds) {
      edges.push({
        fromId: `signal:${sig.signalCode}:${projectId}`,
        toId: evidId,
        relationship: "SUPPORTED_BY",
      });
    }
  }

  const confidence = calculateSnapshotConfidence(qualityAssessments, conflicts);

  return {
    project: {
      id: proj.id,
      code: proj.code,
      name: proj.name,
      displayName: proj.displayName,
      status: proj.status,
      location: proj.location,
      startDate: proj.startDate,
      endDate: proj.endDate,
    },
    people: {
      memberCount: members.length,
      members: members.map((m: any) => ({
        userId: m.userId || m.id,
        name: m.name || m.user?.name || "Thành viên",
        role: m.role || "MEMBER",
        phone: m.phone || m.user?.phone,
      })),
    },
    schedule: {
      status: qualityAssessments.schedule.status,
      daysToDeadline: derivedMetrics.daysToDeadline?.value as number | null,
      isOverdue: (derivedMetrics.scheduleOverdueDays?.value as number) > 0,
      overdueDays: (derivedMetrics.scheduleOverdueDays?.value as number) || 0,
    },
    progress: {
      status: qualityAssessments.progress.status,
      actualPercentage: progressData?.actualPercentage ?? null,
      plannedPercentage: progressData?.plannedPercentage ?? null,
      variancePercentagePoints: derivedMetrics.progressVariancePercentagePoints?.value as number | null,
      lastUpdated: progressData?.lastUpdated,
    },
    fieldActivity: {
      status: qualityAssessments.fieldActivity.status,
      latestReportDate: latestReport?.reportDate,
      ageDays: qualityAssessments.fieldActivity.ageDays,
      recentReportsCount: fieldReports.length,
    },
    materials: {
      status: qualityAssessments.materials.status,
      trackedItemsCount: materialItems.length,
      lowStockItemsCount: lowStockCount,
    },
    pending: {
      status: qualityAssessments.pending.status,
      pendingCount: pendingItems.length,
      oldestPendingAgeDays: derivedMetrics.oldestPendingItemAgeDays?.value as number | undefined,
    },
    dataQuality: qualityAssessments,
    derivedMetrics,
    signals,
    conflicts,
    evidenceGraph: { nodes, edges },
    confidence,
    asOf: asOfIso,
  };
}
