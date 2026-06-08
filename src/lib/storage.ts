import path from 'path';

// Private storage directory, not accessible from public web
const STORAGE_ROOT = process.env.STORAGE_ROOT || path.join(process.cwd(), 'storage');

export function resolveStoragePath(projectCode: string, folderName: string, fileName: string): string {
  // Simple validation to prevent directory traversal
  if (fileName.includes('..') || folderName.includes('..') || projectCode.includes('..')) {
    throw new Error('Invalid path parameters');
  }
  
  return path.join(STORAGE_ROOT, 'projects', projectCode, folderName, fileName);
}
