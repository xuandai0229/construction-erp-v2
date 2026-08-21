/**
 * ERP VS. DOCUMENT CONFLICT DETECTOR & STRUCTURED FACT EXTRACTOR
 * Identifies discrepancies between ERP transactional truth and contract commitments
 */

import { DocumentERPConflict, DocumentChunk } from '../document-brain-contracts';

export interface ERPProjectFactSnapshot {
  projectId: string;
  projectCode: string;
  projectName: string;
  endDate: string | null;
  startDate: string | null;
  status: string;
}

export interface ExtractedContractFacts {
  contractNumber?: string;
  completionDate?: string;
  startDate?: string;
  contractValueVND?: number;
  advancePaymentPercent?: number;
  warrantyPeriodMonths?: number;
  parties?: {
    employer?: string;
    contractor?: string;
  };
}

/**
 * Extracts high-value structured entities from contract text using deterministic regex.
 * Returned facts are strictly DOCUMENT_DERIVED_FACT (read-only).
 */
export function extractContractFacts(text: string): ExtractedContractFacts {
  const facts: ExtractedContractFacts = {};

  // 1. Contract Number (Số: 12/2025/HĐ-XD, HĐ số: ...)
  const numMatch = text.match(/(?:Số|Số HĐ|Hợp đồng số)\s*[:.\-]?\s*([0-9A-Za-z\/\-_ĐđÀ-ỹ]+)/i);
  if (numMatch) {
    facts.contractNumber = numMatch[1].trim();
  }

  // 2. Completion / End Date (hoàn thành trước ngày DD/MM/YYYY, thời hạn đến ngày ...)
  const dateMatch = text.match(/(?:hoàn thành|bàn giao|thời hạn thi công đến ngày|kết thúc vào ngày)\s*[:.\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})/i);
  if (dateMatch) {
    const parts = dateMatch[1].split(/[\/\-.]/);
    if (parts.length === 3) {
      // Standardize to YYYY-MM-DD
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      facts.completionDate = `${year}-${month}-${day}`;
    }
  }

  // 3. Warranty Period (bảo hành 24 tháng / 12 tháng)
  const warrantyMatch = text.match(/(?:thời gian bảo hành|bảo hành công trình)\s*[:.\-]?\s*(\d+)\s*tháng/i);
  if (warrantyMatch) {
    facts.warrantyPeriodMonths = parseInt(warrantyMatch[1], 10);
  }

  // 4. Advance Payment Percent (tạm ứng 20%, 30%)
  const advanceMatch = text.match(/(?:tạm ứng|tiền tạm ứng)\s*[:.\-]?\s*(\d+)%/i);
  if (advanceMatch) {
    facts.advancePaymentPercent = parseInt(advanceMatch[1], 10);
  }

  return facts;
}

/**
 * Compares live ERP project facts with extracted document facts to discover discrepancies.
 * Invariant: Never automatically override ERP or assume either source is 100% correct.
 */
export function detectERPDocumentConflicts(
  erpFact: ERPProjectFactSnapshot,
  chunks: DocumentChunk[]
): DocumentERPConflict[] {
  const conflicts: DocumentERPConflict[] = [];
  const now = new Date().toISOString();

  // Combine relevant contract chunks
  const fullContractText = chunks
    .filter(c => c.authorityLevel === "CURRENT_APPROVED_CONTRACT" || c.status === "APPROVED")
    .map(c => c.text)
    .join("\n");

  if (!fullContractText) return conflicts;

  const docFacts = extractContractFacts(fullContractText);

  // Check 1: Completion Date Discrepancy
  if (erpFact.endDate && docFacts.completionDate) {
    const erpDateStr = erpFact.endDate.slice(0, 10); // YYYY-MM-DD
    const docDateStr = docFacts.completionDate;

    if (erpDateStr !== docDateStr) {
      const relevantChunk = chunks.find(c =>
        c.text.includes(docDateStr) ||
        (docFacts.completionDate && c.text.includes(docFacts.completionDate.split('-').reverse().join('/')))
      ) || chunks[0];

      conflicts.push({
        conflictCode: "ERP_DOCUMENT_CONFLICT",
        projectId: erpFact.projectId,
        projectCode: erpFact.projectCode,
        documentId: relevantChunk.documentId,
        documentTitle: relevantChunk.documentTitle,
        documentVersion: relevantChunk.documentVersion,
        clauseReference: relevantChunk.clauseReference || "Điều khoản tiến độ",
        erpFactField: "endDate",
        erpFactValue: erpDateStr,
        documentClaimValue: docDateStr,
        discrepancyDescription: `Ngày kết thúc trên hệ thống ERP (${erpDateStr}) không khớp với Thời hạn hoàn thành ghi trong hợp đồng (${docDateStr}).`,
        severity: "HIGH",
        actionRecommendation: "Rà soát lại Phụ lục gia hạn hợp đồng hoặc điều chỉnh ngày kết thúc kế hoạch trên hệ thống ERP.",
        detectedAt: now,
      });
    }
  }

  return conflicts;
}
