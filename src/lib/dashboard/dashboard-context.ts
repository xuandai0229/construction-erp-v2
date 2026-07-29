export type DashboardContext =
  | {
      mode: "PORTFOLIO";
      projectId: null;
    }
  | {
      mode: "PROJECT";
      projectId: string;
    };

/**
 * The selected project id has already passed the global RBAC scope check in
 * `getGlobalProjectContext` and the dashboard query. Do not infer this mode
 * from the number of projects returned by a filtered query.
 */
export function resolveDashboardContext(selectedProjectId: string | null): DashboardContext {
  return selectedProjectId
    ? { mode: "PROJECT", projectId: selectedProjectId }
    : { mode: "PORTFOLIO", projectId: null };
}
