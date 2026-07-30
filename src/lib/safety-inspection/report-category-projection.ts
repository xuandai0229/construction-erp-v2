export type SafetyReportProjectionStatus =
  | "PASS"
  | "FAIL"
  | "NOT_APPLICABLE"
  | "INCOMPLETE"
  | "NO_DATA"
  | "CLARIFICATION_REQUIRED";

export type SafetyReportCategoryProjectionInput = {
  code: string;
  sourceNumber: number;
  sourceText: string;
  normalizedLabel: string;
  requiresBusinessClarification: boolean;
  blocksCompletion: boolean;
  isScored: boolean;
  itemCodes: readonly string[];
};

export type SafetyOperationalResultProjectionInput = {
  resultId: string;
  itemCode: string;
  status: "PASS" | "FAIL" | "NOT_APPLICABLE" | "NOT_INSPECTED";
  findingIds: readonly string[];
};

export function projectSafetyReportCategories(
  categories: readonly SafetyReportCategoryProjectionInput[],
  results: readonly SafetyOperationalResultProjectionInput[],
) {
  return categories.map((category) => {
    const categoryResults = results.filter((result) =>
      category.itemCodes.includes(result.itemCode),
    );
    const passCount = categoryResults.filter(
      (result) => result.status === "PASS",
    ).length;
    const failCount = categoryResults.filter(
      (result) => result.status === "FAIL",
    ).length;
    const notApplicableCount = categoryResults.filter(
      (result) => result.status === "NOT_APPLICABLE",
    ).length;
    const notInspectedCount = categoryResults.filter(
      (result) => result.status === "NOT_INSPECTED",
    ).length;
    let status: SafetyReportProjectionStatus;
    if (category.requiresBusinessClarification && !category.isScored) {
      status = "CLARIFICATION_REQUIRED";
    } else if (failCount > 0) {
      status = "FAIL";
    } else if (notInspectedCount > 0) {
      status = "INCOMPLETE";
    } else if (passCount > 0) {
      status = "PASS";
    } else if (
      categoryResults.length > 0 &&
      notApplicableCount === categoryResults.length
    ) {
      status = "NOT_APPLICABLE";
    } else {
      status = "NO_DATA";
    }
    return {
      categoryCode: category.code,
      sourceNumber: category.sourceNumber,
      sourceText: category.sourceText,
      normalizedLabel: category.normalizedLabel,
      status,
      blocksCompletion: category.blocksCompletion,
      passCount,
      failCount,
      notApplicableCount,
      notInspectedCount,
      resultIds: categoryResults.map((result) => result.resultId),
      findingIds: [
        ...new Set(categoryResults.flatMap((result) => result.findingIds)),
      ],
    };
  });
}
