import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canReviewSupervisionWeekly, canUseSupervisionWeekly } from "@/lib/supervision-weekly/permissions";
import { getSupervisionWeeklyDossier, getSupervisionWeeklyProjects } from "../../actions";
import { WeeklyEditor } from "@/components/supervision-weekly/weekly-editor";
import { isoDate } from "@/lib/supervision-weekly/date";

export const metadata = { title: "Soạn báo cáo tuần Giám sát | ERP Công trình" };

export default async function SupervisionWeeklyEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");
  if (!canUseSupervisionWeekly(session.role)) redirect("/dashboard");
  const [dossier, projects] = await Promise.all([getSupervisionWeeklyDossier(id), getSupervisionWeeklyProjects()]);
  if (!dossier) notFound();
  return <WeeklyEditor canReview={canReviewSupervisionWeekly(session.role)} projects={projects} initial={{
      id: dossier.id, reportNumber: dossier.reportNumber, weekStart: isoDate(dossier.weekStart), weekEnd: isoDate(dossier.weekEnd), nextWeekStart: isoDate(dossier.nextWeekStart), nextWeekEnd: isoDate(dossier.nextWeekEnd), place: dossier.place, recipientName: dossier.recipientName, recipientTitle: dossier.recipientTitle, authorName: dossier.createdBy.name, status: dossier.status, version: dossier.version, lockVersion: dossier.lockVersion,
      entries: dossier.entries.map((entry) => ({
        id: entry.id, documentType: entry.documentType, entryDate: isoDate(entry.entryDate), shift: entry.shift, sortOrder: entry.sortOrder, inputMode: entry.inputMode,
        projectId: entry.projectId, projectNameSnapshot: entry.projectNameSnapshot, locationId: entry.locationId, locationNameSnapshot: entry.locationNameSnapshot,
        workItemId: entry.workItemId, workItemNameSnapshot: entry.workItemNameSnapshot, manualText: entry.manualText, manualLocation: entry.manualLocation, manualProjectName: entry.manualProjectName, manualWorkItemName: entry.manualWorkItemName,
        categoryItemId: entry.categoryItemId, categoryNameSnapshot: entry.categoryNameSnapshot, manualCategoryName: entry.manualCategoryName,
        inspectionWorkItemId: entry.inspectionWorkItemId, inspectionWorkNameSnapshot: entry.inspectionWorkNameSnapshot,
        displayText: entry.displayText, inspectionContent: entry.inspectionContent, result: entry.result, commanderProposal: entry.commanderProposal,
      })),
      shiftSelections: dossier.shiftSelections.map((selection) => ({ documentType: selection.documentType, entryDate: isoDate(selection.entryDate), shift: selection.shift })),
      observations: dossier.observations.map((observation) => ({
        id: observation.id, documentType: observation.documentType, category: observation.category, sortOrder: observation.sortOrder,
        projectId: observation.projectId, projectNameSnapshot: observation.projectNameSnapshot, locationId: observation.locationId, locationNameSnapshot: observation.locationNameSnapshot,
        workItemId: observation.workItemId, workItemNameSnapshot: observation.workItemNameSnapshot, manualText: observation.manualText, manualLocation: observation.manualLocation, manualProjectName: observation.manualProjectName, manualWorkItemName: observation.manualWorkItemName, categoryItemId: observation.categoryItemId, categoryNameSnapshot: observation.categoryNameSnapshot, manualCategoryName: observation.manualCategoryName, displayText: observation.displayText, content: observation.content,
      })),
      transitions: dossier.transitions.map((row) => ({
        id: row.id, sortOrder: row.sortOrder, projectId: row.projectId, projectNameSnapshot: row.projectNameSnapshot, locationId: row.locationId, locationNameSnapshot: row.locationNameSnapshot, workItemId: row.workItemId,
        workItemNameSnapshot: row.workItemNameSnapshot, manualText: row.manualText, manualLocation: row.manualLocation, manualProjectName: row.manualProjectName, manualWorkItemName: row.manualWorkItemName, categoryItemId: row.categoryItemId, categoryNameSnapshot: row.categoryNameSnapshot, manualCategoryName: row.manualCategoryName, displayText: row.displayText,
        reportedQuantity: row.reportedQuantity === null ? null : Number(row.reportedQuantity),
        reportedText: row.reportedText, reportedRaw: row.reportedRaw, reportedUnit: row.reportedUnit, reportedUnitCode: row.reportedUnitCode,
        verifiedQuantity: row.verifiedQuantity === null ? null : Number(row.verifiedQuantity), verifiedText: row.verifiedText, verifiedRaw: row.verifiedRaw, verifiedUnit: row.verifiedUnit, verifiedUnitCode: row.verifiedUnitCode,
        verificationMode: row.verificationMode, varianceReason: row.varianceReason,
        plannedProgress: row.plannedProgress, currentStep: row.currentStep, proposedStep: row.proposedStep, conclusion: row.conclusion,
      })),
      quantities: dossier.quantities.map((row) => ({
        id: row.id, sortOrder: row.sortOrder, projectId: row.projectId, projectNameSnapshot: row.projectNameSnapshot, locationId: row.locationId, locationNameSnapshot: row.locationNameSnapshot, workItemId: row.workItemId,
        workItemNameSnapshot: row.workItemNameSnapshot, manualText: row.manualText, manualLocation: row.manualLocation, manualProjectName: row.manualProjectName, manualWorkItemName: row.manualWorkItemName, categoryItemId: row.categoryItemId, categoryNameSnapshot: row.categoryNameSnapshot, manualCategoryName: row.manualCategoryName, displayText: row.displayText, unit: row.unit, unitCode: row.unitCode,
        reportedRaw: row.reportedRaw, reportedText: row.reportedText, reportedUnit: row.reportedUnit, reportedUnitCode: row.reportedUnitCode, reportedQuantity: row.reportedQuantity === null ? null : Number(row.reportedQuantity),
        verifiedRaw: row.verifiedRaw, verifiedText: row.verifiedText, verifiedUnit: row.verifiedUnit, verifiedUnitCode: row.verifiedUnitCode, verifiedQuantity: row.verifiedQuantity === null ? null : Number(row.verifiedQuantity),
        verificationMode: row.verificationMode, varianceReason: row.varianceReason,
        plannedProgress: row.plannedProgress, conclusion: row.conclusion,
      })),
      progressRows: dossier.progressRows.map((row) => ({
        id: row.id, sortOrder: row.sortOrder, projectId: row.projectId, projectNameSnapshot: row.projectNameSnapshot, locationId: row.locationId, locationNameSnapshot: row.locationNameSnapshot, workItemId: row.workItemId,
        workItemNameSnapshot: row.workItemNameSnapshot, manualText: row.manualText, manualLocation: row.manualLocation, manualProjectName: row.manualProjectName, manualWorkItemName: row.manualWorkItemName, categoryItemId: row.categoryItemId, categoryNameSnapshot: row.categoryNameSnapshot, manualCategoryName: row.manualCategoryName, displayText: row.displayText,
        plannedProgress: row.plannedProgress, actualProgress: row.actualProgress, delayValue: row.delayValue === null ? null : Number(row.delayValue), delayType: row.delayType, delayReason: row.delayReason,
      })),
  }} />;
}
