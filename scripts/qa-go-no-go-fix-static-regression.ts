import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string) {
  return readFileSync(path, "utf8");
}

const gitignore = read(".gitignore");
const seed = read("prisma/seed.ts");
const header = read("src/components/layout/header.tsx");
const master = read("src/components/field-progress/master-table.tsx");
const dashboard = read("src/app/(dashboard)/dashboard/page.tsx");

assert(!gitignore.includes("\u0000"), ".gitignore must not contain NUL bytes");
assert(
  gitignore.includes(".local-audit-quarantine/"),
  ".gitignore must ignore the local audit quarantine directory",
);
assert(gitignore.includes("*.backup"), ".gitignore must ignore *.backup files");
assert(gitignore.includes("*.bak"), ".gitignore must ignore *.bak files");

assert(
  seed.includes('process.env.ALLOW_PRODUCTION_SEED !== "true"'),
  "production seed must require explicit ALLOW_PRODUCTION_SEED=true",
);
assert(
  seed.includes("SEED_ADMIN_EMAIL") && seed.includes("SEED_ADMIN_PASSWORD"),
  "production seed must require admin credentials from environment variables",
);
assert(!seed.includes("123456"), "seed must not contain the legacy admin password");
assert(!seed.includes("Test@123456"), "seed must not contain the legacy test password");

assert(
  header.includes("{userName || userRole}") && header.includes("{userRole}"),
  "header must render the session user name and localized role",
);
assert(
  !header.includes(">Quản trị viên</p>"),
  "header must not hardcode the administrator label",
);

assert(
  master.includes("blockCreateWhenDirty"),
  "field progress create handlers must block while unsaved changes exist",
);
assert(
  master.includes("Bạn có thay đổi chưa lưu"),
  "dirty-state guard must explain that the user needs to save first",
);

assert(
  dashboard.includes("attentionProjects"),
  "dashboard must query the complete accessible active-project set for attention KPI",
);
assert(
  !dashboard.includes("recentProjects.filter"),
  "dashboard KPI must not derive its count from the three recent projects",
);

console.log("PASS: GO/NO-GO static regression checks.");
