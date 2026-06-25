"use client";

import { useState } from "react";
import { Search, Plus, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MaterialsCatalogProps {
  materialItems: any[];
  stocks: any[];
  onAddMaterial: () => void;
}

export function MaterialsCatalog({ materialItems, stocks, onAddMaterial }: MaterialsCatalogProps) {
  const [search, setSearch] = useState("");

  const filtered = materialItems.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm trong từ điển vật tư..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <Button className="hidden sm:flex bg-slate-900 hover:bg-slate-800 text-white gap-2" onClick={onAddMaterial}>
          <Plus className="w-4 h-4" />
          Tạo mã vật tư mới
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-4 py-3">Mã VT</th>
                <th className="px-4 py-3">Tên vật tư</th>
                <th className="px-4 py-3">Đơn vị</th>
                <th className="px-4 py-3">Nhóm</th>
                <th className="px-4 py-3 text-center">Tồn tại dự án</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(m => {
                const stock = stocks.find(s => s.materialItemId === m.id);
                const hasStock = !!stock;
                
                return (
                  <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{m.code}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{m.name}</td>
                    <td className="px-4 py-3 text-slate-600">{m.unit}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {m.group ? (
                        <span className="inline-flex px-2 py-1 rounded bg-slate-100 text-slate-600 text-[11px] font-medium">
                          {m.group}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Chưa phân loại</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hasStock ? (
                        <span className="inline-flex px-2 py-1 rounded text-[11px] font-medium bg-blue-50 text-blue-700">
                          Đang theo dõi
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!hasStock && (
                        <button className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                          Thêm vào dự án
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Không tìm thấy mã vật tư nào trong hệ thống
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
