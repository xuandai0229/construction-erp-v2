import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createQaPrismaClient, createRunId } from "./setup-qa-env";

test.describe("HR Phase 0.2.1 — Browser/Network PII Leak Prevention Suite", () => {
  let prisma: PrismaClient;
  const runId = createRunId();

  test.beforeAll(async () => {
    const setup = createQaPrismaClient();
    prisma = setup.prisma;
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/hr/employees");
    if (page.url().includes("/login")) {
      let pass = process.env.E2E_ADMIN_PASSWORD || process.env.SETTINGS_E2E_PASSWORD_ADMIN;
      if (!pass) {
        try {
          const fsSync = require("fs");
          const e2eContent = fsSync.readFileSync(require("path").join(process.cwd(), ".env.e2e.local"), "utf-8");
          const match = e2eContent.match(/SETTINGS_E2E_PASSWORD_ADMIN="?([^"\r\n]+)"?/);
          if (match) pass = match[1];
        } catch {}
      }
      if (!pass) throw new Error("BLOCKED: Missing E2E_ADMIN_PASSWORD or SETTINGS_E2E_PASSWORD_ADMIN environment variable.");
      await page.fill('input[name="email"]', "admin@construction.local");
      await page.fill('input[name="password"]', pass);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
    }
  });

  test("Browser network traffic and UI MUST NOT expose raw PII or crypto fields", async ({ page }) => {
    const capturedResponses: any[] = [];
    page.on('response', async (response) => {
      // Capture RSC payloads or Next.js data fetching responses related to hr
      if (response.url().includes('/hr/employees')) {
        const type = response.headers()['content-type'];
        if (type && (type.includes('application/json') || type.includes('text/x-component'))) {
          try {
            const text = await response.text();
            capturedResponses.push(text);
          } catch (e) {
            // Ignore stream read errors if any
          }
        }
      }
    });

    // Capture console logs to ensure no leaks there
    const consoleLogs: string[] = [];
    page.on('console', msg => consoleLogs.push(msg.text()));

    // 2. Admin is already logged in via globalSetup storageState
    // 3. Navigate to employees list
    await page.goto("/hr/employees");
    await page.waitForSelector("body");
    
    // 4. Click into the first employee detail (if any exists)
    // For safety, we can just click the first link in the table
    const firstEmpLink = page.locator('a[href^="/hr/employees/"]').first();
    const count = await firstEmpLink.count();
    if (count > 0) {
      await firstEmpLink.click();
      await page.waitForSelector("body");
    }

    // 5. Assertions on Network Traffic
    for (const bodyText of capturedResponses) {
      expect(bodyText).not.toContain("identityNumberEncrypted");
      expect(bodyText).not.toContain("identityNumberBlindIndex");
      expect(bodyText).not.toContain("encryptionKeyVersion");
      expect(bodyText).not.toContain("ciphertext");
      expect(bodyText).not.toContain("authTag");
      expect(bodyText).not.toContain("iv");
    }

    // 6. Assertions on Console Logs
    for (const log of consoleLogs) {
      expect(log).not.toContain("identityNumberEncrypted");
      expect(log).not.toContain("ciphertext");
    }

    // 7. Verify serialized page data (hydration state)
    const nextData = await page.evaluate(() => {
      // Sometimes it's in window.__NEXT_DATA__ for pages router, but we use app router.
      // In app router, it's often inside inline scripts.
      const scripts = Array.from(document.querySelectorAll('script'));
      return scripts.map(s => s.textContent || "").join(" ");
    });

    expect(nextData).not.toContain("identityNumberEncrypted");
    expect(nextData).not.toContain("identityNumberBlindIndex");
    expect(nextData).not.toContain("ciphertext");

    // Check Audit Log for plaintext
    // Find recent audit logs related to Employee
    const recentAudits = await prisma.auditLog.findMany({
      where: { entityType: "Employee" },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    for (const audit of recentAudits) {
      const dataStr = JSON.stringify(audit.afterData || {});
      // Assuming a known CCCD format, or just ensure blind index / crypto fields are NOT there
      expect(dataStr).not.toContain("identityNumberEncrypted");
      expect(dataStr).not.toContain("identityNumberBlindIndex");
    }
  });
});
