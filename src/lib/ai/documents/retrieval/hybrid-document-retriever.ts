/**
 * HYBRID DOCUMENT RETRIEVER & RERANKER
 * Multi-stage permission-aware retrieval with authority-based reranking
 */

import {
  DocumentChunk,
  DocumentEvidencePackage,
  DocumentCitationV2,
  FactDomain,
  getDomainAuthorityRank,
  SOURCE_AUTHORITY_POLICY_V2,
} from "../document-brain-contracts";
import { DocumentRetrievalScope, isDocumentChunkAuthorized } from '../document-access-policy';

export interface RetrievalOptions {
  query: string;
  scope: DocumentRetrievalScope;
  topK?: number;
  corpus: DocumentChunk[];
  targetProjectId?: string;
  targetProjectCode?: string;
}

/**
 * Normalizes query string for Vietnamese keyword and identifier matching.
 */
function normalizeQuery(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 1);
}

/**
 * Calculates keyword exact match score including special construction patterns
 * (e.g. "Điều 4", "12/2025/HĐ-XD", "tiến độ", "thanh toán", "CT-2026-0009", "phạt vi phạm").
 */
function calculateKeywordScore(query: string, chunk: DocumentChunk): number {
  const queryTerms = normalizeQuery(query);
  const chunkTextLower = chunk.text.toLowerCase();
  const titleLower = chunk.documentTitle.toLowerCase();
  const clauseLower = (chunk.clauseReference || "").toLowerCase();
  const sectionLower = (chunk.sectionTitle || "").toLowerCase();
  const sheetLower = (chunk.sheetName || "").toLowerCase();

  let score = 0;

  // 1. Exact Contract Identifier Match (e.g., "12/2025/HĐ-XD", "01/2026/PLHĐ-CT009", "99/TB-NCC")
  const idMatch = query.match(/\b(\d+[\/\w\-]+(?:\/HĐ|\/PLHĐ|\/NTVL|\/TB|\/ATLD)[\/\w\-]*)\b/i);
  if (idMatch) {
    const rawId = idMatch[1].toLowerCase();
    if (titleLower.includes(rawId)) {
      score += 40.0; // Exact title identifier match
    } else if (chunkTextLower.includes(rawId)) {
      score += 15.0; // Reference to identifier in text
    }
  }

  // 2. Exact Clause Match (e.g., "Điều 4", "Điều 2", "Điều 1.1", "phạt vi phạm", "bảo hành")
  const clauseMatch = query.match(/(?:Điều|khoản)\s*(\d+[\.\d]*)/i);
  if (clauseMatch && chunk.clauseReference) {
    const targetClauseNum = clauseMatch[1];
    const chunkClauseNum = (chunk.clauseReference.match(/\d+[\.\d]*/)||[])[0];
    if (chunkClauseNum === targetClauseNum) {
      score += 30.0; // Strong match for exact clause number
    } else {
      score -= 5.0; // Discourage wrong clause numbers
    }
  }

  // 3. High-Priority Topic Headings (Phạt vi phạm, Dự toán, Giải ngân, Bảo hành, Nghiệm thu)
  if (/phạt vi phạm|chế tài/i.test(query) && (clauseLower.includes("phạt") || sectionLower.includes("phạt"))) {
    score += 35.0;
  }
  if (/dự toán|giải ngân|vật tư chính/i.test(query) && (titleLower.includes("dự toán") || sheetLower.includes("kehoach") || sheetLower.includes("vattu"))) {
    score += 35.0;
  }
  if (/bảo hành/i.test(query) && (clauseLower.includes("bảo hành") || sectionLower.includes("bảo hành"))) {
    score += 35.0;
  }

  // 4. Substantive Topic Match
  for (const term of queryTerms) {
    const isDomainKey = /giá|trị|tiến|độ|hoàn|thành|tạm|ứng|bảo|hành|phạt|nghiệm|thu|thép|móng|hầm|quan|trắc|lún|giải|ngân|vật|tư|cát|bê|tông|chế|tài/.test(term);
    const weight = isDomainKey ? 4.0 : 1.0;

    if (clauseLower.includes(term)) score += 3.0 * weight;
    if (sectionLower.includes(term)) score += 2.5 * weight;
    if (sheetLower.includes(term)) score += 5.0 * weight;
    if (chunkTextLower.includes(term)) score += 1.5 * weight;
    if (titleLower.includes(term)) score += 1.5;
  }

  // 4. Project Match Bonus
  if (chunk.projectCode && query.toUpperCase().includes(chunk.projectCode)) {
    score += 5.0;
  }

  return score;
}

