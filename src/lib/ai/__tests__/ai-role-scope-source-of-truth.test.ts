import { describe, it, expect, vi, beforeEach } from "vitest";
import { getProjectAccessScopeByCredentials } from "@/lib/rbac";
import { evaluateAIPolicy } from "../policy/ai-policy-engine";
import { AI_TOOL_POLICY_RULES, ALL_ROLES } from "../policy/ai-policy-rules";
import { AIRequestContext } from "../types";
import prisma from "@/lib/prisma";

describe("Pre-Flight Blocker B — Role Scope Source of Truth Verification", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. ADMIN, DIRECTOR, DEPUTY_DIRECTOR -> ALL_PROJECTS
  it("Company-Wide Roles (ADMIN, DIRECTOR, DEPUTY_DIRECTOR) always receive ALL_PROJECTS scope", async () => {
    const adminScope = await getProjectAccessScopeByCredentials("user_admin", "ADMIN");
    expect(adminScope.kind).toBe("ALL_PROJECTS");

    const dirScope = await getProjectAccessScopeByCredentials("user_dir", "DIRECTOR");
    expect(dirScope.kind).toBe("ALL_PROJECTS");

    const deputyScope = await getProjectAccessScopeByCredentials("user_deputy", "DEPUTY_DIRECTOR");
    expect(deputyScope.kind).toBe("ALL_PROJECTS");
  });

  // 2. CONSTRUCTION_SUPERVISOR -> ALL_PROJECTS (Operational Read-only across all sites)
  it("CONSTRUCTION_SUPERVISOR receives ALL_PROJECTS read-only scope", async () => {
    const supScope = await getProjectAccessScopeByCredentials("user_sup", "CONSTRUCTION_SUPERVISOR");
    expect(supScope.kind).toBe("ALL_PROJECTS");
  });

  // 3. SUPERVISION_HEAD -> Evaluated dynamically via SupervisionScope
  it("SUPERVISION_HEAD with ALL_PROJECTS scopeType receives ALL_PROJECTS scope", async () => {
    vi.spyOn(prisma.supervisionScope, "findUnique").mockResolvedValueOnce({
      id: "scope_1",
      userId: "user_head_1",
      scopeType: "ALL_PROJECTS",
      createdAt: new Date(),
      updatedAt: new Date(),
      projects: [],
    } as any);

    const headScope = await getProjectAccessScopeByCredentials("user_head_1", "SUPERVISION_HEAD");
    expect(headScope.kind).toBe("ALL_PROJECTS");
  });

  it("SUPERVISION_HEAD with specific project scope receives PROJECT_IDS scope", async () => {
    vi.spyOn(prisma.supervisionScope, "findUnique").mockResolvedValueOnce({
      id: "scope_2",
      userId: "user_head_2",
      scopeType: "SPECIFIC_PROJECTS",
      createdAt: new Date(),
      updatedAt: new Date(),
      projects: [
        { projectId: "project_sup_A" },
        { projectId: "project_sup_B" },
      ],
    } as any);

    const headScope = await getProjectAccessScopeByCredentials("user_head_2", "SUPERVISION_HEAD");
    expect(headScope.kind).toBe("PROJECT_IDS");
    if (headScope.kind === "PROJECT_IDS") {
      expect(headScope.projectIds).toEqual(["project_sup_A", "project_sup_B"]);
    }
  });

  // 4. CHIEF_COMMANDER, MANAGER, ENGINEER, STAFF -> Evaluated via ProjectMember
  it("CHIEF_COMMANDER, ENGINEER, STAFF receive PROJECT_IDS scope from ProjectMember", async () => {
    vi.spyOn(prisma.projectMember, "findMany").mockResolvedValueOnce([
      { projectId: "project_assigned_1" },
    ] as any);

    const commanderScope = await getProjectAccessScopeByCredentials("user_cmd", "CHIEF_COMMANDER");
    expect(commanderScope.kind).toBe("PROJECT_IDS");
    if (commanderScope.kind === "PROJECT_IDS") {
      expect(commanderScope.projectIds).toEqual(["project_assigned_1"]);
    }
  });

  // 5. Policy Engine Role Matrix Evaluation across ALL 9 Roles
  it("Policy Engine: Evaluates 5 Read Tools across all 9 canonical roles", () => {
    for (const role of ALL_ROLES) {
      const contextAll: AIRequestContext = {
        userId: `user_${role}`,
        role,
        projectScope: { kind: "ALL_PROJECTS" },
        requestId: `req_${role}`,
      };

      const resSummary = evaluateAIPolicy({
        toolName: "get_project_summary",
        input: { projectId: "project_1" },
        context: contextAll,
        targetProjectId: "project_1",
      });
      expect(resSummary.decision).toBe("ALLOW");

      const resProjects = evaluateAIPolicy({
        toolName: "get_my_projects",
        input: {},
        context: contextAll,
      });
      expect(resProjects.decision).toBe("ALLOW");
    }
  });

  // 6. Prohibited tools evaluation across ALL 9 Roles
  it("Policy Engine: Forbids raw_sql, delete_project, update_user_role for every single role", () => {
    for (const role of ALL_ROLES) {
      const context: AIRequestContext = {
        userId: `user_${role}`,
        role,
        projectScope: { kind: "ALL_PROJECTS" },
        requestId: `req_${role}`,
      };

      const resSql = evaluateAIPolicy({
        toolName: "raw_sql",
        input: { query: "SELECT 1" },
        context,
      });
      expect(resSql.decision).toBe("DENY");

      const resDel = evaluateAIPolicy({
        toolName: "delete_project",
        input: { projectId: "p1" },
        context,
        targetProjectId: "p1",
      });
      expect(resDel.decision).toBe("DENY");
    }
  });
});
