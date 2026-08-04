"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { checkHrPermission } from "@/lib/hr/hr-auth-guard";
import { writeAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import {
  createOrganizationUnit,
  updateOrganizationUnit,
  validateOrgUnitDeactivation,
  createPosition,
  updatePosition,
  assignUnitManager,
  endUnitManagerTerm,
  transferEmployee,
} from "@/lib/hr/organization-service";

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
  level: z.coerce.number().optional().nullable(),
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

  const currentUserId = permCheck.context.session.id;

  try {
    const unit = await createOrganizationUnit(prisma, parsed.data);

    await writeAuditLog({
      userId: currentUserId,
      action: "ORGANIZATION_UNIT_CREATED",
      entityType: "OrganizationUnit",
      entityId: unit.id,
      afterData: { id: unit.id, code: unit.code, name: unit.name, parentId: unit.parentId },
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

  const currentUserId = permCheck.context.session.id;

  try {
    const unit = await updateOrganizationUnit(prisma, parsed.data);

    await writeAuditLog({
      userId: currentUserId,
      action: "ORGANIZATION_UNIT_UPDATED",
      entityType: "OrganizationUnit",
      entityId: unit.id,
      afterData: { id: unit.id, code: unit.code, name: unit.name, parentId: unit.parentId, isActive: unit.isActive },
    });

    revalidatePath("/hr/organization");
    revalidatePath("/hr/employees");

    return { success: true, unit };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể cập nhật đơn vị tổ chức." };
  }
}

// --- Server Action: Deactivate Org Unit ---
export async function deactivateOrgUnitAction(unitId: string) {
  const permCheck = await checkHrPermission("hr:organization:manage");
  if (!permCheck.allowed) {
    return { success: false, error: "Bạn không có quyền quản lý cơ cấu tổ chức (hr:organization:manage)" };
  }

  const currentUserId = permCheck.context.session.id;

  try {
    await validateOrgUnitDeactivation(prisma, unitId);

    const updated = await prisma.organizationUnit.update({
      where: { id: unitId },
      data: { isActive: false },
    });

    await writeAuditLog({
      userId: currentUserId,
      action: "ORGANIZATION_UNIT_DEACTIVATED",
      entityType: "OrganizationUnit",
      entityId: unitId,
      afterData: { id: updated.id, code: updated.code, name: updated.name, isActive: false },
    });

    revalidatePath("/hr/organization");
    revalidatePath("/hr/employees");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể vô hiệu hóa đơn vị." };
  }
}

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

  const currentUserId = permCheck.context.session.id;

  try {
    const position = await createPosition(prisma, parsed.data);

    await writeAuditLog({
      userId: currentUserId,
      action: "POSITION_CREATED",
      entityType: "Position",
      entityId: position.id,
      afterData: { id: position.id, code: position.code, title: position.title, level: position.level },
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

  const currentUserId = permCheck.context.session.id;

  try {
    const position = await updatePosition(prisma, parsed.data);

    await writeAuditLog({
      userId: currentUserId,
      action: "POSITION_UPDATED",
      entityType: "Position",
      entityId: position.id,
      afterData: { id: position.id, code: position.code, title: position.title, level: position.level, isActive: position.isActive },
    });

    revalidatePath("/hr/organization");
    revalidatePath("/hr/organization/positions");

    return { success: true, position };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể cập nhật chức danh." };
  }
}

// --- Server Action: Deactivate Position ---
export async function deactivatePositionAction(positionId: string) {
  const permCheck = await checkHrPermission("hr:organization:manage");
  if (!permCheck.allowed) {
    return { success: false, error: "Bạn không có quyền quản lý chức danh (hr:organization:manage)" };
  }

  const currentUserId = permCheck.context.session.id;

  const activeAssignmentsCount = await prisma.employeeOrganizationAssignment.count({
    where: { positionId, endDate: null },
  });
  if (activeAssignmentsCount > 0) {
    return { success: false, error: "Không thể vô hiệu hóa chức danh đang được phân công cho nhân viên active." };
  }

  try {
    const updated = await prisma.position.update({
      where: { id: positionId },
      data: { isActive: false },
    });

    await writeAuditLog({
      userId: currentUserId,
      action: "POSITION_DEACTIVATED",
      entityType: "Position",
      entityId: positionId,
      afterData: { id: updated.id, code: updated.code, title: updated.title, isActive: false },
    });

    revalidatePath("/hr/organization/positions");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Không thể vô hiệu hóa chức danh." };
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

  const currentUserId = permCheck.context.session.id;
  const startDateObj = new Date(parsed.data.startDate);
  if (Number.isNaN(startDateObj.getTime())) {
    return { success: false, error: "Ngày hiệu lực bổ nhiệm không hợp lệ." };
  }

  try {
    const managerAssignment = await assignUnitManager(prisma, {
      organizationUnitId: parsed.data.organizationUnitId,
      employeeId: parsed.data.employeeId,
      startDate: startDateObj,
      isPrimary: parsed.data.isPrimary ?? true,
      decisionNo: parsed.data.decisionNo || null,
      appointedById: currentUserId,
    });

    await writeAuditLog({
      userId: currentUserId,
      action: "UNIT_MANAGER_ASSIGNED",
      entityType: "OrganizationUnitManagerAssignment",
      entityId: managerAssignment.id,
      afterData: {
        id: managerAssignment.id,
        organizationUnitId: managerAssignment.organizationUnitId,
        employeeId: managerAssignment.employeeId,
        startDate: managerAssignment.startDate,
        isPrimary: managerAssignment.isPrimary,
      },
    });

    revalidatePath("/hr/organization");
    revalidatePath("/hr/organization/managers");

    return { success: true, managerAssignment };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể phân công người quản lý." };
  }
}

// --- Server Action: End Unit Manager Term ---
export async function endUnitManagerTermAction(assignmentId: string, endDateStr: string) {
  const permCheck = await checkHrPermission("hr:organization:manage");
  if (!permCheck.allowed) {
    return { success: false, error: "Bạn không có quyền quản lý người phụ trách đơn vị (hr:organization:manage)" };
  }

  const currentUserId = permCheck.context.session.id;
  const endDateObj = new Date(endDateStr);
  if (Number.isNaN(endDateObj.getTime())) {
    return { success: false, error: "Ngày kết thúc nhiệm kỳ không hợp lệ." };
  }

  try {
    const updated = await endUnitManagerTerm(prisma, assignmentId, endDateObj);

    await writeAuditLog({
      userId: currentUserId,
      action: "UNIT_MANAGER_TERM_ENDED",
      entityType: "OrganizationUnitManagerAssignment",
      entityId: assignmentId,
      afterData: { id: updated.id, endDate: updated.endDate, isPrimary: false },
    });

    revalidatePath("/hr/organization");
    revalidatePath("/hr/organization/managers");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể kết thúc nhiệm kỳ quản lý." };
  }
}

// --- Server Action: Transfer Employee (Department / Position) ---
export async function transferEmployeeOrgAction(formData: unknown) {
  const permCheck = await checkHrPermission("hr:employee:update");
  if (!permCheck.allowed) {
    return { success: false, error: "Bạn không có quyền điều chuyển phòng ban / chức danh nhân viên (hr:employee:update)" };
  }

  const parsed = TransferEmployeeSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const currentUserId = permCheck.context.session.id;
  const effectiveDateObj = new Date(parsed.data.effectiveDate);
  if (Number.isNaN(effectiveDateObj.getTime())) {
    return { success: false, error: "Ngày hiệu lực điều chuyển không hợp lệ." };
  }

  try {
    const assignment = await transferEmployee(prisma, {
      employeeId: parsed.data.employeeId,
      organizationUnitId: parsed.data.organizationUnitId,
      positionId: parsed.data.positionId,
      effectiveDate: effectiveDateObj,
      decisionNo: parsed.data.decisionNo || null,
      reason: parsed.data.reason || null,
      notes: parsed.data.notes || null,
      performedById: currentUserId,
    });

    await writeAuditLog({
      userId: currentUserId,
      action: "EMPLOYEE_ORGANIZATION_TRANSFERRED",
      entityType: "EmployeeOrganizationAssignment",
      entityId: assignment.id,
      afterData: {
        employeeId: assignment.employeeId,
        organizationUnitId: assignment.organizationUnitId,
        positionId: assignment.positionId,
        startDate: assignment.startDate,
        decisionNo: assignment.decisionNo,
      },
    });

    revalidatePath("/hr");
    revalidatePath("/hr/organization");
    revalidatePath("/hr/employees");
    revalidatePath(`/hr/employees/${parsed.data.employeeId}`);

    return { success: true, assignment };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể hoàn tất điều chuyển nhân viên." };
  }
}
