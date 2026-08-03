"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { writeAuditLog, writeSecurityAuditEvent } from "@/lib/audit";
import { canManageProjects, isSystemAdmin } from "@/lib/rbac";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const projectSchema = z.object({
  code: z.string()
    .min(1, "Mã công trình là bắt buộc")
    .max(50, "Mã công trình không được vượt quá 50 ký tự"),
  name: z.string()
    .min(1, "Tên công trình là bắt buộc")
    .max(500, "Tên công trình không được vượt quá 500 ký tự"),
  displayName: z.string()
    .max(120, "Tên hiển thị không được vượt quá 120 ký tự")
    .optional()
    .or(z.literal('')),
  investor: z.string().max(200, "Chủ đầu tư không được vượt quá 200 ký tự").optional().or(z.literal('')),
  location: z.string().max(200, "Địa điểm không được vượt quá 200 ký tự").optional().or(z.literal('')),
  description: z.string().max(1000, "Mô tả không được vượt quá 1000 ký tự").optional().or(z.literal('')),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]).default("PLANNING"),
  startDate: z.string().optional().transform(val => val ? new Date(val) : null),
  endDate: z.string().optional().transform(val => val ? new Date(val) : null),
  plannedDurationValue: z.preprocess((value) => value === "" || value == null ? null : Number(value), z.number().int().positive("Thời lượng phải là số nguyên dương").nullable()),
  plannedDurationUnit: z.enum(["DAY", "MONTH"]).nullable().or(z.literal("")),
});

const DEFAULT_FOLDERS = [
  "01. Hồ sơ pháp lý công trình",
  "02. Bản vẽ thiết kế",
  "03. Biên bản nghiệm thu",
  "04. Vật tư thiết bị",
  "05. Hình ảnh tiến độ",
  "06. Báo cáo hiện trường",
];

export async function createProject(prevState: unknown, formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Vui lòng đăng nhập" };

  if (!canManageProjects(session)) {
    await writeSecurityAuditEvent({ eventType: "SOURCE_MUTATION_DENIED", actorId: session.id, role: session.role, action: "projects.create", resourceType: "Project", resourceId: "NEW", reasonCode: "PROJECT_MANAGEMENT_DENIED" });
    return { error: "Bạn không có quyền tạo công trình" };
  }

  const rawData = Object.fromEntries(formData.entries());
  
  try {
    const validatedData = projectSchema.parse(rawData);
    const projectData = {
      ...validatedData,
      displayName: validatedData.displayName || null,
      plannedDurationUnit: validatedData.plannedDurationValue ? (validatedData.plannedDurationUnit || "DAY") : null
    };

    // Kiểm tra tính hợp lệ của ngày (Ngày bắt đầu phải <= Ngày kết thúc, cho phép bằng nhau)
    if (validatedData.startDate && validatedData.endDate && validatedData.startDate > validatedData.endDate) {
      return { error: "Ngày kết thúc không được nhỏ hơn ngày bắt đầu." };
    }

    const existing = await prisma.project.findUnique({ where: { code: validatedData.code } });
    if (existing) {
      return { error: "Mã công trình đã tồn tại. Vui lòng chọn mã khác." };
    }

    const project = await prisma.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: projectData as any,
      });

      await Promise.all(
        DEFAULT_FOLDERS.map((folderName) =>
          tx.documentFolder.create({
            data: {
              projectId: newProject.id,
              name: folderName,
            },
          })
        )
      );

      return newProject;
    });

    await writeAuditLog({
      userId: session.id,
      projectId: project.id,
      action: "CREATE",
      entityType: "Project",
      entityId: project.id,
      afterData: project as unknown as Record<string, unknown>,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: (error as any).errors[0].message };
    }
    return { error: "Đã xảy ra lỗi hệ thống" };
  }

  revalidatePath("/projects");
  redirect("/projects");
}

export async function updateProject(id: string, prevState: unknown, formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Vui lòng đăng nhập" };

  if (!canManageProjects(session)) {
    await writeSecurityAuditEvent({ eventType: "SOURCE_MUTATION_DENIED", actorId: session.id, role: session.role, action: "projects.update", resourceType: "Project", resourceId: id, projectId: id, reasonCode: "PROJECT_MANAGEMENT_DENIED" });
    return { error: "Bạn không có quyền sửa công trình" };
  }

  const rawData = Object.fromEntries(formData.entries());

  try {
    const validatedData = projectSchema.parse(rawData);
    const projectData = {
      ...validatedData,
      displayName: validatedData.displayName || null,
      plannedDurationUnit: validatedData.plannedDurationValue ? (validatedData.plannedDurationUnit || "DAY") : null
    };
    
    // Kiểm tra tính hợp lệ của ngày (Ngày bắt đầu phải <= Ngày kết thúc, cho phép bằng nhau)
    if (validatedData.startDate && validatedData.endDate && validatedData.startDate > validatedData.endDate) {
      return { error: "Ngày kết thúc không được nhỏ hơn ngày bắt đầu." };
    }

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) return { error: "Không tìm thấy công trình" };

    // Chặn sửa đổi nếu công trình đã hoàn thành/hủy trừ khi là Admin
    if ((existing.status === 'COMPLETED' || existing.status === 'CANCELLED') && !isSystemAdmin(session)) {
      return { error: "Công trình đã hoàn thành hoặc đã hủy, không thể chỉnh sửa." };
    }

    if (validatedData.code !== existing.code) {
       const codeConflict = await prisma.project.findUnique({ where: { code: validatedData.code } });
       if (codeConflict) return { error: "Mã công trình mới đã tồn tại." };
    }

    const updated = await prisma.project.update({
      where: { id },
      data: projectData as any,
    });

    await writeAuditLog({
      userId: session.id,
      projectId: id,
      action: "UPDATE",
      entityType: "Project",
      entityId: id,
      beforeData: existing as unknown as Record<string, unknown>,
      afterData: updated as unknown as Record<string, unknown>,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: (error as any).errors[0].message };
    }
    return { error: "Đã xảy ra lỗi hệ thống" };
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  redirect("/projects");
}

export async function deleteProject(id: string) {
  const session = await getSession();
  if (!session) return { error: "Vui lòng đăng nhập" };

  if (!canManageProjects(session)) {
    await writeSecurityAuditEvent({ eventType: "SOURCE_MUTATION_DENIED", actorId: session.id, role: session.role, action: "projects.delete", resourceType: "Project", resourceId: id, projectId: id, reasonCode: "PROJECT_MANAGEMENT_DENIED" });
    return { error: "Bạn không có quyền xóa công trình" };
  }

  try {
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing || existing.deletedAt !== null) return { error: "Không tìm thấy công trình" };

    // Chặn xóa nếu công trình đã hoàn thành/hủy trừ khi là Admin
    if ((existing.status === 'COMPLETED' || existing.status === 'CANCELLED') && !isSystemAdmin(session)) {
      return { error: "Công trình đã hoàn thành hoặc đã hủy, không thể xóa." };
    }

    const deleted = await prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await writeAuditLog({
      userId: session.id,
      projectId: id,
      action: "SOFT_DELETE",
      entityType: "Project",
      entityId: id,
      beforeData: existing as unknown as Record<string, unknown>,
      afterData: deleted as unknown as Record<string, unknown>,
    });

    revalidatePath("/projects");
    return { success: true };
  } catch (error) {
    return { error: "Đã xảy ra lỗi khi xóa" };
  }
}
