export const SAFETY_TIME_ZONE = "Asia/Ho_Chi_Minh" as const;

export type SafetyPlanStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REVISION_REQUIRED"
  | "LOCKED"
  | "CANCELLED";

export type SafetyReportStatus = SafetyPlanStatus;

export type SafetyInspectionResultStatus =
  | "PASS"
  | "FAIL"
  | "NOT_APPLICABLE"
  | "NOT_INSPECTED";

export type SafetyInspectionStatus =
  | "DRAFT"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type SafetyConstructionType =
  | "BUILDING"
  | "DRAINAGE_INFRASTRUCTURE"
  | "OTHER";

export type SafetySeverity =
  | "REMINDER"
  | "MEDIUM"
  | "SERIOUS"
  | "IMMEDIATE_DANGER";

export type SafetyCorrectiveActionStatus =
  | "REQUESTED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "ACCEPTED"
  | "REWORK_REQUIRED"
  | "EXTENDED"
  | "CANCELLED";

export type SafetyFindingStatus =
  | "NEW"
  | "ASSIGNED"
  | "IN_REMEDIATION"
  | "WAITING_REINSPECTION"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

export type SafetyReinspectionDecision =
  | "ACCEPT_COMPLETION"
  | "REJECT_REWORK"
  | "EXTEND_DUE_DATE"
  | "ESCALATE_SEVERITY"
  | "SUSPEND_WORK";

export type SafetyAggregateType =
  | "PLAN"
  | "SCHEDULE"
  | "SESSION"
  | "RESULT"
  | "FINDING"
  | "CORRECTIVE_ACTION"
  | "REINSPECTION"
  | "WEEKLY_REPORT"
  | "CHECKLIST_TEMPLATE"
  | "DOCUMENT_TEMPLATE"
  | "EVIDENCE";

export type SafetyProjectScope =
  | { kind: "ALL_PROJECTS" }
  | { kind: "PROJECT_IDS"; projectIds: readonly string[] }
  | { kind: "NO_PROJECTS" };
