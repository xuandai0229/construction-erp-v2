import { describe, it, expect, vi, beforeEach } from "vitest";
import { evaluateQaDatabaseSafety } from "../assert-safe-qa-database";

const mockQuery = vi.fn();
const mockConnect = vi.fn();
const mockEnd = vi.fn();

vi.mock("pg", () => {
  function MockClient() {
    // @ts-ignore
    this.connect = mockConnect;
    // @ts-ignore
    this.query = mockQuery;
    // @ts-ignore
    this.end = mockEnd;
  }
  return {
    Client: MockClient,
    Pool: function MockPool() {},
  };
});

describe("assertSafeQaDatabase Guard Logic", () => {
  beforeEach(() => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          rolsuper: false,
          rolcreatedb: false,
          rolcreaterole: false,
          rolreplication: false,
          rolbypassrls: false,
        },
      ],
    });
    mockConnect.mockResolvedValue(undefined);
    mockEnd.mockResolvedValue(undefined);
  });

  it("should FAIL when QA_DATABASE_URL is missing", async () => {
    const result = await evaluateQaDatabaseSafety({ DATABASE_URL: "postgresql://user:pass@localhost:5432/main_db" });
    expect(result.safe).toBe(false);
    expect(!result.safe && result.reason).toContain("QA_DATABASE_URL is required");
  });

  it("should FAIL when QA_DATABASE_URL points to the exact same DB as DATABASE_URL", async () => {
    const dbUrl = "postgresql://postgres:secret@localhost:5432/construction_erp_v2_qa";
    const result = await evaluateQaDatabaseSafety({ DATABASE_URL: dbUrl, QA_DATABASE_URL: dbUrl });
    expect(result.safe).toBe(false);
    expect(!result.safe && result.reason).toContain("QA_DATABASE_URL must identify a database distinct from DATABASE_URL");
  });

  it("should FAIL when QA database name contains production keyword (even on localhost)", async () => {
    const qaUrl = "postgresql://postgres:secret@localhost:5432/my_production_db";
    const mainUrl = "postgresql://postgres:secret@localhost:5432/other_db";
    const result = await evaluateQaDatabaseSafety({ DATABASE_URL: mainUrl, QA_DATABASE_URL: qaUrl });
    expect(result.safe).toBe(false);
    expect(!result.safe && result.reason).toContain("QA database name contains a prohibited production marker");
  });

  it("should FAIL when QA database name lacks safe keyword", async () => {
    const qaUrl = "postgresql://postgres:secret@localhost:5432/random_company_db";
    const mainUrl = "postgresql://postgres:secret@localhost:5432/other_db";
    const result = await evaluateQaDatabaseSafety({ DATABASE_URL: mainUrl, QA_DATABASE_URL: qaUrl });
    expect(result.safe).toBe(false);
    expect(!result.safe && result.reason).toContain("QA database name must contain qa, test, e2e, ci, or sandbox");
  });

  it("should FAIL when QA database is Settings E2E database", async () => {
    const qaUrl = "postgresql://postgres:secret@localhost:5432/construction_erp_v2_settings_e2e_20260803";
    const mainUrl = "postgresql://postgres:secret@localhost:5432/other_db";
    const result = await evaluateQaDatabaseSafety({ DATABASE_URL: mainUrl, QA_DATABASE_URL: qaUrl });
    expect(result.safe).toBe(false);
    expect(!result.safe && result.reason).toContain("Cannot use Settings E2E database for HR QA");
  });

  it("should FAIL when QA database role has elevated privileges", async () => {
    mockQuery.mockResolvedValue({
      rows: [{ rolsuper: true, rolcreatedb: false, rolcreaterole: false, rolreplication: false, rolbypassrls: false }],
    });
    const qaUrl = "postgresql://postgres:secret@127.0.0.1:5432/construction_erp_v2_qa_hr";
    const mainUrl = "postgresql://postgres:secret@127.0.0.1:5432/construction_erp_v2_dev";
    const result = await evaluateQaDatabaseSafety({ DATABASE_URL: mainUrl, QA_DATABASE_URL: qaUrl });
    expect(result.safe).toBe(false);
    expect(!result.safe && result.reason).toContain("QA database role has elevated privileges");
  });

  it("should PASS when QA database has a valid distinct QA name and safe roles", async () => {
    const qaUrl = "postgresql://postgres:secret@127.0.0.1:5432/construction_erp_v2_qa_hr";
    const mainUrl = "postgresql://postgres:secret@127.0.0.1:5432/construction_erp_v2_dev";
    const result = await evaluateQaDatabaseSafety({ DATABASE_URL: mainUrl, QA_DATABASE_URL: qaUrl });
    expect(result.safe).toBe(true);
    if (result.safe) {
      expect(result.database).toBe("construction_erp_v2_qa_hr");
    }
  });

  it("should normalize localhost to 127.0.0.1 for canonical comparison", async () => {
    const qaUrl = "postgresql://postgres:secret@localhost:5432/construction_erp_v2_qa";
    const mainUrl = "postgresql://postgres:secret@127.0.0.1:5432/construction_erp_v2_qa";
    const result = await evaluateQaDatabaseSafety({ DATABASE_URL: mainUrl, QA_DATABASE_URL: qaUrl });
    expect(result.safe).toBe(false);
    expect(!result.safe && result.reason).toContain("QA_DATABASE_URL must identify a database distinct from DATABASE_URL");
  });
});
