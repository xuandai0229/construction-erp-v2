import { describe, it, expect } from "vitest";
import { validateDatabaseSafety } from "../assert-safe-database-audit";

describe("assertSafeDatabaseAudit Guard Logic", () => {
  it("should FAIL when QA_DATABASE_URL is missing", () => {
    expect(() => validateDatabaseSafety(undefined, "postgresql://user:pass@localhost:5432/main_db")).toThrow(
      /QA_DATABASE_URL environment variable is missing or empty/
    );
  });

  it("should FAIL when QA_DATABASE_URL points to the exact same DB as DATABASE_URL", () => {
    const dbUrl = "postgresql://postgres:secret@localhost:5432/construction_erp_v2_qa";
    expect(() => validateDatabaseSafety(dbUrl, dbUrl)).toThrow(
      /QA_DATABASE_URL points to the exact same target/
    );
  });

  it("should FAIL when QA database name contains production keyword (even on localhost)", () => {
    const qaUrl = "postgresql://postgres:secret@localhost:5432/my_production_db";
    const mainUrl = "postgresql://postgres:secret@localhost:5432/other_db";
    expect(() => validateDatabaseSafety(qaUrl, mainUrl)).toThrow(
      /contains forbidden production keyword/
    );
  });

  it("should FAIL when QA database name lacks safe keyword (qa, test, sandbox, ci, dev)", () => {
    const qaUrl = "postgresql://postgres:secret@localhost:5432/random_company_db";
    const mainUrl = "postgresql://postgres:secret@localhost:5432/other_db";
    expect(() => validateDatabaseSafety(qaUrl, mainUrl)).toThrow(
      /must contain a recognized test identifier/
    );
  });

  it("should PASS when QA database has a valid distinct QA name", () => {
    const qaUrl = "postgresql://postgres:secret@127.0.0.1:5432/construction_erp_v2_qa";
    const mainUrl = "postgresql://postgres:secret@127.0.0.1:5432/construction_erp_v2_dev";
    const info = validateDatabaseSafety(qaUrl, mainUrl);
    expect(info.isSafe).toBe(true);
    expect(info.database).toBe("construction_erp_v2_qa");
    expect(info.maskedUser).toBe("po****");
  });
});
