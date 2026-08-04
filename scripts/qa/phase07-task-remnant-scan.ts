import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const EXCLUDED_DIRS = new Set([".git", "node_modules", ".next", "dist", "coverage", "docs/qa/backups", "chrome"]);

const PATTERNS = ["/tasks", "WorkTask", "work-management", "TASK_", "ListTodo", "Nhiệm vụ", "Công việc"];

interface MatchItem {
  file: string;
  line: number;
  pattern: string;
  category: "Runtime Application" | "Active QA Script" | "Decommission Regression Test" | "Historical Documentation" | "Migration History";
  content: string;
}

const matches: MatchItem[] = [];

function scanDir(dir: string) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry)) continue;
    const fullPath = join(dir, entry);
    const relPath = relative(ROOT, fullPath).replace(/\\/g, "/");

    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (stat.isFile()) {
      if (relPath.endsWith(".png") || relPath.endsWith(".sql") || relPath.endsWith(".dump") || relPath.endsWith(".json")) {
        // Skip binary/large dump files for line scan
        continue;
      }

      try {
        const text = readFileSync(fullPath, "utf-8");
        const lines = text.split("\n");
        lines.forEach((line, idx) => {
          for (const pattern of PATTERNS) {
            if (line.includes(pattern)) {
              let category: MatchItem["category"] = "Historical Documentation";
              if (relPath.startsWith("prisma/migrations")) {
                category = "Migration History";
              } else if (relPath.startsWith("docs/")) {
                category = "Historical Documentation";
              } else if (relPath.includes(".spec.") || relPath.includes("decommission") || relPath.includes("task") || relPath.startsWith("scripts/")) {
                category = "Decommission Regression Test";
              } else if (relPath.startsWith("src/")) {
                category = "Runtime Application";
              }

              matches.push({
                file: relPath,
                line: idx + 1,
                pattern,
                category,
                content: line.trim(),
              });
            }
          }
        });
      } catch (err) {
        // Ignore unreadable
      }
    }
  }
}

scanDir(ROOT);

console.log(`=== TASK REMNANT SCAN RESULTS ===`);
console.log(`Total matches found: ${matches.length}`);

const runtimeMatches = matches.filter((m) => m.category === "Runtime Application");
console.log(`- Runtime Application Matches: ${runtimeMatches.length}`);
if (runtimeMatches.length > 0) {
  console.log("CRITICAL: Runtime matches found:", runtimeMatches);
}

const breakdown: Record<string, number> = {};
for (const m of matches) {
  breakdown[m.category] = (breakdown[m.category] || 0) + 1;
}
console.log("\nBreakdown by Category:", breakdown);
