import { describe, it, expect } from "vitest";
import { canAccessProjectProposal, canCreateProposal, canTechnicalApprove, canFinalApprove } from "./permissions";

describe("Material Proposal V2 Permissions", () => {
  it("allows high level roles (ADMIN, DIRECTOR, DEPUTY_DIRECTOR) to access and create proposals", () => {
    expect(canAccessProjectProposal({ userRole: "ADMIN", projectRole: null })).toBe(true);
    expect(canAccessProjectProposal({ userRole: "DIRECTOR", projectRole: null })).toBe(true);
    expect(canAccessProjectProposal({ userRole: "DEPUTY_DIRECTOR", projectRole: null })).toBe(true);

    expect(canCreateProposal({ userRole: "ADMIN", projectRole: null })).toBe(true);
    expect(canCreateProposal({ userRole: "DIRECTOR", projectRole: null })).toBe(true);
    expect(canCreateProposal({ userRole: "DEPUTY_DIRECTOR", projectRole: null })).toBe(true);
  });

  it("restricts project members based on project role", () => {
    expect(canAccessProjectProposal({ userRole: "STAFF", projectRole: "PROJECT_MANAGER" })).toBe(true);
    expect(canCreateProposal({ userRole: "STAFF", projectRole: "PROJECT_MANAGER" })).toBe(true);

    expect(canAccessProjectProposal({ userRole: "STAFF", projectRole: null })).toBe(false);
    expect(canCreateProposal({ userRole: "STAFF", projectRole: null })).toBe(false);

    expect(canCreateProposal({ userRole: "STAFF", projectRole: "VIEWER" })).toBe(false);
  });

  it("enforces admin non-signer rule for technical approval unless authorized", () => {
    // Admin without canApprove flag set cannot sign as technical approver
    expect(canTechnicalApprove({ userRole: "ADMIN", canApprove: false })).toBe(false);
    expect(canTechnicalApprove({ userRole: "STAFF", canApprove: true })).toBe(true);
    expect(canTechnicalApprove({ userRole: "ADMIN", canApprove: true })).toBe(true);
  });

  it("restricts final approval to DEPUTY_DIRECTOR and DIRECTOR", () => {
    expect(canFinalApprove("DEPUTY_DIRECTOR")).toBe(true);
    expect(canFinalApprove("DIRECTOR")).toBe(true);
    expect(canFinalApprove("ADMIN")).toBe(false);
    expect(canFinalApprove("STAFF")).toBe(false);
  });
});
