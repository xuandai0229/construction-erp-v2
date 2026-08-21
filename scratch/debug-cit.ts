import { evaluateAnswerCitationCorrectness } from '../src/lib/ai/documents/evaluation/citation-correctness-evaluator';
import { retrieveDocumentEvidence } from '../src/lib/ai/documents/retrieval/hybrid-document-retriever';
import { buildSyntheticQADocumentCorpus } from '../src/lib/ai/__tests__/fixtures/synthetic-qa-document-corpus';
import { DocumentRetrievalScope } from '../src/lib/ai/documents/document-access-policy';

const corpus = buildSyntheticQADocumentCorpus();
const adminScope: DocumentRetrievalScope = {
  userId: 'admin_eval_id',
  userRole: 'ADMIN',
  isGlobal: true,
  allowedProjectIds: ['ALL_AUTHORIZED_PROJECTS'],
  allowedStatuses: ['APPROVED', 'SUBMITTED', 'UNDER_REVIEW', 'DRAFT', 'SUPERSEDED'],
  includeDrafts: true,
  canAccessSensitiveContracts: true,
};

const query = 'Hợp đồng thi công và phụ lục gia hạn quy định tổng giá trị và thời hạn thế nào?';
const evidence = retrieveDocumentEvidence({
  query,
  scope: adminScope,
  corpus,
  topK: 5,
  targetProjectCode: 'CT-2026-0009',
});

console.log('Reranked chunks retrieved:');
evidence.rerankedChunks.forEach((c, i) => {
  console.log(`  ${i+1}. [${c.documentId}] ${c.documentTitle} [${c.clauseReference}] text: ${c.text.slice(0, 60)}...`);
});

const sampleGroundedAnswer = `
Hợp đồng thi công số 12/2025/HĐ-XD quy định tổng giá trị là 125.000.000.000 VNĐ.
Thời hạn hoàn thành bàn giao được điều chỉnh theo Phụ lục hợp đồng 01 đến ngày 30/09/2026.
`;

const res = evaluateAnswerCitationCorrectness(sampleGroundedAnswer, evidence.citations, evidence);
console.log('Evaluation result:', JSON.stringify(res, null, 2));
