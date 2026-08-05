import { describe, it, expect, vi } from "vitest";
import {
  parseCanonicalDatabaseTarget,
  validateQaDatabaseOrThrow,
  maskConnectionString,
} from "../../../../scripts/qa/setup-qa-env";

describe("QA Database Safety Guard", () => {
  it("should normalize loopback hostnames (localhost, 127.0.0.1, [::1]) to 127.0.0.1", () => {
    const t1 = parseCanonicalDatabaseTarget("postgresql://user:pass@localhost:5432/my_qa_db");
    const t2 = parseCanonicalDatabaseTarget("postgresql://user:pass@127.0.0.1:5432/my_qa_db");
    const t3 = parseCanonicalDatabaseTarget("postgresql://user:pass@[::1]:5432/my_qa_db");

    expect(t1.host).toBe("127.0.0.1");
    expect(t2.host).toBe("127.0.0.1");
    expect(t3.host).toBe("127.0.0.1");
  });

  it("should default port to 5432 if unspecified", () => {
    const target = parseCanonicalDatabaseTarget("postgresql://user:pass@localhost/my_test_db");
    expect(target.port).toBe("5432");
  });

  it("should parse schema parameter and default to public", () => {
    const tDefault = parseCanonicalDatabaseTarget("postgresql://user:pass@localhost:5432/my_test_db");
    const tCustom = parseCanonicalDatabaseTarget("postgresql://user:pass@localhost:5432/my_test_db?schema=custom_schema");

    expect(tDefault.schema).toBe("public");
    expect(tCustom.schema).toBe("custom_schema");
  });

  it("should throw error if QA_DATABASE_URL is missing", () => {
    expect(() => validateQaDatabaseOrThrow("", "postgresql://user:pass@localhost:5432/dev_db")).toThrow(
      "SAFETY VIOLATION: QA_DATABASE_URL is missing."
    );
  });

  it("should throw error if database URL is invalid", () => {
    expect(() => validateQaDatabaseOrThrow("invalid-url-string")).toThrow(
      "SAFETY VIOLATION: Invalid database connection URL string."
    );
  });

  it("should throw error if database name contains production keywords", () => {
    expect(() => validateQaDatabaseOrThrow("postgresql://user:pass@localhost:5432/prod_db")).toThrow(
      "SAFETY VIOLATION: Database name 'prod_db' in QA_DATABASE_URL contains production keywords"
    );
  });

  it("should throw error if database name does not contain safety keywords (qa, test, e2e, sandbox)", () => {
    expect(() => validateQaDatabaseOrThrow("postgresql://user:pass@localhost:5432/company_erp")).toThrow(
      "SAFETY VIOLATION: Database name 'company_erp' in QA_DATABASE_URL does not contain mandatory safety keyword"
    );
  });

  it("should throw error if QA target matches main DATABASE_URL across localhost/127.0.0.1 alias", () => {
    const mainUrl = "postgresql://user:secret@localhost:5432/construction_erp_qa_db";
    const qaUrl = "postgresql://user:secret@127.0.0.1:5432/construction_erp_qa_db";

    expect(() => validateQaDatabaseOrThrow(qaUrl, mainUrl)).toThrow(
      "SAFETY VIOLATION: QA_DATABASE_URL targets the exact same canonical database & schema as DATABASE_URL"
    );
  });

  it("should mask password in log output", () => {
    const masked = maskConnectionString("postgresql://admin:SecretPassword123!@localhost:5432/my_qa_db");
    expect(masked).not.toContain("SecretPassword123!");
    expect(masked).toContain("****");
  });

  it("should pass validation for isolated QA database URL", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = validateQaDatabaseOrThrow(
      "postgresql://postgres:pass@localhost:5432/construction_erp_v2_settings_e2e_20260803",
      "postgresql://postgres:pass@localhost:5432/construction_erp_v2_dev"
    );
    expect(result).toBe("postgresql://postgres:pass@localhost:5432/construction_erp_v2_settings_e2e_20260803");
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
