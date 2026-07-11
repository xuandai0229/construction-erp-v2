import React from "react";
import { Users, Truck, Wrench, ShieldAlert, FileWarning, Lightbulb } from "lucide-react";
import { type CreateReportFormData } from "../types";
import { ContentCard } from "@/components/ui/enterprise";

export function ResourcesAndQuality({ form, updateField }: {
  form: CreateReportFormData;
  updateField: (field: string, value: any) => void;
}) {
  const textareaClass = "w-full min-h-[130px] p-3 text-[14px] text-slate-900 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 resize-y leading-relaxed";

  return (
    <div className="space-y-6">
      <ContentCard className="overflow-hidden p-0 sm:p-0">

        <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200 flex items-center gap-2.5">
          <div className="bg-amber-100 p-1.5 rounded-lg text-amber-600">
            <Users className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-slate-800 text-[15px]">Nguồn lực sử dụng</h3>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-400" /> Nhân công / Máy móc
            </label>
            <textarea  autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
              value={form.labor}
              onChange={e => updateField('labor', e.target.value)}
              className={textareaClass}
              placeholder="VD: 12 công nhân, 1 chỉ huy, 2 máy trộn, 1 cẩu tháp..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-slate-400" /> Vật tư sử dụng
            </label>
            <textarea autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
              value={form.materials}
              onChange={e => updateField('materials', e.target.value)}
              className={textareaClass}
              placeholder="VD: Thép D16 1.2 tấn, xi măng PCB40 40 bao..."
            />
          </div>
        </div>
      </ContentCard>

      <ContentCard className="overflow-hidden p-0 sm:p-0">
        <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200 flex items-center gap-2.5 scroll-mt-24">
          <div className="bg-red-100 p-1.5 rounded-lg text-red-600">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-slate-800 text-[15px]">Chất lượng / Vướng mắc / Kiến nghị</h3>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-2 mb-4">
            {["Không có vướng mắc", "Cần bổ sung vật tư", "Chờ nghiệm thu", "Cần hỗ trợ kỹ thuật"].map(chip => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  const current = form.issues ? form.issues + "\n" : "";
                  updateField('issues', current + chip);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[12px] font-medium px-3 py-1.5 rounded-full transition-colors border border-slate-200"
              >
                + {chip}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2 md:col-span-2">
              <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-slate-400" /> Chất lượng thi công
              </label>
              <textarea  autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
                value={form.quality}
                onChange={e => updateField('quality', e.target.value)}
                className={textareaClass}
                placeholder="Đánh giá chất lượng công việc hôm nay..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">
                <FileWarning className="w-4 h-4 text-slate-400" /> Vướng mắc
              </label>
              <textarea autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
                value={form.issues}
                onChange={e => updateField('issues', e.target.value)}
                className={textareaClass}
                placeholder="Các vấn đề phát sinh, sự cố..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-slate-400" /> Kiến nghị / Đề xuất
              </label>
              <textarea autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
                value={form.recommendations}
                onChange={e => updateField('recommendations', e.target.value)}
                className={textareaClass}
                placeholder="Đề xuất xử lý, yêu cầu hỗ trợ..."
              />
            </div>
          </div>
        </div>
      </ContentCard>
    </div>
  );
}
