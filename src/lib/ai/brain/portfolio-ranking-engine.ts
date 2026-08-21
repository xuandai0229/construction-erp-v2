import "server-only";
import { AIRequestContext } from "../types";
import { executeAIToolGateway } from "../gateway/ai-tool-gateway";
import { buildProjectIntelligenceSnapshot, ProjectIntelligenceSnapshot } from "./project-brain-builder";
import { ConstructionSignal } from "./construction-signal-engine";

export type AttentionTier = "CRITICAL" | "HIGH" | "MEDIUM" | "DATA_QUALITY_ATTENTION" | "LOW";

export interface RankedProjectCandidate {
  projectId: string;
  projectCode: string;
  projectName: string;
  tier: AttentionTier;
  primarySignals: ConstructionSignal[];
  dataQualitySignals: ConstructionSignal[];
  overdueDays: number;
  progressVariance: number | null;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT_DATA";
  briefExplanation: string;
}

export interface PortfolioRankingResult {
  totalAuthorizedProjects: number;
  evaluatedProjectsCount: number;
  tierSummary: Record<AttentionTier, number>;
  topAttentionCandidates: RankedProjectCandidate[];
  rankedList: RankedProjectCandidate[];
  asOf: string;
}

/**
 * Assigns an Explainable Attention Tier to a project based on its signals.
 * Rules:
 * - CRITICAL: Any CRITICAL severity business risk.
 * - HIGH: Any HIGH severity business risk or data conflict.
 * - MEDIUM: Any MEDIUM severity business risk.
 * - DATA_QUALITY_ATTENTION: Only data quality signals (no active business risks).
 * - LOW: On schedule, no significant issues.
 */
export function assignAttentionTier(signals: ConstructionSignal[]): {
  tier: AttentionTier;
  primarySignals: ConstructionSignal[];
  dataQualitySignals: ConstructionSignal[];
  explanation: string;
} {
  const businessRisks = signals.filter((s) => s.signalType === "BUSINESS_RISK");
  const dataQualitySignals = signals.filter((s) => s.signalType === "DATA_QUALITY");

  const criticalRisks = businessRisks.filter((s) => s.severity === "CRITICAL");
  if (criticalRisks.length > 0) {
    return {
      tier: "CRITICAL",
      primarySignals: criticalRisks,
      dataQualitySignals,
      explanation: criticalRisks.map((s) => s.title).join("; "),
    };
  }

  const highRisks = businessRisks.filter((s) => s.severity === "HIGH");
  const highQualitySignals = dataQualitySignals.filter((s) => s.severity === "HIGH");
  if (highRisks.length > 0 || highQualitySignals.length > 0) {
    const top = [...highRisks, ...highQualitySignals];
    return {
      tier: "HIGH",
      primarySignals: top,
      dataQualitySignals,
      explanation: top.map((s) => s.title).join("; "),
    };
  }

  const mediumRisks = businessRisks.filter((s) => s.severity === "MEDIUM");
  if (mediumRisks.length > 0) {
    return {
      tier: "MEDIUM",
      primarySignals: mediumRisks,
      dataQualitySignals,
      explanation: mediumRisks.map((s) => s.title).join("; "),
    };
  }

  if (dataQualitySignals.length > 0) {
    return {
      tier: "DATA_QUALITY_ATTENTION",
      primarySignals: dataQualitySignals,
      dataQualitySignals,
      explanation: dataQualitySignals.map((s) => s.title).join("; "),
    };
  }

  return {
    tier: "LOW",
    primarySignals: [],
    dataQualitySignals: [],
    explanation: "Công trình đang trong hạn và không có cảnh báo bất thường.",
  };
}

/**
 * Builds and Ranks Project Brain Snapshots for the user's entire authorized portfolio.
 *
 * Rules:
 * 1. Takes all authorized projects (e.g. 21 for Admin, 2 for Scoped Commander).
 * 2. Evaluates signals deterministically.
 * 3. Sorts into tiers without arbitrary AI risk scores.
 * 4. Yields Top 3-5 candidates for Daily Briefing V3 synthesis.
 */
