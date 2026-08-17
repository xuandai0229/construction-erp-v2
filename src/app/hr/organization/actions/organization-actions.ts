"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { checkHrPermission, validateTargetScope } from "@/lib/hr/hr-auth-guard";
import { writeAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import {
  createOrganizationUnit,
  updateOrganizationUnit,
  validateOrgUnitDeactivation,
  createPosition,
  updatePosition,
  validatePositionDeactivation,
  assignUnitManager,
  endUnitManagerTerm,
  transferEmployee,
} from "@/lib/hr/organization-service";
import {
  sanitizeOrganizationUnitAudit,
  sanitizePositionAudit,
  sanitizeManagerAssignmentAudit,
  sanitizeEmployeeTransferAudit,
} from "@/lib/audit-sanitizer";

// --- Zod Schemas ---
const CreateOrgUnitSchema = z.object({
  code: z.string().min(2, "Mã đơn vị phải có ít nhất 2 ký tự").max(50),
  name: z.string().min(2, "Tên đơn vị/phòng ban phải có ít nhất 2 ký tự").max(100),
  parentId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  orderIndex: z.coerce.number().optional().default(0),
});

const UpdateOrgUnitSchema = CreateOrgUnitSchema.extend({
  id: z.string().min(1, "Thiếu ID đơn vị"),
  isActive: z.boolean().optional().default(true),
});

const CreatePositionSchema = z.object({
  code: z.string().min(2, "Mã chức danh phải có ít nhất 2 ký tự").max(50),
  title: z.string().min(2, "Tên chức danh phải có ít nhất 2 ký tự").max(100),
  description: z.string().optional().nullable(),
  level: z.coerce.number().min(1, "Cấp bậc từ 1 đến 10").max(10, "Cấp bậc từ 1 đến 10").optional().nullable(),
});

const UpdatePositionSchema = CreatePositionSchema.extend({
  id: z.string().min(1, "Thiếu ID chức danh"),
  isActive: z.boolean().optional().default(true),
});

const AssignManagerSchema = z.object({
  organizationUnitId: z.string().min(1, "Vui lòng chọn đơn vị/phòng ban"),
  employeeId: z.string().min(1, "Vui lòng chọn nhân viên bổ nhiệm"),
  startDate: z.string().min(1, "Vui lòng chọn ngày hiệu lực"),
  isPrimary: z.boolean().optional().default(true),
  decisionNo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const TransferEmployeeSchema = z.object({
  employeeId: z.string().min(1, "Vui lòng chọn nhân viên"),
  organizationUnitId: z.string().min(1, "Vui lòng chọn phòng ban mới"),
  positionId: z.string().min(1, "Vui lòng chọn chức danh mới"),
  effectiveDate: z.string().min(1, "Vui lòng chọn ngày hiệu lực điều chuyển"),
  decisionNo: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// --- Server Action: Create Org Unit ---
export async function createOrgUnitAction(formData: unknown) {
  const permCheck = await checkHrPermission("hr:organization:manage");
  if (!permCheck.allowed) {
    return { success: false, error: "Bạn không có quyền quản lý cơ cấu tổ chức (hr:organization:manage)" };
  }

  const parsed = CreateOrgUnitSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const scopeCheck = await validateTargetScope(permCheck.context, permCheck.scope, {
    organizationUnitId: parsed.data.parentId || undefined,
  });
  if (!scopeCheck.allowed) {
    return { success: false, error: scopeCheck.reason || "Thao tác bị từ chối bởi quy tắc phạm vi dữ liệu." };
  }

  const currentUserId = permCheck.context.session.id;

  try {
    const unit = await createOrganizationUnit(prisma, parsed.data);

    await writeAuditLog({
      userId: currentUserId,
      action: "ORGANIZATION_UNIT_CREATED",
      entityType: "OrganizationUnit",
      entityId: unit.id,
      afterData: sanitizeOrganizationUnitAudit(unit),
    });

    revalidatePath("/hr/organization");
    revalidatePath("/hr/employees");

    return { success: true, unit };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể tạo đơn vị tổ chức. Vui lòng thử lại." };
  }
}

// --- Server Action: Update Org Unit ---
export async function updateOrgUnitAction(formData: unknown) {
  const permCheck = await checkHrPermission("hr:organization:manage");
  if (!permCheck.allowed) {
    return { success: false, error: "Bạn không có quyền quản lý cơ cấu tổ chức (hr:organization:manage)" };
  }

  const parsed = UpdateOrgUnitSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const scopeCheck = await validateTargetScope(permCheck.context, permCheck.scope, {
    organizationUnitId: parsed.data.id,
  });
  if (!scopeCheck.allowed) {
    return { success: false, error: scopeCheck.reason || "Thao tác bị từ chối bởi quy tắc phạm vi dữ liệu." };
  }

  const currentUserId = permCheck.context.session.id;

  try {
    const unit = await updateOrganizationUnit(prisma, parsed.data);

    await writeAuditLog({
      userId: currentUserId,
      action: "ORGANIZATION_UNIT_UPDATED",
      entityType: "OrganizationUnit",
      entityId: unit.id,
      afterData: sanitizeOrganizationUnitAudit(unit),
    });

    revalidatePath("/hr/organization");
    revalidatePath("/hr/employees");

    return { success: true, unit };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể cập nhật đơn vị tổ chức." };
  }
}

// --- Server Action: Deactivate/Soft Delete Org Unit ---
export async function deleteOrgUnitAction(unitId: string) {
  const permCheck = await checkHrPermission("hr:organization:manage");
  if (!permCheck.allowed) {
    return { success: false, error: "Bạn không có quyền quản lý cơ cấu tổ chức (hr:organization:manage)" };
  }

  const scopeCheck = await validateTargetScope(permCheck.context, permCheck.scope, {
    organizationUnitId: unitId,
  });
  if (!scopeCheck.allowed) {
    return { success: false, error: scopeCheck.reason || "Thao tác bị từ chối bởi quy tắc phạm vi dữ liệu." };
  }

  const currentUserId = permCheck.context.session.id;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const targetUnit = await tx.organizationUnit.findUnique({
        where: { id: unitId },
        select: { id: true, code: true, name: true, isActive: true },
      });
      if (!targetUnit) {
        throw new Error("Đơn vị tổ chức không tồn tại.");
      }

      if (!targetUnit.isActive) {
        throw new Error("Đơn vị tổ chức này đã ở trạng thái ngừng sử dụng.");
      }

      // Soft delete: set isActive = false
      const unit = await tx.organizationUnit.update({
        where: { id: unitId },
        data: { isActive: false },
      });

      await writeAuditLog({
        userId: currentUserId,
        action: "ORGANIZATION_UNIT_DEACTIVATED",
        entityType: "OrganizationUnit",
        entityId: unitId,
        afterData: { id: unitId, code: targetUnit.code, name: targetUnit.name, isActive: false },
      });

      return unit;
    });

    safeRevalidatePath("/hr/organization");
    safeRevalidatePath("/hr/employees");

    return { success: true, unit: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể ngừng sử dụng đơn vị tổ chức." };
  }
}

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore outside request store error in test/CLI context
  }
}

export const deactivateOrgUnitAction = deleteOrgUnitAction;

// --- Server Action: Create Position ---
export async function createPositionAction(formData: unknown) {
  const permCheck = await checkHrPermission("hr:organization:manage");
  if (!permCheck.allowed) {
    return { success: false, error: "Bạn không có quyền quản lý danh mục chức danh (hr:organization:manage)" };
  }

  const parsed = CreatePositionSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const scopeCheck = await validateTargetScope(permCheck.context, permCheck.scope, {});
  if (!scopeCheck.allowed) {
    return { success: false, error: scopeCheck.reason || "Thao tác bị từ chối bởi quy tắc phạm vi dữ liệu." };
  }

  const currentUserId = permCheck.context.session.id;

  try {
    const position = await createPosition(prisma, parsed.data);

    await writeAuditLog({
      userId: currentUserId,
      action: "POSITION_CREATED",
      entityType: "Position",
      entityId: position.id,
      afterData: sanitizePositionAudit(position),
    });

    revalidatePath("/hr/organization");
    revalidatePath("/hr/organization/positions");

    return { success: true, position };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể tạo chức danh mới." };
  }
}

// --- Server Action: Update Position ---
export async function updatePositionAction(formData: unknown) {
  const permCheck = await checkHrPermission("hr:organization:manage");
  if (!permCheck.allowed) {
    return { success: false, error: "Bạn không có quyền quản lý danh mục chức danh (hr:organization:manage)" };
  }

  const parsed = UpdatePositionSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const scopeCheck = await validateTargetScope(permCheck.context, permCheck.scope, {});
  if (!scopeCheck.allowed) {
    return { success: false, error: scopeCheck.reason || "Thao tác bị từ chối bởi quy tắc phạm vi dữ liệu." };
  }

  const currentUserId = permCheck.context.session.id;

  try {
    const position = await updatePosition(prisma, parsed.data);

    await writeAuditLog({
      userId: currentUserId,
      action: "POSITION_UPDATED",
      entityType: "Position",
      entityId: position.id,
      afterData: sanitizePositionAudit(position),
    });

    revalidatePath("/hr/organization");
    revalidatePath("/hr/organization/positions");

    return { success: true, position };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể cập nhật chức danh." };
  }
}

// --- Server Action: Deactivate/Soft Delete Position ---
export async function deletePositionAction(positionId: string) {
  const permCheck = await checkHrPermission("hr:organization:manage");
  if (!permCheck.allowed) {
    return { success: false, error: "Bạn không có quyền quản lý chức danh (hr:organization:manage)" };
  }

  const scopeCheck = await validateTargetScope(permCheck.context, permCheck.scope, {});
  if (!scopeCheck.allowed) {
    return { success: false, error: scopeCheck.reason || "Thao tác bị từ chối bởi quy tắc phạm vi dữ liệu." };
  }

  const currentUserId = permCheck.context.session.id;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const targetPos = await tx.position.findUnique({
        where: { id: positionId },
        select: { id: true, code: true, title: true, isActive: true },
      });
      if (!targetPos) {
        throw new Error("Chức danh không tồn tại.");
      }

      if (!targetPos.isActive) {
        throw new Error("Chức danh này đã ở trạng thái ngừng sử dụng.");
      }

      // Soft delete: set isActive = false
      const pos = await tx.position.update({
        where: { id: positionId },
        data: { isActive: false },
      });

      await writeAuditLog({
        userId: currentUserId,
        action: "POSITION_DEACTIVATED",
        entityType: "Position",
        entityId: positionId,
        afterData: { id: positionId, code: targetPos.code, title: targetPos.title, isActive: false },
      });

      return pos;
    });

    safeRevalidatePath("/hr/organization");
    safeRevalidatePath("/hr/organization/positions");

    return { success: true, position: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể ngừng sử dụng chức danh." };
  }
}

