/**
 * ROTATE ADMIN PASSWORD — Secure password rotation script.
 *
 * Usage:
 *   NEW_ADMIN_PASSWORD="<your-strong-password>" npx tsx scripts/admin/rotate-admin-password.ts
 *
 * Rules:
 *   - Password is read ONLY from the NEW_ADMIN_PASSWORD environment variable.
 *   - Password is NEVER printed, logged, or written to any file.
 *   - Uses the same bcrypt hash pipeline as the login API route.
 *   - Script is idempotent: running it again with the same password is safe.
 *   - Only mutates the password field of the preserved admin account.
 */
import 'dotenv/config';
import prisma from '../../src/lib/prisma';
import * as bcrypt from 'bcryptjs';

const PRESERVED_ADMIN_ID = 'cmroatu6r0000mowklk61sv56';

async function main() {
  const newPassword = process.env.NEW_ADMIN_PASSWORD;

  if (!newPassword) {
    console.error('❌ ERROR: Biến môi trường NEW_ADMIN_PASSWORD chưa được cung cấp.');
    console.error('   Cách sử dụng: NEW_ADMIN_PASSWORD="<mật-khẩu-mạnh>" npx tsx scripts/admin/rotate-admin-password.ts');
    process.exit(1);
  }

  if (newPassword.length < 8) {
    console.error('❌ ERROR: Mật khẩu phải có ít nhất 8 ký tự.');
    process.exit(1);
  }

  // Verify admin exists and is active
  const admin = await prisma.user.findUnique({
    where: { id: PRESERVED_ADMIN_ID },
    select: { id: true, email: true, name: true, role: true, isActive: true, deletedAt: true },
  });

  if (!admin) {
    console.error(`❌ ERROR: Không tìm thấy admin với ID ${PRESERVED_ADMIN_ID}`);
    process.exit(1);
  }

  if (admin.role !== 'ADMIN' || !admin.isActive || admin.deletedAt !== null) {
    console.error('❌ ERROR: Tài khoản không phải ADMIN active.');
    process.exit(1);
  }

  // Hash using same bcrypt pipeline as login route (bcryptjs, salt rounds 10)
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password
  await prisma.user.update({
    where: { id: PRESERVED_ADMIN_ID },
    data: { password: hashedPassword, updatedAt: new Date() },
  });

  // Verify the update was successful
  const updated = await prisma.user.findUnique({
    where: { id: PRESERVED_ADMIN_ID },
    select: { password: true, updatedAt: true },
  });

  if (!updated || !updated.password) {
    console.error('❌ ERROR: Password update verification failed.');
    process.exit(1);
  }

  const verifyMatch = await bcrypt.compare(newPassword, updated.password);
  if (!verifyMatch) {
    console.error('❌ ERROR: Post-update bcrypt verification failed — hash mismatch.');
    process.exit(1);
  }

  console.log('✅ Admin password rotated successfully.');
  console.log(`   Admin ID: ${admin.id.substring(0, 4)}...${admin.id.substring(admin.id.length - 4)}`);
  console.log(`   Updated at: ${updated.updatedAt.toISOString()}`);
  console.log('   Password: ROTATED — NOT RECORDED');
  console.log('   Bcrypt verify: PASS');
}

main()
  .catch((e) => {
    console.error('CRITICAL ERROR:', e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
