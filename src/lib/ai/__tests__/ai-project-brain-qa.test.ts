import { describe, expect, it } from "vitest";
import { calculateProjectDerivedMetrics } from "../brain/derived-metric-engine";
import {
  assessDomainDataQuality,
  detectProgressConflicts,
  AI_DATA_QUALITY_POLICY_V1,
} from "../brain/data-quality-engine";
import { evaluateConstructionSignals, ConstructionSignal } from "../brain/construction-signal-engine";
import { assignAttentionTier } from "../brain/portfolio-ranking-engine";

describe("AI Project Brain V1 — QA Engineering & Logic Proof Suite", () => {
  const asOf = new Date("2026-08-21T00:00:00.000Z");

  describe("1. Derived Metric Engine", () => {
    it("calculates schedule overdue days and days to deadline deterministically", () => {
      const pastEndDate = new Date("2026-06-30T00:00:00.000Z");
      const metrics = calculateProjectDerivedMetrics("proj_test_1", {
        asOf,
        endDate: pastEndDate,
      });

      expect(metrics.daysToDeadline.status).toBe("AVAILABLE");
      expect(metrics.daysToDeadline.value).toBe(-52);
      expect(metrics.scheduleOverdueDays.status).toBe("AVAILABLE");
      expect(metrics.scheduleOverdueDays.value).toBe(52);
      expect(metrics.scheduleOverdueDays.formulaVersion).toBe("schedule-overdue-v1");
      expect(metrics.scheduleOverdueDays.inputEvidenceIds).toContain("project:proj_test_1:endDate");
    });

    it("returns UNAVAILABLE status without substituting 0 when inputs are missing", () => {
      const metrics = calculateProjectDerivedMetrics("proj_test_2", {
        asOf,
        endDate: null,
        actualProgressPercentage: null,
        plannedProgressPercentage: null,
      });

      expect(metrics.daysToDeadline.status).toBe("UNAVAILABLE");
      expect(metrics.daysToDeadline.value).toBeNull();
      expect(metrics.scheduleOverdueDays.status).toBe("UNAVAILABLE");
      expect(metrics.scheduleOverdueDays.value).toBeNull();
      expect(metrics.progressVariancePercentagePoints.status).toBe("UNAVAILABLE");
      expect(metrics.progressVariancePercentagePoints.value).toBeNull();
    });

    it("calculates progress variance in percentage points accurately", () => {
      const metrics = calculateProjectDerivedMetrics("proj_test_3", {
        asOf,
        actualProgressPercentage: 61.2,
        plannedProgressPercentage: 78.5,
      });

      expect(metrics.progressVariancePercentagePoints.status).toBe("AVAILABLE");
      expect(metrics.progressVariancePercentagePoints.value).toBe(-17.3);
      expect(metrics.progressVariancePercentagePoints.unit).toBe("PERCENTAGE_POINTS");
    });

    it("calculates record age days accurately", () => {
      const reportDate = new Date("2026-08-11T00:00:00.000Z"); // 10 days before asOf
      const metrics = calculateProjectDerivedMetrics("proj_test_4", {
        asOf,
        latestSiteReportDate: reportDate,
      });

      expect(metrics.latestFieldReportAgeDays.status).toBe("AVAILABLE");
      expect(metrics.latestFieldReportAgeDays.value).toBe(10);
    });
  });

  describe("2. Data Quality Engine & Conflict Detection", () => {
    it("marks 0 records as MISSING instead of healthy", () => {
      const quality = assessDomainDataQuality({
        domain: "PROGRESS",
        recordCount: 0,
        asOf,
        freshnessThresholdDays: 14,
      });

      expect(quality.status).toBe("MISSING");
      expect(quality.notes).toContain("Chưa có dữ liệu vận hành");
    });

    it("marks records exceeding threshold as STALE", () => {
      const oldReportDate = new Date("2026-08-01T00:00:00.000Z"); // 20 days ago (threshold: 7)
      const quality = assessDomainDataQuality({
        domain: "FIELD_ACTIVITY",
        recordCount: 5,
        lastUpdatedDate: oldReportDate,
        asOf,
        freshnessThresholdDays: AI_DATA_QUALITY_POLICY_V1.thresholds.REPORT_FRESHNESS_THRESHOLD_DAYS,
      });

      expect(quality.status).toBe("STALE");
      expect(quality.isStale).toBe(true);
      expect(quality.ageDays).toBe(20);
    });

    it("detects factual progress conflicts when approved vs diary progress mismatch > 5%", () => {
      const conflicts = detectProgressConflicts("proj_test_5", 54.0, 68.0, asOf);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].conflictCode).toBe("PROGRESS_DATA_CONFLICT");
      expect(conflicts[0].values).toHaveLength(2);
      expect(conflicts[0].message).toContain("Chênh lệch 14%");
    });
  });

  describe("3. Construction Signal Engine", () => {
    it("categorizes overdue > 90 days as CRITICAL and separates business risk from data quality", () => {
      const derivedMetrics = calculateProjectDerivedMetrics("proj_test_6", {
        asOf,
        endDate: new Date("2026-04-01T00:00:00.000Z"), // 142 days overdue
      });

      const qualityAssessments = {
        progress: assessDomainDataQuality({
          domain: "PROGRESS",
          recordCount: 0,
          asOf,
          freshnessThresholdDays: 14,
        }),
        fieldActivity: assessDomainDataQuality({
          domain: "FIELD_ACTIVITY",
          recordCount: 0,
          asOf,
          freshnessThresholdDays: 7,
        }),
        materials: assessDomainDataQuality({
          domain: "MATERIAL_STOCK",
          recordCount: 0,
          asOf,
          freshnessThresholdDays: 14,
        }),
      };

      const signals = evaluateConstructionSignals({
        projectId: "proj_test_6",
        projectCode: "CT-TEST-0006",
        projectName: "Test Project Overdue",
        derivedMetrics,
        qualityAssessments,
        conflicts: [],
        asOf,
      });

      const overdueSignal = signals.find((s) => s.signalCode === "PROJECT_OVERDUE");
      expect(overdueSignal).toBeDefined();
      expect(overdueSignal?.signalType).toBe("BUSINESS_RISK");
      expect(overdueSignal?.severity).toBe("CRITICAL");
      expect(overdueSignal?.derivedMetricIds).toContain("SCHEDULE_OVERDUE_DAYS");
      expect(overdueSignal?.evidenceIds).toContain("project:proj_test_6:endDate");

      const missingProgress = signals.find((s) => s.signalCode === "MISSING_PROGRESS");
      expect(missingProgress).toBeDefined();
      expect(missingProgress?.signalType).toBe("DATA_QUALITY");
    });
  });

  describe("4. Portfolio Attention Tiers", () => {
    it("classifies project with only data quality gaps as DATA_QUALITY_ATTENTION", () => {
      const signals: ConstructionSignal[] = [
        {
          signalCode: "MISSING_PROGRESS",
          category: "DATA_QUALITY",
          signalType: "DATA_QUALITY",
          severity: "LOW",
          projectId: "p1",
          title: "Chưa có tiến độ",
          explanationCode: "PROGRESS_MISSING",
          derivedMetricIds: [],
          evidenceIds: [],
          thresholdVersion: "v1",
          asOf: asOf.toISOString(),
          confidence: "HIGH",
          summary: "Chưa có dữ liệu tiến độ",
        },
      ];

      const { tier } = assignAttentionTier(signals);
      expect(tier).toBe("DATA_QUALITY_ATTENTION");
    });

    it("classifies project with CRITICAL business risk as CRITICAL tier", () => {
      const signals: ConstructionSignal[] = [
        {
          signalCode: "PROJECT_OVERDUE",
          category: "SCHEDULE",
          signalType: "BUSINESS_RISK",
          severity: "CRITICAL",
          projectId: "p2",
          title: "Quá hạn 120 ngày",
          explanationCode: "OVERDUE",
          derivedMetricIds: ["SCHEDULE_OVERDUE_DAYS"],
          evidenceIds: ["project:p2:endDate"],
          thresholdVersion: "v1",
          asOf: asOf.toISOString(),
          confidence: "HIGH",
          summary: "Quá hạn nghiêm trọng",
        },
      ];

      const { tier } = assignAttentionTier(signals);
      expect(tier).toBe("CRITICAL");
    });
  });
});
