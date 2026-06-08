import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';

const STORAGE_ROOT = process.env.STORAGE_ROOT || path.join(process.cwd(), 'storage');

export function validateSafePath(inputPath: string): boolean {
  if (!inputPath) return false;
  // Prevent directory traversal attacks
  if (inputPath.includes('..') || inputPath.includes('\0')) {
    return false;
  }
  return true;
}

export function sanitizeFileName(name: string): string {
  if (!name) return 'unnamed_file';
  // Replace invalid characters with underscore, keep alphanumeric, dots, dashes, underscores
  return name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

export function createStoredFileName(originalName: string): string {
  const sanitized = sanitizeFileName(originalName);
  const ext = path.extname(sanitized);
  const base = path.basename(sanitized, ext);
  const timestamp = Date.now();
  const uuid = randomUUID().split('-')[0];
  return `${base}_${timestamp}_${uuid}${ext}`;
}

export function getProjectStorageRoot(projectCode: string): string {
  if (!validateSafePath(projectCode)) throw new Error('Invalid project code');
  return path.join(STORAGE_ROOT, 'projects', projectCode);
}

export function resolveDocumentStoragePath(projectCode: string, folderId: string, storedName: string): string {
  if (!validateSafePath(projectCode) || !validateSafePath(folderId) || !validateSafePath(storedName)) {
    throw new Error('Invalid path parameters');
  }
  return path.join(getProjectStorageRoot(projectCode), 'documents', folderId, storedName);
}

export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch (error) {
    await fs.mkdir(dirPath, { recursive: true });
  }
}
