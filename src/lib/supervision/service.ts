import { Prisma, SupervisionPackageStatus, SupervisionShift } from "@prisma/client";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { assertSupervisionPermission, assertSupervisionProjectAccess, canReviewSupervision, isSupervisionActor } from "./access";

type Actor = { id: string; role: Parameters<typeof isSupervisionActor>[0] };
const EDITABLE = new Set<SupervisionPackageStatus>(["DRAFT", "REVISION_REQUIRED"]);

function monday(date: Date) { const value = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())); const day = value.getUTCDay() || 7; value.setUTCDate(value.getUTCDate() - day + 1); return value; }
function nextSunday(start: Date) { const end = new Date(start); end.setUTCDate(end.getUTCDate() + 6); return end; }
function variance(reported: number, verified: number) { return { quantity: verified - reported, percent: reported === 0 ? null : ((verified - reported) / reported) * 100 }; }

export async function createWeeklyPackage(actor: Actor, input: { weekStart?: string; recipientName?: string; recipientTitle?: string; place?: string }) {
  assertSupervisionPermission(actor, "supervision_weekly_reports.create");
  const weekStart = monday(input.weekStart ? new Date(input.weekStart) : new Date());
  const weekEnd = nextSunday(weekStart);
  const packageRecord = await prisma.supervisionWeeklyPackage.create({ data: { weekStart, weekEnd, recipientName: input.recipientName?.trim() || null, recipientTitle: input.recipientTitle?.trim() || null, place: input.place?.trim() || "Hà Nội", createdById: actor.id } });
  await writeAuditLog({ userId: actor.id, action: "CREATE_SUPERVISION_WEEKLY_PACKAGE", entityType: "SupervisionWeeklyPackage", entityId: packageRecord.id, afterData: { weekStart, weekEnd } });
  return packageRecord;
}

async function ownedEditablePackage(actor: Actor, packageId: string) {
  const item = await prisma.supervisionWeeklyPackage.findFirst({ where: { id: packageId, deletedAt: null } });
  if (!item) throw new Error("Không tìm thấy hồ sơ giám sát tuần.");
  if (item.createdById !== actor.id || !EDITABLE.has(item.status)) throw new Error("Hồ sơ không còn ở trạng thái được phép chỉnh sửa.");
  return item;
}

export async function getOrCreateDraftWeeklyPackage(actor: Actor, dateString: string) {
  const weekStart = monday(new Date(dateString));
  const weekEnd = nextSunday(weekStart);
  let pkg = await prisma.supervisionWeeklyPackage.findFirst({ where: { createdById: actor.id, weekStart, deletedAt: null } });
  if (!pkg) {
    pkg = await prisma.supervisionWeeklyPackage.create({ data: { weekStart, weekEnd, createdById: actor.id, place: "Hà Nội" } });
  }
  return pkg;
}

export async function addVisit(actor: Actor, input: { projectId: string; visitDate: string; shift: SupervisionShift; inspectionContent: string; result: string; workItem?: string; note?: string; collaborators?: string }) {
  assertSupervisionPermission(actor, "supervision_visits.create"); await assertSupervisionProjectAccess(actor, input.projectId);
  const pkg = await getOrCreateDraftWeeklyPackage(actor, input.visitDate);
  await ownedEditablePackage(actor, pkg.id);
  return prisma.supervisionVisit.create({ data: { ...input, packageId: pkg.id, visitDate: new Date(input.visitDate), workItem: input.workItem?.trim() || null, note: input.note?.trim() || null, collaborators: input.collaborators?.trim() || null, createdById: actor.id } });
}

export async function addQuantityVerification(actor: Actor, input: { packageId: string; projectId: string; workItem: string; unit: string; reportedQuantity: number; verifiedQuantity: number; checkedAt: string; conclusion: string; sourceType?: string; sourceId?: string; note?: string }) {
  assertSupervisionPermission(actor, "supervision_inspections.create"); await ownedEditablePackage(actor, input.packageId); await assertSupervisionProjectAccess(actor, input.projectId);
  const calculated = variance(input.reportedQuantity, input.verifiedQuantity);
  return prisma.supervisionQuantityVerification.create({ data: { ...input, reportedQuantity: new Prisma.Decimal(input.reportedQuantity), verifiedQuantity: new Prisma.Decimal(input.verifiedQuantity), varianceQuantity: new Prisma.Decimal(calculated.quantity), variancePercent: calculated.percent === null ? null : new Prisma.Decimal(calculated.percent), checkedAt: new Date(input.checkedAt), sourceType: input.sourceType?.trim() || null, sourceId: input.sourceId?.trim() || null, note: input.note?.trim() || null } });
}

