"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
const Decimal = Prisma.Decimal;

// NOTE:
// saveDailyEntries() (upsert version) has been removed because it contained
// ambiguous/duplicate logic and relied on non-existent constraints.
// The only supported write path is batchSaveDailyEntries().

// Safer batch save function
export async function batchSaveDailyEntries(projectId: string, templateId: string, entryDateStr: string, entries: any[], submit: boolean = false) {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  try {
    // Normalize entryDateStr (YYYY-MM-DD) to a stable day range to avoid timezone mismatch.
    // We treat "entryDateStr" as local date and store/query by [startOfDay, nextDay).
    const startOfDay = new Date(entryDateStr + "T00:00:00");
    const nextDay = new Date(entryDateStr + "T00:00:00");
    nextDay.setDate(nextDay.getDate() + 1);

    const status = submit ? "SUBMITTED" : "DRAFT";

    // Fetch existing entries for this date (by range), to know whether to create or update.
    const existing = await prisma.fieldProgressEntry.findMany({
      where: {
        templateId,
        entryDate: {
          gte: startOfDay,
          lt: nextDay,
        },
      },
    });

    const existingMap = new Map(existing.map((e) => [e.itemId, e.id]));

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
            // Store normalized start-of-day to keep day switching stable.
            entryDate: startOfDay,
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
