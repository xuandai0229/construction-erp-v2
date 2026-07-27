import { describe, expect, it } from "vitest";
import { projectScopeAllows, projectScopeWhere, type ProjectAccessScope } from "./rbac";

describe("explicit project access scope", () => {
  it.each([
    [{ kind: "ALL_PROJECTS" }, "project-a", true, {}],
    [{ kind: "PROJECT_IDS", projectIds: ["project-a", "project-b"] }, "project-a", true, { id: { in: ["project-a", "project-b"] } }],
    [{ kind: "PROJECT_IDS", projectIds: ["project-a"] }, "project-b", false, { id: { in: ["project-a"] } }],
    [{ kind: "NO_PROJECTS" }, "project-a", false, { id: { in: [] } }],
  ] satisfies [ProjectAccessScope, string, boolean, ReturnType<typeof projectScopeWhere>][]) (
    "%o resolves without null/undefined sentinels",
    (scope, projectId, expectedAllowed, expectedWhere) => {
      expect(projectScopeAllows(scope, projectId)).toBe(expectedAllowed);
      expect(projectScopeWhere(scope)).toEqual(expectedWhere);
    },
  );
});
