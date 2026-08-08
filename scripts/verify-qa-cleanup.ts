import "dotenv/config";
import prisma from "@/lib/prisma";

async function main() {
  try {
    const qaEmployees = await prisma.employee.count({
      where: {
        OR: [
          { code: { contains: "QA_" } },
          { code: { contains: "DESTRUCT" } },
          { fullName: { contains: "QA_" } },
          { fullName: { contains: "Destructive" } },
        ],
      },
    });

    const qaAssignments = await prisma.employeeProjectAssignment.count({
      where: {
        OR: [
          { notes: { contains: "QA_" } },
          { notes: { contains: "Destructive" } },
        ],
      },
    });

    const qaRoles = await prisma.projectPersonnelRole.count({
      where: {
        OR: [
          { code: { contains: "QA_" } },
          { code: { contains: "ROLE_DEST" } },
          { name: { contains: "QA_" } },
          { name: { contains: "Destructive" } },
        ],
      },
    });

    const qaUnits = await prisma.organizationUnit.count({
      where: {
        OR: [
          { code: { contains: "UNIT_A_SRC_ORG" } },
          { code: { contains: "UNIT_B_SRC_ORG" } },
        ],
      },
    });

    console.log(`QA_EMPLOYEE_REMAINING=${qaEmployees}`);
    console.log(`QA_ASSIGNMENT_REMAINING=${qaAssignments}`);
    console.log(`QA_ROLE_REMAINING=${qaRoles}`);
    console.log(`QA_UNIT_REMAINING=${qaUnits}`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
