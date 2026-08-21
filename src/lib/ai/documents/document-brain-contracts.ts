/**
 * DOCUMENT BRAIN V1 CONTRACTS & TYPES
 * Enterprise Construction Document Intelligence & Permission-Aware RAG
 */

export type DocumentIntelligenceStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "ARCHIVED"
  | "SUPERSEDED";

export type DocumentAuthorityLevel =
  | "CURRENT_ERP_FACT"               // Live transactional database records
  | "CURRENT_APPROVED_CONTRACT"      // Approved legal agreements, signed addenda
  | "APPROVED_METHOD_STATEMENT"      // Approved BPTC / technical specifications
  | "APPROVED_INSPECTION_RECORD"     // Approved BB nghiệm thu, QA/QC tests
  | "APPROVED_HISTORICAL_DOCUMENT"   // Superseded or past approved revisions
  | "AUTHORIZED_DRAFT"               // Drafts currently under review
  | "DERIVED_METRIC"                 // Computed deterministic metrics
  | "AI_INFERENCE";                  // LLM synthesized deductions

export type FactType =
  | "CONTRACTUAL_DEADLINE"       // Legal contractual milestones & completion dates
  | "CONTRACT_TOTAL_VALUE"       // Base approved contract value
  | "APPROVED_VARIATION_VALUE"   // Additional variation / addendum financial value
  | "PAID_AMOUNT"                // Cumulative disbursed / paid amount
  | "ADVANCE_AMOUNT"             // Advance payment terms & percentages
  | "ERP_WORKFLOW_STATE"         // Approval state in ERP system
  | "ACTUAL_PROGRESS"            // Verified completed site work (Inspection/Field records)
  | "PLANNED_PROGRESS"           // Baseline project schedule / baseline curve
  | "TECHNICAL_METHOD"           // Execution methods, equipment specs, engineering procedures
  | "QUALITY_ACCEPTANCE"         // Material testing (LAS-XD), QA/QC acceptance records
  | "GENERAL_FACT";              // General company / project metadata

export type FactDomain = FactType; // Backward compatibility alias

export interface FactAuthorityRanking {
  factType: FactType;
  hierarchy: DocumentAuthorityLevel[];
  description: string;
}

export type DomainAuthorityRanking = FactAuthorityRanking;

/**
 * SOURCE_AUTHORITY_POLICY_V2:
 * Granular fact-type authority policy.
 * Invariant: Method Statement (BPTC) is NEVER an authority for ACTUAL_PROGRESS.
 */
