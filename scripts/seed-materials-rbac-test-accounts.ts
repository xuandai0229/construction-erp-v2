import { UserRole, ProjectRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("Đang băm mật khẩu chung...");
  const commonPassword = "Test@123456";
  const hashedPassword = await bcrypt.hash(commonPassword, 10);

  console.log("Đang khởi tạo hoặc tìm project test...");
  // Create or find project
  const projectCode = "TEST-MATERIALS-RBAC";
  
  let project = await prisma.project.findUnique({
    where: { code: projectCode }
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        code: projectCode,
        name: "Công trình test phân quyền vật tư",
        status: "ACTIVE",
      }
    });
    console.log(`Đã tạo công trình: ${project.name}`);
  } else {
    console.log(`Công trình đã tồn tại: ${project.name}`);
  }

  // Define users to create
  const usersToCreate = [
    { email: "admin.materials@test.local", name: "Quản trị hệ thống", role: UserRole.ADMIN, projectRole: null },
    { email: "pm.materials@test.local", name: "Quản lý dự án", role: UserRole.ENGINEER, projectRole: ProjectRole.PROJECT_MANAGER },
    { email: "sitecmd.materials@test.local", name: "Chỉ huy công trường", role: UserRole.ENGINEER, projectRole: ProjectRole.SITE_COMMANDER },
    { email: "chief.materials@test.local", name: "Chỉ huy trưởng công trình", role: UserRole.CHIEF_COMMANDER, projectRole: ProjectRole.CHIEF_COMMANDER },
    { email: "assistant.materials@test.local", name: "Chỉ huy phó", role: UserRole.ENGINEER, projectRole: ProjectRole.ASSISTANT_COMMANDER },
    { email: "qaqc.materials@test.local", name: "QA/QC", role: UserRole.ENGINEER, projectRole: ProjectRole.QA_QC },
    { email: "hse.materials@test.local", name: "An toàn lao động", role: UserRole.STAFF, projectRole: ProjectRole.HSE },
    { email: "supervisor.materials@test.local", name: "Giám sát", role: UserRole.ENGINEER, projectRole: ProjectRole.SUPERVISOR },
    { email: "viewer.materials@test.local", name: "Chỉ xem", role: UserRole.STAFF, projectRole: ProjectRole.VIEWER },
    { email: "guest.materials@test.local", name: "User không thuộc công trình", role: UserRole.STAFF, projectRole: null },
    { email: "director.materials@test.local", name: "Giám đốc chưa gán công trình", role: UserRole.DIRECTOR, projectRole: null },
    { email: "staff.materials@test.local", name: "Nhân viên được gán chỉ xem", role: UserRole.STAFF, projectRole: ProjectRole.VIEWER },
  ];

  let createdCount = 0;

  for (const u of usersToCreate) {
    // Upsert User
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        password: hashedPassword,
        isActive: true,
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        password: hashedPassword,
        isActive: true,
      }
    });

    // Handle Project Member
    if (u.projectRole && project) {
      // Upsert project member
      const existingMember = await prisma.projectMember.findFirst({
        where: { projectId: project.id, userId: user.id }
      });

      if (existingMember) {
        await prisma.projectMember.update({
          where: { id: existingMember.id },
          data: { role: u.projectRole }
        });
      } else {
        await prisma.projectMember.create({
          data: {
            projectId: project.id,
            userId: user.id,
            role: u.projectRole
          }
        });
      }
    } else if (!u.projectRole && u.role !== UserRole.ADMIN && project) {
      // Ensure they are NOT in the project (for guest, director)
      await prisma.projectMember.deleteMany({
        where: { projectId: project.id, userId: user.id }
      });
    }

    createdCount++;
  }

  console.log(`Đã tạo/cập nhật ${createdCount} tài khoản test.`);

  // PHASE 4 - Create Material Data
  console.log("Đang tạo dữ liệu vật tư test...");
  const materials = [
    { code: "TEST-XM", name: "Xi măng test", unit: "bao", group: "Vật liệu chính" },
    { code: "TEST-THEP", name: "Thép test", unit: "kg", group: "Vật liệu chính" },
    { code: "TEST-CAT", name: "Cát test", unit: "m3", group: "Vật liệu rời" },
  ];

  for (const m of materials) {
    const existingMat = await prisma.materialItem.findFirst({
      where: { projectId: project.id, code: m.code }
    });

    if (!existingMat) {
      const mat = await prisma.materialItem.create({
        data: {
          projectId: project.id,
          code: m.code,
          name: m.name,
          unit: m.unit,
        }
      });

      // Special setup for TEST-XM
      if (m.code === "TEST-XM") {
        await prisma.projectMaterialStock.create({
          data: {
            projectId: project.id,
            materialItemId: mat.id,
            stock: 70, // 100 - 30
            minStockLevel: 10,
          }
        });

        await prisma.materialMovement.createMany({
          data: [
            {
              projectId: project.id,
              materialItemId: mat.id,
              type: "IMPORT",
              quantity: 100,
              movementDate: new Date(Date.now() - 86400000), // yesterday
              notes: "Nhập test",
            },
            {
              projectId: project.id,
              materialItemId: mat.id,
              type: "EXPORT",
              quantity: 30,
              movementDate: new Date(), // today
              notes: "Xuất test",
            }
          ]
        });
        console.log(`Đã tạo vật tư ${m.code} kèm tồn kho 70 và lịch sử nhập/xuất.`);
      } else {
        console.log(`Đã tạo vật tư ${m.code}.`);
      }
    }
  }

  console.log("Hoàn thành seed dữ liệu test RBAC Materials!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
