import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import * as crypto from "crypto";

dotenv.config();

const Module = require("module");
const originalRequire = Module.prototype.require;

let currentSession: any = null;

Module.prototype.require = function() {
  if (arguments[0] === "next/headers") {
    return {
      cookies: () => ({
        get: () => ({ value: "fake-token" })
      })
    };
  }
  if (arguments[0] === "@/lib/auth" || arguments[0].endsWith("lib/auth")) {
    const auth = originalRequire.apply(this, arguments as any);
    return {
      ...auth,
      getSession: async () => currentSession,
    };
  }
  if (arguments[0] === "next/cache") {
    return { revalidatePath: () => {} };
  }
  return originalRequire.apply(this, arguments as any);
};

// Now require actions
const { getProjectWorkItems, createSiteReport } = require("../src/app/(dashboard)/reports/actions");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function runTest() {
  console.log("=== QA: Reports RBAC Guard Check ===");
  const projectCode = "HN-TH-2026-001";

  const project = await prisma.project.findUnique({ where: { code: projectCode } });
  if (!project) {
    console.error(`Project ${projectCode} not found!`);
    process.exit(1);
  }

  // Find a valid user in the project
  const member = await prisma.projectMember.findFirst({
    where: { projectId: project.id },
    include: { user: true }
  });
  if (!member) throw new Error("No project member found");

  const authUser = member.user;
  
  // Find a user NOT in the project (or create one)
  const unauthEmail = `temp.unauth.${Date.now()}@test.local`;
  const unauthUser = await prisma.user.create({
    data: {
      email: unauthEmail,
      username: `temp_${Date.now()}`,
      name: "Unauthorized User",
      password: "password123",
      role: "STAFF",
      isActive: true,
    },
  });

  // TEST 1: User IN project calls getProjectWorkItems -> PASS
  console.log("\n[TEST 1] Authorized user calls getProjectWorkItems");
  currentSession = { id: authUser.id, role: authUser.role };
  try {
    const items = await getProjectWorkItems(project.id);
    console.log(`PASS: Returned ${items.length} work items.`);
  } catch (e: any) {
    console.error("FAIL:", e.message);
    process.exit(1);
  }

  // TEST 2: User NOT in project calls getProjectWorkItems -> BLOCKED
  console.log("\n[TEST 2] Unauthorized user calls getProjectWorkItems");
  currentSession = { id: unauthUser.id, role: unauthUser.role };
  try {
    await getProjectWorkItems(project.id);
    console.error("FAIL: Should have been blocked!");
    process.exit(1);
  } catch (e: any) {
    if (e.message.includes("Không có quyền") || e.message.includes("Unauthorized")) {
      console.log(`PASS: Blocked successfully (${e.message}).`);
    } else {
      console.error("FAIL with unexpected error:", e.message);
      process.exit(1);
    }
  }

  // TEST 3: User NOT in project calls createSiteReport -> BLOCKED
  console.log("\n[TEST 3] Unauthorized user calls createSiteReport");
  try {
    await createSiteReport({
      projectId: project.id,
      date: new Date().toISOString(),
      type: "DAILY",
      workLines: [{ workContent: "Test content", quantityToday: 1 }]
    });
    console.error("FAIL: Should have been blocked!");
    process.exit(1);
  } catch (e: any) {
    if (e.message.includes("Không có quyền") || e.message.includes("Unauthorized")) {
      console.log(`PASS: Blocked successfully (${e.message}).`);
    } else {
      console.error("FAIL with unexpected error:", e.message);
      process.exit(1);
    }
  }

  // Check no garbage report created
  const unauthReports = await prisma.siteReport.count({ where: { createdById: unauthUser.id } });
  if (unauthReports > 0) {
    console.error(`FAIL: Garbage report was created by unauthorized user! Count: ${unauthReports}`);
    process.exit(1);
  } else {
    console.log(`PASS: No garbage report created.`);
  }

  // TEST 4: User IN project calls createSiteReport -> PASS
  console.log("\n[TEST 4] Authorized user calls createSiteReport");
  currentSession = { id: authUser.id, role: authUser.role };
  try {
    const result = await createSiteReport({
      projectId: project.id,
      date: new Date().toISOString(),
      type: "DAILY",
      summary: "QA Test summary",
      workLines: [{ workContent: "Test work content", quantityToday: 1, unit: "m" }]
    }, true); // as draft
    console.log(`PASS: Created draft report ${result.reportNo}`);
    
    // Cleanup
    await prisma.siteReport.delete({ where: { id: result.id } });
  } catch (e: any) {
    console.error("FAIL:", e.message);
    process.exit(1);
  }
  
  await prisma.user.delete({ where: { id: unauthUser.id } });

  console.log("\n=== ALL RBAC GUARDS PASS ===");
  process.exit(0);
}

runTest().catch((e) => {
  console.error(e);
  process.exit(1);
});
