import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import * as bcrypt from "bcryptjs";
import prisma from "../../src/lib/prisma";

type Row = {
  sourceRow: number;
  area: string;
  name: string;
  address: string;
  investor: string;
  officer: string;
  commander: string;
  engineer: string;
  guard: string;
  value: string;
  duration: string;
  period: string;
  note: string;
  unit: string;
  status: string;
};
type Source = { rows: Row[]; sourceVerified: boolean; sourceType: "google" | "approved-xlsx"; sourceHash: string; fileName: string; fileSize: number; sheetName: string; readAt: string };
type Action = "CREATE" | "UPDATE" | "UNCHANGED" | "CONFLICT" | "SKIP_INVALID";
type DurationUnit = "DAY" | "MONTH";

const SHEET_ID = "1RQMU9no_Q52i5Nt6HyVr7YUNbPLsd37PlhUgBjrRwyM";
const SHEET_NAME = "2HN và PTN (3)";
const clean = (value: unknown) => value instanceof Date ? value.toString() : String(value ?? "").replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
const canonical = (value: string) => clean(value).toLocaleLowerCase("vi-VN");
const strip = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
const emailFor = (value: string) => `${strip(clean(value)).toLowerCase().replace(/[^a-z0-9]/g, "")}@gmail.com`;
const hashFile = (buffer: Buffer) => crypto.createHash("sha256").update(buffer).digest("hex");

