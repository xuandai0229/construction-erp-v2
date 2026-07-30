import { describe, expect, it } from "vitest";
import {
  getSafetyPermissionSet,
  safetyProjectScopeAllows,
} from "../permissions";
import {
  assertCanCancelSafetyEvidence,
  assertCanUploadSafetyEvidence,
  assertCanViewSafetyEvidence,
  type SafetyEvidenceRelationTrace,
  type SafetyEvidenceTraceRepository,
} from "../evidence-permissions";

describe("permission matrix ATLĐ", () => {
  it("HSE được lập và kiểm tra trong công trình được gán", () => {
    const permissions = getSafetyPermissionSet({
      systemRole: "STAFF",
      projectRole: "HSE",
    });
    expect(permissions.has("safety.plan.create")).toBe(true);
    expect(permissions.has("safety.session.complete")).toBe(true);
  });

  it("chỉ huy công trình chỉ gửi khắc phục", () => {
    const permissions = getSafetyPermissionSet({
      systemRole: "CHIEF_COMMANDER",
      projectRole: "SITE_COMMANDER",
    });
    expect(permissions.has("safety.remediation.submit")).toBe(true);
    expect(permissions.has("safety.reinspection.decide")).toBe(false);
  });

  it("admin quản lý template nhưng không mặc định sửa nghiệp vụ", () => {
    const permissions = getSafetyPermissionSet({
      systemRole: "ADMIN",
      projectRole: null,
    });
    expect(permissions.has("safety.template.manage")).toBe(true);
    expect(permissions.has("safety.finding.update")).toBe(false);
  });

  it("ban giám đốc được duyệt và trưởng bộ phận được rà soát", () => {
    expect(
      getSafetyPermissionSet({
        systemRole: "DIRECTOR",
        projectRole: null,
      }).has("safety.report.approve"),
    ).toBe(true);

    expect(
      getSafetyPermissionSet({
        systemRole: "MANAGER",
        projectRole: null,
      }).has("safety.report.review"),
    ).toBe(true);
  });

  it("permission nhạy cảm không cấp mặc định cho ADMIN", () => {
    const permissions = getSafetyPermissionSet({
      systemRole: "ADMIN",
      projectRole: null,
    });
    expect(permissions.has("safety.session.reopen")).toBe(false);
    expect(permissions.has("safety.finding.correct_result")).toBe(false);
    expect(permissions.has("safety.work.suspend")).toBe(false);
    expect(permissions.has("safety.evidence.cancel")).toBe(false);
    expect(permissions.has("safety.inspection.unplanned")).toBe(false);
  });

  it("HSE có permission kiểm tra đột xuất và đình chỉ riêng", () => {
    const permissions = getSafetyPermissionSet({
      systemRole: "STAFF",
      projectRole: "HSE",
    });
    expect(permissions.has("safety.inspection.unplanned")).toBe(true);
    expect(permissions.has("safety.work.suspend")).toBe(true);
    expect(permissions.has("safety.evidence.cancel")).toBe(true);
  });

  it("scope công trình chặn truy cập chéo", () => {
    expect(
      safetyProjectScopeAllows(
        { kind: "PROJECT_IDS", projectIds: ["project-a"] },
        "project-b",
      ),
    ).toBe(false);
  });
});