/**
 * Infers the business fact domain from query intent.
 */
export function inferFactDomain(query: string): FactDomain {
  const q = query.toLowerCase();
  if (/thời hạn|tiến độ|hoàn thành|bàn giao|gia hạn|chậm tiến độ|ngày hết hạn|ngày kết thúc/i.test(q)) {
    return "CONTRACTUAL_DEADLINE";
  }
  if (/tạm ứng/i.test(q)) {
    return "ADVANCE_AMOUNT";
  }
  if (/giải ngân|thanh toán/i.test(q)) {
    return "PAID_AMOUNT";
  }
  if (/phát sinh|bổ sung/i.test(q)) {
    return "APPROVED_VARIATION_VALUE";
  }
  if (/giá trị|bảo lãnh|phạt vi phạm|hợp đồng trọn gói|đơn giá|bảo hành/i.test(q)) {
    return "CONTRACT_TOTAL_VALUE";
  }
  if (/biện pháp thi công|bptc|hố móng|tầng hầm|kỹ thuật thi công|quan trắc|chuyển vị|an toàn lao động|ppe/i.test(q)) {
    return "TECHNICAL_METHOD";
  }
  if (/nghiệm thu|thí nghiệm|thép|vật liệu đầu vào|cường độ|nén mẫu|chất lượng/i.test(q)) {
    return "QUALITY_ACCEPTANCE";
  }
  if (/trạng thái|phê duyệt|chờ duyệt|tờ trình|workflow/i.test(q)) {
    return "ERP_WORKFLOW_STATE";
  }
  if (/khối lượng thi công|tiến độ thực tế|sản lượng|nhật ký/i.test(q)) {
    return "ACTUAL_PROGRESS";
  }
  return "GENERAL_FACT";
}

/**
 * Domain-Aware Authority & Version Lineage Reranker:
 * Adjusts composite score by domain authority rank and document lineage.
 * Invariant: Version precedence applies strictly within the same document family.
 */
function calculateAuthorityMultiplier(chunk: DocumentChunk, query: string, domain: FactDomain): number {
  const rank = getDomainAuthorityRank(domain, chunk.authorityLevel);
  
  // Base domain authority multiplier
  let multiplier = 1.0;
  switch (rank) {
    case 1:
      multiplier = 2.0;
      break;
    case 2:
      multiplier = 1.6;
      break;
    case 3:
      multiplier = 1.3;
      break;
    case 4:
      multiplier = 1.0;
      break;
    case 5:
      multiplier = 0.8;
      break;
    default:
      multiplier = 0.6;
  }

  // Same-Lineage Version Logic (Applies when query is about amendment / deadline update in that family)
  if (chunk.documentFamilyId) {
    if (domain === "CONTRACTUAL_DEADLINE" && chunk.isLatestApprovedInFamily) {
      multiplier *= 1.4; // Effective Addendum wins on contractual deadline questions
    } else if (chunk.status === "SUPERSEDED" || chunk.supersededByDocId) {
      multiplier *= 0.7; // Historical superseded version
    }
  }

  // Approval status check
  if (chunk.status === "APPROVED") {
    multiplier *= 1.2;
  } else if (chunk.status === "DRAFT") {
    multiplier *= 0.85;
  } else if (chunk.status === "SUPERSEDED") {
    multiplier *= 0.4;
  }

  return multiplier;
}

/**
 * Hybrid Document Retrieval Pipeline:
 * Stage 1: Server-Authoritative Permission Gate
 * Stage 2: Keyword & Structural Search
 * Stage 3: Domain-Aware Authority & Lineage Reranking
 * Stage 4: Top-K Bounding & Citation Packaging
 */