export const deactivatePositionAction = deletePositionAction;

// --- Server Action: Reactivate Org Unit ---
export async function reactivateOrgUnitAction(unitId: string) {
  const permCheck = await checkHrPermission("hr:organization:manage");
  if (!permCheck.allowed) {
    return { success: false, error: "Bạn không có quyền quản lý cơ cấu tổ chức (hr:organization:manage)" };
  }

  const scopeCheck = await validateTargetScope(permCheck.context, permCheck.scope, {
    organizationUnitId: unitId,
  });
  if (!scopeCheck.allowed) {
    return { success: false, error: scopeCheck.reason || "Thao tác bị từ chối bởi quy tắc phạm vi dữ liệu." };
  }

  const currentUserId = permCheck.context.session.id;

  try {
    const updated = await prisma.organizationUnit.update({
      where: { id: unitId },
      data: { isActive: true },
    });

    await writeAuditLog({
      userId: currentUserId,
      action: "ORGANIZATION_UNIT_REACTIVATED",
      entityType: "OrganizationUnit",
      entityId: unitId,
      afterData: sanitizeOrganizationUnitAudit(updated),
    });

    revalidatePath("/hr/organization");
    revalidatePath("/hr/employees");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể kích hoạt lại đơn vị." };
  }
}

// --- Server Action: Reactivate Position ---
export async function reactivatePositionAction(positionId: string) {
  const permCheck = await checkHrPermission("hr:organization:manage");
  if (!permCheck.allowed) {
    return { success: false, error: "Bạn không có quyền quản lý chức danh (hr:organization:manage)" };
  }

  const scopeCheck = await validateTargetScope(permCheck.context, permCheck.scope, {});
  if (!scopeCheck.allowed) {
    return { success: false, error: scopeCheck.reason || "Thao tác bị từ chối bởi quy tắc phạm vi dữ liệu." };
  }

  const currentUserId = permCheck.context.session.id;

  try {
    const updated = await prisma.position.update({
      where: { id: positionId },
      data: { isActive: true },
    });

    await writeAuditLog({
      userId: currentUserId,
      action: "POSITION_REACTIVATED",
      entityType: "Position",
      entityId: positionId,
      afterData: sanitizePositionAudit(updated),
    });

    revalidatePath("/hr/organization/positions");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể kích hoạt lại chức danh." };
  }
}