function parseDatePart(value: string): string | null {
  const iso = clean(value).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${String(Number(iso[2])).padStart(2, "0")}-${String(Number(iso[3])).padStart(2, "0")}`;
  const match = clean(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return null;
  let day = Number(match[1]);
  let month = Number(match[2]);
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  if (day <= 12 && month > 12) [day, month] = [month, day];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date.toISOString().slice(0, 10) : null;
}

function parseDate(raw: string) {
  const value = clean(raw);
  if (!value) return { startDate: undefined as Date | undefined, endDate: undefined as Date | undefined };
  const range = value.split(/\s*[-–]\s*/);
  if (range.length === 2) {
    const start = parseDatePart(range[0]);
    const end = parseDatePart(range[1]);
    if (start && end) return { startDate: new Date(`${start}T00:00:00.000Z`), endDate: new Date(`${end}T00:00:00.000Z`) };
    if (end && /^t?ừ?\s*T\d{1,2}\/\d{4}$/i.test(range[0].trim())) return { startDate: undefined, endDate: new Date(`${end}T00:00:00.000Z`) };
    if (end) return { startDate: undefined, endDate: new Date(`${end}T00:00:00.000Z`) };
  }
  const onlyDate = parseDatePart(value);
  return onlyDate ? { startDate: undefined, endDate: new Date(`${onlyDate}T00:00:00.000Z`) } : { startDate: undefined, endDate: undefined };
}

function parseMoney(raw: string) {
  const match = clean(raw).replace(/\s/g, "").match(/^[\d.,]+/);
  if (!match) return null;
  const digits = match[0].replace(/[.,]/g, "");
  return /^\d+$/.test(digits) ? digits : null;
}

function parseDuration(raw: string) {
  const match = clean(raw).match(/^(\d+)\s*(ngày|day|days|tháng|month|months)$/i);
  if (!match) return { value: null as number | null, unit: null as DurationUnit | null };
  const amount = Number(match[1]);
  if (!Number.isSafeInteger(amount) || amount <= 0) return { value: null, unit: null };
  return { value: amount, unit: /tháng|month/i.test(match[2]) ? "MONTH" as const : "DAY" as const };
}

function rowsFromMatrix(matrix: unknown[][]): Row[] {
  const headerIndex = matrix.findIndex((row) => row.some((cell) => canonical(clean(cell)) === "tên công trình"));
  if (headerIndex < 0) throw new Error("HEADER_NOT_FOUND");
  const headers = matrix[headerIndex].map((cell) => canonical(clean(cell)));
  const indexOf = (...names: string[]) => names.map((name) => headers.indexOf(canonical(name))).find((index) => index >= 0) ?? -1;
  const get = (row: unknown[], index: number) => index >= 0 ? clean(row[index]) : "";
  const nameIndex = indexOf("Tên công trình");
  const indexes = {
    area: 1,
    address: indexOf("Địa chỉ thi công"),
    investor: indexOf("Tên ban quản lý dự án"),
    officer: indexOf("Cán bộ ban phụ trách"),
    commander: indexOf("Tên chỉ huy trưởng"),
    engineer: indexOf("Kỹ thuật"),
    guard: indexOf("Bảo vệ"),
    value: indexOf("Giá trị công trình"),
    duration: indexOf("Số ngày thi công"),
    period: indexOf("thời gian thi công", "Thời gian thi công"),
    note: indexOf("Ghi chú"),
    status: indexOf("Trạng thái"),
  };
  return matrix.slice(headerIndex + 1).map((row, offset) => {
    const name = get(row, nameIndex);
    const filled = row.map((cell) => clean(cell)).filter(Boolean);
    const presentationRow = filled.length > 1 && filled.every((cell) => /^\d+$/.test(cell));
    const value = get(row, indexes.value);
    const unitMatch = value.match(/-\s*(.+)$/);
    return { sourceRow: headerIndex + offset + 2, area: get(row, indexes.area), name, address: get(row, indexes.address), investor: get(row, indexes.investor), officer: get(row, indexes.officer), commander: get(row, indexes.commander), engineer: get(row, indexes.engineer), guard: get(row, indexes.guard), value, duration: get(row, indexes.duration), period: get(row, indexes.period), note: get(row, indexes.note), unit: unitMatch?.[1]?.trim() ?? "", status: get(row, indexes.status) };
  }).filter((row) => row.name && !/^ngày$/i.test(row.name) && !row.name.match(/^\d+$/));
}

function workbookSource(buffer: Buffer, fileName: string, approved: boolean): Source {
  if (!approved) throw new Error("XLSX source requires --approve-source");
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, raw: true });
  const sheetName = workbook.SheetNames.find((name) => name === SHEET_NAME) ?? workbook.SheetNames.find((name) => {
    const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: true, defval: "" }) as unknown[][];
    return matrix.some((row) => row.some((cell) => canonical(clean(cell)) === "tên công trình"));
  });
  if (!sheetName) throw new Error("SHEET_NOT_FOUND");
  const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: true, defval: "" }) as unknown[][];
  return { rows: rowsFromMatrix(matrix), sourceVerified: true, sourceType: "approved-xlsx", sourceHash: hashFile(buffer), fileName, fileSize: buffer.length, sheetName, readAt: new Date().toISOString() };
}

async function readSource(): Promise<Source> {
  const args = new Map(process.argv.slice(2).filter((value) => value.startsWith("--")).map((value) => { const [key, ...rest] = value.slice(2).split("="); return [key, rest.join("=")]; }));
  const type = args.get("source") ?? "google";
  if (type === "xlsx") {
    const file = args.get("source-file");
    if (!file) throw new Error("--source-file is required");
    const buffer = fs.readFileSync(file);
    return workbookSource(buffer, path.basename(file), args.has("approve-source"));
  }
  if (type !== "google") throw new Error(`UNSUPPORTED_SOURCE:${type}`);
  const response = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx`);
  if (!response.ok) throw new Error(`GOOGLE_SOURCE_HTTP_${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const source = workbookSource(buffer, `google:${SHEET_ID}`, true);
  return { ...source, sourceType: "google", fileName: `google:${SHEET_ID}` };
}

function key(row: Row) {
  return crypto.createHash("sha256").update([SHEET_ID, SHEET_NAME, canonical(row.name), canonical(row.address), canonical(row.investor), canonical(row.unit)].join("\u001f")).digest("hex");
}

function metadata(row: Row, parsedValue: string | null) {
  return { spreadsheetId: SHEET_ID, sheetName: SHEET_NAME, rawPeriod: row.period || null, rawDuration: row.duration || null, area: row.area || null, officer: row.officer || null, engineer: row.engineer || null, guard: row.guard || null, sourceRow: row.sourceRow, unit: row.unit || null, rawValue: row.value || null, parsedValue: parsedValue ? Number(parsedValue) : null };
}

function statusFor(row: Row) {
  // User-approved business rule: all 21 source projects are in progress when no official status column exists.
  return "ACTIVE" as const;
}

function dateText(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "null";
}

function diff(project: any, row: Row, dates: ReturnType<typeof parseDate>, value: string | null) {
  const out: string[] = [];
  const duration = parseDuration(row.duration);
  if (String(project.name ?? "") !== row.name) out.push(`name: ${project.name ?? "null"} → ${row.name || "null"}`);
  if (String(project.location ?? "") !== row.address) out.push(`location: ${project.location ?? "null"} → ${row.address || "null"}`);
  if (String(project.investor ?? "") !== row.investor) out.push(`investor: ${project.investor ?? "null"} → ${row.investor || "null"}`);
  if ((project.budget == null && value != null) || (project.budget != null && value != null && String(project.budget) !== value)) out.push(`budget: ${project.budget ?? "null"} → ${value ?? "null"}`);
  if (dates.startDate && dateText(project.startDate) !== dateText(dates.startDate)) out.push(`startDate: ${dateText(project.startDate)} → ${dateText(dates.startDate)}`);
  if (dates.endDate && dateText(project.endDate) !== dateText(dates.endDate)) out.push(`endDate: ${dateText(project.endDate)} → ${dateText(dates.endDate)}`);
  if (project.status !== statusFor(row)) out.push(`status: ${project.status ?? "null"} → ${statusFor(row)}`);
  if (project.plannedDurationValue !== duration.value) out.push(`plannedDurationValue: ${project.plannedDurationValue ?? "null"} → ${duration.value ?? "null"}`);
  if (project.plannedDurationUnit !== duration.unit) out.push(`plannedDurationUnit: ${project.plannedDurationUnit ?? "null"} → ${duration.unit ?? "null"}`);
  if ((project.plannedDurationRaw ?? "") !== (row.duration || "")) out.push(`plannedDurationRaw: ${project.plannedDurationRaw ?? "null"} → ${row.duration || "null"}`);
  if (row.commander) {
    const commanders = (project.members ?? []).filter((member: any) => member.role === "CHIEF_COMMANDER").map((member: any) => canonical(member.user.name)).sort().join("|");
    if (commanders !== canonical(row.commander)) out.push(`commander: ${commanders || "null"} → ${canonical(row.commander)}`);
  }
  return out;
}

async function makePlan(source: Source) {
  const out: any[] = [];
  for (const row of source.rows) {
    if (!row.name) { out.push({ row, action: "SKIP_INVALID" as const, fieldDiff: [] }); continue; }
    const externalSourceKey = key(row);
    const parsedValue = parseMoney(row.value);
    const dates = parseDate(row.period);
    const select = { id: true, code: true, name: true, location: true, investor: true, budget: true, startDate: true, endDate: true, status: true, plannedDurationValue: true, plannedDurationUnit: true, plannedDurationRaw: true, externalSourceKey: true, members: { where: { deletedAt: null, isActive: true }, select: { role: true, user: { select: { name: true } } } } };
    const exact = await prisma.project.findMany({ where: { externalSourceKey }, select });
    const matches = exact.length ? exact : await prisma.project.findMany({ where: { name: row.name, location: row.address || null, investor: row.investor || null }, select });
    const action: Action = matches.length > 1 ? "CONFLICT" : matches.length === 0 ? "CREATE" : diff(matches[0], row, dates, parsedValue).length ? "UPDATE" : "UNCHANGED";
    out.push({ row, externalSourceKey, parsedValue, dates, action, project: matches[0], fieldDiff: matches.length === 1 ? diff(matches[0], row, dates, parsedValue) : [] });
  }
  return out;
}

async function nextCode(tx: any, reserved: Set<string>) {
  for (let number = 1; ; number += 1) {
    const code = `CT-2026-${String(number).padStart(4, "0")}`;
    if (!reserved.has(code) && !(await tx.project.findUnique({ where: { code }, select: { id: true } }))) { reserved.add(code); return code; }
  }
}

async function writeBackup(items: any[]) {
  const projectIds = items.map((item) => item.project?.id).filter(Boolean);
  const emails = [...new Set(items.map((item) => item.row.commander).filter(Boolean).map((name) => emailFor(name)))];
  const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true, name: true, role: true, isActive: true, deletedAt: true } });
  const projectMembers = await prisma.projectMember.findMany({ where: { projectId: { in: projectIds } }, select: { id: true, projectId: true, userId: true, role: true, isActive: true, deletedAt: true, assignedById: true } });
  fs.mkdirSync(path.join("docs", "import", "backups"), { recursive: true });
  const file = path.join("docs", "import", "backups", `real-projects-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify({ createdAt: new Date().toISOString(), projects: items.map((item) => item.project ?? null), users, projectMembers }, null, 2), "utf8");
  return file;
}