export async function addFinding(actor: Actor, input: { projectId: string; category: string; description: string; severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; detectedAt: string; dueDate?: string; workItem?: string; responsibleParty?: string }) {
  assertSupervisionPermission(actor, "supervision_findings.create"); await assertSupervisionProjectAccess(actor, input.projectId);
  const pkg = await getOrCreateDraftWeeklyPackage(actor, input.detectedAt);
  await ownedEditablePackage(actor, pkg.id);
  const code = `GS-${new Date(input.detectedAt).toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  return prisma.supervisionFinding.create({ data: { ...input, packageId: pkg.id, code, detectedAt: new Date(input.detectedAt), dueDate: input.dueDate ? new Date(input.dueDate) : null, workItem: input.workItem?.trim() || null, responsibleParty: input.responsibleParty?.trim() || null, createdById: actor.id } });
}

export async function addPlanItem(actor: Actor, input: { packageId: string; projectId?: string; plannedDate: string; shift: SupervisionShift; inspectionContent: string; workItem?: string; objective?: string; source?: "SUPERVISION_HEAD" | "SITE_COMMANDER" | "BOARD_OF_DIRECTORS" | "PREVIOUS_FINDING" | "CONSTRUCTION_TRANSITION" | "INCIDENT" | "OTHER" }) {
  assertSupervisionPermission(actor, "supervision_weekly_plans.create"); await ownedEditablePackage(actor, input.packageId); if (input.projectId) await assertSupervisionProjectAccess(actor, input.projectId);
  return prisma.supervisionPlanItem.create({ data: { ...input, plannedDate: new Date(input.plannedDate), workItem: input.workItem?.trim() || null, objective: input.objective?.trim() || null } });
}

export async function addTransitionCheck(actor: Actor, input: { packageId: string; projectId: string; workItem: string; currentStep: string; proposedStep: string; reportedQuantity?: number; verifiedQuantity?: number; unit?: string; plannedProgress?: string; conclusion: string; reason?: string }) {
  assertSupervisionPermission(actor, "supervision_inspections.create"); await ownedEditablePackage(actor, input.packageId); await assertSupervisionProjectAccess(actor, input.projectId);
  const rq = input.reportedQuantity ?? 0; const vq = input.verifiedQuantity ?? 0;
  const v = variance(rq, vq);
  return prisma.supervisionTransitionCheck.create({ data: { packageId: input.packageId, projectId: input.projectId, workItem: input.workItem.trim(), currentStep: input.currentStep.trim(), proposedStep: input.proposedStep.trim(), reportedQuantity: new Prisma.Decimal(rq), verifiedQuantity: new Prisma.Decimal(vq), varianceQuantity: new Prisma.Decimal(v.quantity), unit: input.unit?.trim() || null, plannedProgress: input.plannedProgress?.trim() || null, conclusion: input.conclusion.trim(), reason: input.reason?.trim() || null } });
}

export async function addProgressAssessment(actor: Actor, input: { packageId: string; projectId: string; workItem?: string; plannedProgress: number; actualProgress: number; delayReason?: string }) {
  assertSupervisionPermission(actor, "supervision_inspections.create"); await ownedEditablePackage(actor, input.packageId); await assertSupervisionProjectAccess(actor, input.projectId);
  const delayed = input.plannedProgress > input.actualProgress;
  return prisma.supervisionProgressAssessment.create({ data: { packageId: input.packageId, projectId: input.projectId, workItem: input.workItem?.trim() || null, plannedProgress: new Prisma.Decimal(input.plannedProgress), actualProgress: new Prisma.Decimal(input.actualProgress), variancePercent: new Prisma.Decimal(input.actualProgress - input.plannedProgress), delayReason: delayed ? (input.delayReason?.trim() || null) : null } });
}

export async function deleteSupervisionRecord(actor: Actor, table: "visit" | "transitionCheck" | "quantity" | "progressAssessment", recordId: string) {
  assertSupervisionPermission(actor, "supervision_visits.create");
  const models = { visit: prisma.supervisionVisit, transitionCheck: prisma.supervisionTransitionCheck, quantity: prisma.supervisionQuantityVerification, progressAssessment: prisma.supervisionProgressAssessment } as const;
  const record = await (models[table] as any).findUnique({ where: { id: recordId } });
  if (!record) throw new Error("Không tìm thấy bản ghi.");
  await ownedEditablePackage(actor, record.packageId);
  await (models[table] as any).delete({ where: { id: recordId } });
  await writeAuditLog({ userId: actor.id, action: `DELETE_SUPERVISION_${table.toUpperCase()}`, entityType: `Supervision${table}`, entityId: recordId, beforeData: record });
}

const transition: Record<string, { next: SupervisionPackageStatus; review: boolean; reason: boolean }> = { submit: { next: "SUBMITTED", review: false, reason: false }, review: { next: "UNDER_REVIEW", review: true, reason: false }, request_revision: { next: "REVISION_REQUIRED", review: true, reason: true }, resubmit: { next: "RESUBMITTED", review: false, reason: false }, confirm: { next: "CONFIRMED", review: true, reason: false }, lock: { next: "LOCKED", review: true, reason: false }, cancel: { next: "CANCELLED", review: true, reason: true } };
const expected: Record<string, SupervisionPackageStatus[]> = { submit: ["DRAFT", "REVISION_REQUIRED"], review: ["SUBMITTED", "RESUBMITTED"], request_revision: ["SUBMITTED", "UNDER_REVIEW", "RESUBMITTED"], resubmit: ["REVISION_REQUIRED"], confirm: ["SUBMITTED", "UNDER_REVIEW", "RESUBMITTED"], lock: ["CONFIRMED"], cancel: ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "REVISION_REQUIRED", "RESUBMITTED"] };

export async function transitionPackage(actor: Actor, packageId: string, action: keyof typeof transition, reason?: string, idempotencyKey?: string) {
  const rule = transition[action]; const record = await prisma.supervisionWeeklyPackage.findUnique({ where: { id: packageId } });
  if (!record || record.deletedAt) throw new Error("Không tìm thấy hồ sơ giám sát tuần.");
  if (rule.review ? !canReviewSupervision(actor.role) || record.createdById === actor.id : !isSupervisionActor(actor.role) || record.createdById !== actor.id) throw new Error("Bạn không có quyền thực hiện chuyển trạng thái này.");
  if (!expected[action].includes(record.status)) throw new Error("Trạng thái hồ sơ không phù hợp với thao tác này.");
  if (rule.reason && !reason?.trim()) throw new Error("Bắt buộc nhập lý do cho thao tác này.");
  const result = await prisma.$transaction(async (tx) => {
    if (idempotencyKey) { const existing = await tx.supervisionWorkflowHistory.findFirst({ where: { packageId, idempotencyKey } }); if (existing) return { replay: true, status: existing.nextStatus }; }
    const updated = await tx.supervisionWeeklyPackage.updateMany({ where: { id: packageId, status: record.status }, data: { status: rule.next, version: { increment: action === "resubmit" ? 1 : 0 }, revisionReason: action === "request_revision" ? reason!.trim() : null, submittedAt: ["submit", "resubmit"].includes(action) ? new Date() : record.submittedAt, confirmedAt: action === "confirm" ? new Date() : record.confirmedAt, lockedAt: action === "lock" ? new Date() : record.lockedAt, reviewedById: rule.review ? actor.id : record.reviewedById } });
    if (updated.count !== 1) throw new Error("Hồ sơ vừa thay đổi, vui lòng tải lại.");
    await tx.supervisionWorkflowHistory.create({ data: { packageId, actorId: actor.id, action, previousStatus: record.status, nextStatus: rule.next, reason: reason?.trim() || null, version: record.version + (action === "resubmit" ? 1 : 0), idempotencyKey: idempotencyKey || null } });
    const recipients = rule.review ? [{ id: record.createdById }] : await tx.user.findMany({ where: { role: { in: ["DIRECTOR", "DEPUTY_DIRECTOR"] }, isActive: true, deletedAt: null }, select: { id: true } });
    await tx.notification.createMany({ data: recipients.map((item) => ({ userId: item.id, type: "SUPERVISION_WEEKLY_PACKAGE", severity: action === "request_revision" ? "WARNING" : "INFO", title: "Hồ sơ giám sát tuần", message: action === "request_revision" ? `Yêu cầu chỉnh sửa: ${reason}` : `Hồ sơ đã chuyển sang trạng thái ${rule.next}.`, href: `/supervision/${packageId}` })) });
    return { replay: false, status: rule.next };
  });
  if (!result.replay) await writeAuditLog({ userId: actor.id, action: `SUPERVISION_PACKAGE_${action.toUpperCase()}`, entityType: "SupervisionWeeklyPackage", entityId: packageId, beforeData: { status: record.status }, afterData: { status: result.status, reason } });
  return result;
}

export async function updateWeeklyPackage(actor: Actor, packageId: string, input: { recipientName?: string; recipientTitle?: string; place?: string; reportNumber?: string }) {
  assertSupervisionPermission(actor, "supervision_weekly_reports.create");
  await ownedEditablePackage(actor, packageId);
  return prisma.supervisionWeeklyPackage.update({ where: { id: packageId }, data: { recipientName: input.recipientName?.trim() || null, recipientTitle: input.recipientTitle?.trim() || null, place: input.place?.trim() || "Hà Nội", reportNumber: input.reportNumber?.trim() || null } });
}

export async function updateVisit(actor: Actor, id: string, input: { projectId: string; visitDate: string; shift: SupervisionShift; inspectionContent: string; result: string; workItem?: string; note?: string }) {
  assertSupervisionPermission(actor, "supervision_visits.create");
  const record = await prisma.supervisionVisit.findUnique({ where: { id } });
  if (!record) throw new Error("Not found");
  await ownedEditablePackage(actor, record.packageId); await assertSupervisionProjectAccess(actor, input.projectId);
  return prisma.supervisionVisit.update({ where: { id }, data: { ...input, visitDate: new Date(input.visitDate), workItem: input.workItem?.trim() || null, note: input.note?.trim() || null } });
}

export async function updateQuantityVerification(actor: Actor, id: string, input: { projectId: string; workItem: string; unit: string; reportedQuantity: number; verifiedQuantity: number; checkedAt: string; conclusion: string }) {
  assertSupervisionPermission(actor, "supervision_inspections.create");
  const record = await prisma.supervisionQuantityVerification.findUnique({ where: { id } });
  if (!record) throw new Error("Not found");
  await ownedEditablePackage(actor, record.packageId); await assertSupervisionProjectAccess(actor, input.projectId);
  const calculated = variance(input.reportedQuantity, input.verifiedQuantity);
  return prisma.supervisionQuantityVerification.update({ where: { id }, data: { ...input, reportedQuantity: new Prisma.Decimal(input.reportedQuantity), verifiedQuantity: new Prisma.Decimal(input.verifiedQuantity), varianceQuantity: new Prisma.Decimal(calculated.quantity), variancePercent: calculated.percent === null ? null : new Prisma.Decimal(calculated.percent), checkedAt: new Date(input.checkedAt) } });
}

export async function updateTransitionCheck(actor: Actor, id: string, input: { projectId: string; workItem: string; currentStep: string; proposedStep: string; reportedQuantity?: number; verifiedQuantity?: number; unit?: string; plannedProgress?: string; conclusion: string }) {
  assertSupervisionPermission(actor, "supervision_inspections.create");
  const record = await prisma.supervisionTransitionCheck.findUnique({ where: { id } });
  if (!record) throw new Error("Not found");
  await ownedEditablePackage(actor, record.packageId); await assertSupervisionProjectAccess(actor, input.projectId);
  const rq = input.reportedQuantity ?? 0; const vq = input.verifiedQuantity ?? 0; const v = variance(rq, vq);
  return prisma.supervisionTransitionCheck.update({ where: { id }, data: { projectId: input.projectId, workItem: input.workItem.trim(), currentStep: input.currentStep.trim(), proposedStep: input.proposedStep.trim(), reportedQuantity: new Prisma.Decimal(rq), verifiedQuantity: new Prisma.Decimal(vq), varianceQuantity: new Prisma.Decimal(v.quantity), unit: input.unit?.trim() || null, plannedProgress: input.plannedProgress?.trim() || null, conclusion: input.conclusion.trim() } });
}

export async function updateProgressAssessment(actor: Actor, id: string, input: { projectId: string; workItem?: string; plannedProgress: number; actualProgress: number; delayReason?: string }) {
  assertSupervisionPermission(actor, "supervision_inspections.create");
  const record = await prisma.supervisionProgressAssessment.findUnique({ where: { id } });
  if (!record) throw new Error("Not found");
  await ownedEditablePackage(actor, record.packageId); await assertSupervisionProjectAccess(actor, input.projectId);
  const delayed = input.plannedProgress > input.actualProgress;
  return prisma.supervisionProgressAssessment.update({ where: { id }, data: { projectId: input.projectId, workItem: input.workItem?.trim() || null, plannedProgress: new Prisma.Decimal(input.plannedProgress), actualProgress: new Prisma.Decimal(input.actualProgress), variancePercent: new Prisma.Decimal(input.actualProgress - input.plannedProgress), delayReason: delayed ? (input.delayReason?.trim() || null) : null } });
}