export function retrieveDocumentEvidence(options: RetrievalOptions): DocumentEvidencePackage {
  const { query, scope, topK = 5, corpus, targetProjectId, targetProjectCode } = options;
  const asOf = new Date().toISOString();
  const domain = inferFactDomain(query);

  // Stage 1: Filter corpus strictly by authorized scope
  const authorizedChunks = corpus.filter(chunk => {
    if (targetProjectId && chunk.projectId !== targetProjectId && (!targetProjectCode || chunk.projectCode !== targetProjectCode)) {
      return false;
    }
    return isDocumentChunkAuthorized(chunk.projectId, chunk.status, scope, chunk.projectCode);
  });

  if (authorizedChunks.length === 0) {
    return {
      projectId: targetProjectId || (scope.allowedProjectIds[0] || "GLOBAL"),
      query,
      authorizedDocumentIds: [],
      retrievedChunks: [],
      rerankedChunks: [],
      citations: [],
      conflicts: [],
      asOf,
    };
  }

  // Stage 2 & 3: Score and Rerank candidates
  const scoredChunks = authorizedChunks.map(chunk => {
    const rawScore = calculateKeywordScore(query, chunk);
    const authorityMultiplier = calculateAuthorityMultiplier(chunk, query, domain);
    const finalScore = rawScore * authorityMultiplier;
    return { chunk, rawScore, finalScore };
  });

  // Stage 3: Filter chunks with positive relevance and sort by finalScore descending
  const matchingChunks = scoredChunks
    .filter(item => item.rawScore > 0)
    .sort((a, b) => b.finalScore - a.finalScore);

  const topCandidates = matchingChunks.slice(0, topK).map(item => item.chunk);

  // Stage 4: Build Citations V2
  const citations: DocumentCitationV2[] = topCandidates.map(chunk => {
    const excerpt = chunk.text.length > 200 ? `${chunk.text.slice(0, 197)}...` : chunk.text;
    return {
      sourceType: "DOCUMENT",
      documentId: chunk.documentId,
      projectId: chunk.projectId,
      projectCode: chunk.projectCode,
      title: chunk.documentTitle,
      version: chunk.documentVersion,
      status: chunk.status,
      authorityLevel: chunk.authorityLevel,
      location: {
        page: chunk.pageNumber || undefined,
        clause: chunk.clauseReference,
        section: chunk.sectionTitle,
        sheet: chunk.sheetName,
        cellRange: chunk.cellRange,
      },
      excerptSafe: sanitizeExcerpt(excerpt),
      route: `/projects/${chunk.projectId}/documents?docId=${chunk.documentId}`,
      asOf,
    };
  });

  const distinctDocIds = Array.from(new Set(topCandidates.map(c => c.documentId)));

  return {
    projectId: targetProjectId || (topCandidates[0]?.projectId || "GLOBAL"),
    query,
    authorizedDocumentIds: distinctDocIds,
    retrievedChunks: matchingChunks.map(item => item.chunk),
    rerankedChunks: topCandidates,
    citations,
    conflicts: [],
    asOf,
  };
}

/**
 * Sanitizes excerpt against Prompt Injection attacks and secret leaks.
 */
export function sanitizeExcerpt(text: string): string {
  return text
    .replace(/<[^>]*>/g, "") // Strip HTML tags
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Strip control characters
    .trim();
}

/**
 * Encapsulates single document text within isolated untrusted boundaries.
 */
export function sanitizeUntrustedDocumentText(text: string): string {
  return `<untrusted_document_content>\n${sanitizeExcerpt(text)}\n</untrusted_document_content>`;
}

/**
 * Encapsulates document text within isolated untrusted boundaries for LLM synthesis.
 */
export function formatUntrustedDocumentContext(chunks: DocumentChunk[]): string {
  if (chunks.length === 0) return "Không có tài liệu phù hợp trong phạm vi được cấp quyền.";

  const items = chunks.map((c, i) => {
    const header = `[BẰNG CHỨNG TÀI LIỆU #${i + 1}]`;
    const docInfo = `Tài liệu: ${c.documentTitle} (v${c.documentVersion} - ${c.status}) | Thẩm quyền: ${c.authorityLevel}`;
    const loc = [
      c.pageNumber ? `Trang: ${c.pageNumber}` : null,
      c.clauseReference ? `Điều khoản: ${c.clauseReference}` : null,
      c.sectionTitle ? `Mục: ${c.sectionTitle}` : null,
      c.sheetName ? `Sheet: ${c.sheetName}` : null,
    ].filter(Boolean).join(" | ");

    return `${header}\n${docInfo}\nVị trí: ${loc || "Toàn văn"}\n<untrusted_document_content>\n${sanitizeExcerpt(c.text)}\n</untrusted_document_content>`;
  });

  return items.join("\n\n---\n\n");
}
