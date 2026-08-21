import { evaluateAnswerCitationCorrectness } from '../src/lib/ai/documents/evaluation/citation-correctness-evaluator';
import { retrieveDocumentEvidence } from '../src/lib/ai/documents/retrieval/hybrid-document-retriever';
import { buildSyntheticQADocumentCorpus } from '../src/lib/ai/__tests__/fixtures/synthetic-qa-document-corpus';
import { DocumentRetrievalScope } from '../src/lib/ai/documents/document-access-policy';

const corpus = buildSyntheticQADocumentCorpus();
const adminScope: DocumentRetrievalScope = {
  userId: "admin_eval_id",
  userRole: "ADMIN",
  isGlobal: true,
  allowedProjectIds: ["ALL_AUTHORIZED_PROJECTS"],
  allowedStatuses: ["APPROVED", "SUBMITTED", "UNDER_REVIEW", "DRAFT", "SUPERSEDED"],
  includeDrafts: true,
  canAccessSensitiveContracts: true,
};

const query = "Theo hợp đồng, thời hạn hoàn thành và giá trị của CT-2026-0009 là bao nhiêu?";
const evidence = retrieveDocumentEvidence({
  query,
  scope: adminScope,
  corpus,
  targetProjectCode: "CT-2026-0009",
});

// Sample Answer 1: Grounded answer with facts from evidence
const sampleGroundedAnswer = `
Hợp đồng thi công số 12/2025/HĐ-XD quy định tổng giá trị hợp đồng trọn gói là 125.000.000.000 VNĐ (tạm ứng 20%).
Thời hạn thi công ban đầu theo hợp đồng gốc là 15/08/2026, sau đó Phụ lục hợp đồng số 01/2026/PLHĐ-CT009 đã gia hạn hoàn thành đến ngày 30/09/2026.
`;

const res1 = evaluateAnswerCitationCorrectness(sampleGroundedAnswer, evidence.citations, evidence);
console.log('================================================================');
console.log('EVALUATION 1: Grounded AI Response (Supported Claims)');
console.log('================================================================');
console.log('Total Claims Found:', res1.totalClaims);
console.log('Supported Claims:', res1.supportedClaims);
console.log('Unsupported Claims:', res1.unsupportedClaims);
console.log('Unsupported Claim Rate:', res1.unsupportedClaimRate);
console.log('Citation Correctness Rate:', res1.citationCorrectnessRate);
console.log('Hard Contractual Fails:', res1.hardContractualFails);

// Sample Answer 2: Hallucinated / Unsupported claim
const sampleHallucinatedAnswer = `
Tổng giá trị hợp đồng là 999.000.000.000 VNĐ và ngày hoàn thành là 31/12/2099.
`;
const res2 = evaluateAnswerCitationCorrectness(sampleHallucinatedAnswer, evidence.citations, evidence);
console.log('\n================================================================');
console.log('EVALUATION 2: Hallucinated / Out-of-Corpus Claim');
console.log('================================================================');
console.log('Total Claims Found:', res2.totalClaims);
console.log('Unsupported Claim Rate:', res2.unsupportedClaimRate);
