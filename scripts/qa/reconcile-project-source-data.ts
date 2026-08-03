import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import prisma from "../../src/lib/prisma";

const SPREADSHEET_ID = "1RQMU9no_Q52i5Nt6HyVr7YUNbPLsd37PlhUgBjrRwyM";
const DEFAULT_SHEET = "2HN và PTN (3)";
const OLD_HASHES = [
  "62eaea7de404a62a131e9992444b36a23cf9e3707afaf0a1464d5c65630d6c51",
  "b6b1bba3c1859796e98224d8565bf1ac643599219a7c064d5ab5f14af963c2ae",
];
const EXCLUDED_DIRS = new Set(["node_modules", ".next", "dist", "build", "coverage", "artifacts", ".git"]);

type DurationUnit = "DAY" | "MONTH";
type Cell = string | number | boolean | Date | null | undefined;
type ParsedPeriod = { startDate: string | null; endDate: string | null; rawPeriod: string | null; parseNote?: string };
type SourceRow = {
  sourceRow: number;
  name: string;
  address: string;
  investor: string;
  officer: string;
  commander: string;
  engineer: string;
  guard: string;
  valueRaw: string;
  budget: string | null;
  durationRaw: string;
  durationValue: number | null;
  durationUnit: DurationUnit | null;
  periodRaw: string;
  startDate: string | null;
  endDate: string | null;
  note: string;
  unit: string;
  status: "ACTIVE";
  externalSourceKey: string;
};
type WorkbookInfo = {
  file: string;
  fileName: string;
  size: number;
  modifiedAt: string;
  sha256: string;
  sheetName: string | null;
  sheetCount: number;
  rowCount: number | null;
  columnCount: number | null;
  headerFound: boolean;
  hasProjectNameColumn: boolean;
  hasCommanderColumn: boolean;
  hasDurationColumn: boolean;
  relevant: boolean;
  rows?: SourceRow[];
};

const clean = (value: Cell): string => {
  if (value instanceof Date) return value.toString();
  return String(value ?? "").replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
};
const nonEmpty = (value: string): string | null => (value ? value : null);
const canonical = (value: string): string => clean(value).toLocaleLowerCase("vi-VN");
const sha256 = (buffer: Buffer) => crypto.createHash("sha256").update(buffer).digest("hex");
const dateOnly = (date: Date) => date.toISOString().slice(0, 10);

