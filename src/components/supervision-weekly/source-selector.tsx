"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { EnterpriseCombobox, type EnterpriseComboboxOption } from "@/components/ui/enterprise-combobox";
import { getSupervisionWeeklyInspectionWorks, getSupervisionWeeklySourceOptions } from "@/app/(dashboard)/supervision/weekly/actions";
import type { WeeklyEntry, WeeklyInputMode, WeeklyProject, WeeklySource } from "@/lib/supervision-weekly/editor-types";

type CategoryItem = {
  id: string;
  code: string | null;
  name: string;
};

const recentProjectIds: string[] = [];

export function inferSourceMode(value: WeeklySource): WeeklyInputMode {
  if (value.projectId && value.categoryItemId) return "PROJECT_WORK_ITEM";
  if (value.projectId) return "PROJECT_MANUAL_ITEM";
  return "MANUAL_TEXT";
}

export function SourceSelector({ value, projects, editable, testId, autoFocusToken, onChange }: {
  value: WeeklySource;
  projects: WeeklyProject[];
  editable: boolean;
  testId: string;
  autoFocusToken?: number;
  onChange: (patch: Partial<WeeklySource> & { inputMode?: WeeklyInputMode }) => void;
}) {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentRevision, setRecentRevision] = useState(0);

  const projectOptions = useMemo<EnterpriseComboboxOption[]>(() => [...projects]
    .sort((left, right) => {
      const leftRecent = recentProjectIds.indexOf(left.id);
      const rightRecent = recentProjectIds.indexOf(right.id);
      if (leftRecent >= 0 || rightRecent >= 0) return (leftRecent < 0 ? 999 : leftRecent) - (rightRecent < 0 ? 999 : rightRecent);
      return left.name.localeCompare(right.name, "vi");
    })
    .map((project) => ({ value: project.id, code: project.code, label: project.name, description: project.location })), [projects, recentRevision]);

  useEffect(() => {
    let cancelled = false;
    if (!value.projectId) {
      setCategories([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void getSupervisionWeeklySourceOptions(value.projectId)
      .then((result) => {
        if (cancelled) return;
        setCategories(result.workItems.map((item) => ({ id: item.id, code: item.code, name: item.name })));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [value.projectId]);

  const categoryOptions = useMemo<EnterpriseComboboxOption[]>(() => categories.map((item) => ({
    value: item.id,
    label: item.name,
    code: item.code,
  })), [categories]);

  const legacyManualProject = !value.projectId && !value.manualProjectName && !value.categoryItemId
    ? value.manualText || ""
    : "";
  const manualProjectName = value.manualProjectName || legacyManualProject;
  const legacyManualCategory = value.projectId && !value.categoryItemId
    ? value.manualCategoryName || value.manualWorkItemName || value.manualLocation || ""
    : "";
  const manualCategoryName = value.manualCategoryName || legacyManualCategory;
  const legacyCategoryLabel = !value.categoryItemId && !manualCategoryName
    ? value.workItemNameSnapshot || value.locationNameSnapshot || null
    : null;

  const selectProject = (projectId: string, option?: EnterpriseComboboxOption) => {
    if (!projectId) {
      onChange({
        projectId: null,
        projectNameSnapshot: null,
        categoryItemId: null,
        categoryNameSnapshot: null,
        locationId: null,
        locationNameSnapshot: null,
        workItemId: null,
        workItemNameSnapshot: null,
        inputMode: "MANUAL_TEXT",
      });
      return;
    }
    const recentIndex = recentProjectIds.indexOf(projectId);
    if (recentIndex >= 0) recentProjectIds.splice(recentIndex, 1);
    recentProjectIds.unshift(projectId);
    recentProjectIds.splice(5);
    setRecentRevision((revision) => revision + 1);
    onChange({
      projectId,
      projectNameSnapshot: option?.label || projects.find((project) => project.id === projectId)?.name || null,
      manualProjectName: null,
      manualText: null,
      categoryItemId: null,
      categoryNameSnapshot: null,
      locationId: null,
      locationNameSnapshot: null,
      workItemId: null,
      workItemNameSnapshot: null,
      inputMode: "PROJECT_MANUAL_ITEM",
    });
  };

  const selectCategory = (categoryId: string, option?: EnterpriseComboboxOption) => {
    if (!categoryId) {
      onChange({
        categoryItemId: null,
        categoryNameSnapshot: null,
        locationId: null,
        locationNameSnapshot: null,
        workItemId: null,
        workItemNameSnapshot: null,
        inputMode: value.projectId ? "PROJECT_MANUAL_ITEM" : "MANUAL_TEXT",
      });
      return;
    }
    onChange({
      categoryItemId: categoryId,
      categoryNameSnapshot: option?.label || categories.find((item) => item.id === categoryId)?.name || null,
      manualCategoryName: null,
      manualWorkItemName: null,
      manualLocation: null,
      locationId: null,
      locationNameSnapshot: null,
      workItemId: null,
      workItemNameSnapshot: null,
      inputMode: "PROJECT_WORK_ITEM",
    });
  };

  return <div data-testid={testId} className="grid min-w-0 gap-2">
    <div className="grid min-w-0 gap-1.5">
      <label className="text-xs font-semibold text-slate-600">Công trình</label>
      <EnterpriseCombobox
        value={value.projectId || ""}
        selectedLabel={value.projectNameSnapshot || undefined}
        options={projectOptions}
        onChange={selectProject}
        placeholder="Chọn công trình..."
        searchPlaceholder="Tìm tên hoặc mã công trình..."
        emptyMessage="Không tìm thấy công trình phù hợp."
        disabled={!editable}
        ariaLabel="Chọn công trình"
        testId={`${testId}-project`}
        autoFocusToken={autoFocusToken}
        maxPanelHeight={340}
      />
      <input
        disabled={!editable}
        value={manualProjectName}
        onChange={(event) => onChange({
          projectId: null,
          projectNameSnapshot: null,
          categoryItemId: null,
          categoryNameSnapshot: null,
          locationId: null,
          locationNameSnapshot: null,
          workItemId: null,
          workItemNameSnapshot: null,
          manualProjectName: event.target.value || null,
          manualText: null,
          inputMode: "MANUAL_TEXT",
        })}
        placeholder="Hoặc nhập công trình khác"
        aria-label="Hoặc nhập công trình khác"
        data-testid={`${testId}-project-manual`}
        className="h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100"
      />
    </div>

    <div className="grid min-w-0 gap-1.5">
      <label className="text-xs font-semibold text-slate-600">Hạng mục</label>
      <EnterpriseCombobox
        value={value.categoryItemId || ""}
        selectedLabel={value.categoryNameSnapshot || legacyCategoryLabel || undefined}
        options={categoryOptions}
        onChange={selectCategory}
        placeholder={loading ? "Đang tải hạng mục..." : "Chọn hạng mục..."}
        searchPlaceholder="Tìm tên hoặc mã hạng mục..."
        emptyMessage="Công trình chưa có hạng mục phù hợp."
        disabled={!editable || !value.projectId || loading}
        ariaLabel="Chọn hạng mục"
        testId={`${testId}-category`}
        maxPanelHeight={320}
      />
      <input
        disabled={!editable}
        value={manualCategoryName}
        onChange={(event) => onChange({
          categoryItemId: null,
          categoryNameSnapshot: null,
          locationId: null,
          locationNameSnapshot: null,
          workItemId: null,
          workItemNameSnapshot: null,
          manualCategoryName: event.target.value || null,
          manualWorkItemName: null,
          manualLocation: null,
          inputMode: value.projectId ? "PROJECT_MANUAL_ITEM" : "MANUAL_TEXT",
        })}
        placeholder="Hoặc nhập hạng mục khác"
        aria-label="Hoặc nhập hạng mục khác"
        data-testid={`${testId}-category-manual`}
        className="h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100"
      />
    </div>
  </div>;
}

export function AutoTextarea({ value, onChange, placeholder, disabled, testId, className = "" }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  testId?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = () => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.max(element.scrollHeight, 40)}px`;
  };
  useLayoutEffect(resize, [value]);
  return <textarea ref={ref} rows={1} disabled={disabled} value={value} onInput={resize} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} data-testid={testId} className={`min-h-10 w-full min-w-0 max-w-full resize-none overflow-hidden rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-5 outline-none [field-sizing:content] [overflow-wrap:anywhere] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 ${className}`} />;
}

export function InspectionWorkSelector({ value, editable, testId, onChange }: {
  value: WeeklyEntry;
  editable: boolean;
  testId: string;
  onChange: (patch: Partial<WeeklyEntry>) => void;
}) {
  const [works, setWorks] = useState<{ id: string; code: string | null; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!value.projectId || !value.categoryItemId) {
      setWorks([]);
      return;
    }
    setLoading(true);
    getSupervisionWeeklyInspectionWorks(value.projectId, value.categoryItemId)
      .then((result) => {
        if (!cancelled) setWorks(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [value.projectId, value.categoryItemId]);

  const options = useMemo<EnterpriseComboboxOption[]>(() => works.map((w) => ({ value: w.id, label: w.name, code: w.code })), [works]);

  const selectWork = (workId: string, option?: EnterpriseComboboxOption) => {
    const label = option?.label || works.find(w => w.id === workId)?.name || null;
    onChange({
      inspectionWorkItemId: workId || null,
      inspectionWorkNameSnapshot: label,
      inspectionContent: !value.inspectionContent ? label : value.inspectionContent,
    });
  };

  return <div className="grid min-w-0 gap-2">
    <EnterpriseCombobox
      value={value.inspectionWorkItemId || ""}
      selectedLabel={value.inspectionWorkNameSnapshot || undefined}
      options={options}
      onChange={selectWork}
      placeholder={loading ? "Đang tải công việc..." : "Chọn công việc có sẵn..."}
      searchPlaceholder="Tìm tên hoặc mã công việc..."
      emptyMessage={value.categoryItemId ? "Hạng mục chưa có công việc." : "Vui lòng chọn Hạng mục trước."}
      disabled={!editable || !value.categoryItemId || loading}
      clearable={true}
      testId={`${testId}-combobox`}
      maxPanelHeight={320}
    />
    <AutoTextarea
      value={value.inspectionContent || ""}
      onChange={(content) => onChange({ inspectionContent: content || null })}
      placeholder="Hoặc nhập nội dung kiểm tra..."
      disabled={!editable}
      testId={`${testId}-textarea`}
    />
  </div>;
}

