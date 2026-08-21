import { buildSyntheticQADocumentCorpus } from '../src/lib/ai/__tests__/fixtures/synthetic-qa-document-corpus';

const corpus = buildSyntheticQADocumentCorpus();
console.log('Total chunks in QA Corpus:', corpus.length);

for (const c of corpus) {
  console.log(`- [${c.documentId}] (v${c.documentVersion} ${c.status}) [${c.clauseReference || 'NO_CLAUSE'}] Page ${c.pageNumber}: ${c.documentTitle} -> "${c.text.slice(0, 60)}..."`);
}
