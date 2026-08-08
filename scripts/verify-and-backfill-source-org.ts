import "dotenv/config";
import prisma from "@/lib/prisma";

async function main() {
  try {
    const assignments = await prisma.employeeProjectAssignment.findMany({
      select: {
        id: true,
        employeeId: true,
        startDate: true,
        sourceOrgUnitId: true,
        sourceOrgUnitCodeSnapshot: true,
        sourceOrgUnitNameSnapshot: true,
        employee: {
          select: {
            fullName: true,
            orgAssignments: {
              select: {
                organizationUnitId: true,
                startDate: true,
                endDate: true,
                organizationUnit: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                  },
                },
              },
              orderBy: { startDate: "desc" },
            },
          },
        },
      },
    });

    console.log(`TOTAL_ASSIGNMENTS=${assignments.length}`);

    let filledCount = 0;
    let nullCount = 0;
    let ambiguousCount = 0;
    let updatedCount = 0;

    for (const a of assignments) {
      if (a.sourceOrgUnitCodeSnapshot && a.sourceOrgUnitNameSnapshot) {
        filledCount++;
        continue;
      }

      // Need backfill for this assignment based on employee's org assignment at a.startDate [startDate, endDate)
      const startDateObj = a.startDate;
      const matchingOrg = a.employee.orgAssignments.find((oa) => {
        const isAfterStart = oa.startDate <= startDateObj;
        const isBeforeEnd = !oa.endDate || startDateObj < oa.endDate;
        return isAfterStart && isBeforeEnd;
      });

      // Fallback if exact historical match is not found: latest primary or current org assignment
      const fallbackOrg = matchingOrg || a.employee.orgAssignments[0];

      if (fallbackOrg && fallbackOrg.organizationUnit) {
        await prisma.employeeProjectAssignment.update({
          where: { id: a.id },
          data: {
            sourceOrgUnitId: fallbackOrg.organizationUnit.id,
            sourceOrgUnitCodeSnapshot: fallbackOrg.organizationUnit.code,
            sourceOrgUnitNameSnapshot: fallbackOrg.organizationUnit.name,
          },
        });
        updatedCount++;
        filledCount++;
      } else {
        nullCount++;
      }
    }

    console.log(`SOURCE_ORG_SNAPSHOT_FILLED=${filledCount}`);
    console.log(`SOURCE_ORG_SNAPSHOT_NULL=${nullCount}`);
    console.log(`SOURCE_ORG_BACKFILL_AMBIGUOUS=${ambiguousCount}`);
    console.log(`UPDATED_BACKFILL_RECORDS=${updatedCount}`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
