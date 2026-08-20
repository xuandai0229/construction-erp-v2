import "server-only";
import { executeAIToolGateway } from "../gateway/ai-tool-gateway";
import { AIRequestContext, AISource, AIToolExecutionResult } from "../types";

const MAX_BRIEFING_TOOL_CALLS = 5;

export interface DailyBriefingResult {
  content: string;
  toolCallsExecuted: number;
  sources: AISource[];
  qualityFlags: string[];
  coverageSummary: string;
  toolNames: string[];
  selectedProject?: { id: string; code: string; name: string };
}

function uniqueSources(results: AIToolExecutionResult[]): AISource[] {
  const byKey = new Map<string, AISource>();
  for (const result of results) {
    for (const source of result.sources || []) {
      byKey.set(`${source.sourceType}:${source.recordId}`, source);
    }
  }
  return [...byKey.values()].slice(0, 20);
}

function priority(project: any): number {
  if (project.deadlineStatus === "OVERDUE") return 0;
  if (project.deadlineStatus === "DUE_SOON") return 1;
  return 2;
}

export async function executeDailyBriefing(
  context: AIRequestContext,
  trace: { aiRunId: string; conversationId: string },
): Promise<DailyBriefingResult> {
  const results: AIToolExecutionResult[] = [];
  let selectedProject = context.activeProjectId
    ? { id: context.activeProjectId, code: context.activeProjectCode || context.activeProjectId, name: context.activeProjectName || "Công trình đang chọn" }
    : undefined;

  if (!selectedProject) {
    const projectsResult = await executeAIToolGateway({
      toolName: "get_my_projects",
      input: { limit: 50 },
      explicitContext: context,
      ...trace,
      toolCallId: "briefing_projects",
    });
    results.push(projectsResult);
    const projects = projectsResult.success && Array.isArray(projectsResult.data)
      ? [...projectsResult.data].sort((a: any, b: any) => priority(a) - priority(b))
      : [];
    const candidate = projects[0] as any;
    if (candidate) selectedProject = { id: candidate.id, code: candidate.code, name: candidate.name };
  }

  if (!selectedProject) {
    return {
      content: "Không có công trình nào trong phạm vi được cấp quyền để lập briefing hôm nay.",
      toolCallsExecuted: results.length,
      sources: uniqueSources(results),
      qualityFlags: ["NO_AUTHORIZED_PROJECTS"],
      coverageSummary: "Không có dữ liệu công trình để tiếp tục orchestration.",
      toolNames: results.map((result) => result.toolName),
    };
  }

  const calls = [
    ["get_project_summary", { projectId: selectedProject.id }],
    ["get_pending_items", { projectId: selectedProject.id, limit: 10 }],
    ["get_latest_field_reports", { projectId: selectedProject.id, limit: 3 }],
    ["get_project_material_summary", { projectId: selectedProject.id, limit: 20 }],
  ] as const;
  for (const [toolName, input] of calls) {
    if (results.length >= MAX_BRIEFING_TOOL_CALLS) break;
    results.push(await executeAIToolGateway({
      toolName,
      input,
      explicitContext: context,
      ...trace,
      toolCallId: `briefing_${toolName}`,
    }));
  }

  const [summaryResult, pendingResult, reportsResult, materialsResult] = results.slice(-4);
  const summary = summaryResult?.success ? summaryResult.data as any : null;
  const pending = pendingResult?.success && Array.isArray(pendingResult.data) ? pendingResult.data as any[] : [];
  const reports = reportsResult?.success && Array.isArray(reportsResult.data) ? reportsResult.data as any[] : [];
  const materials = materialsResult?.success && Array.isArray(materialsResult.data) ? materialsResult.data as any[] : [];
  const latestReport = reports[0];
  const lowStock = materials.filter((item) => item.stockStatus !== "AVAILABLE");
  const issues = [
    ...(summary?.deadline?.status === "OVERDUE" ? [`Mốc hoàn thành ${summary.deadline.label.toLowerCase()}.`] : []),
    ...(summary?.actualProgress?.status !== "AVAILABLE" ? ["Chưa đủ dữ liệu tiến độ đã duyệt để kết luận phần trăm hoàn thành."] : []),
    ...(pending.length > 0 ? [`Có ${pending.length} việc đang chờ trong miền workflow được hỗ trợ.`] : []),
    ...(latestReport?.issues ? [`Báo cáo gần nhất nêu: ${latestReport.issues}`] : []),
    ...(lowStock.length > 0 ? [`Có ${lowStock.length} vật tư hết/dưới ngưỡng.`] : []),
  ].slice(0, 3);
  const dataGaps = [...new Set(results.flatMap((result) => result.qualityFlags || []))];
  const priorities = [
    summary?.deadline?.status === "OVERDUE"
      ? "Xác minh kế hoạch xử lý mốc quá hạn và cập nhật tiến độ đã duyệt."
      : "Xác minh tiến độ đã duyệt mới nhất trước khi ra quyết định.",
    pending.length > 0
      ? `Rà soát việc chờ lâu nhất: ${pending[0].title}.`
      : "Kiểm tra xem workflow ngoài hai miền đang hỗ trợ có việc chờ quan trọng hay không.",
    lowStock.length > 0
      ? `Kiểm tra vật tư ${lowStock[0].code} (${lowStock[0].stockStatus}).`
      : latestReport
        ? `Mở báo cáo ${latestReport.reportNo} để đối chiếu hiện trường.`
        : "Bổ sung báo cáo hiện trường nếu công trình đã phát sinh hoạt động.",
  ];
  const lines = [
    `1. Tổng quan — [${selectedProject.code}] ${selectedProject.name}`,
    summary
      ? `- Tiến độ đã duyệt: ${summary.actualProgress?.status === "AVAILABLE" ? `${Number(summary.actualProgress.percent).toFixed(1)}%` : "chưa đủ dữ liệu"}.`
      : "- Tiến độ: không truy vấn được.",
    summary
      ? `- Thời hạn: ${summary.deadline?.label || "chưa cập nhật"}.`
      : "- Thời hạn: không truy vấn được.",
    `- Việc đang chờ trong miền hỗ trợ: ${pending.length}.`,
    latestReport
      ? `- Báo cáo gần nhất: ${latestReport.reportNo} ngày ${latestReport.reportDate}${latestReport.issues ? `; vấn đề: ${latestReport.issues}` : "."}`
      : "- Báo cáo hiện trường: chưa có nội dung phù hợp.",
    materials.length > 0
      ? `- Tồn kho: ${materials.length} vật tư được theo dõi; ${lowStock.length} vật tư hết/dưới ngưỡng.`
      : "- Tồn kho: chưa có ProjectMaterialStock; không dùng catalog để thay số tồn.",
    "2. Top vấn đề cần chú ý",
    ...(issues.length > 0 ? issues.map((issue, index) => `${index + 1}. ${issue}`) : ["- Chưa có signal rủi ro đủ dữ liệu để xếp hạng."]),
    "3. Vì sao",
    `- Các kết luận trên chỉ dùng deadline, approved progress, pending, report content và ProjectMaterialStock đã truy vấn; không suy diễn từ keyword.`,
    "4. Evidence",
    `- ${uniqueSources(results).length} nguồn ERP có deep-link được đính kèm bên dưới.`,
    "5. Data gaps",
    `- ${dataGaps.length > 0 ? dataGaps.join(", ") : "Không có lỗi truy vấn; miền trống vẫn có thể chưa được nhập dữ liệu."}`,
    "6. Ba kiểm tra ưu tiên tiếp theo",
    ...priorities.map((priority, index) => `${index + 1}. ${priority}`),
  ];
  const qualityFlags = dataGaps;
  const unavailable = results.filter((result) => !result.success || result.coverage?.status === "UNAVAILABLE").length;

  return {
    content: lines.join("\n"),
    toolCallsExecuted: results.length,
    sources: uniqueSources(results),
    qualityFlags,
    coverageSummary: unavailable > 0
      ? `${unavailable}/${results.length} truy vấn không khả dụng; briefing chỉ phản ánh dữ liệu lấy được.`
      : "Briefing hoàn tất trong giới hạn 5 tool read-only; miền trống được nêu rõ.",
    selectedProject,
    toolNames: results.map((result) => result.toolName),
  };
}
