"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupervisionWeeklyInspectionWorks } from "@/app/(dashboard)/supervision/weekly/actions";
import { EnterpriseCombobox, type EnterpriseComboboxOption } from "@/components/ui/enterprise-combobox";
import type { WeeklyEntry } from "@/lib/supervision-weekly/editor-types";
import { AutoTextarea } from "./source-selector";

type InspectionWork = {
  id: string;
  code: string | null;
  name: string;
};

export function InspectionContentEditor({ entry, editable, testId, onChange }: {
  entry: WeeklyEntry;
  editable: boolean;
  testId: string;
  onChange: (patch: Partial<WeeklyEntry>) => void;
}) {
  const [works, setWorks] = useState<InspectionWork[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!entry.projectId || !entry.categoryItemId) {
      setWorks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void getSupervisionWeeklyInspectionWorks(entry.projectId, entry.categoryItemId)
      .then((result) => {
        if (!cancelled) setWorks(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [entry.projectId, entry.categoryItemId]);

  const options = useMemo<EnterpriseComboboxOption[]>(() => works.map((work) => ({
    value: work.id,
    label: work.name,
    code: work.code,
  })), [works]);

  const selectWork = (workId: string, option?: EnterpriseComboboxOption) => {
    if (!workId) {
      onChange({ inspectionWorkItemId: null, inspectionWorkNameSnapshot: null });
      return;
    }
    const name = option?.label || works.find((work) => work.id === workId)?.name || null;
    onChange({
      inspectionWorkItemId: workId,
      inspectionWorkNameSnapshot: name,
      inspectionContent: entry.inspectionContent?.trim() ? entry.inspectionContent : name,
    });
  };

  return <div className="grid min-w-0 gap-2" data-testid={testId}>
    <EnterpriseCombobox
      value={entry.inspectionWorkItemId || ""}
      selectedLabel={entry.inspectionWorkNameSnapshot || undefined}
      options={options}
      onChange={selectWork}
      placeholder={loading ? "Đang tải công việc..." : "Chọn công việc..."}
      searchPlaceholder="Tìm tên hoặc mã công việc..."
      emptyMessage="Hạng mục chưa có công việc phù hợp."
      disabled={!editable || !entry.projectId || !entry.categoryItemId || loading}
      ariaLabel="Chọn công việc kiểm tra"
      testId={`${testId}-work`}
      maxPanelHeight={320}
    />
    <AutoTextarea
      disabled={!editable}
      value={entry.inspectionContent || ""}
      onChange={(value) => onChange({ inspectionContent: value || null })}
      placeholder="Hoặc nhập nội dung kiểm tra..."
      testId={`${testId}-manual`}
    />
  </div>;
}
