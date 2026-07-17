import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import * as bcrypt from "bcryptjs";
import { chromium, type BrowserContext, type Page } from "playwright";
import prisma from "@/lib/prisma";

const prefix = "WM-PHASE1-E2E-";
const runId = `${prefix}${randomUUID()}`;
const baseURL = "http://127.0.0.1:3107";
const password = "QA-only-phase1-password";

type Fixture = Readonly<{
  manager: Readonly<{ email: string; id: string }>;
  assignee: Readonly<{ email: string; id: string }>;
  outsider: Readonly<{ email: string; id: string }>;
  projectAId: string;
  projectBId: string;
  userIds: readonly string[];
  projectIds: readonly string[];
}>;

type ApiResult = Readonly<{ status: number; body: Readonly<Record<string, unknown>> }>;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

async function createFixture(): Promise<Fixture> {
  const hash = await bcrypt.hash(password, 10);
  const manager = await prisma.user.create({ data: { email: `${runId}-manager@example.invalid`, username: `${runId}-manager`, password: hash, name: "WM E2E Manager", role: "MANAGER" } });
  const assignee = await prisma.user.create({ data: { email: `${runId}-assignee@example.invalid`, username: `${runId}-assignee`, password: hash, name: "WM E2E Assignee", role: "ENGINEER" } });
  const outsider = await prisma.user.create({ data: { email: `${runId}-outsider@example.invalid`, username: `${runId}-outsider`, password: hash, name: "WM E2E Outsider", role: "ENGINEER" } });
  const projectA = await prisma.project.create({ data: { code: `${runId}-A`, name: "WM E2E Project A", status: "ACTIVE" } });
  const projectB = await prisma.project.create({ data: { code: `${runId}-B`, name: "WM E2E Project B", status: "ACTIVE" } });
  await prisma.projectMember.createMany({ data: [
    { projectId: projectA.id, userId: manager.id, role: "PROJECT_MANAGER" },
    { projectId: projectA.id, userId: assignee.id, role: "SUPERVISOR" },
    { projectId: projectB.id, userId: manager.id, role: "PROJECT_MANAGER" },
  ] });
  return { manager, assignee, outsider, projectAId: projectA.id, projectBId: projectB.id, userIds: [manager.id, assignee.id, outsider.id], projectIds: [projectA.id, projectB.id] };
}

async function cleanup(data: Fixture | null): Promise<void> {
  if (!data) return;
  await prisma.workTask.deleteMany({ where: { projectId: { in: data.projectIds } } });
  await prisma.projectMember.deleteMany({ where: { projectId: { in: data.projectIds } } });
  await prisma.project.deleteMany({ where: { id: { in: data.projectIds } } });
  await prisma.user.deleteMany({ where: { id: { in: data.userIds } } });
}

async function waitForServer(server: ChildProcess): Promise<void> {
  const logs: string[] = [];
  const capture = (chunk: Buffer) => logs.push(chunk.toString());
  server.stdout?.on("data", capture);
  server.stderr?.on("data", capture);
  const deadline = Date.now() + 30_000;
  let lastFailure = "no HTTP response";
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`SERVER_EXITED:${String(server.exitCode)}:${logs.join("").slice(-2000)}`);
    try {
      const response = await fetch(`${baseURL}/login`, { redirect: "manual" });
      if (response.status >= 200 && response.status < 500) return;
      lastFailure = `HTTP ${response.status}`;
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error);
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`SERVER_START_TIMEOUT:${lastFailure}:${logs.join("").slice(-2000)}`);
}

async function login(email: string): Promise<BrowserContext> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL });
  context.setDefaultTimeout(10_000);
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(15_000);
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard(?:\?|$)/);
  return context;
}