// --- Server Action: Assign Unit Manager ---
export async function assignUnitManagerAction(formData: unknown) {
  const permCheck = await checkHrPermission("hr:organization:manage");
  if (!permCheck.allowed) {
    return { success: false, error: "Bạn không có quyền bổ nhiệm người quản lý đơn vị (hr:organization:manage)" };
  }

  const parsed = AssignManagerSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const scopeCheck = await validateTargetScope(permCheck.context, permCheck.scope, {
    organizationUnitId: parsed.data.organizationUnitId,
    employeeId: parsed.data.employeeId,
  });
  if (!scopeCheck.allowed) {
    return { success: false, error: scopeCheck.reason || "Thao tác bị từ chối bởi quy tắc phạm vi dữ liệu." };
  }

  const currentUserId = permCheck.context.session.id;

  try {
    const assignment = await assignUnitManager(prisma, {
      organizationUnitId: parsed.data.organizationUnitId,
      employeeId: parsed.data.employeeId,
      startDate: new Date(parsed.data.startDate),
      isPrimary: parsed.data.isPrimary ?? true,
      decisionNo: parsed.data.decisionNo || null,
      notes: parsed.data.notes || null,
    });

    await writeAuditLog({
      userId: currentUserId,
      action: "UNIT_MANAGER_ASSIGNED",
      entityType: "OrganizationUnitManagerAssignment",
      entityId: assignment.id,
      afterData: sanitizeManagerAssignmentAudit(assignment),
    });

    revalidatePath("/hr/organization");
    revalidatePath("/hr/organization/managers");

    return { success: true, assignment };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể bổ nhiệm người quản lý đơn vị." };
  }
}

