import "server-only";

export type ERPBusinessDomain =
  | "PROJECT_CORE"
  | "PROJECT_MEMBERS"
  | "PROJECT_LOCATIONS"
  | "FIELD_PROGRESS"
  | "SITE_REPORTS"
  | "WEEKLY_DOSSIERS"
  | "WBS_TASKS"
  | "MATERIAL_INVENTORY"
  | "MATERIAL_PROPOSALS"
  | "APPROVAL_FLOWS"
  | "DOCUMENTS_VAULT"
  | "SAFETY_HSE"
  | "QUALITY_QAQC"
  | "FINANCIAL_COST"
  | "HR_ORGANIZATION"
  | "SYSTEM_SETTINGS"
  | "AUDIT_TRAIL"
  | "NOTIFICATIONS";

export type AICapabilityMaturity =
  | "NONE"
  | "LOOKUP"
  | "SUMMARY"
  | "ANALYSIS"
  | "DECISION_SUPPORT";

export interface AICapabilityDescriptor {
  id: string;
  name: string;
  businessDomain: ERPBusinessDomain;
  businessPurpose: string;
  maturity: AICapabilityMaturity;
  supportedIntents: string[];
  requiredRoles: string[];
  projectScoped: boolean;
  underlyingTools: string[];
  underlyingPrismaModels: string[];
  dataReadiness: "READY" | "PARTIAL_DATA" | "EMPTY_DATA" | "NOT_IMPLEMENTED";
  outputContract: string;
  maxPayloadBytes: number;
}

export const ERP_DOMAIN_INVENTORY: Record<
  ERPBusinessDomain,
  {
    name: string;
    description: string;
    prismaModels: string[];
    currentMaturity: AICapabilityMaturity;
    isDataPopulated: boolean;
  }
