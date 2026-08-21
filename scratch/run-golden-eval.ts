import { evaluateRetrievalGoldenSuite } from '../src/lib/ai/documents/evaluation/retrieval-golden-evaluator';

const metrics = evaluateRetrievalGoldenSuite();
console.log('================================================================');
console.log('AI-02C.1 RETRIEVAL GOLDEN BENCHMARK METRICS RESULTS:');
console.log('================================================================');
console.log(JSON.stringify(metrics, null, 2));
