/**
 * DOCUMENT INDEX LIFECYCLE & CITATION INTEGRITY TESTS (AI-02C.1)
 * Validates UPLOAD, UPDATE, APPROVE, SUPERSEDE, ARCHIVE, DELETE, and PERMISSION_CHANGE transitions.
 */

import { describe, it, expect } from 'vitest';
import { DocumentIndexLifecycleManager } from '../documents/lifecycle/document-index-lifecycle';
import { extractDocumentChunks } from '../documents/extractors/structure-aware-extractor';
import { DocumentCitationV2, DocumentIntelligenceRecord } from '../documents/document-brain-contracts';
import { DocumentRetrievalScope } from '../documents/document-access-policy';

describe('AI-02C.1: Document Index Lifecycle & Citation Integrity Engine', () => {
  const manager = new DocumentIndexLifecycleManager();

  const adminScope: DocumentRetrievalScope = {
    userId: 'admin_user_id',
    userRole: 'ADMIN',
    isGlobal: true,
    allowedProjectIds: ['ALL_AUTHORIZED_PROJECTS'],
    allowedStatuses: ['APPROVED', 'SUBMITTED', 'UNDER_REVIEW', 'DRAFT', 'SUPERSEDED'],
    includeDrafts: true,
    canAccessSensitiveContracts: true,
  };

  const scopedCommanderScope: DocumentRetrievalScope = {
    userId: 'commander_user_id',
    userRole: 'CHIEF_COMMANDER',
    isGlobal: false,
    allowedProjectIds: ['cm75j0j3x0007v7m0q007proj'], // Only CT007
    allowedProjectCodes: ['CT-2026-0007'],
    allowedStatuses: ['APPROVED', 'SUBMITTED', 'UNDER_REVIEW', 'DRAFT', 'SUPERSEDED'],
    includeDrafts: true,
    canAccessSensitiveContracts: true,
  };

  const rawDoc1 = `
[Trang 1]
HỢP ĐỒNG THI CÔNG XÂY DỰNG
Số: 10/2026/HĐ-XD
Dự án: CT-2026-0007

Điều 1: Phạm vi công việc
Thi công phần móng và kết cấu ngầm.
`;

  const record1: DocumentIntelligenceRecord = {
    documentId: 'DOC-LIFE-001',
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
    authorityLevel: 'AUTHORIZED_DRAFT',
    asOf: new Date().toISOString(),
  };

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

  it('1. Lifecycle: Ingests (UPLOAD) new document into registry and index', () => {
    manager.indexDocument(record1, chunks1);
    const active = manager.getAllActiveChunks();
    expect(active.length).toBeGreaterThan(0);
    expect(active[0].documentId).toBe('DOC-LIFE-001');
    expect(active[0].status).toBe('SUBMITTED');
  });

  it('2. Lifecycle: APPROVE elevates status and authority level', () => {
    manager.approveDocument('DOC-LIFE-001', '2026-04-01');
    const active = manager.getAllActiveChunks().filter(c => c.documentId === 'DOC-LIFE-001');
    expect(active[0].status).toBe('APPROVED');
    expect(active[0].isLatestApprovedInFamily).toBe(true);
  });

  it('3. Lifecycle: SUPERSEDE updates older version when v2 is ingested', () => {
    const rawDoc2 = `
[Trang 1]
PHỤ LỤC HỢP ĐỒNG SỐ 01
Số: 01/2026/PLHĐ-CT007
Điều 1: Điều chỉnh tiến độ
Gia hạn tiến độ đến 31/12/2026.
`;
    const record2: DocumentIntelligenceRecord = {
      documentId: 'DOC-LIFE-002',
      documentFamilyId: 'FAM-HD-CT007',
      projectId: 'cm75j0j3x0007v7m0q007proj',
      projectCode: 'CT-2026-0007',
      folderId: 'FLD-001',
      title: 'Phụ lục hợp đồng số 01',
      fileName: 'phu-luc-01.pdf',
      documentType: 'CONTRACT',
      mimeType: 'application/pdf',
      version: 2,
      status: 'APPROVED',
      approvalStatus: 'APPROVED',
      effectiveDate: '2026-06-01',
      uploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      supersedesDocumentId: 'DOC-LIFE-001',
      supersededByDocumentId: null,
      isLatestApprovedInFamily: true,
      authorityLevel: 'CURRENT_APPROVED_CONTRACT',
      asOf: new Date().toISOString(),
    };

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
      supersedesDocId: 'DOC-LIFE-001',
      isLatestApprovedInFamily: true,
      content: rawDoc2,
    });

    manager.indexDocument(record2, chunks2);
    manager.supersedeDocument('DOC-LIFE-001', 'DOC-LIFE-002');

    const oldChunks = manager.getAllActiveChunks().filter(c => c.documentId === 'DOC-LIFE-001');
    expect(oldChunks[0].status).toBe('SUPERSEDED');
    expect(oldChunks[0].supersededByDocId).toBe('DOC-LIFE-002');
    expect(oldChunks[0].isLatestApprovedInFamily).toBe(false);
    expect(oldChunks[0].authorityLevel).toBe('APPROVED_HISTORICAL_DOCUMENT');
  });

  it('4. Citation Integrity: Validates cryptographic hash, location, and flags superseded versions', () => {
    const citationOld: DocumentCitationV2 = {
      sourceType: 'DOCUMENT',
      documentId: 'DOC-LIFE-001',
      projectId: 'cm75j0j3x0007v7m0q007proj',
      projectCode: 'CT-2026-0007',
      title: 'Hợp đồng thi công số 10/2026/HĐ-XD',
      version: 1,
      status: 'SUPERSEDED',
      authorityLevel: 'APPROVED_HISTORICAL_DOCUMENT',
      location: { page: 1, clause: 'Điều 1' },
      excerptSafe: 'Thi công phần móng',
      route: '/projects/cm75j0j3x0007v7m0q007proj/documents?docId=DOC-LIFE-001',
      asOf: new Date().toISOString(),
    };

    const report = manager.validateCitationIntegrity(citationOld, adminScope);
    expect(report.isValid).toBe(true);
    expect(report.isStaleOrSuperseded).toBe(true); // Correctly flagged as superseded!
    expect(report.isAuthorized).toBe(true);
    expect(report.hashMatched).toBe(true);
  });

  it('5. Permission Change: Revoked project immediately invalidates citation for scoped user', () => {
    const revokedScope: DocumentRetrievalScope = {
      userId: 'commander_user_id',
      userRole: 'CHIEF_COMMANDER',
      isGlobal: false,
      allowedProjectIds: ['cm75j0j3x0008v7m0q008proj'], // CT007 was removed!
      allowedProjectCodes: ['CT-2026-0008'],
      allowedStatuses: ['APPROVED'],
      includeDrafts: false,
      canAccessSensitiveContracts: false,
    };

    const citation: DocumentCitationV2 = {
      sourceType: 'DOCUMENT',
      documentId: 'DOC-LIFE-002',
      projectId: 'cm75j0j3x0007v7m0q007proj',
      projectCode: 'CT-2026-0007',
      title: 'Phụ lục hợp đồng số 01',
      version: 2,
      status: 'APPROVED',
      authorityLevel: 'CURRENT_APPROVED_CONTRACT',
      location: { page: 1, clause: 'Điều 1' },
      excerptSafe: 'Gia hạn tiến độ',
      route: '/projects/cm75j0j3x0007v7m0q007proj/documents?docId=DOC-LIFE-002',
      asOf: new Date().toISOString(),
    };

    const report = manager.validateCitationIntegrity(citation, revokedScope);
    expect(report.isValid).toBe(false);
    expect(report.isAuthorized).toBe(false);
    expect(report.failureReason).toBe('ACCESS_DENIED_FOR_USER_SCOPE');
  });

  it('6. Lifecycle: DELETE completely removes document and its chunks from index', () => {
    manager.deleteDocument('DOC-LIFE-001');
    const remaining = manager.getAllActiveChunks().filter(c => c.documentId === 'DOC-LIFE-001');
    expect(remaining.length).toBe(0);
  });
});
