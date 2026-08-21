import { describe, it, expect } from "vitest";
import prisma from "@/lib/prisma";
import { resolveAIRequestContext } from "../context/ai-context-resolver";
import { buildProjectIntelligenceSnapshot } from "../brain/project-brain-builder";
import { evaluateAndRankPortfolio } from "../brain/portfolio-ranking-engine";
import { assessDomainDataQuality, detectProgressConflicts } from "../brain/data-quality-engine";
import { calculateProjectDerivedMetrics } from "../brain/derived-metric-engine";
import { generateDeterministicActionSuggestions, evaluateConstructionSignals } from "../brain/construction-signal-engine";

describe("AI Project Brain Architecture & Semantics Certification Suite", () => {
  it("1. proves Zero-Record Semantics: 0 pending approvals -> AVAILABLE_EMPTY", () => {
    const asOf = new Date();
    const result = assessDomainDataQuality({
      domain: "PENDING_APPROVALS",
      recordCount: 0,
      asOf,
      freshnessThresholdDays: 7,
      isOperationalZeroAllowed: true,
    });

    expect(result.status).toBe("AVAILABLE_EMPTY");
    expect(result.notes).toContain("Quy trình đang hoạt động bình thường");
  });

  it("2. proves Metric Sign Contract: scheduleOverdueDays >= 0 and daysToDeadline is negative when overdue", () => {
    const asOf = new Date("2026-08-21T00:00:00Z");
    const pastEndDate = new Date("2026-06-30T00:00:00Z");

    const metrics = calculateProjectDerivedMetrics("TEST-P1", {
      asOf,
      endDate: pastEndDate,
    });

    expect(metrics.scheduleOverdueDays.value).toBe(52);
    expect(metrics.scheduleOverdueDays.value).toBeGreaterThanOrEqual(0);
    expect(metrics.daysToDeadline.value).toBe(-52);
    expect(metrics.daysToDeadline.value).toBeLessThan(0);
  });

  it("3. proves Conflict Comparability Gate: different scopes/bases evaluate to NOT_COMPARABLE (no false conflict)", () => {
    const asOf = new Date();
    // Case A: Same scope -> conflict triggered when diff > 5%
    const comparableConflicts = detectProgressConflicts("PROJ-1", 55.0, 68.0, asOf, {
      sameScope: true,
      compatibleTimeWindow: true,
      compatibleMeasurementBasis: true,
    });
    expect(comparableConflicts.length).toBe(1);
    expect(comparableConflicts[0].conflictCode).toBe("PROGRESS_DATA_CONFLICT");

    // Case B: Different scopes (e.g. Overall Project 55% vs Foundation Package 68%) -> NOT_COMPARABLE (0 conflicts)
    const inComparableConflicts = detectProgressConflicts("PROJ-1", 55.0, 68.0, asOf, {
      sameScope: false, // Foundation Package vs Overall
      compatibleTimeWindow: true,
      compatibleMeasurementBasis: true,
    });
    expect(inComparableConflicts.length).toBe(0);
  });

  it("4. proves Recommendation Provenance: rule-based suggestions are tagged DETERMINISTIC_ACTION_SUGGESTION", () => {
    const asOf = new Date();
    const signals = evaluateConstructionSignals({
      projectId: "PROJ-1",
      projectCode: "CT-TEST",
      projectName: "Test Project",
      derivedMetrics: {
        scheduleOverdueDays: {
          metricCode: "SCHEDULE_OVERDUE_DAYS",
          name: "Số ngày quá hạn",
          value: 35,
          unit: "DAYS",
          status: "AVAILABLE",
          formulaVersion: "v1",
          formulaDescription: "test",
          inputEvidenceIds: [],
          asOf: asOf.toISOString(),
        },
      },
      qualityAssessments: {},
      conflicts: [],
      asOf,
    });

    const suggestions = generateDeterministicActionSuggestions(signals);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].provenanceType).toBe("DETERMINISTIC_ACTION_SUGGESTION");
    expect(suggestions[0].ruleReference).toBe("RULE_OVERDUE_EXTEND_SCHEDULE");
  });

  it("5. proves Authorized Gateway Path: Scoped user cannot build snapshot for unauthorized project", async () => {
    const scopedUser = await prisma.user.findFirst({
      where: { role: "CHIEF_COMMANDER", isActive: true, projectMembers: { some: { deletedAt: null } } },
    });

    if (scopedUser) {
      const context = (await resolveAIRequestContext({ explicitUser: scopedUser }))!;
      // Attempt to access an unauthorized project (CT-2026-0009)
      const unauthorizedProject = await prisma.project.findUniqueOrThrow({
        where: { code: "CT-2026-0009" },
      });

      // The gateway throws or returns PROJECT_NOT_FOUND / 404 because user is outside scope
      await expect(
        buildProjectIntelligenceSnapshot(unauthorizedProject.id, context),
      ).rejects.toThrow();
    }
  });

  it("6. proves Evidence Authorization Parity: All evidence nodes have authorizationClassification READ_SAFE", async () => {
    const adminUser = await prisma.user.findFirstOrThrow({
      where: { email: "daicongtu2910@gmail.com", isActive: true },
    });

    const testProject = await prisma.project.findUniqueOrThrow({
      where: { code: "CT-2026-0009" },
    });

    const context = (await resolveAIRequestContext({ explicitUser: adminUser }))!;
    const snapshot = await buildProjectIntelligenceSnapshot(testProject.id, context);

    expect(snapshot.evidenceGraph.nodes.length).toBeGreaterThan(0);
    for (const node of snapshot.evidenceGraph.nodes) {
      expect(node.authorizationClassification).toBe("READ_SAFE");
      expect(["ERP_FACT", "DERIVED_METRIC", "DETERMINISTIC_ACTION_SUGGESTION"]).toContain(node.provenanceType);
    }
  });
});
