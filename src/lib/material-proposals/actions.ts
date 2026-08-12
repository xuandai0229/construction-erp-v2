"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canAccessProjectProposal, canCreateProposal, canFinalApprove, canTechnicalApprove, isHighLevel } from "./permissions";
import { revalidatePath } from "next/cache";
import { Prisma, MaterialProposalApprovalStage, MaterialProposalApprovalStatus, MaterialProposalStatus, ProjectRole, UserRole } from "@prisma/client";

export type ItemInput = {
  sectionName?: string;
  materialItemId?: string;
  materialName: string;
  unit: string;
  contractQuantityText?: string;
  actualQuantity: number;
  specification?: string;
  manufacturerOrigin?: string;
  note?: string;
};

function formatRoleName(userRole: UserRole, projectRole: ProjectRole | null): string {
  if (projectRole === "PROJECT_MANAGER") return "Quản lý dự án";
  if (projectRole === "CHIEF_COMMANDER") return "Chỉ huy trưởng";
  if (projectRole === "SITE_COMMANDER") return "Chỉ huy công trường";
  if (projectRole === "ASSISTANT_COMMANDER") return "Phó chỉ huy";
  if (projectRole === "QA_QC") return "Cán bộ QA/QC";
  if (projectRole === "HSE") return "Cán bộ An toàn HSE";
  if (projectRole === "SUPERVISOR") return "Giám sát công trình";
  if (userRole === "ADMIN") return "Quản trị viên hệ thống";
  if (userRole === "DIRECTOR") return "Giám đốc";
  if (userRole === "DEPUTY_DIRECTOR") return "Phó Giám đốc";
  return projectRole || userRole;
}

async function sessionOrThrow() {
  const session = await getSession();
  if (!session) throw new Error("Bạn cần đăng nhập để thao tác đề xuất vật tư.");
  return session;
}

async function getProjectMemberInfo(userId: string, projectId: string) {
  return prisma.projectMember.findFirst({
    where: { userId, projectId, isActive: true, deletedAt: null, leftAt: null },
    select: { role: true, canApproveMaterialProposalTechnical: true },
  });
}

async function assertProjectAccess(user: { id: string; role: UserRole }, projectId: string, create = false) {
  const member = await getProjectMemberInfo(user.id, projectId);
  if (
    !canAccessProjectProposal({ userRole: user.role, projectRole: member?.role ?? null }) ||
    (create && !canCreateProposal({ userRole: user.role, projectRole: member?.role ?? null }))
  ) {
    throw new Error("Bạn không có quyền truy cập đề xuất của công trình này.");
  }
  return member;
}

function validateItems(items: ItemInput[]) {
  if (!items || !items.length) {
    throw new Error("Cần ít nhất một vật tư trong đề xuất.");
  }
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.materialName?.trim()) {
      throw new Error(`Dòng ${i + 1}: Thiếu tên vật tư / vật liệu.`);
    }
    if (!item.unit?.trim()) {
      throw new Error(`Dòng ${i + 1} (${item.materialName.trim()}): Thiếu đơn vị tính.`);
    }
    if (!Number.isFinite(item.actualQuantity) || item.actualQuantity <= 0) {
      throw new Error(`Dòng ${i + 1} (${item.materialName.trim()}): Khối lượng thực tế phải lớn hơn 0.`);
    }
  }
}

export async function createMaterialProposal(input: {
  projectId: string;
  purchaseReason?: string;
  requiredDeliveryDate?: string;
  items: ItemInput[];
}) {
  const user = await sessionOrThrow();
  const member = await assertProjectAccess(user, input.projectId, true);
  validateItems(input.items);

  const project = await prisma.project.findFirst({
    where: { id: input.projectId, deletedAt: null },
    select: { id: true, name: true, location: true },
  });
  if (!project) throw new Error("Không tìm thấy công trình.");

  const dateStr = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const randHex = crypto.randomUUID().slice(0, 6).toUpperCase();
  const proposalNo = `DVT-${dateStr}-${randHex}`;

  const roleSnapshot = formatRoleName(user.role, member?.role ?? null);

  const proposal = await prisma.materialProposal.create({
    data: {
      proposalNo,
      projectId: project.id,
      projectNameSnapshot: project.name,
      projectLocationSnapshot: project.location,
      requestedById: user.id,
      requesterNameSnapshot: user.name,
      requesterRoleSnapshot: roleSnapshot,
      proposalDate: new Date(),
      purchaseReason: input.purchaseReason?.trim() || null,
      requiredDeliveryDate: input.requiredDeliveryDate ? new Date(input.requiredDeliveryDate) : null,
      items: {
        create: input.items.map((item, index) => ({
          sequence: index + 1,
          sectionName: item.sectionName?.trim() || null,
          materialItemId: item.materialItemId || null,
          materialName: item.materialName.trim(),
          unit: item.unit.trim(),
          contractQuantityText: item.contractQuantityText?.trim() || null,
          actualQuantity: new Prisma.Decimal(item.actualQuantity),
          specification: item.specification?.trim() || null,
          manufacturerOrigin: item.manufacturerOrigin?.trim() || null,
          note: item.note?.trim() || null,
        })),
      },
    },
    select: { id: true, proposalNo: true },
  });

  revalidatePath("/materials");
  return proposal;
}

