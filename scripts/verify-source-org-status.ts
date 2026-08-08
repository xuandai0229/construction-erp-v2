import "dotenv/config";
import prisma from "@/lib/prisma";

async function main() {
  try {
    const totalAssignments = await prisma.employeeProjectAssignment.count();
    const sourceOrgIdNullCount = await prisma.employeeProjectAssignment.count({
      where: { sourceOrgUnitId: null },
    });
    const sourceOrgCodeSnapshotNullCount = await prisma.employeeProjectAssignment.count({
      where: { sourceOrgUnitCodeSnapshot: null },
    });
    const sourceOrgNameSnapshotNullCount = await prisma.employeeProjectAssignment.count({
      where: { sourceOrgUnitNameSnapshot: null },
    });

    console.log(`TOTAL_ASSIGNMENTS=${totalAssignments}`);
    console.log(`SOURCE_ORG_ID_NULL_COUNT=${sourceOrgIdNullCount}`);
    console.log(`SOURCE_ORG_CODE_SNAPSHOT_NULL_COUNT=${sourceOrgCodeSnapshotNullCount}`);
    console.log(`SOURCE_ORG_NAME_SNAPSHOT_NULL_COUNT=${sourceOrgNameSnapshotNullCount}`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
