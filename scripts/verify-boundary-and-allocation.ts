import "dotenv/config";
import prisma from "@/lib/prisma";
import {
  createProjectAssignment,
  extendProjectAssignment,
  releaseEmployeeFromProject,
} from "@/lib/hr/project-assignment-service";
import { parseVietnamDateOnly } from "@/lib/hr/vietnam-date-helper";
import { EmployeeProjectAssignmentEndReason } from "@prisma/client";

async function main() {
  const ts = Date.now();
  try {
    const projectMemberBefore = await prisma.projectMember.count();
    const userAccessGrantBefore = await prisma.userAccessGrant.count();

    console.log(`PROJECTMEMBER_BEFORE=${projectMemberBefore}`);
    console.log(`USERACCESSGRANT_BEFORE=${userAccessGrantBefore}`);

    // Create a temporary QA fixture employee, position & role for boundary testing
    const testOrg = await prisma.organizationUnit.create({
      data: { code: `QA_BND_ORG_${ts}`, name: "Boundary Test Org" },
    });

    const testPos = await prisma.position.create({
      data: { code: `QA_BND_POS_${ts}`, title: "Boundary Test Position" },
    });

    const testRole = await prisma.projectPersonnelRole.create({
      data: { code: `QA_BND_ROLE_${ts}`, name: "Boundary Test Role" },
    });

    const testProject = await prisma.project.create({
      data: { code: `QA_BND_PROJ_${ts}`, name: "Boundary Test Project" },
    });

    const testEmp = await prisma.employee.create({
      data: {
        code: `QA_BND_EMP_${ts}`,
        fullName: "QA Boundary Employee",
        joinedDate: new Date("2024-01-01"),
        orgAssignments: {
          create: {
            organizationUnit: { connect: { id: testOrg.id } },
            position: { connect: { id: testPos.id } },
            startDate: new Date("2024-01-01"),
            isPrimary: true,
          },
        },
      },
    });

    // 1. Create HR assignment
    const assignment1 = await createProjectAssignment(prisma, {
      employeeId: testEmp.id,
      projectId: testProject.id,
      projectPersonnelRoleId: testRole.id,
      startDate: parseVietnamDateOnly("2026-08-01"),
      expectedEndDate: parseVietnamDateOnly("2026-12-31"),
      allocationPercentage: 60,
    });

    // 2. Extend assignment
    await extendProjectAssignment(prisma, {
      assignmentId: assignment1.id,
      newExpectedEndDate: parseVietnamDateOnly("2027-06-30"),
      reason: "Boundary extension test",
    });

    // 3. Release assignment
    await releaseEmployeeFromProject(prisma, {
      assignmentId: assignment1.id,
      releaseDate: parseVietnamDateOnly("2026-10-01"),
      endReason: EmployeeProjectAssignmentEndReason.COMPLETED,
    });

    const projectMemberAfter = await prisma.projectMember.count();
    const userAccessGrantAfter = await prisma.userAccessGrant.count();

    console.log(`PROJECTMEMBER_AFTER=${projectMemberAfter}`);
    console.log(`USERACCESSGRANT_AFTER=${userAccessGrantAfter}`);
    console.log(`AUTO_PROJECTMEMBER=${projectMemberBefore === projectMemberAfter ? "NO" : "YES"}`);
    console.log(`AUTO_USERACCESSGRANT=${userAccessGrantBefore === userAccessGrantAfter ? "NO" : "YES"}`);

    // Clean up boundary test fixtures
    await prisma.employeeProjectAssignment.deleteMany({ where: { id: assignment1.id } });
    await prisma.employeeOrganizationAssignment.deleteMany({ where: { employeeId: testEmp.id } });
    await prisma.employee.delete({ where: { id: testEmp.id } });
    await prisma.project.delete({ where: { id: testProject.id } });
    await prisma.projectPersonnelRole.delete({ where: { id: testRole.id } });
    await prisma.position.delete({ where: { id: testPos.id } });
    await prisma.organizationUnit.delete({ where: { id: testOrg.id } });
  } finally {
    await prisma.$disconnect();
  }
}

main();