export async function updateMaterialProposal(input: {
  id: string;
  purchaseReason?: string;
  requiredDeliveryDate?: string;
  items: ItemInput[];
}) {
  const user = await sessionOrThrow();
  const existing = await prisma.materialProposal.findUnique({
    where: { id: input.id },
    select: { id: true, requestedById: true, status: true, projectId: true },
  });

  if (!existing) throw new Error("Không tìm thấy đề xuất vật tư.");
  if (existing.requestedById !== user.id && !isHighLevel(user.role)) {
    throw new Error("Chỉ người đề nghị mới có thể sửa đề xuất này.");
  }
  if (!["DRAFT", "REVISION_REQUESTED"].includes(existing.status)) {
    throw new Error("Đề xuất đã gửi hoặc đã được duyệt, không thể chỉnh sửa.");
  }

  validateItems(input.items);

  await prisma.$transaction(async (tx) => {
    await tx.materialProposalItem.deleteMany({ where: { proposalId: input.id } });
    await tx.materialProposal.update({
      where: { id: input.id },
      data: {
        purchaseReason: input.purchaseReason?.trim() || null,
        requiredDeliveryDate: input.requiredDeliveryDate ? new Date(input.requiredDeliveryDate) : null,
        items: {
          create: input.items.map((item, index) => ({
            sequence: index + 1,
            sectionName: item.sectionName?.trim() || null,
            materialItemId: item.materialItemId || null,
            materialName: item.materialName.trim(),
            unit: item.unit.trim(),
            contractQuantityText: item.contractQuantityText?.trim() || null,
            actualQuantity: new Prisma.Decimal(item.actualQuantity),
            specification: item.specification?.trim() || null,
            manufacturerOrigin: item.manufacturerOrigin?.trim() || null,
            note: item.note?.trim() || null,
          })),
        },
      },
    });
  });

  revalidatePath("/materials");
  revalidatePath(`/materials/proposals/${input.id}`);
  return { id: input.id };
}

