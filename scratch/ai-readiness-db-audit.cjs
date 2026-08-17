const { Pool } = require("pg");

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const query = (text, params) => pool.query(text, params).then((result) => result.rows);
  try {
    const tables = await query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
      ORDER BY tablename
    `);
    const counts = {};
    for (const { tablename } of tables) {
      const safeName = `"${tablename.replaceAll('"', '""')}"`;
      const [{ count }] = await query(`SELECT COUNT(*)::int AS count FROM ${safeName}`);
      counts[tablename] = count;
    }

    const result = {
      tableCounts: counts,
      migrations: await query(`
        SELECT migration_name, finished_at IS NOT NULL AS finished, rolled_back_at IS NOT NULL AS rolled_back
        FROM "_prisma_migrations" ORDER BY started_at
      `),
      databaseSize: await query(`SELECT pg_size_pretty(pg_database_size(current_database())) AS size`),
      tableSizes: await query(`
        SELECT io.relname AS table_name, pg_size_pretty(pg_total_relation_size(io.relid)) AS total_size,
               stats.n_live_tup::bigint AS estimated_rows
        FROM pg_catalog.pg_statio_user_tables io
        JOIN pg_stat_user_tables stats USING (relid)
        ORDER BY pg_total_relation_size(io.relid) DESC
      `),
      foreignKeys: await query(`
        SELECT tc.table_name, tc.constraint_name, kcu.column_name,
               ccu.table_name AS referenced_table, ccu.column_name AS referenced_column,
               rc.delete_rule, rc.update_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name AND tc.constraint_schema = kcu.constraint_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
        JOIN information_schema.referential_constraints rc
          ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.constraint_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_name
      `),
      uniqueConstraints: await query(`
        SELECT tc.table_name, tc.constraint_name, string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name AND tc.constraint_schema = kcu.constraint_schema
        WHERE tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE') AND tc.table_schema = 'public'
        GROUP BY tc.table_name, tc.constraint_name
        ORDER BY tc.table_name, tc.constraint_name
      `),
      indexes: await query(`
        SELECT tablename, indexname, indexdef FROM pg_indexes
        WHERE schemaname = 'public' ORDER BY tablename, indexname
      `),
      integrity: {
        piiStorageCoverage: await query(`
          SELECT count(*)::int AS employees,
                 count(*) FILTER (WHERE "identityNumberEncrypted" IS NOT NULL)::int AS encrypted_identity_rows,
                 count(*) FILTER (WHERE "identityNumberBlindIndex" IS NOT NULL)::int AS blind_index_rows
          FROM "Employee"
        `),
        usersWithoutLoginIdentifier: await query(`SELECT id, name FROM "User" WHERE email IS NULL AND username IS NULL AND "deletedAt" IS NULL`),
        activeUsersWithoutEmployee: await query(`
          SELECT u.id, u.name, u.role, u.email, u.username
          FROM "User" u LEFT JOIN "Employee" e ON e."userId" = u.id
          WHERE u."isActive" = true AND u."deletedAt" IS NULL AND e.id IS NULL
          ORDER BY u.role, u.name
        `),
        activeEmployeesWithoutUser: await query(`
          SELECT id, code, "fullName", status FROM "Employee"
          WHERE status IN ('ACTIVE', 'PROBATION') AND "userId" IS NULL ORDER BY code
        `),
        normalizedEmployeeNameDuplicates: await query(`
          SELECT lower(regexp_replace(trim("fullName"), '\\s+', ' ', 'g')) AS normalized_name,
                 count(*)::int AS count, array_agg(code ORDER BY code) AS codes
          FROM "Employee"
          GROUP BY 1 HAVING count(*) > 1
        `),
        duplicateProjectMemberPairs: await query(`
          SELECT "projectId", "userId", count(*)::int AS count
          FROM "ProjectMember" GROUP BY 1,2 HAVING count(*) > 1
        `),
        activeCommanderAssignmentWithoutMember: await query(`
          SELECT e.code, e."fullName", a."projectId"
          FROM "EmployeeProjectAssignment" a
          JOIN "Employee" e ON e.id = a."employeeId"
          JOIN "ProjectPersonnelRole" r ON r.id = a."projectPersonnelRoleId" AND r.code = 'CHT'
          LEFT JOIN "ProjectMember" pm ON pm."projectId" = a."projectId" AND pm."userId" = e."userId"
            AND pm."isActive" = true AND pm."deletedAt" IS NULL AND pm."leftAt" IS NULL
          WHERE a.status = 'ACTIVE' AND e."userId" IS NOT NULL AND pm.id IS NULL
        `),
        activeCommanderMemberWithoutAssignment: await query(`
          SELECT u.username, pm."projectId"
          FROM "ProjectMember" pm
          JOIN "User" u ON u.id = pm."userId"
          LEFT JOIN "Employee" e ON e."userId" = u.id
          LEFT JOIN "EmployeeProjectAssignment" a ON a."employeeId" = e.id AND a."projectId" = pm."projectId"
            AND a.status = 'ACTIVE'
          LEFT JOIN "ProjectPersonnelRole" r ON r.id = a."projectPersonnelRoleId" AND r.code = 'CHT'
          WHERE pm.role = 'CHIEF_COMMANDER' AND pm."isActive" = true AND pm."deletedAt" IS NULL
            AND (a.id IS NULL OR r.id IS NULL)
        `),
        leftMembersStillActive: await query(`
          SELECT id, "projectId", "userId", "leftAt" FROM "ProjectMember"
          WHERE "isActive" = true AND "deletedAt" IS NULL AND "leftAt" IS NOT NULL
        `),
        projectsWithoutActiveCommanderAssignment: await query(`
          SELECT p.code, p.name
          FROM "Project" p
          LEFT JOIN "EmployeeProjectAssignment" a ON a."projectId" = p.id AND a.status = 'ACTIVE'
          LEFT JOIN "ProjectPersonnelRole" r ON r.id = a."projectPersonnelRoleId" AND r.code = 'CHT'
          WHERE p."deletedAt" IS NULL
          GROUP BY p.id HAVING count(r.id) = 0 ORDER BY p.code
        `),
        projectStatusCounts: await query(`SELECT status, count(*)::int AS count FROM "Project" GROUP BY status ORDER BY status`),
        userRoleCounts: await query(`
          SELECT role, count(*)::int AS total,
                 count(*) FILTER (WHERE "isActive" AND "deletedAt" IS NULL)::int AS current
          FROM "User" GROUP BY role ORDER BY role
        `),
        assignmentStatusCounts: await query(`SELECT status, count(*)::int AS count FROM "EmployeeProjectAssignment" GROUP BY status ORDER BY status`),
        auditCoverage: await query(`
          SELECT "entityType", action, count(*)::int AS count,
                 count(*) FILTER (WHERE "userId" IS NULL)::int AS missing_actor,
                 count(*) FILTER (WHERE "projectId" IS NULL)::int AS missing_project,
                 count(*) FILTER (WHERE "beforeData" IS NULL AND "afterData" IS NULL)::int AS missing_change_data
          FROM "AuditLog" GROUP BY "entityType", action ORDER BY "entityType", action
        `),
        auditFieldCoverage: await query(`
          SELECT count(*)::int AS total,
                 count(*) FILTER (WHERE "userId" IS NULL)::int AS missing_actor,
                 count(*) FILTER (WHERE "projectId" IS NULL)::int AS missing_project,
                 count(*) FILTER (WHERE "ipAddress" IS NULL)::int AS missing_ip,
                 count(*) FILTER (WHERE "userAgent" IS NULL)::int AS missing_user_agent,
                 count(*) FILTER (WHERE "beforeData" IS NULL)::int AS missing_before_data,
                 count(*) FILTER (WHERE "afterData" IS NULL)::int AS missing_after_data
          FROM "AuditLog"
        `),
      },
    };
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
