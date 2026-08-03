import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  validateCandidateDatabaseUrl,
  validateE2eDatabaseCreation,
  maskDatabaseUrl,
} from "../../../scripts/qa/qa-db-guard-utils";

describe("Phase 1 — QA Database Script Guard Unit Tests", () => {
  const originalEnv = process.env.DATABASE_URL;

  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://user:pass@127.0.0.1:5432/construction_erp_v2_main";
  });

  afterEach(() => {
    process.env.DATABASE_URL = originalEnv;
  });

  describe("Candidate Database URL Validation", () => {
    it("1. Rejects missing URL", () => {
      const result = validateCandidateDatabaseUrl(undefined);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("CANDIDATE_DATABASE_URL is required");
    });

    it("2. Rejects invalid protocol", () => {
      const result = validateCandidateDatabaseUrl("http://localhost:5432/my_qa_db");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Protocol must be postgres:");
    });

    it("3. Rejects same target as primary DATABASE_URL", () => {
      process.env.DATABASE_URL = "postgresql://user:pass@127.0.0.1:5432/construction_erp_v2_qa";
      const result = validateCandidateDatabaseUrl("postgresql://user:pass@127.0.0.1:5432/construction_erp_v2_qa");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("cannot match primary DATABASE_URL");
    });

    it("4. Rejects unsafe database names (system db or missing keyword)", () => {
      const systemRes = validateCandidateDatabaseUrl("postgresql://user:pass@127.0.0.1:5432/postgres");
      expect(systemRes.valid).toBe(false);
      expect(systemRes.reason).toContain("cannot be a system database");

      const noKeywordRes = validateCandidateDatabaseUrl("postgresql://user:pass@127.0.0.1:5432/custom_prod_db");
      expect(noKeywordRes.valid).toBe(false);
      expect(noKeywordRes.reason).toContain("must contain at least one QA/E2E keyword");
    });

    it("5. Accepts valid safe candidate URL", () => {
      const result = validateCandidateDatabaseUrl("postgresql://user:pass@127.0.0.1:5432/construction_erp_v2_qa_e2e_20260723");
      expect(result.valid).toBe(true);
      expect(result.dbName).toBe("construction_erp_v2_qa_e2e_20260723");
    });
  });

  describe("E2E Database Creation Validation", () => {
    it("6. Rejects when CONFIRM_CREATE_E2E_DATABASE is missing or false", () => {
      const result = validateE2eDatabaseCreation(
        "postgresql://user:pass@127.0.0.1:5432/postgres",
        "construction_erp_v2_settings_e2e_20260803",
        false
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("CONFIRM_CREATE_E2E_DATABASE=true is required");
    });

    it("7. Accepts valid E2E database creation parameters with confirmation", () => {
      const result = validateE2eDatabaseCreation(
        "postgresql://user:pass@127.0.0.1:5432/postgres",
        "construction_erp_v2_settings_e2e_20260803",
        "true"
      );
      expect(result.valid).toBe(true);
      expect(result.dbName).toBe("construction_erp_v2_settings_e2e_20260803");
    });
  });

  describe("Sensitive Data Masking", () => {
    it("8. Masks username and password in connection string", () => {
      const masked = maskDatabaseUrl("postgresql://secret_user:super_secret_pass@127.0.0.1:5432/my_qa_db");
      expect(masked).not.toContain("secret_user");
      expect(masked).not.toContain("super_secret_pass");
      expect(masked).toContain("***:***@127.0.0.1:5432/my_qa_db");
    });
  });
});
