"use client";

import { useState } from "react";
import { Check, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const SAFETY_SUGGESTED_ITEMS = [
  {
    category: "Phần hồ sơ",
    items: [
      "Kiểm tra hồ sơ pháp lý công nhân thực tế trên công trường",
      "Kiểm tra sổ theo dõi cấp phát bảo hộ lao động",
      "Kiểm tra nhật ký an toàn lao động và cam kết an toàn",
      "Kiểm tra thẻ an toàn lao động nhóm 3 và hồ sơ huấn luyện",
      "Kiểm tra hồ sơ khám sức khỏe định kỳ và bảo hiểm tai nạn công nhân",
    ],
  },
  {
    category: "Hiện trường công trình xây lắp",
    items: [
      "Kiểm tra việc sử dụng trang thiết bị BHO đã được cấp phát",
      "Kiểm tra hệ thống biển cảnh báo an toàn trên công trường",
      "Kiểm tra an toàn hệ thống cáp điện, dây điện thi công và tủ điện",
      "Kiểm tra an toàn hệ thống điện sinh hoạt trong lán trại công nhân",
      "Kiểm tra giàn giáo ngoài, lưới chống bụi và lưới chống vật rơi",
      "Kiểm tra công tác thực hiện vệ sinh công nghiệp trên công trường",
      "Kiểm tra hệ thống dây đu sơn ngoài nhà và thiết bị an toàn",
      "Kiểm tra hồ sơ máy, thiết bị có yêu cầu nghiêm ngặt và kiểm định",
      "Kiểm tra lan can an toàn cầu thang, lan can biên và hố thang máy",
    ],
  },
  {
    category: "Công trình hạ tầng, hố đào",
    items: [
      "Kiểm tra an toàn hệ thống cừ, văng chống thành hố đào",
      "Kiểm tra tình trạng thành hố đào, lỗ mở và hố ga",
      "Kiểm tra lan can an toàn hố sâu và rào chắn cảnh báo",
    ],
  },
  {
    category: "Công tác huấn luyện an toàn",
    items: [
      "Huấn luyện an toàn 30 phút đầu giờ cho công nhân trên công trường",
      "Phối hợp Ban chỉ huy huấn luyện an toàn tập trung tại công trình",
    ],
  },
];

export function SafetySuggestedContentModal({
  isOpen,
  onClose,
  onSelectItems,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectItems: (selectedTexts: string[]) => void;
}) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  if (!isOpen) return null;

  const toggleItem = (text: string) => {
    setSelected((prev) => ({ ...prev, [text]: !prev[text] }));
  };

  const handleApply = () => {
    const chosen = Object.keys(selected).filter((k) => selected[k]);
    onSelectItems(chosen);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Chọn nội dung kiểm tra gợi ý (Mẫu 02)</h3>
            <p className="text-xs text-slate-500">Tích chọn các mục nội dung để thêm vào ô kiểm tra</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm nội dung kiểm tra..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Content List */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
          {SAFETY_SUGGESTED_ITEMS.map((cat) => {
            const filtered = cat.items.filter((item) =>
              item.toLowerCase().includes(search.toLowerCase())
            );
            if (filtered.length === 0) return null;

            return (
              <div key={cat.category} className="space-y-2">
                <div className="font-bold text-blue-800 bg-blue-50 px-2 py-1 rounded">
                  {cat.category}
                </div>
                <div className="space-y-1.5 pl-1">
                  {filtered.map((item) => {
                    const isChecked = !!selected[item];
                    return (
                      <label
                        key={item}
                        onClick={() => toggleItem(item)}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border transition cursor-pointer select-none ${
                          isChecked
                            ? "bg-blue-50/80 border-blue-300 text-blue-900"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="leading-snug">{item}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600">
            Đã chọn: <span className="text-blue-700 font-bold">{Object.values(selected).filter(Boolean).length} mục</span>
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onClose} className="h-8 text-xs font-semibold">
              Hủy
            </Button>
            <Button size="sm" onClick={handleApply} className="h-8 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700">
              <Check className="h-4 w-4 mr-1" /> Thêm vào nội dung
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
