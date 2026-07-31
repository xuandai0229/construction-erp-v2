"use client";

import React, { useState, useMemo } from "react";
import { Search, Sparkles, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SAFETY_ASSESSMENT_OFFICIAL_CONTENT } from "@/lib/safety-reporting/safety-assessment-official-content";

interface SafetyItemPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItems: (selectedTexts: string[]) => void;
}

export function SafetyItemPickerModal({
  isOpen,
  onClose,
  onSelectItems,
}: SafetyItemPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return SAFETY_ASSESSMENT_OFFICIAL_CONTENT.standard20Items.map((text, idx) => ({ text, idx }));
    return SAFETY_ASSESSMENT_OFFICIAL_CONTENT.standard20Items
      .map((text, idx) => ({ text, idx }))
      .filter(({ text }) => text.toLowerCase().includes(query));
  }, [searchQuery]);

  if (!isOpen) return null;

  const toggleSelect = (idx: number) => {
    setSelectedIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleApply = () => {
    const selectedTexts = selectedIndices
      .sort((a, b) => a - b)
      .map((idx) => SAFETY_ASSESSMENT_OFFICIAL_CONTENT.standard20Items[idx]);
    onSelectItems(selectedTexts);
    setSelectedIndices([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col font-sans">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Danh mục 20 nội dung kiểm tra tiêu chuẩn (Mẫu 01)
              </h3>
              <p className="text-xs text-slate-500">
                Chọn một hoặc nhiều nội dung bên dưới để thêm vào ô nội dung kiểm tra.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search input */}
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm nội dung kiểm tra..."
            className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2 text-xs focus:border-blue-500 focus:outline-none bg-slate-50/50"
          />
        </div>

        {/* List of 20 Items */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Không tìm thấy nội dung phù hợp từ khóa
            </div>
          ) : (
            filteredItems.map(({ text, idx }) => {
              const isSelected = selectedIndices.includes(idx);
              return (
                <div
                  key={idx}
                  onClick={() => toggleSelect(idx)}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-50/40 text-blue-900 font-medium shadow-2xs"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/80"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      isSelected
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <span className="leading-relaxed">{text}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 shrink-0">
          <span className="text-xs font-medium text-slate-500">
            Đã chọn: <strong className="text-blue-600">{selectedIndices.length}</strong> nội dung
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs font-semibold"
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={selectedIndices.length === 0}
              onClick={handleApply}
              className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4"
            >
              Thêm vào nội dung ({selectedIndices.length})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
