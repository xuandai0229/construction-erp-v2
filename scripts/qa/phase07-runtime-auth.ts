import { chromium } from "playwright";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

require("dotenv").config();

const SCREENSHOT_DIR = join(process.cwd(), "docs/qa/screenshots");
if (!existsSync(SCREENSHOT_DIR)) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function main() {
  console.log("=== PLAYWRIGHT REAL AUTHENTICATED RUNTIME VERIFICATION ===");

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const res = await client.query(`SELECT id, email, role FROM "User" WHERE email = 'daicongtu2910@gmail.com';`);
  const adminUser = res.rows[0];
  await client.end();

  if (!adminUser) {
    throw new Error("Admin user daicongtu2910@gmail.com not found in DB");
  }

  console.log(`Found Admin User: ${adminUser.email} (Role: ${adminUser.role})`);

  const browser = await chromium.launch({ headless: true });

  // --- PART 1: Anonymous Access Checks ---
  console.log("\n--- Testing Anonymous Access ---");
  const anonContext = await browser.newContext();
  const anonPage = await anonContext.newPage();

  // Anonymous GET /tasks
  await anonPage.goto("http://localhost:3000/tasks", { waitUntil: "networkidle" });
  const anonTasksUrl = anonPage.url();
  await anonPage.screenshot({ path: join(SCREENSHOT_DIR, "phase07-anonymous-tasks.png") });
  console.log(`[Anonymous /tasks] Final URL: ${anonTasksUrl}`);

  // Anonymous GET /route-khong-ton-tai-qa-20260803
  await anonPage.goto("http://localhost:3000/route-khong-ton-tai-qa-20260803", { waitUntil: "networkidle" });
  const anonRandomUrl = anonPage.url();
  await anonPage.screenshot({ path: join(SCREENSHOT_DIR, "phase07-anonymous-random.png") });
  console.log(`[Anonymous Random Route] Final URL: ${anonRandomUrl}`);
  await anonContext.close();

  // --- PART 2: Authenticated Access Checks ---
  console.log("\n--- Testing Authenticated Access ---");
  const authContext = await browser.newContext();
  const authPage = await authContext.newPage();

  const consoleErrors: string[] = [];
  authPage.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  const networkErrors: string[] = [];
  authPage.on("response", (res) => {
    if (res.status() >= 400 && res.status() !== 404) {
      networkErrors.push(`${res.status()} ${res.url()}`);
    }
  });

  // Perform Login
  await authPage.goto("http://localhost:3000/login");
  await authPage.fill("input[name='email'], input[type='email']", "daicongtu2910@gmail.com");
  await authPage.fill("input[name='password'], input[type='password']", "123456");
  await authPage.click("button[type='submit']");
  await authPage.waitForURL((url) => !url.toString().includes("/login"), { timeout: 10000 });
  console.log(`[Login Successful] Authenticated as ${adminUser.email}. Current URL: ${authPage.url()}`);

  // Authenticated GET /tasks
  console.log("\nNavigating to /tasks with active session...");
  const tasksResponse = await authPage.goto("http://localhost:3000/tasks", { waitUntil: "networkidle" });
  const authTasksUrl = authPage.url();
  const authTasksStatus = tasksResponse?.status();
  const authTasksContent = await authPage.content();
  await authPage.screenshot({ path: join(SCREENSHOT_DIR, "phase07-authenticated-tasks.png") });
  console.log(`[Authenticated /tasks] HTTP Status: ${authTasksStatus}, Final URL: ${authTasksUrl}`);

  // Authenticated GET /route-khong-ton-tai-qa-20260803
  console.log("\nNavigating to /route-khong-ton-tai-qa-20260803 with active session...");
  const randomResponse = await authPage.goto("http://localhost:3000/route-khong-ton-tai-qa-20260803", { waitUntil: "networkidle" });
  const authRandomUrl = authPage.url();
  const authRandomStatus = randomResponse?.status();
  await authPage.screenshot({ path: join(SCREENSHOT_DIR, "phase07-authenticated-random.png") });
  console.log(`[Authenticated Random Route] HTTP Status: ${authRandomStatus}, Final URL: ${authRandomUrl}`);

  await browser.close();

  const evidence = {
    timestamp: new Date().toISOString(),
    anonymous: {
      tasksFinalUrl: anonTasksUrl,
      randomFinalUrl: anonRandomUrl,
      isRedirectedToLogin: anonTasksUrl.includes("/login") && anonRandomUrl.includes("/login"),
    },
    authenticated: {
      tasksStatus: authTasksStatus,
      tasksFinalUrl: authTasksUrl,
      randomStatus: authRandomStatus,
      randomFinalUrl: authRandomUrl,
      consoleErrors,
      networkErrors,
      has500Error: authTasksStatus === 500 || authRandomStatus === 500,
      is404Page: authTasksContent.includes("404") || authTasksContent.includes("Không tìm thấy"),
    },
  };

  writeFileSync(
    join(process.cwd(), "docs/qa/backups/phase07/runtime-auth-evidence.json"),
    JSON.stringify(evidence, null, 2),
    "utf-8"
  );

  console.log("\n=== AUTHENTICATED RUNTIME EVIDENCE ===");
  console.log(JSON.stringify(evidence, null, 2));
}

main().catch(console.error);