export const SOURCE_AUTHORITY_POLICY_V2: Record<FactType, FactAuthorityRanking> = {
  CONTRACTUAL_DEADLINE: {
    factType: "CONTRACTUAL_DEADLINE",
    hierarchy: [
      "CURRENT_APPROVED_CONTRACT", // Current effective Addendum / Contract
      "APPROVED_HISTORICAL_DOCUMENT",
      "CURRENT_ERP_FACT",          // ERP planning field
      "AUTHORIZED_DRAFT",
      "DERIVED_METRIC",
      "AI_INFERENCE",
    ],
    description: "Thời hạn hợp đồng: Phụ lục đã duyệt > Hợp đồng gốc > Dữ liệu kế hoạch ERP > Bản thảo",
  },
  CONTRACT_TOTAL_VALUE: {
    factType: "CONTRACT_TOTAL_VALUE",
    hierarchy: [
      "CURRENT_APPROVED_CONTRACT",
      "APPROVED_HISTORICAL_DOCUMENT",
      "CURRENT_ERP_FACT",
      "AUTHORIZED_DRAFT",
      "AI_INFERENCE",
    ],
    description: "Tổng giá trị hợp đồng trọn gói: Hợp đồng đã ký duyệt > Lịch sử hợp đồng > ERP > Bản thảo",
  },
  APPROVED_VARIATION_VALUE: {
    factType: "APPROVED_VARIATION_VALUE",
    hierarchy: [
      "CURRENT_APPROVED_CONTRACT", // Phụ lục bổ sung giá trị
      "CURRENT_ERP_FACT",
      "APPROVED_HISTORICAL_DOCUMENT",
      "AUTHORIZED_DRAFT",
      "AI_INFERENCE",
    ],
    description: "Giá trị phụ lục phát sinh: Phụ lục hợp đồng đã duyệt > Ghi nhận ERP > Bản thảo",
  },
  PAID_AMOUNT: {
    factType: "PAID_AMOUNT",
    hierarchy: [
      "CURRENT_ERP_FACT",          // Lịch sử giải ngân thật trong ERP kế toán
      "APPROVED_INSPECTION_RECORD", // Biên bản xác nhận khối lượng thanh toán
      "CURRENT_APPROVED_CONTRACT",
      "AUTHORIZED_DRAFT",
      "AI_INFERENCE",
    ],
    description: "Số tiền đã giải ngân/thanh toán: Kế toán ERP > Biên bản xác nhận thanh toán > Hợp đồng",
  },
  ADVANCE_AMOUNT: {
    factType: "ADVANCE_AMOUNT",
    hierarchy: [
      "CURRENT_APPROVED_CONTRACT", // Điều khoản tạm ứng trong hợp đồng
      "CURRENT_ERP_FACT",          // Phiếu chi tạm ứng ERP
      "AUTHORIZED_DRAFT",
      "AI_INFERENCE",
    ],
    description: "Tỷ lệ và số tiền tạm ứng: Hợp đồng đã ký duyệt > Phiếu chi tạm ứng ERP > Bản thảo",
  },
  ERP_WORKFLOW_STATE: {
    factType: "ERP_WORKFLOW_STATE",
    hierarchy: [
      "CURRENT_ERP_FACT",          // Trạng thái phê duyệt thật trong ERP database
      "APPROVED_INSPECTION_RECORD",
      "CURRENT_APPROVED_CONTRACT",
      "AUTHORIZED_DRAFT",
      "AI_INFERENCE",
    ],
    description: "Trạng thái quy trình & Phê duyệt ERP: Cơ sở dữ liệu ERP > Tài liệu đính kèm > Bản thảo",
  },
  ACTUAL_PROGRESS: {
    factType: "ACTUAL_PROGRESS",
    hierarchy: [
      "APPROVED_INSPECTION_RECORD", // Biên bản nghiệm thu công việc / Hạng mục hoàn thành
      "CURRENT_ERP_FACT",          // Tiến độ tính toán hệ thống (ProgressSync)
      "APPROVED_HISTORICAL_DOCUMENT",
      "AUTHORIZED_DRAFT",
      "AI_INFERENCE",
      // NOTE: APPROVED_METHOD_STATEMENT is strictly EXCLUDED (BPTC describes planned method, not actual progress)
    ],
    description: "Tiến độ thi công thực tế: Biên bản nghiệm thu/Nhật ký hiện trường > Chỉ số ERP (Không dùng BPTC)",
  },
  PLANNED_PROGRESS: {
    factType: "PLANNED_PROGRESS",
    hierarchy: [
      "CURRENT_APPROVED_CONTRACT",  // Mốc tiến độ trong hợp đồng/phụ lục
      "APPROVED_METHOD_STATEMENT",  // Bảng tiến độ thi công chi tiết trong BPTC
      "CURRENT_ERP_FACT",
      "AUTHORIZED_DRAFT",
      "AI_INFERENCE",
    ],
    description: "Tiến độ kế hoạch: Mốc hợp đồng > Bảng tiến độ trong BPTC > Kế hoạch ERP",
  },
  TECHNICAL_METHOD: {
    factType: "TECHNICAL_METHOD",
    hierarchy: [
      "APPROVED_METHOD_STATEMENT",  // Biện pháp thi công (BPTC) đã duyệt
      "CURRENT_APPROVED_CONTRACT",  // Yêu cầu kỹ thuật trong hợp đồng
      "APPROVED_INSPECTION_RECORD",
      "CURRENT_ERP_FACT",
      "AUTHORIZED_DRAFT",           // Bản thảo BPTC nội bộ
      "AI_INFERENCE",
    ],
    description: "Biện pháp thi công & Tiêu chuẩn kỹ thuật: BPTC đã duyệt > Hợp đồng > Biên bản nghiệm thu > Bản thảo BPTC",
  },
  QUALITY_ACCEPTANCE: {
    factType: "QUALITY_ACCEPTANCE",
    hierarchy: [
      "APPROVED_INSPECTION_RECORD", // Biên bản nghiệm thu, CO/CQ, thí nghiệm nén mẫu (LAS-XD)
      "APPROVED_METHOD_STATEMENT",
      "CURRENT_ERP_FACT",
      "APPROVED_HISTORICAL_DOCUMENT",
      "AUTHORIZED_DRAFT",
      "AI_INFERENCE",
    ],
    description: "Nghiệm thu chất lượng & Vật liệu đầu vào: Biên bản nghiệm thu đã ký > BPTC > Nhật ký ERP > Bản thảo",
  },
  GENERAL_FACT: {
    factType: "GENERAL_FACT",
    hierarchy: [
      "CURRENT_ERP_FACT",
      "CURRENT_APPROVED_CONTRACT",
      "APPROVED_METHOD_STATEMENT",
      "APPROVED_INSPECTION_RECORD",
      "APPROVED_HISTORICAL_DOCUMENT",
      "AUTHORIZED_DRAFT",
      "DERIVED_METRIC",
      "AI_INFERENCE",
    ],
    description: "Thông tin chung công trình: ERP database > Hồ sơ pháp lý đã duyệt > Thuyết minh kỹ thuật",
  },
};

/**
 * Resolves the relative authority weight for a chunk given the query's business fact type.
 */
