import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";

config({ path: ".env" });

const baseUrl = process.env.SUPERVISION_QA_BASE_URL || "http://localhost:3000";
const qaPrefix = "QA-SUPERVISION-DIRECT-UX";
const artifactDir = path.resolve("docs/qa/artifacts/supervision-weekly-direct-entry-ux");

function mondayAt(offsetWeeks: number) {
  const date = new Date(2099, 0, 1 + offsetWeeks * 7);
  date.setDate(date.getDate() + ((8 - date.getDay()) % 7));
  date.setHours(0, 0, 0, 0);
  return date;
}
function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function addDays(date: Date, days: number) { const result = new Date(date); result.setDate(result.getDate() + days); return isoDate(result); }

async function main() {
  fs.mkdirSync(artifactDir, { recursive: true });
  const [{ default: prisma }, { createSessionToken }, { getSupervisionProjectWhere }, { chromium }] = await Promise.all([
    import("../../src/lib/prisma"), import("../../src/lib/session-token"), import("../../src/lib/rbac"), import("playwright"),
  ]);
  const actor = await prisma.user.findFirst({ where: { role: "SUPERVISION_HEAD", isActive: true, deletedAt: null }, select: { id: true, role: true } });
  const blockedActor = await prisma.user.findFirst({ where: { role: { notIn: ["SUPERVISION_HEAD", "ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"] }, isActive: true, deletedAt: null }, select: { id: true } });
  if (!actor || !blockedActor) throw new Error("BLOCKED: Thiếu tài khoản QA cho kiểm tra RBAC.");

  const fixtureProjectIds: string[] = [];
  const fixtureScopeIds: string[] = [];
  const fixtureFieldIds: string[] = [];
  let projectWhere = await getSupervisionProjectWhere(actor);
  let projects = await prisma.project.findMany({ where: { deletedAt: null, ...projectWhere }, select: { id: true, code: true, name: true, fieldProgressItems: { where: { deletedAt: null, itemType: "WORK" }, select: { id: true, code: true, templateId: true }, take: 1 } }, orderBy: { name: "asc" } });
  const seedProject = projects.find((project) => project.fieldProgressItems.length > 0);
  if (!seedProject) throw new Error("BLOCKED: Không có công tác mẫu trong QA.");
  const templateId = seedProject.fieldProgressItems[0].templateId;
  if (projects.length < 3) {
    const scope = await prisma.supervisionScope.findUnique({ where: { userId: actor.id } });
    if (!scope) throw new Error("BLOCKED: Trưởng ban Giám sát chưa có scope QA.");
    const runId = Date.now();
    for (let index = projects.length; index < 3; index += 1) {
      const project = await prisma.project.create({ data: { code: `QA-DIRECT-${runId}-${index + 1}`, name: `Công trình QA nhập trực tiếp ${index + 1}`, description: `${qaPrefix} temporary fixture` } });
      fixtureProjectIds.push(project.id);
      const work = await prisma.fieldProgressItem.create({ data: { projectId: project.id, templateId, itemType: "WORK", code: `QA-WORK-${index + 1}`, workContent: `Hạng mục QA có sẵn ${index + 1}`, createdById: actor.id } });
      fixtureFieldIds.push(work.id);
      if (scope.scopeType === "SELECTED_PROJECTS") {
        const link = await prisma.supervisionScopeProject.create({ data: { scopeId: scope.id, projectId: project.id } });
        fixtureScopeIds.push(link.id);
      }
    }
    projectWhere = await getSupervisionProjectWhere(actor);
    projects = await prisma.project.findMany({ where: { deletedAt: null, ...projectWhere }, select: { id: true, code: true, name: true, fieldProgressItems: { where: { deletedAt: null, itemType: "WORK" }, select: { id: true, code: true, templateId: true }, take: 1 } }, orderBy: { name: "asc" } });
  }
  const orderedProjects = [projects.find((project) => project.id === seedProject.id)!, ...projects.filter((project) => project.id !== seedProject.id && project.fieldProgressItems.length > 0)].slice(0, 3);
  if (orderedProjects.length < 3) throw new Error("BLOCKED: Không có đủ ba project có công tác trong scope QA.");

  let weekStart: Date | undefined;
  let legacyWeekStart: Date | undefined;
  for (let offset = 0; offset < 104; offset += 1) {
    const candidate = mondayAt(offset);
    if (!await prisma.supervisionWeeklyDossier.findFirst({ where: { createdById: actor.id, weekStart: candidate }, select: { id: true } })) {
      if (!weekStart) weekStart = candidate;
      else { legacyWeekStart = candidate; break; }
    }
  }
  if (!weekStart || !legacyWeekStart) throw new Error("BLOCKED: Không tìm được hai kỳ QA trống.");
  const dates = Array.from({ length: 7 }, (_, index) => addDays(weekStart!, index));
  const reportNumber = `${qaPrefix}-${Date.now()}`;
  let dossierId: string | undefined;
  let legacyDossierId: string | undefined;
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const browser = await chromium.launch({ headless: true });

  const waitSaved = async (page: import("playwright").Page) => page.waitForFunction(() => document.querySelector('[data-testid="autosave-status"]')?.textContent?.trim() === "Đã lưu", undefined, { timeout: 30_000 });
  const chooseProject = async (page: import("playwright").Page, root: string, project: typeof orderedProjects[number], screenshot?: string) => {
    const search = page.getByTestId(`${root}-project-search`);
    await search.fill(project.code);
    const option = page.getByTestId(`${root}-project-list`).getByRole("option").filter({ hasText: project.code }).first();
    await option.waitFor();
    if (screenshot) await page.getByTestId(root).screenshot({ path: path.join(artifactDir, screenshot) });
    await option.click();
  };
  const chooseWork = async (page: import("playwright").Page, root: string, code: string, screenshot?: string) => {
    const first = page.getByTestId(`${root}-work-list`).getByRole("option").first();
    await page.getByTestId(`${root}-work-search`).click();
    await first.waitFor({ timeout: 15_000 });
    await page.getByTestId(`${root}-work-search`).fill(code);
    const option = page.getByTestId(`${root}-work-list`).getByRole("option").filter({ hasText: code }).first();
    await option.waitFor();
    if (screenshot) await page.getByTestId(root).screenshot({ path: path.join(artifactDir, screenshot) });
    await option.click();
  };
  const manualSource = async (page: import("playwright").Page, root: string, project: string, work: string) => {
    await page.getByTestId(`${root}-project-manual`).fill(project);
    await page.getByTestId(`${root}-work-manual`).fill(work);
  };
  const projectWithManualWork = async (page: import("playwright").Page, root: string, project: typeof orderedProjects[number], work: string) => {
    await chooseProject(page, root, project);
    await page.getByTestId(`${root}-work-manual`).fill(work);
  };
  const fillSectionSource = async (page: import("playwright").Page, root: string, index: number) => manualSource(page, root, `Công trình Mục ${index + 1}`, `Hạng mục Mục ${index + 1}`);

  try {
    legacyDossierId = (await prisma.supervisionWeeklyDossier.create({ data: {
      weekStart: legacyWeekStart, weekEnd: new Date(legacyWeekStart.getFullYear(), legacyWeekStart.getMonth(), legacyWeekStart.getDate() + 6), nextWeekStart: new Date(legacyWeekStart.getFullYear(), legacyWeekStart.getMonth(), legacyWeekStart.getDate() + 7), nextWeekEnd: new Date(legacyWeekStart.getFullYear(), legacyWeekStart.getMonth(), legacyWeekStart.getDate() + 13), createdById: actor.id, reportNumber: `${qaPrefix}-LEGACY`, recipientName: "Ban Giám đốc QA", recipientTitle: "Giám đốc QA",
      entries: { create: { documentType: "RESULT", entryDate: legacyWeekStart, shift: "MORNING", sortOrder: 0, inputMode: "MANUAL_TEXT", manualText: "Công trình lịch sử - Hạng mục lịch sử", displayText: "Công trình lịch sử - Hạng mục lịch sử", inspectionContent: "Nội dung lịch sử", result: "Kết quả lịch sử" } },
      shiftSelections: { create: { documentType: "RESULT", entryDate: legacyWeekStart, shift: "MORNING" } },
    }, select: { id: true } })).id;

    const context = await browser.newContext({ timezoneId: "Asia/Ho_Chi_Minh", viewport: { width: 1440, height: 1000 } });
    await context.addCookies([{ name: "auth_session", value: createSessionToken(actor.id), url: baseUrl, httpOnly: true, sameSite: "Lax" }]);
    const page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });

    await page.goto(`${baseUrl}/supervision/weekly/${legacyDossierId}/edit`, { waitUntil: "networkidle" });
    const legacyDate = isoDate(legacyWeekStart);
    if (await page.getByTestId(`entry-source-RESULT-${legacyDate}-MORNING-0-project-manual`).inputValue() !== "Công trình lịch sử - Hạng mục lịch sử") throw new Error("Hồ sơ legacy không hiển thị dữ liệu manualText.");
    await page.goto(`${baseUrl}/supervision/weekly/${legacyDossierId}/preview`, { waitUntil: "networkidle" });
    if (!await page.getByText("Công trình lịch sử - Hạng mục lịch sử", { exact: false }).count()) throw new Error("Preview hồ sơ legacy mất displayText.");

    const listResponse = await page.goto(`${baseUrl}/supervision/weekly`, { waitUntil: "networkidle" });
    if (listResponse?.status() !== 200) throw new Error(`Danh sách trả HTTP ${listResponse?.status()}.`);
    const blockedContext = await browser.newContext();
    await blockedContext.addCookies([{ name: "auth_session", value: createSessionToken(blockedActor.id), url: baseUrl, httpOnly: true, sameSite: "Lax" }]);
    const blockedPage = await blockedContext.newPage();
    await blockedPage.goto(`${baseUrl}/supervision/weekly`, { waitUntil: "networkidle" });
    if (new URL(blockedPage.url()).pathname !== "/dashboard") throw new Error("RBAC không chặn role ngoài scope.");
    await blockedContext.close();

    await page.locator('input[type="date"]').fill(dates[0]);
    await page.getByRole("button", { name: "Tạo hồ sơ tuần" }).click();
    await page.waitForURL(/\/supervision\/weekly\/[^/]+\/edit$/);
    dossierId = new URL(page.url()).pathname.split("/")[3];
    await page.getByLabel("Số báo cáo").fill(reportNumber);
    await page.getByLabel("Địa điểm").fill("Hà Nội");
    await page.getByLabel("Kính gửi").fill("Ban Giám đốc QA");
    await page.getByLabel("Chức vụ người nhận").fill("Giám đốc QA");
    await page.getByTestId("schedule-result").screenshot({ path: path.join(artifactDir, "01-section-I-empty.png") });

    await page.getByTestId(`shift-RESULT-${dates[0]}-AFTERNOON`).check();
    const root0 = `entry-source-RESULT-${dates[0]}-AFTERNOON-0`;
    if (await page.getByTestId(`${root0}-project-search`).evaluate((element) => element !== document.activeElement)) throw new Error("Tích buổi không focus vào Công trình.");
    if (await page.locator('[role="dialog"]').count()) throw new Error("Tích buổi vẫn mở modal.");
    await page.getByTestId(`day-RESULT-${dates[0]}`).screenshot({ path: path.join(artifactDir, "02-shift-auto-row.png") });
    await chooseProject(page, root0, orderedProjects[0], "04-project-dropdown.png");
    await chooseWork(page, root0, orderedProjects[0].fieldProgressItems[0].code || "", "05-work-dropdown.png");

    const longContent = Array.from({ length: 24 }, (_, index) => `Dòng ${index + 1}: Kiểm tra chi tiết kết cấu, kích thước, cao độ và chất lượng thi công tại khu vực trục A-D.`).join("\n");
    const longResult = Array.from({ length: 15 }, (_, index) => `Kết quả ${index + 1}: Các nội dung kiểm tra đáp ứng yêu cầu kỹ thuật và hồ sơ hiện hành.`).join("\n");
    await page.getByTestId(`entry-content-RESULT-${dates[0]}-AFTERNOON-0`).fill(longContent);
    await page.getByTestId(`entry-result-RESULT-${dates[0]}-AFTERNOON-0`).fill(longResult);
    const textareaAudit = await page.getByTestId(`entry-content-RESULT-${dates[0]}-AFTERNOON-0`).evaluate((element) => ({ value: (element as HTMLTextAreaElement).value.length, clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, overflowY: getComputedStyle(element).overflowY }));
    if (textareaAudit.value < 1000 || textareaAudit.scrollHeight > textareaAudit.clientHeight + 2 || textareaAudit.overflowY === "scroll") throw new Error(`Textarea dài chưa tự giãn: ${JSON.stringify(textareaAudit)}`);
    await page.getByTestId(`entry-RESULT-${dates[0]}-AFTERNOON-0`).screenshot({ path: path.join(artifactDir, "06-long-content-autogrow.png") });

    await page.getByTestId(`add-inspection-RESULT-${dates[0]}-AFTERNOON`).click();
    const root1 = `entry-source-RESULT-${dates[0]}-AFTERNOON-1`;
    await projectWithManualWork(page, root1, orderedProjects[0], "Kiểm tra thép dầm khu vực trục A-D");
    await page.getByTestId(`entry-content-RESULT-${dates[0]}-AFTERNOON-1`).fill("Kiểm tra cốt thép dầm");
    await page.getByTestId(`entry-result-RESULT-${dates[0]}-AFTERNOON-1`).fill("Đạt yêu cầu");
    await page.getByTestId(root1).screenshot({ path: path.join(artifactDir, "03-system-project-manual-work.png") });

    await page.getByTestId(`add-inspection-RESULT-${dates[0]}-AFTERNOON`).click();
    const root2 = `entry-source-RESULT-${dates[0]}-AFTERNOON-2`;
    await chooseProject(page, root2, orderedProjects[1]);
    await chooseWork(page, root2, orderedProjects[1].fieldProgressItems[0].code || "");
    await page.getByTestId(`entry-content-RESULT-${dates[0]}-AFTERNOON-2`).fill("Kiểm tra hạng mục công trình B");
    await page.getByTestId(`entry-result-RESULT-${dates[0]}-AFTERNOON-2`).fill("Đạt yêu cầu");

    await page.getByTestId(`add-inspection-RESULT-${dates[0]}-AFTERNOON`).click();
    const root3 = `entry-source-RESULT-${dates[0]}-AFTERNOON-3`;
    await manualSource(page, root3, "Công trình ngoài danh mục", "Hạng mục nhập trực tiếp");
    await page.getByTestId(`entry-content-RESULT-${dates[0]}-AFTERNOON-3`).fill("Kiểm tra khu vực ngoài danh mục");
    await page.getByTestId(`entry-result-RESULT-${dates[0]}-AFTERNOON-3`).fill("Đạt yêu cầu");
    await page.getByTestId(`slot-RESULT-${dates[0]}-AFTERNOON`).screenshot({ path: path.join(artifactDir, "07-four-rows-one-shift.png") });

    await page.getByTestId("add-transition-empty-button").click();
    await fillSectionSource(page, "transition-source-0", 0);
    await page.getByTestId("transition-reported-0-raw").fill("120 m3"); await page.getByTestId("transition-reported-0-raw").blur();
    await page.getByTestId("transition-verified-0-raw").fill("115 m³"); await page.getByTestId("transition-verified-0-raw").blur();
    await page.getByTestId("transition-progress-0").fill("Chuyển bước ngày kế tiếp");
    await page.getByTestId("add-transition-button").click();
    await fillSectionSource(page, "transition-source-1", 1);
    await page.getByTestId("transition-reported-1-raw").fill("50 m2"); await page.getByTestId("transition-reported-1-raw").blur();
    await page.getByTestId("transition-verified-1-raw").fill("40.000 kg"); await page.getByTestId("transition-verified-1-raw").blur();
    await page.getByTestId("transition-progress-1").fill("Chờ đối chiếu");
    await page.getByTestId("transition-unit-warning-1").waitFor();
    await page.getByTestId("section-II").screenshot({ path: path.join(artifactDir, "08-section-II.png") });

    const quantities = [["120m3", "115 m³"], ["100 m2", "95 m²"], ["2 tan", "1,5 tấn"]] as const;
    for (let index = 0; index < quantities.length; index += 1) {
      await page.getByTestId(index === 0 ? "add-quantity-empty-button" : "add-quantity-button").click();
      await fillSectionSource(page, `quantity-source-${index}`, index + 2);
      await page.getByTestId(`quantity-reported-${index}-raw`).fill(quantities[index][0]); await page.getByTestId(`quantity-reported-${index}-raw`).blur();
      await page.getByTestId(`quantity-verified-${index}-raw`).fill(quantities[index][1]); await page.getByTestId(`quantity-verified-${index}-raw`).blur();
    }
    await page.getByTestId("section-III").screenshot({ path: path.join(artifactDir, "09-section-III.png") });

    const progressRows = [["Đúng tiến độ", "100% kế hoạch", "100% thực tế", "ON_TIME", "", "", ""], ["Chậm ba ngày", "Hoàn thành 20/01", "Hoàn thành 23/01", "DELAYED", "3", "DAY", "Mưa kéo dài"], ["Chậm mười lăm phần trăm", "Đạt 80%", "Đạt 65%", "DELAYED", "15", "PERCENT", "Thiếu vật tư"]] as const;
    for (let index = 0; index < progressRows.length; index += 1) {
      await page.getByTestId(index === 0 ? "add-progress-empty-button" : "add-progress-button").click();
      await fillSectionSource(page, `progress-source-${index}`, index + 5);
      await page.getByTestId(`progress-planned-${index}`).fill(progressRows[index][1]);
      await page.getByTestId(`progress-actual-${index}`).fill(progressRows[index][2]);
      if (progressRows[index][3] === "DELAYED") {
        await page.getByTestId(`progress-status-${index}`).selectOption("DELAYED");
        await page.getByTestId(`progress-delay-value-${index}`).fill(progressRows[index][4]);
        await page.getByTestId(`progress-delay-type-${index}`).selectOption(progressRows[index][5]);
        await page.getByTestId(`progress-reason-${index}`).fill(progressRows[index][6]);
      }
    }
    await page.getByTestId("section-V").screenshot({ path: path.join(artifactDir, "10-section-V.png") });
    await waitSaved(page);

    await page.reload({ waitUntil: "networkidle" });
    await waitSaved(page);
    if (await page.getByTestId(`entry-RESULT-${dates[0]}-AFTERNOON-3`).count() !== 1) throw new Error("Bốn dòng không tồn tại sau reload.");
    if (await page.getByTestId(`entry-content-RESULT-${dates[0]}-AFTERNOON-0`).inputValue() !== longContent) throw new Error("Nội dung dài bị thay đổi sau reload.");
    if (await page.getByTestId(`${root1}-work-manual`).inputValue() !== "Kiểm tra thép dầm khu vực trục A-D") throw new Error("Hạng mục nhập tay bị mất sau reload.");
    const persisted = await prisma.supervisionWeeklyDossier.findUnique({ where: { id: dossierId }, include: { entries: { orderBy: { sortOrder: "asc" } }, shiftSelections: true, transitions: true, quantities: { orderBy: { sortOrder: "asc" } }, progressRows: true } });
    if (!persisted || persisted.entries.length !== 4 || persisted.shiftSelections.length !== 1 || persisted.transitions.length !== 2 || persisted.quantities.length !== 3 || persisted.progressRows.length !== 3) throw new Error("Database mismatch sau autosave/reload.");
    if (persisted.entries[1].projectId !== orderedProjects[0].id || persisted.entries[1].manualWorkItemName !== "Kiểm tra thép dầm khu vực trục A-D") throw new Error("Công trình có sẵn + hạng mục nhập tay lưu sai.");
    if (persisted.entries[3].manualProjectName !== "Công trình ngoài danh mục" || persisted.entries[3].manualWorkItemName !== "Hạng mục nhập trực tiếp") throw new Error("Cặp công trình/hạng mục nhập tay lưu sai.");
    if (Number(persisted.transitions[0].varianceQuantity) !== -5 || persisted.transitions[1].varianceQuantity !== null) throw new Error("Chênh lệch Mục II sai.");
    if (persisted.quantities.map((row) => Number(row.varianceQuantity)).join(",") !== "-5,-5,-0.5") throw new Error("Chuẩn hóa đơn vị Mục III sai.");

    await page.goto(`${baseUrl}/supervision/weekly/${dossierId}/preview`, { waitUntil: "networkidle" });
    const previewAudit = await page.evaluate(() => ({ headers: Array.from(document.querySelectorAll(".report-section")).slice(0, 4).map((section) => section.querySelector("table")?.querySelectorAll("th").length || 0), controls: document.querySelectorAll('.print-sheet input, .print-sheet textarea, .print-sheet select, .print-sheet button:not(.print-actions)').length, text: document.body.textContent || "" }));
    if (previewAudit.headers.join(",") !== "4,6,5,5" || previewAudit.controls !== 0 || !previewAudit.text.includes("Công trình ngoài danh mục - Hạng mục nhập trực tiếp") || !previewAudit.text.includes(longContent.slice(0, 200))) throw new Error("Preview không đồng nhất dữ liệu hoặc còn control.");
    await page.screenshot({ path: path.join(artifactDir, "11-preview.png"), fullPage: true });
    await page.pdf({ path: path.join(artifactDir, "result-report.pdf"), format: "A4", landscape: true, printBackground: true, preferCSSPageSize: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/supervision/weekly/${dossierId}/edit`, { waitUntil: "networkidle" });
    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (mobileOverflow > 2) throw new Error(`Mobile tràn ngang toàn trang ${mobileOverflow}px.`);
    await page.screenshot({ path: path.join(artifactDir, "12-mobile-editor.png"), fullPage: true });

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole("button", { name: "Gửi báo cáo" }).click();
    await page.getByText("Đã gửi", { exact: true }).waitFor();
    const forbidden = ["Chọn từ hệ thống", "Nhập trực tiếp", "Áp dụng", "Thu gọn", "Chưa chọn nguồn kiểm tra"];
    for (const text of forbidden) if (await page.getByText(text, { exact: true }).count()) throw new Error(`Editor còn nội dung cũ: ${text}`);
    const regressionRoutes = await page.evaluate(async (paths) => Promise.all(paths.map(async (route) => ({ route, status: (await fetch(route)).status }))), ["/dashboard", "/projects", "/reports", "/materials", "/documents"]);
    if (regressionRoutes.some((result) => result.status >= 500) || pageErrors.length || consoleErrors.length) throw new Error(`Runtime regression: ${JSON.stringify({ regressionRoutes, pageErrors, consoleErrors })}`);

    await prisma.supervisionWeeklyDossier.update({ where: { id: dossierId }, data: { deletedAt: new Date() } });
    await prisma.supervisionWeeklyDossier.update({ where: { id: legacyDossierId }, data: { deletedAt: new Date() } });
    console.log(JSON.stringify({ routeStatus: 200, roleBlocked: true, reportNumber, autoRowOnShift: true, modalRemoved: true, directEntry: true, entries: 4, selectedShifts: 1, longContent: longContent.length, longResult: longResult.length, autosaveReload: true, legacyCompatibility: true, workflowSubmitted: true, previewColumns: [4, 6, 5, 5], pdf: path.join(artifactDir, "result-report.pdf"), softDeleteCleanup: true, regressionRoutes, screenshots: fs.readdirSync(artifactDir).filter((name) => name.endsWith(".png")) }, null, 2));
  } finally {
    await browser.close();
    if (dossierId) await prisma.supervisionWeeklyDossier.updateMany({ where: { id: dossierId, deletedAt: null }, data: { deletedAt: new Date() } });
    if (legacyDossierId) await prisma.supervisionWeeklyDossier.updateMany({ where: { id: legacyDossierId, deletedAt: null }, data: { deletedAt: new Date() } });
    if (fixtureScopeIds.length) await prisma.supervisionScopeProject.deleteMany({ where: { id: { in: fixtureScopeIds } } });
    if (fixtureFieldIds.length) await prisma.fieldProgressItem.updateMany({ where: { id: { in: fixtureFieldIds } }, data: { deletedAt: new Date() } });
    if (fixtureProjectIds.length) await prisma.project.updateMany({ where: { id: { in: fixtureProjectIds } }, data: { deletedAt: new Date() } });
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Runtime QA failed."); process.exitCode = 1; });
