import dotenv from "dotenv";
import path from "node:path";
import ExcelJS from "exceljs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import { generateNextEmployeeCode } from "../src/lib/hr/employee-code-generator";
import {
  normalizePersonName,
  provisionSiteCommanderAccount,
} from "../src/lib/hr/site-commander-account-service";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const SOURCE_PATH = "D:/ZaloData/CÁC CT CÁC BAN.xlsx";
const SOURCE_SHEET = "2HN và PTN (3)";
const COMMANDER_COLUMN = 8;
const IMPORT_EFFECTIVE_AT = new Date("2026-08-13T00:00:00+07:00");

const CONFIRMED_ASSIGNMENTS = [
  { sourceRow: 21, projectCode: "CT-2026-0002", commander: "Lê Mạnh Hùng" },
  { sourceRow: 32, projectCode: "CT-2026-0003", commander: "Đoàn Văn Giang" },
  { sourceRow: 33, projectCode: "CT-2026-0004", commander: "Đoàn Văn Giang" },
  { sourceRow: 35, projectCode: "CT-2026-0005", commander: "Đoàn Văn Giang" },
  { sourceRow: 41, projectCode: "CT-2026-0006", commander: "Lê Trọng Hạ" },
  { sourceRow: 52, projectCode: "CT-2026-0007", commander: "Trần Quốc Dũng" },
  { sourceRow: 53, projectCode: "CT-2026-0008", commander: "Trần Quốc Dũng" },
  { sourceRow: 61, projectCode: "CT-2026-0009", commander: "Nguyễn Văn Hưng" },
  { sourceRow: 62, projectCode: "CT-2026-0010", commander: "Phạm Anh Tuấn" },
  { sourceRow: 65, projectCode: "CT-2026-0011", commander: "Nguyễn Đức Mùi" },
  { sourceRow: 70, projectCode: "CT-2026-0012", commander: "Nguyễn Tư Mạnh" },
  { sourceRow: 74, projectCode: "CT-2026-0013", commander: "Phạm Anh Tuấn" },
  { sourceRow: 77, projectCode: "CT-2026-0014", commander: "Lương Văn Công" },
  { sourceRow: 80, projectCode: "CT-2026-0015", commander: "Vũ Hưng" },
  { sourceRow: 83, projectCode: "CT-2026-0016", commander: "Nguyễn Minh Hùng" },
  { sourceRow: 86, projectCode: "CT-2026-0017", commander: "Phạm Anh Tuấn" },
  { sourceRow: 87, projectCode: "CT-2026-0018", commander: "Phạm Anh Tuấn" },
  { sourceRow: 89, projectCode: "CT-2026-0020", commander: "Vũ Hưng" },
] as const;

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in value) return String(value.text ?? "");
  if (typeof value === "object" && "richText" in value) {
    return value.richText.map((part) => part.text).join("");
  }
  return String(value);
}

function metadataRow(metadata: Prisma.JsonValue | null): number | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Prisma.JsonObject).sourceRow;
  return typeof value === "number" ? value : null;
}

