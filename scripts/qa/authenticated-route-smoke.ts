import { spawn, execSync } from "node:child_process";
import { chromium } from "playwright";
import { Client } from "pg";
import * as bcrypt from "bcryptjs";
import { loadCutoverEnv, parseDbUrl } from "./cutover-rehearsal-lib";

async function main() {
  let serverProcess: any = null;
  const port = 3150;
  
  const timestamp = Date.now();
  const dbName = `construction_erp_v2_smoke_${timestamp}`;
  const env = loadCutoverEnv();
  const dbUrl = env.rehearsalBaseUrl + "/" + dbName;
  const config = parseDbUrl(dbUrl);
  
  const baseConfig = parseDbUrl(env.rehearsalBaseUrl + "/postgres");
  const baseClient = new Client({ host: baseConfig.host, port: parseInt(baseConfig.port || "5432", 10), user: baseConfig.user, password: baseConfig.password, database: baseConfig.database });
  await baseClient.connect();
  // We must terminate connections to the template DB so we can clone it
  await baseClient.query(`SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'construction_erp_v2_qa' AND pid <> pg_backend_pid();`);
  await baseClient.query(`CREATE DATABASE "${dbName}" WITH TEMPLATE "construction_erp_v2_qa"`);
  await baseClient.end();
  
  require("node:fs").renameSync(require("node:path").join(process.cwd(), ".env"), require("node:path").join(process.cwd(), ".env.bak"));
  
  try {
    execSync(`npx prisma migrate deploy`, { encoding: "utf-8", env: { ...process.env, DATABASE_URL: dbUrl } });
  } finally {
    require("node:fs").renameSync(require("node:path").join(process.cwd(), ".env.bak"), require("node:path").join(process.cwd(), ".env"));
  }
  
  require("node:fs").writeFileSync(require("node:path").join(process.cwd(), ".env.local"), `DATABASE_URL=${dbUrl}\n`);
  
  execSync(`npm run build`, { stdio: "ignore", env: { ...process.env, DATABASE_URL: dbUrl } });
  
  
  const client = new Client({ host: config.host, port: parseInt(config.port || "5432", 10), user: config.user, password: config.password, database: config.database });
  let qaUserId = "";
  let qaProjectId = "";
  let qaMemberId = "";
  let smokeResults: any[] = [];
  
  try {
    await client.connect();
    
    console.log("Starting server on port", port);
    const nextBin = require.resolve("next/dist/bin/next");
    serverProcess = spawn(
      process.execPath,
      [nextBin, "start", "-p", String(port)],
      {
        cwd: process.cwd(),
        env: { ...process.env, PORT: String(port), DATABASE_URL: dbUrl },
        windowsHide: true,
        shell: false,
        stdio: ["ignore", "inherit", "inherit"]
      }
    );
    
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(`http://127.0.0.1:${port}/login`)).status === 200) { ready = true; break; } } catch {}
      await new Promise(r => setTimeout(r, 500));
    }
    
    if (!ready) {
      console.log("Server not ready.");
      process.exitCode = 1;
      return;
    }

    const timestamp = Date.now();
    qaUserId = `qa-smoke-user-${timestamp}`;
    qaProjectId = `qa-smoke-proj-${timestamp}`;
    qaMemberId = `qa-smoke-member-${timestamp}`;
    const qaEmail = `qa-smoke-${timestamp}@example.invalid`;
    const qaPass = "SmokeTest123!";
    const qaHash = await bcrypt.hash(qaPass, 10);
    
    await client.query(`INSERT INTO "User" (id, email, username, password, name, role, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`, [qaUserId, qaEmail, `qasmoke${timestamp}`, qaHash, "QA Smoke", "ADMIN"]);
    await client.query(`INSERT INTO "Project" (id, code, name, status, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())`, [qaProjectId, `QAP-${timestamp}`, "QA Smoke Project", "ACTIVE"]);
    await client.query(`INSERT INTO "ProjectMember" (id, "projectId", "userId", role, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())`, [qaMemberId, qaProjectId, qaUserId, "PROJECT_MANAGER"]);
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ baseURL: `http://127.0.0.1:${port}` });
    
    try {
      const page = await context.newPage();
      await page.goto("/login");
      await page.locator("#email").fill(qaEmail);
      await page.locator("#password").fill(qaPass);
      await Promise.all([
         page.waitForNavigation(),
         page.locator('button[type="submit"]').click()
      ]);
      
      // Removed /contracts and /payments based on route inventory
      const routes = ["/dashboard", "/projects", "/documents", "/reports", "/materials", "/settings", "/tasks"];
      
      for (const r of routes) {
        const res = await page.goto(r);
        const url = page.url();
        let sStatus = "PASS";
        let errReason = "-";
        
        if (url.includes("/login")) {
          sStatus = "FAIL"; errReason = "Redirected to login";
        } else if (!res || !res.ok()) {
          sStatus = "FAIL"; errReason = `HTTP ${res ? res.status() : "Unknown"}`;
        } else {
          const html = await page.content();
          if (html.includes("Application error") || html.includes("An error occurred") || html.includes("ErrorBoundary")) {
            sStatus = "FAIL"; errReason = "Next.js Error Boundary";
          } else if (html.includes("PrismaClientKnownRequestError") || html.includes("Runtime Error")) {
            sStatus = "FAIL"; errReason = "Prisma/Runtime error";
          }
        }
        smokeResults.push({ route: r, status: sStatus, error: errReason });
      }
    } finally {
      await browser.close();
    }
  } finally {
    if (qaUserId) {
      try { await client.query(`DELETE FROM "ProjectMember" WHERE id = $1`, [qaMemberId]); } catch {}
      try { await client.query(`DELETE FROM "Project" WHERE id = $1`, [qaProjectId]); } catch {}
      try { await client.query(`DELETE FROM "User" WHERE id = $1`, [qaUserId]); } catch {}
    }
    try {
      const left = await client.query(`SELECT count(*)::int as c FROM "User" WHERE id = $1`, [qaUserId]);
      if (left.rows[0].c === 0) console.log("Smoke fixture cleanup: PASS");
      else console.log("Smoke fixture cleanup: FAIL");
    } catch {
       console.log("Smoke fixture cleanup: FAIL (error)");
    }
    
    try { await client.end(); } catch {}
    
    if (serverProcess) {
      serverProcess.kill("SIGTERM");
      await new Promise(r => setTimeout(r, 2000));
      try { execSync(`taskkill /PID ${serverProcess.pid} /T /F`, { stdio: "ignore" }); } catch {}
    }
    
    try { require("node:fs").unlinkSync(require("node:path").join(process.cwd(), ".env.local")); } catch {}
  }
  
  console.log("\nAuthenticated scoped smoke:");
  console.log(`routes: ${smokeResults.length}`);
  console.log(`pass: ${smokeResults.filter(r => r.status === "PASS").length}`);
  console.log(`fail: ${smokeResults.filter(r => r.status === "FAIL").length}`);
  for (const r of smokeResults) {
    console.log(`${r.route}: ${r.status} ${r.error !== "-" ? `(${r.error})` : ""}`);
  }
  
  if (smokeResults.some(r => r.status === "FAIL")) {
    process.exitCode = 1;
  }
}

main();
