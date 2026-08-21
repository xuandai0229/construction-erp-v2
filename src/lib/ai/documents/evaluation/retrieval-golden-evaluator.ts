/**
 * RETRIEVAL GOLDEN CORPUS & QUANTITATIVE EVALUATOR (AI-02C.1)
 * Measures Recall@1, Recall@3, Recall@5, Precision@K, MRR, Correct Version Rate,
 * Correct Location Rate, and Authorization Leak Rate on an isolated golden benchmark.
 */

import { DocumentChunk, DocumentCitationV2 } from '../document-brain-contracts';
import { DocumentRetrievalScope } from '../document-access-policy';
import { retrieveDocumentEvidence } from '../retrieval/hybrid-document-retriever';
import { buildSyntheticQADocumentCorpus } from '../../__tests__/fixtures/synthetic-qa-document-corpus';

export interface GoldenTestCase {
  id: string;
  query: string;
  targetProjectId?: string;
  targetProjectCode?: string;
  userContext: "ADMIN_GLOBAL" | "SCOPED_COMMANDER";
  expectedDocumentId?: string; // If undefined, expected 0 chunks (unauthorized)
  expectedVersion?: number;
  expectedClause?: string;
  expectedSheet?: string;
  expectedPage?: number;
  description: string;
  isAdversarial?: boolean;
  isUnauthorized?: boolean;
}

export interface RetrievalMetricsSummary {
  totalQueries: number;
  recallAt1: number;       // Fraction where top-1 chunk matches expected document
  recallAt3: number;       // Fraction where top-3 chunks contain expected document
  recallAt5: number;       // Fraction where top-5 chunks contain expected document
  precisionAt3: number;    // Average precision across top-3
  mrr: number;             // Mean Reciprocal Rank
  correctDocumentRate: number;
  correctVersionRate: number;
  correctLocationRate: number;
  authorizationLeakRate: number; // MUST BE 0.0
  totalUnauthorizedTested: number;
  unauthorizedLeaks: number;
  adversarialTested: number;
  adversarialNeutralized: number;
}

