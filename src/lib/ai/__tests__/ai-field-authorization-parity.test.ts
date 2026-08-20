import { describe, it, expect, vi, beforeEach } from "vitest";
import { AIFieldPolicyEngine } from "../authorization/ai-field-policy";
import { ProjectSummaryRawData } from "../authorization/project-summary-policy";
import { PendingItemRawData } from "../authorization/pending-items-policy";

describe("Phase 1B — Field-Level Authorization Parity & Semantic Scope", () => {
  const mockRawProject: ProjectSummaryRawData = {
    id: "proj_123",
    code: "CT-2026-0002",
    name: "Quảng trường Đông hồ Hoàn Kiếm",
    displayName: "Quảng trường Hoàn Kiếm",
    status: "ACTIVE",
    location: "Hà Nội",
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-12-31"),
    budget: "50000000000", // 50 Billion VND
    _count: {
      members: 5,
      siteReports: 12,
      documents: 6,
      materialItems: 25,
    },
  };

  const mockRawPendingItems: PendingItemRawData[] = [
    {
      id: "item_staff_1",
      category: "APPROVAL_REQUEST",
      title: "Đề xuất văn phòng phẩm cá nhân",
      projectId: "proj_123",
      status: "PENDING",
      createdAt: new Date("2026-08-19"),
      requesterId: "user_staff_1",
      requesterName: "Nhân viên A",
    },
    {
      id: "item_director_1",
      category: "APPROVAL_REQUEST",
      title: "Phê duyệt tạm ứng hợp đồng 10 tỷ",
      projectId: "proj_123",
      status: "PENDING",
      createdAt: new Date("2026-08-18"),
      requesterId: "user_manager_1",
      requesterName: "Trưởng phòng B",
    },
    {
      id: "item_tech_1",
      category: "MATERIAL_PROPOSAL",
      title: "Đề xuất cấp 50 tấn thép",
      projectId: "proj_123",
      status: "PENDING",
      createdAt: new Date("2026-08-17"),
      requesterId: "user_engineer_1",
      requesterName: "Kỹ sư C",
    },
    {
      id: "item_supervision_1",
      category: "SITE_REPORT_REVIEW",
      title: "Nhật ký thi công móng cần nghiệm thu",
      projectId: "proj_123",
      status: "PENDING",
      createdAt: new Date("2026-08-16"),
      requesterId: "user_commander_1",
      requesterName: "Chỉ huy trưởng D",
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // --- 1. TOTAL KEY OMISSION FOR BUDGET ---
  it("Financial Parity: ADMIN and CHIEF_COMMANDER receive the 'budget' field in DTO", () => {
    const adminDTO = AIFieldPolicyEngine.filterProjectSummary(mockRawProject, {
      userId: "u_admin",
      role: "ADMIN",
      projectScope: { kind: "ALL_PROJECTS" },
    });
    expect("budget" in adminDTO).toBe(true);
    expect(adminDTO.budget).toBe("50000000000");

    const cmdDTO = AIFieldPolicyEngine.filterProjectSummary(mockRawProject, {
      userId: "u_cmd",
      role: "CHIEF_COMMANDER",
      projectScope: { kind: "PROJECT_IDS", projectIds: ["proj_123"] },
    });
    expect("budget" in cmdDTO).toBe(true);
    expect(cmdDTO.budget).toBe("50000000000");
  });

  it("Financial Parity: STAFF, ENGINEER, and CONSTRUCTION_SUPERVISOR have 'budget' KEY COMPLETELY OMITTED", () => {
    // STAFF
    const staffDTO = AIFieldPolicyEngine.filterProjectSummary(mockRawProject, {
      userId: "user_staff_1",
      role: "STAFF",
      projectScope: { kind: "PROJECT_IDS", projectIds: ["proj_123"] },
    });
    expect("budget" in staffDTO).toBe(false);
    expect(staffDTO.budget).toBeUndefined();
    expect(JSON.stringify(staffDTO)).not.toContain("budget");

    // ENGINEER
    const engDTO = AIFieldPolicyEngine.filterProjectSummary(mockRawProject, {
      userId: "user_eng_1",
      role: "ENGINEER",
      projectScope: { kind: "PROJECT_IDS", projectIds: ["proj_123"] },
    });
    expect("budget" in engDTO).toBe(false);
    expect(engDTO.budget).toBeUndefined();
    expect(JSON.stringify(engDTO)).not.toContain("budget");

    // CONSTRUCTION_SUPERVISOR
    const supDTO = AIFieldPolicyEngine.filterProjectSummary(mockRawProject, {
      userId: "user_sup_1",
      role: "CONSTRUCTION_SUPERVISOR",
      projectScope: { kind: "ALL_PROJECTS" },
    });
    expect("budget" in supDTO).toBe(false);
    expect(supDTO.budget).toBeUndefined();
    expect(JSON.stringify(supDTO)).not.toContain("budget");
  });

  // --- 2. SEMANTIC SCOPE FILTERING FOR PENDING ITEMS ---
  it("Pending Items Semantic Scope: STAFF only sees their own requested/assigned items", () => {
    const filtered = AIFieldPolicyEngine.filterPendingItems(mockRawPendingItems, {
      userId: "user_staff_1",
      role: "STAFF",
      projectScope: { kind: "PROJECT_IDS", projectIds: ["proj_123"] },
    });

    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("item_staff_1");
    expect(filtered[0].title).toBe("Đề xuất văn phòng phẩm cá nhân");
  });

  it("Pending Items Semantic Scope: ENGINEER sees personal items and project material proposals", () => {
    const filtered = AIFieldPolicyEngine.filterPendingItems(mockRawPendingItems, {
      userId: "user_engineer_1",
      role: "ENGINEER",
      projectScope: { kind: "PROJECT_IDS", projectIds: ["proj_123"] },
    });

    const itemIds = filtered.map((i) => i.id);
    expect(itemIds).toContain("item_tech_1");
    // Should not see director financial approval
    expect(itemIds).not.toContain("item_director_1");
  });

  it("Pending Items Semantic Scope: CHIEF_COMMANDER sees approval requests and site report reviews for their project", () => {
    const filtered = AIFieldPolicyEngine.filterPendingItems(mockRawPendingItems, {
      userId: "user_commander_1",
      role: "CHIEF_COMMANDER",
      projectScope: { kind: "PROJECT_IDS", projectIds: ["proj_123"] },
    });

    const itemIds = filtered.map((i) => i.id);
    expect(itemIds).toContain("item_director_1");
    expect(itemIds).toContain("item_tech_1");
    expect(itemIds).toContain("item_supervision_1");
  });

  it("Pending Items Semantic Scope: ADMIN sees all company-wide pending items", () => {
    const filtered = AIFieldPolicyEngine.filterPendingItems(mockRawPendingItems, {
      userId: "user_admin",
      role: "ADMIN",
      projectScope: { kind: "ALL_PROJECTS" },
    });

    expect(filtered.length).toBe(4);
  });
});
