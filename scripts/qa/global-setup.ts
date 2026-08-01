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
  } catch (e) {
    // Proceed to login
  }

  const baseURL =
    config.projects[0]?.use?.baseURL ??
    process.env.PLAYWRIGHT_BASE_URL ??
    "http://127.0.0.1:3000";

  let email = process.env.QA_ADMIN_EMAIL || "qa.admin.tuhiep@example.test";
  let password = process.env.QA_ADMIN_PASSWORD || "R_CSs9EW06iHTDY4aiMG28Y6hpzh1DAr_E-3FA7A0dk";

  await fs.mkdir(path.dirname(authPath), { recursive: true });

  const browser = await chromium.launch();

  try {
    const context = await browser.newContext({ baseURL });
    const response = await context.request.post("/api/auth/login", {
      data: { email, password },
    });

    if (response.status() === 200) {
      await context.storageState({ path: authPath });
    }
  } catch (err) {
    console.warn("Global setup login warning:", err);
  } finally {
    await browser.close();
  }
}
