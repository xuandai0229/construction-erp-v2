import "server-only";

export type FactClassification =
  | "ERP_FACT"                        // Direct uninterpreted fact from ERP database
  | "DERIVED_METRIC"                  // Deterministic calculation (e.g. daysOverdue, progressVariance)
  | "DATA_GAP"                        // Explicitly declared absent or unavailable data
  | "DETERMINISTIC_ACTION_SUGGESTION" // Rule-based system suggestion from active signals
  | "AI_INFERENCE"                    // AI reasoning synthesis with explicit confidence
  | "AI_RECOMMENDATION";              // LLM-generated strategic reasoning recommendation

export type DataQualityStatus =
  | "AVAILABLE"         // Fresh, verified, reliable data
  | "AVAILABLE_EMPTY"   // Operational domain verified active, but 0 pending/issue records (Healthy 0)
  | "PARTIAL"           // Some records exist but incomplete across time/scope
  | "STALE"             // Data exists but exceeds freshness threshold (e.g. >14 days without report)
  | "CONFLICTING"       // Mismatch between multiple sources (e.g. progress % in site report vs approved entry)
  | "MISSING"           // Expected operational record missing
  | "NOT_CONFIGURED"    // Module/template not configured for this project
  | "NOT_APPLICABLE"    // Feature not applicable for this project category
  | "INVALID";          // Ill-formed, corrupted or out-of-range data

export type DomainApplicabilityStatus =
  | "REQUIRED"
  | "OPTIONAL"
  | "NOT_CONFIGURED"
  | "NOT_APPLICABLE";

export interface DomainApplicability {
  domain: string;
  status: DomainApplicabilityStatus;
  reason: string;
  source: string;
}

export interface ClassifiedFact<T = unknown> {
  type: FactClassification;
  sourceType: string;
  recordId?: string;
  projectId?: string;
  claim: string;
  data?: T;
  asOf: string;
  confidence: number;
}

export interface DataQualityAssessment {
  domain: string;
  status: DataQualityStatus;
  applicability?: DomainApplicability;
  lastUpdated?: string;
  ageDays?: number;
  freshnessThresholdDays: number;
  isStale: boolean;
  notes?: string;
}

export interface ProjectHealthContract {
  project: {
    id: string;
    code: string;
    name: string;
    status: string;
    location: string | null;
    startDate: string | null;
    endDate: string | null;
  };
  schedule: {
    deadlineStatus: "NO_DEADLINE" | "ON_TRACK" | "DUE_SOON" | "OVERDUE";
    daysToDeadline: number | null;
    plannedEndDate: string | null;
  };
  progress: {
    status: DataQualityStatus;
    actualPercentage: number | null;
    plannedPercentage: number | null;
    variancePercentage: number | null;
    lastUpdated: string | null;
  };
  fieldActivity: {
    status: DataQualityStatus;
    recentReportCount: number;
    lastReportDate: string | null;
    weatherNotes?: string | null;
  };
  materials: {
    status: DataQualityStatus;
    lowStockItemCount: number;
    lastMovementDate: string | null;
  };
  pendingDecisions: {
    status: DataQualityStatus;
    pendingItemCount: number;
    oldestPendingAgeDays?: number;
  };
  dataQuality: DataQualityAssessment[];
  signals: Array<{
    code: string;
    severity: "INFO" | "WARNING" | "CRITICAL";
    message: string;
  }>;
  asOf: string;
}
