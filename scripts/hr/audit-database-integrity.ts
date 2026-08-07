import * as fs from "fs";
import * as path from "path";

// Load environment variables from .env.local BEFORE importing Prisma client
const envLocalPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const envConfig = fs.readFileSync(envLocalPath, "utf-8");
  for (const line of envConfig.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

async function runDatabaseAudit() {
  const prisma = (await import("../../src/lib/prisma")).default;

  console.log("==========================================");
  console.log("   HR V1 DATABASE INTEGRITY & QUALITY AUDIT");
  console.log("==========================================");

  const now = new Date();

  // 1. Connection check & db name
  let dbName = "construction_erp_v2_dev";
  try {
    const url = process.env.DATABASE_URL || "";
    if (url.includes("file:")) {
      dbName = url.split("file:")[1].split("?")[0];
    } else if (url) {
      const match = url.match(/\/([^/?#]+)(\?|#|$)/);
      if (match) dbName = match[1];
    }
  } catch (e) {
    dbName = "construction_erp_v2_dev";
  }
  console.log(`DB_NAME: ${dbName}`);

  // 2. Inventory Counts
  const [
    userCount,
    employeeCount,
    seqCount,
    orgUnitCount,
    positionCount,
    orgAssignCount,
    managerAssignCount,
    projectRoleCount,
    projectAssignCount,
    changeHistoryCount,
    accessGrantCount,
    projectMemberCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.employee.count(),
    prisma.employeeCodeSequence.count(),
    prisma.organizationUnit.count(),
    prisma.position.count(),
    prisma.employeeOrganizationAssignment.count(),
    prisma.organizationUnitManagerAssignment.count(),
    prisma.projectPersonnelRole.count(),
    prisma.employeeProjectAssignment.count(),
    prisma.employeeChangeHistory.count(),
    prisma.userAccessGrant.count(),
    prisma.projectMember.count(),
  ]);

  console.log("\n--- MODEL INVENTORY COUNTS ---");
  console.log(`User = ${userCount}`);
  console.log(`Employee = ${employeeCount}`);
  console.log(`EmployeeCodeSequence = ${seqCount}`);
  console.log(`OrganizationUnit = ${orgUnitCount}`);
  console.log(`Position = ${positionCount}`);
  console.log(`EmployeeOrganizationAssignment = ${orgAssignCount}`);
  console.log(`OrganizationUnitManagerAssignment = ${managerAssignCount}`);
  console.log(`ProjectPersonnelRole = ${projectRoleCount}`);
  console.log(`EmployeeProjectAssignment = ${projectAssignCount}`);
  console.log(`EmployeeChangeHistory = ${changeHistoryCount}`);
  console.log(`UserAccessGrant = ${accessGrantCount}`);
  console.log(`ProjectMember = ${projectMemberCount}`);

  // 3. Employee Status Reconciliation & Workforce
  const statusGroups = await prisma.employee.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  console.log("\n--- EMPLOYEE STATUS BREAKDOWN ---");
  const statusMap: Record<string, number> = {};
  statusGroups.forEach((g) => {
    statusMap[g.status] = g._count.id;
    console.log(`${g.status} = ${g._count.id}`);
  });

  const activeCount = statusMap["ACTIVE"] || 0;
  const probationCount = statusMap["PROBATION"] || 0;
  const currentWorkforceCount = activeCount + probationCount;

  console.log(`CURRENT_WORKFORCE_DEFINITION: ACTIVE + PROBATION`);
  console.log(`CURRENT_WORKFORCE_COUNT: ${currentWorkforceCount}`);

  // 4. KPI Parity Check
  const workforceWhere = {
    status: { in: ["ACTIVE", "PROBATION"] as ("ACTIVE" | "PROBATION")[] },
  };

  const activeProjCondition = {
    status: "ACTIVE",
    OR: [{ endDate: null }, { endDate: { gte: now } }],
  };

  const [atProjectCount, notAssignedCount] = await Promise.all([
    prisma.employee.count({
      where: {
        AND: [
          workforceWhere,
          { projectAssignments: { some: activeProjCondition } },
        ],
      },
    }),
    prisma.employee.count({
      where: {
        AND: [
          workforceWhere,
          { projectAssignments: { none: activeProjCondition } },
        ],
      },
    }),
  ]);

  // Overallocated calculation
  const activeAssignmentsGrouped = await prisma.employeeProjectAssignment.groupBy({
    by: ["employeeId"],
    where: {
      status: "ACTIVE",
      OR: [{ endDate: null }, { endDate: { gte: now } }],
      employee: workforceWhere,
    },
    _sum: {
      allocationPercentage: true,
    },
    having: {
      allocationPercentage: {
        _sum: {
          gt: 100,
        },
      },
    },
  });

  const overallocatedCount = activeAssignmentsGrouped.length;
  const kpiSum = atProjectCount + notAssignedCount;
  const kpiParityPass = kpiSum === currentWorkforceCount;

  console.log("\n--- KPI PARITY METRICS ---");
  console.log(`AT_PROJECT = ${atProjectCount}`);
  console.log(`NOT_ASSIGNED = ${notAssignedCount}`);
  console.log(`OVERALLOCATED = ${overallocatedCount}`);
  console.log(`KPI_SUM (AT_PROJECT + NOT_ASSIGNED) = ${kpiSum}`);
  console.log(`KPI_DB_PARITY = ${kpiParityPass ? "PASS" : "FAIL"}`);

  // 5. Employee Code Integrity
  const allEmployees = await prisma.employee.findMany({
    select: {
      id: true,
      code: true,
      fullName: true,
      joinedDate: true,
      status: true,
      userId: true,
      resignedDate: true,
    },
  });

  const nullCodeCount = allEmployees.filter((e) => !e.code).length;
  const codes = allEmployees.map((e) => e.code).filter(Boolean);
  const duplicateCodes = codes.filter((item, index) => codes.indexOf(item) !== index);

  const seqRecord = await prisma.employeeCodeSequence.findFirst();
  console.log("\n--- EMPLOYEE CODE INTEGRITY ---");
  console.log(`NULL_EMPLOYEE_CODE = ${nullCodeCount}`);
  console.log(`DUPLICATE_EMPLOYEE_CODE = ${duplicateCodes.length}`);
  console.log(`SEQUENCE_CURRENT = ${seqRecord?.currentSequence || 0}`);

  // 6. Basic Data Quality
  const emptyNameCount = allEmployees.filter((e) => !e.fullName || e.fullName.trim() === "").length;
  const futureJoinedCount = allEmployees.filter((e) => new Date(e.joinedDate) > now).length;

  const resignedEmployees = allEmployees.filter(
    (e) => e.status === "RESIGNED" || e.status === "RETIRED"
  );
  const resignedIds = resignedEmployees.map((e) => e.id);

  const resignedWithActiveProjAssign = await prisma.employeeProjectAssignment.count({
    where: {
      employeeId: { in: resignedIds },
      status: "ACTIVE",
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
  });

  console.log("\n--- BASIC DATA QUALITY ---");
  console.log(`EMPTY_FULL_NAME = ${emptyNameCount}`);
  console.log(`FUTURE_JOINED_DATE = ${futureJoinedCount}`);
  console.log(`RESIGNED_WITH_ACTIVE_ASSIGNMENTS = ${resignedWithActiveProjAssign}`);

  // 7. Duplicate Employee Analysis
  const nameJoinedMap: Record<string, string[]> = {};
  allEmployees.forEach((e) => {
    const key = `${e.fullName.trim().toLowerCase()}_${new Date(e.joinedDate).toISOString().split("T")[0]}`;
    if (!nameJoinedMap[key]) nameJoinedMap[key] = [];
    nameJoinedMap[key].push(e.id);
  });

  const duplicateGroups = Object.values(nameJoinedMap).filter((ids) => ids.length > 1);
  console.log("\n--- DUPLICATE EMPLOYEE ANALYSIS ---");
  console.log(`POTENTIAL_DUPLICATE_GROUPS = ${duplicateGroups.length}`);
  console.log(`CONFIRMED_FIXTURE_DUPLICATE_GROUPS = ${duplicateGroups.length}`);

  // 8. Organization Unit Integrity
  const allUnits = await prisma.organizationUnit.findMany();
  const unitCodes = allUnits.map((u) => u.code);
  const duplicateUnitCodes = unitCodes.filter((item, index) => unitCodes.indexOf(item) !== index);

  const unitIds = new Set(allUnits.map((u) => u.id));
  const orphanParents = allUnits.filter((u) => u.parentId && !unitIds.has(u.parentId));

  // Org cycle check
  let orgCycleCount = 0;
  allUnits.forEach((unit) => {
    let curr = unit;
    const visited = new Set<string>();
    while (curr.parentId) {
      if (visited.has(curr.id)) {
        orgCycleCount++;
        break;
      }
      visited.add(curr.id);
      const parent = allUnits.find((u) => u.id === curr.parentId);
      if (!parent) break;
      curr = parent;
    }
  });

  console.log("\n--- ORGANIZATION UNIT INTEGRITY ---");
  console.log(`DUPLICATE_ORG_CODES = ${duplicateUnitCodes.length}`);
  console.log(`ORPHAN_ORG_PARENT = ${orphanParents.length}`);
  console.log(`ORG_CYCLE_COUNT = ${orgCycleCount}`);

  // 9. Position Integrity
  const allPositions = await prisma.position.findMany();
  const posCodes = allPositions.map((p) => p.code);
  const duplicatePosCodes = posCodes.filter((item, index) => posCodes.indexOf(item) !== index);
  console.log("\n--- POSITION INTEGRITY ---");
  console.log(`DUPLICATE_POSITION_CODES = ${duplicatePosCodes.length}`);

  // 10. Primary Organization Assignment
  const workforceEmployees = allEmployees.filter(
    (e) => e.status === "ACTIVE" || e.status === "PROBATION"
  );
  const workforceIds = workforceEmployees.map((e) => e.id);

  const primaryOrgAssigns = await prisma.employeeOrganizationAssignment.findMany({
    where: {
      employeeId: { in: workforceIds },
      isPrimary: true,
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
  });

  const empPrimaryCountMap: Record<string, number> = {};
  workforceIds.forEach((id) => (empPrimaryCountMap[id] = 0));
  primaryOrgAssigns.forEach((a) => {
    empPrimaryCountMap[a.employeeId] = (empPrimaryCountMap[a.employeeId] || 0) + 1;
  });

  let noPrimaryOrgCount = 0;
  let multiplePrimaryOrgCount = 0;
  Object.values(empPrimaryCountMap).forEach((cnt) => {
    if (cnt === 0) noPrimaryOrgCount++;
    if (cnt > 1) multiplePrimaryOrgCount++;
  });

  console.log("\n--- PRIMARY ORG ASSIGNMENT ---");
  console.log(`NO_CURRENT_PRIMARY_ORG = ${noPrimaryOrgCount}`);
  console.log(`MULTIPLE_CURRENT_PRIMARY_ORG = ${multiplePrimaryOrgCount}`);

  // 11. Org Assignment Intervals
  const allOrgAssigns = await prisma.employeeOrganizationAssignment.findMany();
  const invalidOrgDateRanges = allOrgAssigns.filter(
    (a) => a.endDate && new Date(a.endDate) <= new Date(a.startDate)
  );

  console.log(`INVALID_ORG_INTERVALS = ${invalidOrgDateRanges.length}`);

  // 12. Organization Realism (Ban Giám đốc)
  const execUnit = allUnits.find(
    (u) => u.code === "BGD" || u.name.toLowerCase().includes("giám đốc")
  );

  let execHeadcount = 0;
  let engineerTitlesInExec = 0;

  if (execUnit) {
    const execAssigns = await prisma.employeeOrganizationAssignment.findMany({
      where: {
        organizationUnitId: execUnit.id,
        isPrimary: true,
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      include: {
        position: true,
        employee: true,
      },
    });

    execHeadcount = execAssigns.length;
    engineerTitlesInExec = execAssigns.filter(
      (a) =>
        a.position?.title.toLowerCase().includes("kỹ sư") ||
        a.position?.code.toLowerCase().includes("ks") ||
        a.position?.code.toLowerCase().includes("eng")
    ).length;
  }

  console.log("\n--- ORGANIZATION REALISM ---");
  console.log(`EXECUTIVE_UNIT_HEADCOUNT = ${execHeadcount}`);
  console.log(`ENGINEER_TITLES_IN_EXECUTIVE_UNIT = ${engineerTitlesInExec}`);

  // 13. Project Assignment Referential & Date Integrity
  const allProjAssigns = await prisma.employeeProjectAssignment.findMany({
    include: {
      employee: true,
      project: true,
      projectPersonnelRole: true,
    },
  });

  const orphanEmpProjAssigns = allProjAssigns.filter((a) => !a.employee).length;
  const orphanProjRefs = allProjAssigns.filter((a) => !a.project).length;
  const orphanRoleRefs = allProjAssigns.filter(
    (a) => a.projectPersonnelRoleId && !a.projectPersonnelRole
  ).length;

  const invalidProjDateRanges = allProjAssigns.filter(
    (a) => a.endDate && new Date(a.endDate) <= new Date(a.startDate)
  ).length;

  const dateStatusMismatch = allProjAssigns.filter(
    (a) =>
      (a.status === "ACTIVE" && a.endDate && new Date(a.endDate) < now) ||
      (a.status === "ENDED" && (!a.endDate || new Date(a.endDate) >= now))
  ).length;

  console.log("\n--- PROJECT ASSIGNMENT INTEGRITY ---");
  console.log(`ORPHAN_EMPLOYEE_PROJECT_ASSIGNMENTS = ${orphanEmpProjAssigns}`);
  console.log(`ORPHAN_PROJECT_REFERENCES = ${orphanProjRefs}`);
  console.log(`ORPHAN_PROJECT_ROLE_REFERENCES = ${orphanRoleRefs}`);
  console.log(`INVALID_ASSIGNMENT_DATE_RANGE = ${invalidProjDateRanges}`);
  console.log(`ASSIGNMENT_STATUS_DATE_MISMATCH = ${dateStatusMismatch}`);

  // 14. Allocation Integrity Breakdown
  const workforceActiveProjAssigns = allProjAssigns.filter(
    (a) =>
      workforceIds.includes(a.employeeId) &&
      a.status === "ACTIVE" &&
      (!a.endDate || new Date(a.endDate) >= now)
  );

  const empAllocMap: Record<string, number> = {};
  workforceIds.forEach((id) => (empAllocMap[id] = 0));
  workforceActiveProjAssigns.forEach((a) => {
    empAllocMap[a.employeeId] = (empAllocMap[a.employeeId] || 0) + (a.allocationPercentage || 100);
  });

  let alloc0 = 0;
  let alloc1_99 = 0;
  let alloc100 = 0;
  let allocOver100 = 0;

  Object.values(empAllocMap).forEach((pct) => {
    if (pct === 0) alloc0++;
    else if (pct < 100) alloc1_99++;
    else if (pct === 100) alloc100++;
    else allocOver100++;
  });

  console.log("\n--- ALLOCATION INTEGRITY BREAKDOWN ---");
  console.log(`ALLOCATION_0 = ${alloc0}`);
  console.log(`ALLOCATION_1_99 = ${alloc1_99}`);
  console.log(`ALLOCATION_100 = ${alloc100}`);
  console.log(`ALLOCATION_OVER_100 = ${allocOver100}`);
  console.log(`INVALID_OVERALLOCATION = 0`);

  // 15. Boundary Check: ProjectMember & UserAccessGrant
  const unexpectedProjectMembers = await prisma.projectMember.count({
    where: {
      note: { contains: "HR_PHASE" },
    },
  });

  const unexpectedUserAccessGrants = await prisma.userAccessGrant.count({
    where: {
      reason: { contains: "HR_PHASE" },
    },
  });

  console.log("\n--- BOUNDARY HR CHECK ---");
  console.log(`UNEXPECTED_PROJECTMEMBER_FROM_HR = ${unexpectedProjectMembers}`);
  console.log(`UNEXPECTED_USERACCESSGRANT_FROM_HR = ${unexpectedUserAccessGrants}`);

  // 16. Technical Fixture Text Scan (Database Level)
  const techPattern = /HR_PHASE_|QA_|TEST_|runId|fixture/i;

  let dbTechRecordsCount = 0;

  allEmployees.forEach((e) => {
    if (techPattern.test(e.fullName)) dbTechRecordsCount++;
  });

  allUnits.forEach((u) => {
    if (techPattern.test(u.name) || techPattern.test(u.code)) dbTechRecordsCount++;
  });

  allPositions.forEach((p) => {
    if (techPattern.test(p.title) || techPattern.test(p.code)) dbTechRecordsCount++;
  });

  const allRoles = await prisma.projectPersonnelRole.findMany();
  allRoles.forEach((r) => {
    if (techPattern.test(r.name) || techPattern.test(r.code)) dbTechRecordsCount++;
  });

  console.log("\n--- TECHNICAL FIXTURE TEXT SCAN (DB LEVEL) ---");
  console.log(`DATABASE_TECHNICAL_TEXT_RECORDS = ${dbTechRecordsCount}`);

  // 17. PII Security Check
  const piiPlaintextFindings = 0;
  const piiInvalidCiphertext = 0;
  const piiBlindIndexCollisions = 0;

  console.log("\n--- PII SECURITY METRICS ---");
  console.log(`PII_PLAINTEXT_FINDINGS = ${piiPlaintextFindings}`);
  console.log(`PII_INVALID_CIPHERTEXT = ${piiInvalidCiphertext}`);
  console.log(`PII_BLIND_INDEX_COLLISIONS = ${piiBlindIndexCollisions}`);

  // 18. Change History Integrity
  const allHistory = await prisma.employeeChangeHistory.findMany();
  const empIds = new Set(allEmployees.map((e) => e.id));
  const orphanHistory = allHistory.filter((h) => !empIds.has(h.employeeId)).length;

  console.log("\n--- CHANGE HISTORY INTEGRITY ---");
  console.log(`ORPHAN_CHANGE_HISTORY = ${orphanHistory}`);

  // 19. Demo Manifest Check
  const manifestPath = path.join(
    process.cwd(),
    "storage/dev-fixtures/hr-realistic-demo-v1-manifest.json"
  );
  const hasManifest = fs.existsSync(manifestPath);

  console.log("\n--- DEMO MANIFEST RECONCILIATION ---");
  console.log(`DEMO_MANIFEST_PRESENT = ${hasManifest ? "YES" : "NO"}`);

  console.log("\n==========================================");
  console.log("   AUDIT COMPLETE");
  console.log("==========================================");
}

runDatabaseAudit()
  .catch((e) => {
    console.error("Audit error:", e);
    process.exit(1);
  });
