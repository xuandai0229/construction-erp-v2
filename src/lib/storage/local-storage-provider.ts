import path from 'path';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { DocumentStorageProvider, SaveFileInput, StoredFileResult } from './types';

const STORAGE_ROOT = process.env.STORAGE_ROOT || path.join(/*turbopackIgnore: true*/ process.cwd(), 'storage');

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

export class LocalStorageProvider implements DocumentStorageProvider {
  async saveFile(input: SaveFileInput): Promise<StoredFileResult> {
    const { buffer, projectCode, folderId, originalName } = input;
    
    if (!validateSafePath(projectCode) || !validateSafePath(folderId)) {
      throw new Error('Invalid path parameters');
    }

    const storedName = createStoredFileName(originalName);
    const relativePath = path.join('projects', projectCode, 'documents', folderId, storedName);
    const absolutePath = path.join(STORAGE_ROOT, relativePath);

    // Verify the absolutePath does not escape STORAGE_ROOT
    if (!absolutePath.startsWith(STORAGE_ROOT)) {
      throw new Error('Path traversal detected');
    }

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, buffer);

    return {
      provider: "LOCAL",
      objectKey: relativePath.replace(/\\/g, '/'), // normalize for cross-platform DB storage
      storagePath: absolutePath, // We return this to support DB schema without migration
      size: buffer.length
    };
  }

  private resolvePath(objectKeyOrPath: string): string {
    let absolutePath = objectKeyOrPath;
    if (!path.isAbsolute(objectKeyOrPath)) {
      absolutePath = path.join(STORAGE_ROOT, objectKeyOrPath);
    }
    
    // Safety check
    if (!absolutePath.startsWith(STORAGE_ROOT)) {
      throw new Error('Path traversal detected');
    }
    return absolutePath;
  }

  async readFile(objectKeyOrPath: string): Promise<Buffer> {
    const absolutePath = this.resolvePath(objectKeyOrPath);
    return fs.readFile(absolutePath);
  }

  async deleteFile(objectKeyOrPath: string): Promise<void> {
    const absolutePath = this.resolvePath(objectKeyOrPath);
    const fileExists = await this.exists(absolutePath);
    if (fileExists) {
      await fs.unlink(absolutePath);
    }
  }

  async exists(objectKeyOrPath: string): Promise<boolean> {
    try {
      const absolutePath = this.resolvePath(objectKeyOrPath);
      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }
}
