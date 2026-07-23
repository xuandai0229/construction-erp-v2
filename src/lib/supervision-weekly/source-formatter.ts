export type SupervisionInspectionSource = {
  projectId?: string | null;
  projectNameSnapshot?: string | null;
  locationId?: string | null;
  locationNameSnapshot?: string | null;
  workItemId?: string | null;
  workItemNameSnapshot?: string | null;
  manualLocation?: string | null;
  manualText?: string | null;
  manualProjectName?: string | null;
  manualWorkItemName?: string | null;
  categoryItemId?: string | null;
  categoryNameSnapshot?: string | null;
  manualCategoryName?: string | null;
  displayText?: string | null;
};

function clean(value: string | null | undefined) {
  return value?.trim() || "";
}

export function formatSupervisionProjectAndWorkItem(
  source?: SupervisionInspectionSource | null,
  separator = " - ",
) {
  if (!source) return "";
  const project = clean(source.projectNameSnapshot) || clean(source.manualProjectName);
  const workItems = [
    clean(source.categoryNameSnapshot),
    clean(source.manualCategoryName),
    clean(source.locationNameSnapshot),
    clean(source.workItemNameSnapshot),
    clean(source.manualWorkItemName),
    clean(source.manualLocation),
  ].filter(Boolean);
  const structured = [project, ...Array.from(new Set(workItems))].filter(Boolean);

  if (structured.length) return Array.from(new Set(structured)).join(separator);
  return clean(source.manualText) || clean(source.displayText);
}

export const formatSupervisionInspectionSource = formatSupervisionProjectAndWorkItem;

export function formatSupervisionSourceLines(source?: SupervisionInspectionSource | null): { projectLine: string | null; categoryLine: string | null } {
  if (!source) return { projectLine: null, categoryLine: null };
  const project = clean(source.projectNameSnapshot) || clean(source.manualProjectName);
  const workItems = Array.from(new Set([
    clean(source.categoryNameSnapshot),
    clean(source.manualCategoryName),
    clean(source.locationNameSnapshot),
    clean(source.workItemNameSnapshot),
    clean(source.manualWorkItemName),
    clean(source.manualLocation),
  ].filter(Boolean))).join(" - ");

  const fallback = clean(source.manualText) || clean(source.displayText);

  if (!project && !workItems && fallback) {
    return { projectLine: fallback, categoryLine: null };
  }

  return {
    projectLine: project || null,
    categoryLine: workItems || null,
  };
}
export function hasMeaningfulSupervisionSource(source: SupervisionInspectionSource) {
  return Boolean(formatSupervisionProjectAndWorkItem(source));
}

export function hasMeaningfulSupervisionProject(source: SupervisionInspectionSource) {
  if (clean(source.projectNameSnapshot) || clean(source.manualProjectName)) return true;
  const hasNewWorkItemShape = Boolean(clean(source.categoryNameSnapshot) || clean(source.manualCategoryName) || clean(source.manualWorkItemName) || clean(source.locationNameSnapshot) || clean(source.workItemNameSnapshot));
  return !hasNewWorkItemShape && Boolean(clean(source.manualText) || clean(source.displayText));
}

export function sourceWithFormattedDisplay<T extends SupervisionInspectionSource>(source: T): T & { displayText: string } {
  return { ...source, displayText: formatSupervisionProjectAndWorkItem(source) };
}
