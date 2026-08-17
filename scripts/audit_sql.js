const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

// Load .env.local
const envPath = path.join(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf8");
  envConfig.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      process.env[key] = value;
    }
  });
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log("=== 1. EMPLOYEES COUNT BY STATUS ===");
  const statusRes = await pool.query(`
    SELECT status, COUNT(*) as count 
    FROM "Employee" 
    GROUP BY status 
    ORDER BY status;
  `);
  console.table(statusRes.rows);

  const totalRes = await pool.query(`SELECT COUNT(*) FROM "Employee";`);
  console.log("Total employees in DB:", totalRes.rows[0].count);

  const activeRes = await pool.query(`
    SELECT COUNT(*) FROM "Employee" WHERE status IN ('ACTIVE', 'PROBATION');
  `);
  console.log("ACTIVE + PROBATION count:", activeRes.rows[0].count);

  console.log("\n=== 2. ORGANIZATION UNITS & PARENT HIERARCHY ===");
  const unitsRes = await pool.query(`
    SELECT 
      u.id, 
      u.code, 
      u.name, 
      u."parentId", 
      pu.code as "parentCode",
      pu.name as "parentName",
      u."isActive",
      (
        SELECT COUNT(*) 
        FROM "EmployeeOrganizationAssignment" eoa
        JOIN "Employee" e ON e.id = eoa."employeeId"
        WHERE eoa."organizationUnitId" = u.id 
          AND eoa."endDate" IS NULL 
          AND eoa."isPrimary" = true
          AND e.status IN ('ACTIVE', 'PROBATION')
      ) as "activeEmployeeCount",
      (
        SELECT string_agg(e."fullName" || ' (' || e.code || ')', ', ')
        FROM "OrganizationUnitManagerAssignment" ma
        JOIN "Employee" e ON e.id = ma."employeeId"
        WHERE ma."organizationUnitId" = u.id
          AND ma."endDate" IS NULL
          AND ma."isPrimary" = true
      ) as "currentManager"
    FROM "OrganizationUnit" u
    LEFT JOIN "OrganizationUnit" pu ON u."parentId" = pu.id
    ORDER BY u."orderIndex" ASC, u.code ASC;
  `);
  console.table(unitsRes.rows);

  console.log("\n=== 3. UNASSIGNED ACTIVE EMPLOYEES ===");
  const unassignedRes = await pool.query(`
    SELECT e.id, e.code, e."fullName", e.status
    FROM "Employee" e
    WHERE e.status IN ('ACTIVE', 'PROBATION')
      AND NOT EXISTS (
        SELECT 1 FROM "EmployeeOrganizationAssignment" eoa
        WHERE eoa."employeeId" = e.id
          AND eoa."endDate" IS NULL
          AND eoa."isPrimary" = true
      );
  `);
  console.log("Count unassigned to org unit:", unassignedRes.rows.length);
  if (unassignedRes.rows.length > 0) {
    console.table(unassignedRes.rows);
  }

  console.log("\n=== 4. POSITIONS LIST ===");
  const posRes = await pool.query(`
    SELECT 
      p.id, 
      p.code, 
      p.title, 
      p.level, 
      p."isActive",
      (
        SELECT COUNT(*) 
        FROM "EmployeeOrganizationAssignment" eoa
        JOIN "Employee" e ON e.id = eoa."employeeId"
        WHERE eoa."positionId" = p.id 
          AND eoa."endDate" IS NULL 
          AND eoa."isPrimary" = true
          AND e.status IN ('ACTIVE', 'PROBATION')
      ) as "activeEmployeeCount"
    FROM "Position" p
    ORDER BY p.code ASC;
  `);
  console.table(posRes.rows);

  console.log("\n=== 5. MANAGER EMPLOYEE ASSIGNMENTS (Checking if Managers belong to the Unit) ===");
  const mgrCheckRes = await pool.query(`
    SELECT 
      u.code as "unitCode",
      u.name as "unitName",
      e.code as "empCode",
      e."fullName" as "empName",
      e.status as "empStatus",
      (
        SELECT ou.code 
        FROM "EmployeeOrganizationAssignment" eoa
        JOIN "OrganizationUnit" ou ON ou.id = eoa."organizationUnitId"
        WHERE eoa."employeeId" = e.id AND eoa."endDate" IS NULL AND eoa."isPrimary" = true
      ) as "assignedUnitCode"
    FROM "OrganizationUnitManagerAssignment" ma
    JOIN "OrganizationUnit" u ON u.id = ma."organizationUnitId"
    JOIN "Employee" e ON e.id = ma."employeeId"
    WHERE ma."endDate" IS NULL AND ma."isPrimary" = true;
  `);
  console.table(mgrCheckRes.rows);
}

main()
  .catch(console.error)
  .finally(() => pool.end());
