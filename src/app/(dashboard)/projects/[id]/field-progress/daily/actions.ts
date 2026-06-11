"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getWorkDateRange } from "@/lib/date/work-date";
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
    const { start, end } = getWorkDateRange(entryDateStr);

    const status = submit ? "SUBMITTED" : "DRAFT";

    // Fetch existing ACTIVE entries for this date (by range), to know whether to create or update.
    // Only consider entries where deletedAt is null (soft delete check).
    const existing = await prisma.fieldProgressEntry.findMany({
      where: {
        templateId,
        deletedAt: null,
        entryDate: {
          gte: start,
          lt: end,
        },
      },
    });

    // Group existing entries by itemId to detect duplicates
    const existingByItemId = new Map<string, string[]>();
    for (const entry of existing) {
      if (!existingByItemId.has(entry.itemId)) {
        existingByItemId.set(entry.itemId, []);
      }
      existingByItemId.get(entry.itemId)!.push(entry.id);
    }

    const operations = entries.map(e => {
      const quantity = new Decimal(e.quantity || 0);
      if (quantity.lessThan(0)) throw new Error("Khối lượng không được âm");

      const existingIds = existingByItemId.get(e.itemId) || [];
      
      // Check for duplicate entries
      if (existingIds.length > 1) {
        throw new Error(
          `Phát hiện dữ liệu trùng lặp cho công việc (${e.itemId}) trong ngày đã chọn. ` +
          `Vui lòng chạy audit và xử lý dữ liệu trước khi nhập tiếp.`
        );
      }
      
      if (existingIds.length === 1) {
        // Exactly one existing entry, update it
        return prisma.fieldProgressEntry.update({
          where: { id: existingIds[0] },
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
        // No existing entry, create new
        return prisma.fieldProgressEntry.create({
          data: {
            projectId,
            templateId,
            itemId: e.itemId,
            entryDate: start,
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

    revalidatePath(`/projects/${projectId}/field-progress`);
    revalidatePath(`/projects/${projectId}/field-progress/daily`);
    revalidatePath(`/projects/${projectId}/field-progress/summary`);
    revalidatePath(`/projects/${projectId}/field-progress`, "layout");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
