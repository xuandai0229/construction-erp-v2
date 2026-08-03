import { describe, expect, it } from "vitest";
import type { UserRole } from "@prisma/client";
import {
  canDeleteSupervisionWeeklyDossier,
  canEditSupervisionWeeklyDossier,
  canExportSupervisionWeeklyDossier,
  canReadSupervisionWeeklyDossier,
  canReviewSupervisionWeekly,
  canSubmitSupervisionWeeklyDossier,
  canAuthorSupervisionWeekly,
  canReadSupervisionWeekly,
  canLockSupervisionWeeklyDossier,
  hasInvalidSupervisionWeeklyRowIds,
} from "./permissions";

const officer = { id: "officer-a", role: "CONSTRUCTION_SUPERVISOR" as const };
const admin = { id: "admin-1", role: "ADMIN" as const };
const own = (status: "DRAFT" | "SUBMITTED" | "REVISION_REQUIRED" | "APPROVED" | "LOCKED") => ({ createdById: officer.id, status });
const other = (status: "DRAFT" | "SUBMITTED" | "REVISION_REQUIRED" | "APPROVED" | "LOCKED") => ({ createdById: "officer-b", status });

describe("construction supervisor weekly policy", () => {
  it.each([
    ["ADMIN", true, true, true, true],
    ["DIRECTOR", true, true, true, true],
    ["DEPUTY_DIRECTOR", true, true, true, true],
    ["SUPERVISION_HEAD", true, true, false, false],
    ["CONSTRUCTION_SUPERVISOR", true, true, false, false],
    ["CHIEF_COMMANDER", false, false, false, false],
    ["MANAGER", false, false, false, false],
    ["ENGINEER", false, false, false, false],
    ["STAFF", false, false, false, false],
  ] satisfies [UserRole, boolean, boolean, boolean, boolean][])(
    "separates weekly capabilities for %s",
    (role, read, author, review, lock) => {
      expect(canReadSupervisionWeekly(role)).toBe(read);
      expect(canAuthorSupervisionWeekly(role)).toBe(author);
      expect(canReviewSupervisionWeekly(role)).toBe(review);
      expect(canLockSupervisionWeeklyDossier(role)).toBe(lock);
    },
  );

  it("can use the module and read another author's dossier", () => {
    expect(canReadSupervisionWeekly(officer.role)).toBe(true);
    expect(canAuthorSupervisionWeekly(officer.role)).toBe(true);
    expect(canReadSupervisionWeeklyDossier(officer, other("DRAFT"))).toBe(true);
  });

  it.each(["DRAFT", "SUBMITTED", "REVISION_REQUIRED", "APPROVED", "LOCKED"] as const)(
    "author can edit own %s dossier under simplified approval-free workflow",
    (status) => {
      expect(canEditSupervisionWeeklyDossier(officer, own(status))).toBe(true);
    }
  );

  it.each(["DRAFT", "SUBMITTED", "REVISION_REQUIRED", "APPROVED", "LOCKED"] as const)(
    "admin can edit and delete any %s dossier",
    (status) => {
      expect(canEditSupervisionWeeklyDossier(admin, other(status))).toBe(true);
      expect(canDeleteSupervisionWeeklyDossier(admin, other(status))).toBe(true);
    }
  );

  it("author can delete its own dossier", () => {
    expect(canDeleteSupervisionWeeklyDossier(officer, own("DRAFT"))).toBe(true);
  });

  it("exports own dossier regardless of status", () => {
    expect(canExportSupervisionWeeklyDossier(officer, own("DRAFT"))).toBe(true);
    expect(canExportSupervisionWeeklyDossier(officer, own("APPROVED"))).toBe(true);
    expect(canExportSupervisionWeeklyDossier(officer, own("LOCKED"))).toBe(true);
  });

  it("rejects foreign and duplicate row IDs while accepting dossier-owned rows", () => {
    const existing = ["row-a", "row-b"];
    expect(hasInvalidSupervisionWeeklyRowIds(existing, ["row-a", "row-b"])).toBe(false);
    expect(hasInvalidSupervisionWeeklyRowIds(existing, ["row-a", "foreign-row"])).toBe(true);
    expect(hasInvalidSupervisionWeeklyRowIds(existing, ["row-a", "row-a"])).toBe(true);
  });
});
