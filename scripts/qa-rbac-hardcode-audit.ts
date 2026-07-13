import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ignored = new Set(["node_modules", ".next", ".git", "storage", "test-results"]);
const patterns = [/role\s*===/g, /role\s*!==/g, /\bADMIN\b/g, /\bDIRECTOR\b/g, /\bisAdmin\b/g, /\bisDirector\b/g, /\bcanManageUsers\b/g, /HIDDEN_FOR_COMMANDER/g];

type Category =
  | "production server action"
  | "production UI"
  | "helper permission"
  | "seed/test/script"
  | "label/display only"
  | "docs/report";

type Severity = "must-fix" | "suspicious" | "acceptable";

function walk(dir: string, out: string[] = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|jsx|md)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function categoryFor(rel: string, line: string): Category {
  if (/^docs\//.test(rel) || /\.md$/.test(rel)) return "docs/report";
  if (/^(scripts|prisma|scratch)\//.test(rel)) return "seed/test/script";
  if (/src\/lib\/(rbac|rbac-rules|permissions|.*permissions|.*policy|navigation-permissions|dashboard\/dashboard-permissions|suppliers\/suppliers-permissions)/.test(rel)) return "helper permission";
  if (/src\/app\/.*(actions|route)\.(ts|tsx)$/.test(rel)) return "production server action";
  if (/src\/components\//.test(rel) || /src\/app\/.*page\.tsx$/.test(rel)) {
    if (/ROLE_DISPLAY|roleDisplay|case\s+"(ADMIN|DIRECTOR)"|<option value=|creatorRole|userRole ===/.test(line)) {
      return "label/display only";
    }
    return "production UI";
  }
  return "seed/test/script";
}

function severityFor(category: Category, rel: string, line: string): Severity {
  if (rel === "scripts/qa-rbac-hardcode-audit.ts") return "acceptable";
  if (/^\s*\/\//.test(line)) return "acceptable";
  if (category === "docs/report" || category === "seed/test/script" || category === "helper permission" || category === "label/display only") {
    return "acceptable";
  }
  if (category === "production server action") {
    if (/src\/app\/\(dashboard\)\/(users|settings|approvals)\/actions\.ts$/.test(rel)) return "acceptable";
    return "suspicious";
  }
  if (category === "production UI") return "suspicious";
  return "suspicious";
}

function main() {
  const findings: { severity: Severity; category: Category; file: string; lineNo: number; text: string }[] = [];
  for (const file of walk(root)) {
    const rel = path.relative(root, file).replace(/\\/g, "/");
    const text = fs.readFileSync(file, "utf8");
    text.split(/\r?\n/).forEach((line, index) => {
      if (patterns.some((pattern) => pattern.test(line))) {
        patterns.forEach((pattern) => (pattern.lastIndex = 0));
        const category = categoryFor(rel, line);
        findings.push({
          severity: severityFor(category, rel, line),
          category,
          file: rel,
          lineNo: index + 1,
          text: line.trim().slice(0, 180),
        });
      }
    });
  }

  console.log("=== RBAC HARDCODE AUDIT ===");
  console.log("Category | Total | Must-fix | Suspicious | Acceptable");
  const categories: Category[] = ["production server action", "production UI", "helper permission", "seed/test/script", "label/display only", "docs/report"];
  for (const category of categories) {
    const rows = findings.filter((item) => item.category === category);
    console.log([
      category,
      rows.length,
      rows.filter((item) => item.severity === "must-fix").length,
      rows.filter((item) => item.severity === "suspicious").length,
      rows.filter((item) => item.severity === "acceptable").length,
    ].join(" | "));
  }

  for (const category of categories) {
    const rows = findings.filter((item) => item.category === category);
    console.log(`\n[${category}] ${rows.length}`);
    rows.slice(0, 120).forEach((item) => {
      console.log(`${item.severity} | ${item.file}:${item.lineNo}: ${item.text}`);
    });
    if (rows.length > 120) console.log(`... truncated ${rows.length - 120} more`);
  }

  const productionServerSuspicious = findings.filter((item) => item.category === "production server action" && item.severity === "suspicious").length;
  const productionUiSuspicious = findings.filter((item) => item.category === "production UI" && item.severity === "suspicious").length;
  console.log(`\nProduction server action suspicious: ${productionServerSuspicious}`);
  console.log(`Production UI suspicious: ${productionUiSuspicious}`);
}

main();
