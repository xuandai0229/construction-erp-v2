import { chromium } from "playwright";
import assert from "node:assert/strict";

async function main() {
  console.log("Starting smoke test...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const baseUrl = "http://localhost:3001";

  console.log("Testing 404s when logged out...");
  for (const path of ["/suppliers", "/contracts", "/accounting"]) {
    const res = await page.goto(`${baseUrl}${path}`);
    assert.equal(res?.status(), 404, `Expected 404 for ${path} logged out, got ${res?.status()}`);
  }

  console.log("Logging in as tayho.admin@seed.local...");
  await page.goto(`${baseUrl}/login`);
  await page.fill('input[name="email"]', 'tayho.admin@seed.local');
  await page.fill('input[name="password"]', '123456');
  
  const [loginRes] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/auth/login')),
    page.click('button[type="submit"]')
  ]);
  
  if (!loginRes.ok()) {
    const body = await loginRes.text();
    throw new Error(`Login failed! Status: ${loginRes.status()}, Body: ${body}`);
  }
  
  await page.waitForURL(/.*dashboard.*/, { timeout: 10000 });
  console.log("Login successful, Dashboard loaded.");

  console.log("Testing 404s when logged in...");
  for (const path of ["/suppliers", "/contracts", "/accounting"]) {
    const res = await page.goto(`${baseUrl}${path}`);
    assert.equal(res?.status(), 404, `Expected 404 for ${path} logged in, got ${res?.status()}`);
  }

  const modules = [
    { name: "Projects", url: "/projects" },
    { name: "Materials", url: "/materials" },
    { name: "Documents", url: "/documents" },
    { name: "Approvals", url: "/approvals" },
    { name: "Users", url: "/users" },
  ];

  for (const mod of modules) {
    console.log(`Loading ${mod.name} module...`);
    const res = await page.goto(`${baseUrl}${mod.url}`);
    if (res?.status() === 500) throw new Error(`500 on ${mod.name}`);
    await page.waitForLoadState("networkidle");
    console.log(`${mod.name} loaded successfully.`);
  }

  console.log("Testing ACCOUNTANT mapped to STAFF...");
  await context.clearCookies();
  await page.goto(`${baseUrl}/login`);
  await page.fill('input[name="email"]', 'tayho.accountant@seed.local');
  await page.fill('input[name="password"]', '123456');
  
  const [loginRes2] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/auth/login')),
    page.click('button[type="submit"]')
  ]);
  
  if (!loginRes2.ok()) {
    const body = await loginRes2.text();
    throw new Error(`Login 2 failed! Status: ${loginRes2.status()}, Body: ${body}`);
  }

  await page.waitForURL(/.*dashboard.*/, { timeout: 10000 });

  await page.goto(`${baseUrl}/projects`);
  await page.waitForLoadState("networkidle");
  const isCreateVisible = await page.isVisible('button:has-text("Tạo dự án")');
  if (isCreateVisible) {
    const btn = page.locator('button:has-text("Tạo dự án")').first();
    const disabled = await btn.getAttribute("disabled");
    assert.ok(disabled !== null, "STAFF (ex-ACCOUNTANT) should not be able to create project.");
  }
  console.log("Ex-ACCOUNTANT user verified as STAFF/VIEWER.");

  console.log("Smoke test completed successfully.");
  await browser.close();
}

main().catch(e => {
  console.error("Test failed:", e);
  process.exit(1);
});
