import { describe, it, expect } from "vitest";
import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.hr-qa.local" });

describe("HR QA Role Least Privilege Security Guard", () => {
  const qaDbUrl = process.env.QA_DATABASE_URL;

  it("1. Verification: Role flags (NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOREPLICATION, NOBYPASSRLS)", async () => {
    expect(qaDbUrl).toBeDefined();
    const client = new Client({ connectionString: qaDbUrl });
    await client.connect();
    try {
      const res = await client.query(
        "SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls FROM pg_roles WHERE rolname = current_user;"
      );
      expect(res.rows.length).toBe(1);
      const role = res.rows[0];
      expect(role.rolsuper).toBe(false);
      expect(role.rolcreatedb).toBe(false);
      expect(role.rolcreaterole).toBe(false);
      expect(role.rolreplication).toBe(false);
      expect(role.rolbypassrls).toBe(false);
    } finally {
      await client.end();
    }
  });

  it("2. ALLOW: SELECT on HR table", async () => {
    const client = new Client({ connectionString: qaDbUrl });
    await client.connect();
    try {
      const res = await client.query('SELECT COUNT(*) FROM "Employee";');
      expect(res.rows.length).toBe(1);
    } finally {
      await client.end();
    }
  });

  it("3. ALLOW: INSERT, UPDATE, DELETE on HR fixture table", async () => {
    const client = new Client({ connectionString: qaDbUrl });
    await client.connect();
    const testCode = `TEST_LP_${Date.now()}`;
    try {
      // INSERT
      await client.query(
        'INSERT INTO "ProjectPersonnelRole" (id, code, name, "updatedAt") VALUES ($1, $2, $3, NOW());',
        [testCode, testCode, "Test Role"]
      );
      // UPDATE
      await client.query(
        'UPDATE "ProjectPersonnelRole" SET name = $1 WHERE id = $2;',
        ["Updated Test Role", testCode]
      );
      // DELETE
      await client.query(
        'DELETE FROM "ProjectPersonnelRole" WHERE id = $1;',
        [testCode]
      );
    } finally {
      await client.end();
    }
  });

  it("4. DENY: CREATE TABLE operation", async () => {
    const client = new Client({ connectionString: qaDbUrl });
    await client.connect();
    try {
      await expect(client.query("CREATE TABLE forbidden_test_tbl (id INT);")).rejects.toThrow();
    } finally {
      await client.end();
    }
  });

  it("5. DENY: ALTER TABLE operation", async () => {
    const client = new Client({ connectionString: qaDbUrl });
    await client.connect();
    try {
      await expect(client.query('ALTER TABLE "Employee" ADD COLUMN forbidden_col TEXT;')).rejects.toThrow();
    } finally {
      await client.end();
    }
  });

  it("6. DENY: DROP TABLE operation", async () => {
    const client = new Client({ connectionString: qaDbUrl });
    await client.connect();
    try {
      await expect(client.query('DROP TABLE "Employee";')).rejects.toThrow();
    } finally {
      await client.end();
    }
  });

  it("7. DENY: CREATE DATABASE operation", async () => {
    const client = new Client({ connectionString: qaDbUrl });
    await client.connect();
    try {
      await expect(client.query("CREATE DATABASE forbidden_db;")).rejects.toThrow();
    } finally {
      await client.end();
    }
  });

  it("8. DENY: Connecting to development database", async () => {
    const devUrl = qaDbUrl?.replace("construction_erp_v2_hr_qa", "construction_erp_v2_dev");
    const client = new Client({ connectionString: devUrl });
    await expect(client.connect()).rejects.toThrow();
  });

  it("9. DENY: Connecting to Settings E2E database", async () => {
    const settingsUrl = qaDbUrl?.replace("construction_erp_v2_hr_qa", "construction_erp_v2_settings_e2e_20260803");
    const client = new Client({ connectionString: settingsUrl });
    await expect(client.connect()).rejects.toThrow();
  });
});
