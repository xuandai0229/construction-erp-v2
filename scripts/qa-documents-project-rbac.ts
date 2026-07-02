import prisma from "../src/lib/prisma";
import { getAccessibleProjectIds } from "../src/lib/rbac";

async function main() {
  console.log("=== BẮT ĐẦU TEST PHÂN QUYỀN RBAC TÀI LIỆU CÔNG TRÌNH ===");

  // 1. Tạo 2 công trình test
  const project1 = await prisma.project.create({
    data: {
      code: "TEST-TAY-HO",
      name: "Dự án Tây Hồ",
      status: "ACTIVE",
    }
  });

  const project2 = await prisma.project.create({
    data: {
      code: "TEST-CAU-GIAY",
      name: "Dự án Cầu Giấy",
      status: "ACTIVE",
    }
  });

  // 2. Tạo User A (STAFF)
  const userA = await prisma.user.create({
    data: {
      email: "usera-tayho@example.com",
      name: "User Tây Hồ",
      role: "STAFF",
      password: "password123",
    }
  });

  // 3. Giao User A vào dự án Tây Hồ
  await prisma.projectMember.create({
    data: {
      projectId: project1.id,
      userId: userA.id,
      isActive: true,
      role: "QA_QC"
    }
  });

  // 4. Test User A query danh sách các project
  // Giả lập session User A
  const sessionUserA = { id: userA.id, role: userA.role };
  const accessibleIdsUserA = await getAccessibleProjectIds(sessionUserA);

  console.log("Danh sách dự án User A được phép truy cập:");
  console.log(accessibleIdsUserA);
  if (accessibleIdsUserA && accessibleIdsUserA.includes(project1.id) && !accessibleIdsUserA.includes(project2.id)) {
    console.log("✅ TEST PASS: User A CHỈ thấy Tây Hồ, KHÔNG thấy Cầu Giấy.");
  } else {
    console.log("❌ TEST FAIL: User A có quyền truy cập sai.");
  }

  // 5. Test DIRECTOR query
  const director = await prisma.user.create({
    data: {
      email: "director-test@example.com",
      name: "Giám Đốc Test",
      role: "DIRECTOR",
      password: "password123",
    }
  });

  const sessionDirector = { id: director.id, role: director.role };
  const accessibleIdsDirector = await getAccessibleProjectIds(sessionDirector);
  
  if (accessibleIdsDirector === null) {
    console.log("✅ TEST PASS: DIRECTOR có quyền truy cập TOÀN BỘ (null).");
  } else {
    console.log("❌ TEST FAIL: DIRECTOR bị giới hạn quyền.");
  }

  // Cleanup
  console.log("Đang dọn dẹp dữ liệu test...");
  await prisma.projectMember.deleteMany({ where: { userId: userA.id } });
  await prisma.project.deleteMany({ where: { id: { in: [project1.id, project2.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [userA.id, director.id] } } });

  console.log("Hoàn tất.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
