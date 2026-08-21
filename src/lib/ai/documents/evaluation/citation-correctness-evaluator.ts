/**
 * CITATION CORRECTNESS & UNSUPPORTED CLAIM EVALUATOR (AI-02C.1)
 * Evaluates whether factual claims made in document answers are backed by their citations.
 */

import { DocumentEvidencePackage, DocumentCitationV2 } from '../document-brain-contracts';

export interface EvaluatedClaim {
  claimText: string;
  citedDocumentId?: string;
  citedClauseOrPage?: string;
  isSupported: boolean;
  supportEvidence?: string;
  violationReason?: string;
}

export interface CitationEvaluationResult {
  totalClaims: number;
  supportedClaims: number;
  unsupportedClaims: number;
  unsupportedClaimRate: number;
  citationCorrectnessRate: number;
  citationCompletenessRate: number;
  hardContractualFails: number;
  claims: EvaluatedClaim[];
}

/**
 * Factual Ground Truth assertions for QA testing corpus:
 */
const CORPUS_GROUND_TRUTH: Record<string, { value: string; documentId: string; clause: string }> = {
  "125.000.000.000": { value: "125 tỷ đồng", documentId: "DOC-QA-001", clause: "Điều 2" },
  "20%": { value: "Tạm ứng 20%", documentId: "DOC-QA-001", clause: "Điều 3" },
  "15/08/2026": { value: "Hợp đồng gốc 15/08/2026", documentId: "DOC-QA-001", clause: "Điều 4" },
  "30/09/2026": { value: "Phụ lục gia hạn 30/09/2026", documentId: "DOC-QA-002", clause: "Điều 1" },
  "0.05%": { value: "Phạt 0.05%/ngày, max 8%", documentId: "DOC-QA-001", clause: "Điều 5" },
  "24 tháng": { value: "Bảo hành 24 tháng", documentId: "DOC-QA-001", clause: "Điều 6" },
  "45 tấn": { value: "Thép Hòa Phát D20 45 tấn", documentId: "DOC-QA-003", clause: "Điều 1" },
  "142/LAS-XD": { value: "Phiếu thí nghiệm 142/LAS-XD", documentId: "DOC-QA-003", clause: "Điều 1" },
  "-8.50m": { value: "Cao độ đáy móng -8.50m", documentId: "DOC-QA-004", clause: "Điều 1.1" },
  "8 mốc": { value: "8 mốc quan trắc lún", documentId: "DOC-QA-004", clause: "Điều 1.2" },
  "380.000": { value: "Đơn giá cát vàng 380.000 VNĐ", documentId: "DOC-QA-005", clause: "VatTuChinh" },
  "37.500.000.000": { value: "Đợt 2 giải ngân 37.5 tỷ", documentId: "DOC-QA-005", clause: "KeHoachGiaiNgan" },
  "100%": { value: "100% công nhân trang bị PPE", documentId: "DOC-QA-008", clause: "Điều 1" },
  "06h45": { value: "Họp an toàn 06h45", documentId: "DOC-QA-008", clause: "Điều 2" },
};

/**
 * Evaluates an AI response text against citations and evidence package.
 */
export function evaluateAnswerCitationCorrectness(
  responseText: string,
  citations: DocumentCitationV2[],
  evidencePackage: DocumentEvidencePackage
): CitationEvaluationResult {
  const claims: EvaluatedClaim[] = [];
  let totalClaims = 0;
  let supportedClaims = 0;
  let unsupportedClaims = 0;
  let hardContractualFails = 0;

  // Extract key factual entities from response
  for (const [key, truth] of Object.entries(CORPUS_GROUND_TRUTH)) {
    if (responseText.includes(key)) {
      totalClaims++;
      
      // Check if evidence package includes matching document
      const matchingChunk = evidencePackage.rerankedChunks.find(c => c.documentId === truth.documentId);
      const matchingCitation = citations.find(c => c.documentId === truth.documentId);

      if (matchingChunk && matchingChunk.text.includes(key)) {
        supportedClaims++;
        claims.push({
          claimText: `Nhắc đến giá trị '${key}' (${truth.value})`,
          citedDocumentId: truth.documentId,
          citedClauseOrPage: truth.clause,
          isSupported: true,
          supportEvidence: `Tìm thấy trong chunk ${matchingChunk.chunkId}: [${matchingChunk.clauseReference || matchingChunk.sheetName}]`,
        });
      } else {
        unsupportedClaims++;
        if (truth.documentId === "DOC-QA-001" || truth.documentId === "DOC-QA-002") {
          hardContractualFails++;
        }
        claims.push({
          claimText: `Nhắc đến giá trị '${key}' (${truth.value})`,
          citedDocumentId: matchingCitation?.documentId,
          isSupported: false,
          violationReason: `Giá trị '${key}' không được hỗ trợ bởi bằng chứng trong các chunk đã trích xuất!`,
        });
      }
    }
  }

  const unsupportedClaimRate = totalClaims > 0 ? Number((unsupportedClaims / totalClaims).toFixed(4)) : 0;
  const citationCorrectnessRate = totalClaims > 0 ? Number((supportedClaims / totalClaims).toFixed(4)) : 1.0;
  const citationCompletenessRate = citations.length > 0 ? 1.0 : 0.0;

  return {
    totalClaims,
    supportedClaims,
    unsupportedClaims,
    unsupportedClaimRate,
    citationCorrectnessRate,
    citationCompletenessRate,
    hardContractualFails,
    claims,
  };
}
