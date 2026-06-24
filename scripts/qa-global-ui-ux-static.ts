import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

const globals = read("src/app/globals.css");
const appShell = read("src/components/layout/app-shell.tsx");
const button = read("src/components/ui/button.tsx");
const emptyState = read("src/components/ui/empty-state.tsx");
const confirmDialog = read("src/components/ui/confirm-dialog.tsx");
const reportsWorkspace = read("src/components/reports/reports-workspace.tsx");
const documentsWorkspace = read("src/components/documents/document-workspace.tsx");
const users = read("src/components/users/user-management-client.tsx");

assert(
  !globals.includes("@media (prefers-color-scheme: dark)"),
  "Global ERP theme must not partially switch to dark mode.",
);
assert(globals.includes(".app-page"), "Missing shared app-page layout contract.");
assert(globals.includes(".form-control"), "Missing shared form-control contract.");
assert(globals.includes(".icon-button"), "Missing shared icon-button contract.");
assert(appShell.includes("app-page-container"), "AppShell must own the shared page container.");

assert(button.includes("size?:"),
  "Button primitive must expose a consistent size contract.");
assert(button.includes("focus-visible:ring-offset-2"),
  "Button focus ring must include a visible offset.");

assert(emptyState.includes("action?: React.ReactNode"),
  "EmptyState must support a contextual CTA.");
assert(confirmDialog.includes("max-h-[calc(100dvh-2rem)]"),
  "ConfirmDialog must be mobile viewport safe.");

assert(!reportsWorkspace.includes("window.confirm"),
  "Reports delete must use the shared ConfirmDialog.");
assert(reportsWorkspace.includes("<ConfirmDialog"),
  "Reports workspace is missing the shared delete confirmation.");

assert(!documentsWorkspace.includes("opacity-0 group-hover:opacity-100"),
  "Document actions must not depend on hover-only discovery.");
assert(users.includes('role="dialog"'),
  "User modals must expose dialog semantics.");

console.log("PASS: Global UI/UX static contract.");