function parseDatePart(raw: string): string | null {
  const value = clean(raw);
  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${String(Number(iso[2])).padStart(2, "0")}-${String(Number(iso[3])).padStart(2, "0")}`;
  const slash = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!slash) return null;
  let first = Number(slash[1]);
  let second = Number(slash[2]);
  const year = Number(slash[3].length === 2 ? `20${slash[3]}` : slash[3]);
  // Full project periods are day/month/year. A lone Excel display such as 12/31/30 is month/day/year.
  if (first <= 12 && second > 12) [first, second] = [second, first];
  if (first < 1 || first > 31 || second < 1 || second > 12 || year < 1900) return null;
  const candidate = new Date(Date.UTC(year, second - 1, first));
  return candidate.getUTCFullYear() === year && candidate.getUTCMonth() === second - 1 && candidate.getUTCDate() === first ? dateOnly(candidate) : null;
}

function parsePeriod(value: Cell): ParsedPeriod {
  const raw = clean(value);
  if (!raw) return { startDate: null, endDate: null, rawPeriod: null };
  const range = raw.split(/\s*[-–]\s*/);
  if (range.length === 2) {
    const start = parseDatePart(range[0]);
    const end = parseDatePart(range[1]);
    const startIsMonthOnly = /^t?ừ?\s*T\d{1,2}\/\d{4}$/i.test(range[0].trim());
    if (start && end) return { startDate: start, endDate: end, rawPeriod: raw };
    if (end && startIsMonthOnly) return { startDate: null, endDate: end, rawPeriod: raw, parseNote: "month-only start preserved without synthetic date" };
    if (end) return { startDate: null, endDate: end, rawPeriod: raw, parseNote: "only end date is known" };
    return { startDate: null, endDate: null, rawPeriod: raw, parseNote: "unparsed period preserved" };
  }
  const onlyDate = parseDatePart(raw);
  return onlyDate ? { startDate: null, endDate: onlyDate, rawPeriod: raw, parseNote: "single date treated as end date" } : { startDate: null, endDate: null, rawPeriod: raw, parseNote: "unparsed period preserved" };
}

function parseMoney(value: string): string | null {
  const match = clean(value).match(/^[\d.,]+/);
  if (!match) return null;
  const digits = match[0].replace(/[.,]/g, "");
  return /^\d+$/.test(digits) ? digits : null;
}

function parseDuration(value: string): { value: number | null; unit: DurationUnit | null } {
  const raw = clean(value);
  const match = raw.match(/^(\d+)\s*(ngày|day|days|tháng|month|months)$/i);
  if (!match) return { value: null, unit: null };
  const amount = Number(match[1]);
  if (!Number.isSafeInteger(amount) || amount <= 0) return { value: null, unit: null };
  return { value: amount, unit: /tháng|month/i.test(match[2]) ? "MONTH" : "DAY" };
}

function sourceKey(row: Omit<SourceRow, "externalSourceKey">): string {
  return crypto.createHash("sha256").update([
    SPREADSHEET_ID,
    row.periodRaw ? DEFAULT_SHEET : DEFAULT_SHEET,
    canonical(row.name),
    canonical(row.address),
    canonical(row.investor),
    canonical(row.unit),
  ].join("\u001f")).digest("hex");
}

function findHeader(matrix: Cell[][]): number {
  return matrix.findIndex((row) => row.some((cell) => canonical(clean(cell)) === "tên công trình"));
}

function readRows(buffer: Buffer, fileName: string, requestedSheet = DEFAULT_SHEET): WorkbookInfo {
  const stat = fs.statSync(fileName);
  const workbook = XLSX.read(buffer, { type: "buffer", raw: true, cellDates: true });
  const sheetName = workbook.SheetNames.find((name) => name === requestedSheet) ?? workbook.SheetNames.find((name) => {
    const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: true, defval: "" }) as Cell[][];
    return findHeader(matrix) >= 0;
  }) ?? null;
  if (!sheetName) return { file: fileName, fileName: path.basename(fileName), size: stat.size, modifiedAt: stat.mtime.toISOString(), sha256: sha256(buffer), sheetName: null, sheetCount: workbook.SheetNames.length, rowCount: null, columnCount: null, headerFound: false, hasProjectNameColumn: false, hasCommanderColumn: false, hasDurationColumn: false, relevant: false };
  const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: true, defval: "" }) as Cell[][];
  const headerIndex = findHeader(matrix);
  if (headerIndex < 0) return { file: fileName, fileName: path.basename(fileName), size: stat.size, modifiedAt: stat.mtime.toISOString(), sha256: sha256(buffer), sheetName, sheetCount: workbook.SheetNames.length, rowCount: matrix.length, columnCount: Math.max(0, ...matrix.map((row) => row.length)), headerFound: false, hasProjectNameColumn: false, hasCommanderColumn: false, hasDurationColumn: false, relevant: false };
  const headers = matrix[headerIndex].map((cell) => canonical(clean(cell)));
  const indexOf = (...names: string[]) => names.map((name) => headers.indexOf(canonical(name))).find((index) => index >= 0) ?? -1;
  const nameIndex = indexOf("Tên công trình");
  const commanderIndex = indexOf("Tên chỉ huy trưởng");
  const durationIndex = indexOf("Số ngày thi công");
  const addressIndex = indexOf("Địa chỉ thi công");
  const investorIndex = indexOf("Tên ban quản lý dự án");
  const officerIndex = indexOf("Cán bộ ban phụ trách");
  const engineerIndex = indexOf("Kỹ thuật");
  const guardIndex = indexOf("Bảo vệ");
  const valueIndex = indexOf("Giá trị công trình");
  const periodIndex = indexOf("thời gian thi công", "Thời gian thi công");
  const noteIndex = indexOf("Ghi chú");
  const rows: SourceRow[] = [];
  for (let matrixIndex = headerIndex + 1; matrixIndex < matrix.length; matrixIndex += 1) {
    const row = matrix[matrixIndex];
    const get = (index: number) => index >= 0 ? clean(row[index]) : "";
    const name = get(nameIndex);
    const filled = row.map((cell) => clean(cell)).filter(Boolean);
    const presentationRow = filled.length > 1 && filled.every((cell) => /^\d+$/.test(cell));
    if (!name || presentationRow || /^ngày$/i.test(name)) continue;
    const valueRaw = get(valueIndex);
    const unitMatch = valueRaw.match(/-\s*(.+)$/);
    const durationRaw = get(durationIndex);
    const period = parsePeriod(row[periodIndex]);
    const duration = parseDuration(durationRaw);
    const draft: Omit<SourceRow, "externalSourceKey"> = {
      sourceRow: matrixIndex + 1,
      name,
      address: get(addressIndex),
      investor: get(investorIndex),
      officer: get(officerIndex),
      commander: get(commanderIndex),
      engineer: get(engineerIndex),
      guard: get(guardIndex),
      valueRaw,
      budget: parseMoney(valueRaw),
      durationRaw,
      durationValue: duration.value,
      durationUnit: duration.unit,
      periodRaw: period.rawPeriod ?? "",
      startDate: period.startDate,
      endDate: period.endDate,
      note: get(noteIndex),
      unit: unitMatch?.[1]?.trim() ?? "",
      status: "ACTIVE",
    };
    rows.push({ ...draft, externalSourceKey: sourceKey(draft) });
  }
  return { file: fileName, fileName: path.basename(fileName), size: stat.size, modifiedAt: stat.mtime.toISOString(), sha256: sha256(buffer), sheetName, sheetCount: workbook.SheetNames.length, rowCount: matrix.length, columnCount: Math.max(0, ...matrix.map((row) => row.length)), headerFound: true, hasProjectNameColumn: nameIndex >= 0, hasCommanderColumn: commanderIndex >= 0, hasDurationColumn: durationIndex >= 0, relevant: nameIndex >= 0 && commanderIndex >= 0 && durationIndex >= 0, rows };
}

function discoverFiles(roots: string[]): string[] {
  const files: string[] = [];
  const visit = (directory: string) => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith("~$")) continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.has(entry.name)) visit(full);
      } else if (/\.(xlsx|xls|csv)$/i.test(entry.name)) files.push(full);
    }
  };
  roots.forEach(visit);
  return [...new Set(files)].sort();
}

function argument(name: string): string | undefined {
  const prefix = `--${name}=`;
  const value = process.argv.find((item) => item.startsWith(prefix));
  return value?.slice(prefix.length);
}

function mdCell(value: unknown): string {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function fingerprint(rows: SourceRow[]): string {
  return sha256(Buffer.from(JSON.stringify(rows.map((row) => ({ ...row, sourceRow: undefined })).sort((a, b) => a.externalSourceKey.localeCompare(b.externalSourceKey)))));
}

function rowComparable(row: SourceRow) {
  return {
    name: row.name,
    address: row.address,
    investor: row.investor,
    officer: row.officer,
    commander: row.commander,
    engineer: row.engineer,
    guard: row.guard,
    budget: row.budget,
    durationRaw: row.durationRaw,
    durationValue: row.durationValue,
    durationUnit: row.durationUnit,
    periodRaw: row.periodRaw,
    startDate: row.startDate,
    endDate: row.endDate,
    note: row.note,
    unit: row.unit,
    status: row.status,
  };
}

function databaseCommander(project: any): string {
  return project.members
    .filter((member: any) => member.role === "CHIEF_COMMANDER")
    .map((member: any) => clean(member.user.name))
    .sort()
    .join("|");
}

function databaseComparable(project: any): Record<string, unknown> {
  const metadata = project.sourceMetadata && typeof project.sourceMetadata === "object" ? project.sourceMetadata as Record<string, unknown> : {};
  const stringMeta = (key: string) => clean(metadata[key] as Cell);
  return {
    name: clean(project.name),
    address: clean(project.location as Cell),
    investor: clean(project.investor as Cell),
    officer: stringMeta("officer"),
    commander: databaseCommander(project),
    engineer: stringMeta("engineer"),
    guard: stringMeta("guard"),
    budget: project.budget == null ? null : String(project.budget),
    durationRaw: clean(project.plannedDurationRaw as Cell),
    durationValue: project.plannedDurationValue,
    durationUnit: project.plannedDurationUnit,
    periodRaw: stringMeta("rawPeriod"),
    startDate: project.startDate ? dateOnly(new Date(project.startDate)) : null,
    endDate: project.endDate ? dateOnly(new Date(project.endDate)) : null,
    note: stringMeta("note"),
    unit: stringMeta("unit"),
    status: project.status,
  };
}

function sourceComparableFromDatabase(project: any): SourceRow {
  const metadata = project.sourceMetadata && typeof project.sourceMetadata === "object" ? project.sourceMetadata as Record<string, unknown> : {};
  const valueRaw = clean(metadata.rawValue as Cell);
  const draft: Omit<SourceRow, "externalSourceKey"> = {
    sourceRow: Number(metadata.sourceRow ?? 0),
    name: clean(project.name),
    address: clean(project.location as Cell),
    investor: clean(project.investor as Cell),
    officer: clean(metadata.officer as Cell),
    commander: databaseCommander(project),
    engineer: clean(metadata.engineer as Cell),
    guard: clean(metadata.guard as Cell),
    valueRaw,
    budget: project.budget == null ? null : String(project.budget),
    durationRaw: clean(project.plannedDurationRaw as Cell),
    durationValue: project.plannedDurationValue,
    durationUnit: project.plannedDurationUnit,
    periodRaw: clean(metadata.rawPeriod as Cell),
    startDate: project.startDate ? dateOnly(new Date(project.startDate)) : null,
    endDate: project.endDate ? dateOnly(new Date(project.endDate)) : null,
    note: clean(metadata.note as Cell),
    unit: clean(metadata.unit as Cell),
    status: project.status,
  };
  return { ...draft, externalSourceKey: String(project.externalSourceKey) };
}

async function readGoogle(sheetName: string): Promise<{ status: string; info?: WorkbookInfo; error?: string }> {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=xlsx`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) return { status: "GOOGLE_HTTP_ERROR", error: `HTTP ${response.status}` };
    const buffer = Buffer.from(await response.arrayBuffer());
    const temp = path.join(process.cwd(), ".tmp-google-source.xlsx");
    fs.writeFileSync(temp, buffer);
    const info = readRows(buffer, temp, sheetName);
    fs.rmSync(temp, { force: true });
    return { status: info.relevant ? "VERIFIED" : "GOOGLE_SHEET_STRUCTURE_MISMATCH", info: { ...info, file: `google:${SPREADSHEET_ID}` } };
  } catch (error) {
    return { status: "GOOGLE_NETWORK_BLOCKED", error: error instanceof Error ? error.message : String(error) };
  }
}

