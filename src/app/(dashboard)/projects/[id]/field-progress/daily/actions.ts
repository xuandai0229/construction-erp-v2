"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { requireProjectAccess } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getWorkDateRange } from "@/lib/date/work-date";
import { evaluateVolumeGuard } from "@/lib/field-progress/volume-guard";
import { assertFieldProgressEntryWritable } from "@/lib/field-progress/entry-workflow-policy";
const Decimal = Prisma.Decimal;

// Safer batch save function
export async function batchSaveDailyEntries(projectId: string, templateId: string, entryDateStr: string, entries: any[], _submit: boolean = false) {
  const session = await requireProjectAccess(projectId);

  try {
    const { start, end } = getWorkDateRange(entryDateStr);
    const isApprover = ["ADMIN", "DIRECTOR", "MANAGER", "SITE_MANAGER"].includes(session.role as string);
    const status = _submit ? (isApprover ? "APPROVED" : "SUBMITTED") : "DRAFT";
    
    const itemIds = entries.map(e => e.itemId);

    // Fetch existing ACTIVE entries for this date
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

    const existingByItemId = new Map<string, typeof existing>();
    for (const entry of existing) {
      if (!existingByItemId.has(entry.itemId)) {
        existingByItemId.set(entry.itemId, []);
      }
      existingByItemId.get(entry.itemId)!.push(entry);
    }

    // Fetch design quantities for validation
    const activeItems = await prisma.fieldProgressItem.findMany({
      where: { id: { in: itemIds }, deletedAt: null },
      select: { id: true, designQuantity: true, itemType: true, projectId: true, templateId: true }
    });
    const itemsMap = new Map(activeItems.map(i => [i.id, i]));

    // Fetch cumulative before today (APPROVED only — matches Daily display)
    const historicalSums = await prisma.fieldProgressEntry.groupBy({
      by: ["itemId"],
      where: {
        itemId: { in: itemIds },
        deletedAt: null,
        status: "APPROVED",
        OR: [
          { entryDate: { lt: start } },
          { entryDate: { gte: end } }
        ]
      },
      _sum: { quantity: true }
    });
    const sumsMap = new Map(historicalSums.map(s => [s.itemId, Number(s._sum.quantity || 0)]));

    const operations = entries.flatMap(e => {
      const item = itemsMap.get(e.itemId);
      if (!item) throw new Error("Công việc không hợp lệ hoặc đã bị xóa");
      if (item.projectId !== projectId || item.templateId !== templateId) throw new Error("Công việc không thuộc công trình hiện tại");
      if (item.itemType === "GROUP") throw new Error("Không thể nhập khối lượng cho hạng mục tổng");

      const rawQuantity = e.quantity === "" || e.quantity == null ? 0 : e.quantity;
      const quantityNum = Number(rawQuantity);
      if (!Number.isFinite(quantityNum)) throw new Error("Khối lượng phải là số hợp lệ");
      if (quantityNum < 0) throw new Error("Khối lượng không được âm");
      const quantity = new Decimal(quantityNum);

      const existingEntries = existingByItemId.get(e.itemId) || [];
      
      if (existingEntries.length > 1) {
        throw new Error(
          `Phát hiện dữ liệu trùng lặp cho công việc (${e.itemId}) trong ngày đã chọn. ` +
          `Vui lòng chạy audit và xử lý dữ liệu trước khi nhập tiếp.`
        );
      }

      const existingEntry = existingEntries[0];
      // Removed assertFieldProgressEntryWritable to allow Admin corrections

      // Handle quantity = 0
      if (quantityNum === 0) {
        if (existingEntry) {
          // Soft-delete existing entry if quantity is set to 0
          return [
            prisma.fieldProgressEntry.update({
              where: { id: existingEntry.id },
              data: { deletedAt: new Date() }
            }),
            prisma.auditLog.create({
              data: {
                action: "CORRECT_FIELD_PROGRESS_ENTRY",
                userId: session.id,
                projectId,
                entityType: "FieldProgressEntry",
                entityId: existingEntry.id,
                beforeData: JSON.stringify({ quantity: existingEntry.quantity }),
                afterData: JSON.stringify({ quantity: 0, deleted: true })
              }
            })
          ];
        }
        // If it doesn't exist, do nothing (don't create dirty 0-quantity entry)
        return [];
      }

      // Validate Volume Guard for quantity > 0
      const designQty = Number(item.designQuantity || 0);
      const cumulativeBefore = sumsMap.get(e.itemId) || 0;
      
      const guard = evaluateVolumeGuard({
        designQuantity: designQty,
        cumulativeBefore,
        todayQuantity: quantityNum,
        status,
        note: e.note,
        issueNote: e.issueNote,
        proposalNote: e.proposalNote
      });

      if (!guard.canSubmit) {
        throw new Error("Khối lượng sau khi lưu vượt giới hạn cho phép. Vui lòng nhập lý do phát sinh tối thiểu 10 ký tự hoặc điều chỉnh lại số liệu.");
      }
      
      if (existingEntry) {
        return [
          prisma.fieldProgressEntry.update({
            where: { id: existingEntry.id },
            data: {
              quantity,
              issueNote: e.issueNote,
              proposalNote: e.proposalNote,
              note: e.note,
              status,
              approvedAt: status === "APPROVED" ? new Date() : null,
              submittedAt: _submit ? new Date() : null,
              deletedAt: null // Restore if it was previously soft-deleted (though our query filtered deletedAt: null anyway)
            }
          }),
          prisma.auditLog.create({
            data: {
              action: "CORRECT_FIELD_PROGRESS_ENTRY",
              userId: session.id,
              projectId,
              entityType: "FieldProgressEntry",
              entityId: existingEntry.id,
              beforeData: JSON.stringify({ quantity: existingEntry.quantity }),
              afterData: JSON.stringify({ quantity: quantityNum })
            }
          })
        ];
      } else {
        return [
          prisma.fieldProgressEntry.create({
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
              approvedAt: status === "APPROVED" ? new Date() : null,
              submittedAt: _submit ? new Date() : null
            }
          })
        ];
      }
    });

    await prisma.$transaction(operations);

    await writeAuditLog({
      userId: session.id,
      projectId,
      action: "UPDATE_FIELD_PROGRESS_ENTRY",
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
