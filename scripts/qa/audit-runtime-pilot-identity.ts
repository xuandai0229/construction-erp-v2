import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log("==================================================");
  console.log("RUNTIME DATABASE PILOT IDENTITY RECONCILIATION");
  console.log("Database URL:", (process.env.DATABASE_URL || "").replace(/:[^:@]+@/, ":***@"));
  console.log("==================================================");

  const users = await prisma.user.findMany({
    orderBy: { username: "asc" },
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
      projectMembers: {
        where: { isActive: true },
        select: {
          project: {
            select: {
              code: true,
              name: true,
            },
          },
          role: true,
        },
      },
    },
  });

  console.log(`\nTOTAL USERS IN RUNTIME DB: ${users.length}\n`);

  console.log("--- 1. ALL ADMIN ACCOUNTS ---");
  const admins = users.filter((u) => u.role === "ADMIN");
  for (const a of admins) {
    console.log(
      JSON.stringify(
        {
          id: a.id,
          username: a.username,
          email: a.email,
          name: a.name,
          role: a.role,
          isActive: a.isActive,
          deletedAt: a.deletedAt,
          isEligibleForPilot: a.isActive && !a.deletedAt,
        },
        null,
        2
      )
    );
  }

  console.log("\n--- 2. ALL CHIEF COMMANDER ACCOUNTS ---");
  const commanders = users.filter((u) => u.role === "CHIEF_COMMANDER");
  for (const c of commanders) {
    console.log(
      JSON.stringify(
        {
          id: c.id,
          username: c.username,
          email: c.email,
          name: c.name,
          role: c.role,
          isActive: c.isActive,
          deletedAt: c.deletedAt,
          employeeCode: c.employee?.code || null,
          employeeFullName: c.employee?.fullName || null,
          employeeStatus: c.employee?.status || null,
          activeProjects: c.projectMembers.map((m) => `${m.project.code}: ${m.project.name} (${m.role})`),
          isEligibleForPilot: c.isActive && !c.deletedAt,
        },
        null,
        2
      )
    );
  }

  console.log("\n--- 3. SPECIFIC AUDIT: NV-2026-0002 & NV-2026-0003 ---");
  const nv2 = users.find((u) => u.username === "NV-2026-0002" || u.employee?.code === "NV-2026-0002");
  const nv3 = users.find((u) => u.username === "NV-2026-0003" || u.employee?.code === "NV-2026-0003");

  console.log(
    "NV-2026-0002 exact DB record:",
    nv2
      ? {
          id: nv2.id,
          username: nv2.username,
          name: nv2.name,
          role: nv2.role,
          isActive: nv2.isActive,
          deletedAt: nv2.deletedAt,
          employeeCode: nv2.employee?.code,
          employeeFullName: nv2.employee?.fullName,
          assignedProjects: nv2.projectMembers.map((m) => m.project.code),
        }
      : "NOT_FOUND"
  );

  console.log(
    "NV-2026-0003 exact DB record:",
    nv3
      ? {
          id: nv3.id,
          username: nv3.username,
          name: nv3.name,
          role: nv3.role,
          isActive: nv3.isActive,
          deletedAt: nv3.deletedAt,
          employeeCode: nv3.employee?.code,
          employeeFullName: nv3.employee?.fullName,
          assignedProjects: nv3.projectMembers.map((m) => m.project.code),
        }
      : "NOT_FOUND"
  );

  console.log("\n==================================================");
  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
