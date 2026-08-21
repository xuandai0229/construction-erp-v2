/**
 * PERSISTENT DOCUMENT INDEX LIFECYCLE & RESTART INVARIANTS (AI-02C.2)
 * Proves index persistence across process restarts, state transitions, and content hash integrity.
 */

import { describe, it, expect, afterAll } from 'vitest';
import { PersistentDocumentIndexStore } from '../documents/index/persistent-document-index-store';
import { extractDocumentChunks } from '../documents/extractors/structure-aware-extractor';
import { DocumentIntelligenceRecord, DocumentCitationV2 } from '../documents/document-brain-contracts';
import { DocumentRetrievalScope } from '../documents/document-access-policy';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('AI-02C.2: Persistent Index Store Lifecycle & Restart Invariants', () => {
  const testDir = path.join(process.cwd(), '.storage', 'ai-test-restart');
  const testFilePath = path.join(testDir, 'test-persistent-index.json');

  // Clean up test directory
  if (fs.existsSync(testFilePath)) {
    fs.unlinkSync(testFilePath);
  }

  afterAll(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    if (fs.existsSync(testDir)) {
      fs.rmdirSync(testDir, { recursive: true });
    }
  });

  const adminScope: DocumentRetrievalScope = {
    userId: 'admin_eval_id',
    userRole: 'ADMIN',
    isGlobal: true,
    allowedProjectIds: ['ALL_AUTHORIZED_PROJECTS'],
    allowedStatuses: ['APPROVED', 'SUBMITTED', 'UNDER_REVIEW', 'DRAFT', 'SUPERSEDED'],
    includeDrafts: true,
    canAccessSensitiveContracts: true,
  };

  const scopedCommanderScope: DocumentRetrievalScope = {
    userId: 'commander_eval_id',
    userRole: 'CHIEF_COMMANDER',
    isGlobal: false,
    allowedProjectIds: ['cm75j0j3x0007v7m0q007proj'],
    allowedProjectCodes: ['CT-2026-0007'],
    allowedStatuses: ['APPROVED', 'SUBMITTED', 'UNDER_REVIEW', 'DRAFT', 'SUPERSEDED'],
    includeDrafts: true,
    canAccessSensitiveContracts: true,
  };

  const record1: DocumentIntelligenceRecord = {
    documentId: 'DOC-PERSIST-001',
    documentFamilyId: 'FAM-HD-CT007',
    projectId: 'cm75j0j3x0007v7m0q007proj',
    projectCode: 'CT-2026-0007',
    folderId: 'FLD-001',
    title: 'Hợp đồng thi công số 10/2026/HĐ-XD',
    fileName: 'hop-dong-10.pdf',
    documentType: 'CONTRACT',
    mimeType: 'application/pdf',
    version: 1,
    status: 'SUBMITTED',
    approvalStatus: 'SUBMITTED',
    effectiveDate: null,
    uploadedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    supersedesDocumentId: null,
    supersededByDocumentId: null,
    isLatestApprovedInFamily: false,
    authorityLevel: 'AUTHORIZED_DRAFT',
    asOf: new Date().toISOString(),
  };

  const rawDoc1 = `
[Trang 1]
HỢP ĐỒNG THI CÔNG XÂY DỰNG SỐ 10/2026/HĐ-XD
Điều 1: Phạm vi công việc phần móng và kết cấu ngầm.
Điều 2: Giá trị hợp đồng 50.000.000.000 VNĐ.
`;

  const chunks1 = extractDocumentChunks({
    documentId: record1.documentId,
    documentFamilyId: record1.documentFamilyId,
    projectId: record1.projectId,
    projectCode: record1.projectCode,
    title: record1.title,
    mimeType: record1.mimeType,
    version: record1.version,
    status: record1.status,
    authorityLevel: record1.authorityLevel,
    content: rawDoc1,
  });

  it('1. Lifecycle UPLOAD: Ingests and persists document to disk', () => {
    const store = new PersistentDocumentIndexStore(testFilePath);
    store.indexDocument(record1, chunks1, 'hash_file_001');

    expect(fs.existsSync(testFilePath)).toBe(true);
    const active = store.getAllActiveChunks();
    expect(active.length).toBeGreaterThan(0);
    expect(active[0].documentId).toBe('DOC-PERSIST-001');
    expect(active[0].fileHash).toBe('hash_file_001');
  });

  it('2. Restart Invariant: State completely survives simulated process restart', () => {
    // Instantiate new store instance pointing to same file path (simulating fresh process startup)
    const freshStore = new PersistentDocumentIndexStore(testFilePath);
    const loadedChunks = freshStore.getAllActiveChunks();

    expect(loadedChunks.length).toBeGreaterThan(0);
    expect(loadedChunks[0].documentId).toBe('DOC-PERSIST-001');
    expect(loadedChunks[0].documentTitle).toBe('Hợp đồng thi công số 10/2026/HĐ-XD');
    expect(loadedChunks[0].status).toBe('SUBMITTED');
  });

  it('3. Lifecycle APPROVE: Transitions to APPROVED and persists across restarts', () => {
    const store = new PersistentDocumentIndexStore(testFilePath);
    store.approveDocument('DOC-PERSIST-001', '2026-05-01');

    // Fresh restart check
    const restartStore = new PersistentDocumentIndexStore(testFilePath);
    const approvedChunks = restartStore.getAllActiveChunks().filter(c => c.documentId === 'DOC-PERSIST-001');
    expect(approvedChunks[0].status).toBe('APPROVED');
    expect(approvedChunks[0].isLatestApprovedInFamily).toBe(true);
    expect(approvedChunks[0].authorityLevel).toBe('APPROVED_METHOD_STATEMENT');
  });

  it('4. Lifecycle SUPERSEDE: Ingests Addendum v2 and supersedes v1 persistently', () => {
    const store = new PersistentDocumentIndexStore(testFilePath);

    const record2: DocumentIntelligenceRecord = {
      documentId: 'DOC-PERSIST-002',
      documentFamilyId: 'FAM-HD-CT007',
      projectId: 'cm75j0j3x0007v7m0q007proj',
      projectCode: 'CT-2026-0007',
      folderId: 'FLD-001',
      title: 'Phụ lục hợp đồng số 01/2026/PLHĐ-CT007',
      fileName: 'phu-luc-01.pdf',
      documentType: 'CONTRACT',
      mimeType: 'application/pdf',
      version: 2,
      status: 'APPROVED',
      approvalStatus: 'APPROVED',
      effectiveDate: '2026-08-01',
      uploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      supersedesDocumentId: 'DOC-PERSIST-001',
      supersededByDocumentId: null,
      isLatestApprovedInFamily: true,
      authorityLevel: 'CURRENT_APPROVED_CONTRACT',
      asOf: new Date().toISOString(),
    };

    const rawDoc2 = `
[Trang 1]
PHỤ LỤC HỢP ĐỒNG SỐ 01
Điều 1: Gia hạn tiến độ đến 31/12/2026.
`;

    const chunks2 = extractDocumentChunks({
      documentId: record2.documentId,
      documentFamilyId: record2.documentFamilyId,
      projectId: record2.projectId,
      projectCode: record2.projectCode,
      title: record2.title,
      mimeType: record2.mimeType,
      version: record2.version,
      status: record2.status,
      authorityLevel: record2.authorityLevel,
      supersedesDocId: 'DOC-PERSIST-001',
      isLatestApprovedInFamily: true,
      content: rawDoc2,
    });

    store.indexDocument(record2, chunks2, 'hash_file_002');
    store.supersedeDocument('DOC-PERSIST-001', 'DOC-PERSIST-002');

    // Fresh restart check
    const freshStore = new PersistentDocumentIndexStore(testFilePath);
    const oldChunks = freshStore.getAllActiveChunks().filter(c => c.documentId === 'DOC-PERSIST-001');
    const newChunks = freshStore.getAllActiveChunks().filter(c => c.documentId === 'DOC-PERSIST-002');

    expect(oldChunks[0].status).toBe('SUPERSEDED');
    expect(oldChunks[0].supersededByDocId).toBe('DOC-PERSIST-002');
    expect(oldChunks[0].isLatestApprovedInFamily).toBe(false);
    expect(newChunks[0].status).toBe('APPROVED');
    expect(newChunks[0].isLatestApprovedInFamily).toBe(true);
  });

  it('5. Citation Content Hash Integrity: Validates SHA-256 hash and flags superseded versions', () => {
    const store = new PersistentDocumentIndexStore(testFilePath);

    const oldCitation: DocumentCitationV2 = {
      sourceType: 'DOCUMENT',
      documentId: 'DOC-PERSIST-001',
      projectId: 'cm75j0j3x0007v7m0q007proj',
      projectCode: 'CT-2026-0007',
      title: 'Hợp đồng thi công số 10/2026/HĐ-XD',
      version: 1,
      status: 'SUPERSEDED',
      authorityLevel: 'APPROVED_HISTORICAL_DOCUMENT',
      location: { page: 1, clause: 'Điều 1' },
      excerptSafe: 'Phạm vi công việc phần móng',
      route: '/projects/cm75j0j3x0007v7m0q007proj/documents?docId=DOC-PERSIST-001',
      asOf: new Date().toISOString(),
    };

    const report = store.validateContentHashIntegrity(oldCitation, adminScope);
    expect(report.isValid).toBe(true);
    expect(report.isStaleOrSuperseded).toBe(true);
    expect(report.hashMatched).toBe(true);
    expect(report.integrityAlgorithm).toBe('SHA-256');
  });

  it('6. Permission Revocation: Revoked project immediately invalidates citation access', () => {
    const store = new PersistentDocumentIndexStore(testFilePath);

    const revokedScope: DocumentRetrievalScope = {
      userId: 'commander_eval_id',
      userRole: 'CHIEF_COMMANDER',
      isGlobal: false,
      allowedProjectIds: ['cm75j0j3x0008v7m0q008proj'], // CT007 was revoked!
      allowedProjectCodes: ['CT-2026-0008'],
      allowedStatuses: ['APPROVED'],
      includeDrafts: false,
      canAccessSensitiveContracts: false,
    };

    const citation: DocumentCitationV2 = {
      sourceType: 'DOCUMENT',
      documentId: 'DOC-PERSIST-002',
      projectId: 'cm75j0j3x0007v7m0q007proj',
      projectCode: 'CT-2026-0007',
      title: 'Phụ lục hợp đồng số 01',
      version: 2,
      status: 'APPROVED',
      authorityLevel: 'CURRENT_APPROVED_CONTRACT',
      location: { page: 1, clause: 'Điều 1' },
      excerptSafe: 'Gia hạn tiến độ',
      route: '/projects/cm75j0j3x0007v7m0q007proj/documents?docId=DOC-PERSIST-002',
      asOf: new Date().toISOString(),
    };

    const report = store.validateContentHashIntegrity(citation, revokedScope);
    expect(report.isValid).toBe(false);
    expect(report.isAuthorized).toBe(false);
    expect(report.failureReason).toBe('ACCESS_DENIED_FOR_USER_SCOPE');
  });

  it('7. Lifecycle DELETE: Completely deletes document and chunks persistently', () => {
    const store = new PersistentDocumentIndexStore(testFilePath);
    store.deleteDocument('DOC-PERSIST-001');

    // Fresh restart check
    const freshStore = new PersistentDocumentIndexStore(testFilePath);
    const remaining = freshStore.getAllActiveChunks().filter(c => c.documentId === 'DOC-PERSIST-001');
    expect(remaining.length).toBe(0);
  });
});
