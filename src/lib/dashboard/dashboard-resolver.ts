export type DashboardTargetType =
  | "PROJECT"
  | "PROJECT_LIST"
  | "DAILY_REPORT"
  | "WEEKLY_REPORT"
  | "SUPERVISION_DOSSIER"
  | "SITE_REPORT"
  | "FIELD_ISSUE"
  | "MATERIAL_REQUEST"
  | "FIELD_MATERIAL_REQUEST"
  | "APPROVAL"
  | "TASK"
  | "PROGRESS_ENTRY"
  | "RISK_LIST"
  | "VOLUME_TODAY"
  | "REPORTS_7D"
  | "ACTION_LIST";

export type DashboardTargetRequest = {
  targetType: DashboardTargetType;
  targetId?: string | null;
  projectId?: string | null;
  status?: string | null;
  period?: string | null;
  anchor?: string | null;
};

/**
 * Centralized Target Resolver for Executive Dashboard
 * Guarantees context preservation (projectId, period, filters)
 * and resolves appropriate route or drawer action.
 */
export function resolveDashboardTargetUrl(req: DashboardTargetRequest): string {
  const { targetType, targetId, projectId, status, period, anchor } = req;
  const cleanId = targetId ? targetId.replace(/^(approval|report|material|field-material|project|risk)-/, '') : null;
  const projectParam = projectId ? `projectId=${encodeURIComponent(projectId)}` : '';

  switch (targetType) {
    case "PROJECT":
      if (cleanId) {
        return `/projects/${cleanId}`;
      }
      return projectId ? `/projects/${projectId}` : `/projects?status=ACTIVE`;

    case "PROJECT_LIST":
      if (projectId) {
        return `/projects/${projectId}`;
      }
      return status ? `/projects?status=${encodeURIComponent(status)}` : `/projects?status=ACTIVE`;

    case "SITE_REPORT":
    case "DAILY_REPORT":
      if (cleanId) {
        return projectId 
          ? `/reports/field?projectId=${encodeURIComponent(projectId)}&reportId=${encodeURIComponent(cleanId)}` 
          : `/reports/field?reportId=${encodeURIComponent(cleanId)}`;
      }
      return projectId ? `/reports/field?projectId=${encodeURIComponent(projectId)}` : `/reports/field`;

    case "SUPERVISION_DOSSIER":
      if (cleanId) {
        return `/reports/weekly-inspection/${cleanId}/preview`;
      }
      return projectId ? `/reports/weekly-inspection?projectId=${encodeURIComponent(projectId)}` : `/reports/weekly-inspection`;

    case "WEEKLY_REPORT":
      if (cleanId) {
        return `/reports/field?reportId=${encodeURIComponent(cleanId)}`;
      }
      return projectId ? `/reports/field?projectId=${encodeURIComponent(projectId)}` : `/reports/field`;

    case "MATERIAL_REQUEST":
    case "FIELD_MATERIAL_REQUEST":
      if (projectId) {
        return cleanId 
          ? `/projects/${projectId}/material-requests?requestId=${encodeURIComponent(cleanId)}`
          : `/projects/${projectId}/material-requests`;
      }
      return cleanId ? `/materials?id=${encodeURIComponent(cleanId)}` : `/materials`;

    case "APPROVAL":
      if (cleanId) {
        return projectId 
          ? `/approvals?projectId=${encodeURIComponent(projectId)}&id=${encodeURIComponent(cleanId)}`
          : `/approvals?id=${encodeURIComponent(cleanId)}`;
      }
      return projectId
        ? `/approvals?projectId=${encodeURIComponent(projectId)}`
        : status ? `/approvals?status=${encodeURIComponent(status)}` : `/approvals`;

    case "VOLUME_TODAY":
      if (projectId) {
        return `/projects/${projectId}/field-progress/daily`;
      }
      // Rule V.C: NEVER open generic /projects. Open daily progress route!
      return `/reports/field?period=today`;

    case "REPORTS_7D":
      return projectId 
        ? `/reports/field?projectId=${encodeURIComponent(projectId)}&period=7d`
        : `/reports/field?period=7d`;

    case "RISK_LIST":
      return projectId ? `/projects/${projectId}?tab=field-progress` : `/projects?status=AT_RISK`;

    case "ACTION_LIST":
      if (anchor) return `#${anchor}`;
      return projectId ? `/approvals?projectId=${encodeURIComponent(projectId)}` : `/approvals`;

    default:
      return projectId ? `/projects/${projectId}` : `/dashboard`;
  }
}
