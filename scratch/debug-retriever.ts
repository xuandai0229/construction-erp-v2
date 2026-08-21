import { buildSyntheticQADocumentCorpus } from '../src/lib/ai/__tests__/fixtures/synthetic-qa-document-corpus';
import { resolveDocumentRetrievalScope, isDocumentChunkAuthorized } from '../src/lib/ai/documents/document-access-policy';
import { retrieveDocumentEvidence } from '../src/lib/ai/documents/retrieval/hybrid-document-retriever';
import { AIRequestContext } from '../src/lib/ai/types';

const mockAdminContext: AIRequestContext = {
  userId: "admin_user_id",
  userRole: "ADMIN",
  projectScope: {
    isGlobal: true,
    allowedProjectIds: [],
    effectiveRole: "ADMIN",
  },
  systemSettings: { aiReadOnlyEnabled: true },
  requestId: "req_test_admin",
  conversationId: "conv_test",
};

const scope = resolveDocumentRetrievalScope(mockAdminContext, "cm71_real_db_id", "CT-2026-0009");
console.log('Scope:', scope);

const corpus = buildSyntheticQADocumentCorpus();
console.log('Sample chunk:', {
  projectId: corpus[0].projectId,
  projectCode: corpus[0].projectCode,
  status: corpus[0].status
});

const isAuth = isDocumentChunkAuthorized(corpus[0].projectId, corpus[0].status, scope, corpus[0].projectCode);
console.log('isDocumentChunkAuthorized for chunk 0:', isAuth);

const evidence = retrieveDocumentEvidence({
  query: "Hợp đồng nói gì về thời hạn hoàn thành của CT-2026-0009?",
  scope,
  corpus,
  targetProjectId: "cm71_real_db_id",
  targetProjectCode: "CT-2026-0009",
});

console.log('Retrieved chunks count:', evidence.retrievedChunks.length);
console.log('Reranked chunks count:', evidence.rerankedChunks.length);
if (evidence.rerankedChunks.length > 0) {
  console.log('Top chunk:', evidence.rerankedChunks[0].documentTitle, 'v' + evidence.rerankedChunks[0].documentVersion);
}
