import { describe, it, expect } from "vitest";
import { validatePreflightTarget } from "../../../scripts/qa/settings-readonly-preflight";

describe("settings-readonly-preflight guard & parser", () => {
  it("should fail when SETTINGS_PREFLIGHT_DATABASE_URL is missing", () => {
    expect(() => validatePreflightTarget(undefined, "postgresql://user:pass@localhost:5432/main_db")).toThrow(
      /SETTINGS_PREFLIGHT_DATABASE_URL is required/
    );
  });

  it("should fail when protocol is invalid", () => {
    expect(() =>
      validatePreflightTarget("mysql://user:pass@localhost:5432/test_qa", "postgresql://user:pass@localhost:5432/main_db")
    ).toThrow(/protocol must be 'postgresql' or 'postgres'/);
  });

  it("should fail when database is system database postgres or template1", () => {
    expect(() =>
      validatePreflightTarget("postgresql://user:pass@localhost:5432/postgres", "postgresql://user:pass@localhost:5432/main_db")
    ).toThrow(/system template\/admin database/);
  });

  it("should fail when target matches primary database without ALLOW_PRIMARY_READONLY_PREFLIGHT", () => {
    const dbUrl = "postgresql://user:pass@127.0.0.1:5432/construction_erp_v2_qa";
    const mainUrl = "postgresql://user:pass@localhost:5432/construction_erp_v2_qa";
    expect(() => validatePreflightTarget(dbUrl, mainUrl, false)).toThrow(/targets the primary DATABASE_URL/);
  });

  it("should allow target matching primary database when ALLOW_PRIMARY_READONLY_PREFLIGHT=true", () => {
    const dbUrl = "postgresql://user:pass@127.0.0.1:5432/construction_erp_v2_qa";
    const mainUrl = "postgresql://user:pass@localhost:5432/construction_erp_v2_qa";
    const target = validatePreflightTarget(dbUrl, mainUrl, true);
    expect(target.database).toBe("construction_erp_v2_qa");
    expect(target.host).toBe("localhost");
  });

  it("should fail when target database lacks safe identifier (qa, test, e2e, sandbox) and allowPrimary is false", () => {
    const dbUrl = "postgresql://user:pass@localhost:5432/production_replica";
    const mainUrl = "postgresql://user:pass@localhost:5432/main_db";
    expect(() => validatePreflightTarget(dbUrl, mainUrl, false)).toThrow(
      /must contain a recognized E2E\/test identifier/
    );
  });

  it("should pass when target is a valid distinct E2E database", () => {
    const dbUrl = "postgresql://user:pass@localhost:5432/construction_erp_v2_settings_e2e_20260803";
    const mainUrl = "postgresql://user:pass@localhost:5432/construction_erp_v2_qa";
    const target = validatePreflightTarget(dbUrl, mainUrl, false);
    expect(target.database).toBe("construction_erp_v2_settings_e2e_20260803");
  });
});
