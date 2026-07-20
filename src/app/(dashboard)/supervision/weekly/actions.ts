"use server";

import { Prisma, SupervisionWeeklyStatus, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { addDays, startOfMonday, isWithinInclusive } from "@/lib/supervision-weekly/date";
import { assertSupervisionProjectScope, canReviewSupervisionWeekly, canUseSupervisionWeekly } from "@/lib/supervision-weekly/permissions";
import { supervisionDossierSaveSchema, type SupervisionDossierSaveInput } from "@/lib/supervision-weekly/types";
import { assertSupervisionDatabaseReady } from "@/lib/supervision-weekly/database-readiness";
import { formatSupervisionInspectionSource, hasMeaningfulSupervisionProject } from "@/lib/supervision-weekly/source-formatter";
import { normalizeSupervisionUnit } from "@/lib/supervision-weekly/quantity";

type Actor = { id: string; role: UserRole; name: string };

async function getActor(): Promise<Actor> {
  await assertSupervisionDatabaseReady();
  const session = await getSession();
  if (!session || !canUseSupervisionWeekly(session.role)) {
    throw new Error("Bạn không có quyền truy cập phân hệ Giám sát.");
  }
  return { id: session.id, role: session.role, name: session.name };
}

async function getDossierForActor(id: string, actor: Actor) {
  const dossier = await prisma.supervisionWeeklyDossier.findFirst({
    where: { id, deletedAt: null },
    include: {
      entries: { orderBy: [{ documentType: "asc" }, { entryDate: "asc" }, { shift: "asc" }, { sortOrder: "asc" }] },
      shiftSelections: { orderBy: [{ documentType: "asc" }, { entryDate: "asc" }, { shift: "asc" }] },
      observations: { orderBy: [{ documentType: "asc" }, { category: "asc" }, { sortOrder: "asc" }] },
      quantities: { orderBy: { sortOrder: "asc" } },
      transitions: { orderBy: { sortOrder: "asc" } },
      progressRows: { orderBy: { sortOrder: "asc" } },
      createdBy: { select: { name: true } },
      revisions: { include: { actor: { select: { name: true, role: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!dossier || (!canReviewSupervisionWeekly(actor.role) && dossier.createdById !== actor.id)) {
    throw new Error("Bạn không có quyền xem hồ sơ này.");
  }
  return dossier;
}

function toDateInput(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) throw new Error("Ngày công việc không hợp lệ.");
  return date;
}

function validateEntryDates(input: SupervisionDossierSaveInput, dossier: { weekStart: Date; weekEnd: Date; nextWeekStart: Date; nextWeekEnd: Date }) {
  for (const entry of input.entries) {
    const date = toDateInput(entry.entryDate);
    const valid = entry.documentType === "RESULT"
      ? isWithinInclusive(date, dossier.weekStart, dossier.weekEnd)
      : isWithinInclusive(date, dossier.nextWeekStart, dossier.nextWeekEnd);
    if (!valid) throw new Error(`Mục I, ngày ${entry.entryDate}, buổi ${entry.shift}: ngày công việc nằm ngoài kỳ báo cáo.`);
  }
  for (const selection of input.shiftSelections) {
    const date = toDateInput(selection.entryDate);
    const valid = selection.documentType === "RESULT"
      ? isWithinInclusive(date, dossier.weekStart, dossier.weekEnd)
      : isWithinInclusive(date, dossier.nextWeekStart, dossier.nextWeekEnd);
    if (!valid) throw new Error(`Mục I, ngày ${selection.entryDate}, buổi ${selection.shift}: buổi được chọn nằm ngoài kỳ báo cáo.`);
  }
}

async function validateDraftSourceReferences(input: SupervisionDossierSaveInput) {
  const sourceRows = [...input.entries, ...input.observations, ...input.transitions, ...input.quantities, ...input.progressRows];
  const categoryIds = [...new Set(sourceRows.map((row) => row.categoryItemId).filter((id): id is string => Boolean(id)))];
  const categoryItems = categoryIds.length ? await prisma.fieldProgressItem.findMany({
    where: { id: { in: categoryIds }, deletedAt: null },
    select: { id: true, projectId: true, itemType: true },
  }) : [];
  const categoryById = new Map(categoryItems.map((item) => [item.id, item]));

  for (const row of sourceRows) {
    if (!row.categoryItemId) continue;
    const category = categoryById.get(row.categoryItemId);
    if (!row.projectId || !category || category.itemType !== "GROUP" || category.projectId !== row.projectId) {
      throw new Error("Không thể lưu Hạng mục đã chọn vì Hạng mục này không còn tồn tại hoặc không thuộc Công trình. Vui lòng chọn lại Hạng mục.");
    }
  }

  const workIds = [...new Set(input.entries.map((row) => row.inspectionWorkItemId).filter((id): id is string => Boolean(id)))];
  const workItems = workIds.length ? await prisma.fieldProgressItem.findMany({
    where: { id: { in: workIds }, deletedAt: null },
    select: { id: true, projectId: true, parentId: true, itemType: true },
  }) : [];
  const workById = new Map(workItems.map((item) => [item.id, item]));

  for (const entry of input.entries) {
    if (!entry.inspectionWorkItemId) continue;
    const work = workById.get(entry.inspectionWorkItemId);
    if (!entry.projectId || !entry.categoryItemId || !work || work.itemType !== "WORK" || work.projectId !== entry.projectId || work.parentId !== entry.categoryItemId) {
      throw new Error("Không thể lưu Công việc đã chọn vì Công việc không còn thuộc đúng Hạng mục. Vui lòng chọn lại Công việc.");
    }
  }
}

function normalizedUnitCode(code: string | null | undefined, label: string | null | undefined) {
  return code || normalizeSupervisionUnit(label)?.code || "";
}

function decimalOrNull(value: number | null | undefined) {
  return value == null ? null : new Prisma.Decimal(value);
}

function validateBeforeSubmit(dossier: Awaited<ReturnType<typeof getDossierForActor>>) {
  const shiftLabel = { MORNING: "Sáng", AFTERNOON: "Chiều", EVENING: "Tối" } as const;
  const dayLabel = (date: Date) => new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" }).format(date);
  const resultEntries = dossier.entries.filter((entry) => entry.documentType === "RESULT");
  for (const entry of resultEntries) {
    if (!hasMeaningfulSupervisionProject(entry)) {
      const position = resultEntries.filter((item) => item.entryDate.getTime() === entry.entryDate.getTime() && item.shift === entry.shift).indexOf(entry) + 1;
      throw new Error(`${dayLabel(entry.entryDate)}, buổi ${shiftLabel[entry.shift]}, dòng ${position}: Chưa chọn hoặc nhập Công trình.`);
    }
    const position = resultEntries.filter((item) => item.entryDate.getTime() === entry.entryDate.getTime() && item.shift === entry.shift).indexOf(entry) + 1;
    if (!entry.inspectionContent?.trim()) throw new Error(`${dayLabel(entry.entryDate)}, buổi ${shiftLabel[entry.shift]}, dòng ${position}: Chưa nhập Nội dung kiểm tra.`);
    if (!entry.result?.trim()) throw new Error(`${dayLabel(entry.entryDate)}, buổi ${shiftLabel[entry.shift]}, dòng ${position}: Chưa nhập Kết quả.`);
  }
  for (const [index, row] of dossier.transitions.entries()) {
    if (!hasMeaningfulSupervisionProject(row)) throw new Error(`Mục II, dòng ${index + 1}: Chưa chọn hoặc nhập Công trình.`);
    if (row.reportedQuantity == null && !row.reportedText?.trim()) throw new Error(`Mục II, dòng ${index + 1}: thiếu khối lượng báo cáo.`);
    if (row.verifiedQuantity == null && !row.verifiedText?.trim()) throw new Error(`Mục II, dòng ${index + 1}: thiếu khối lượng kiểm tra.`);
  }
  for (const [index, row] of dossier.quantities.entries()) {
    if (!hasMeaningfulSupervisionProject(row)) throw new Error(`Mục III, dòng ${index + 1}: Chưa chọn hoặc nhập Công trình.`);
    if ((row.reportedQuantity == null && !row.reportedText?.trim()) || (row.verifiedQuantity == null && !row.verifiedText?.trim())) throw new Error(`Mục III, dòng ${index + 1}: Khối lượng báo cáo và khối lượng kiểm tra chưa có đủ giá trị.`);
    const reportedCode = normalizedUnitCode(row.reportedUnitCode || row.unitCode, row.reportedUnit || row.unit);
    const verifiedCode = normalizedUnitCode(row.verifiedUnitCode || row.unitCode, row.verifiedUnit || row.unit);
    if (row.reportedQuantity != null && row.verifiedQuantity != null && reportedCode && verifiedCode && reportedCode !== verifiedCode) throw new Error(`Mục III, dòng ${index + 1}: Hai khối lượng đang dùng đơn vị khác nhau nên chưa thể tính chênh lệch.`);
  }
  for (const [index, row] of dossier.progressRows.entries()) {
    if (!hasMeaningfulSupervisionProject(row)) throw new Error(`Mục IV, dòng ${index + 1}: Chưa chọn hoặc nhập Công trình.`);
    if (!row.plannedProgress?.trim() || !row.actualProgress?.trim()) throw new Error(`Mục IV, dòng ${index + 1}: thiếu tiến độ kế hoạch hoặc tiến độ thực tế.`);
    if (row.delayType && (row.delayValue == null || Number(row.delayValue) <= 0)) throw new Error(`Mục IV, dòng ${index + 1}: Đã chọn “Chậm tiến độ” nhưng chưa nhập mức chậm.`);
  }
}

export async function createSupervisionWeeklyDossier(anchorDate: string) {
  const actor = await getActor();
  const weekStart = startOfMonday(toDateInput(anchorDate));
  const weekEnd = addDays(weekStart, 6);
  const nextWeekStart = addDays(weekStart, 7);
  const nextWeekEnd = addDays(weekStart, 13);

  const existing = await prisma.supervisionWeeklyDossier.findFirst({
    where: { createdById: actor.id, weekStart, deletedAt: null, status: { in: ["DRAFT", "REVISION_REQUIRED"] } },
    select: { id: true },
  });
  if (existing) return existing.id;

  const dossier = await prisma.$transaction(async (tx) => {
    const latest = await tx.supervisionWeeklyDossier.findFirst({
      where: { createdById: actor.id, weekStart }, orderBy: { version: "desc" }, select: { version: true },
    });
    const version = (latest?.version ?? 0) + 1;
    const created = await tx.supervisionWeeklyDossier.create({
      data: { weekStart, weekEnd, nextWeekStart, nextWeekEnd, createdById: actor.id, version },
    });
    await tx.supervisionWeeklyRevision.create({
      data: { dossierId: created.id, actorId: actor.id, action: "CREATE", toStatus: "DRAFT", version, changedFields: "Khởi tạo hồ sơ tuần" },
    });
    return created;
  });
  revalidatePath("/supervision/weekly");
  return dossier.id;
}

export async function saveSupervisionWeeklyDossier(id: string, rawInput: SupervisionDossierSaveInput) {
  const actor = await getActor();
  const input = supervisionDossierSaveSchema.parse(rawInput);
  const dossier = await getDossierForActor(id, actor);
  if (dossier.createdById !== actor.id || !["DRAFT", "REVISION_REQUIRED"].includes(dossier.status)) {
    throw new Error("Chỉ người lập mới được sửa bản nháp hoặc bản bị yêu cầu chỉnh sửa.");
  }
  validateEntryDates(input, dossier);
  await Promise.all(input.entries.map((entry) => assertSupervisionProjectScope(actor, entry.projectId)));
  await Promise.all(input.observations.map((entry) => assertSupervisionProjectScope(actor, entry.projectId)));
  await Promise.all(input.transitions.map((entry) => assertSupervisionProjectScope(actor, entry.projectId)));
  await Promise.all(input.quantities.map((entry) => assertSupervisionProjectScope(actor, entry.projectId)));
  await Promise.all(input.progressRows.map((entry) => assertSupervisionProjectScope(actor, entry.projectId)));

  await validateDraftSourceReferences(input);

  const updated = await prisma.$transaction(async (tx) => {
    const update = await tx.supervisionWeeklyDossier.updateMany({
      where: { id, lockVersion: input.expectedLockVersion, status: { in: ["DRAFT", "REVISION_REQUIRED"] } },
      data: {
        reportNumber: input.reportNumber || null, place: input.place || null,
        recipientName: input.recipientName || null, recipientTitle: input.recipientTitle || null,
        lockVersion: { increment: 1 },
      },
    });
    if (update.count !== 1) throw new Error("CONFLICT: Hồ sơ trên máy chủ mới hơn bản đang mở. Hãy tải lại để tránh ghi đè dữ liệu.");
    await tx.supervisionWeeklyEntry.deleteMany({ where: { dossierId: id } });
    await tx.supervisionWeeklyShiftSelection.deleteMany({ where: { dossierId: id } });
    await tx.supervisionWeeklyObservation.deleteMany({ where: { dossierId: id, documentType: "NEXT_WEEK_PLAN" } });
    await tx.supervisionWeeklyTransition.deleteMany({ where: { dossierId: id } });
    await tx.supervisionWeeklyQuantity.deleteMany({ where: { dossierId: id } });
    await tx.supervisionWeeklyProgress.deleteMany({ where: { dossierId: id } });
    const rowIdMappings: Record<string, string> = {};
    const assignId = (clientKey?: string | null, id?: string | null) => {
      const isTemp = !id || id.startsWith("temp-");
      const finalId = isTemp ? crypto.randomUUID() : id;
      if (clientKey) rowIdMappings[clientKey] = finalId;
      return finalId;
    };

    if (input.entries.length) await tx.supervisionWeeklyEntry.createMany({ data: input.entries.map(({ clientKey, ...entry }) => ({ ...entry, displayText: formatSupervisionInspectionSource(entry), id: assignId(clientKey, entry.id), dossierId: id, entryDate: toDateInput(entry.entryDate) })) });
    if (input.shiftSelections.length) await tx.supervisionWeeklyShiftSelection.createMany({ data: input.shiftSelections.map((selection) => ({ ...selection, dossierId: id, entryDate: toDateInput(selection.entryDate) })) });
    const nextPlanObservations = input.observations.filter((entry) => entry.documentType === "NEXT_WEEK_PLAN");
    if (nextPlanObservations.length) await tx.supervisionWeeklyObservation.createMany({ data: nextPlanObservations.map(({ clientKey, ...entry }) => ({ ...entry, displayText: formatSupervisionInspectionSource(entry) || null, id: assignId(clientKey, entry.id), dossierId: id })) });
    if (input.transitions.length) await tx.supervisionWeeklyTransition.createMany({ data: input.transitions.map(({ reportedQuantity, verifiedQuantity, clientKey, ...entry }) => ({
      ...entry,
      id: assignId(clientKey, entry.id),
      displayText: formatSupervisionInspectionSource(entry),
      dossierId: id,
      reportedQuantity: decimalOrNull(reportedQuantity),
      verifiedQuantity: decimalOrNull(verifiedQuantity),
      varianceQuantity: reportedQuantity != null && verifiedQuantity != null && normalizedUnitCode(entry.reportedUnitCode, entry.reportedUnit) === normalizedUnitCode(entry.verifiedUnitCode, entry.verifiedUnit)
        ? new Prisma.Decimal(verifiedQuantity).minus(reportedQuantity)
        : null,
    })) });
    if (input.quantities.length) await tx.supervisionWeeklyQuantity.createMany({ data: input.quantities.map(({ clientKey, ...entry }) => ({
      ...entry, displayText: formatSupervisionInspectionSource(entry), id: assignId(clientKey, entry.id), dossierId: id,
      reportedQuantity: decimalOrNull(entry.reportedQuantity),
      verifiedQuantity: decimalOrNull(entry.verifiedQuantity),
      varianceQuantity: entry.reportedQuantity !== null && entry.reportedQuantity !== undefined && entry.verifiedQuantity !== null && entry.verifiedQuantity !== undefined
        && normalizedUnitCode(entry.reportedUnitCode || entry.unitCode, entry.reportedUnit || entry.unit) === normalizedUnitCode(entry.verifiedUnitCode || entry.unitCode, entry.verifiedUnit || entry.unit)
        && Boolean(normalizedUnitCode(entry.reportedUnitCode || entry.unitCode, entry.reportedUnit || entry.unit))
        ? new Prisma.Decimal(entry.verifiedQuantity).minus(entry.reportedQuantity) : null,
    })) });
    if (input.progressRows.length) await tx.supervisionWeeklyProgress.createMany({ data: input.progressRows.map(({ delayValue, clientKey, ...entry }) => ({
      ...entry,
      id: assignId(clientKey, entry.id),
      displayText: formatSupervisionInspectionSource(entry),
      dossierId: id,
      delayValue: decimalOrNull(delayValue),
    })) });
    const next = await tx.supervisionWeeklyDossier.findUniqueOrThrow({ where: { id }, select: { lockVersion: true, version: true, status: true } });
    await tx.supervisionWeeklyRevision.create({ data: { dossierId: id, actorId: actor.id, action: "SAVE_DRAFT", toStatus: next.status, version: next.version, changedFields: "Thông tin chung; Mục I, II, III, IV; kế hoạch tuần tiếp theo" } });
    return { lockVersion: next.lockVersion, rowIdMappings };
  });
  revalidatePath(`/supervision/weekly/${id}/edit`);
  revalidatePath("/supervision/weekly");
  return updated;
}

export async function transitionSupervisionWeeklyDossier(id: string, action: "SUBMIT" | "REQUEST_REVISION" | "APPROVE" | "LOCK", reason?: string) {
  const actor = await getActor();
  const dossier = await getDossierForActor(id, actor);
  const ownDraftAction = action === "SUBMIT" && dossier.createdById === actor.id && ["DRAFT", "REVISION_REQUIRED"].includes(dossier.status);
  const reviewAction = canReviewSupervisionWeekly(actor.role);
  if (!ownDraftAction && !reviewAction) throw new Error("Bạn không có quyền chuyển trạng thái hồ sơ này.");
  if (action === "SUBMIT" && (!dossier.recipientName || !dossier.recipientTitle)) {
    throw new Error("Thiếu người nhận hoặc chức vụ người nhận trong cả hai biểu mẫu.");
  }
  if (action === "SUBMIT") validateBeforeSubmit(dossier);
  const target: Record<typeof action, SupervisionWeeklyStatus> = { SUBMIT: "SUBMITTED", REQUEST_REVISION: "REVISION_REQUIRED", APPROVE: "APPROVED", LOCK: "LOCKED" };
  const allowed: Record<typeof action, SupervisionWeeklyStatus[]> = {
    SUBMIT: ["DRAFT", "REVISION_REQUIRED"], REQUEST_REVISION: ["SUBMITTED"], APPROVE: ["SUBMITTED"], LOCK: ["APPROVED"],
  };
  if (!allowed[action].includes(dossier.status)) throw new Error("Trạng thái hiện tại không cho phép thao tác này.");
  await prisma.$transaction(async (tx) => {
    const next = target[action];
    await tx.supervisionWeeklyDossier.update({
      where: { id }, data: {
        status: next, reviewedById: reviewAction ? actor.id : undefined,
        submittedAt: action === "SUBMIT" ? new Date() : undefined,
        reviewedAt: action === "REQUEST_REVISION" || action === "APPROVE" ? new Date() : undefined,
        lockedAt: action === "LOCK" ? new Date() : undefined,
        lockVersion: { increment: 1 },
      },
    });
    await tx.supervisionWeeklyRevision.create({ data: { dossierId: id, actorId: actor.id, action, fromStatus: dossier.status, toStatus: next, version: dossier.version, reason: reason?.trim() || null } });
  });
  revalidatePath(`/supervision/weekly/${id}`);
  revalidatePath(`/supervision/weekly/${id}/edit`);
  revalidatePath("/supervision/weekly");
}

export async function getSupervisionWeeklyProjects(query = "") {
  const actor = await getActor();
  const normalized = query.trim();
  const where = actor.role === "SUPERVISION_HEAD"
    ? await import("@/lib/rbac").then(({ getSupervisionProjectWhere }) => getSupervisionProjectWhere(actor))
    : {};
  const projects = await prisma.project.findMany({
    where: { deletedAt: null, ...where, ...(normalized ? { OR: [{ name: { contains: normalized, mode: "insensitive" } }, { code: { contains: normalized, mode: "insensitive" } }] } : {}) },
    select: { id: true, code: true, name: true, location: true, status: true }, orderBy: { name: "asc" }, take: 30,
  });
  return projects;
}

export async function getSupervisionWeeklyDossiers() {
  const actor = await getActor();
  return prisma.supervisionWeeklyDossier.findMany({
    where: { deletedAt: null, ...(canReviewSupervisionWeekly(actor.role) ? {} : { createdById: actor.id }) },
    select: { id: true, reportNumber: true, weekStart: true, weekEnd: true, status: true, version: true, updatedAt: true, createdBy: { select: { name: true } } },
    orderBy: [{ weekStart: "desc" }, { updatedAt: "desc" }], take: 100,
  });
}

export async function getSupervisionWeeklyDossier(id: string) {
  const actor = await getActor();
  return getDossierForActor(id, actor);
}

export async function getSupervisionWeeklyWorkItems(projectId: string) {
  const actor = await getActor();
  await assertSupervisionProjectScope(actor, projectId);
  return prisma.fieldProgressItem.findMany({
    where: { projectId, deletedAt: null, itemType: "WORK" },
    select: { id: true, code: true, workContent: true, categoryName: true },
    orderBy: { sortOrder: "asc" }, take: 100,
  });
}

export async function getSupervisionWeeklyInspectionWorks(projectId: string, categoryItemId: string) {
  const actor = await getActor();
  await assertSupervisionProjectScope(actor, projectId);
  const category = await prisma.fieldProgressItem.findFirst({
    where: { id: categoryItemId, projectId, deletedAt: null, itemType: "GROUP" },
    select: { id: true },
  });
  if (!category) throw new Error("Hạng mục không còn tồn tại hoặc không thuộc Công trình đã chọn.");
  const works = await prisma.fieldProgressItem.findMany({
    where: { projectId, parentId: categoryItemId, deletedAt: null, itemType: "WORK" },
    select: { id: true, code: true, workContent: true },
    orderBy: { sortOrder: "asc" },
    take: 200,
  });
  return works.map((work) => ({ id: work.id, code: work.code, name: work.workContent || "Công việc chưa đặt tên" }));
}

export async function getSupervisionWeeklySourceOptions(projectId: string) {
  const actor = await getActor();
  await assertSupervisionProjectScope(actor, projectId);
  const [locations, fieldItems] = await Promise.all([
    prisma.projectLocationNode.findMany({
      where: { projectId, deletedAt: null },
      select: { id: true, parentId: true, code: true, name: true, nodeType: true, level: true },
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
      take: 200,
    }),
    // Only fetch GROUP items (Hạng mục chính), NOT WORK items (Công việc con)
    prisma.fieldProgressItem.findMany({
      where: { projectId, deletedAt: null, itemType: "GROUP" },
      select: { id: true, parentId: true, code: true, workContent: true, categoryName: true, itemType: true, level: true },
      orderBy: [{ sortOrder: "asc" }],
      take: 200,
    }),
  ]);
  const locationById = new Map(locations.map((item) => [item.id, item]));
  const locationBreadcrumb = (item: (typeof locations)[number]) => {
    const path: string[] = [];
    let current: (typeof locations)[number] | undefined = item;
    const seen = new Set<string>();
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      path.unshift(current.name);
      current = current.parentId ? locationById.get(current.parentId) : undefined;
    }
    return path.join(" > ");
  };
  return {
    locations: locations.map((item) => ({ ...item, breadcrumb: locationBreadcrumb(item) })),
    // Return GROUP items as Hạng mục chính — no Công việc con (WORK) allowed
    workItems: fieldItems.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.categoryName || item.workContent || "Hạng mục chưa đặt tên",
      groupName: null,
    })),
  };
}