// --- Server Action: End Unit Manager Term ---
export async function endUnitManagerTermAction(assignmentId: string, endDateStr: string) {
  const permCheck = await checkHrPermission("hr:organization:manage");
  if (!permCheck.allowed) {
    return { success: false, error: "Bạn không có quyền quản lý người phụ trách đơn vị (hr:organization:manage)" };
  }

  const existingAssign = await prisma.organizationUnitManagerAssignment.findUnique({
    where: { id: assignmentId },
  });
  if (!existingAssign) {
    return { success: false, error: "Phân công quản lý không tồn tại." };
  }

  const scopeCheck = await validateTargetScope(permCheck.context, permCheck.scope, {
    organizationUnitId: existingAssign.organizationUnitId,
    employeeId: existingAssign.employeeId,
  });
  if (!scopeCheck.allowed) {
    return { success: false, error: scopeCheck.reason || "Thao tác bị từ chối bởi quy tắc phạm vi dữ liệu." };
  }

  const currentUserId = permCheck.context.session.id;

  try {
    const endDate = new Date(endDateStr);
    const updated = await endUnitManagerTerm(prisma, assignmentId, endDate);

    await writeAuditLog({
      userId: currentUserId,
      action: "UNIT_MANAGER_TERM_ENDED",
      entityType: "OrganizationUnitManagerAssignment",
      entityId: assignmentId,
      afterData: sanitizeManagerAssignmentAudit(updated),
    });

    revalidatePath("/hr/organization/managers");

    return { success: true, assignment: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể kết thúc nhiệm kỳ quản lý." };
  }
}

// --- Server Action: Transfer Employee ---
export async function transferEmployeeOrgAction(formData: unknown) {
  const permCheck = await checkHrPermission("hr:organization:manage");
  if (!permCheck.allowed) {
    return { success: false, error: "Bạn không có quyền thực hiện điều chuyển nhân sự (hr:organization:manage)" };
  }

  const parsed = TransferEmployeeSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const scopeCheck = await validateTargetScope(permCheck.context, permCheck.scope, {
    organizationUnitId: parsed.data.organizationUnitId,
    employeeId: parsed.data.employeeId,
  });
  if (!scopeCheck.allowed) {
    return { success: false, error: scopeCheck.reason || "Thao tác bị từ chối bởi quy tắc phạm vi dữ liệu." };
  }

  const currentUserId = permCheck.context.session.id;

  try {
    const newAssignment = await transferEmployee(prisma, {
      employeeId: parsed.data.employeeId,
      organizationUnitId: parsed.data.organizationUnitId,
      positionId: parsed.data.positionId,
      effectiveDate: new Date(parsed.data.effectiveDate),
      decisionNo: parsed.data.decisionNo || null,
      reason: parsed.data.reason || null,
      performedById: currentUserId,
    });

    await writeAuditLog({
      userId: currentUserId,
      action: "EMPLOYEE_ORGANIZATION_TRANSFERRED",
      entityType: "EmployeeOrganizationAssignment",
      entityId: newAssignment.id,
      afterData: sanitizeEmployeeTransferAudit(newAssignment),
    });

    revalidatePath("/hr/employees");
    revalidatePath(`/hr/employees/${parsed.data.employeeId}`);
    revalidatePath("/hr/organization");

    return { success: true, assignment: newAssignment };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể thực hiện điều chuyển nhân sự." };
  }
}
