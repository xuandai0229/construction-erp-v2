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
  const allRoles = [
    "ADMIN",
    "DIRECTOR",
    "DEPUTY_DIRECTOR",
    "CHIEF_COMMANDER",
    "MANAGER",
    "ENGINEER",
    "STAFF",
    "SUPERVISION_HEAD",
    "CONSTRUCTION_SUPERVISOR",
  ] as const;

  console.log("==================================================");
  console.log("EXACT RUNTIME DATABASE USER.ROLE AUDIT");
  console.log("==================================================");

  for (const role of allRoles) {
    const count = await prisma.user.count({ where: { role } });
    console.log(`  ${role.padEnd(25)}: ${count}`);
  }

  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      deletedAt: true,
      employee: {
        select: {
          id: true,
          code: true,
          fullName: true,
          status: true,
        },
      },
    },
    orderBy: { role: "asc" },
  });

  console.log("\n=== FULL USER IDENTITY & EMPLOYEE AUDIT TABLE ===");
  console.table(
    allUsers.map((u) => ({
      userId: u.id,
      login: u.username || u.email,
      name: u.name,
      userRole: u.role,
      active: u.isActive,
      employeeCode: u.employee?.code || "NONE",
      employeeName: u.employee?.fullName || "NONE",
    }))
  );
}

main().finally(async () => {
  await prisma.$disconnect();
});
