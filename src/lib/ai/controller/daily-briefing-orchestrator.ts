import "server-only";
import { AIRequestContext, AISource } from "../types";
import { evaluateAndRankPortfolio, PortfolioRankingResult } from "../brain/portfolio-ranking-engine";
import { buildProjectIntelligenceSnapshot } from "../brain/project-brain-builder";

export interface DailyBriefingResult {
  content: string;
  toolCallsExecuted: number;
  sources: AISource[];
  qualityFlags: string[];
  coverageSummary: string;
  toolNames: string[];
  ranking?: PortfolioRankingResult;
}

/**
 * Daily Briefing Orchestrator V3 (Project Brain + Deterministic Portfolio Pre-Ranking)
 *
 * Architecture:
 * 1. Evaluates all authorized projects via Project Brain snapshots.
 * 2. Deterministically ranks projects into Explainable Attention Tiers.
 * 3. Highlights Top 3-5 Attention Candidates with explicit separation between:
 *    - Genuine Business Risks (e.g. Overdue, Progress variance)
 *    - Data Quality Gaps (e.g. Missing reports, missing progress)
 * 4. Yields compact, fast, grounded Executive Briefing.
 */
export async function executeDailyBriefing(
  context: AIRequestContext,
  trace: { aiRunId: string; conversationId: string },
): Promise<DailyBriefingResult> {
  const ranking = await evaluateAndRankPortfolio(context, 3);

  if (ranking.evaluatedProjectsCount === 0) {
    return {
      content: "Không có công trình nào trong phạm vi được cấp quyền để lập báo cáo hôm nay.",
      toolCallsExecuted: 1,
      sources: [],
      qualityFlags: ["NO_AUTHORIZED_PROJECTS"],
      coverageSummary: "Không có dữ liệu công trình để lập briefing.",
      toolNames: ["get_my_projects"],
      ranking,
    };
  }

  const sources: AISource[] = [];
  const qualityFlags: string[] = [];

  const tierSummaryText = [
    ranking.tierSummary.CRITICAL > 0 ? `🔴 **${ranking.tierSummary.CRITICAL}** Nguy cấp (CRITICAL)` : null,
    ranking.tierSummary.HIGH > 0 ? `🟠 **${ranking.tierSummary.HIGH}** Cao (HIGH)` : null,
    ranking.tierSummary.MEDIUM > 0 ? `🟡 **${ranking.tierSummary.MEDIUM}** Trung bình (MEDIUM)` : null,
    ranking.tierSummary.DATA_QUALITY_ATTENTION > 0
      ? `ℹ️ **${ranking.tierSummary.DATA_QUALITY_ATTENTION}** Cần bổ sung dữ liệu`
      : null,
    ranking.tierSummary.LOW > 0 ? `🟢 **${ranking.tierSummary.LOW}** Đúng tiến độ / Bình thường` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const lines: string[] = [
    `## 📋 BÁO CÁO NHANH TÌNH HÌNH CÔNG TRÌNH HÔM NAY`,
    `*Phạm vi: **${ranking.evaluatedProjectsCount} công trình** được cấp quyền truy cập.*`,
    ``,
    `### 1. Phân bổ Mức độ Chú ý Toàn Danh mục`,
    tierSummaryText || "Tất cả công trình đang ở trạng thái bình thường.",
    ``,
    `### 2. Top ${ranking.topAttentionCandidates.length} Công Trình Cần Quan Tâm Nhất`,
  ];

  for (let i = 0; i < ranking.topAttentionCandidates.length; i++) {
    const c = ranking.topAttentionCandidates[i];
    const badge =
      c.tier === "CRITICAL"
        ? "🔴 [CRITICAL]"
        : c.tier === "HIGH"
          ? "🟠 [HIGH]"
          : c.tier === "MEDIUM"
            ? "🟡 [MEDIUM]"
            : c.tier === "DATA_QUALITY_ATTENTION"
              ? "ℹ️ [DATA QUALITY ATTENTION]"
              : "🟢 [LOW]";

    lines.push(`**${i + 1}. ${badge} [${c.projectCode}] ${c.projectName}**`);
    lines.push(`- **Tình trạng:** ${c.briefExplanation}`);

    if (c.dataQualitySignals.length > 0 && c.tier !== "DATA_QUALITY_ATTENTION") {
      lines.push(`- **Khoảng trống dữ liệu:** ${c.dataQualitySignals.map((s) => s.title).join(", ")}`);
    }
    lines.push(`- **Độ tin cậy dữ liệu:** ${c.confidence}`);
    lines.push(``);

    sources.push({
      sourceType: "PROJECT",
      recordId: c.projectId,
      title: `${c.projectCode} - ${c.projectName}`,
      route: `/projects/${c.projectId}`,
      asOf: ranking.asOf,
      label: "Hồ sơ công trình",
    });
  }

  // Action Suggestions section (Provenance: DETERMINISTIC_ACTION_SUGGESTION)
  lines.push(`### 3. Gợi ý Hành động Trọng tâm (Quy tắc Xác định)`);
  if (ranking.topAttentionCandidates.length > 0) {
    const top1 = ranking.topAttentionCandidates[0];
    if (top1.tier === "CRITICAL" || top1.tier === "HIGH") {
      lines.push(`1. **Ưu tiên xử lý [${top1.projectCode}]:** Rà soát mốc tiến độ và nguyên nhân quá hạn.`);
    } else if (top1.tier === "DATA_QUALITY_ATTENTION") {
      lines.push(`1. **Đôn đốc dữ liệu [${top1.projectCode}]:** Nhắc nhở ban chỉ huy cập nhật nhật ký thi công.`);
    } else {
      lines.push(`1. **Theo dõi định kỳ [${top1.projectCode}]:** Tiếp tục giám sát các mốc công việc tuần.`);
    }
  }
  lines.push(`2. **Kiểm tra phê duyệt:** Xử lý các tờ trình hoặc yêu cầu vật tư đang chờ duyệt.`);
  lines.push(`3. **Chuẩn hóa dữ liệu:** Cập nhật nhật ký hiện trường cho các dự án đang thiếu thông tin.`);
  lines.push(``);
  lines.push(`*Ghi chú nguồn gốc: Các gợi ý trên được sinh từ quy tắc xác định (\`DETERMINISTIC_ACTION_SUGGESTION\`) dựa trên tín hiệu rủi ro, không qua mô hình ngôn ngữ tự do.*`);

  for (const c of ranking.topAttentionCandidates) {
    for (const sig of c.dataQualitySignals) {
      qualityFlags.push(sig.signalCode);
    }
  }

  return {
    content: lines.join("\n"),
    toolCallsExecuted: ranking.topAttentionCandidates.length + 1,
    sources: sources.slice(0, 20),
    qualityFlags: [...new Set(qualityFlags)],
    coverageSummary: `Đã đánh giá 5 tầng Project Brain cho ${ranking.evaluatedProjectsCount} công trình.`,
    toolNames: ["get_my_projects", "get_project_summary", "get_latest_field_reports", "get_project_material_summary"],
    ranking,
  };
}
