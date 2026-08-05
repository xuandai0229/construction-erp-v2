import { chromium, type FullConfig } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

export default async function globalSetup(config: FullConfig) {
  const authPath = path.join(
    process.cwd(),
    "playwright",
    ".auth",
    "admin.json"
  );

  try {
    const existing = await fs.readFile(authPath, "utf-8");
    if (existing && existing.includes("auth_session")) {
      return; // Already authenticated
    }
  } catch {
    // Proceed to login
  }

  const baseURL =
    config.projects[0]?.use?.baseURL ??
    process.env.PLAYWRIGHT_BASE_URL ??
    "http://127.0.0.1:3000";

  const email = process.env.E2E_ADMIN_USERNAME || process.env.QA_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD || process.env.QA_ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn(
      "[QA Setup Warning] E2E_ADMIN_USERNAME / E2E_ADMIN_PASSWORD environment variables are missing. Global setup authentication skipped."
    );
    return;
  }

  await fs.mkdir(path.dirname(authPath), { recursive: true });

  const browser = await chromium.launch();

  try {
    const context = await browser.newContext({ baseURL });
    const response = await context.request.post("/api/auth/login", {
      data: { email, password },
    });

    if (response.status() === 200) {
      await context.storageState({ path: authPath });
    } else {
      console.warn(`Global setup authentication failed with status ${response.status()}`);
    }
  } catch (err) {
    console.warn("Global setup login error:", err);
  } finally {
    await browser.close();
  }
}
