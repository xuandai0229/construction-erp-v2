import { expect, request as playwrightRequest, test } from "@playwright/test";
import prisma from "../../../src/lib/prisma";
import { createSessionToken } from "../../../src/lib/session-token";
import { ALLOWED_PILOT_USER_IDS } from "../../../src/lib/ai/pilot/ai-pilot-cohort";

test.describe("AI-01 Drawer — authenticated semantic E2E", () => {
  test("hard-fail chat path renders a grounded project response and clickable source", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).not.toHaveURL(/\/login/);

    const trigger = page.getByRole("button", { name: "Mở Trợ lý AI" });
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(page.getByRole("dialog", { name: "Trợ lý AI read-only" })).toBeVisible();
    await expect(page.getByText("Mô phỏng local", { exact: true })).toBeVisible();

    const input = page.getByRole("textbox", { name: "Nhập câu hỏi cho Trợ lý AI" });
    const send = page.getByRole("button", { name: "Gửi câu hỏi" });
    await expect(input).toBeVisible();
    await input.fill("Tôi đang phụ trách những công trình nào?");
    await expect(send).toBeEnabled();

    const responsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/api/v1/ai/chat") && response.request().method() === "POST",
    );
    await send.click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.providerStatus).toMatchObject({ mode: "DEVELOPMENT_MOCK", mock: true, remote: false });
    expect(body.sources.length).toBeGreaterThan(0);
    expect(body.traceId).toMatch(/^run_/);
    expect(body.conversationId).toMatch(/^conv_/);

    const firstSource = body.sources[0];
    const sourceLink = page.getByRole("link", { name: firstSource.label }).first();
    await expect(sourceLink).toBeVisible();
    await expect(sourceLink).toHaveAttribute("href", firstSource.route);
  });

  test("active project wins, follow-up retains entity, nonexistent project is never substituted", async ({ page }) => {
    const projectsResponse = await page.request.get("/api/v1/projects?pageSize=100");
    expect(projectsResponse.ok()).toBe(true);
    const projectsBody = await projectsResponse.json();
    const activeProject = projectsBody.data.find((project: any) => project.code === "CT-2026-0009");
    expect(activeProject, "CT-2026-0009 must exist in the real QA database").toBeTruthy();

    await page.goto(`/projects/${activeProject.id}`);
    await expect(page).not.toHaveURL(/\/login/);
    await page.getByRole("button", { name: "Mở Trợ lý AI" }).click();
    const input = page.getByRole("textbox", { name: "Nhập câu hỏi cho Trợ lý AI" });
    await expect(input).toBeVisible();

    await input.fill("Tóm tắt công trình đang mở.");
    let responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/v1/ai/chat") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Gửi câu hỏi" }).click();
    let response = await responsePromise;
    let body = await response.json();
    expect(response.status()).toBe(200);
    expect(body.success).toBe(true);
    expect(body.contextSnapshot.activeProjectId).toBe(activeProject.id);
    expect(body.contextSnapshot.activeProjectCode).toBe("CT-2026-0009");
    expect(body.content).toContain("CT-2026-0009");
    expect(body.content).not.toContain("CT-2026-0002");
    const conversationId = body.conversationId;

    await input.fill("Báo cáo gần nhất của công trình đó nói gì?");
    responsePromise = page.waitForResponse((item) => item.url().endsWith("/api/v1/ai/chat") && item.request().method() === "POST");
    await page.getByRole("button", { name: "Gửi câu hỏi" }).click();
    response = await responsePromise;
    body = await response.json();
    expect(response.status()).toBe(200);
    expect(body.success).toBe(true);
    expect(body.conversationId).toBe(conversationId);
    expect(body.contextSnapshot.activeProjectId).toBe(activeProject.id);
    expect(body.qualityFlags).toContain("NO_FIELD_REPORTS");

    await input.fill("Tóm tắt CT-2099-9999.");
    responsePromise = page.waitForResponse((item) => item.url().endsWith("/api/v1/ai/chat") && item.request().method() === "POST");
    await page.getByRole("button", { name: "Gửi câu hỏi" }).click();
    response = await responsePromise;
    body = await response.json();
    expect(response.status()).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("PROJECT_NOT_FOUND");
    expect(body.content).not.toContain("CT-2026-0002");
  });

  test("unauthenticated API request is denied and payloads contain no secret-shaped fields", async ({ baseURL }) => {
    const isolated = await playwrightRequest.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
    });
    const response = await isolated.post("/api/v1/ai/chat", {
      data: { messages: [{ role: "user", content: "Tình hình hôm nay thế nào?" }] },
    });
    expect(response.status()).toBe(401);
    const bodyText = await response.text();
    expect(bodyText).toContain("UNAUTHENTICATED");
    expect(bodyText).not.toMatch(/OPENAI_API_KEY|DATABASE_URL|passwordHash|sk-[A-Za-z0-9]/);
    await isolated.dispose();
  });

  test("authenticated non-pilot user is denied by the server cohort gate", async ({ baseURL }) => {
    const actor = await prisma.user.findFirstOrThrow({
      where: {
        id: { notIn: [...ALLOWED_PILOT_USER_IDS] },
        isActive: true,
        deletedAt: null,
        mustChangePassword: false,
      },
      select: { id: true, updatedAt: true, mustChangePassword: true },
    });
    const sessionToken = createSessionToken(
      actor.id,
      undefined,
      actor.updatedAt.toISOString(),
      actor.mustChangePassword,
    );

    const nonPilot = await playwrightRequest.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
      extraHTTPHeaders: { Authorization: `Bearer ${sessionToken}` },
    });
    const response = await nonPilot.post("/api/v1/ai/chat", {
      data: { messages: [{ role: "user", content: "Tình hình hôm nay thế nào?" }] },
    });
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body).toMatchObject({
      success: false,
      error: { code: "PILOT_COHORT_RESTRICTED" },
    });
    expect(JSON.stringify(body)).not.toMatch(/OPENAI_API_KEY|DATABASE_URL|passwordHash|sk-[A-Za-z0-9]/);
    await nonPilot.dispose();
  });
});
