import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appRoot = path.join(root, "src", "app");

function walk(dir: string, out: string[] = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name === "actions.ts" || entry.name === "route.ts") out.push(full);
  }
  return out;
}

function isMutation(name: string, file: string) {
  if (file.endsWith("route.ts")) return /\b(POST|PUT|PATCH|DELETE)\b/.test(name);
  return /^(create|update|delete|restore|softDelete|permanentDelete|change|approve|reject|cancel|submit|batch|set|assign|unassign|reset|toggle)/.test(name);
}

function main() {
  console.log("=== SERVER ACTION/API GUARD AUDIT ===");
  const files = walk(appRoot);
  for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, "/");
    const code = fs.readFileSync(file, "utf8");
    const exports = [...code.matchAll(/export\s+async\s+function\s+([A-Za-z0-9_]+)/g)].map((m) => m[1]);
    const handlers = [...code.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)/g)].map((m) => m[1]);
    const names = [...new Set([...exports, ...handlers])].filter((name) => isMutation(name, rel));
    if (names.length === 0) continue;

    const hasSession = /\b(getSession|requireAuth|requireProjectAccess)\b/.test(code);
    const hasProjectScope = /\b(canAccessProject|requireProjectAccess|requireProjectScope|getAccessibleProjectIds|projectMember)\b/.test(code);
    const hasPermission = /\b(assert[A-Za-z]*Permission|assertRoleHierarchy|get[A-Za-z]*Permissions|can[A-Z][A-Za-z]+|canManageUsers|canManageProjects)\b/.test(code);
    const isGlobalMutation =
      /src\/app\/\(dashboard\)\/(projects|settings|users)\/actions\.ts$/.test(rel) ||
      /src\/app\/api\/auth\/(login|logout)\/route\.ts$/.test(rel);
    const level =
      hasSession && (hasProjectScope || isGlobalMutation) && hasPermission
        ? isGlobalMutation
          ? "guarded-global"
          : "guarded"
        : hasSession && hasProjectScope
          ? "missing-permission"
          : hasSession
            ? "missing-project-scope"
            : isGlobalMutation
              ? "public-or-session"
              : "missing-session";
    console.log(`${level.padEnd(20)} ${rel} :: ${names.join(", ")}`);
  }
}

main();
