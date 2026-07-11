import React from "react";
import { Info, MapPin } from "lucide-react";
import { type CreateReportFormData, WEATHER_OPTIONS } from "../types";
import { ContentCard } from "@/components/ui/enterprise";

export function GeneralInfoCard({
  form,
  updateField,
  activeProjects,
  errors
}: {
  form: CreateReportFormData;
  updateField: (field: string, value: any) => void;
  activeProjects: { id: string; name: string }[];
  errors: Record<string, string>;
}) {
  const inputClass = "w-full h-11 px-3 text-[14px] text-slate-900 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";

  const handleGetLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(6);
          const lng = position.coords.longitude.toFixed(6);
          updateField("gpsLocation", `${lat}, ${lng}`);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Không thể lấy vị trí GPS. Vui lòng kiểm tra quyền truy cập vị trí của trình duyệt.");
        }
      );
    } else {
      alert("Trình duyệt của bạn không hỗ trợ lấy vị trí GPS.");
    }
  };

  return (
    <ContentCard className="overflow-hidden p-0 sm:p-0">
      <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200 flex items-center gap-2.5">
        <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600">
          <Info className="w-4 h-4" />
        </div>
        <h3 className="font-bold text-slate-800 text-[15px]">Thông tin chung</h3>
      </div>
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold text-slate-700">Công trình <span className="text-red-500">*</span></label>
          <select
            value={form.projectId}
            onChange={e => updateField('projectId', e.target.value)}
            className={`${inputClass} bg-white ${errors.projectId ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : ''}`}
          >
            <option value="">-- Chọn công trình --</option>
            {activeProjects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {errors.projectId && <p className="text-[11px] text-red-500 font-medium">{errors.projectId}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-slate-700">Ngày lập báo cáo <span className="text-red-500">*</span></label>
            <input  autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
              type="date"
              value={form.date}
              onChange={e => updateField('date', e.target.value)}
              className={`${inputClass} bg-white ${errors.date ? 'border-red-400' : ''}`}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-slate-700">Giờ <span className="text-red-500">*</span></label>
            <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
              type="time"
              value={form.time}
              onChange={e => updateField('time', e.target.value)}
              className={`${inputClass} bg-white`}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-slate-700">Thời tiết</label>
            <select
              value={form.weatherCondition}
              onChange={e => updateField('weatherCondition', e.target.value)}
              className={`${inputClass} bg-white`}
            >
              {WEATHER_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-slate-700">Nhiệt độ (°C)</label>
            <input  autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
              type="number"
              placeholder="VD: 32"
              value={form.weatherTemperature || ''}
              onChange={e => updateField('weatherTemperature', e.target.value ? Number(e.target.value) : undefined)}
              className={`${inputClass} bg-white`}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold text-slate-700">Người lập / Cán bộ</label>
          <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
            type="text"
            value={form.creatorName}
            onChange={e => updateField('creatorName', e.target.value)}
            className={`${inputClass} bg-slate-100 text-slate-600`}
            readOnly
          />
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-slate-400" /> Vị trí GPS hiện trường
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
              type="text"
              placeholder="VD: 21.0285, 105.8542"
              value={form.gpsLocation || ''}
              onChange={(e) => updateField("gpsLocation", e.target.value)}
              className={`${inputClass} bg-white flex-1`}
            />
            <button
              type="button"
              onClick={handleGetLocation}
              className="h-11 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-bold rounded-xl border border-slate-200 transition-colors shrink-0 flex items-center justify-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              Lấy vị trí hiện tại
            </button>
          </div>
        </div>
      </div>
    </ContentCard>
  );
}