export function getDomainAuthorityRank(domainOrFact: FactType | FactDomain, level: DocumentAuthorityLevel): number {
  const ranking = SOURCE_AUTHORITY_POLICY_V2[domainOrFact as FactType] || SOURCE_AUTHORITY_POLICY_V2.GENERAL_FACT;
  const idx = ranking.hierarchy.indexOf(level);
  return idx >= 0 ? idx + 1 : 99;
}

export interface DocumentIntelligenceRecord {
  documentId: string;
  documentFamilyId?: string; // Lineage ID (e.g., "FAM-HD-CT009" connects Contract v1 and Addendum v2)
  projectId: string;
  projectCode?: string;
  folderId: string;
  folderName?: string;
  title: string;
  fileName: string;
  documentType: string; // CONTRACT, DRAWING, METHOD_STATEMENT, ACCEPTANCE, REPORT, GENERAL
  mimeType: string;
  version: number;
  status: DocumentIntelligenceStatus;
  approvalStatus: string;
  effectiveDate: string | null;
  uploadedAt: string;
  updatedAt: string;
  supersedesDocumentId: string | null;
  supersededByDocumentId: string | null;
  isLatestApprovedInFamily?: boolean;
  authorityLevel: DocumentAuthorityLevel;
  asOf: string;
}

export type ChunkContentType =
  | "CLAUSE"        // Điều khoản hợp đồng (Điều 1, Khoản 2.1)
  | "HEADING"       // Tiêu đề chương mục
  | "PARAGRAPH"     // Đoạn văn thuyết minh
  | "TABLE"         // Bảng biểu số liệu
  | "CELL_RANGE"    // Vùng ô dữ liệu bảng tính
  | "LIST_ITEM";    // Mục danh sách

export interface DocumentChunk {
  chunkId: string;
  documentId: string;
  documentFamilyId?: string; // Lineage ID (e.g., "FAM-HD-CT009")
  projectId: string;
  projectCode?: string;
  documentTitle: string;
  documentVersion: number;
  pageNumber: number | null;
  clauseReference?: string;  // VD: "Điều 4.2", "Mục 3.1"
  sectionTitle?: string;     // VD: "Tiến độ thực hiện", "Bảo lãnh thực hiện hợp đồng"
  sheetName?: string;        // Cho file Excel
  cellRange?: string;        // VD: "A1:E25"
  chunkType: ChunkContentType;
  text: string;
  textHash: string;
  status: DocumentIntelligenceStatus;
  authorityLevel: DocumentAuthorityLevel;
  supersedesDocId?: string | null;
  supersededByDocId?: string | null;
  isLatestApprovedInFamily?: boolean;
  effectiveDate?: string | null;
  extractionQuality: "HIGH" | "MEDIUM" | "OCR_LOW_CONFIDENCE";
  ocrUsed?: boolean;
  ocrConfidence?: number;
  asOf: string;
}

export interface PersistentDocumentChunkRecord extends DocumentChunk {
  fileHash: string;
  embeddingModel?: string | null;
  embeddingVersion?: string | null;
  embeddingVector?: number[] | null;
  indexState: "ACTIVE" | "SUPERSEDED" | "ARCHIVED" | "DELETED";
  createdAt: string;
  updatedAt: string;
}

export interface EmbeddingModelConfig {
  embeddingProvider: "LOCAL_TFIDF" | "LOCAL_MINILM" | "REMOTE_OPENAI" | "REMOTE_GEMINI" | "DISABLED";
  embeddingModel: string;
  embeddingDimension: number;
  embeddingVersion: string;
}

export interface ContentHashIntegrityReport {
  citation: DocumentCitationV2;
  isValid: boolean;
  isStaleOrSuperseded: boolean;
  isAuthorized: boolean;
  hashMatched: boolean;
  failureReason?: string;
  integrityAlgorithm: "SHA-256";
}

export interface DocumentCitationV2 {
  sourceType: "DOCUMENT";
  documentId: string;
  projectId: string;
  projectCode?: string;
  title: string;
  version: number;
  status: DocumentIntelligenceStatus;
  authorityLevel: DocumentAuthorityLevel;
  location: {
    page?: number;
    clause?: string;
    section?: string;
    sheet?: string;
    cellRange?: string;
  };
  excerptSafe: string;
  route: string;
  asOf: string;
}

export interface DocumentERPConflict {
  conflictCode: "ERP_DOCUMENT_CONFLICT";
  projectId: string;
  projectCode: string;
  documentId: string;
  documentTitle: string;
  documentVersion: number;
  clauseReference?: string;
  erpFactField: string;
  erpFactValue: unknown;
  documentClaimValue: unknown;
  discrepancyDescription: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  actionRecommendation: string;
  detectedAt: string;
}

export interface DocumentEvidencePackage {
  projectId: string;
  query: string;
  authorizedDocumentIds: string[];
  retrievedChunks: DocumentChunk[];
  rerankedChunks: DocumentChunk[];
  citations: DocumentCitationV2[];
  conflicts: DocumentERPConflict[];
  asOf: string;
}