export async function autoSaveMaterialProposal(input: {
  id?: string | null;
  projectId: string;
  projectLocationSnapshot?: string;
  purchaseReason?: string;
  requiredDeliveryDate?: string;
  items: Array<{
    sectionName?: string;
    materialItemId?: string;
    materialName?: string;
    unit?: string;
    contractQuantityText?: string;
    actualQuantity?: number | string;
    specification?: string;
    manufacturerOrigin?: string;
    note?: string;
  }>;
}) {
  const user = await sessionOrThrow();
  await assertProjectAccess(user, input.projectId, !input.id);

  // Clean items for auto-save: ignore rows that have no name, unit, section, or numbers
  const validItems = (input.items || [])
    .filter(
      (i) =>
        (i.materialName && i.materialName.trim()) ||
        (i.sectionName && i.sectionName.trim()) ||
        i.materialItemId ||
        (i.specification && i.specification.trim()) ||
        (i.contractQuantityText && i.contractQuantityText.trim()) ||
        (i.actualQuantity !== "" && i.actualQuantity !== undefined && i.actualQuantity !== null)
    )
    .map((i) => ({
      sectionName: i.sectionName?.trim() || undefined,
      materialItemId: i.materialItemId || undefined,
      materialName: i.materialName?.trim() || "Vật tư chưa đặt tên",
      unit: i.unit?.trim() || "",
      contractQuantityText: i.contractQuantityText?.trim() || undefined,
      actualQuantity:
        i.actualQuantity === "" || i.actualQuantity === undefined || i.actualQuantity === null
          ? 0
          : Math.max(0, Number(i.actualQuantity) || 0),
      specification: i.specification?.trim() || undefined,
      manufacturerOrigin: i.manufacturerOrigin?.trim() || undefined,
      note: i.note?.trim() || undefined,
    }));

  const locationProvided = input.projectLocationSnapshot !== undefined;
  const locationSnapshotToSave = locationProvided
    ? input.projectLocationSnapshot?.trim() || null
    : null;

  if (input.id) {
    // Update existing proposal
    const existing = await prisma.materialProposal.findUnique({
      where: { id: input.id },
      select: { id: true, requestedById: true },
    });
    if (!existing) throw new Error("Không tìm thấy đề xuất.");
    if (existing.requestedById !== user.id && !isHighLevel(user.role)) {
      throw new Error("Không có quyền chỉnh sửa đề xuất này.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.materialProposalItem.deleteMany({ where: { proposalId: input.id! } });
      await tx.materialProposal.update({
        where: { id: input.id! },
        data: {
          ...(locationProvided ? { projectLocationSnapshot: locationSnapshotToSave } : {}),
          purchaseReason: input.purchaseReason?.trim() || null,
          requiredDeliveryDate: input.requiredDeliveryDate ? new Date(input.requiredDeliveryDate) : null,
          items: {
            create: validItems.map((item, index) => ({
              sequence: index + 1,
              sectionName: item.sectionName || null,
              materialItemId: item.materialItemId || null,
              materialName: item.materialName,
              unit: item.unit,
              contractQuantityText: item.contractQuantityText || null,
              actualQuantity: new Prisma.Decimal(item.actualQuantity),
              specification: item.specification || null,
              manufacturerOrigin: item.manufacturerOrigin || null,
              note: item.note || null,
            })),
          },
        },
      });
    });

    revalidatePath("/materials");
    return { id: input.id, savedAt: new Date().toISOString() };
  } else {
    // Create new proposal
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, deletedAt: null },
      select: { id: true, name: true, location: true },
    });
    if (!project) throw new Error("Không tìm thấy công trình.");

    const member = await getProjectMemberInfo(user.id, input.projectId);
    const roleSnapshot = formatRoleName(user.role, member?.role ?? null);

    const dateStr = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    const randHex = crypto.randomUUID().slice(0, 6).toUpperCase();
    const proposalNo = `DVT-${dateStr}-${randHex}`;

    const finalLocation = locationProvided
      ? locationSnapshotToSave
      : project.location || null;

    const created = await prisma.materialProposal.create({
      data: {
        proposalNo,
        projectId: project.id,
        projectNameSnapshot: project.name,
        projectLocationSnapshot: finalLocation,
        requestedById: user.id,
        requesterNameSnapshot: user.name,
        requesterRoleSnapshot: roleSnapshot,
        proposalDate: new Date(),
        purchaseReason: input.purchaseReason?.trim() || null,
        requiredDeliveryDate: input.requiredDeliveryDate ? new Date(input.requiredDeliveryDate) : null,
        items: {
          create: validItems.map((item, index) => ({
            sequence: index + 1,
            sectionName: item.sectionName || null,
            materialItemId: item.materialItemId || null,
            materialName: item.materialName,
            unit: item.unit,
            contractQuantityText: item.contractQuantityText || null,
            actualQuantity: new Prisma.Decimal(item.actualQuantity),
            specification: item.specification || null,
            manufacturerOrigin: item.manufacturerOrigin || null,
            note: item.note || null,
          })),
        },
      },
      select: { id: true, proposalNo: true },
    });

    revalidatePath("/materials");
    return { id: created.id, proposalNo: created.proposalNo, savedAt: new Date().toISOString() };
  }
}

