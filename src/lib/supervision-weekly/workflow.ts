export type WeeklyWorkflowAction = "SUBMIT" | "REQUEST_REVISION" | "APPROVE" | "LOCK";

export type WeeklyWorkflowStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "REVISION_REQUIRED"
  | "APPROVED"
  | "LOCKED";

const transitions: Record<WeeklyWorkflowAction, { from: readonly WeeklyWorkflowStatus[]; to: WeeklyWorkflowStatus }> = {
  SUBMIT: { from: ["DRAFT", "REVISION_REQUIRED"], to: "SUBMITTED" },
  REQUEST_REVISION: { from: ["SUBMITTED"], to: "REVISION_REQUIRED" },
  APPROVE: { from: ["SUBMITTED"], to: "APPROVED" },
  LOCK: { from: ["APPROVED"], to: "LOCKED" },
};

export function getWeeklyWorkflowTarget(status: WeeklyWorkflowStatus, action: WeeklyWorkflowAction) {
  const transition = transitions[action];
  return transition.from.includes(status) ? transition.to : null;
}
