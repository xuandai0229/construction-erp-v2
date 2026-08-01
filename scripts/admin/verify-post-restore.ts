/**
 * VERIFY POST-RESTORE — Read-only verification script to check integrity after database restoration.
 * 
 * Performs checks on:
 *   1. Preserved Admin presence and attributes (isActive, role, deletedAt).
 *   2. Presence and records count of restored business tables.
 *   3. Foreign key consistency (check for orphans).
 * 
 * Usage: npx tsx scripts/admin/verify-post-restore.ts
 */
import 'dotenv/config';
import prisma from '../../src/lib/prisma';

const PRESERVED_ADMIN_ID = 'cmroatu6r0000mowklk61sv56';

async function main() {
  console.log('--- STARTING POST-RESTORE VERIFICATION ---');

  // 1. Check Preserved Admin
  const admin = await prisma.user.findUnique({
    where: { id: PRESERVED_ADMIN_ID },
    select: { id: true, email: true, name: true, role: true, isActive: true, deletedAt: true }
  });

  if (!admin || admin.role !== 'ADMIN' || !admin.isActive || admin.deletedAt !== null) {
    console.error('❌ ERROR: Preserved Admin is either missing or not active/ADMIN!');
    process.exit(1);
  }
  console.log(`✅ Admin account found: Name="${admin.name}", Email="${admin.email.substring(0, 2)}***@${admin.email.split('@')[1]}"`);

  // 2. Read database record counts to verify restoration
  const userCount = await prisma.user.count();
  const projectCount = await prisma.project.count();
  const siteReportCount = await prisma.siteReport.count();
  
  console.log(`- Total Users: ${userCount}`);
  console.log(`- Total Projects: ${projectCount}`);
  console.log(`- Total Site Reports: ${siteReportCount}`);

  if (projectCount === 0 && siteReportCount === 0) {
    console.warn('⚠️ WARNING: Restored database has zero projects and site reports. Verify if the correct backup snapshot was used.');
  } else {
    console.log('✅ Database contains restored business records.');
  }

  // 3. Foreign key integrity checks
  const documentsWithoutProject = await prisma.document.count({
    where: { projectId: { notIn: (await prisma.project.findMany({ select: { id: true } })).map(p => p.id) } }
  });
  
  if (documentsWithoutProject > 0) {
    console.error(`❌ FK ERROR: Found ${documentsWithoutProject} document(s) referencing non-existent projects!`);
    process.exit(1);
  }
  console.log('✅ Foreign key consistency checks passed.');

  console.log('--- POST-RESTORE VERIFICATION COMPLETED SUCCESSFULLY ---');
}

main()
  .catch(e => {
    console.error('VERIFICATION FAILED:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