async function main() {
  const explicitExcel = argument("excel");
  const sheetName = argument("sheet") ?? DEFAULT_SHEET;
  const scanRoots = [process.cwd(), ...(argument("scan-root") ? [argument("scan-root")!] : [])];
  const discovered = explicitExcel ? [...new Set([explicitExcel, ...discoverFiles(scanRoots)])] : discoverFiles(scanRoots);
  const workbookInfos = discovered.filter((file) => fs.existsSync(file)).map((file) => {
    const buffer = fs.readFileSync(file);
    return readRows(buffer, file, sheetName);
  });
  const relevant = workbookInfos.filter((info) => info.relevant);
  if (relevant.length !== 1) {
    const result = { status: relevant.length === 0 ? "SOURCE_FILE_NOT_FOUND" : "AMBIGUOUS_SOURCE", discovered: workbookInfos.map(({ rows: _rows, ...info }) => info), relevant: relevant.map(({ rows: _rows, ...info }) => info) };
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = 2;
    return;
  }
  const excel = relevant[0];
  const manifestPath = argument("manifest") ?? path.join(process.cwd(), "docs", "import", "real-projects-import-manifest.json");
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : null;
  const google = await readGoogle(sheetName);
  const projects = await prisma.project.findMany({
    where: { externalSourceKey: { not: null } },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true, location: true, investor: true, status: true, startDate: true, endDate: true, budget: true, plannedDurationValue: true, plannedDurationUnit: true, plannedDurationRaw: true, externalSourceKey: true, sourceMetadata: true, members: { where: { deletedAt: null, isActive: true }, select: { userId: true, role: true, user: { select: { id: true, name: true, email: true, role: true } } } } },
  });
  const excelRows = excel.rows ?? [];
  const googleRows = google.info?.rows ?? [];
  const excelByKey = new Map(excelRows.map((row) => [row.externalSourceKey, row]));
  const googleByKey = new Map(googleRows.map((row) => [row.externalSourceKey, row]));
  const dbByKey = new Map(projects.map((project) => [String(project.externalSourceKey), project]));
  const manifestByKey = new Map((manifest?.projects ?? []).map((project: any) => [String(project.externalSourceKey), project]));
  const duplicateExcelKeys = [...new Set(excelRows.filter((row, index) => excelRows.findIndex((candidate) => candidate.externalSourceKey === row.externalSourceKey) !== index).map((row) => row.externalSourceKey))];
  const duplicateDbKeys = projects.map((project) => project.externalSourceKey).filter((key, index, all) => all.indexOf(key) !== index);
  const allKeys = [...new Set([...excelByKey.keys(), ...googleByKey.keys(), ...manifestByKey.keys(), ...dbByKey.keys()])];
  const projectComparisons = allKeys.sort().map((key) => {
    const excelRow = excelByKey.get(key);
    const googleRow = googleByKey.get(key);
    const dbProject = dbByKey.get(key);
    const manifestProject = manifestByKey.get(key);
    const excelVsDbDiff: string[] = [];
    if (excelRow && dbProject) {
      const expected = rowComparable(excelRow);
      const actual = databaseComparable(dbProject);
      for (const field of Object.keys(expected)) if (JSON.stringify(expected[field as keyof typeof expected]) !== JSON.stringify(actual[field])) excelVsDbDiff.push(`${field}: ${String(actual[field] ?? "null")} → ${String(expected[field as keyof typeof expected] ?? "null")}`);
    }
    const excelVsGoogleDiff: string[] = [];
    if (excelRow && googleRow) {
      const left = rowComparable(excelRow);
      const right = rowComparable(googleRow);
      for (const field of Object.keys(left)) if (JSON.stringify(left[field as keyof typeof left]) !== JSON.stringify(right[field])) excelVsGoogleDiff.push(`${field}: Excel=${String(left[field as keyof typeof left] ?? "null")} / Google=${String(right[field] ?? "null")}`);
    }
    const conclusion = duplicateExcelKeys.includes(key) || duplicateDbKeys.includes(key) ? "DUPLICATE" : !excelRow ? "MISSING_IN_EXCEL" : google.status === "VERIFIED" && !googleRow ? "MISSING_IN_GOOGLE" : !manifestProject ? "MANIFEST_DRIFT" : !dbProject ? "MISSING_IN_DATABASE" : excelVsDbDiff.length ? "DATABASE_DRIFT" : excelVsGoogleDiff.length ? "SOURCE_MISMATCH" : "EXACT_MATCH";
    return { externalSourceKey: key, code: dbProject?.code ?? manifestProject?.projectCode ?? null, name: excelRow?.name ?? dbProject?.name ?? manifestProject?.name ?? null, excel: excelRow ? rowComparable(excelRow) : null, google: googleRow ? rowComparable(googleRow) : google.status, manifest: manifestProject ? { projectId: manifestProject.projectId, projectCode: manifestProject.projectCode, action: manifestProject.action, fieldDiff: manifestProject.fieldDiff ?? [] } : null, database: dbProject ? { projectId: dbProject.id, projectCode: dbProject.code, ...databaseComparable(dbProject) } : null, fieldDiff: [...excelVsDbDiff, ...excelVsGoogleDiff], conclusion };
  });
  const commanderNames = [...new Set(excelRows.map((row) => row.commander).filter(Boolean))];
  const users = await prisma.user.findMany({ where: { email: { in: commanderNames.map((name) => `${canonical(name).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^a-z0-9]/gi, "")}@gmail.com`) } }, select: { id: true, name: true, email: true, role: true, isActive: true, deletedAt: true, projectMembers: { where: { deletedAt: null, isActive: true, project: { externalSourceKey: { not: null } } }, select: { projectId: true, role: true } } } });
  const assignments = projects.flatMap((project) => project.members.filter((member: any) => member.role === "CHIEF_COMMANDER").map((member: any) => ({ projectId: project.id, projectCode: project.code, projectName: project.name, userId: member.user.id, userName: member.user.name, email: member.user.email, role: member.role })));
  const counts = { excelProjects: excelRows.length, googleProjects: google.status === "VERIFIED" ? googleRows.length : null, manifestProjects: manifest?.projects?.length ?? 0, databaseSourceProjects: projects.length, commanders: commanderNames.length, assignments: assignments.length, projectsWithoutCommander: excelRows.filter((row) => !row.commander).length, projectsWithDuration: excelRows.filter((row) => row.durationValue != null).length, projectsWithFullDates: excelRows.filter((row) => row.startDate && row.endDate).length, projectsMissingDates: excelRows.filter((row) => !row.startDate || !row.endDate).length, projectsWithExecutionUnit: excelRows.filter((row) => row.unit).length, duplicateProjectNames: Object.values(Object.groupBy(excelRows, (row) => canonical(row.name))).filter((group) => (group?.length ?? 0) > 1).length };
  const dataFingerprints = { excel: fingerprint(excelRows), databaseMetadata: fingerprint(projects.map(sourceComparableFromDatabase)), google: google.status === "VERIFIED" ? fingerprint(googleRows) : null };
  const sourceBinaryState = OLD_HASHES.includes(excel.sha256) ? "SAME_FILE" : dataFingerprints.excel === dataFingerprints.databaseMetadata ? "SAME_DATA_DIFFERENT_BINARY" : "CONTENT_CHANGED";
  const mismatchCount = projectComparisons.filter((item) => !["EXACT_MATCH"].includes(item.conclusion)).length;
  const conclusion = google.status !== "VERIFIED" ? "SOURCE RECONCILIATION BLOCKED — GOOGLE NETWORK UNAVAILABLE" : mismatchCount ? "SOURCE RECONCILIATION FAIL — DATABASE MUTATION BLOCKED" : "SOURCE RECONCILIATION PASS";
  const result = { generatedAt: new Date().toISOString(), source: { spreadsheetId: SPREADSHEET_ID, sheetName, sourceBinaryState, excel: { ...excel, rows: undefined }, oldHashes: OLD_HASHES, oldHashFilesLocated: OLD_HASHES.map((hash) => workbookInfos.filter((info) => info.sha256 === hash).map((info) => info.file)), google }, counts, dataFingerprints, commanderUsers: users, assignments, duplicateKeys: { excel: duplicateExcelKeys, database: duplicateDbKeys }, projects: projectComparisons, conclusion };
  fs.mkdirSync(path.join(process.cwd(), "docs", "qa"), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), "docs", "qa", "excel-google-database-diff.json"), JSON.stringify(result, null, 2), "utf8");
  const report = [
    "# Excel ↔ Google Sheet ↔ Manifest ↔ Database Reconciliation",
    "",
    `Generated: ${result.generatedAt}`,
    `Conclusion: **${conclusion}**`,
    "",
    "## 1. Source inventory",
    "",
    "| STT | File | Size | Modified | SHA-256 | Sheets | Target sheet | Header | Relevant |",
    "|---:|---|---:|---|---|---:|---|---|---|",
    ...workbookInfos.map((info, index) => `| ${index + 1} | ${mdCell(info.file)} | ${info.size} | ${info.modifiedAt} | \`${info.sha256}\` | ${info.sheetCount} | ${mdCell(info.sheetName)} | ${info.headerFound ? "YES" : "NO"} | ${info.relevant ? "YES" : "NO"} |`),
    "",
    `Selected file: **${excel.file}** because it is the only workbook with the approved sheet/header structure. Current SHA-256: \`${excel.sha256}\`.`,
    `Previous hashes checked: \`${OLD_HASHES.join("\`, \`") }\`. No file currently present has either previous hash. Canonical data fingerprint: **${sourceBinaryState}**.`,
    "",
    "## 2. Structure and counts",
    "",
    "| Metric | Value |",
    "|---|---:|",
    ...Object.entries(counts).map(([key, value]) => `| ${key} | ${value ?? "BLOCKED"} |`),
    "",
    `Excel fingerprint: \`${dataFingerprints.excel}\``,
    `Database metadata fingerprint: \`${dataFingerprints.databaseMetadata}\``,
    `Google fingerprint: ${dataFingerprints.google ? `\`${dataFingerprints.google}\`` : "BLOCKED"}`,
    "",
    "## 3. Project comparison",
    "",
    "| Code | Name | Conclusion | Field diff | Excel | Google | Manifest | Database |",
    "|---|---|---|---|---|---|---|---|",
    ...projectComparisons.map((item) => `| ${mdCell(item.code)} | ${mdCell(item.name)} | **${item.conclusion}** | ${mdCell(item.fieldDiff.join("; "))} | ${item.excel ? "present" : "missing"} | ${typeof item.google === "string" ? item.google : item.google ? "present" : "missing"} | ${item.manifest ? `${item.manifest.projectCode ?? ""} / ${item.manifest.action ?? ""}` : "missing"} | ${item.database ? `${item.database.projectCode} / ${item.database.projectId}` : "missing"} |`),
    "",
    "## 4. Đại Mỗ validation",
    "",
    ...projectComparisons.filter((item) => item.code === "CT-2026-0017" || item.code === "CT-2026-0018").map((item) => `- ${item.code}: projectId=${item.database?.projectId ?? "missing"}; externalSourceKey=${item.externalSourceKey}; budget=${item.excel?.budget ?? "null"}; unit=${item.excel?.unit ?? "null"}; conclusion=${item.conclusion}`),
    "",
    "## 5. Commanders and assignments",
    "",
    `Commander names in Excel: ${commanderNames.length}; database assignment rows: ${assignments.length}.`,
    ...commanderNames.map((name) => `- ${name}: ${users.find((user) => canonical(user.name) === canonical(name))?.email ?? "not found"}`),
    "",
    "## 6. Database mutation decision",
    "",
    google.status === "VERIFIED" && mismatchCount === 0 ? "All four sources reconcile; no database mutation was executed." : "No database mutation was executed by this reconciliation dry-run. Any unresolved source mismatch or unavailable Google source blocks mutation.",
    "",
    `Google status: **${google.status}**${google.error ? ` (${google.error})` : ""}.`,
    "",
    "Machine-readable detail: `docs/qa/excel-google-database-diff.json`.",
  ].join("\n");
  fs.writeFileSync(path.join(process.cwd(), "docs", "qa", "EXCEL_GOOGLE_MANIFEST_DATABASE_RECONCILIATION.md"), report, "utf8");
  console.log(JSON.stringify({ sourceBinaryState, googleStatus: google.status, counts, mismatchCount, conclusion, report: "docs/qa/EXCEL_GOOGLE_MANIFEST_DATABASE_RECONCILIATION.md", diff: "docs/qa/excel-google-database-diff.json" }, null, 2));
  if (conclusion.includes("FAIL")) process.exitCode = 2;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
