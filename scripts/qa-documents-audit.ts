import 'dotenv/config';
import prisma from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log("=== KIỂM TRA DỮ LIỆU DOCUMENTS ===");

  const documents = await prisma.document.findMany({
    include: { project: true, folder: true }
  });
  
  const folders = await prisma.documentFolder.findMany({
    include: { project: true }
  });

  const projectsWithDocs = new Set(documents.map(d => d.projectId));
  
  console.log(`- Tổng số document (bao gồm soft delete): ${documents.length}`);
  console.log(`- Tổng số folder (bao gồm soft delete): ${folders.length}`);
  console.log(`- Tổng số project có document: ${projectsWithDocs.size}`);

  let totalMetadataSize = 0;
  let fileZeroSize = 0;
  let missingName = 0;
  let missingStoragePath = 0;
  let missingProjectId = 0;
  let invalidProjectId = 0;
  let invalidFolderId = 0;
  let deletedFiles = 0;
  let testFiles = 0;
  
  // Storage verification
  const STORAGE_ROOT = path.join(process.cwd(), 'storage');
  let missingPhysicalFiles = 0;

  for (const doc of documents) {
    if (doc.metadata) {
      totalMetadataSize += Buffer.byteLength(JSON.stringify(doc.metadata));
    }
    if (doc.size === 0) fileZeroSize++;
    if (!doc.originalName || !doc.storedName) missingName++;
    if (!doc.storagePath) missingStoragePath++;
    if (!doc.projectId) missingProjectId++;
    if (!doc.project) invalidProjectId++;
    if (doc.folderId && !doc.folder) invalidFolderId++;
    if (doc.deletedAt) deletedFiles++;
    if (doc.originalName && doc.originalName.startsWith('QA_DOCUMENTS_')) testFiles++;

    // Check physical file
    if (doc.storagePath) {
      const fullPath = path.join(process.cwd(), doc.storagePath);
      if (!fs.existsSync(fullPath)) {
        missingPhysicalFiles++;
      }
    }
  }

  console.log(`- Dung lượng metadata trong DB (bytes): ${totalMetadataSize}`);
  console.log(`- File có size = 0: ${fileZeroSize}`);
  console.log(`- File thiếu name: ${missingName}`);
  console.log(`- File thiếu storage path: ${missingStoragePath}`);
  console.log(`- File thiếu projectId: ${missingProjectId}`);
  console.log(`- File có projectId không tồn tại (orphan): ${invalidProjectId}`);
  console.log(`- File có folderId không tồn tại (orphan): ${invalidFolderId}`);
  console.log(`- File đã bị xóa mềm (deletedAt != null): ${deletedFiles}`);
  console.log(`- File trong DB nhưng không có trên ổ cứng vật lý: ${missingPhysicalFiles}`);
  console.log(`- Dữ liệu rác/test (QA_DOCUMENTS_): ${testFiles}`);

  let missingFolderProject = 0;
  let missingParentFolder = 0;
  let folderCycles = 0;

  for (const folder of folders) {
    if (!folder.project) missingFolderProject++;
    if (folder.parentId) {
      const parent = folders.find(f => f.id === folder.parentId);
      if (!parent) {
        missingParentFolder++;
      } else {
        // Check cycle
        let current = parent;
        let visited = new Set([folder.id]);
        let cycleDetected = false;
        while (current && current.parentId) {
          if (visited.has(current.parentId)) {
            cycleDetected = true;
            break;
          }
          visited.add(current.id);
          const nextParentId = current.parentId; // Need block scope to find next parent
          current = folders.find(f => f.id === nextParentId)!;
        }
        if (cycleDetected) folderCycles++;
      }
    }
  }

  console.log(`- Folder có projectId không tồn tại: ${missingFolderProject}`);
  console.log(`- Folder có parentId không tồn tại: ${missingParentFolder}`);
  console.log(`- Cây thư mục bị vòng lặp (Cycle): ${folderCycles}`);

}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
