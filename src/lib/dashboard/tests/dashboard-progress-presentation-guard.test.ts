import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const presentationFiles = [
  "src/components/dashboard/dashboard-project-overview.tsx",
  "src/components/dashboard/executive/executive-project-progress.tsx",
  "src/components/dashboard/executive/executive-status-chart.tsx",
  "src/components/dashboard/executive/portfolio-priority-lists.tsx",
  "src/components/dashboard/executive/project-dashboard-cards.tsx",
  "src/lib/dashboard/dashboard-information-architecture.ts",
  "src/app/(dashboard)/dashboard/projects-status/projects-status-client-view.tsx",
];

describe("Dashboard progress presentation guard", () => {
  it("never substitutes planned progress for actual progress", () => {
    for (const file of presentationFiles) {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(source).not.toMatch(/actualProgressPercent\s*(?:\?\?|\|\|)\s*plannedProgressPercent/);
    }
  });
});
