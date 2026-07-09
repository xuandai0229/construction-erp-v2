import { Prisma, SiteReportLine, UserRole } from "@prisma/client";
import { assertWeeklyResultDateAllowed, serializeWeeklyGeneralNote } from "./weekly-report-utils";

export async function updateWeeklyReportCore(
  tx: Prisma.TransactionClient,
  reportId: string,
  input: {
    weekStartDateStr?: string;
    generalNoteObj?: Record<string, unknown>;
    workLines?: Record<string, unknown>[];
    weatherCondition?: string;
    weatherTemperature?: string;
    summary?: string;
    materials?: string;
    labor?: string;
    quality?: string;
    issues?: string;
    recommendations?: string;
    gpsLat?: string;
    gpsLng?: string;
  },
  actor: { id: string; role: UserRole; name?: string }
) {
  const report = await tx.siteReport.findUnique({ where: { id: reportId } });
  if (!report || report.deletedAt || report.type !== "WEEKLY") {
    throw new Error("Không tìm thấy báo cáo tuần hoặc đã bị xóa.");
  }

  const hasActualLines = Array.isArray(input.workLines) && input.workLines.length > 0;
  
  if (input.weekStartDateStr) {
    assertWeeklyResultDateAllowed({
      weekStartDateStr: input.weekStartDateStr,
      hasActualLines,
    });
  }

  // Delete existing lines
  await tx.siteReportLine.deleteMany({
    where: { siteReportId: reportId }
  });

  // Re-create lines keeping all snapshot fields
  const linesToCreate = (input.workLines || []).map((line, index) => ({
    projectId: report.projectId,
    fieldProgressItemId: line.fieldProgressItemId ? String(line.fieldProgressItemId) : null,
    workContent: String(line.workContent || "No content"),
    workName: String(line.workName || line.workContent),
    area: line.area ? String(line.area) : null,
    unit: line.unit ? String(line.unit) : null,
    designQuantity: line.designQuantity ? new Prisma.Decimal(Number(line.designQuantity)) : new Prisma.Decimal(0),
    quantityBefore: line.quantityBefore ? new Prisma.Decimal(Number(line.quantityBefore)) : new Prisma.Decimal(0),
    quantityToday: line.quantityToday ? new Prisma.Decimal(Number(line.quantityToday)) : new Prisma.Decimal(0),
    quantityCumulative: line.quantityCumulative ? new Prisma.Decimal(Number(line.quantityCumulative)) : new Prisma.Decimal(0),
    progressPercent: line.progressPercent ? new Prisma.Decimal(Number(line.progressPercent)) : new Prisma.Decimal(0),
    note: line.note ? String(line.note) : null,
    issueNote: line.issueNote ? String(line.issueNote) : null,
    proposalNote: line.proposalNote ? String(line.proposalNote) : null,
    sortOrder: index,
  }));

  const result = await tx.siteReport.update({
    where: { id: reportId },
    data: {
      generalNote: input.generalNoteObj ? serializeWeeklyGeneralNote(input.generalNoteObj as any) : null,
      weatherCondition: input.weatherCondition as any || undefined,
      weatherTemperature: input.weatherTemperature ? Number(input.weatherTemperature) : undefined,
      summary: input.summary ? String(input.summary) : null,
      materials: input.materials ? String(input.materials) : null,
      labor: input.labor ? String(input.labor) : null,
      quality: input.quality ? String(input.quality) : null,
      issues: input.issues ? String(input.issues) : null,
      recommendations: input.recommendations ? String(input.recommendations) : null,
      gpsLat: input.gpsLat ? Number(input.gpsLat) : null,
      gpsLng: input.gpsLng ? Number(input.gpsLng) : null,
      lines: {
        create: linesToCreate
      }
    }
  });

  return result;
}
