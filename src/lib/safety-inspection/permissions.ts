import type { ProjectRole, UserRole } from "@prisma/client";
import type { SafetyProjectScope } from "./types";

export const SAFETY_PERMISSIONS = [
  "safety.view",
  "safety.plan.create",
  "safety.plan.update",
  "safety.plan.review",
  "safety.plan.approve",
  "safety.session.start",
  "safety.session.complete",
  "safety.session.reopen",
  "safety.inspection.unplanned",
  "safety.finding.create",
  "safety.finding.update",
  "safety.finding.correct_result",
  "safety.work.suspend",
  "safety.remediation.submit",
  "safety.reinspection.decide",
  "safety.report.create",
  "safety.report.update",
  "safety.report.review",
  "safety.report.approve",
  "safety.template.manage",
  "safety.evidence.view",
  "safety.evidence.upload",
  "safety.evidence.cancel",
] as const;

export type SafetyPermission = (typeof SAFETY_PERMISSIONS)[number];

type SafetyRoleContext = {
  systemRole: UserRole;
  projectRole: ProjectRole | null;
};

const HSE_PERMISSIONS: readonly SafetyPermission[] = [
  "safety.view",
  "safety.plan.create",
  "safety.plan.update",
  "safety.session.start",
  "safety.session.complete",
  "safety.inspection.unplanned",
  "safety.finding.create",
  "safety.finding.update",
  "safety.work.suspend",
  "safety.reinspection.decide",
  "safety.report.create",
  "safety.report.update",
  "safety.evidence.view",
  "safety.evidence.upload",
  "safety.evidence.cancel",
];

const COMMAND_PERMISSIONS: readonly SafetyPermission[] = [
  "safety.view",
  "safety.remediation.submit",
  "safety.evidence.view",
  "safety.evidence.upload",
];

export function getSafetyPermissionSet(
  context: SafetyRoleContext,
): ReadonlySet<SafetyPermission> {
  const permissions = new Set<SafetyPermission>();
  const add = (values: readonly SafetyPermission[]): void => {
    values.forEach((permission) => permissions.add(permission));
  };

  if (context.projectRole === "HSE" || context.systemRole === "SUPERVISION_HEAD") {
    add(HSE_PERMISSIONS);
  }

  if (context.systemRole === "SUPERVISION_HEAD") {
    add(["safety.session.reopen", "safety.finding.correct_result"]);
  }

  if (
    context.systemRole === "CHIEF_COMMANDER" ||
    context.projectRole === "PROJECT_MANAGER" ||
    context.projectRole === "SITE_COMMANDER" ||
    context.projectRole === "CHIEF_COMMANDER" ||
    context.projectRole === "ASSISTANT_COMMANDER"
  ) {
    add(COMMAND_PERMISSIONS);
  }

  if (
    context.systemRole === "MANAGER" ||
    context.projectRole === "QA_QC"
  ) {
    add([
      "safety.view",
      "safety.plan.review",
      "safety.report.review",
      "safety.evidence.view",
      "safety.session.reopen",
      "safety.finding.correct_result",
    ]);
  }

  if (
    context.systemRole === "DIRECTOR" ||
    context.systemRole === "DEPUTY_DIRECTOR"
  ) {
    add([
      "safety.view",
      "safety.plan.approve",
      "safety.report.approve",
      "safety.evidence.view",
    ]);
  }

  if (context.systemRole === "ADMIN") {
    add(["safety.view", "safety.template.manage"]);
  }

  if (context.systemRole === "CONSTRUCTION_SUPERVISOR") {
    add(["safety.view", "safety.evidence.view"]);
  }

  return permissions;
}

export function safetyProjectScopeAllows(
  scope: SafetyProjectScope,
  projectId: string,
): boolean {
  return (
    scope.kind === "ALL_PROJECTS" ||
    (scope.kind === "PROJECT_IDS" && scope.projectIds.includes(projectId))
  );
}
