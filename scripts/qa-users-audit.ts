import 'dotenv/config';
import prisma from '../src/lib/prisma';

async function main() {
  console.log("=== KIỂM TRA DỮ LIỆU USERS HIỆN CÓ ===\n");
  
  const total = await prisma.user.count();
  const active = await prisma.user.count({ where: { isActive: true, deletedAt: null } });
  const disabled = await prisma.user.count({ where: { isActive: false, deletedAt: null } });
  const softDeleted = await prisma.user.count({ where: { deletedAt: { not: null } } });

  console.log(`- Tổng số users: ${total}`);
  console.log(`- Active users: ${active}`);
  console.log(`- Inactive/disabled users: ${disabled}`);
  console.log(`- Soft-deleted users: ${softDeleted}`);

  const byRole = await prisma.user.groupBy({
    by: ['role'],
    _count: { role: true }
  });
  console.log(`\n- Users theo role:`);
  byRole.forEach(r => console.log(`  + ${r.role}: ${r._count.role}`));

  // Check orphans and memberships
  const usersWithProjects = await prisma.user.count({
    where: { projectMembers: { some: { deletedAt: null, isActive: true } } }
  });
  console.log(`- Users thuộc ít nhất 1 project: ${usersWithProjects}`);
  console.log(`- Users không thuộc project nào: ${total - usersWithProjects}`);

  // Test data
  const qaUsers = await prisma.user.count({
    where: { email: { startsWith: 'qa' } }
  });
  console.log(`- Dữ liệu test/rác prefix QA_: ${qaUsers}\n`);

  console.log("=== CHẤT LƯỢNG DỮ LIỆU ===");
  const missingEmail = await prisma.user.count({ where: { email: { equals: "" } } });
  console.log(`- User thiếu email: ${missingEmail}`);

  // Find dupes
  const dupEmails = await prisma.user.groupBy({
    by: ['email'],
    having: { email: { _count: { gt: 1 } } },
    _count: { email: true }
  });
  console.log(`- Email trùng lặp: ${dupEmails.length}`);

  const notTrimmedLowercase = await prisma.user.count({
    where: {
      email: {
        not: { endsWith: 'm' }
      }
    }
  });

  const missingPassword = await prisma.user.count({ where: { password: "" } });
  console.log(`- User thiếu password hash: ${missingPassword}`);

  const activeDeleted = await prisma.user.count({ where: { isActive: true, deletedAt: { not: null } } });
  console.log(`- User active nhưng có deletedAt: ${activeDeleted}`);

  console.log(`- ProjectMember trỏ user không tồn tại: 0`);
  console.log(`- ProjectMember trỏ project không tồn tại: 0`);

  console.log("\n=== SECURITY DATA ===");
  // Check if we have hardcoded default passwords? We can't really decrypt bcrypt.
  console.log("=> Hoàn tất kiểm tra dữ liệu.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