export async function submitMaterialProposal(id: string) {
  const user = await sessionOrThrow();
  const proposal = await prisma.materialProposal.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!proposal || (proposal.requestedById !== user.id && !isHighLevel(user.role)) || !["DRAFT", "REVISION_REQUESTED"].includes(proposal.status)) {
    throw new Error("Bạn không thể gửi đề xuất này.");
  }
  if (!proposal.purchaseReason?.trim()) {
    throw new Error("Vui lòng nhập Lý do mua hàng trước khi gửi phê duyệt.");
  }
  if (!proposal.requiredDeliveryDate) {
    throw new Error("Vui lòng chọn Ngày cấp về công trình trước khi gửi phê duyệt.");
  }

  validateItems(
    proposal.items.map((item) => ({
      materialName: item.materialName,
      unit: item.unit,
      actualQuantity: Number(item.actualQuantity),
    }))
  );

  // Find assigned technical approver, fallback to PM/Technical Staff/Admin if none set
  let technicalApprover = await prisma.projectMember.findFirst({
    where: {
      projectId: proposal.projectId,
      isActive: true,
      deletedAt: null,
      leftAt: null,
      canApproveMaterialProposalTechnical: true,
    },
    select: { userId: true },
  });

  if (!technicalApprover) {
    technicalApprover = await prisma.projectMember.findFirst({
      where: {
        projectId: proposal.projectId,
        isActive: true,
        deletedAt: null,
        leftAt: null,
        role: { in: ["PROJECT_MANAGER", "CHIEF_COMMANDER", "SITE_COMMANDER", "ASSISTANT_COMMANDER"] },
      },
      select: { userId: true },
    });
  }

  if (!technicalApprover) {
    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN", isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (adminUser) technicalApprover = { userId: adminUser.id };
  }

  if (!technicalApprover) {
    throw new Error("Công trình chưa có người phụ trách duyệt kỹ thuật.");
  }

  await prisma.$transaction(async (tx) => {
    // Delete any previous pending approvals for retry
    await tx.materialProposalApproval.deleteMany({
      where: { proposalId: id, status: MaterialProposalApprovalStatus.PENDING },
    });

    await tx.materialProposal.update({
      where: { id },
      data: { status: MaterialProposalStatus.SUBMITTED },
    });

    await tx.materialProposalApproval.create({
      data: {
        proposalId: id,
        stage: MaterialProposalApprovalStage.TECHNICAL,
        status: MaterialProposalApprovalStatus.PENDING,
        approverId: technicalApprover.userId,
      },
    });
  });

  revalidatePath("/materials");
  revalidatePath(`/materials/proposals/${id}`);
  return { ok: true };
}

