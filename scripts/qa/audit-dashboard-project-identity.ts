/**
 * Read-only audit for duplicate project names and Dashboard action identity.
 * The script refuses any target that is not a local database whose name contains "qa".
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

function requireSafeReadOnlyTarget() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is required");
  const url = new URL(raw);
  const database = url.pathname.replace(/^\//, "");
  const local = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  if (!local || !database.toLowerCase().includes("qa")) {
    throw new Error(`Read-only identity audit is restricted to a local QA database; host=${url.hostname} database=${database}`);
  }
  return raw;
}

type AuditRow = {
  projectId: string;
  code: string;
  name: string;
  location: string | null;
  sourceAction: string;
  targetType: string;
  targetId: string;
};

async function main() {
  const pool = new Pool({ connectionString: requireSafeReadOnlyTarget(), max: 1 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const projects = await prisma.project.findMany({
      where: { deletedAt: null },
      select: { id: true, code: true, name: true, location: true, description: true, endDate: true },
      orderBy: [{ name: "asc" }, { code: "asc" }],
    });
    const groups = new Map<string, typeof projects>();
    for (const project of projects) {
      const key = project.name.trim().toLocaleLowerCase("vi-VN");
      groups.set(key, [...(groups.get(key) ?? []), project]);
    }
    const duplicates = [...groups.values()].filter((group) => group.length > 1).flat();
    const duplicateIds = duplicates.map((project) => project.id);

    const [reports, materialRequests, fieldMaterialRequests, tasks, approvals] = await Promise.all([
      prisma.siteReport.findMany({
        where: { projectId: { in: duplicateIds }, deletedAt: null, issues: { not: null } },
        select: { id: true, projectId: true, title: true },
      }),
      prisma.materialRequest.findMany({
        where: { projectId: { in: duplicateIds }, deletedAt: null, status: { notIn: ["REJECTED", "CANCELLED"] } },
        select: { id: true, projectId: true, requestNo: true },
      }),
      prisma.fieldMaterialRequest.findMany({
        where: { projectId: { in: duplicateIds }, deletedAt: null, status: { notIn: ["APPROVED", "REJECTED", "CANCELLED"] } },
        select: { id: true, projectId: true },
      }),
      prisma.workTask.findMany({
        where: { projectId: { in: duplicateIds }, lifecycle: { notIn: ["COMPLETED", "CANCELLED"] } },
        select: { id: true, projectId: true, title: true },
      }),
      prisma.approvalRequest.findMany({
        where: { projectId: { in: duplicateIds }, deletedAt: null, status: "PENDING" },
        select: { id: true, projectId: true, title: true },
      }),
    ]);

    const projectById = new Map(duplicates.map((project) => [project.id, project]));
    const rows: AuditRow[] = [];
    const add = (projectId: string, sourceAction: string, targetType: string, targetId: string) => {
      const project = projectById.get(projectId);
      if (!project) return;
      rows.push({ projectId, code: project.code, name: project.name, location: project.location, sourceAction, targetType, targetId });
    };
    for (const report of reports) add(report.projectId, report.title || "Báo cáo có vấn đề", "SITE_REPORT", report.id);
    for (const request of materialRequests) add(request.projectId, `Yêu cầu vật tư ${request.requestNo}`, "MATERIAL_REQUEST", request.id);
    for (const request of fieldMaterialRequests) add(request.projectId, "Đề xuất vật tư hiện trường", "FIELD_MATERIAL_REQUEST", request.id);
    for (const task of tasks) add(task.projectId, task.title, "WORK_TASK", task.id);
    for (const approval of approvals) add(approval.projectId, approval.title, "APPROVAL", approval.id);
    for (const project of duplicates) {
      if (!rows.some((row) => row.projectId === project.id)) add(project.id, "Không có action đang mở trong các nguồn đã kiểm tra", "PROJECT", project.id);
    }

    const identity = duplicates.map((project) => {
      const searchable = `${project.code} ${project.name} ${project.location ?? ""} ${project.description ?? ""}`.toLowerCase();
      return {
        projectId: project.id,
        code: project.code,
        name: project.name,
        location: project.location,
        testMarker: /(^|\W)(qa|test|demo|seed)(\W|$)/i.test(searchable),
      };
    });
    const units = await prisma.fieldProgressItem.findMany({
      where: { projectId: { in: duplicateIds }, deletedAt: null, itemType: "WORK", template: { deletedAt: null } },
      select: { projectId: true, unit: true },
    });
    const unitSummary = duplicates.map((project) => ({
      projectId: project.id,
      code: project.code,
      units: [...new Set(units.filter((item) => item.projectId === project.id).map((item) => item.unit?.trim() || "(thiếu đơn vị)"))].sort(),
    }));

    console.log(JSON.stringify({ identity, actionRows: rows, unitSummary }, null, 2));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