export async function evaluateAndRankPortfolio(
  context: AIRequestContext,
  topLimit = 5,
  asOf = new Date(),
): Promise<PortfolioRankingResult> {
  const asOfIso = asOf.toISOString();

  // 1. Fetch authorized project directory
  const dirRes = await executeAIToolGateway({
    toolName: "get_my_projects",
    input: { limit: 50 },
    explicitContext: context,
  });

  const dirData = dirRes.success ? (dirRes.data as any) : null;
  const projects = Array.isArray(dirData?.items) ? dirData.items : Array.isArray(dirData) ? dirData : [];
  const totalCount = dirData?.authorizedTotalCount || projects.length;

  const rankedList: RankedProjectCandidate[] = [];
  const tierSummary: Record<AttentionTier, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    DATA_QUALITY_ATTENTION: 0,
    LOW: 0,
  };

  // 2. Build snapshots for projects in parallel (bounded concurrency)
  const snapshots: ProjectIntelligenceSnapshot[] = await Promise.all(
    projects.map((p: any) => buildProjectIntelligenceSnapshot(p.id, context, asOf)),
  );

  for (const snapshot of snapshots) {
    const { tier, primarySignals, dataQualitySignals, explanation } = assignAttentionTier(snapshot.signals);
    tierSummary[tier] += 1;

    rankedList.push({
      projectId: snapshot.project.id,
      projectCode: snapshot.project.code,
      projectName: snapshot.project.name,
      tier,
      primarySignals,
      dataQualitySignals,
      overdueDays: snapshot.schedule.overdueDays,
      progressVariance: snapshot.progress.variancePercentagePoints,
      confidence: snapshot.confidence,
      briefExplanation: explanation,
    });
  }

  // 3. Deterministic Sorting:
  // Order: CRITICAL (0) > HIGH (1) > MEDIUM (2) > DATA_QUALITY_ATTENTION (3) > LOW (4)
  const tierRankMap: Record<AttentionTier, number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    DATA_QUALITY_ATTENTION: 3,
    LOW: 4,
  };

  rankedList.sort((a, b) => {
    const tierDiff = tierRankMap[a.tier] - tierRankMap[b.tier];
    if (tierDiff !== 0) return tierDiff;
    return b.overdueDays - a.overdueDays;
  });

  const topAttentionCandidates = rankedList.slice(0, topLimit);

  return {
    totalAuthorizedProjects: totalCount,
    evaluatedProjectsCount: rankedList.length,
    tierSummary,
    topAttentionCandidates,
    rankedList,
    asOf: asOfIso,
  };
}

/**
 * Creates a compact evidence package for LLM synthesis or direct deterministic briefing.
 */
export function formatPortfolioBriefingPromptContext(ranking: PortfolioRankingResult): string {
  const lines: string[] = [
    `=== TỔNG QUAN DANH MỤC (${ranking.evaluatedProjectsCount} CÔNG TRÌNH ĐƯỢC CẤP QUYỀN) ===`,
    `Phân bổ mức độ chú ý: CRITICAL: ${ranking.tierSummary.CRITICAL} | HIGH: ${ranking.tierSummary.HIGH} | MEDIUM: ${ranking.tierSummary.MEDIUM} | THIẾU DỮ LIỆU: ${ranking.tierSummary.DATA_QUALITY_ATTENTION} | BÌNH THƯỜNG: ${ranking.tierSummary.LOW}`,
    ``,
    `TOP ${ranking.topAttentionCandidates.length} CÔNG TRÌNH CẦN QUAN TÂM NHẤT:`,
  ];

  for (let i = 0; i < ranking.topAttentionCandidates.length; i++) {
    const c = ranking.topAttentionCandidates[i];
    lines.push(
      `${i + 1}. [${c.projectCode}] ${c.projectName}`,
      `   - Mức độ ưu tiên: ${c.tier}`,
      `   - Tình trạng: ${c.briefExplanation}`,
      `   - Độ tin cậy dữ liệu: ${c.confidence}`,
    );
  }

  return lines.join("\n");
}
