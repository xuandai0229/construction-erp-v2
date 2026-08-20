import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: 'postgresql://postgres:dev_rotated_secret_pass_2026_x7!@127.0.0.1:5432/construction_erp_v2_dev?schema=public' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  // HR assignments
  const assignments = await prisma.employeeProjectAssignment.findMany({
    take: 20,
    include: {
      employee: { select: { fullName: true, code: true } },
      project: { select: { code: true, name: true } },
      projectPersonnelRole: { select: { name: true, code: true } },
    },
  });
  console.log('=== EMPLOYEE PROJECT ASSIGNMENTS ===');
  for (const a of assignments) {
    console.log(`  ${a.employee.code} ${a.employee.fullName} -> ${a.project.code} as ${a.projectPersonnelRole.name} (${a.status})`);
  }

  // Templates
  const templates = await prisma.fieldProgressTemplate.findMany({
    include: {
      _count: { select: { items: true, entries: true } },
      project: { select: { code: true, name: true } },
    },
  });
  console.log('\n=== FIELD PROGRESS TEMPLATES ===');
  for (const t of templates) {
    console.log(`  ${t.project.code} | name=${t.name} | items=${t._count.items} entries=${t._count.entries} status=${t.status}`);
  }

  // Users
  const users = await prisma.user.findMany({
    select: { id: true, name: true, role: true, isActive: true, email: true },
    orderBy: { role: 'asc' },
  });
  console.log('\n=== USERS ===');
  for (const u of users) {
    console.log(`  ${u.name} | role=${u.role} | active=${u.isActive} | email=${u.email || 'N/A'}`);
  }

  // Employees
  const employees = await prisma.employee.findMany({
    select: { code: true, fullName: true, status: true, userId: true },
    orderBy: { code: 'asc' },
  });
  console.log('\n=== EMPLOYEES ===');
  for (const e of employees) {
    console.log(`  ${e.code} | ${e.fullName} | status=${e.status} | linked=${e.userId ? 'YES' : 'NO'}`);
  }

  // Org units
  const orgs = await prisma.organizationUnit.findMany({
    select: { code: true, name: true, isActive: true },
  });
  console.log('\n=== ORGANIZATION UNITS ===');
  for (const o of orgs) {
    console.log(`  ${o.code} | ${o.name} | active=${o.isActive}`);
  }

  // Positions
  const positions = await prisma.position.findMany({
    select: { code: true, title: true, isActive: true },
  });
  console.log('\n=== POSITIONS ===');
  for (const p of positions) {
    console.log(`  ${p.code} | ${p.title} | active=${p.isActive}`);
  }

  // Project members
  const members = await prisma.projectMember.findMany({
    take: 20,
    include: {
      user: { select: { name: true } },
      project: { select: { code: true } },
    },
  });
  console.log('\n=== PROJECT MEMBERS (sample) ===');
  for (const m of members) {
    console.log(`  ${m.project.code} | ${m.user.name} | role=${m.role} | active=${m.isActive}`);
  }

  // Audit log sample
  const audits = await prisma.auditLog.groupBy({
    by: ['action'],
    _count: true,
    orderBy: { _count: { action: 'desc' } },
    take: 20,
  });
  console.log('\n=== AUDIT LOG ACTIONS (top 20) ===');
  for (const a of audits) {
    console.log(`  ${a.action}: ${a._count}`);
  }

  const auditEntities = await prisma.auditLog.groupBy({
    by: ['entityType'],
    _count: true,
    orderBy: { _count: { entityType: 'desc' } },
  });
  console.log('\n=== AUDIT LOG ENTITY TYPES ===');
  for (const a of auditEntities) {
    console.log(`  ${a.entityType}: ${a._count}`);
  }

  await prisma['$disconnect']();
  await pool.end();
}

run().catch(console.error);