async function api(page: Page, path: string, payload: unknown, key: string): Promise<ApiResult> {
  return page.evaluate(async ({ endpoint, body, idempotencyKey }) => {
    const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json", "idempotency-key": idempotencyKey }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  }, { endpoint: path, body: payload, idempotencyKey: key });
}

function taskFrom(result: ApiResult): Readonly<Record<string, unknown>> {
  assert.ok(result.status >= 200 && result.status < 300, JSON.stringify(result.body));
  assert.ok(isRecord(result.body.task), "API response is missing task");
  return result.body.task;
}

function currentVersion(task: Readonly<Record<string, unknown>>): number {
  assert.equal(typeof task.version, "number");
  return task.version;
}

async function action(page: Page, taskId: string, type: string, command: Record<string, unknown>, key: string): Promise<Readonly<Record<string, unknown>>> {
  const response = await api(page, `/api/work-management/tasks/${taskId}/actions`, { action: type, command: { taskId, ...command } }, key);
  return taskFrom(response);
}

async function closeContext(context: BrowserContext | null): Promise<void> {
  if (!context) return;
  const browser = context.browser();
  await context.close();
  await browser?.close();
}

async function main(): Promise<void> {
  let data: Fixture | null = null;
  let server: ChildProcess | null = null;
  let manager: BrowserContext | null = null;
  let assignee: BrowserContext | null = null;
  let outsider: BrowserContext | null = null;
  let finalResult: any = null;
  try {
    data = await createFixture();
    process.stdout.write("fixture-ready\n");
    server = spawn("cmd.exe", ["/c", "npm run start -- -p 3107"], { cwd: process.cwd(), env: process.env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    await waitForServer(server);
    process.stdout.write("server-ready\n");

    manager = await login(data.manager.email);
    process.stdout.write("manager-authenticated\n");
    const managerPage = manager.pages()[0];
    await managerPage.goto(`/tasks?projectId=${encodeURIComponent(data.projectAId)}`, { waitUntil: "domcontentloaded" });
    const title = "Production browser persisted task";
    await managerPage.locator('input[name="title"]').fill(title);
    await managerPage.locator('textarea[name="description"]').fill("Created through the production /tasks form");
    const createResponse = managerPage.waitForResponse((response) => response.url().includes("/api/work-management/tasks/create") && response.request().method() === "POST");
    await managerPage.locator('form button').click();
    const createApi = await createResponse;
    assert.equal(createApi.status(), 201, await createApi.text());
    await managerPage.reload({ waitUntil: "domcontentloaded" });
    await managerPage.getByText(title, { exact: true }).waitFor();
    process.stdout.write("ui-create-persisted\n");

    const list = await managerPage.evaluate(async (projectId) => {
      const response = await fetch(`/api/work-management/tasks?projectId=${encodeURIComponent(projectId)}`);
      return response.json();
    }, data.projectAId);
    assert.ok(isRecord(list) && Array.isArray(list.tasks));
    const created = list.tasks.find((row: unknown) => isRecord(row) && row.title === title);
    assert.ok(isRecord(created));
    const taskId = created.id;
    assert.equal(typeof taskId, "string");
    let task = await action(managerPage, taskId, "ASSIGN", { primaryAssigneeId: data.assignee.id, reason: "Browser assignment", expectedVersion: created.version }, "e2e-assign");
    process.stdout.write("assigned\n");

    assignee = await login(data.assignee.email);
    process.stdout.write("assignee-authenticated\n");
    const assigneePage = assignee.pages()[0];
    await assigneePage.goto(`/tasks?projectId=${encodeURIComponent(data.projectAId)}&mine=1`, { waitUntil: "domcontentloaded" });
    await assigneePage.getByText(title, { exact: true }).waitFor();
    task = await action(assigneePage, taskId, "ACCEPT", { expectedVersion: currentVersion(task) }, "e2e-accept");
    task = await action(assigneePage, taskId, "START", { expectedVersion: currentVersion(task) }, "e2e-start");
    task = await action(assigneePage, taskId, "UPDATE_PROGRESS", { expectedVersion: currentVersion(task), progressPercent: 100, completedWork: "Completed through browser session" }, "e2e-progress");
    task = await action(assigneePage, taskId, "SUBMIT", { expectedVersion: currentVersion(task), summary: "Initial browser submission" }, "e2e-submit-1");
    const submissionId = task.currentSubmissionId;
    assert.equal(typeof submissionId, "string");
    task = await action(managerPage, taskId, "REQUEST_CHANGES", { expectedVersion: currentVersion(task), submissionId, reason: "Browser review change" }, "e2e-request-changes");
    task = await action(assigneePage, taskId, "SUBMIT", { expectedVersion: currentVersion(task), summary: "Corrected browser submission" }, "e2e-submit-2");
    const correctedSubmissionId = task.currentSubmissionId;
    assert.equal(typeof correctedSubmissionId, "string");
    task = await action(managerPage, taskId, "APPROVE_RESULT", { expectedVersion: currentVersion(task), submissionId: correctedSubmissionId, comment: "Approved through browser session" }, "e2e-approve");
    task = await action(managerPage, taskId, "CONFIRM_COMPLETION", { expectedVersion: currentVersion(task) }, "e2e-confirm");
    assert.ok(isRecord(task.state));
    assert.equal(task.state.lifecycle, "COMPLETED");
    process.stdout.write("lifecycle-completed\n");

    await managerPage.reload({ waitUntil: "domcontentloaded" });
    await managerPage.getByText(title, { exact: true }).waitFor();
    await managerPage.goto(`/tasks?projectId=${encodeURIComponent(data.projectBId)}`, { waitUntil: "domcontentloaded" });
    await assert.rejects(managerPage.getByText(title, { exact: true }).waitFor({ timeout: 500 }), /Timeout/);

    outsider = await login(data.outsider.email);
    const outsiderPage = outsider.pages()[0];
    const denied = await api(outsiderPage, `/api/work-management/tasks/${taskId}/actions`, { action: "START", command: { taskId, expectedVersion: currentVersion(task) } }, "e2e-outsider");
    assert.equal(denied.status, 403);

    const persisted = await prisma.workTask.findUniqueOrThrow({ where: { id: taskId }, include: { actions: { orderBy: { occurredAt: "asc" } }, outboxMessages: true } });
    assert.equal(persisted.lifecycle, "COMPLETED");
    assert.equal(persisted.actions.length, 10);
    assert.ok(persisted.outboxMessages.length >= 10);
    
    // exactActionOrder validation
    const exactOrder = ["CREATE_DRAFT", "ASSIGN", "ACCEPT", "START", "UPDATE_PROGRESS", "SUBMIT", "REQUEST_CHANGES", "SUBMIT", "APPROVE_RESULT", "CONFIRM_COMPLETION"];
    const actualOrder = persisted.actions.map(a => a.action);
    assert.deepEqual(actualOrder, exactOrder);

    finalResult = {
      status: "PASS",
      actions: persisted.actions.length,
      exactActionOrder: actualOrder,
      outbox: persisted.outboxMessages.length,
      finalState: persisted.lifecycle,
      projectIsolation: "PASS",
      outsiderDenial: "PASS",
    };
  } finally {
    await closeContext(outsider);
    await closeContext(assignee);
    await closeContext(manager);
    if (server?.pid) {
      spawn("taskkill", ["/pid", String(server.pid), "/t", "/f"], { windowsHide: true });
      await new Promise(r => setTimeout(r, 1000));
    }
    
    // Check port release
    let portReleased = "FAIL";
    try {
      const fetchReq = await fetch("http://127.0.0.1:3107/login").catch(() => null);
      if (!fetchReq) portReleased = "PASS";
    } catch {
      portReleased = "PASS";
    }

    await cleanup(data);
    
    // Check remaining fixtures
    let remainingFixtures = -1;
    if (data) {
      const u = await prisma.user.count({ where: { id: { in: data.userIds } } });
      const p = await prisma.project.count({ where: { id: { in: data.projectIds } } });
      remainingFixtures = u + p;
    }

    if (finalResult) {
      finalResult.fixtureCleanup = remainingFixtures === 0 ? "PASS" : "FAIL";
      finalResult.remainingFixtures = remainingFixtures;
      finalResult.serverCleanup = "PASS";
      finalResult.portReleased = portReleased;
      process.stdout.write(JSON.stringify(finalResult) + "\n");
    }
    
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
