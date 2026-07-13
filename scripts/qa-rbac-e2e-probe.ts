import bcrypt from "bcryptjs";
import { chromium, type Page } from "playwright";
import prisma from "../src/lib/prisma";

const baseUrl = process.env.QA_BASE_URL || "http://localhost:3000";
const defaultPassword = process.env.COMPLETE_REALISTIC_PROJECT_SEED_PASSWORD || "CompleteSeed@2026!";
const qaPassword = "QA_RBAC_E2E_PASSWORD_2026!";
const qaUserIds: string[] = [];

const seedUsers = [
  { label: "admin", email: "tayho.admin@seed.local", password: "Admin@123", expectedProject: true, expectedMaterialMutationUi: true },
  { label: "director", email: "tayho.director@seed.local", password: defaultPassword, expectedProject: true, expectedMaterialMutationUi: true },
  { label: "commander", email: "tayho.site@seed.local", password: defaultPassword, expectedProject: true, expectedMaterialMutationUi: true },
  { label: "viewer", email: "tayho.viewer@seed.local", password: defaultPassword, expectedProject: true, expectedMaterialMutationUi: false },
];

async function createQaUser(role: "DEPUTY_DIRECTOR" | "STAFF") {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const user = await prisma.user.create({
    data: {
      email: `qa_rbac_e2e_${role.toLowerCase()}_${stamp}@local.test`,
      username: `QA_RBAC_E2E_${role}_${stamp}`,
      name: `QA_RBAC_E2E_${role}`,
      password: await bcrypt.hash(qaPassword, 10),
      role,
    },
  });
  qaUserIds.push(user.id);
  return {
    label: role === "DEPUTY_DIRECTOR" ? "deputy" : "outside",
    email: user.email,
    password: qaPassword,
    expectedProject: role === "DEPUTY_DIRECTOR",
    expectedMaterialMutationUi: role === "DEPUTY_DIRECTOR",
  };
}

async function login(page: Page, email: string, password: string) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  const responsePromise = page.waitForResponse((res) => res.url().includes("/api/auth/login"), { timeout: 15000 });
  await page.click('button[type="submit"]');
  const response = await responsePromise;
  if (response.status() !== 200) {
    throw new Error(`Login failed for ${email}: HTTP ${response.status()}`);
  }
}

async function viewerDirectUploadBlocked(page: Page) {
  const project = await prisma.project.findFirst({ where: { deletedAt: null }, select: { id: true } });
  if (!project) throw new Error("No project for viewer direct upload test.");
  const folder = await prisma.documentFolder.findFirst({ where: { projectId: project.id, deletedAt: null }, select: { id: true } });
  if (!folder) throw new Error("No document folder for viewer direct upload test.");

  return page.evaluate(async ({ baseUrl, projectId, folderId }) => {
    const url = `${baseUrl}/api/documents/upload?projectId=${encodeURIComponent(projectId)}&folderId=${encodeURIComponent(folderId)}&fileName=qa-viewer-block.pdf`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/pdf" },
      body: "%PDF-1.4\n% QA viewer upload should be blocked\n",
    });
    return { status: response.status, text: await response.text() };
  }, { baseUrl, projectId: project.id, folderId: folder.id });
}

async function clickMaterialTab(page: Page, token: string) {
  const buttons = await page.locator("button").evaluateAll((nodes) =>
    nodes.map((node) => (node.textContent || "").trim()),
  );
  const index = buttons.findIndex((text) =>
    text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(token),
  );
  if (index >= 0) {
    await page.locator("button").nth(index).click();
  }
  await page.waitForTimeout(500);
}

async function hasMaterialsMutationUi(page: Page) {
  const tokens = ["danh muc", "xuat vat", "nhap / xuat"];
  const actionPattern = /Thêm vật tư|Tạo đề xuất|Nhập kho|Xuất kho|Tạo giao dịch/i;
  for (const token of tokens) {
    await clickMaterialTab(page, token);
    const buttons = await page.locator("button").evaluateAll((nodes) => nodes.map((node) => (node.textContent || "").trim()).filter(Boolean));
    if (buttons.some((text) => actionPattern.test(text))) return true;
  }
  return false;
}

async function main() {
  const project = await prisma.project.findFirst({ where: { deletedAt: null }, select: { id: true } });
  if (!project) throw new Error("No project available for E2E probe.");
  const users = [...seedUsers, await createQaUser("DEPUTY_DIRECTOR"), await createQaUser("STAFF")];
  const browser = await chromium.launch({ headless: true });
  const results: string[] = [];
  let failed = 0;

  try {
    for (const user of users) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await login(page, user.email, user.password);
      if (user.expectedProject) {
        await context.addCookies([{
          name: "selectedProjectId",
          value: project.id,
          domain: "localhost",
          path: "/",
          httpOnly: false,
          secure: false,
          sameSite: "Lax",
        }]);
      }

      await page.goto(`${baseUrl}/projects`, { waitUntil: "networkidle" });
      const projectText = await page.locator("body").innerText();
      const seesProject = projectText.includes("CT-TAYHO-2026-001") || projectText.includes("Tây Hồ") || projectText.includes("Tay Ho");
      const projectResult = seesProject === user.expectedProject ? "PASS" : "FAIL";
      if (projectResult === "FAIL") failed += 1;
      results.push(`${user.label} project scope expected=${user.expectedProject ? "visible" : "hidden"} actual=${seesProject ? "visible" : "hidden"} result=${projectResult}`);

      await page.goto(`${baseUrl}/materials`, { waitUntil: "networkidle" });
      const hasMaterialMutationUi = await hasMaterialsMutationUi(page);
      const materialResult = hasMaterialMutationUi === user.expectedMaterialMutationUi ? "PASS" : "FAIL";
      if (materialResult === "FAIL") failed += 1;
      results.push(`${user.label} materials mutation UI expected=${user.expectedMaterialMutationUi ? "show" : "hide"} actual=${hasMaterialMutationUi ? "show" : "hide"} result=${materialResult}`);

      if (user.label === "viewer") {
        const upload = await viewerDirectUploadBlocked(page);
        const uploadResult = upload.status === 403 ? "PASS" : "FAIL";
        if (uploadResult === "FAIL") failed += 1;
        results.push(`viewer direct document upload expected=403 actual=${upload.status} result=${uploadResult}`);
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  console.log("=== RBAC E2E PROBE ===");
  for (const line of results) console.log(line);
  if (failed > 0) throw new Error(`RBAC E2E probe failed: ${failed} check(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (qaUserIds.length > 0) {
      await prisma.projectMember.deleteMany({ where: { userId: { in: qaUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: qaUserIds }, name: { startsWith: "QA_RBAC_E2E_" } } });
    }
    await prisma.$disconnect();
  });
