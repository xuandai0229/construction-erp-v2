const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      code: true,
      fullName: true,
      status: true,
      userId: true,
      orgAssignments: {
        where: { endDate: null, isPrimary: true },
        include: { organizationUnit: true, position: true }
      },
      projectAssignments: {
        where: { status: "ACTIVE", OR: [{ endDate: null }, { endDate: { gte: new Date() } }] },
        include: { project: true }
      }
    }
  });

  console.log("=== EMPLOYEES COUNT BY STATUS ===");
  const byStatus = {};
  employees.forEach((e) => {
    byStatus[e.status] = (byStatus[e.status] || 0) + 1;
  });
  console.log(byStatus);
  console.log("Total employees in DB:", employees.length);

  const activeOrProbation = employees.filter((e) => ["ACTIVE", "PROBATION"].includes(e.status));
  console.log("ACTIVE + PROBATION count:", activeOrProbation.length);

  const unassignedOrg = activeOrProbation.filter((e) => e.orgAssignments.length === 0);
  console.log("Active/Probation employees missing primary org unit:", unassignedOrg.length);

  const units = await prisma.organizationUnit.findMany({
    include: {
      managerAssignments: {
        where: { endDate: null, isPrimary: true },
        include: { employee: true }
      },
      employeeAssignments: {
        where: {
          endDate: null,
          isPrimary: true,
          employee: { status: { in: ["ACTIVE", "PROBATION"] } }
        }
      }
    }
  });

  console.log("\n=== ORGANIZATION UNITS IN DB ===");
  units.forEach((u) => {
    console.log({
      id: u.id,
      code: u.code,
      name: u.name,
      parentId: u.parentId,
      isActive: u.isActive,
      managers: u.managerAssignments.map((m) => `${m.employee.fullName} (${m.employee.code})`),
      activeEmpCount: u.employeeAssignments.length
    });
  });

  // Check positions
  const positions = await prisma.position.findMany({
    include: {
      employeeAssignments: {
        where: { endDate: null, isPrimary: true, employee: { status: { in: ["ACTIVE", "PROBATION"] } } }
      }
    }
  });
  console.log("\n=== POSITIONS IN DB ===");
  positions.forEach((p) => {
    console.log({
      id: p.id,
      code: p.code,
      title: p.title,
      isActive: p.isActive,
      activeEmpCount: p.employeeAssignments.length
    });
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
