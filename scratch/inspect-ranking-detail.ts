import { RETRIEVAL_GOLDEN_SUITE } from '../src/lib/ai/documents/evaluation/retrieval-golden-evaluator';
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

for (const tc of RETRIEVAL_GOLDEN_SUITE) {
  if (tc.isUnauthorized) continue;
  const ev = retrieveDocumentEvidence({
    query: tc.query,
    scope: adminScope,
    topK: 5,
    corpus,
    targetProjectId: tc.targetProjectId,
    targetProjectCode: tc.targetProjectCode,
  });

  const rank = ev.rerankedChunks.findIndex(c => c.documentId === tc.expectedDocumentId) + 1;
  const top1 = ev.rerankedChunks[0];
  const top1Match = top1?.documentId === tc.expectedDocumentId;
  console.log(`[${tc.id}] Expected: ${tc.expectedDocumentId} | Found Rank: ${rank} | Top-1: ${top1?.documentId} (${top1?.documentTitle.slice(0, 30)}) -> ${top1Match ? '✅' : '⚠️'}`);
  if (!top1Match) {
    console.log(`   Query: "${tc.query}"`);
    console.log(`   Top 3 retrieved:`);
    ev.rerankedChunks.slice(0, 3).forEach((c, i) => {
      console.log(`     ${i+1}. [${c.documentId}] (v${c.documentVersion}) [${c.clauseReference || c.sheetName}] ${c.documentTitle.slice(0, 35)}`);
    });
  }
}
