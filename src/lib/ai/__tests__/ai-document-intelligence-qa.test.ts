/**
 * AI MILESTONE 02C: DOCUMENT INTELLIGENCE & RAG TEST SUITE
 * Rigorous automated tests for Permission-Aware Construction Document Intelligence
 */

import { describe, it, expect } from 'vitest';
import { buildSyntheticQADocumentCorpus } from './fixtures/synthetic-qa-document-corpus';
import { resolveDocumentRetrievalScope, isDocumentChunkAuthorized } from '../documents/document-access-policy';
import { retrieveDocumentEvidence, formatUntrustedDocumentContext, sanitizeExcerpt } from '../documents/retrieval/hybrid-document-retriever';
import { extractContractStructure, extractSpreadsheetStructure } from '../documents/extractors/structure-aware-extractor';
import { detectERPDocumentConflicts, extractContractFacts } from '../documents/conflict/erp-document-conflict-detector';
import { executeDocumentChatTurn } from '../controller/document-chat-orchestrator';
import { AIRequestContext } from '../types';

describe("AI-02C: Document Intelligence & Permission-Aware RAG", () => {
  const corpus = buildSyntheticQADocumentCorpus();

  const mockAdminContext: AIRequestContext = {
    userId: "admin_user_id",
    role: "ADMIN",
    userRole: "ADMIN",
    projectScope: {
      kind: "ALL_PROJECTS",
    },
    requestId: "req_test_admin",
    conversationId: "conv_test",
  };

  const mockScopedCommanderContext: AIRequestContext = {
    userId: "commander_user_id",
    role: "CHIEF_COMMANDER",
    userRole: "CHIEF_COMMANDER",
    projectScope: {
      kind: "PROJECT_IDS",
      projectIds: ["cm75j0j3x0007v7m0q007proj", "cm75j0j3x0008v7m0q008proj"], // Assigned only to CT007, CT008
    },
    requestId: "req_test_commander",
    conversationId: "conv_test",
  };

  it("1. proves Structure-Aware Extraction preserves Articles, Clauses, and Pages", () => {
    const rawSample = `
[Trang 1]
Điều 1: Phạm vi công việc
Nhà thầu thi công phần móng.

[Trang 2]
Điều 2: Giá trị hợp đồng
Tổng giá trị là 100 tỷ đồng.
`;
    const chunks = extractContractStructure({
      documentId: "DOC-SAMPLE-1",
      projectId: "PROJ-1",
      title: "Hợp đồng mẫu",
      mimeType: "application/pdf",
      version: 1,
      status: "APPROVED",
      authorityLevel: "CURRENT_APPROVED_CONTRACT",
      content: rawSample,
    });

    expect(chunks.length).toBe(2);
    expect(chunks[0].clauseReference).toBe("Điều 1");
    expect(chunks[0].pageNumber).toBe(1);
    expect(chunks[1].clauseReference).toBe("Điều 2");
    expect(chunks[1].pageNumber).toBe(2);
  });

  it("2. proves Spreadsheet Extractor preserves Sheet names and Tables", () => {
    const rawXlsx = `
[Sheet: DuToan]
| STT | HangMuc | DonGia |
| 1 | Thep | 16500000 |
`;
    const chunks = extractSpreadsheetStructure({
      documentId: "DOC-XLSX-1",
      projectId: "PROJ-1",
      title: "Dự toán vật tư",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      version: 1,
      status: "APPROVED",
      authorityLevel: "APPROVED_METHOD_STATEMENT",
      content: rawXlsx,
    });

    expect(chunks.length).toBe(1);
    expect(chunks[0].sheetName).toBe("DuToan");
    expect(chunks[0].chunkType).toBe("TABLE");
  });

  it("3. proves Server-Authoritative Scoped Security: Scoped Commander cannot access CT-2026-0009 documents", () => {
    const scope = resolveDocumentRetrievalScope(mockScopedCommanderContext, "cm75j0j3x0009v7m0q009proj");
    
    // Scoped commander's allowed list does NOT contain CT-2026-0009
    expect(scope.allowedProjectIds.includes("cm75j0j3x0009v7m0q009proj")).toBe(false);

    const evidence = retrieveDocumentEvidence({
      query: "Hợp đồng thi công số 12/2025/HĐ-XD",
      scope,
      corpus,
      targetProjectId: "cm75j0j3x0009v7m0q009proj",
    });

    // HARD ASSERT: 0 chunks returned
    expect(evidence.retrievedChunks.length).toBe(0);
    expect(evidence.rerankedChunks.length).toBe(0);
    expect(evidence.citations.length).toBe(0);
  });

  it("4. proves Admin has full access to query CT-2026-0009 documents", () => {
    const scope = resolveDocumentRetrievalScope(mockAdminContext, "cm75j0j3x0009v7m0q009proj");
    expect(scope.allowedProjectIds.includes("cm75j0j3x0009v7m0q009proj")).toBe(true);

    const evidence = retrieveDocumentEvidence({
      query: "Hợp đồng thi công giá trị bao nhiêu?",
      scope,
      corpus,
      targetProjectId: "cm75j0j3x0009v7m0q009proj",
    });

    expect(evidence.rerankedChunks.length).toBeGreaterThan(0);
    expect(evidence.citations.length).toBeGreaterThan(0);
    expect(evidence.citations[0].title).toContain("Hợp đồng thi công số 12/2025/HĐ-XD");
  });

  it("5. proves Version Reranker prioritizes Approved Addendum (v2) over Initial Contract (v1)", () => {
    const scope = resolveDocumentRetrievalScope(mockAdminContext, "cm75j0j3x0009v7m0q009proj");
    const evidence = retrieveDocumentEvidence({
      query: "Thời hạn thi công hoàn thành bàn giao dự án",
      scope,
      corpus,
      targetProjectId: "cm75j0j3x0009v7m0q009proj",
    });

    expect(evidence.rerankedChunks.length).toBeGreaterThan(1);
    // Both v1 (15/08/2026) and v2 (30/09/2026) retrieved, but v2 has version multiplier boost
    const topChunk = evidence.rerankedChunks[0];
    expect(topChunk.documentVersion).toBe(2);
    expect(topChunk.documentTitle).toContain("Phụ lục hợp đồng số 01");
  });

  it("6. proves Draft Documents are preserved with DRAFT status & AUTHORIZED_DRAFT authority", () => {
    const scope = resolveDocumentRetrievalScope(mockAdminContext, "cm75j0j3x0009v7m0q009proj");
    const evidence = retrieveDocumentEvidence({
      query: "Biện pháp thi công hố móng và tầng hầm quan trắc lún",
      scope,
      corpus,
      targetProjectId: "cm75j0j3x0009v7m0q009proj",
    });

    expect(evidence.rerankedChunks.length).toBeGreaterThan(0);
    const draftChunk = evidence.rerankedChunks.find(c => c.status === "DRAFT");
    expect(draftChunk).toBeDefined();
    expect(draftChunk?.authorityLevel).toBe("AUTHORIZED_DRAFT");
  });

  it("7. proves ERP vs. Document Conflict Detection triggers ERP_DOCUMENT_CONFLICT", () => {
    const erpFact = {
      projectId: "cm75j0j3x0009v7m0q009proj",
      projectCode: "CT-2026-0009",
      projectName: "Trung tâm giao dịch công nghệ Hà Nội",
      endDate: "2026-06-30T00:00:00.000Z", // ERP has 30/06/2026
      startDate: "2025-01-15T00:00:00.000Z",
      status: "ACTIVE",
    };

    const conflicts = detectERPDocumentConflicts(erpFact, corpus);
    expect(conflicts.length).toBeGreaterThan(0);

    const c = conflicts[0];
    expect(c.conflictCode).toBe("ERP_DOCUMENT_CONFLICT");
    expect(c.erpFactField).toBe("endDate");
    expect(c.erpFactValue).toBe("2026-06-30");
    expect(c.documentClaimValue).toBe("2026-08-15"); // Contract v1 completion date
    expect(c.severity).toBe("HIGH");
  });

  it("8. proves Prompt Injection Defense sanitizes adversarial instruction attempts", () => {
    const injectionDoc = corpus.find(c => c.documentId === "DOC-QA-006");
    expect(injectionDoc).toBeDefined();

    const formatted = formatUntrustedDocumentContext([injectionDoc!]);
    // Verified that content is enclosed in untrusted tags
    expect(formatted).toContain("<untrusted_document_content>");
    expect(formatted).toContain("</untrusted_document_content>");
    
    // Verifies excerpt sanitizer strips control characters
    const dirtyText = "Hello\u0000World<script>alert(1)</script>";
    const clean = sanitizeExcerpt(dirtyText);
    expect(clean).toBe("HelloWorldalert(1)");
  });

  it("9. proves Structured Fact Extraction extracts contract number, dates, advance and warranty", () => {
    const text = `
HỢP ĐỒNG THI CÔNG XÂY DỰNG
Số: 12/2025/HĐ-XD
Thời hạn thi công đến ngày: 15/08/2026
Tạm ứng: 20% giá trị hợp đồng
Thời gian bảo hành: 24 tháng
`;
    const facts = extractContractFacts(text);
    expect(facts.contractNumber).toBe("12/2025/HĐ-XD");
    expect(facts.completionDate).toBe("2026-08-15");
    expect(facts.advancePaymentPercent).toBe(20);
    expect(facts.warrantyPeriodMonths).toBe(24);
  });

  it("10. proves Document Chat Orchestrator returns grounded comparison when asked about ERP vs Contract", async () => {
    const res = await executeDocumentChatTurn(
      mockAdminContext,
      "So sánh thông tin trong ERP với hợp đồng của CT-2026-0009",
      "cm75j0j3x0009v7m0q009proj"
    );

    expect(res.content).toContain("BÁO CÁO ĐỐI SOÁT: DỮ LIỆU ERP vs. HỒ SƠ HỢP ĐỒNG");
    expect(res.content).toContain("ERP_DOCUMENT_CONFLICT");
    expect(res.sources.length).toBeGreaterThan(0);
    expect(res.sources[0].sourceType).toBe("DOCUMENT");
  });
});
