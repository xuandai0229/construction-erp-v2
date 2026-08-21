import "server-only";

export interface RoutingDecision {
  intent: string;
  selectedCapabilities: string[];
  toolsToExpose: string[];
  isDeterministicFastPath: boolean;
  confidence: number;
  reasonCode: string;
}

export function routeUserIntent(text: string, activeProjectId?: string): RoutingDecision {
  const normalized = text.toLowerCase().trim();

  // 1. Pure Directory Lookup (Deterministic Fast Path Candidate)
  const isDirectoryIntent =
    /^(?:tôi đang phụ trách những công trình nào|tôi phụ trách công trình nào|danh sách công trình của tôi|danh sách dự án của tôi|các công trình của tôi|tôi có những công trình nào|danh sách công trình|danh sách dự án|dự án đang mở|danh sách dự án đang mở)\??$/i.test(
      normalized,
    ) ||
    (!/so sánh|vì sao|tại sao|phân tích|đáng lo|chọn công trình|giải thích|xếp hạng/i.test(normalized) &&
      /(?:những công trình nào|công trình nào của tôi|danh sách công trình được giao|danh sách dự án đang chạy|danh sách dự án đang mở)/i.test(
        normalized,
      ));

  if (isDirectoryIntent) {
    return {
      intent: "PROJECT_DIRECTORY",
      selectedCapabilities: ["PROJECT_DIRECTORY"],
      toolsToExpose: ["get_my_projects"],
      isDeterministicFastPath: true,
      confidence: 0.98,
      reasonCode: "PURE_DIRECTORY_LOOKUP",
    };
  }

  // 2. Portfolio Briefing / Cross-Project Health (Evaluated early to capture portfolio-level questions)
  if (
    /tình hình hôm nay|điểm nóng hôm nay|công trình nào đáng lo|đáng lo nhất|xếp hạng rủi ro|executive briefing|chọn công trình đáng chú ý|toàn bộ công trình|xem tất cả dự án/i.test(
      normalized,
    )
  ) {
    return {
      intent: "PORTFOLIO_DATA_HEALTH",
      selectedCapabilities: ["PORTFOLIO_DATA_HEALTH", "PROJECT_HEALTH", "PENDING_DECISIONS"],
      toolsToExpose: [
        "get_my_projects",
        "get_project_summary",
        "get_pending_items",
        "get_latest_field_reports",
        "get_project_material_summary",
      ],
      isDeterministicFastPath: false,
      confidence: 0.95,
      reasonCode: "PORTFOLIO_BRIEFING_INTENT",
    };
  }

  // 3. Field Activity / Reports
  if (/báo cáo hiện trường|nhật ký thi công|nhật ký gần nhất|hôm qua làm gì|thời tiết công trường|báo cáo gần nhất/i.test(normalized)) {
    return {
      intent: "RECENT_FIELD_ACTIVITY",
      selectedCapabilities: ["RECENT_FIELD_ACTIVITY", "PROJECT_SUMMARY"],
      toolsToExpose: ["get_latest_field_reports", "get_project_summary"],
      isDeterministicFastPath: false,
      confidence: 0.92,
      reasonCode: "FIELD_ACTIVITY_INTENT",
    };
  }

  // 4. Materials & Stock (Strictly bounded word match to avoid substring collision)
  if (/\b(?:vật tư|tồn kho|xi măng|thép|cát|đá|thiếu vật tư)\b|kho công trình|kho dự án/i.test(normalized)) {
    return {
      intent: "MATERIAL_HEALTH",
      selectedCapabilities: ["MATERIAL_HEALTH", "PROJECT_SUMMARY"],
      toolsToExpose: ["get_project_material_summary", "get_project_summary"],
      isDeterministicFastPath: false,
      confidence: 0.92,
      reasonCode: "MATERIAL_HEALTH_INTENT",
    };
  }

  // 5. Pending Decisions / Approvals
  if (/việc gì cần xử lý|việc gì đang chờ|chờ xử lý|chờ tôi duyệt|chờ duyệt|tờ trình|pending|công việc đang chờ|chờ phê duyệt/i.test(normalized)) {
    return {
      intent: "PENDING_DECISIONS",
      selectedCapabilities: ["PENDING_DECISIONS"],
      toolsToExpose: ["get_pending_items"],
      isDeterministicFastPath: false,
      confidence: 0.90,
      reasonCode: "PENDING_DECISIONS_INTENT",
    };
  }

  // 6. Data Quality & Gaps Query
  if (/dữ liệu.*chưa đủ|dữ liệu.*thiếu|chất lượng dữ liệu|thiếu dữ liệu nào|khoảng trống dữ liệu/i.test(normalized)) {
    return {
      intent: "DATA_QUALITY_QUERY",
      selectedCapabilities: ["PROJECT_SUMMARY", "RECENT_FIELD_ACTIVITY", "MATERIAL_HEALTH"],
      toolsToExpose: ["get_project_summary", "get_latest_field_reports", "get_project_material_summary"],
      isDeterministicFastPath: false,
      confidence: 0.94,
      reasonCode: "DATA_QUALITY_GAPS_INTENT",
    };
  }

  // 7. Signal Explanation ("Vì sao?", "Tại sao?")
  if (
    /^(?:vì sao|tại sao|giải thích|lý do|tại sao lại nói|căn cứ vào đâu)\??$/i.test(normalized) ||
    /tại sao.*nguy cơ|vì sao.*chú ý|dựa vào đâu/i.test(normalized)
  ) {
    return {
      intent: "SIGNAL_EXPLANATION",
      selectedCapabilities: ["PROJECT_SUMMARY", "RECENT_FIELD_ACTIVITY"],
      toolsToExpose: ["get_project_summary", "get_latest_field_reports", "get_project_material_summary"],
      isDeterministicFastPath: false,
      confidence: 0.95,
      reasonCode: "SIGNAL_EXPLANATION_WHY_INTENT",
    };
  }

  // 8. Project Specific Summary / Health
  if (
    activeProjectId ||
    /\b[a-z]{2,10}-\d{4}-\d{3,8}\b/i.test(normalized) ||
    /tóm tắt|thông tin|tiến độ|chi tiết|hạn chót|trễ hạn/i.test(normalized)
  ) {
    return {
      intent: "PROJECT_SUMMARY",
      selectedCapabilities: ["PROJECT_SUMMARY", "PROJECT_HEALTH"],
      toolsToExpose: ["get_project_summary", "get_latest_field_reports", "get_project_material_summary"],
      isDeterministicFastPath: false,
      confidence: 0.85,
      reasonCode: "PROJECT_SPECIFIC_INTENT",
    };
  }

  // 9. Fallback Safe Broader Set (Low-confidence: expose all safe tools without dropping capabilities)
  return {
    intent: "GENERAL_CONSTRUCTION_QUERY",
    selectedCapabilities: [
      "PROJECT_DIRECTORY",
      "PROJECT_SUMMARY",
      "PROJECT_HEALTH",
      "RECENT_FIELD_ACTIVITY",
      "PENDING_DECISIONS",
    ],
    toolsToExpose: [
      "get_my_projects",
      "get_project_summary",
      "get_pending_items",
      "get_latest_field_reports",
      "get_project_material_summary",
    ],
    isDeterministicFastPath: false,
    confidence: 0.50,
    reasonCode: "LOW_CONFIDENCE_SAFE_BROAD_ROUTING",
  };
}