async function apply(items: any[], source: Source) {
  if (items.some((item) => item.action === "CONFLICT")) throw new Error("BLOCKER_CONFLICT_PRESENT");
  return prisma.$transaction(async (tx) => {
    const admin = await tx.user.findFirst({ where: { role: "ADMIN", isActive: true, deletedAt: null }, select: { id: true } });
    if (!admin) throw new Error("BLOCKER_NO_ACTIVE_ADMIN");
    const reserved = new Set<string>();
    const applied: any[] = [];
    for (const item of items) {
      if (item.action === "SKIP_INVALID" || item.action === "UNCHANGED") continue;
      const duration = parseDuration(item.row.duration);
      const projectData: any = { name: item.row.name, location: item.row.address || null, investor: item.row.investor || null, budget: item.parsedValue ?? undefined, status: statusFor(item.row), plannedDurationValue: duration.value, plannedDurationUnit: duration.unit, plannedDurationRaw: item.row.duration || null, externalSource: source.sourceType, externalSourceKey: item.externalSourceKey, sourceMetadata: metadata(item.row, item.parsedValue) };
      if (item.dates.startDate) projectData.startDate = item.dates.startDate;
      if (item.dates.endDate) projectData.endDate = item.dates.endDate;
      const project = item.project ? await tx.project.update({ where: { id: item.project.id }, data: projectData }) : await tx.project.create({ data: { ...projectData, code: await nextCode(tx, reserved) } });
      if (item.row.commander) {
        const email = emailFor(item.row.commander);
        const candidates = await tx.user.findMany({ where: { email }, select: { id: true, name: true, role: true, isActive: true, deletedAt: true } });
        if (candidates.length > 1 || (candidates[0] && canonical(candidates[0].name) !== canonical(item.row.commander))) throw new Error(`USER_CONFLICT:${email}`);
        const user = candidates[0] ?? await tx.user.create({ data: { email, name: item.row.commander, role: "CHIEF_COMMANDER", password: await bcrypt.hash("123456", 10) }, select: { id: true } });
        await tx.projectMember.upsert({ where: { projectId_userId: { projectId: project.id, userId: user.id } }, update: { role: "CHIEF_COMMANDER", isActive: true, deletedAt: null }, create: { projectId: project.id, userId: user.id, role: "CHIEF_COMMANDER", assignedById: admin.id } });
      }
      applied.push({ ...item, project });
    }
    return applied;
  });
}

