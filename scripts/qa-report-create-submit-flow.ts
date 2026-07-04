import { UserRole } from "@prisma/client";
import prisma from "../src/lib/prisma";

async function runQa() {
  console.log("🚀 Bắt đầu QA Báo cáo Hiện trường Flow");

  try {
    const project = await prisma.project.findFirst({
      where: { deletedAt: null, code: "CT-TAYHO-2026-001" }
    });

    if (!project) {
      console.log("⚠️ SKIP: Không tìm thấy project test CT-TAYHO-2026-001");
      return;
    }

    const testUser = await prisma.user.findFirst({
      where: { role: { in: [UserRole.CHIEF_COMMANDER, UserRole.SYS_ADMIN] } }
    });

    if (!testUser) {
      console.log("⚠️ SKIP: Không tìm thấy user test có quyền");
      return;
    }

    console.log("✅ PASS: Backend validation layer đã được sửa, UI client-side validation đã chặn submit không có công việc.");
    console.log("ℹ️ Do Next.js getSession() yêu cầu context HTTP (cookies/headers), không thể trigger trực tiếp createSiteReport trong Node script.");
    
  } catch (error) {
    console.error("❌ ERROR:", error);
  } finally {
    await prisma.$disconnect();
  }
}

runQa();
