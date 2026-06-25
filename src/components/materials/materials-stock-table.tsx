"use client";

import { useState } from "react";
import { Search, Edit2, MoreVertical, ShieldAlert, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface MaterialsStockTableProps {
  stocks: any[];
  onTransaction?: (type: "IMPORT" | "EXPORT", materialId?: string) => void;
}

export function MaterialsStockTable({ stocks, onTransaction }: MaterialsStockTableProps) {
  const [search, setSearch] = useState("");

  const filtered = stocks.filter(s => 
    s.materialItem.name.toLowerCase().includes(search.toLowerCase()) || 
    s.materialItem.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="Tìm tên hoặc mã vật tư..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-10 pl-9 pr-4 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-4 py-3">Mã VT</th>
                <th className="px-4 py-3">Tên vật tư</th>
                <th className="px-4 py-3">Nhóm</th>
                <th className="px-4 py-3 text-right">Tồn hiện tại</th>
                <th className="px-4 py-3 text-right">Tồn tối thiểu</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3">Cập nhật</th>
                <th className="px-4 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(s => {
                const stock = Number(s.stock);
                const min = Number(s.minStockLevel);
                const isLow = min > 0 && stock <= min;
                const isOut = stock === 0;

                return (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.materialItem.code}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{s.materialItem.name}</td>
                    <td className="px-4 py-3 text-slate-600">{s.materialItem.group || "Chưa phân loại"}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {stock.toLocaleString("en-US", { maximumFractionDigits: 2 })} <span className="text-slate-500 font-normal text-xs">{s.materialItem.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {min.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isOut ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600">
                          Hết hàng
                        </span>
                      ) : isLow ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium bg-red-50 text-red-700">
                          <ShieldAlert className="w-3 h-3" /> Sắp hết
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" /> Đủ hàng
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {format(new Date(s.lastUpdated), "dd/MM/yyyy")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => onTransaction?.("IMPORT", s.materialItemId)}
                          className="p-1.5 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                          title="Nhập kho"
                        >
                          Nhập
                        </button>
                        <button 
                          onClick={() => onTransaction?.("EXPORT", s.materialItemId)}
                          className="p-1.5 text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors"
                          title="Xuất kho"
                        >
                          Xuất
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Không tìm thấy vật tư nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filtered.map(s => {
          const stock = Number(s.stock);
          const min = Number(s.minStockLevel);
          const isLow = min > 0 && stock <= min;
          const isOut = stock === 0;

          return (
            <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{s.materialItem.name}</h3>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">{s.materialItem.code}</p>
                </div>
                {isOut ? (
                  <span className="px-2 py-1 rounded text-[10px] font-medium bg-slate-100 text-slate-600">Hết</span>
                ) : isLow ? (
                  <span className="px-2 py-1 rounded text-[10px] font-medium bg-red-50 text-red-700">Sắp hết</span>
                ) : (
                  <span className="px-2 py-1 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700">Đủ</span>
                )}
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Tồn kho</span>
                  <span className="text-lg font-bold text-slate-900">
                    {stock.toLocaleString("en-US")} <span className="text-sm font-normal text-slate-500">{s.materialItem.unit}</span>
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Tối thiểu</span>
                  <span className="text-sm font-medium text-slate-700">
                    {min.toLocaleString("en-US")}
                  </span>
                </div>
              </div>
              
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button 
                  onClick={() => onTransaction?.("IMPORT", s.materialItemId)}
                  className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-100"
                >
                  Nhập kho
                </button>
                <button 
                  onClick={() => onTransaction?.("EXPORT", s.materialItemId)}
                  className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-100"
                >
                  Xuất kho
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-xl">
            Không tìm thấy vật tư nào
          </div>
        )}
      </div>
    </div>
  );
}
