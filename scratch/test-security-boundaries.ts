import prisma from "../src/lib/prisma";
import { getSession } from "../src/lib/auth";
import { resolvePermission } from "../src/lib/permissions/permission-resolver";
import { canAccessProject } from "../src/lib/rbac";
import { parseDocumentUploadRequest } from "../src/lib/documents/upload-request";
import { validateDocumentUploadPolicy } from "../src/lib/documents/validation";
import { NextRequest } from "next/server";

async function main() {
  console.log("=== RUNNING SECURITY & RUNTIME BOUNDARY TESTS ===");

  // 1. Fetch 2 distinct users and 2 distinct projects from DB
  const users = await prisma.user.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, email: true, role: true, name: true },
    take: 5
  });

  const projects = await prisma.project.findMany({
    where: { deletedAt: null },
    select: { id: true, code: true, name: true },
    take: 5
  });

  console.log(`Found ${users.length} active users and ${projects.length} projects.`);

  if (projects.length < 2) {
    console.log("Warning: Need at least 2 projects for IDOR testing.");
    return;
  }

  const projectA = projects[0];
  const projectB = projects[1];

  console.log(`Project A: ${projectA.name} (${projectA.id})`);
  console.log(`Project B: ${projectB.name} (${projectB.id})`);

  // 2. Find a user assigned ONLY to Project A
  const assignmentA = await prisma.projectAssignment.findFirst({
    where: { projectId: projectA.id, status: "ACTIVE", deletedAt: null },
    include: { employee: { include: { user: true } } }
  });

  let userA = users.find(u => u.role !== "ADMIN");
  if (assignmentA?.employee?.user) {
    userA = assignmentA.employee.user;
  }

  if (!userA) {
    console.log("No non-admin user found, creating mock session boundary test.");
    userA = users[0];
  }

  console.log(`Testing IDOR with User A: ${userA.name} (${userA.role}) against Project B: ${projectB.name}`);

  // Test 1: Project Scope IDOR Check for User A accessing Project B
  const sessionUserA = { id: userA.id, role: userA.role as any };
  const canAccessB = await canAccessProject(sessionUserA, projectB.id);
  const permDocB = await resolvePermission(sessionUserA, "documents.view", { projectId: projectB.id });
  const permReportB = await resolvePermission(sessionUserA, "reports.view", { projectId: projectB.id });

  console.log(`[IDOR Test - Documents] User A -> Project B access allowed? ${canAccessB} | Perm allowed? ${permDocB.allowed}`);
  console.log(`[IDOR Test - Reports] User A -> Project B access allowed? ${canAccessB} | Perm allowed? ${permReportB.allowed}`);

  // Test 2: Input Validation Fail Safely Tests
  console.log("\n--- Testing Input Validation Failure Safety ---");
  try {
    const invalidReq = new NextRequest("http://localhost/api/documents/upload");
    parseDocumentUploadRequest(invalidReq);
    console.log("FAIL: Expected upload parse to throw error for missing params!");
  } catch (err: any) {
    console.log(`PASS: Upload parser threw validation error cleanly: "${err.message}"`);
  }

  // Test 3: Upload Policy & Magic Byte Validation
  console.log("\n--- Testing Upload File Policy & Magic Byte Security ---");
  const policyCheck = validateDocumentUploadPolicy(
    { name: "test_file.exe", size: 1024 * 1024 * 100 },
    { maxUploadSizeMb: 10, allowedExtensions: [".pdf", ".docx", ".png"], enforceNamingConvention: false, autoVersioning: true }
  );

  console.log(`[Policy Check] Upload .exe (100MB) valid? ${policyCheck.valid} | Reason: "${policyCheck.reason}"`);

  // Test 4: Check Unauthenticated HTTP status on endpoints
  console.log("\n--- Testing Unauthenticated Endpoints via HTTP ---");
  const endpointsToTest = [
    "/api/documents/load-more?projectId=123&type=files",
    "/api/hr/reports/export",
    "/api/reports/safety/plans",
    "/api/supervision/weekly/123/export",
  ];

  for (const ep of endpointsToTest) {
    try {
      const res = await fetch(`http://localhost:3000${ep}`);
      console.log(`[HTTP Unauth] GET ${ep} => Status: ${res.status}`);
    } catch (e: any) {
      console.log(`[HTTP Unauth] GET ${ep} => Connection error (server may not be running on 3000): ${e.message}`);
    }
  }

  console.log("\n=== SECURITY BOUNDARY TESTS COMPLETED ===");
}

main().catch(console.error);
