/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const root = process.cwd();

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function includes(relPath, text) {
  return read(relPath).includes(text);
}

function filesUnder(dir) {
  const abs = path.join(root, dir);
  const result = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...filesUnder(rel));
    else result.push(rel);
  }
  return result;
}

const failures = [];

const sourceFiles = filesUnder("src").filter((file) => /\.(ts|tsx)$/.test(file));
const oldSearchTexts = [
  "Đang sử dụng hệ thống tìm kiếm",
  "Nhập từ khóa để tìm kiếm theo tên/mã dự án, báo cáo, thông báo.",
  "Nhập từ khóa để tìm kiếm theo tên/mã dự án",
];

for (const file of sourceFiles) {
  const content = read(file);
  for (const text of oldSearchTexts) {
    assert(!content.includes(text), `Old global search text still exists in ${file}: ${text}`);
  }
}

const globalSearchImportCount = sourceFiles
  .map((file) => read(file))
  .filter((content) => content.includes("GlobalSearchCommand")).length;
assert(
  globalSearchImportCount === 2,
  `GlobalSearchCommand should only be defined and imported by the layout header, found in ${globalSearchImportCount} files`,
);

assert(
  includes("src/components/layout/global-search-command.tsx", "usePathname") &&
    includes("src/components/layout/global-search-command.tsx", "useSearchParams"),
  "Global search must close/reset on pathname/searchParams changes",
);

assert(
  fs.existsSync(path.join(root, "src/lib/project-status.ts")),
  "A single shared project status mapping must exist at src/lib/project-status.ts",
);

assert(
  !includes("src/app/(dashboard)/materials/page.tsx", "projects[0]"),
  "Materials page must not fallback to the first project when no projectId is selected",
);

assert(
  !includes("src/app/(dashboard)/materials/actions.ts", 'status: "ACTIVE" as const'),
  "Materials project picker must not restrict selectable projects to ACTIVE only",
);

assert(
  includes("src/components/reports/reports-workspace.tsx", "useSearchParams()") &&
    !includes("src/components/reports/reports-workspace.tsx", "new URLSearchParams(window.location.search)"),
  "Reports workspace must use Next search param hooks instead of ad-hoc window URLSearchParams in render",
);

assert(
  includes("src/app/(dashboard)/approvals/page.tsx", "getGlobalProjectContext") &&
    includes("src/app/(dashboard)/approvals/components/approval-center-client.tsx", "initialProjectId"),
  "Approvals must receive and apply global project context",
);

assert(
  includes("src/components/contracts/contracts-workspace.tsx", "setProjectContextCookie") &&
    includes("src/components/contracts/contracts-workspace.tsx", "projectId"),
  "Contracts workspace must sync selected project to URL/cookie",
);

assert(
  includes("src/app/(dashboard)/accounting/components/accounting-workspace.tsx", "setProjectContextCookie") &&
    includes("src/app/(dashboard)/accounting/components/accounting-workspace.tsx", "projectId"),
  "Accounting workspace must sync selected project to URL/cookie",
);

const drawerFiles = [
  "src/components/contracts/contract-detail-drawer.tsx",
  "src/app/(dashboard)/accounting/components/payment-request-detail-drawer.tsx",
  "src/app/(dashboard)/approvals/components/approval-center-client.tsx",
  "src/components/reports/report-detail-drawer.tsx",
  "src/components/documents/document-viewer.tsx",
];

for (const file of drawerFiles) {
  const content = read(file);
  assert(content.includes("Escape"), `${file} must close detail UI on ESC`);
  assert(
    content.includes("document.body.style.overflow") || content.includes("useBodyScrollLock"),
    `${file} must clean up body scroll lock for detail overlay`,
  );
}

assert(
  includes("src/lib/dashboard/dashboard-queries.ts", "getProjectStatusMeta") ||
    includes("src/lib/dashboard/dashboard-queries.ts", "isPreparationProjectStatus"),
  "Dashboard query must handle planning/preparation project status explicitly",
);

if (failures.length > 0) {
  console.error("GLOBAL UI INTERACTION / PROJECT CONTEXT STATIC QA: FAIL");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("GLOBAL UI INTERACTION / PROJECT CONTEXT STATIC QA: PASS");
