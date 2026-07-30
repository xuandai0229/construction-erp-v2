import { describe, expect, it } from "vitest";
import {
  SafetyApiError,
  mapSafetyError,
  safetyErrorHttpStatus,
} from "../errors";
import {
  filterSafetyPlanForActor,
  type SafetyPlanProjection,
} from "../plan-dto";
import { getSafetyPermissionSet } from "../permissions";

describe("Safety API error model", () => {
  it("không làm lộ Prisma/stack và map conflict nhất quán", () => {
    const mapped = mapSafetyError(
      new Error("Prisma P2002 at database.internal"),
      "corr-test",
    );
    expect(mapped.code).toBe("SAFETY_INTERNAL_ERROR");
    expect(mapped.message).toBe("Không thể xử lý yêu cầu ATLĐ lúc này.");
    expect(mapped.correlationId).toBe("corr-test");
    expect(JSON.stringify(mapped)).not.toContain("P2002");
    expect(safetyErrorHttpStatus(mapped.code)).toBe(500);
  });

  it("giữ mã lỗi nghiệp vụ và thông điệp tiếng Việt an toàn", () => {
    const error = new SafetyApiError(
      "SAFETY_VERSION_CONFLICT",
      "Dữ liệu đã được cập nhật ở thiết bị khác.",
    );
    const mapped = mapSafetyError(error, "corr-version");
    expect(mapped.code).toBe("SAFETY_VERSION_CONFLICT");
    expect(safetyErrorHttpStatus(mapped.code)).toBe(409);
  });
});

describe("Plan multi-project visibility", () => {
  const plan: SafetyPlanProjection = {
    id: "plan-a",
    documentYear: 2026,
    documentNumber: null,
    weekStart: new Date("2026-07-27T00:00:00.000Z"),
    weekEnd: new Date("2026-08-02T00:00:00.000Z"),
    status: "DRAFT",
    version: 1,
    schedules: [
      {
        id: "schedule-a",
        projectId: "project-a",
        projectName: "Công trình A",
        scheduledDate: new Date("2026-07-28T00:00:00.000Z"),
        shift: "MORNING",
        status: "PLANNED",
        collaborators: [{ id: "collab-a", name: "Người A" }],
        checklistItems: [{ id: "item-a", label: "Mục A" }],
      },
      {
        id: "schedule-b",
        projectId: "project-b",
        projectName: "Công trình B bí mật",
        scheduledDate: new Date("2026-07-29T00:00:00.000Z"),
        shift: "AFTERNOON",
        status: "PLANNED",
        collaborators: [{ id: "collab-b", name: "Người B" }],
        checklistItems: [{ id: "item-b", label: "Mục B" }],
      },
    ],
  };

  it("lọc schedule, collaborator, checklist và số lượng ngoài scope", () => {
    const dto = filterSafetyPlanForActor(plan, {
      kind: "PROJECT_IDS",
      projectIds: ["project-a"],
    });
    expect(dto?.schedules).toHaveLength(1);
    expect(dto?.schedules[0].projectName).toBe("Công trình A");
    expect(dto?.scopeLimited).toBe(true);
    expect(dto?.visibilityNotice).toBe("Nội dung được giới hạn theo quyền.");
    expect(JSON.stringify(dto)).not.toContain("project-b");
    expect(JSON.stringify(dto)).not.toContain("Người B");
    expect(JSON.stringify(dto)).not.toContain("Mục B");
  });

  it("ADMIN không tự có quyền sửa finding", () => {
    const permissions = getSafetyPermissionSet({
      systemRole: "ADMIN",
      projectRole: null,
    });
    expect(permissions.has("safety.finding.update")).toBe(false);
    expect(permissions.has("safety.template.manage")).toBe(true);
  });
});
