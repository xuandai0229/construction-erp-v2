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
const own = (status: "DRAFT" | "SUBMITTED" | "REVISION_REQUIRED" | "APPROVED" | "LOCKED") => ({ createdById: officer.id, status });
const other = (status: "DRAFT" | "SUBMITTED" | "REVISION_REQUIRED" | "APPROVED" | "LOCKED") => ({ createdById: "officer-b", status });

describe("construction supervisor weekly policy", () => {
  it.each([
    ["ADMIN", true, false, true, true],
    ["DIRECTOR", true, false, true, true],
    ["DEPUTY_DIRECTOR", true, false, true, true],
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

  it("can use the module and read another author's dossier without reviewing it", () => {
    expect(canReadSupervisionWeekly(officer.role)).toBe(true);
    expect(canAuthorSupervisionWeekly(officer.role)).toBe(true);
    expect(canReadSupervisionWeeklyDossier(officer, other("DRAFT"))).toBe(true);
    expect(canReviewSupervisionWeekly(officer.role)).toBe(false);
  });

  it.each(["DRAFT", "REVISION_REQUIRED"] as const)("can edit and submit own %s dossier", (status) => {
    expect(canEditSupervisionWeeklyDossier(officer, own(status))).toBe(true);
    expect(canSubmitSupervisionWeeklyDossier(officer, own(status))).toBe(true);
  });

  it.each(["SUBMITTED", "APPROVED", "LOCKED"] as const)("cannot edit own %s dossier", (status) => {
    expect(canEditSupervisionWeeklyDossier(officer, own(status))).toBe(false);
    expect(canSubmitSupervisionWeeklyDossier(officer, own(status))).toBe(false);
  });

  it("cannot edit, delete, submit or export another author's dossier", () => {
    expect(canEditSupervisionWeeklyDossier(officer, other("DRAFT"))).toBe(false);
    expect(canDeleteSupervisionWeeklyDossier(officer, other("DRAFT"))).toBe(false);
    expect(canSubmitSupervisionWeeklyDossier(officer, other("DRAFT"))).toBe(false);
    expect(canExportSupervisionWeeklyDossier(officer, other("SUBMITTED"))).toBe(false);
  });

  it("cannot delete even its own draft dossier", () => {
    expect(canDeleteSupervisionWeeklyDossier(officer, own("DRAFT"))).toBe(false);
  });

  it("exports own non-locked dossier but treats locked as view-only", () => {
    expect(canExportSupervisionWeeklyDossier(officer, own("DRAFT"))).toBe(true);
    expect(canExportSupervisionWeeklyDossier(officer, own("APPROVED"))).toBe(true);
    expect(canExportSupervisionWeeklyDossier(officer, own("LOCKED"))).toBe(false);
  });

  it("rejects foreign and duplicate row IDs while accepting dossier-owned rows", () => {
    const existing = ["row-a", "row-b"];
    expect(hasInvalidSupervisionWeeklyRowIds(existing, ["row-a", "row-b"])).toBe(false);
    expect(hasInvalidSupervisionWeeklyRowIds(existing, ["row-a", "foreign-row"])).toBe(true);
    expect(hasInvalidSupervisionWeeklyRowIds(existing, ["row-a", "row-a"])).toBe(true);
  });
});
