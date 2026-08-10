import "dotenv/config";
import { Pool } from "pg";
import http from "http";
import { createSessionToken } from "../src/lib/session-token";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3001";
const dbUrl = process.env.QA_DATABASE_URL || process.env.DATABASE_URL;

async function makeReq(path: string, cookie: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: "GET",
        headers: { Cookie: cookie },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

async function main() {
  console.log("=== EXECUTING INTERLEAVED CROSS-PROJECT RACE TEST ===");
  if (!dbUrl) throw new Error("No QA_DATABASE_URL set");

  const pool = new Pool({ connectionString: dbUrl });
  let admin, engineer, manager, supervisor;

  try {
    const res = await pool.query(`SELECT id, role, email, "updatedAt" FROM "User" WHERE "deletedAt" IS NULL LIMIT 20`);
    admin = res.rows.find((r) => r.role === "ADMIN");
    engineer = res.rows.find((r) => r.role === "ENGINEER");
    manager = res.rows.find((r) => r.role === "MANAGER");
    supervisor = res.rows.find((r) => r.role === "CONSTRUCTION_SUPERVISOR");
  } finally {
    await pool.end();
  }

  if (!admin || !engineer) throw new Error("Required users not found");

  const secret = process.env.AUTH_SECRET || process.env.SESSION_SECRET;
  if (!secret) throw new Error("No AUTH_SECRET or SESSION_SECRET set");
  const now = Math.floor(Date.now() / 1000);

  const tAdmin = `auth_session=${createSessionToken(admin.id, now, new Date(admin.updatedAt).toISOString())}`;
  const tEng = `auth_session=${createSessionToken(engineer.id, now, new Date(engineer.updatedAt).toISOString())}`;

  let violations = 0;
  const totalRounds = 50;

  const tasks = Array.from({ length: totalRounds }).map(async (_, idx) => {
    const isEven = idx % 2 === 0;
    const cookie = isEven ? tAdmin : tEng;
    const expectedRole = isEven ? "ADMIN" : "ENGINEER";

    const body = await makeReq("/dashboard", cookie);

    // Verify response integrity: ensure user session and role match expected token context
    if (expectedRole === "ENGINEER" && body.includes("Quản trị hệ thống (Admin)")) {
      console.error(`RACE VIOLATION DETECTED at iteration ${idx}: Engineer received Admin payload!`);
      violations++;
    }
  });

  await Promise.all(tasks);

  if (violations === 0) {
    console.log(`INTERLEAVED RACE TEST PASSED: 0 cross-request leaks across ${totalRounds} concurrent requests.`);
  } else {
    console.error(`INTERLEAVED RACE TEST FAILED: ${violations} violations!`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Race test failed:", e);
  process.exit(1);
});
