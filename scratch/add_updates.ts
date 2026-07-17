import fs from "fs";

let content = fs.readFileSync("src/lib/supervision/service.ts", "utf-8");

content += `
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
`;
fs.writeFileSync("src/lib/supervision/service.ts", content);
