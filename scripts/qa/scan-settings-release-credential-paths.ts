import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";

const outputPath = path.resolve(process.cwd(), "docs/audit/settings-credential-location-inventory.md");
const heuristic = String.raw`(?i)(postgres(?:ql)?://[^\s]+:[^\s]+@|password\s*[:=]\s*[^\s$<{]{4,}|Password123|123456|AUTH_SECRET\s*=|E2E.*PASSWORD\s*=)`;

function lines(command: string, args: string[]) {
  try {
    return execFileSync(command, args, { cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    const failure = error as { code?: string; stdout?: string };
    if (failure.code === "ENOENT" || failure.code === "EPERM") {
      throw new Error(`Unable to execute ${command}: ${failure.code}`);
    }
    const stdout = failure.stdout ?? "";
    return stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  }
}

const workingTreePaths = [...new Set(lines("rg", [
  "-l", "--hidden", "--no-ignore",
  "--glob", "!.git/**", "--glob", "!node_modules/**", "--glob", "!.next/**", "--glob", "!storage/**",
  "--glob", "!docs/audit/settings-credential-location-inventory.md",
  heuristic, ".",
]))].sort();

const historyEntries = new Set<string>();
for (const needle of ["123456", "Password123", "postgresql://", "postgres://"]) {
  for (const entry of lines("git", ["log", "--all", "-S", needle, "--name-only", "--pretty=format:COMMIT %H"])) {
    historyEntries.add(entry);
  }
}

const evidenceRoots = ["docs/audit", "test-results", "playwright-report"].filter((entry) => existsSync(entry));
const screenshotPaths = lines("rg", ["--files", "--hidden", "--no-ignore", ...evidenceRoots])
  .filter((entry) => /\.(png|jpe?g|webp|zip|trace)$/i.test(entry));

const markdown = `# Settings release credential location inventory

Generated: ${new Date().toISOString()}

This inventory contains paths and commit identifiers only. It does not contain matched values.

## Summary

- Working-tree heuristic candidates: ${workingTreePaths.length}
- Git-history path/commit entries: ${historyEntries.size}
- Screenshot/trace artefacts requiring visual review: ${screenshotPaths.length}
- CI log files found in repository: ${workingTreePaths.filter((entry) => entry.startsWith(".github/")).length}
- Repository terminal transcript files matched: ${workingTreePaths.filter((entry) => /terminal|stdout|stderr|\.log$/i.test(entry)).length}

Heuristic matches include examples and intentionally fake sanitizer test values. Each path still requires classification; candidate count is not a confirmed-secret count.

## Working tree paths

${workingTreePaths.map((entry) => `- \`${entry}\``).join("\n") || "- None"}

## Git history entries

${[...historyEntries].sort().map((entry) => `- \`${entry}\``).join("\n") || "- None"}

## Screenshot and trace paths

${screenshotPaths.map((entry) => `- \`${entry}\``).join("\n") || "- None"}

## External locations not scrubbed by repository changes

- Codex/terminal transcript retained by the host application.
- CI provider logs outside this checkout.
- Browser password managers, cookies, and external screenshots outside this checkout.

Those locations require owner/platform-side retention and rotation handling. Repository edits cannot prove their deletion.
`;

writeFileSync(outputPath, markdown, "utf8");
console.log(JSON.stringify({ output: "docs/audit/settings-credential-location-inventory.md", workingTreeCandidates: workingTreePaths.length, historyEntries: historyEntries.size, screenshotPaths: screenshotPaths.length, valuesPrinted: false }));