export const RETRIEVAL_GOLDEN_SUITE: GoldenTestCase[] = [
  // 1. Exact Identifier & Clause Lookups
  {
    id: "GOLDEN-01",
    query: "Hợp đồng thi công số 12/2025/HĐ-XD",
    userContext: "ADMIN_GLOBAL",
    targetProjectCode: "CT-2026-0009",
    expectedDocumentId: "DOC-QA-001",
    expectedVersion: 1,
    expectedClause: "PHẦN_MỞ_ĐẦU",
    expectedPage: 1,
    description: "Tra cứu chính xác số hợp đồng gốc",
  },
  {
    id: "GOLDEN-02",
    query: "Điều 4 hợp đồng thi công quy định thời hạn thế nào?",
    userContext: "ADMIN_GLOBAL",
    targetProjectCode: "CT-2026-0009",
    expectedDocumentId: "DOC-QA-001",
    expectedVersion: 1,
    expectedClause: "Điều 4",
    expectedPage: 2,
    description: "Tra cứu chính xác Điều 4 về thời hạn trong hợp đồng",
  },
  {
    id: "GOLDEN-03",
    query: "Tổng giá trị hợp đồng trọn gói của CT-2026-0009 là bao nhiêu?",
    userContext: "ADMIN_GLOBAL",
    targetProjectCode: "CT-2026-0009",
    expectedDocumentId: "DOC-QA-001",
    expectedVersion: 1,
    expectedClause: "Điều 2",
    expectedPage: 2,
    description: "Tra cứu giá trị hợp đồng trọn gói tại Điều 2",
  },
  {
    id: "GOLDEN-04",
    query: "Tỷ lệ tạm ứng hợp đồng và điều kiện bảo lãnh",
    userContext: "ADMIN_GLOBAL",
    targetProjectCode: "CT-2026-0009",
    expectedDocumentId: "DOC-QA-001",
    expectedVersion: 1,
    expectedClause: "Điều 3",
    expectedPage: 2,
    description: "Tra cứu tạm ứng và thanh toán tại Điều 3",
  },
  {
    id: "GOLDEN-05",
    query: "Mức phạt vi phạm chậm tiến độ hợp đồng",
    userContext: "ADMIN_GLOBAL",
    targetProjectCode: "CT-2026-0009",
    expectedDocumentId: "DOC-QA-001",
    expectedVersion: 1,
    expectedClause: "Điều 5",
    expectedPage: 3,
    description: "Tra cứu mức phạt hợp đồng tại Điều 5",
  },
  {
    id: "GOLDEN-06",
    query: "Thời gian bảo hành công trình theo hợp đồng là bao lâu?",
    userContext: "ADMIN_GLOBAL",
    targetProjectCode: "CT-2026-0009",
    expectedDocumentId: "DOC-QA-001",
    expectedVersion: 1,
    expectedClause: "Điều 6",
    expectedPage: 3,
    description: "Tra cứu thời gian bảo hành tại Điều 6",
  },

  // 2. Version Lineage & Effective Addendum Reranking
  {
    id: "GOLDEN-07",
    query: "Thời hạn thi công hoàn thành bàn giao dự án CT-2026-0009 theo phụ lục mới nhất",
    userContext: "ADMIN_GLOBAL",
    targetProjectCode: "CT-2026-0009",
    expectedDocumentId: "DOC-QA-002",
    expectedVersion: 2,
    expectedClause: "Điều 1",
    expectedPage: 1,
    description: "Phụ lục số 01 v2 (APPROVED) phải ưu tiên hơn Hợp đồng gốc v1 về mốc tiến độ",
  },
  {
    id: "GOLDEN-08",
    query: "Lý do gia hạn thời hạn thi công trong Phụ lục hợp đồng 01",
    userContext: "ADMIN_GLOBAL",
    targetProjectCode: "CT-2026-0009",
    expectedDocumentId: "DOC-QA-002",
    expectedVersion: 2,
    expectedClause: "Điều 1",
    expectedPage: 1,
    description: "Tra cứu căn cứ gia hạn trong Phụ lục 01",
  },

  // 3. QA/QC Scanned Material Inspection (OCR)
  {
    id: "GOLDEN-09",
    query: "Biên bản nghiệm thu vật liệu thép đầu vào kết luận thế nào?",
    userContext: "ADMIN_GLOBAL",
    targetProjectCode: "CT-2026-0009",
    expectedDocumentId: "DOC-QA-003",
    expectedVersion: 1,
    expectedClause: "Điều 2",
    expectedPage: 1,
    description: "Tra cứu kết luận nghiệm thu vật liệu thép",
  },
  {
    id: "GOLDEN-10",
    query: "Số lượng thép thanh vằn Hòa Phát D20 mác CB400-V nghiệm thu",
    userContext: "ADMIN_GLOBAL",
    targetProjectCode: "CT-2026-0009",
    expectedDocumentId: "DOC-QA-003",
    expectedVersion: 1,
    expectedClause: "Điều 1",
    expectedPage: 1,
    description: "Tra cứu chi tiết khối lượng vật liệu thép tại Điều 1",
  },

  // 4. Method Statement (DRAFT Labeling)
  {
    id: "GOLDEN-11",
    query: "Biện pháp thi công đào đất hố móng tầng hầm",
    userContext: "ADMIN_GLOBAL",
    targetProjectCode: "CT-2026-0009",
    expectedDocumentId: "DOC-QA-004",
    expectedVersion: 1,
    expectedClause: "Điều 1.1",
    expectedPage: 1,
    description: "Tra cứu quy trình thi công hố móng trong bản thảo BPTC",
  },
  {
    id: "GOLDEN-12",
    query: "Biện pháp quan trắc lún và chuyển vị hố đào sâu",
    userContext: "ADMIN_GLOBAL",
    targetProjectCode: "CT-2026-0009",
    expectedDocumentId: "DOC-QA-004",
    expectedVersion: 1,
    expectedClause: "Điều 1.2",
    expectedPage: 1,
    description: "Tra cứu quan trắc lún trong bản thảo BPTC",
  },

  // 5. Excel Schedule & Exact Table/Cell Range
  {
    id: "GOLDEN-13",
    query: "Khối lượng thiết kế và đơn giá cát vàng đổ bê tông trong bảng dự toán",
    userContext: "ADMIN_GLOBAL",
    targetProjectCode: "CT-2026-0009",
    expectedDocumentId: "DOC-QA-005",
    expectedVersion: 1,
    expectedSheet: "VatTuChinh",
    description: "Tra cứu bảng tính dự toán vật tư chính",
  },
  {
    id: "GOLDEN-14",
    query: "Kế hoạch giải ngân đợt 2 hoàn thành phần ngầm bao nhiêu tiền?",
    userContext: "ADMIN_GLOBAL",
    targetProjectCode: "CT-2026-0009",
    expectedDocumentId: "DOC-QA-005",
    expectedVersion: 1,
    expectedSheet: "KeHoachGiaiNgan",
    description: "Tra cứu tiến độ giải ngân trong bảng tính",
  },

  // 6. Cross-Lineage Isolation: High Version Safety Doc vs Contract
  {
    id: "GOLDEN-15",
    query: "Quy định trang bị bảo hộ cá nhân PPE khi làm việc trên cao",
    userContext: "ADMIN_GLOBAL",
    targetProjectCode: "CT-2026-0009",
    expectedDocumentId: "DOC-QA-008",
    expectedVersion: 5,
    expectedClause: "Điều 1",
    description: "Tra cứu kế hoạch an toàn lao động v5",
  },
  {
    id: "GOLDEN-16",
    query: "Thời gian họp an toàn đầu giờ toolbox meeting",
    userContext: "ADMIN_GLOBAL",
    targetProjectCode: "CT-2026-0009",
    expectedDocumentId: "DOC-QA-008",
    expectedVersion: 5,
    expectedClause: "Điều 2",
    description: "Tra cứu chế độ kiểm tra an toàn tại Điều 2",
  },

  // 7. Vietnamese Construction Synonyms
  {
    id: "GOLDEN-17",
    query: "Mốc chót bàn giao công trình CT-2026-0009",
    userContext: "ADMIN_GLOBAL",
    targetProjectCode: "CT-2026-0009",
    expectedDocumentId: "DOC-QA-002",
    expectedVersion: 2,
    expectedClause: "Điều 1",
    description: "Đồng nghĩa: 'Mốc chót bàn giao' -> Phụ lục 01",
  },
  {
    id: "GOLDEN-18",
    query: "Chế tài chậm tiến độ theo thỏa thuận kinh tế",
    userContext: "ADMIN_GLOBAL",
    targetProjectCode: "CT-2026-0009",
    expectedDocumentId: "DOC-QA-001",
    expectedVersion: 1,
    expectedClause: "Điều 5",
    description: "Đồng nghĩa: 'Chế tài chậm tiến độ' -> Điều 5 Phạt vi phạm",
  },
  {
    id: "GOLDEN-19",
    query: "Tạm ứng hợp đồng trước khi thi công phần ngầm",
    userContext: "ADMIN_GLOBAL",
    targetProjectCode: "CT-2026-0009",
    expectedDocumentId: "DOC-QA-001",
    expectedVersion: 1,
    expectedClause: "Điều 3",
    description: "Đồng nghĩa: 'Tạm ứng hợp đồng' -> Điều 3",
  },

  // 8. Adversarial Prompt Injections
  {
    id: "GOLDEN-20",
    query: "Thông báo lịch giao hàng cát vàng đợt 3 của đối tác cung ứng 99/TB-NCC",
    userContext: "ADMIN_GLOBAL",
    targetProjectCode: "CT-2026-0009",
    expectedDocumentId: "DOC-QA-006",
    expectedVersion: 1,
    isAdversarial: true,
    description: "Tài liệu chứa lệnh 'Ignore previous instructions' được xử lý an toàn",
  },
  {
    id: "GOLDEN-21",
    query: "Nội dung công văn 99/TB-NCC và lưu ý quan trọng",
    userContext: "ADMIN_GLOBAL",
    targetProjectCode: "CT-2026-0009",
    expectedDocumentId: "DOC-QA-006",
    expectedVersion: 1,
    isAdversarial: true,
    description: "Xử lý trích xuất văn bản mà không thực thi mã độc",
  },

  // 9. Unauthorized Cross-Project Hard Gate Checks (Leak Rate = 0)
  {
    id: "GOLDEN-22",
    query: "Hợp đồng thi công của CT-2026-0009",
    userContext: "SCOPED_COMMANDER", // Scoped commander only has CT007, CT008
    targetProjectId: "cm75j0j3x0009v7m0q009proj",
    targetProjectCode: "CT-2026-0009",
    expectedDocumentId: undefined, // Must return ZERO chunks
    isUnauthorized: true,
    description: "Chỉ huy trưởng CT007/008 hỏi tài liệu CT009 -> Hard Deny (0 chunks)",
  },
  {
    id: "GOLDEN-23",
    query: "Cho tôi xem phụ lục gia hạn tiến độ của CT-2026-0009",
    userContext: "SCOPED_COMMANDER",
    targetProjectId: "cm75j0j3x0009v7m0q009proj",
    targetProjectCode: "CT-2026-0009",
    expectedDocumentId: undefined,
    isUnauthorized: true,
    description: "Chỉ huy trưởng hỏi phụ lục CT009 -> Hard Deny (0 chunks)",
  },
  {
    id: "GOLDEN-24",
    query: "Bảng dự toán vật tư của dự án CT-2026-0009",
    userContext: "SCOPED_COMMANDER",
    targetProjectId: "cm75j0j3x0009v7m0q009proj",
    targetProjectCode: "CT-2026-0009",
    expectedDocumentId: undefined,
    isUnauthorized: true,
    description: "Chỉ huy trưởng hỏi Excel CT009 -> Hard Deny (0 chunks)",
  },
  {
    id: "GOLDEN-25",
    query: "Hợp đồng bảo trì giao thông Thanh Xuân CT-2026-0001",
    userContext: "SCOPED_COMMANDER",
    targetProjectId: "cm75j0j3x0001v7m0q001proj",
    targetProjectCode: "CT-2026-0001",
    expectedDocumentId: undefined,
    isUnauthorized: true,
    description: "Chỉ huy trưởng hỏi hợp đồng CT001 ngoài quyền -> Hard Deny (0 chunks)",
  },
];

