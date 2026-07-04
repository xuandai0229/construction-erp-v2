import 'dotenv/config';
import prisma from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

function resolveStoragePath(dbPath: string): { resolved: string | null, reason: string, candidates: string[] } {
  if (!dbPath) return { resolved: null, reason: 'Empty path', candidates: [] };
  const cleanPath = dbPath.replace(/^[\/\\]/, '');
  const candidates = [
    path.resolve(process.cwd(), cleanPath),
    path.resolve(process.cwd(), 'storage', cleanPath),
    path.resolve(process.cwd(), 'public/uploads', cleanPath)
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return { resolved: c, reason: 'Found', candidates };
    }
  }
  return { resolved: null, reason: 'All candidates missing', candidates };
}

function normalizePath(p: string): string {
  return path.resolve(p).toLowerCase().replace(/\\/g, '/');
}

async function scanFileSystem(dir: string, fileList: any[]) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      await scanFileSystem(fullPath, fileList);
    } else {
      const stats = fs.statSync(fullPath);
      fileList.push({
        path: fullPath,
        size: stats.size,
        modifiedTime: stats.mtime.toISOString(),
        name: file
      });
    }
  }
}

async function main() {
  console.log('Starting Business Data Wipe AUDIT (Read-only)...');

  const modelsToWipe = [
    'Project', 'ProjectMember', 'WBSItem', 'DocumentFolder', 'Document',
    'SiteReport', 'SiteReportLine', 'SiteReportAttachment', 'SiteReportPhoto',
    'Contract', 'PaymentPlan', 'PaymentRecord', 'PaymentRequest', 'ApprovalRequest',
    'MaterialRequest', 'MaterialRequestItem', 'MaterialMovement', 'ProjectMaterialStock',
    'FieldProgressTemplate', 'FieldProgressItem', 'FieldProgressEntry', 'FieldMaterialRequest', 'FieldMaterialRequestItem',
    'Notification', 'ChatMessage'
  ];

  const modelsToConfirm = ['Supplier', 'MaterialItem', 'AuditLog', 'User'];
  const modelsToKeep = ['SystemSetting'];

  const manifest: any = {
    runDate: new Date().toISOString(),
    dryRun: true,
    keepTables: modelsToKeep,
    wipeTables: modelsToWipe,
    confirmTables: modelsToConfirm,
    modelCountsBefore: {},
    usersToKeep: [],
    usersToDeleteCandidates: [],
    projectsToDelete: [],
    filesToQuarantine: [],
    storageStats: {
      physicalFilesScanned: 0,
      dbFilesScanned: 0,
      referencedFilesFound: 0,
      referencedFilesMissing: 0,
      orphanPhysicalFiles: 0,
      filesToQuarantine: 0,
      totalBytesToQuarantine: 0
    },
    deleteOrder: [
      'SiteReportAttachment', 'SiteReportPhoto', 'SiteReportLine', 'SiteReport',
      'FieldProgressEntry', 'FieldProgressItem', 'FieldProgressTemplate',
      'FieldMaterialRequestItem', 'FieldMaterialRequest',
      'MaterialRequestItem', 'MaterialRequest', 'MaterialMovement', 'ProjectMaterialStock',
      'PaymentRecord', 'PaymentPlan', 'PaymentRequest', 'ApprovalRequest', 'Contract',
      'Document', 'DocumentFolder', 'WBSItem', 'Notification', 'ChatMessage', 'AuditLog',
      'ProjectMember', 'Project', 'Supplier', 'MaterialItem'
    ],
    warnings: [],
    blockers: []
  };

  for (const model of [...modelsToKeep, ...modelsToWipe, ...modelsToConfirm]) {
    const camelModel = model.charAt(0).toLowerCase() + model.slice(1);
    const delegate = (prisma as any)[camelModel];
    if (delegate) {
      manifest.modelCountsBefore[model] = await delegate.count();
    }
  }

  const users = await prisma.user.findMany({ select: { id: true, email: true, role: true } });
  manifest.usersToKeep = users.filter(u => u.role === 'ADMIN').map(u => ({ id: u.id, email: u.email }));
  manifest.usersToDeleteCandidates = users.filter(u => u.role !== 'ADMIN').map(u => ({ id: u.id, email: u.email }));

  if (manifest.usersToKeep.length === 0) {
    manifest.blockers.push('No ADMIN users found. Wiping business data could lock everyone out. Aborting live execution plan.');
  }

  const projects = await prisma.project.findMany({ select: { id: true, code: true, name: true } });
  manifest.projectsToDelete = projects;

  const dbDocs = await prisma.document.findMany({ select: { id: true, storagePath: true } });
  const dbAtts = await prisma.siteReportAttachment.findMany({ select: { id: true, storagePath: true } });
  
  const allDbFiles = [
    ...dbDocs.map(d => ({ path: d.storagePath, source: 'Document' })),
    ...dbAtts.map(a => ({ path: a.storagePath, source: 'SiteReportAttachment' }))
  ];

  manifest.storageStats.dbFilesScanned = allDbFiles.length;

  const resolvedDbPathsSet = new Set<string>();
  
  for (const dbf of allDbFiles) {
    const res = resolveStoragePath(dbf.path);
    if (res.resolved) {
      manifest.storageStats.referencedFilesFound++;
      resolvedDbPathsSet.add(normalizePath(res.resolved));
      const stats = fs.statSync(res.resolved);
      manifest.filesToQuarantine.push({
        sourceType: "DB_REFERENCED",
        dbPath: dbf.path,
        resolvedPhysicalPath: res.resolved,
        relativePhysicalPath: path.relative(process.cwd(), res.resolved),
        size: stats.size,
        model: dbf.source,
        reason: "Referenced by wiped business data",
        exists: true,
        risk: "LOW",
        approvedForQuarantine: false
      });
      manifest.storageStats.totalBytesToQuarantine += stats.size;
    } else {
      manifest.storageStats.referencedFilesMissing++;
      manifest.warnings.push(`File missing: ${dbf.path}`);
    }
  }

  const uploadDirs = ['storage', 'public/uploads', 'uploads', '.storage'].map(d => path.join(process.cwd(), d));
  const physicalFiles: any[] = [];
  
  for (const dir of uploadDirs) {
    await scanFileSystem(dir, physicalFiles);
  }

  manifest.storageStats.physicalFilesScanned = physicalFiles.length;

  for (const pf of physicalFiles) {
    const normPf = normalizePath(pf.path);
    if (resolvedDbPathsSet.has(normPf)) continue;

    manifest.storageStats.orphanPhysicalFiles++;
    
    const isCodeOrDoc = pf.path.includes('.git') || pf.path.includes('node_modules') || pf.path.includes('docs/qa');
    if (!isCodeOrDoc) {
      const relPath = path.relative(process.cwd(), pf.path);
      manifest.filesToQuarantine.push({
        sourceType: "ORPHAN_PHYSICAL",
        dbPath: null,
        resolvedPhysicalPath: pf.path,
        relativePhysicalPath: relPath,
        size: pf.size,
        model: "Orphan",
        reason: "Orphan file in upload directories",
        exists: true,
        risk: pf.size > 10 * 1024 * 1024 ? "MEDIUM" : "LOW",
        approvedForQuarantine: false
      });
      manifest.storageStats.totalBytesToQuarantine += pf.size;
    }
  }

  manifest.storageStats.filesToQuarantine = manifest.filesToQuarantine.length;

  fs.mkdirSync(path.join(process.cwd(), 'docs/qa'), { recursive: true });
  fs.writeFileSync(
    path.join(process.cwd(), 'docs/qa/business-data-wipe-audit-manifest-2026-07-03.json'),
    JSON.stringify(manifest, null, 2)
  );

  console.log('Audit complete.');
}

main().catch(console.error).finally(async () => { await prisma.$disconnect(); });
