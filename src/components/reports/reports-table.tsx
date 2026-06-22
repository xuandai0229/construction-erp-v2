"use client";

import { Eye, Download, ChevronLeft, ChevronRight, Cloud, Sun, CloudRain, CloudDrizzle, Wind, CloudLightning } from "lucide-react";
import type { FieldReport, WeatherCondition } from "./types";
import { getStatusLabel, getStatusVariant, WEATHER_OPTIONS } from "./types";
import { StatusBadge } from "@/components/ui/status-badge";
import { PhotoPreviewStack } from "./photo-preview-stack";
import { useToast } from "@/components/ui/toast-context";

interface ReportsTableProps {
  reports: FieldReport[];
  onViewDetail: (report: FieldReport) => void;
  onViewGallery?: (report: FieldReport) => void;
  totalReports: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function WeatherIcon({ weather }: { weather: WeatherCondition }) {
  switch (weather) {
    case 'LIGHT_RAIN':
      return <CloudDrizzle className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" strokeWidth={1.8} />;
    case 'HEAVY_RAIN':
      return <CloudRain className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" strokeWidth={1.8} />;
    case 'WINDY':
      return <Wind className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" strokeWidth={1.8} />;
    case 'STORM':
      return <CloudLightning className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" strokeWidth={1.8} />;
    case 'CLOUDY':
    case 'OVERCAST':
      return <Cloud className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" strokeWidth={1.8} />;
    case 'SUNNY':
    default:
      return <Sun className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" strokeWidth={1.8} />;
  }
}

export function ReportsTable({
  reports,
  onViewDetail,
  onViewGallery,
  totalReports,
  page,
  pageSize,
  onPageChange,
}: ReportsTableProps) {
  const toast = useToast();
  const totalPages = Math.ceil(totalReports / pageSize) || 1;
  const start = totalReports === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalReports);

  // Generate page numbers with ellipsis
  function getPageNumbers() {
    if (totalPages === 0) return [1];
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.info("Chức năng tải xuống báo cáo sẽ được kết nối ở bước sau");
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Table - Using table-auto and allowing it to fit container without hard min-widths */}
      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full text-sm table-auto">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              <th className="text-left py-3 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap w-[15%]">
                Mã BC
              </th>
              <th className="text-left py-3 px-3 font-semibold text-slate-600 text-xs uppercase tracking-wider min-w-[150px]">
                Công trình
              </th>
              <th className="text-left py-3 px-3 font-semibold text-slate-600 text-xs uppercase tracking-wider min-w-[140px]">
                Người tạo
              </th>
              <th className="text-left py-3 px-3 font-semibold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap">
                Thời gian
              </th>
              <th className="text-left py-3 px-3 font-semibold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap">
                Thời tiết / Mục
              </th>
              <th className="text-left py-3 px-3 font-semibold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap w-[10%]">
                Trạng thái
              </th>
              <th className="text-center py-3 px-3 font-semibold text-slate-600 text-xs uppercase tracking-wider w-[10%]">
                Hình ảnh
              </th>
              <th className="text-right py-3 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider w-[80px]">
                Tác vụ
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reports.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  Không tìm thấy báo cáo phù hợp
                </td>
              </tr>
            ) : (
              reports.map((report) => {
                const weatherLabel = WEATHER_OPTIONS.find(o => o.value === report.weatherCondition)?.label || "Khác";
                
                return (
                  <tr
                    key={report.id}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    onClick={() => onViewDetail(report)}
                  >
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className={`font-mono text-[13px] font-semibold ${report.type === 'WEEKLY' ? 'text-purple-700' : 'text-blue-700'}`}>
                          {report.code.replace('BC-D-', 'D-').replace('BC-W-', 'W-')}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {report.type === 'WEEKLY' ? 'Tuần' : 'Ngày'}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-slate-900 font-medium text-[13px] line-clamp-1">{report.projectName}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-col">
                        <span className="text-slate-900 font-medium text-[13px] line-clamp-1">{report.creatorName}</span>
                        <span className="text-slate-400 text-[11px] truncate">{report.creatorRole}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-slate-700 text-[13px]">
                          {report.type === 'WEEKLY' 
                            ? `${report.weekStartDate} - ${report.weekEndDate}`
                            : report.date}
                        </span>
                        {report.type === 'DAILY' && <span className="text-slate-400 text-[11px]">{report.time}</span>}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {report.type === 'DAILY' ? (
                        <span className="inline-flex items-center gap-1.5 text-slate-600 text-[13px]">
                          <WeatherIcon weather={report.weatherCondition} />
                          <span className="truncate max-w-[80px]">
                            {weatherLabel} {report.weatherTemperature ? `${report.weatherTemperature}°C` : ''}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-600 text-[13px]">{report.workLines.length} hạng mục</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <StatusBadge
                        variant={getStatusVariant(report.status)}
                        size="sm"
                      >
                        {getStatusLabel(report.status)}
                      </StatusBadge>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex justify-center" onClick={(e) => { e.stopPropagation(); onViewGallery?.(report); }}>
                        <PhotoPreviewStack count={report.photos.length} />
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          onClick={() => onViewDetail(report)}
                          className="p-1.5 rounded-md hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Xem chi tiết"
                          aria-label="Xem chi tiết"
                        >
                          <Eye className="w-[18px] h-[18px]" strokeWidth={2} />
                        </button>
                        <button
                          onClick={handleDownload}
                          className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                          title="Tải xuống PDF"
                          aria-label="Tải xuống"
                        >
                          <Download className="w-[18px] h-[18px]" strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/50 mt-auto shrink-0">
        <p className="text-xs sm:text-sm text-slate-500">
          Hiển thị {start}–{end} trong tổng số <span className="font-semibold text-slate-700">{totalReports}</span> báo cáo
        </p>

        <div className="flex items-center gap-1">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Trang trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {getPageNumbers().map((p, idx) =>
            p === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 text-sm">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                className={`min-w-[32px] h-8 rounded-md text-sm font-medium transition-colors ${
                  p === page
                    ? 'bg-blue-600 text-white shadow-sm border border-blue-600'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Trang sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