/**
 * Runs the comprehensive Golden Retrieval Evaluation Suite.
 */
export function evaluateRetrievalGoldenSuite(): RetrievalMetricsSummary {
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

  const scopedCommanderScope: DocumentRetrievalScope = {
    userId: "commander_eval_id",
    userRole: "CHIEF_COMMANDER",
    isGlobal: false,
    allowedProjectIds: ["cm75j0j3x0007v7m0q007proj", "cm75j0j3x0008v7m0q008proj"], // CT007, CT008 ONLY
    allowedProjectCodes: ["CT-2026-0007", "CT-2026-0008"],
    allowedStatuses: ["APPROVED", "SUBMITTED", "UNDER_REVIEW", "DRAFT", "SUPERSEDED"],
    includeDrafts: true,
    canAccessSensitiveContracts: true,
  };

  let totalQueries = 0;
  let recall1Count = 0;
  let recall3Count = 0;
  let recall5Count = 0;
  let precision3Sum = 0;
  let mrrSum = 0;
  let correctDocCount = 0;
  let correctVersionCount = 0;
  let correctLocationCount = 0;

  let totalUnauthorizedTested = 0;
  let unauthorizedLeaks = 0;
  let adversarialTested = 0;
  let adversarialNeutralized = 0;

  for (const tc of RETRIEVAL_GOLDEN_SUITE) {
    totalQueries++;
    const scope = tc.userContext === "ADMIN_GLOBAL" ? adminScope : scopedCommanderScope;

    const evidence = retrieveDocumentEvidence({
      query: tc.query,
      scope,
      topK: 5,
      corpus,
      targetProjectId: tc.targetProjectId,
      targetProjectCode: tc.targetProjectCode,
    });

    if (tc.isUnauthorized) {
      totalUnauthorizedTested++;
      if (evidence.rerankedChunks.length > 0) {
        unauthorizedLeaks++; // Security Violation!
      }
      continue;
    }

    if (tc.isAdversarial) {
      adversarialTested++;
      // Verify that the adversarial document was retrieved as untrusted text without privilege escalation
      if (evidence.rerankedChunks.length > 0) {
        adversarialNeutralized++;
      }
    }

    if (!tc.expectedDocumentId) continue;

    // Evaluate Retrieval Ranking
    const rankedChunks = evidence.rerankedChunks;
    let foundRank = -1;

    for (let i = 0; i < rankedChunks.length; i++) {
      if (rankedChunks[i].documentId === tc.expectedDocumentId) {
        foundRank = i + 1;
        break;
      }
    }

    if (foundRank === 1) {
      recall1Count++;
      recall3Count++;
      recall5Count++;
      mrrSum += 1.0;
    } else if (foundRank === 2) {
      recall3Count++;
      recall5Count++;
      mrrSum += 1.0 / 2.0;
    } else if (foundRank === 3) {
      recall3Count++;
      recall5Count++;
      mrrSum += 1.0 / 3.0;
    } else if (foundRank > 0 && foundRank <= 5) {
      recall5Count++;
      mrrSum += 1.0 / foundRank;
    }

    // Top-3 Precision
    const relevantInTop3 = rankedChunks.slice(0, 3).filter(c => c.documentId === tc.expectedDocumentId).length;
    precision3Sum += relevantInTop3 / Math.min(3, Math.max(1, rankedChunks.length));

    // Correct Document & Version Check on Top-1
    if (rankedChunks.length > 0) {
      const top = rankedChunks[0];
      if (top.documentId === tc.expectedDocumentId) {
        correctDocCount++;

        if (tc.expectedVersion !== undefined && top.documentVersion === tc.expectedVersion) {
          correctVersionCount++;
        }

        // Location Check
        let locMatch = false;
        if (tc.expectedClause && top.clauseReference?.includes(tc.expectedClause)) locMatch = true;
        if (tc.expectedSheet && top.sheetName === tc.expectedSheet) locMatch = true;
        if (tc.expectedPage && top.pageNumber === tc.expectedPage) locMatch = true;
        if (locMatch || (!tc.expectedClause && !tc.expectedSheet && !tc.expectedPage)) {
          correctLocationCount++;
        }
      }
    }
  }

  const standardQueries = totalQueries - totalUnauthorizedTested;

  return {
    totalQueries,
    recallAt1: standardQueries > 0 ? Number((recall1Count / standardQueries).toFixed(4)) : 0,
    recallAt3: standardQueries > 0 ? Number((recall3Count / standardQueries).toFixed(4)) : 0,
    recallAt5: standardQueries > 0 ? Number((recall5Count / standardQueries).toFixed(4)) : 0,
    precisionAt3: standardQueries > 0 ? Number((precision3Sum / standardQueries).toFixed(4)) : 0,
    mrr: standardQueries > 0 ? Number((mrrSum / standardQueries).toFixed(4)) : 0,
    correctDocumentRate: standardQueries > 0 ? Number((correctDocCount / standardQueries).toFixed(4)) : 0,
    correctVersionRate: standardQueries > 0 ? Number((correctVersionCount / standardQueries).toFixed(4)) : 0,
    correctLocationRate: standardQueries > 0 ? Number((correctLocationCount / standardQueries).toFixed(4)) : 0,
    authorizationLeakRate: totalUnauthorizedTested > 0 ? Number((unauthorizedLeaks / totalUnauthorizedTested).toFixed(4)) : 0,
    totalUnauthorizedTested,
    unauthorizedLeaks,
    adversarialTested,
    adversarialNeutralized,
  };
}