> = {
  PROJECT_CORE: {
    name: "Công trình & Dự án",
    description: "Quản lý mã, tên, địa điểm, thời hạn, trạng thái 21 công trình và tổng hợp Project Brain V1",
    prismaModels: ["Project"],
    currentMaturity: "DECISION_SUPPORT",
    isDataPopulated: true,
  },
  PROJECT_MEMBERS: {
    name: "Ban chỉ huy & Phân công",
    description: "Phân công thành viên, vai trò dự án và quyền truy cập",
    prismaModels: ["ProjectMember"],
    currentMaturity: "SUMMARY",
    isDataPopulated: true,
  },
  PROJECT_LOCATIONS: {
    name: "Vị trí & Cấu trúc Phân khu",
    description: "Cây vị trí (Block, Floor, Zone, Area) cho công trình",
    prismaModels: ["ProjectLocationNode"],
    currentMaturity: "NONE",
    isDataPopulated: false,
  },
  FIELD_PROGRESS: {
    name: "Tiến độ Hiện trường",
    description: "Hạng mục công việc, biểu mẫu và nhật ký sản lượng hiện trường",
    prismaModels: ["FieldProgressTemplate", "FieldProgressItem", "FieldProgressEntry"],
    currentMaturity: "SUMMARY",
    isDataPopulated: false,
  },
  SITE_REPORTS: {
    name: "Nhật ký Thi công",
    description: "Báo cáo nhật ký hàng ngày, nhân lực, thời tiết, thiết bị",
    prismaModels: ["SiteReport", "SiteReportLine"],
    currentMaturity: "SUMMARY",
    isDataPopulated: false,
  },
  WEEKLY_DOSSIERS: {
    name: "Hồ sơ Giám sát Tuần",
    description: "Báo cáo tuần, tổng hợp giám sát kỹ thuật và khối lượng tuần",
    prismaModels: ["WeeklySupervisionDossier"],
    currentMaturity: "NONE",
    isDataPopulated: false,
  },
  WBS_TASKS: {
    name: "Kế hoạch & Cây Công việc WBS",
    description: "Cơ cấu phân chia công việc (WBS) và tiến độ kế hoạch",
    prismaModels: ["WBSItem", "Task", "WorkItem"],
    currentMaturity: "NONE",
    isDataPopulated: false,
  },
  MATERIAL_INVENTORY: {
    name: "Vật tư & Tồn kho",
    description: "Quản lý tồn kho thực tế theo công trình (ProjectMaterialStock) và biến động nhập/xuất (MaterialMovement).",
    prismaModels: ["ProjectMaterialStock", "MaterialItem", "MaterialMovement"],
    currentMaturity: "LOOKUP",
    isDataPopulated: false,
  },
  MATERIAL_PROPOSALS: {
    name: "Đề xuất & Yêu cầu Vật tư",
    description: "Phiếu yêu cầu cấp vật tư công trường và tờ trình phê duyệt",
    prismaModels: ["FieldMaterialRequest", "MaterialProposal"],
    currentMaturity: "NONE",
    isDataPopulated: false,
  },
  APPROVAL_FLOWS: {
    name: "Phê duyệt & Trình duyệt",
    description: "Quy trình phê duyệt tờ trình, vật tư, nghiệm thu, sự cố",
    prismaModels: ["ApprovalRequest", "MaterialProposalApproval"],
    currentMaturity: "LOOKUP",
    isDataPopulated: false,
  },
  DOCUMENTS_VAULT: {
    name: "Hồ sơ & Tài liệu",
    description: "Kho lưu trữ tài liệu kỹ thuật, bản vẽ, pháp lý và hợp đồng",
    prismaModels: ["Document", "DocumentFolder"],
    currentMaturity: "NONE",
    isDataPopulated: false,
  },
  SAFETY_HSE: {
    name: "An toàn Lao động & HSE",
    description: "Kế hoạch an toàn, biên bản sự cố, kiểm tra định kỳ hiện trường",
    prismaModels: ["SafetyPlan", "SafetyIssue"],
    currentMaturity: "NONE",
    isDataPopulated: false,
  },
  QUALITY_QAQC: {
    name: "Chất lượng & Nghiệm thu",
    description: "Phiếu kiểm tra chất lượng, biên bản nghiệm thu, xử lý không phù hợp",
    prismaModels: ["QualityInspection", "QualityIssue"],
    currentMaturity: "NONE",
    isDataPopulated: false,
  },
  FINANCIAL_COST: {
    name: "Chi phí & Thanh toán",
    description: "Dự toán gói thầu, hồ sơ thanh toán giai đoạn, phát sinh chi phí",
    prismaModels: ["Contract", "CostItem"],
    currentMaturity: "NONE",
    isDataPopulated: false,
  },
  HR_ORGANIZATION: {
    name: "Tổ chức & Nhân sự",
    description: "Cơ cấu phòng ban, chức vụ, hồ sơ nhân sự và phân bổ công trình",
    prismaModels: ["User", "Employee", "OrganizationUnit", "Position"],
    currentMaturity: "LOOKUP",
    isDataPopulated: true,
  },
  SYSTEM_SETTINGS: {
    name: "Cấu hình Hệ thống",
    description: "Cài đặt toàn công ty, trạng thái Kill-switch AI, chính sách vận hành",
    prismaModels: ["SystemSetting"],
    currentMaturity: "LOOKUP",
    isDataPopulated: true,
  },
  AUDIT_TRAIL: {
    name: "Nhật ký Kiểm toán (Audit)",
    description: "Ghi vết mọi thao tác người dùng và lượt gọi công cụ AI",
    prismaModels: ["AuditLog"],
    currentMaturity: "SUMMARY",
    isDataPopulated: true,
  },
  NOTIFICATIONS: {
    name: "Thông báo & Cảnh báo",
    description: "Hệ thống thông báo đẩy, nhắc việc và cảnh báo hạn chót",
    prismaModels: ["Notification"],
    currentMaturity: "NONE",
    isDataPopulated: false,
  },
};

