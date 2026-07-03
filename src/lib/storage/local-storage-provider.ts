import path from 'path';
import fs from 'fs/promises';
import { createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { randomUUID, createHash } from 'crypto';
import { DocumentStorageProvider, SaveFileInput, StoredFileResult } from './types';

const STORAGE_ROOT = process.env.STORAGE_ROOT || path.join(/*turbopackIgnore: true*/ process.cwd(), 'storage');

export function validateSafePath(inputPath: string): boolean {
  if (!inputPath || typeof inputPath !== 'string') return false;
  // Prevent directory traversal attacks and subdirectories
  if (inputPath.includes('..') || inputPath.includes('\0') || inputPath.includes('/') || inputPath.includes('\\')) {
    return false;
  }
  return true;
}

export function sanitizeFileName(name: string): string {
  if (!name) return 'unnamed_file';
  const base = path.basename(name);
  return base.replace(/[^a-zA-Z0-9.\-_]/g, '_');
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
    const { buffer, stream, projectCode, folderId, originalName } = input;
    
    if (!validateSafePath(projectCode) || !validateSafePath(folderId)) {
      throw new Error('Invalid path parameters');
    }

    if (!buffer && !stream) {
      throw new Error('Either buffer or stream must be provided');
    }

    const storedName = createStoredFileName(originalName);
    const relativePath = path.join('projects', projectCode, 'documents', folderId, storedName);
    const absolutePath = path.resolve(STORAGE_ROOT, relativePath);

    const root = path.resolve(STORAGE_ROOT);
    const rel = path.relative(root, absolutePath);

    // Verify the absolutePath does not escape STORAGE_ROOT
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error('Path traversal detected');
    }

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    
    let fileSize = 0;
    const hash = createHash('sha256');
    
    if (stream) {
      const writeStream = createWriteStream(absolutePath);
      const { PassThrough } = require('stream') as typeof import('stream');
      const counter = new PassThrough();
      let sizeCounter = 0;
      counter.on('data', (chunk: Buffer) => {
        sizeCounter += chunk.length;
        hash.update(chunk);
      });
      try {
        await pipeline(stream, counter, writeStream);
      } catch (error) {
        await fs.unlink(absolutePath).catch(() => undefined);
        throw error;
      }
      fileSize = sizeCounter;
    } else if (buffer) {
      await fs.writeFile(absolutePath, buffer);
      fileSize = buffer.length;
      hash.update(buffer);
    }

    const normalizedRelativePath = relativePath.replace(/\\/g, '/');
    return {
      provider: "LOCAL",
      objectKey: normalizedRelativePath,
      storagePath: normalizedRelativePath,
      size: fileSize,
      fileHash: hash.digest('hex')
    };
  }

  private resolvePath(objectKeyOrPath: string): string {
    const root = path.resolve(STORAGE_ROOT);
    const target = path.isAbsolute(objectKeyOrPath) 
      ? path.resolve(objectKeyOrPath) 
      : path.resolve(root, objectKeyOrPath);
      
    const rel = path.relative(root, target);
    
    // Safety check
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error('Path traversal detected');
    }
    return target;
  }

  async readFile(objectKeyOrPath: string): Promise<Buffer> {
    const absolutePath = this.resolvePath(objectKeyOrPath);
    return fs.readFile(absolutePath);
  }

  readFileStream(objectKeyOrPath: string): NodeJS.ReadableStream {
    const absolutePath = this.resolvePath(objectKeyOrPath);
    return createReadStream(absolutePath);
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
