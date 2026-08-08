import "dotenv/config";
import prisma from "@/lib/prisma";

async function main() {
  try {
    const roles = await prisma.projectPersonnelRole.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        _count: {
          select: { employeeAssignments: true },
        },
      },
      orderBy: { orderIndex: "asc" },
    });

    console.log(`PROJECT_PERSONNEL_ROLE_COUNT=${roles.length}`);

    let techRoleCount = 0;
    let techAssignmentCount = 0;

    console.log("\n--- ROLE CATALOG ---");
    for (const r of roles) {
      const isTech =
        r.code.includes("HR_PHASE") ||
        r.code.includes("QA_") ||
        r.name.includes("HR_PHASE") ||
        r.name.includes("QA_") ||
        /17\d{8}/.test(r.code) ||
        /17\d{8}/.test(r.name);

      if (isTech) {
        techRoleCount++;
        techAssignmentCount += r._count.employeeAssignments;
      }

      console.log(`CODE: ${r.code} | NAME: ${r.name} | ASSIGNMENT_REF_COUNT: ${r._count.employeeAssignments}`);
    }

    console.log(`\nTECHNICAL_ROLE_RECORDS=${techRoleCount}`);
    console.log(`TECHNICAL_ASSIGNMENTS=${techAssignmentCount}`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