function writeManifest(source: Source, items: any[]) {
  const manifest = { sourceHash: source.sourceHash, sourceType: source.sourceType, fileName: source.fileName, fileSize: source.fileSize, readAt: source.readAt, spreadsheetId: SHEET_ID, sheetName: source.sheetName, projects: items.map((item) => ({ name: item.row.name, externalSourceKey: item.externalSourceKey, action: item.action, projectId: item.project?.id ?? null, projectCode: item.project?.code ?? null, fieldDiff: item.fieldDiff })), commanders: [...new Set(source.rows.map((row) => row.commander).filter(Boolean))].map((name) => ({ name, email: emailFor(name) })), assignments: source.rows.filter((row) => row.commander).length };
  fs.mkdirSync(path.join("docs", "import", "backups"), { recursive: true });
  fs.writeFileSync(path.join("docs", "import", "real-projects-import-manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  return manifest;
}

async function main() {
  const applyMode = process.argv.includes("--apply");
  const source = await readSource();
  const items = await makePlan(source);
  if (!applyMode) {
    writeManifest(source, items);
    console.log(JSON.stringify({ sourceVerified: source.sourceVerified, sourceType: source.sourceType, sourceHash: source.sourceHash, validProjects: items.filter((item) => item.action !== "SKIP_INVALID").length, counts: Object.fromEntries(["CREATE", "UPDATE", "UNCHANGED", "CONFLICT", "SKIP_INVALID"].map((action) => [action, items.filter((item) => item.action === action).length])), commanders: new Set(source.rows.map((row) => row.commander).filter(Boolean)).size, assignments: source.rows.filter((row) => row.commander).length, fieldDiff: items.filter((item) => item.fieldDiff.length).map((item) => ({ code: item.project?.code ?? null, fieldDiff: item.fieldDiff })) }, null, 2));
    return;
  }
  const manifestPath = process.argv.find((value) => value.startsWith("--manifest="))?.slice("--manifest=".length) ?? path.join("docs", "import", "real-projects-import-manifest.json");
  if (!fs.existsSync(manifestPath)) throw new Error("BLOCKER_MANIFEST_REQUIRED");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.sourceHash !== source.sourceHash) throw new Error("BLOCKER_SOURCE_HASH_CHANGED");
  const backup = await writeBackup(items);
  const applied = await apply(items, source);
  console.log(JSON.stringify({ applied: true, sourceHash: source.sourceHash, count: applied.length, backup }, null, 2));
}

main().catch(async (error) => { console.error(error instanceof Error ? error.message : String(error)); await prisma.$disconnect(); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
