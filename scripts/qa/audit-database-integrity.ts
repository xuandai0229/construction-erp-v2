import "dotenv/config";
import prisma from "../../src/lib/prisma";

async function main() {
  console.log("=== STARTING REAL DATABASE DATA INTEGRITY AUDIT ===");

  // 1. Audit Users
  const users = await prisma.user.findMany({
    include: {
      projectMembers: {
        include: { project: true }
      }
    }
  });

  console.log(`Total User records in DB: ${users.length}`);
  const deletedUsers = users.filter(u => u.deletedAt !== null);
  const activeUsers = users.filter(u => u.deletedAt === null && u.isActive);
  const lockedUsers = users.filter(u => u.deletedAt === null && !u.isActive);

  console.log(`- Active Users: ${activeUsers.length}`);
  console.log(`- Locked Users: ${lockedUsers.length}`);
  console.log(`- Soft-deleted Users: ${deletedUsers.length}`);

  // Check email/username duplicates
  const emails = users.map(u => u.email.toLowerCase());
  const duplicateEmails = emails.filter((e, i) => emails.indexOf(e) !== i);
  if (duplicateEmails.length > 0) {
    console.error(`[FAIL] Duplicate emails found: ${duplicateEmails.join(", ")}`);
  } else {
    console.log(`[PASS] 0 Duplicate user emails.`);
  }

  // 2. Audit Projects
  const projects = await prisma.project.findMany({
    include: {
      members: {
        include: { user: true }
      }
    }
  });

  console.log(`\nTotal Project records in DB: ${projects.length}`);
  const deletedProjects = projects.filter(p => p.deletedAt !== null);
  const activeProjects = projects.filter(p => p.deletedAt === null);

  console.log(`- Active Projects: ${activeProjects.length}`);
  console.log(`- Soft-deleted Projects: ${deletedProjects.length}`);

  const codes = projects.map(p => p.code.toLowerCase());
  const duplicateCodes = codes.filter((c, i) => codes.indexOf(c) !== i);
  if (duplicateCodes.length > 0) {
    console.error(`[FAIL] Duplicate project codes found: ${duplicateCodes.join(", ")}`);
  } else {
    console.log(`[PASS] 0 Duplicate project codes.`);
  }

  // 3. Audit Project Memberships & Chief Commanders
  const memberships = await prisma.projectMember.findMany({
    include: {
      user: true,
      project: true,
    }
  });

  console.log(`\nTotal ProjectMember records: ${memberships.length}`);
  const orphanedMemberships = memberships.filter(pm => !pm.user || !pm.project);
  if (orphanedMemberships.length > 0) {
    console.error(`[FAIL] Found ${orphanedMemberships.length} orphaned memberships.`);
  } else {
    console.log(`[PASS] 0 Orphaned ProjectMember records.`);
  }

  // Check for duplicate ProjectMember records for same (userId, projectId)
  const userProjectPairs = memberships.map(pm => `${pm.userId}:${pm.projectId}`);
  const duplicatePairs = userProjectPairs.filter((pair, i) => userProjectPairs.indexOf(pair) !== i);
  if (duplicatePairs.length > 0) {
    console.error(`[FAIL] Found ${duplicatePairs.length} duplicate (userId, projectId) memberships!`);
  } else {
    console.log(`[PASS] 0 Duplicate user-project assignment pairs.`);
  }

  // 4. Print User ↔ Project Assignment Matrix
  console.log("\n=== USER ↔ PROJECT ASSIGNMENT MATRIX ===");
  users.forEach(u => {
    const activeMemberships = u.projectMembers.filter(pm => pm.deletedAt === null && pm.isActive && pm.project.deletedAt === null);
    console.log(`User: [${u.id}] ${u.name} (${u.email}) | Role: ${u.role} | Status: ${u.deletedAt ? "DELETED" : u.isActive ? "ACTIVE" : "LOCKED"}`);
    if (activeMemberships.length === 0) {
      console.log(`  └─ (No active assigned projects)`);
    } else {
      activeMemberships.forEach(pm => {
        console.log(`  └─ Project: ${pm.project.displayName || pm.project.name} (${pm.project.code}) | Project Role: ${pm.role}`);
      });
    }
  });

  // 5. Chief Commander Reconciliation across Projects
  console.log("\n=== CHIEF COMMANDERS BY PROJECT ===");
  projects.forEach(p => {
    const commanders = p.members.filter(pm => pm.role === "CHIEF_COMMANDER" && pm.deletedAt === null && pm.isActive && pm.user.deletedAt === null);
    const commanderNames = commanders.map(c => c.user.name).join(", ") || "Chưa phân công";
    console.log(`Project: [${p.code}] ${p.displayName || p.name} -> Commander: ${commanderNames}`);
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
