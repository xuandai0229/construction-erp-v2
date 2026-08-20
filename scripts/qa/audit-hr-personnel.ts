import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Mock server-only for node tsx execution
const Module = require("module");
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
  if (id === "server-only") return {};
  return originalRequire.apply(this, arguments);
};

import prisma from "../../src/lib/prisma";

async function main() {
  console.log("==================================================");
  console.log("AUDITING ALL EMPLOYEES & HR POSITIONS");
  console.log("==================================================");

  const employees = await prisma.employee.findMany({
    include: {
      user: { select: { id: true, username: true, role: true, isActive: true } },
      orgAssignments: { include: { position: true, organizationUnit: true } },
      projectAssignments: { include: { project: true } },
    },
    orderBy: { code: "asc" },
  });

  console.log(`Total Employees in Database: ${employees.length}\n`);

  for (const emp of employees) {
    const posStr =
      emp.orgAssignments
        .map((p) => `${p.position.name} (${p.position.code}) @ ${p.organizationUnit.name} [Primary=${p.isPrimary}]`)
        .join("; ") || "NO_POSITION";

    const paStr =
      emp.projectAssignments
        .map((pa) => `${pa.project.code}: ${pa.roleTitle} (Status=${pa.status})`)
        .join("; ") || "NO_ASSIGNMENT";

    const userStr = emp.user
      ? `User.id=${emp.user.id} | User.username=${emp.user.username} | User.role=${emp.user.role} | Active=${emp.user.isActive}`
      : "NO_USER_ACCOUNT";

    console.log(`[Employee ${emp.code}] ${emp.fullName} (Status=${emp.status})`);
    console.log(`  └─ User Link: ${userStr}`);
    console.log(`  └─ HR Positions: ${posStr}`);
    console.log(`  └─ Project Assignments: ${paStr}\n`);
  }

  const allPositions = await prisma.position.findMany({
    include: { organizationUnit: true },
  });

  console.log("=== ALL DEFINED POSITIONS IN DATABASE ===");
  console.table(
    allPositions.map((pos) => ({
      id: pos.id,
      code: pos.code,
      name: pos.name,
      unit: pos.organizationUnit?.name || "NONE",
      status: pos.status,
    }))
  );
}

main().finally(async () => {
  await prisma.$disconnect();
});
