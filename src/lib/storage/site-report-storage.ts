import path from "path";
import { createReadStream } from "fs";
import { promises as fs } from "fs";
import { storageProvider } from "./index";

const REPORT_STORAGE_PROJECT = "site-reports";

function normalizeRelativePath(storagePath: string) {
  return storagePath.replace(/\\/g, "/").replace(/^\.\//, "");
}

function isLegacyReportPath(storagePath: string) {
  return normalizeRelativePath(storagePath).startsWith("storage/site-reports/");
}

function toProviderKey(storagePath: string) {
  const normalized = normalizeRelativePath(storagePath);
  return normalized.startsWith("storage/") ? normalized.slice("storage/".length) : normalized;
}

function resolveLegacyPath(storagePath: string) {
  const normalized = normalizeRelativePath(storagePath);
  if (!isLegacyReportPath(normalized) || normalized.includes("..") || path.isAbsolute(normalized)) {
    throw new Error("Invalid legacy report storage path");
  }

  const root = path.resolve(/* turbopackIgnore: true */ process.cwd());
  const target = path.resolve(/* turbopackIgnore: true */ root, normalized);
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Legacy report storage path escapes application root");
  }
  return target;
}

export async function saveSiteReportAttachment(input: {
  stream: NodeJS.ReadableStream;
  projectId: string;
  reportId: string;
  originalName: string;
}) {
  return storageProvider.saveFile({
    stream: input.stream,
    projectId: input.projectId,
    projectCode: REPORT_STORAGE_PROJECT,
    folderId: input.reportId,
    originalName: input.originalName,
  });
}

export async function siteReportAttachmentExists(storagePath: string) {
  const providerKey = toProviderKey(storagePath);
  if (await storageProvider.exists(providerKey)) return true;

  if (isLegacyReportPath(storagePath)) {
    try {
      await fs.access(resolveLegacyPath(storagePath));
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export async function readSiteReportAttachmentStream(storagePath: string): Promise<NodeJS.ReadableStream> {
  const providerKey = toProviderKey(storagePath);
  if (await storageProvider.exists(providerKey)) {
    return storageProvider.readFileStream(providerKey);
  }

  if (isLegacyReportPath(storagePath)) {
    const legacyPath = resolveLegacyPath(storagePath);
    await fs.access(legacyPath);
    return createReadStream(legacyPath);
  }

  throw new Error("Report attachment not found");
}

export async function deleteSiteReportAttachment(storagePath: string) {
  const providerKey = toProviderKey(storagePath);
  if (await storageProvider.exists(providerKey)) {
    await storageProvider.deleteFile(providerKey);
    return;
  }

  if (isLegacyReportPath(storagePath)) {
    await fs.unlink(resolveLegacyPath(storagePath)).catch(() => undefined);
  }
}
