import { chromium, type FullConfig } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

export default async function globalSetup(config: FullConfig) {
  const baseURL =
    config.projects[0]?.use?.baseURL ??
    process.env.PLAYWRIGHT_BASE_URL;

  let email = process.env.QA_ADMIN_EMAIL;
  let password = process.env.QA_ADMIN_PASSWORD;

  // Fallback to reading from the generated secrets file
  if (!email || !password) {
    try {
      const secretsPath = path.join(process.cwd(), 'test-results/ui-ux-phase-3/.secrets/qa-credentials.json');
      const saved = JSON.parse(await fs.readFile(secretsPath, 'utf-8'));
      email = email || saved.email;
      password = password || saved.password;
    } catch (e) {
      // Ignored
    }
  }

  if (!baseURL) {
    throw new Error("PLAYWRIGHT_BASE_URL is required.");
  }

  if (!email || !password) {
    throw new Error(
      "QA_ADMIN_EMAIL and QA_ADMIN_PASSWORD are required. No default credentials are allowed."
    );
  }

  const authPath = path.join(
    process.cwd(),
    "playwright",
    ".auth",
    "admin.json"
  );

  await fs.mkdir(path.dirname(authPath), { recursive: true });

  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({ baseURL });

    await page.goto("/login", {
      waitUntil: "domcontentloaded",
    });

    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.getByRole("button", { name: /đăng nhập/i }).click();

    await page.waitForURL(/\/dashboard(?:\?|$)/, {
      timeout: 20_000,
    });

    await page.context().storageState({ path: authPath });
  } finally {
    await browser.close();
  }
}
