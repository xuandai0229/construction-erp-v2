import { describe, expect, it } from "vitest";
import { evaluatePermissionPolicy } from "./evaluate-permission-policy";

const actor = { actorUserId: "commander-1", systemRole: "CHIEF_COMMANDER" as const };
const assignedMembership = { projectId: "project-a", role: "CHIEF_COMMANDER" as const };

describe("site commander assigned-project RBAC", () => {
  it.each(["projects.view", "documents.view", "documents.upload", "reports.create", "materials.request"] as const)(
    "allows %s only with an active assignment",
    (permission) => {
      expect(evaluatePermissionPolicy({ ...actor, permission, requestedProjectId: "project-a", membership: assignedMembership }).allowed).toBe(true);
      const outside = evaluatePermissionPolicy({ ...actor, permission, requestedProjectId: "project-b", membership: assignedMembership });
      expect(outside.allowed).toBe(false);
      expect(outside.reasonCode).toBe("MEMBERSHIP_REQUIRED");
    },
  );

  it("does not grant global project mutation", () => {
    const result = evaluatePermissionPolicy({ ...actor, permission: "projects.update", requestedProjectId: "project-a", membership: assignedMembership });
    expect(result.allowed).toBe(false);
    expect(result.scope).toBe("NONE");
  });
});
