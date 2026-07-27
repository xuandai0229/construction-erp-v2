import fs from "node:fs";
import path from "node:path";
import "dotenv/config";
import type { UserRole } from "@prisma/client";
import { assertSafeQaDatabase } from "./assert-safe-qa-database";
import { createSafeQaPrismaClient, verifyQaPrismaFingerprint } from "./create-safe-qa-prisma-client";
import { canManageProjects, canViewAllProjects } from "../../src/lib/rbac";
import { canAuthorSupervisionWeekly, canReadSupervisionWeekly, canReviewSupervisionWeekly } from "../../src/lib/supervision-weekly/permissions";

const origin = "http://127.0.0.1:3100";
const artifactDirectory = path.resolve("artifacts/construction-supervisor-final");
const manifestPath = path.join(artifactDirectory, "fixture-manifest-20260727.json");
const evidencePath = path.join(artifactDirectory, "existing-role-runtime-regression-evidence-20260727.json");

async function login(email: string, password: string) {
  const response = await fetch(`${origin}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  if (response.status !== 200 || !cookie) throw new Error(`Login failed for ${email}: HTTP ${response.status}`);
  return cookie;
}

async function main() {
  const safe = assertSafeQaDatabase();
  const qaUrl = process.env.QA_DATABASE_URL;
  const password = process.env.QA_SUPERVISION_E2E_PASSWORD;
  if (!qaUrl || !password) throw new Error("QA environment is incomplete");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const { prisma, close } = createSafeQaPrismaClient(qaUrl);
  try {
    await verifyQaPrismaFingerprint(prisma, safe.qaDatabase);
    const principals: Array<{ role: UserRole; key: string }> = [
      { role: "ADMIN", key: "ADMIN" },
      { role: "DIRECTOR", key: "REVIEWER" },
      { role: "DEPUTY_DIRECTOR", key: "DEPUTY_DIRECTOR" },
      { role: "SUPERVISION_HEAD", key: "SUPERVISION_HEAD" },
      { role: "CHIEF_COMMANDER", key: "CHIEF_COMMANDER" },
      { role: "MANAGER", key: "MANAGER" },
      { role: "ENGINEER", key: "ENGINEER" },
      { role: "STAFF", key: "STAFF" },
      { role: "CONSTRUCTION_SUPERVISOR", key: "OFFICER_A" },
    ];
    const projectIds = [manifest.projects.A, manifest.projects.B, manifest.projects.C] as string[];
    const projectCodes = ["PROJECT-A", "PROJECT-B", "PROJECT-C"];
    const rows = [];
    for (const principal of principals) {
      const user = manifest.users[principal.key];
      const cookie = await login(user.email, password);
      const projectResponse = await fetch(`${origin}/projects`, { headers: { cookie } });
      const projectHtml = await projectResponse.text();
      const weeklyResponse = await fetch(`${origin}/reports/weekly-inspection`, { headers: { cookie } });
      const weeklyHtml = await weeklyResponse.text();
      const weeklyCreateControlVisible = weeklyHtml.includes("Tạo hồ sơ tuần mới");
      const weeklyModuleVisible = weeklyCreateControlVisible || weeklyHtml.includes("QA-CONSTRUCTION-SUPERVISOR-FINAL-OWNDRAFT");
      const exportResponse = await fetch(`${origin}/api/supervision/weekly/${manifest.dossiers.ownDraft}/export?document=RESULT&format=pdf`, { headers: { cookie } });
      const memberships = await prisma.projectMember.findMany({ where: { userId: user.id, isActive: true, deletedAt: null }, select: { projectId: true } });
      const visibleProjectCodes = projectCodes.filter((code) => projectHtml.includes(`QA-CONSTRUCTION-SUPERVISOR-FINAL-${code}`));
      const policyReadAll = canViewAllProjects({ role: principal.role });
      const expectedVisibleProjectIds = policyReadAll ? projectIds : memberships.map((membership) => membership.projectId);
      rows.push({
        role: principal.role,
        userId: user.id,
        runtime: {
          projectHttpStatus: projectResponse.status,
          visibleProjectCodes,
          visibleProjectCount: visibleProjectCodes.length,
          projectManageControlVisible: projectHtml.includes("Tạo công trình"),
          weeklyHttpStatus: weeklyResponse.status,
          weeklyModuleVisible,
          weeklyCreateControlVisible,
          exportOfficerOwnedDossierStatus: exportResponse.status,
          exportReturnedFile: Boolean(exportResponse.headers.get("content-disposition")),
        },
        database: { membershipProjectIds: memberships.map((membership) => membership.projectId), expectedVisibleProjectIds },
        policy: {
          projectReadAll: policyReadAll,
          projectManage: canManageProjects({ role: principal.role }),
          weeklyReadAll: canReadSupervisionWeekly(principal.role),
          weeklyCreate: canAuthorSupervisionWeekly(principal.role),
          weeklyEditOwn: canAuthorSupervisionWeekly(principal.role),
          weeklyReview: canReviewSupervisionWeekly(principal.role),
          sourceMutation: canManageProjects({ role: principal.role }),
        },
      });
    }
    const assertions = rows.map((row) => ({
      role: row.role,
      noUnexpectedReadAll: row.policy.projectReadAll ? row.runtime.visibleProjectCount === 3 : row.runtime.visibleProjectCount <= row.database.membershipProjectIds.length,
      manageControlMatchesPolicy: row.runtime.projectManageControlVisible === row.policy.projectManage,
      weeklyReadMatchesPolicy: row.runtime.weeklyModuleVisible === row.policy.weeklyReadAll,
      weeklyCreateMatchesPolicy: row.runtime.weeklyCreateControlVisible === row.policy.weeklyCreate,
      officerHasNoSourceManage: row.role !== "CONSTRUCTION_SUPERVISOR" || (!row.runtime.projectManageControlVisible && !row.policy.sourceMutation),
    }));
    const pass = assertions.every((assertion) => Object.entries(assertion).every(([key, value]) => key === "role" || value === true));
    const evidence = { status: pass ? "PASS" : "FAIL", testedAt: new Date().toISOString(), databaseFingerprint: safe.qaDatabase, rows, assertions };
    fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ evidencePath, status: evidence.status, assertions, matrix: rows.map((row) => ({ role: row.role, ...row.policy, runtimeVisibleProjects: row.runtime.visibleProjectCount, runtimeWeeklyCreate: row.runtime.weeklyCreateControlVisible, runtimeExportStatus: row.runtime.exportOfficerOwnedDossierStatus })) }, null, 2));
    if (!pass) process.exitCode = 1;
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