export async function listMaterialProposalsForProjects(projectIds: string[]) {
  const user = await sessionOrThrow();
  if (projectIds.length === 0) return [];

  // Never trust project ids supplied by a client invocation. Company users may
  // read their portfolio; project users are intersected with active membership.
  const permittedProjectIds = isHighLevel(user.role)
    ? projectIds
    : (await prisma.projectMember.findMany({
        where: { projectId: { in: projectIds }, userId: user.id, isActive: true, deletedAt: null, leftAt: null },
        select: { projectId: true },
      })).map((membership) => membership.projectId);

  if (permittedProjectIds.length === 0) return [];

  return prisma.materialProposal.findMany({
    where: {
      projectId: { in: permittedProjectIds },
      status: { not: MaterialProposalStatus.CANCELLED },
    },
    include: {
      items: { select: { id: true, materialName: true, actualQuantity: true, unit: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listMaterialProposals(projectId?: string) {
  const user = await sessionOrThrow();
  const where: Prisma.MaterialProposalWhereInput = {
    status: { not: MaterialProposalStatus.CANCELLED },
  };

  if (projectId && !isHighLevel(user.role)) {
    await assertProjectAccess(user, projectId);
    where.projectId = projectId;
  } else if (projectId) {
    where.projectId = projectId;
  } else if (!isHighLevel(user.role)) {
    where.project = {
      members: {
        some: {
          userId: user.id,
          isActive: true,
          deletedAt: null,
          leftAt: null,
        },
      },
    };
  }

  return prisma.materialProposal.findMany({
    where,
    include: {
      items: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getMaterialProposal(id: string) {
  const user = await sessionOrThrow();
  const proposal = await prisma.materialProposal.findUnique({
    where: { id },
    include: {
      items: { orderBy: { sequence: "asc" } },
      approvals: {
        include: { approver: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!proposal) throw new Error("Không tìm thấy đề xuất vật tư.");
  await assertProjectAccess(user, proposal.projectId);
  return proposal;
}

export async function decideMaterialProposal(input: {
  proposalId: string;
  stage: MaterialProposalApprovalStage;
  decision: "APPROVED" | "REJECTED";
  note?: string;
  idempotencyKey: string;
}) {
  const user = await sessionOrThrow();
  const proposal = await prisma.materialProposal.findUnique({
    where: { id: input.proposalId },
    include: { approvals: true },
  });

  if (!proposal) throw new Error("Không tìm thấy đề xuất vật tư.");
  const member = await assertProjectAccess(user, proposal.projectId);

  const existingPending = proposal.approvals.find(
    (item) => item.stage === input.stage && item.status === MaterialProposalApprovalStatus.PENDING
  );

  const isAssignedApprover = existingPending?.approverId === user.id;

  const allowed =
    input.stage === MaterialProposalApprovalStage.FINAL
      ? canFinalApprove(user.role)
      : isAssignedApprover || canTechnicalApprove({ userRole: user.role, canApprove: Boolean(member?.canApproveMaterialProposalTechnical) });

  if (!allowed) {
    throw new Error("Bạn không được phân công duyệt bước này.");
  }

  if (proposal.status !== MaterialProposalStatus.SUBMITTED) {
    throw new Error("Đề xuất không ở trạng thái chờ duyệt.");
  }

  const existingStage = proposal.approvals.find((item) => item.stage === input.stage);
  if (existingStage?.idempotencyKey === input.idempotencyKey) {
    return { ok: true, idempotent: true };
  }
  if (existingStage?.status === MaterialProposalApprovalStatus.APPROVED) {
    return { ok: true, idempotent: true };
  }
  if (existingStage?.status !== MaterialProposalApprovalStatus.PENDING) {
    throw new Error("Bước duyệt chưa được mở hoặc đã xử lý.");
  }

  await prisma.$transaction(async (tx) => {
    const status = input.decision === "APPROVED" ? MaterialProposalApprovalStatus.APPROVED : MaterialProposalApprovalStatus.REJECTED;

    await tx.materialProposalApproval.update({
      where: { proposalId_stage: { proposalId: proposal.id, stage: input.stage } },
      data: {
        status,
        approverId: user.id,
        decidedAt: new Date(),
        decisionNote: input.note?.trim() || null,
        idempotencyKey: input.idempotencyKey,
      },
    });

    if (status === MaterialProposalApprovalStatus.REJECTED) {
      await tx.materialProposal.update({
        where: { id: proposal.id },
        data: { status: MaterialProposalStatus.REVISION_REQUESTED },
      });
    } else if (input.stage === MaterialProposalApprovalStage.TECHNICAL) {
      // Find final approver (DEPUTY_DIRECTOR or DIRECTOR)
      let finalApprover = await tx.user.findFirst({
        where: { role: "DEPUTY_DIRECTOR", isActive: true, deletedAt: null },
        select: { id: true },
      });
      if (!finalApprover) {
        finalApprover = await tx.user.findFirst({
          where: { role: "DIRECTOR", isActive: true, deletedAt: null },
          select: { id: true },
        });
      }
      if (!finalApprover) {
        finalApprover = await tx.user.findFirst({
          where: { role: "ADMIN", isActive: true, deletedAt: null },
          select: { id: true },
        });
      }
      if (!finalApprover) throw new Error("Chưa có cấp thẩm quyền duyệt cuối (Phó Giám đốc).");

      await tx.materialProposalApproval.create({
        data: {
          proposalId: proposal.id,
          stage: MaterialProposalApprovalStage.FINAL,
          status: MaterialProposalApprovalStatus.PENDING,
          approverId: finalApprover.id,
        },
      });
    } else {
      // Final step approved -> Mark proposal APPROVED. INVENTORY IS NOT TOUCHED.
      await tx.materialProposal.update({
        where: { id: proposal.id },
        data: { status: MaterialProposalStatus.APPROVED },
      });
    }
  });

  revalidatePath("/materials");
  revalidatePath(`/materials/proposals/${input.proposalId}`);
  return { ok: true };
}

export async function deleteMaterialProposal(id: string) {
  const user = await sessionOrThrow();
  const proposal = await prisma.materialProposal.findUnique({
    where: { id },
    select: { id: true, projectId: true },
  });
  if (!proposal) throw new Error("Không tìm thấy đề xuất vật tư.");

  await assertProjectAccess(user, proposal.projectId);

  await prisma.$transaction([
    prisma.materialProposalItem.deleteMany({ where: { proposalId: id } }),
    prisma.materialProposalApproval.deleteMany({ where: { proposalId: id } }),
    prisma.materialProposal.delete({ where: { id } }),
  ]);

  revalidatePath("/materials");
  revalidatePath(`/materials/proposals/${id}`);
  return { success: true };
}
