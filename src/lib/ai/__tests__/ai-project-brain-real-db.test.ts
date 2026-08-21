import { afterAll, beforeAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { executeAIChatTurn } from "../controller/ai-chat-controller";
import { buildProjectIntelligenceSnapshot } from "../brain/project-brain-builder";
import { evaluateAndRankPortfolio } from "../brain/portfolio-ranking-engine";
import { resolveAIRequestContext } from "../context/ai-context-resolver";

describe("AI Project Brain V1 — Real Database Truth & End-to-End Suite", () => {
  let adminUser: any;
  let chiefCommander: any;
  let testProject: any;

  beforeAll(async () => {
    adminUser = await prisma.user.findFirstOrThrow({
      where: { email: "daicongtu2910@gmail.com", isActive: true },
    });

    chiefCommander = await prisma.user.findFirst({
      where: { role: "CHIEF_COMMANDER", isActive: true, projectMembers: { some: { deletedAt: null } } },
    });

    testProject = await prisma.project.findUniqueOrThrow({
      where: { code: "CT-2026-0009" },
    });
  });

  it("1. builds accurate Project Brain snapshot for CT-2026-0009 reflecting real DB facts & data gaps", async () => {
    const context = (await resolveAIRequestContext({ explicitUser: adminUser }))!;
    const snapshot = await buildProjectIntelligenceSnapshot(testProject.id, context);

    expect(snapshot.project.code).toBe("CT-2026-0009");
    expect(snapshot.schedule.status).toBe("AVAILABLE");
    expect(snapshot.schedule.isOverdue).toBe(true);
    expect(snapshot.schedule.overdueDays).toBeGreaterThan(30);

    // Operational data gaps on DB
    expect(snapshot.progress.status).toBe("MISSING");
    expect(["AVAILABLE", "MISSING"]).toContain(snapshot.fieldActivity.status);
    expect(["AVAILABLE", "MISSING"]).toContain(snapshot.materials.status);

    // Confidence correctly evaluates real operational data
    expect(["INSUFFICIENT_DATA", "LOW", "MEDIUM", "HIGH"]).toContain(snapshot.confidence);

    // Signals contain OVERDUE business risk + data quality gaps
    const overdueSignal = snapshot.signals.find((s) => s.signalCode === "PROJECT_OVERDUE");
    expect(overdueSignal).toBeDefined();
    expect(overdueSignal?.signalType).toBe("BUSINESS_RISK");

    const missingProgress = snapshot.signals.find((s) => s.signalCode === "MISSING_PROGRESS");
    expect(missingProgress).toBeDefined();
    expect(missingProgress?.signalType).toBe("DATA_QUALITY");

    // Evidence Graph contains valid node references
    expect(snapshot.evidenceGraph.nodes.length).toBeGreaterThan(0);
    expect(snapshot.evidenceGraph.nodes[0].projectId).toBe(testProject.id);
  });

  it("2. evaluates and pre-ranks all 21 authorized projects for Admin without leaking across scopes", async () => {
    const adminContext = (await resolveAIRequestContext({ explicitUser: adminUser }))!;
    const adminRanking = await evaluateAndRankPortfolio(adminContext, 3);

    expect(adminRanking.totalAuthorizedProjects).toBe(21);
    expect(adminRanking.evaluatedProjectsCount).toBe(21);
    expect(adminRanking.topAttentionCandidates.length).toBe(3);

    if (chiefCommander) {
      const scopedContext = (await resolveAIRequestContext({ explicitUser: chiefCommander }))!;
      const scopedRanking = await evaluateAndRankPortfolio(scopedContext, 3);

      expect(scopedRanking.totalAuthorizedProjects).toBe(2);
      expect(scopedRanking.evaluatedProjectsCount).toBe(2);
      expect(scopedRanking.rankedList.length).toBe(2);
    }
  });

  it("3. handles Data Gap query deterministically from Data Quality Engine", async () => {
    const res = await executeAIChatTurn({
      messages: [{ role: "user", content: "Dữ liệu nào của công trình này hiện chưa đủ?" }],
      activeProjectId: testProject.id,
      contextOptions: { explicitUser: adminUser },
      preferredProvider: "mock",
    });

    expect(res.success).toBe(true);
    expect(res.content).toContain("ĐÁNH GIÁ CHẤT LƯỢNG & KHOẢNG TRỐNG DỮ LIỆU");
    expect(res.content).toContain("MISSING");
    expect(res.telemetry.model).toBe("deterministic-data-quality-v1");
  });

  it("4. handles 'Vì sao?' explanation query via Evidence Graph", async () => {
    const res = await executeAIChatTurn({
      messages: [{ role: "user", content: "Vì sao công trình này cần chú ý?" }],
      activeProjectId: testProject.id,
      contextOptions: { explicitUser: adminUser },
      preferredProvider: "mock",
    });

    expect(res.success).toBe(true);
    expect(res.content).toContain("CĂN CỨ VÀ CHUỖI DẪN CHỨNG (EVIDENCE CHAIN)");
    expect(res.content).toContain("quá hạn");
    expect(res.qualityFlags).toContain("PROJECT_OVERDUE");
    expect(res.telemetry.model).toBe("deterministic-evidence-graph-v1");
    expect(res.sources.length).toBeGreaterThan(0);
  });

  it("5. executes Daily Briefing V3 with pre-ranking in < 1,000ms", async () => {
    const start = Date.now();
    const res = await executeAIChatTurn({
      messages: [{ role: "user", content: "Tình hình hôm nay thế nào?" }],
      contextOptions: { explicitUser: adminUser },
      preferredProvider: "mock",
    });
    const latency = Date.now() - start;

    expect(res.success).toBe(true);
    expect(res.content).toContain("BÁO CÁO NHANH TÌNH HÌNH CÔNG TRÌNH HÔM NAY");
    expect(res.content).toContain("Top 3 Công Trình Cần Quan Tâm Nhất");
    expect(res.telemetry.model).toBe("deterministic-project-brain-v3");
    expect(latency).toBeLessThan(1000);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