async function validateSourceWorkbook() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(SOURCE_PATH);
  const sheet = workbook.getWorksheet(SOURCE_SHEET);
  if (!sheet) throw new Error(`Không tìm thấy sheet nguồn ${SOURCE_SHEET}.`);

  for (const expected of CONFIRMED_ASSIGNMENTS) {
    const actualName = cellText(sheet.getRow(expected.sourceRow).getCell(COMMANDER_COLUMN).value);
    if (normalizePersonName(actualName) !== normalizePersonName(expected.commander)) {
      throw new Error(
        `Excel dòng ${expected.sourceRow} không còn khớp: dự kiến "${expected.commander}", thực tế "${actualName}".`,
      );
    }
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  await validateSourceWorkbook();

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL chưa được cấu hình trong .env.local.");
  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const [baseline, projects, chtRole, actor, allEmployees] = await Promise.all([
      Promise.all([
        prisma.user.count(),
        prisma.employee.count(),
        prisma.project.count(),
        prisma.employeeProjectAssignment.count({ where: { projectPersonnelRole: { code: "CHT" } } }),
        prisma.projectMember.count({ where: { role: "CHIEF_COMMANDER" } }),
      ]),
      prisma.project.findMany({
        where: { deletedAt: null },
        select: { id: true, code: true, name: true, startDate: true, sourceMetadata: true },
      }),
      prisma.projectPersonnelRole.findFirst({ where: { code: "CHT", isActive: true } }),
      prisma.user.findFirst({
        where: { role: "ADMIN", isActive: true, deletedAt: null },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.employee.findMany({ select: { id: true, code: true, fullName: true, userId: true } }),
    ]);

    if (projects.length !== 21) throw new Error(`Release gate yêu cầu 21 Project, database hiện có ${projects.length}.`);
    if (!chtRole) throw new Error("Không tìm thấy ProjectPersonnelRole CHT đang hoạt động.");
    if (!actor) throw new Error("Không có Admin đang hoạt động để ghi nhận actor migration.");

    const projectBySourceRow = new Map(projects.map((project) => [metadataRow(project.sourceMetadata), project]));
    for (const expected of CONFIRMED_ASSIGNMENTS) {
      const project = projectBySourceRow.get(expected.sourceRow);
      if (!project || project.code !== expected.projectCode) {
        throw new Error(`Không mapping được Excel dòng ${expected.sourceRow} sang ${expected.projectCode}.`);
      }
    }

    const employeeByName = new Map<string, typeof allEmployees>();
    for (const employee of allEmployees) {
      const key = normalizePersonName(employee.fullName);
      employeeByName.set(key, [...(employeeByName.get(key) ?? []), employee]);
    }
    const uniqueCommanders = [...new Set(CONFIRMED_ASSIGNMENTS.map((item) => item.commander))];
    const duplicateEmployees = uniqueCommanders.flatMap((name) => {
      const matches = employeeByName.get(normalizePersonName(name)) ?? [];
      return matches.length > 1 ? [{ name, matches: matches.map((item) => item.code) }] : [];
    });
    if (duplicateEmployees.length) {
      throw new Error(`Phát hiện Employee trùng sau chuẩn hóa: ${JSON.stringify(duplicateEmployees)}.`);
    }

    const dryRun = {
      mode: apply ? "APPLY" : "DRY_RUN",
      source: SOURCE_PATH,
      baseline: {
        users: baseline[0],
        employees: baseline[1],
        projects: baseline[2],
        chtAssignments: baseline[3],
        chiefCommanderProjectMembers: baseline[4],
      },
      confirmedCommanders: uniqueCommanders.length,
      confirmedAssignments: CONFIRMED_ASSIGNMENTS.length,
      employeesToCreate: uniqueCommanders.filter(
        (name) => !(employeeByName.get(normalizePersonName(name))?.length),
      ).length,
    };
    if (!apply) {
      console.log(JSON.stringify(dryRun, null, 2));
      return;
    }

    const employeeIdsByName = await prisma.$transaction(async (tx) => {
      const result = new Map<string, string>();

      for (const name of uniqueCommanders) {
        const canonicalName = normalizePersonName(name);
        const existing = employeeByName.get(canonicalName)?.[0];
        if (existing) {
          result.set(canonicalName, existing.id);
          continue;
        }

        const code = await generateNextEmployeeCode(tx, IMPORT_EFFECTIVE_AT);
        const employee = await tx.employee.create({
          data: {
            code,
            fullName: name,
            joinedDate: null,
            gender: null,
            dateOfBirth: null,
            phoneNumber: null,
            personalEmail: null,
            resignedDate: null,
            status: "ACTIVE",
            createdById: actor.id,
            updatedById: actor.id,
          },
        });
        await tx.employeeChangeHistory.create({
          data: {
            employeeId: employee.id,
            changeType: "EMPLOYEE_CREATED",
            performedById: actor.id,
            reason: "Nhập từ bảng công trình và Chỉ huy trưởng đã được công ty xác nhận",
            details: { source: SOURCE_PATH, fullName: name, employeeCode: code },
          },
        });
        result.set(canonicalName, employee.id);
      }

      for (const item of CONFIRMED_ASSIGNMENTS) {
        const employeeId = result.get(normalizePersonName(item.commander));
        const project = projectBySourceRow.get(item.sourceRow);
        if (!employeeId || !project) throw new Error(`Thiếu mapping tại Excel dòng ${item.sourceRow}.`);

        const activeAssignments = await tx.employeeProjectAssignment.findMany({
          where: {
            projectId: project.id,
            projectPersonnelRoleId: chtRole.id,
            status: "ACTIVE",
          },
          select: { id: true, employeeId: true },
        });
        const conflicting = activeAssignments.find((assignment) => assignment.employeeId !== employeeId);
        if (conflicting) {
          throw new Error(`Công trình ${project.code} đã có phân công CHT khác với Excel; migration không tự ghi đè.`);
        }
        if (activeAssignments.some((assignment) => assignment.employeeId === employeeId)) continue;

        await tx.employeeProjectAssignment.create({
          data: {
            employeeId,
            projectId: project.id,
            projectPersonnelRoleId: chtRole.id,
            startDate: project.startDate ?? IMPORT_EFFECTIVE_AT,
            allocationPercentage: 100,
            status: "ACTIVE",
            notes: `Nguồn xác nhận: CÁC CT CÁC BAN.xlsx, sheet ${SOURCE_SHEET}, dòng ${item.sourceRow}`,
            createdById: actor.id,
          },
        });
      }

      return result;
    });

    const provisioningResults = [];
    for (const name of uniqueCommanders) {
      const employeeId = employeeIdsByName.get(normalizePersonName(name));
      if (!employeeId) throw new Error(`Không tìm thấy Employee vừa import cho ${name}.`);
      provisioningResults.push(await provisionSiteCommanderAccount({ prisma, employeeId, actorUserId: actor.id }));
    }

    const [afterUsers, afterEmployees, afterProjects, afterAssignments, afterMembers, commanderUsers] = await Promise.all([
      prisma.user.count(),
      prisma.employee.count(),
      prisma.project.count(),
      prisma.employeeProjectAssignment.count({ where: { projectPersonnelRole: { code: "CHT" }, status: "ACTIVE" } }),
      prisma.projectMember.count({ where: { role: "CHIEF_COMMANDER", isActive: true, deletedAt: null, leftAt: null } }),
      prisma.user.count({ where: { role: "CHIEF_COMMANDER", employee: { isNot: null } } }),
    ]);

    if (afterProjects !== 21 || afterAssignments !== 18 || afterMembers !== 18 || commanderUsers !== 11) {
      throw new Error(
        `Reconcile thất bại: Project=${afterProjects}, CHT assignment=${afterAssignments}, ProjectMember=${afterMembers}, User CHT=${commanderUsers}.`,
      );
    }

    console.log(JSON.stringify({
      ...dryRun,
      after: {
        users: afterUsers,
        employees: afterEmployees,
        projects: afterProjects,
        chtAssignments: afterAssignments,
        chiefCommanderProjectMembers: afterMembers,
        commanderUsers,
      },
      accountsCreated: provisioningResults.filter((result) => result.code === "CREATED").length,
      accountsReconciled: provisioningResults.filter((result) => result.code === "EXISTING_RECONCILED").length,
      usernames: provisioningResults.map((result) => result.username),
      credentialHandling: "Mật khẩu tạm không được ghi vào log hoặc báo cáo; Admin đặt lại để nhận đúng một lần.",
    }, null, 2));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