export const AI_BUSINESS_CAPABILITIES: Record<string, AICapabilityDescriptor> = {
  PROJECT_DIRECTORY: {
    id: "PROJECT_DIRECTORY",
    name: "Tra cứu Danh mục Công trình",
    businessDomain: "PROJECT_CORE",
    businessPurpose: "Liệt kê đầy đủ danh mục các dự án trong phạm vi quyền kèm trạng thái hạn mức và tiến độ.",
    maturity: "SUMMARY",
    supportedIntents: [
      "danh sách công trình",
      "tôi phụ trách công trình nào",
      "dự án đang mở",
      "các công trình của tôi",
    ],
    requiredRoles: ["ALL"],
    projectScoped: false,
    underlyingTools: ["get_my_projects"],
    underlyingPrismaModels: ["Project", "ProjectMember"],
    dataReadiness: "READY",
    outputContract: "GetMyProjectsResult (authorizedTotalCount, returnedCount, hasMore, items)",
    maxPayloadBytes: 25000,
  },
  PROJECT_SUMMARY: {
    id: "PROJECT_SUMMARY",
    name: "Tóm tắt Tổng quan Công trình",
    businessDomain: "PROJECT_CORE",
    businessPurpose: "Cung cấp cái nhìn 360 độ về thông tin dự án, địa điểm, ngày bắt đầu/kết thúc, số ngày quá hạn.",
    maturity: "SUMMARY",
    supportedIntents: [
      "tóm tắt công trình",
      "thông tin dự án",
      "chi tiết công trình",
      "thời hạn công trình",
    ],
    requiredRoles: ["ALL"],
    projectScoped: true,
    underlyingTools: ["get_project_summary"],
    underlyingPrismaModels: ["Project", "ProjectMember", "FieldProgressEntry"],
    dataReadiness: "READY",
    outputContract: "ProjectSummaryData",
    maxPayloadBytes: 15000,
  },
  PROJECT_HEALTH: {
    id: "PROJECT_HEALTH",
    name: "Đánh giá Sức khỏe & Rủi ro Dự án",
    businessDomain: "FIELD_PROGRESS",
    businessPurpose: "Phân tích độ trễ hạn, tiến độ so với kế hoạch, tình trạng nhật ký và các tín hiệu cảnh báo rủi ro.",
    maturity: "ANALYSIS",
    supportedIntents: [
      "sức khỏe công trình",
      "rủi ro dự án",
      "đánh giá tiến độ",
      "tình hình công trình",
    ],
    requiredRoles: ["ALL"],
    projectScoped: true,
    underlyingTools: ["get_project_summary", "get_latest_field_reports", "get_project_material_summary"],
    underlyingPrismaModels: ["Project", "SiteReport", "FieldProgressEntry", "MaterialItem"],
    dataReadiness: "PARTIAL_DATA",
    outputContract: "ProjectHealthAnalysis",
    maxPayloadBytes: 20000,
  },
  RECENT_FIELD_ACTIVITY: {
    id: "RECENT_FIELD_ACTIVITY",
    name: "Hoạt động & Nhật ký Hiện trường",
    businessDomain: "SITE_REPORTS",
    businessPurpose: "Tra cứu các báo cáo nhật ký thi công gần nhất, số lượng công nhân, máy móc và điều kiện thời tiết.",
    maturity: "SUMMARY",
    supportedIntents: [
      "nhật ký gần nhất",
      "báo cáo hiện trường",
      "hôm qua làm gì",
      "thời tiết công trường",
    ],
    requiredRoles: ["ALL"],
    projectScoped: true,
    underlyingTools: ["get_latest_field_reports"],
    underlyingPrismaModels: ["SiteReport", "SiteReportLine"],
    dataReadiness: "PARTIAL_DATA",
    outputContract: "LatestFieldReportsData",
    maxPayloadBytes: 15000,
  },
  MATERIAL_HEALTH: {
    id: "MATERIAL_HEALTH",
    name: "Kiểm tra Tồn kho & Vật tư Công trình",
    businessDomain: "MATERIAL_INVENTORY",
    businessPurpose: "Báo cáo tồn kho thực tế, các vật tư chạm ngưỡng tồn tối thiểu hoặc có nguy cơ thiếu hụt.",
    maturity: "LOOKUP",
    supportedIntents: [
      "vật tư công trình",
      "tồn kho xi măng",
      "thép còn bao nhiêu",
      "kho dự án",
    ],
    requiredRoles: ["ALL"],
    projectScoped: true,
    underlyingTools: ["get_project_material_summary"],
    underlyingPrismaModels: ["MaterialItem"],
    dataReadiness: "PARTIAL_DATA",
    outputContract: "MaterialSummaryData",
    maxPayloadBytes: 15000,
  },
  PENDING_DECISIONS: {
    id: "PENDING_DECISIONS",
    name: "Công việc & Trình duyệt Chờ Xử lý",
    businessDomain: "APPROVAL_FLOWS",
    businessPurpose: "Liệt kê các tờ trình, phiếu yêu cầu vật tư, báo cáo hoặc tài liệu đang chờ người dùng phê duyệt.",
    maturity: "LOOKUP",
    supportedIntents: [
      "việc cần xử lý",
      "chờ tôi duyệt",
      "tờ trình đang chờ",
      "pending approvals",
    ],
    requiredRoles: ["ALL"],
    projectScoped: false,
    underlyingTools: ["get_pending_items"],
    underlyingPrismaModels: ["ApprovalRequest", "MaterialProposalApproval"],
    dataReadiness: "PARTIAL_DATA",
    outputContract: "PendingItemsData",
    maxPayloadBytes: 15000,
  },
  PORTFOLIO_DATA_HEALTH: {
    id: "PORTFOLIO_DATA_HEALTH",
    name: "Tổng quan Sức khỏe Toàn bộ Danh mục",
    businessDomain: "PROJECT_CORE",
    businessPurpose: "Rà soát toàn bộ các công trình được phân công, xếp hạng rủi ro trễ hạn và phát hiện vùng thiếu dữ liệu.",
    maturity: "ANALYSIS",
    supportedIntents: [
      "tình hình hôm nay",
      "điểm nóng hôm nay",
      "công trình nào đáng lo",
      "executive portfolio briefing",
    ],
    requiredRoles: ["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR", "MANAGER", "CHIEF_COMMANDER"],
    projectScoped: false,
    underlyingTools: ["get_my_projects", "get_project_summary"],
    underlyingPrismaModels: ["Project", "FieldProgressEntry", "SiteReport"],
    dataReadiness: "READY",
    outputContract: "PortfolioHealthData",
    maxPayloadBytes: 30000,
  },
};

