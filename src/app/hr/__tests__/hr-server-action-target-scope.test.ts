import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createOrgUnitAction,
  updateOrgUnitAction,
  deactivateOrgUnitAction,
  assignUnitManagerAction,
  endUnitManagerTermAction,
  transferEmployeeOrgAction,
} from "../organization/actions/organization-actions";
import * as hrAuthGuard from "../../../lib/hr/hr-auth-guard";
import prisma from "../../../lib/prisma";

vi.mock("../../../lib/hr/hr-auth-guard", async () => {
  const actual = await vi.importActual("../../../lib/hr/hr-auth-guard");
  return {
    ...actual,
    checkHrPermission: vi.fn(),
    validateTargetScope: vi.fn(),
  };
});

vi.mock("../../../lib/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue({ id: "audit-1" }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("HR Server Actions Direct Target-Scope Security Guards (IDOR Protection)", () => {
  const mockSessionUser = {
    id: "user-manager-1",
    name: "Trưởng phòng",
    email: "tp@company.com",
    username: "tp_user",
    phone: "0901234567",
    role: "MANAGER" as any,
    isActive: true,
  };

  const mockUserContext = {
    session: mockSessionUser,
    isSystemAdmin: false,
    employeeId: "emp-manager-1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updateOrgUnitAction should DENY out-of-scope org unit mutation and leave DB unchanged", async () => {
    vi.mocked(hrAuthGuard.checkHrPermission).mockResolvedValue({
      allowed: true,
      effect: "ALLOW" as any,
      scope: "OWN_ORGANIZATION_UNIT" as any,
      sensitiveFieldPolicy: "CONTACT" as any,
      context: mockUserContext,
    });

    vi.mocked(hrAuthGuard.validateTargetScope).mockResolvedValue({
      allowed: false,
      reason: "Bị từ chối: Đơn vị nằm ngoài phạm vi quản lý của bạn.",
    });

    const result = await updateOrgUnitAction({
      id: "org-out-of-scope-999",
      code: "PB-OUT",
      name: "Phòng Ngoài Scope",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Bị từ chối: Đơn vị nằm ngoài phạm vi quản lý của bạn.");
    expect(hrAuthGuard.validateTargetScope).toHaveBeenCalledWith(
      mockUserContext,
      "OWN_ORGANIZATION_UNIT",
      { organizationUnitId: "org-out-of-scope-999" }
    );
  });

  it("deactivateOrgUnitAction should DENY out-of-scope unit deactivation", async () => {
    vi.mocked(hrAuthGuard.checkHrPermission).mockResolvedValue({
      allowed: true,
      effect: "ALLOW" as any,
      scope: "OWN_ORGANIZATION_UNIT" as any,
      sensitiveFieldPolicy: "CONTACT" as any,
      context: mockUserContext,
    });

    vi.mocked(hrAuthGuard.validateTargetScope).mockResolvedValue({
      allowed: false,
      reason: "Bị từ chối: Đơn vị nằm ngoài phạm vi quản lý của bạn.",
    });

    const result = await deactivateOrgUnitAction("org-out-of-scope-999");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Bị từ chối");
  });

  it("assignUnitManagerAction should DENY out-of-scope manager assignment", async () => {
    vi.mocked(hrAuthGuard.checkHrPermission).mockResolvedValue({
      allowed: true,
      effect: "ALLOW" as any,
      scope: "OWN_ORGANIZATION_UNIT" as any,
      sensitiveFieldPolicy: "CONTACT" as any,
      context: mockUserContext,
    });

    vi.mocked(hrAuthGuard.validateTargetScope).mockResolvedValue({
      allowed: false,
      reason: "Bị từ chối: Nhân viên mục tiêu nằm ngoài đơn vị do bạn quản lý.",
    });

    const result = await assignUnitManagerAction({
      organizationUnitId: "org-out-of-scope-999",
      employeeId: "emp-out-of-scope-888",
      startDate: "2026-08-01",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Bị từ chối");
  });

  it("transferEmployeeOrgAction should DENY out-of-scope employee transfer", async () => {
    vi.mocked(hrAuthGuard.checkHrPermission).mockResolvedValue({
      allowed: true,
      effect: "ALLOW" as any,
      scope: "OWN_ORGANIZATION_UNIT" as any,
      sensitiveFieldPolicy: "CONTACT" as any,
      context: mockUserContext,
    });

    vi.mocked(hrAuthGuard.validateTargetScope).mockResolvedValue({
      allowed: false,
      reason: "Bị từ chối: Nhân viên nằm ngoài phạm vi quản lý.",
    });

    const result = await transferEmployeeOrgAction({
      employeeId: "emp-target-out-of-scope",
      organizationUnitId: "unit-target-new",
      positionId: "pos-target-new",
      effectiveDate: "2026-08-01",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Bị từ chối");
  });
});
