import 'dotenv/config';
import prisma from "../src/lib/prisma";

async function main() {
  console.log("=== KIỂM TRA ROLE THỰC TẾ ===");
  
  // Find users with role ACCOUNTANT
  const accountants = await prisma.user.findMany({
    where: { role: "ACCOUNTANT" },
    select: { id: true, name: true, email: true }
  });
  console.log("\n- Danh sách KẾ TOÁN (ACCOUNTANT):");
  accountants.forEach(a => console.log(`  + ${a.name} (${a.email})`));

  // Find users with STOREKEEPER in name or email, or what their role is
  const storekeepers = await prisma.user.findMany({
    where: { 
      OR: [
        { name: { contains: "thủ kho", mode: "insensitive" } },
        { name: { contains: "kho", mode: "insensitive" } },
        { email: { contains: "kho", mode: "insensitive" } }
      ]
    },
    select: { id: true, name: true, email: true, role: true }
  });
  console.log("\n- Người dùng có vẻ là THỦ KHO trong seed:");
  storekeepers.forEach(s => console.log(`  + ${s.name} (${s.email}) - UserRole: ${s.role}`));

  // Check their project roles
  for (const s of storekeepers) {
    const mems = await prisma.projectMember.findMany({
      where: { userId: s.id },
      select: { role: true, project: { select: { name: true } } }
    });
    mems.forEach(m => console.log(`    => Project: ${m.project.name} | ProjectRole: ${m.role}`));
  }
}

main().catch(err => console.error(err));
