import { describe, test, expect } from "vitest";
import { parseCanonicalDatabaseTarget, validateQaDatabaseOrThrow } from "./setup-qa-env";

describe("setup-qa-env — Database Isolation Guard Unit Tests", () => {
  test("1. Identical URLs throw SAFETY VIOLATION", () => {
    const url = "postgresql://usr:pwd@127.0.0.1:5432/db_qa?schema=public";
    expect(() => validateQaDatabaseOrThrow(url, url)).toThrow(/SAFETY VIOLATION/);
  });

  test("2. Host alias localhost vs 127.0.0.1 throws SAFETY VIOLATION", () => {
    const qa = "postgresql://usr:pwd@localhost:5432/db_qa?schema=public";
    const main = "postgresql://usr:pwd@127.0.0.1:5432/db_qa?schema=public";
    expect(() => validateQaDatabaseOrThrow(qa, main)).toThrow(/SAFETY VIOLATION/);
  });

  test("3. Host alias localhost vs [::1] throws SAFETY VIOLATION", () => {
    const qa = "postgresql://usr:pwd@localhost:5432/db_qa?schema=public";
    const main = "postgresql://usr:pwd@[::1]:5432/db_qa?schema=public";
    expect(() => validateQaDatabaseOrThrow(qa, main)).toThrow(/SAFETY VIOLATION/);
  });

  test("4. Implicit default port 5432 vs explicit 5432 throws SAFETY VIOLATION", () => {
    const qa = "postgresql://usr:pwd@127.0.0.1/db_qa?schema=public";
    const main = "postgresql://usr:pwd@127.0.0.1:5432/db_qa?schema=public";
    expect(() => validateQaDatabaseOrThrow(qa, main)).toThrow(/SAFETY VIOLATION/);
  });

  test("5. Query parameter order differences throw SAFETY VIOLATION if target matches", () => {
    const qa = "postgresql://usr:pwd@127.0.0.1:5432/db_qa?sslmode=disable&schema=public";
    const main = "postgresql://usr:pwd@127.0.0.1:5432/db_qa?schema=public&sslmode=disable";
    expect(() => validateQaDatabaseOrThrow(qa, main)).toThrow(/SAFETY VIOLATION/);
  });

  test("6. Default schema public vs explicit schema public throws SAFETY VIOLATION", () => {
    const qa = "postgresql://usr:pwd@127.0.0.1:5432/db_qa";
    const main = "postgresql://usr:pwd@127.0.0.1:5432/db_qa?schema=public";
    expect(() => validateQaDatabaseOrThrow(qa, main)).toThrow(/SAFETY VIOLATION/);
  });

  test("7. Valid distinct QA and Main targets PASS", () => {
    const qa = "postgresql://usr:pwd@127.0.0.1:5432/db_e2e?schema=public";
    const main = "postgresql://usr:pwd@127.0.0.1:5432/db_qa?schema=public";
    const result = validateQaDatabaseOrThrow(qa, main);
    expect(result).toBe(qa);
  });

  test("8. Database name without safety keyword throws SAFETY VIOLATION", () => {
    const qa = "postgresql://usr:pwd@127.0.0.1:5432/my_custom_db?schema=public";
    const main = "postgresql://usr:pwd@127.0.0.1:5432/db_qa?schema=public";
    expect(() => validateQaDatabaseOrThrow(qa, main)).toThrow(/safety keyword/);
  });

  test("9. Database name with production keyword throws SAFETY VIOLATION", () => {
    const qa = "postgresql://usr:pwd@127.0.0.1:5432/prod_qa_db?schema=public";
    const main = "postgresql://usr:pwd@127.0.0.1:5432/db_qa?schema=public";
    expect(() => validateQaDatabaseOrThrow(qa, main)).toThrow(/production keywords/);
  });

  test("10. Invalid URL string throws SAFETY VIOLATION", () => {
    expect(() => parseCanonicalDatabaseTarget("not-a-valid-url")).toThrow(/Invalid database connection URL/);
  });
});
