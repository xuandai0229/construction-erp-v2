import "dotenv/config";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("=== KIỂM TRA ROLE VẬN HÀNH VẬT TƯ ===");

  const storekeepers = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: "thủ kho", mode: "insensitive" } },
        { name: { contains: "kho", mode: "insensitive" } },
        { email: { contains: "kho", mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, email: true, role: true },
  });

  console.log("Người dùng có dấu hiệu phụ trách kho:");
  for (const user of storekeepers) {
    console.log(`- ${user.name} (${user.email}) | System role: ${user.role}`);
    const memberships = await prisma.projectMember.findMany({
      where: { userId: user.id, isActive: true, deletedAt: null, leftAt: null },
      select: { role: true, project: { select: { name: true } } },
    });
    for (const membership of memberships) {
      console.log(`  - ${membership.project.name} | Project role: ${membership.role}`);
    }
  }
}

void main().finally(() => prisma.$disconnect());
