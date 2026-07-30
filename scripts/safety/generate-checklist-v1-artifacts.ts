import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type ChecklistItem = {
  code: string;
  sourceText: string;
  normalizedLabel: string;
  constructionTypes: string[];
  sourceDocument: "WEEKLY_PLAN" | "WEEKLY_REPORT";
  sourceReference: string;
  reportItemNumbers: number[];
};

type ChecklistDefinition = {
  code: string;
  version: number;
  name: string;
  effectiveFrom: string;
  sections: Array<{
    code: string;
    title: string;
    items: ChecklistItem[];
  }>;
};

async function main(): Promise<void> {
  const sourcePath = path.resolve(
    "prisma/reference-data/safety-checklist-company-v1.json",
  );
  const definition = JSON.parse(
    await readFile(sourcePath, "utf8"),
  ) as ChecklistDefinition;
  const canonicalJson = JSON.stringify(definition);
  const canonicalSha256 = createHash("sha256")
    .update(canonicalJson, "utf8")
    .digest("hex");
  const items = definition.sections.flatMap((section) =>
    section.items.map((item) => ({
      ...item,
      sectionCode: section.code,
      sectionTitle: section.title,
    })),
  );
  const reportTextByNumber = new Map(
    items
      .filter((item) => item.sourceDocument === "WEEKLY_REPORT")
      .map((item) => [item.reportItemNumbers[0], item.sourceText]),
  );

  const manifest = {
    manifestVersion: 1,
    code: definition.code,
    version: definition.version,
    name: definition.name,
    effectiveFrom: definition.effectiveFrom,
    canonicalJsonRule: "SHA-256(JSON.stringify(parsed canonical JSON))",
    canonicalSha256,
    sectionCount: definition.sections.length,
    itemCount: items.length,
    reportItemCount: new Set(
      items.flatMap((item) =>
        item.sourceDocument === "WEEKLY_REPORT"
          ? item.reportItemNumbers
          : [],
      ),
    ).size,
    sourceTemplates: [
      {
        templateType: "WEEKLY_PLAN",
        sourceSha256:
          "723eeebeb93b6dbfe49688bb7faf1414ff1e5602160d9aaa055e1d5e460f50e3",
      },
      {
        templateType: "WEEKLY_SELF_ASSESSMENT_REPORT",
        sourceSha256:
          "3c334f384cadb52b8bcf058f9f1592de3689f771fc600e4a91936115e820272e",
      },
    ],
    activationPolicy:
      "Idempotent; cùng code/version khác hash phải FAIL; không sửa template khóa; chỉ một version active.",
  };
  await writeFile(
    path.resolve(
      "artifacts/safety-inspection-template-analysis/checklist-v1-manifest.json",
    ),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  const escapeCell = (value: string): string =>
    value.replaceAll("|", "\\|").replaceAll("\r", " ").replaceAll("\n", " ");
  const matrixRows = items.map((item) => {
    const planText =
      item.sourceDocument === "WEEKLY_PLAN" ? item.sourceText : "";
    const reportText =
      item.sourceDocument === "WEEKLY_REPORT"
        ? item.sourceText
        : item.reportItemNumbers
            .map((number) => reportTextByNumber.get(number) ?? "")
            .filter(Boolean)
            .join(" / ");
    return `| ${item.code} | ${escapeCell(planText)} | ${escapeCell(reportText)} | ${escapeCell(item.normalizedLabel)} | ${item.constructionTypes.join(", ")} | ${item.sectionCode} |`;
  });
  const matrix = [
    "# Ma trận checklist chính thức SAFETY_COMPANY_V1",
    "",
    `- SHA-256 canonical: \`${canonicalSha256}\``,
    `- Số section: ${definition.sections.length}`,
    `- Số item: ${items.length}`,
    "",
    "| Item code | SourceText kế hoạch | SourceText báo cáo | Nhãn UI | Loại công trình | Nhóm |",
    "|---|---|---|---|---|---|",
    ...matrixRows,
    "",
  ].join("\n");
  await writeFile(
    path.resolve(
      "specs/002-safety-inspection-workflow/checklist-v1-matrix.md",
    ),
    matrix,
    "utf8",
  );
}

void main();
