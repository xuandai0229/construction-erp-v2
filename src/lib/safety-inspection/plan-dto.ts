import type {
  SafetyPlanStatus,
  SafetyProjectScope,
} from "./types";
import { safetyProjectScopeAllows } from "./permissions";

export type SafetyPlanProjection = {
  id: string;
  documentYear: number;
  documentNumber: string | null;
  weekStart: Date;
  weekEnd: Date;
  status: SafetyPlanStatus;
  version: number;
  schedules: Array<{
    id: string;
    projectId: string;
    projectName: string;
    scheduledDate: Date;
    shift: "MORNING" | "AFTERNOON" | "EVENING";
    status: "PLANNED" | "CHANGED" | "CANCELLED" | "IN_PROGRESS" | "COMPLETED";
    collaborators: Array<{ id: string; name: string }>;
    checklistItems: Array<{ id: string; label: string }>;
  }>;
};

export type SafetyPlanDto = {
  id: string;
  documentYear: number;
  documentNumber: string | null;
  weekStart: string;
  weekEnd: string;
  status: SafetyPlanStatus;
  version: number;
  scopeLimited: boolean;
  visibilityNotice: string | null;
  schedules: Array<{
    id: string;
    projectId: string;
    projectName: string;
    scheduledDate: string;
    shift: "MORNING" | "AFTERNOON" | "EVENING";
    status: "PLANNED" | "CHANGED" | "CANCELLED" | "IN_PROGRESS" | "COMPLETED";
    collaborators: Array<{ id: string; name: string }>;
    checklistItems: Array<{ id: string; label: string }>;
  }>;
};

export function filterSafetyPlanForActor(
  plan: SafetyPlanProjection,
  scope: SafetyProjectScope,
): SafetyPlanDto | null {
  const visibleSchedules = plan.schedules.filter((schedule) =>
    safetyProjectScopeAllows(scope, schedule.projectId),
  );
  if (visibleSchedules.length === 0 && scope.kind !== "ALL_PROJECTS") {
    return null;
  }

  const scopeLimited =
    scope.kind !== "ALL_PROJECTS" &&
    visibleSchedules.length !== plan.schedules.length;

  return {
    id: plan.id,
    documentYear: plan.documentYear,
    documentNumber: plan.documentNumber,
    weekStart: plan.weekStart.toISOString(),
    weekEnd: plan.weekEnd.toISOString(),
    status: plan.status,
    version: plan.version,
    scopeLimited,
    visibilityNotice: scopeLimited
      ? "Nội dung được giới hạn theo quyền."
      : null,
    schedules: visibleSchedules.map((schedule) => ({
      id: schedule.id,
      projectId: schedule.projectId,
      projectName: schedule.projectName,
      scheduledDate: schedule.scheduledDate.toISOString(),
      shift: schedule.shift,
      status: schedule.status,
      collaborators: schedule.collaborators,
      checklistItems: schedule.checklistItems,
    })),
  };
}
