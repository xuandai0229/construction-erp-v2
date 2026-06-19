import * as bcrypt from "bcryptjs";
import { chromium, type Page } from "playwright";
import prisma from "../src/lib/prisma";
import { requireQaEnv } from "./qa-env";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const PROJECT_PREFIX = "QA_RBAC_RUNTIME_";
const USER_PREFIX = "qa-rbac-runtime-";
const TEST_PASSWORD = requireQaEnv("QA_RBAC_TEST_PASSWORD");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function assertRedirectedAway(page: Page, restrictedPath: string) {
  await page.goto(`${BASE_URL}${restrictedPath}`);
  await page.waitForLoadState("networkidle");
  const finalPath = new URL(page.url()).pathname;
  assert(
    finalPath !== restrictedPath &&
      !finalPath.startsWith(`${restrictedPath}/`),
    `Direct URL ${restrictedPath} không bị chặn; vẫn ở ${finalPath}.`
  );
}

async function cleanupRuntimeData() {
  await prisma.project.deleteMany({
    where: { code: { startsWith: PROJECT_PREFIX } },
  });
  await prisma.user.deleteMany({
    where: { email: { startsWith: USER_PREFIX } },
  });
}

async function main() {
  console.log("=== QA RBAC DIRECT URL ACCESS TEST ===");
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `${USER_PREFIX}${suffix}@construction.local`;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    await cleanupRuntimeData();
    const password = await bcrypt.hash(TEST_PASSWORD, 10);
    const commander1 = await prisma.user.create({
      data: {
        email,
        username: `${USER_PREFIX}${suffix}`.slice(0, 48),
        password,
        name: "QA RBAC Runtime Commander 1",
        role: "CHIEF_COMMANDER",
        isActive: true,
      },
    });
    const projectA = await prisma.project.create({
      data: {
        code: `${PROJECT_PREFIX}CT_001`,
        name: "Project A - Granted",
        status: "ACTIVE",
        members: {
          create: {
            userId: commander1.id,
            role: "CHIEF_COMMANDER",
          },
        },
      },
    });
    const projectB = await prisma.project.create({
      data: {
        code: `${PROJECT_PREFIX}CT_002`,
        name: "Project B - Denied",
        status: "ACTIVE",
      },
    });

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");
    console.log("PASS 1: commander1 login.");

    await page.goto(`${BASE_URL}/projects`);
    await page.waitForLoadState("networkidle");
    const projectsBody = await page.locator("body").innerText();
    assert(projectsBody.includes(projectA.code), "Commander không thấy Project A được giao.");
    assert(!projectsBody.includes(projectB.code), "Commander nhìn thấy Project B không được giao.");
    console.log("PASS 2: /projects chỉ thấy Project A.");

    await assertRedirectedAway(page, "/users");
    console.log("PASS 3: /users bị chặn.");

    await assertRedirectedAway(page, "/projects/new");
    console.log("PASS 4: /projects/new bị chặn.");

    await assertRedirectedAway(page, `/projects/${projectB.id}`);
    console.log("PASS 5: direct Project B detail bị chặn.");

    await assertRedirectedAway(page, `/projects/${projectB.id}/field-progress`);
    console.log("PASS 6: direct Project B field-progress bị chặn.");

    await assertRedirectedAway(page, `/projects/${projectB.id}/material-requests`);
    console.log("PASS 7: direct Project B material-requests bị chặn.");
  } finally {
    if (browser) await browser.close();
    await cleanupRuntimeData();
    const remainingProjects = await prisma.project.count({
      where: { code: { startsWith: PROJECT_PREFIX } },
    });
    const remainingUsers = await prisma.user.count({
      where: { email: { startsWith: USER_PREFIX } },
    });
    await prisma.$disconnect();
    if (remainingProjects !== 0 || remainingUsers !== 0) {
      throw new Error(
        `Cleanup RBAC thất bại: projects=${remainingProjects}, users=${remainingUsers}.`
      );
    }
    console.log("PASS: Cleanup runtime RBAC data; không tạo screenshot/trace.");
  }
}

main().catch((error) => {
  console.error("FAIL:", error);
  process.exitCode = 1;
});