/**
 * Calculates dual measurable AI Business Capability Coverage:
 * 1. Capability Implementation Coverage (Code Readiness across 18 ERP domains)
 * 2. Operational Intelligence Coverage (Data + Code Readiness across 18 ERP domains)
 *
 * Scoring: NONE = 0, LOOKUP = 1, SUMMARY = 2, ANALYSIS = 3, DECISION_SUPPORT = 4
 * Maximum Possible Score: 18 domains * 4 = 72 points
 */
export function calculateAICapabilityCoverage(): {
  totalDomains: number;
  maxScore: number;
  implementation: {
    activeDomainsCount: number;
    totalScore: number;
    coveragePercentage: number;
    maturityCounts: Record<AICapabilityMaturity, number>;
  };
  operational: {
    activePopulatedDomainsCount: number;
    totalScore: number;
    coveragePercentage: number;
    maturityCounts: Record<AICapabilityMaturity, number>;
  };
  domainMaturityBreakdown: Record<
    string,
    {
      maturity: AICapabilityMaturity;
      isDataPopulated: boolean;
      operationalMaturity: AICapabilityMaturity;
    }
  >;
} {
  const maturityWeight: Record<AICapabilityMaturity, number> = {
    NONE: 0,
    LOOKUP: 1,
    SUMMARY: 2,
    ANALYSIS: 3,
    DECISION_SUPPORT: 4,
  };

  const domainKeys = Object.keys(ERP_DOMAIN_INVENTORY) as ERPBusinessDomain[];
  const totalDomains = domainKeys.length;
  const maxScore = totalDomains * 4; // 18 * 4 = 72

  let implActiveCount = 0;
  let implTotalScore = 0;
  const implMaturityCounts: Record<AICapabilityMaturity, number> = {
    NONE: 0,
    LOOKUP: 0,
    SUMMARY: 0,
    ANALYSIS: 0,
    DECISION_SUPPORT: 0,
  };

  let opActiveCount = 0;
  let opTotalScore = 0;
  const opMaturityCounts: Record<AICapabilityMaturity, number> = {
    NONE: 0,
    LOOKUP: 0,
    SUMMARY: 0,
    ANALYSIS: 0,
    DECISION_SUPPORT: 0,
  };

  const domainMaturityBreakdown: Record<
    string,
    {
      maturity: AICapabilityMaturity;
      isDataPopulated: boolean;
      operationalMaturity: AICapabilityMaturity;
    }
  > = {};

  for (const key of domainKeys) {
    const domain = ERP_DOMAIN_INVENTORY[key];
    const mat = domain.currentMaturity;
    implMaturityCounts[mat] += 1;
    if (mat !== "NONE") {
      implActiveCount += 1;
      implTotalScore += maturityWeight[mat];
    }

    const opMat: AICapabilityMaturity = domain.isDataPopulated ? mat : "NONE";
    opMaturityCounts[opMat] += 1;
    if (opMat !== "NONE") {
      opActiveCount += 1;
      opTotalScore += maturityWeight[opMat];
    }

    domainMaturityBreakdown[key] = {
      maturity: mat,
      isDataPopulated: domain.isDataPopulated,
      operationalMaturity: opMat,
    };
  }

  const implCoveragePercentage = Math.round((implTotalScore / maxScore) * 1000) / 10;
  const opCoveragePercentage = Math.round((opTotalScore / maxScore) * 1000) / 10;

  return {
    totalDomains,
    maxScore,
    implementation: {
      activeDomainsCount: implActiveCount,
      totalScore: implTotalScore,
      coveragePercentage: implCoveragePercentage, // 15 / 72 = 20.8%
      maturityCounts: implMaturityCounts,
    },
    operational: {
      activePopulatedDomainsCount: opActiveCount,
      totalScore: opTotalScore,
      coveragePercentage: opCoveragePercentage, // 9 / 72 = 12.5%
      maturityCounts: opMaturityCounts,
    },
    domainMaturityBreakdown,
  };
}
