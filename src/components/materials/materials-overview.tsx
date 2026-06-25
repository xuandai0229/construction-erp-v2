"use client";

import { useMemo } from "react";
import { Package, AlertCircle, ArrowDownCircle, Layers } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

interface MaterialsOverviewProps {
  stocks: any[];
  transactions: any[];
  onNavigate: (tab: string) => void;
}

export function MaterialsOverview({ stocks, transactions, onNavigate }: MaterialsOverviewProps) {
  
  const stats = useMemo(() => {
    const totalTypes = stocks.length;
    const totalItems = stocks.reduce((acc, s) => acc + Number(s.stock || 0), 0);
    const lowStocks = stocks.filter(s => Number(s.stock || 0) <= Number(s.minStockLevel || 0) && Number(s.minStockLevel || 0) > 0).length;
    
    // Transactions this month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthlyTrans = transactions.filter(t => {
      const d = new Date(t.movementDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).reduce((acc, t) => acc + Number(t.quantity || 0), 0);

    return { totalTypes, totalItems, lowStocks, monthlyTrans };
  }, [stocks, transactions]);

  if (stocks.length === 0) {
    return (
      <EmptyState 
        title="Chưa có dữ liệu vật tư"
        description="Tạo danh mục vật tư đầu tiên để bắt đầu theo dõi nhập, xuất và tồn kho tại công trường."
        icon={<Package className="w-10 h-10 text-blue-500" />}
        action={
          <Button className="mt-4 bg-blue-600 hover:bg-blue-700" onClick={() => onNavigate("catalog")}>
            Thêm vật tư đầu tiên
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-sm text-slate-600">Tổng số loại vật tư</h3>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.totalTypes}</span>
            <span className="text-xs font-medium text-slate-500">loại</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-sm text-slate-600">Tổng tồn kho</h3>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.totalItems.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
            <span className="text-xs font-medium text-slate-500">đơn vị</span>
          </div>
        </div>

        {/* Card 3 */}
        <div 
          onClick={() => onNavigate("stock")}
          className={`rounded-xl border p-5 shadow-sm transition-all cursor-pointer ${
            stats.lowStocks > 0 
              ? "bg-red-50/50 border-red-200 hover:bg-red-50" 
              : "bg-white border-slate-200 hover:shadow-md"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className={`font-medium text-sm ${stats.lowStocks > 0 ? "text-red-800" : "text-slate-600"}`}>Vật tư sắp hết</h3>
            <div className={`p-2 rounded-lg ${stats.lowStocks > 0 ? "bg-red-100 text-red-600" : "bg-slate-50 text-slate-400"}`}>
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${stats.lowStocks > 0 ? "text-red-700" : "text-slate-900"}`}>{stats.lowStocks}</span>
            <span className={`text-xs font-medium ${stats.lowStocks > 0 ? "text-red-600/80" : "text-slate-500"}`}>
              {stats.lowStocks > 0 ? "cần bổ sung" : "mục"}
            </span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-sm text-slate-600">Nhập / Xuất tháng này</h3>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <ArrowDownCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.monthlyTrans.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
            <span className="text-xs font-medium text-slate-500">đơn vị</span>
          </div>
        </div>

      </div>

      <div className="mt-8 pt-6 border-t border-slate-100">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Gợi ý tác vụ</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="bg-slate-50 hover:bg-slate-100 text-slate-700" onClick={() => onNavigate("transactions")}>
            Ghi nhận xuất kho hôm nay
          </Button>
          <Button variant="outline" className="bg-slate-50 hover:bg-slate-100 text-slate-700" onClick={() => onNavigate("catalog")}>
            Cập nhật mức tồn tối thiểu
          </Button>
          <Button variant="outline" className="bg-slate-50 hover:bg-slate-100 text-slate-700" onClick={() => onNavigate("stock")}>
            Xem chi tiết tồn kho
          </Button>
        </div>
      </div>
    </div>
  );
}
