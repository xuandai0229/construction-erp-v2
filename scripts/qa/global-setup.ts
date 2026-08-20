import { chromium, type FullConfig } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

export default async function globalSetup(config: FullConfig) {
  const authPath = path.join(process.cwd(), "playwright", ".auth", "admin.json");
  const baseURL = config.projects[0]?.use?.baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
  const browser = await chromium.launch();

  try {
    try {
      await fs.access(authPath);
      const cachedContext = await browser.newContext({ baseURL, storageState: authPath });
      const validation = await cachedContext.request.get("/api/v1/me");
      await cachedContext.close();
      if (validation.ok()) return;
    } catch {
      // Missing/stale storage state continues to deterministic login below.
    }

    const username = process.env.E2E_ADMIN_USERNAME || process.env.QA_ADMIN_EMAIL || "daicongtu2910@gmail.com";
    let password =
      process.env.E2E_ADMIN_PASSWORD ||
      process.env.SEED_DEV_ADMIN_PASSWORD ||
      process.env.SETTINGS_E2E_PASSWORD_ADMIN ||
      process.env.QA_ADMIN_PASSWORD;
    if (!password) {
      try {
        const content = await fs.readFile(path.join(process.cwd(), ".env.e2e.local"), "utf-8");
        password = content.match(/SETTINGS_E2E_PASSWORD_ADMIN="?([^"\r\n]+)"?/)?.[1];
      } catch {
        // The final explicit error below is the only allowed fallback.
      }
    }
    if (!username || !password) {
      throw new Error("Authenticated browser QA requires configured admin credentials; refusing to skip AI E2E.");
    }

    await fs.mkdir(path.dirname(authPath), { recursive: true });
    const context = await browser.newContext({ baseURL });
    const response = await context.request.post("/api/auth/login", { data: { email: username, password } });
    if (!response.ok()) {
      await context.close();
      throw new Error(`Authenticated browser QA login failed with HTTP ${response.status()}; refusing false-pass.`);
    }
    await context.storageState({ path: authPath });
    const validation = await context.request.get("/api/v1/me");
    await context.close();
    if (!validation.ok()) {
      throw new Error(`Authenticated browser QA session validation failed with HTTP ${validation.status()}.`);
    }
  } finally {
    await browser.close();
  }
}
