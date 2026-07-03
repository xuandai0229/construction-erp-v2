import { Prisma } from "@prisma/client";
import { WeeklyGeneralNote, parseWeeklyGeneralNote } from "./weekly-report-utils";

export function serializeDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    // try parse it as Date, if valid return ISO
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toISOString();
    return value;
  }
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString();
  }
  return null;
}

export function serializeDateOnly(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

export function serializeDecimal(value: Prisma.Decimal | number | string | null | undefined): number | string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "object" && value !== null && 'toNumber' in value) {
    return value.toNumber();
  }
  return Number(value);
}

export function serializeProjectForClient(project: any) {
  if (!project) return null;
  return {
    id: String(project.id),
    code: project.code ? String(project.code) : null,
    name: project.name ? String(project.name) : null,
    status: project.status ? String(project.status) : null,
    location: project.location ? String(project.location) : null,
    startDate: serializeDate(project.startDate),
    endDate: serializeDate(project.endDate),
    budget: serializeDecimal(project.budget)
  };
}

export function serializeReportAttachmentForClient(attachment: any) {
  if (!attachment) return null;
  return {
    id: String(attachment.id),
    reportId: String(attachment.reportId),
    name: attachment.name ? String(attachment.name) : null,
    originalName: attachment.originalName ? String(attachment.originalName) : null,
    fileName: attachment.fileName ? String(attachment.fileName) : null,
    storagePath: attachment.storagePath ? String(attachment.storagePath) : null,
    kind: attachment.kind ? String(attachment.kind) : null,
    sizeBytes: typeof attachment.fileSize === 'bigint' ? attachment.fileSize.toString() : serializeDecimal(attachment.fileSize) || serializeDecimal(attachment.sizeBytes) || 0,
    caption: attachment.caption ? String(attachment.caption) : undefined,
    uploadedBy: attachment.uploadedBy ? String(attachment.uploadedBy) : null,
    createdAt: serializeDate(attachment.createdAt),
    updatedAt: serializeDate(attachment.updatedAt)
  };
}

export function serializeReportForClient(report: any) {
  if (!report) return null;
  
  return {
    id: String(report.id),
    reportNo: String(report.reportNo),
    type: String(report.type),
    projectId: String(report.projectId),
    project: report.project ? serializeProjectForClient(report.project) : null,
    reportDate: serializeDate(report.reportDate),
    weekStartDate: serializeDate(report.weekStartDate),
    weekEndDate: serializeDate(report.weekEndDate),
    status: String(report.status),
    createdById: String(report.createdById),
    reporterName: report.reporterName ? String(report.reporterName) : null,
    summary: report.summary ? String(report.summary) : undefined,
    weatherCondition: report.weatherCondition ? String(report.weatherCondition) : undefined,
    weatherTemperature: serializeDecimal(report.weatherTemperature),
    generalNote: report.generalNote ? String(report.generalNote) : null,
    weeklyNote: parseWeeklyGeneralNote(report.generalNote),
    createdBy: report.createdBy ? {
      name: report.createdBy.name,
      role: report.createdBy.role
    } : null,
    attachments: Array.isArray(report.attachments) ? report.attachments.map(serializeReportAttachmentForClient) : [],
    lines: Array.isArray(report.lines) ? report.lines.map((l: any) => ({
      id: String(l.id),
      workContent: l.workContent ? String(l.workContent) : null,
      unit: l.unit ? String(l.unit) : null,
      quantityToday: serializeDecimal(l.quantityToday),
      note: l.note ? String(l.note) : null
    })) : []
  };
}
