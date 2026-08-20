import "server-only";
import { executeAIToolGateway } from "../gateway/ai-tool-gateway";
import { AIRequestContext, AISource, AIToolExecutionResult } from "../types";

export interface ComparisonProject {
  id: string;
  code: string;
  name: string;
}

function score(summary: any, materials: any[]): number {
  let value = 0;
  if (summary?.deadline?.status === "OVERDUE") value += 4;
  if (summary?.deadline?.status === "DUE_SOON") value += 2;
  value += Math.min(3, summary?.riskFlags?.length || 0);
  value += Math.min(3, materials.filter((item) => item.stockStatus !== "AVAILABLE").length);
  if (summary?.actualProgress?.status !== "AVAILABLE") value += 1;
  return value;
}

function sources(results: AIToolExecutionResult[]): AISource[] {
  const unique = new Map<string, AISource>();
  for (const result of results) {
    for (const source of result.sources || []) unique.set(`${source.sourceType}:${source.recordId}`, source);
  }
  return [...unique.values()].slice(0, 20);
}

export async function executeProjectComparison(input: {
  context: AIRequestContext;
  projects: [ComparisonProject, ComparisonProject];
  aiRunId: string;
  conversationId: string;
}) {
  const results: AIToolExecutionResult[] = [];
  for (const project of input.projects) {
    results.push(await executeAIToolGateway({
      toolName: "get_project_summary",
      input: { projectId: project.id },
      explicitContext: input.context,
      aiRunId: input.aiRunId,
      conversationId: input.conversationId,
      toolCallId: `compare_summary_${project.id}`,
    }));
    results.push(await executeAIToolGateway({
      toolName: "get_project_material_summary",
      input: { projectId: project.id, limit: 20 },
      explicitContext: input.context,
      aiRunId: input.aiRunId,
      conversationId: input.conversationId,
      toolCallId: `compare_material_${project.id}`,
    }));
  }

  const views = input.projects.map((project, index) => {
    const summaryResult = results[index * 2];
    const materialResult = results[index * 2 + 1];
    const summary = summaryResult.success ? summaryResult.data as any : null;
    const materials = materialResult.success && Array.isArray(materialResult.data) ? materialResult.data as any[] : [];
    return {
      project,
      summary,
      materials,
      score: score(summary, materials),
      lowStock: materials.filter((item) => item.stockStatus !== "AVAILABLE").length,
    };
  });
  const ranked = [...views].sort((a, b) => b.score - a.score);
  const higher = ranked[0];
  const priorities = [
    higher.summary?.deadline?.status === "OVERDUE"
      ? `Xác minh kế hoạch khắc phục mốc quá hạn của ${higher.project.code}.`
      : `Xác minh tiến độ đã duyệt mới nhất của ${higher.project.code}.`,
    higher.lowStock > 0
      ? `Kiểm tra ${higher.lowStock} vật tư hết/dưới ngưỡng tại ${higher.project.code}.`
      : `Rà soát độ đầy đủ dữ liệu tồn kho tại ${higher.project.code}.`,
    "Đối chiếu báo cáo hiện trường và các việc đang chờ trước khi ra quyết định.",
  ];

  const content = [
    `So sánh read-only ${views[0].project.code} và ${views[1].project.code}:`,
    ...views.map((view) =>
      `- ${view.project.code}: ${view.summary?.deadline?.label || "chưa có hạn"}; tiến độ ${view.summary?.actualProgress?.status === "AVAILABLE" ? `${Number(view.summary.actualProgress.percent).toFixed(1)}%` : "chưa đủ dữ liệu"}; ${view.lowStock} vật tư hết/dưới ngưỡng; risk score quy tắc=${view.score}.`,
    ),
    `Kết luận theo các signal hiện có: ${higher.project.code} cần chú ý hơn${ranked[0].score === ranked[1].score ? " (hai bên đang đồng điểm; confidence thấp)" : ""}.`,
    "Ba kiểm tra ưu tiên tiếp theo:",
    ...priorities.map((priority, index) => `${index + 1}. ${priority}`),
    "Giới hạn: risk score chỉ gồm thời hạn, risk flags có nguồn, coverage tiến độ và tồn kho; đây không phải dự báo cam kết.",
  ].join("\n");

  return {
    content,
    toolCallsExecuted: results.length,
    sources: sources(results),
    qualityFlags: [...new Set(results.flatMap((result) => result.qualityFlags || []))],
    coverageSummary: "So sánh dùng 4 tool read-only (summary + stock cho hai công trình).",
    projects: views.map((view) => view.project),
  };
}
