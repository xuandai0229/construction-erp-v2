import fs from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import {
  DATASET_ID,
  ID_PREFIX,
  MANIFEST_FILE_NAME,
  SEQUENCE_YEAR,
  STORAGE_RELATIVE_ROOT,
} from "./constants";
import {
  CREATED_ID_MODELS,
  type CreatedIdModel,
} from "./model-registry";
import type { DatasetFile, DatasetRows, SourceProject } from "./build-dataset";

export type DatasetManifest = {
  datasetId: string;
  database: string;
  createdAt: string;
  idPrefix: string;
  storageRelativeRoot: string;
  projects: Array<{ id: string; code: string; name: string }>;
  reusedTemplateIds: string[];
  createdCounts: Record<CreatedIdModel, number>;
  sequenceYears: {
    safetyPlan: number;
    safetyAssessment: number;
    employee: number;
  };
  files: Array<{ relativePath: string; size: number }>;
  preservedModels: ["Project", "SystemSetting"];
};

export function getStorageRoot(): string {
  return path.resolve(process.env.STORAGE_ROOT || path.join(process.cwd(), "storage"));
}

export function getDatasetStorageRoot(): string {
  const storageRoot = getStorageRoot();
  const datasetRoot = path.resolve(storageRoot, ...STORAGE_RELATIVE_ROOT.split("/"));
  const relative = path.relative(storageRoot, datasetRoot);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Đường dẫn storage dataset không an toàn: ${datasetRoot}`);
  }
  return datasetRoot;
}

export function getManifestPath(): string {
  return path.join(getDatasetStorageRoot(), MANIFEST_FILE_NAME);
}

export async function writeDatasetFiles(files: DatasetFile[]): Promise<void> {
  const storageRoot = getStorageRoot();
  const datasetRoot = getDatasetStorageRoot();
  await fs.mkdir(datasetRoot, { recursive: true });

  for (const file of files) {
    const absolutePath = path.resolve(storageRoot, ...file.relativePath.split("/"));
    const relativeToDataset = path.relative(datasetRoot, absolutePath);
    if (
      !relativeToDataset ||
      relativeToDataset.startsWith("..") ||
      path.isAbsolute(relativeToDataset)
    ) {
      throw new Error(`Từ chối ghi file ngoài thư mục dataset: ${file.relativePath}`);
    }
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, file.content);
  }
}

export async function writeManifest(input: {
  database: string;
  projects: SourceProject[];
  rows: DatasetRows;
  reusedTemplateIds: string[];
  files: DatasetFile[];
}): Promise<DatasetManifest> {
  const manifest: DatasetManifest = {
    datasetId: DATASET_ID,
    database: input.database,
    createdAt: new Date().toISOString(),
    idPrefix: ID_PREFIX,
    storageRelativeRoot: STORAGE_RELATIVE_ROOT,
    projects: input.projects.map(({ id, code, name }) => ({ id, code, name })),
    reusedTemplateIds: input.reusedTemplateIds,
    createdCounts: Object.fromEntries(
      CREATED_ID_MODELS.map((model) => [model, input.rows[model].length]),
    ) as Record<CreatedIdModel, number>,
    sequenceYears: {
      safetyPlan: SEQUENCE_YEAR,
      safetyAssessment: SEQUENCE_YEAR,
      employee: SEQUENCE_YEAR,
    },
    files: input.files.map((file) => ({
      relativePath: file.relativePath,
      size: file.content.length,
    })),
    preservedModels: ["Project", "SystemSetting"],
  };
  await fs.writeFile(getManifestPath(), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

export async function readManifest(): Promise<DatasetManifest | null> {
  try {
    const content = await fs.readFile(getManifestPath(), "utf8");
    const manifest = JSON.parse(content) as DatasetManifest;
    if (manifest.datasetId !== DATASET_ID || manifest.idPrefix !== ID_PREFIX) {
      throw new Error("Manifest không đúng dataset đang thao tác.");
    }
    return manifest;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw error;
  }
}

function quoteIdentifier(identifier: string): string {
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(identifier)) {
    throw new Error(`Tên bảng không hợp lệ: ${identifier}`);
  }
  return `"${identifier}"`;
}

export async function collectCreatedCounts(
  prisma: PrismaClient,
): Promise<Record<CreatedIdModel, number>> {
  const entries: Array<[CreatedIdModel, number]> = [];
  for (const model of CREATED_ID_MODELS) {
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count FROM ${quoteIdentifier(model)} WHERE "id" LIKE $1`,
      `${ID_PREFIX}%`,
    );
    entries.push([model, Number(result[0]?.count ?? 0)]);
  }
  return Object.fromEntries(entries) as Record<CreatedIdModel, number>;
}

export async function collectSequenceCounts(prisma: PrismaClient) {
  const [plan, assessment, employee] = await Promise.all([
    prisma.safetyReportPlanSequence.count({ where: { businessYear: SEQUENCE_YEAR } }),
    prisma.safetySelfAssessmentSequence.count({ where: { businessYear: SEQUENCE_YEAR } }),
    prisma.employeeCodeSequence.count({ where: { year: SEQUENCE_YEAR } }),
  ]);
  return { plan, assessment, employee };
}

export async function storageFilesExist(
  manifest: DatasetManifest,
): Promise<{ missing: string[]; wrongSize: string[] }> {
  const storageRoot = getStorageRoot();
  const missing: string[] = [];
  const wrongSize: string[] = [];
  for (const file of manifest.files) {
    const absolutePath = path.resolve(storageRoot, ...file.relativePath.split("/"));
    try {
      const stat = await fs.stat(absolutePath);
      if (stat.size !== file.size) wrongSize.push(file.relativePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        missing.push(file.relativePath);
      } else {
        throw error;
      }
    }
  }
  return { missing, wrongSize };
}