describe("evidence guards ATLĐ", () => {
  const actor = {
    id: "user-1",
    isCommandActor: false,
    unitNames: [] as string[],
    projectScope: { kind: "PROJECT_IDS" as const, projectIds: ["project-a"] },
    permissions: new Set(["safety.evidence.view", "safety.evidence.upload", "safety.evidence.cancel"] as const),
  };

  const trace: SafetyEvidenceRelationTrace = {
    evidenceId: "evidence-1",
    evidenceProjectId: "project-a",
    findingId: "finding-1",
    findingProjectId: "project-a",
    findingStatus: "IN_REMEDIATION",
    action: {
      id: "action-1",
      findingId: "finding-1",
      projectId: "project-a",
      status: "IN_PROGRESS",
      assigneeUserId: "user-1",
      assigneeUnit: "BCH A",
    },
    document: {
      id: "document-1",
      projectId: "project-a",
    },
    cancelledAt: null,
  };

  const repository: SafetyEvidenceTraceRepository = {
    async findEvidenceTrace() {
      return trace;
    },
    async findUploadTrace() {
      return { ...trace, evidenceId: null };
    },
  };

  it("cho xem/upload/cancel sau khi truy vết relation và scope hợp lệ", async () => {
    await expect(
      assertCanViewSafetyEvidence(repository, {
        actor,
        evidenceId: "evidence-1",
      }),
    ).resolves.toEqual(trace);
    await expect(
      assertCanUploadSafetyEvidence(repository, {
        actor,
        findingId: "finding-1",
        actionId: "action-1",
        targetProjectId: "project-a",
        documentId: "document-1",
      }),
    ).resolves.toMatchObject({ findingId: "finding-1" });
    await expect(
      assertCanCancelSafetyEvidence(repository, {
        actor,
        evidenceId: "evidence-1",
        reason: "Tệp tải nhầm",
        usedInAcceptedReinspection: false,
        usedInLockedReport: false,
      }),
    ).resolves.toEqual(trace);
  });

  it("từ chối evidence khác project membership", async () => {
    await expect(
      assertCanViewSafetyEvidence(repository, {
        actor: {
          ...actor,
          projectScope: {
            kind: "PROJECT_IDS",
            projectIds: ["project-b"],
          },
        },
        evidenceId: "evidence-1",
      }),
    ).rejects.toThrow("Không thể truy cập bằng chứng ATLĐ");
  });

  it("từ chối relation evidence/finding/action không nhất quán", async () => {
    const invalidRepository: SafetyEvidenceTraceRepository = {
      ...repository,
      async findEvidenceTrace() {
        return {
          ...trace,
          action: {
            ...trace.action!,
            findingId: "finding-khac",
          },
        };
      },
    };
    await expect(
      assertCanViewSafetyEvidence(invalidRepository, {
        actor,
        evidenceId: "evidence-1",
      }),
    ).rejects.toThrow("Không thể truy cập bằng chứng ATLĐ");
  });

  it("từ chối evidence trỏ Document khác công trình", async () => {
    const invalidRepository: SafetyEvidenceTraceRepository = {
      ...repository,
      async findEvidenceTrace() {
        return {
          ...trace,
          document: {
            id: "document-b",
            projectId: "project-b",
          },
        };
      },
    };
    await expect(
      assertCanViewSafetyEvidence(invalidRepository, {
        actor,
        evidenceId: "evidence-1",
      }),
    ).rejects.toThrow("Không thể truy cập bằng chứng ATLĐ");
  });

  it("BCH không phải assignee hoặc đơn vị được giao không được upload", async () => {
    await expect(
      assertCanUploadSafetyEvidence(repository, {
        actor: {
          ...actor,
          id: "commander-khac",
          isCommandActor: true,
          unitNames: ["BCH B"],
          permissions: new Set([
            "safety.evidence.upload",
            "safety.remediation.submit",
          ]),
        },
        findingId: "finding-1",
        actionId: "action-1",
        targetProjectId: "project-a",
        documentId: "document-1",
      }),
    ).rejects.toThrow("Không thể truy cập bằng chứng ATLĐ");
  });

  it("finding COMPLETED không nhận evidence mới", async () => {
    const completedRepository: SafetyEvidenceTraceRepository = {
      ...repository,
      async findUploadTrace() {
        return {
          ...trace,
          evidenceId: null,
          findingStatus: "COMPLETED",
        };
      },
    };
    await expect(
      assertCanUploadSafetyEvidence(completedRepository, {
        actor,
        findingId: "finding-1",
        actionId: "action-1",
        targetProjectId: "project-a",
        documentId: "document-1",
      }),
    ).rejects.toThrow("Không thể truy cập bằng chứng ATLĐ");
  });

  it("không hủy evidence đã dùng trong reinspection chấp thuận", async () => {
    await expect(
      assertCanCancelSafetyEvidence(repository, {
        actor,
        evidenceId: "evidence-1",
        reason: "Muốn thay tệp",
        usedInAcceptedReinspection: true,
        usedInLockedReport: false,
      }),
    ).rejects.toThrow("Không thể truy cập bằng chứng ATLĐ");
  });
});
