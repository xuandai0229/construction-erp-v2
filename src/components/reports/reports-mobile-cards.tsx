"use client";

import { Eye, Calendar, Cloud, Sun, CloudRain, CloudDrizzle, Wind, CloudLightning } from "lucide-react";
import type { FieldReport, WeatherCondition } from "./types";
import { getStatusLabel, getStatusVariant, WEATHER_OPTIONS } from "./types";
import { StatusBadge } from "@/components/ui/status-badge";
import { PhotoPreviewStack } from "./photo-preview-stack";

interface ReportsMobileCardsProps {
  reports: FieldReport[];
  onViewDetail: (report: FieldReport) => void;
  onViewGallery?: (report: FieldReport) => void;
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

export function ReportsMobileCards({ reports, onViewDetail, onViewGallery }: ReportsMobileCardsProps) {
  if (!reports.length) return null;

  return (
    <div className="flex flex-col gap-3">
      {reports.map((report) => {
        const weatherLabel = WEATHER_OPTIONS.find(o => o.value === report.weatherCondition)?.label || "Khác";

        return (
          <div
            key={report.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3 active:bg-slate-50 transition-colors"
            onClick={() => onViewDetail(report)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') onViewDetail(report); }}
          >
            {/* Top row: code + status */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-mono text-[13px] font-semibold truncate ${report.type === 'WEEKLY' ? 'text-purple-700' : 'text-blue-700'}`}>
                    {report.code.replace('BC-D-', 'D-').replace('BC-W-', 'W-')}
                  </p>
                  <StatusBadge variant="neutral" size="sm">
                    {report.type === 'WEEKLY' ? 'Tuần' : 'Ngày'}
                  </StatusBadge>
                </div>
                <p className="text-sm font-medium text-slate-900 mt-0.5 truncate">
                  {report.projectName}
                </p>
              </div>
              <StatusBadge variant={getStatusVariant(report.status)} size="sm">
                {getStatusLabel(report.status)}
              </StatusBadge>
            </div>

            {/* Info row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <span className="font-medium text-slate-700">{report.creatorName}</span>
                <span className="text-slate-400">· {report.creatorRole}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                {report.type === 'WEEKLY' ? `${report.weekStartDate} - ${report.weekEndDate}` : `${report.date} ${report.time}`}
              </span>
              {report.type === 'DAILY' && (
                <span className="inline-flex items-center gap-1">
                  <WeatherIcon weather={report.weatherCondition} />
                  {weatherLabel} {report.weatherTemperature ? `${report.weatherTemperature}°C` : ''}
                </span>
              )}
            </div>

            {/* Bottom row: photos + action */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <div onClick={(e) => { e.stopPropagation(); onViewGallery?.(report); }}>
                <PhotoPreviewStack count={report.photos.length} />
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onViewDetail(report); }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 px-2.5 py-1.5 rounded-md hover:bg-blue-50 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                Xem chi tiết
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
