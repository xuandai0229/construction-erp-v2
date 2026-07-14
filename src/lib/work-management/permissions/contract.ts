export const WORK_MANAGEMENT_PERMISSIONS = [
  "task.create.personal", "task.create.for_others", "task.create.from_template",
  "task.assign.self", "task.assign.department", "task.assign.project", "task.assign.companywide",
  "task.view.own", "task.view.participating", "task.view.department", "task.view.project", "task.view.companywide", "task.view.confidential", "task.view.executive",
  "task.update.content", "task.update.participants", "task.update.assignee", "task.update.reviewer", "task.update.approver", "task.update.deadline", "task.update.priority", "task.update.confidentiality", "task.update.scope",
  "task.accept", "task.request_clarification", "task.request_extension", "task.update_progress", "task.submit", "task.review", "task.approve", "task.complete", "task.reopen", "task.pause", "task.resume", "task.cancel", "task.archive", "task.restore", "task.comment", "task.attach_document", "task.manage_checklist", "task.manage_subtasks", "task.manage_dependencies",
  "task.handover.request", "task.handover.accept", "task.handover.reject", "task.handover.approve", "task.handover.execute", "task.handover.bulk",
  "responsibility.view", "responsibility.assign", "responsibility.update", "responsibility.cancel", "responsibility.handover",
  "delegation.view", "delegation.create", "delegation.approve", "delegation.revoke", "task.audit.view", "task.report.view", "task.report.export", "task.access_grant.manage",
] as const;
export type WorkManagementPermission = (typeof WORK_MANAGEMENT_PERMISSIONS)[number];
export const WORK_MANAGEMENT_SCOPES = ["OWN", "PARTICIPATING", "DEPARTMENT", "PROJECT", "ASSIGNED_SCOPE", "HANDOVER_SCOPE", "SPECIFIC_USERS", "COMPANY", "CONFIDENTIAL"] as const;
export type WorkManagementScope = (typeof WORK_MANAGEMENT_SCOPES)[number];
