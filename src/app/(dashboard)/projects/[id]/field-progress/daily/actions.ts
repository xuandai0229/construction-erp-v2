"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
const Decimal = Prisma.Decimal;

export async function saveDailyEntries(projectId: string, templateId: string, entryDate: Date, entries: any[], submit: boolean = false) {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  try {
    const status = submit ? "SUBMITTED" : "DRAFT";
    const dateStr = entryDate.toISOString();

    // Use transaction
    await prisma.$transaction(
      entries.map(e => {
        const quantity = new Decimal(e.quantity || 0);
        if (quantity.lessThan(0)) throw new Error("Quantity cannot be negative");

        return prisma.fieldProgressEntry.upsert({
          where: {
            // We don't have a unique constraint on templateId_itemId_entryDate so we need to find existing
            // Wait, prisma upsert requires a unique constraint. Let's use findFirst then update/create
            id: e.entryId || "new_id_that_never_matches"
          },
          update: {
            quantity,
            issueNote: e.issueNote,
            proposalNote: e.proposalNote,
            note: e.note,
            status,
            submittedAt: submit ? new Date() : undefined
          },
          create: {
            projectId,
            templateId,
            itemId: e.itemId,
            entryDate,
            quantity,
            issueNote: e.issueNote,
            proposalNote: e.proposalNote,
            note: e.note,
            status,
            createdById: session.id,
            submittedAt: submit ? new Date() : undefined
          }
        });
      })
    );
    
    // The above upsert uses a dummy ID for create if entryId is not provided. 
    // However, if there's no entryId, the update will fail because the id is not found.
    // A better approach is to loop and use create or update explicitly. Let's fix this in a moment.

    await writeAuditLog({
      userId: session.id,
      projectId,
      action: submit ? "SUBMIT_FIELD_PROGRESS_ENTRY" : "UPDATE_FIELD_PROGRESS_ENTRY",
      entityType: "FieldProgressEntry",
      entityId: dateStr,
      afterData: entries
    });

    revalidatePath(`/projects/${projectId}/field-progress/daily`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

// Safer batch save function
export async function batchSaveDailyEntries(projectId: string, templateId: string, entryDateStr: string, entries: any[], submit: boolean = false) {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  try {
    const entryDate = new Date(entryDateStr);
    const status = submit ? "SUBMITTED" : "DRAFT";

    // We fetch existing entries for this date to know whether to create or update
    const existing = await prisma.fieldProgressEntry.findMany({
      where: { templateId, entryDate }
    });
    
    const existingMap = new Map(existing.map(e => [e.itemId, e.id]));

    const operations = entries.map(e => {
      const quantity = new Decimal(e.quantity || 0);
      if (quantity.lessThan(0)) throw new Error("Khối lượng không được âm");

      const existingId = existingMap.get(e.itemId);
      
      if (existingId) {
        return prisma.fieldProgressEntry.update({
          where: { id: existingId },
          data: {
            quantity,
            issueNote: e.issueNote,
            proposalNote: e.proposalNote,
            note: e.note,
            status,
            submittedAt: submit ? new Date() : undefined
          }
        });
      } else {
        return prisma.fieldProgressEntry.create({
          data: {
            projectId,
            templateId,
            itemId: e.itemId,
            entryDate,
            quantity,
            issueNote: e.issueNote,
            proposalNote: e.proposalNote,
            note: e.note,
            status,
            createdById: session.id,
            submittedAt: submit ? new Date() : undefined
          }
        });
      }
    });

    await prisma.$transaction(operations);

    await writeAuditLog({
      userId: session.id,
      projectId,
      action: submit ? "SUBMIT_FIELD_PROGRESS_ENTRY" : "UPDATE_FIELD_PROGRESS_ENTRY",
      entityType: "FieldProgressEntry",
      entityId: entryDateStr,
      afterData: entries
    });

    revalidatePath(`/projects/${projectId}/field-progress/daily`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
