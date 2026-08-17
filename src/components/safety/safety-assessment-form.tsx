'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, Send, Sparkles } from 'lucide-react';
import { ProjectCombobox } from '@/components/ui/project-combobox';

interface SafetyAssessmentFormProps {
  projects: Array<{ id: string; name: string; code: string }>;
  approvedPlans: Array<{ id: string; documentNumber: string | null; title: string; periodStart: Date; periodEnd: Date }>;
  userId: string;
}

export function SafetyAssessmentForm({ projects, approvedPlans, userId }: SafetyAssessmentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sourcePlanId, setSourcePlanId] = useState('');
  const [title, setTitle] = useState('BÁO CÁO TỰ ĐÁNH GIÁ KẾT QUẢ KIỂM TRA ATLĐ, PCCC, VSMT');
  const [createdDate, setCreatedDate] = useState(new Date().toISOString().split('T')[0]);

  const today = new Date();
  const periodStartInit = new Date(today);
  periodStartInit.setDate(today.getDate() - today.getDay() + 1);
  const periodEndInit = new Date(periodStartInit);
  periodEndInit.setDate(periodStartInit.getDate() + 6);

  const [periodStart, setPeriodStart] = useState(periodStartInit.toISOString().split('T')[0]);
  const [periodEnd, setPeriodEnd] = useState(periodEndInit.toISOString().split('T')[0]);

  const [previousWeekRemediation, setPreviousWeekRemediation] = useState('Đã khắc phục xong các tồn tại vệ sinh môi trường và bảo hộ lao động tuần trước.');
  const [reinspectionConfirmation, setReinspectionConfirmation] = useState('Xác nhận đã kiểm tra lại và đạt yêu cầu an toàn.');
  const [managementRecommendation, setManagementRecommendation] = useState('Đề nghị Ban Giám đốc tiếp tục hỗ trợ cấp phát đầy đủ trang thiết bị bảo hộ lao động.');
  const [otherOpinion, setOtherOpinion] = useState('');

  const [entries, setEntries] = useState([
    {
      inspectionDate: periodStartInit.toISOString().split('T')[0],
      shift: 'MORNING' as const,
      projectId: projects[0]?.id || '',
      inspectionContent: 'Kiểm tra bảo hộ cá nhân, dây đai an toàn, giàn giáo, lối đi lại.',
      assessment: 'Đạt yêu cầu an toàn',
      recommendation: 'Duy trì công tác vệ sinh hàng ngày',
      implementationResult: 'Đã hoàn thành tốt',
    },
  ]);

  const handleSourcePlanChange = async (planId: string) => {
    setSourcePlanId(planId);
    if (!planId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/reports/safety/plans/${planId}`);
      if (res.ok) {
        const plan = await res.json();
        setPeriodStart(new Date(plan.periodStart).toISOString().split('T')[0]);
        setPeriodEnd(new Date(plan.periodEnd).toISOString().split('T')[0]);
        if (plan.entries && plan.entries.length > 0) {
          setEntries(
            plan.entries.map((e: any) => ({
              inspectionDate: new Date(e.inspectionDate).toISOString().split('T')[0],
              shift: e.shift,
              projectId: e.projectId,
              inspectionContent: e.inspectionContent,
              assessment: 'Đạt yêu cầu an toàn',
              recommendation: 'Duy trì thực hiện đúng quy định',
              implementationResult: 'Đã chấp hành đầy đủ',
            }))
          );
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addEntry = () => {
    setEntries([
      ...entries,
      {
        inspectionDate: periodStart,
        shift: 'MORNING',
        projectId: projects[0]?.id || '',
        inspectionContent: 'Kiểm tra hệ thống điện thi công và lán trại.',
        assessment: 'Đạt yêu cầu',
        recommendation: 'Treo biển cảnh báo nguy hiểm',
        implementationResult: 'Đã xử lý xong',
      },
    ]);
  };

  const removeEntry = (index: number) => {
    if (entries.length <= 1) return;
    setEntries(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, key: string, value: any) => {
    const updated = [...entries];
    (updated[index] as any)[key] = value;
    setEntries(updated);
  };

  const handleSubmit = async (submitForApproval: boolean) => {
    setLoading(true);
    setError(null);

    try {
      const payload = {
        actorId: userId,
        sourcePlanId: sourcePlanId || undefined,
        title,
        createdDate,
        periodStart,
        periodEnd,
        previousWeekRemediation,
        reinspectionConfirmation,
        managementRecommendation,
        otherOpinion,
        entries,
      };

      const res = await fetch('/api/reports/safety/self-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Lỗi khi tạo báo cáo tự đánh giá');
      }

      const report = await res.json();

      if (submitForApproval) {
        await fetch(`/api/reports/safety/self-assessments/${report.id}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actorId: userId }),
        });
      }

      router.push(`/reports/safety/self-assessments/${report.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Kế thừa từ Kế hoạch đã duyệt */}
      <div className="rounded-2xl border border-blue-200/80 bg-blue-50/50 p-5 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Nạp dữ liệu từ Kế hoạch tuần đã duyệt</h4>
            <p className="text-[11px] text-slate-600">Chọn kế hoạch để tự động điền danh sách công trình và nội dung kiểm tra.</p>
          </div>
        </div>
        <select
          value={sourcePlanId}
          onChange={(e) => handleSourcePlanChange(e.target.value)}
          className="px-3 py-2 rounded-xl border border-blue-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none"
        >
          <option value="">-- Không chọn (Tự nhập) --</option>
          {approvedPlans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.documentNumber || 'Kế hoạch'} - {p.title}
            </option>
          ))}
        </select>
      </div>

      {/* Thông tin chung */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
          1. Thông tin chung báo cáo
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tiêu đề báo cáo</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày lập văn bản</label>
            <input
              type="date"
              value={createdDate}
              onChange={(e) => setCreatedDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Từ ngày</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Đến ngày</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Theo dõi khắc phục các yêu cầu tuần trước còn tồn đọng</label>
            <textarea
              rows={2}
              value={previousWeekRemediation}
              onChange={(e) => setPreviousWeekRemediation(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kiến nghị đề xuất Ban Giám đốc</label>
            <textarea
              rows={2}
              value={managementRecommendation}
              onChange={(e) => setManagementRecommendation(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Kết quả kiểm tra theo ngày */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900">
            2. Kết quả kiểm tra công trình theo ngày (Mẫu 05 cột)
          </h3>
          <button
            type="button"
            onClick={addEntry}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm kết quả kiểm tra
          </button>
        </div>

        <div className="space-y-4">
          {entries.map((entry, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-slate-200/90 bg-amber-50/20 space-y-3 relative">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-amber-800">Dòng kết quả #{idx + 1}</span>
                {entries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEntry(idx)}
                    className="p-1 rounded-md text-rose-500 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ngày kiểm tra</label>
                  <input
                    type="date"
                    value={entry.inspectionDate}
                    onChange={(e) => updateEntry(idx, 'inspectionDate', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Buổi</label>
                  <select
                    value={entry.shift}
                    onChange={(e) => updateEntry(idx, 'shift', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none"
                  >
                    <option value="MORNING">Sáng</option>
                    <option value="AFTERNOON">Chiều</option>
                    <option value="EVENING">Tối</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Công trình</label>
                  <ProjectCombobox
                    value={entry.projectId}
                    projects={projects}
                    onValueChange={(id) => updateEntry(idx, 'projectId', id)}
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nội dung kiểm tra</label>
                  <input
                    type="text"
                    value={entry.inspectionContent}
                    onChange={(e) => updateEntry(idx, 'inspectionContent', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Đánh giá công trình</label>
                  <input
                    type="text"
                    value={entry.assessment}
                    onChange={(e) => updateEntry(idx, 'assessment', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kiến nghị yêu cầu</label>
                  <input
                    type="text"
                    value={entry.recommendation}
                    onChange={(e) => updateEntry(idx, 'recommendation', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kết quả thực hiện</label>
                  <input
                    type="text"
                    value={entry.implementationResult}
                    onChange={(e) => updateEntry(idx, 'implementationResult', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <button
          type="button"
          disabled={loading}
          onClick={() => handleSubmit(false)}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          <Save className="h-4 w-4" />
          Lưu bản nháp
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => handleSubmit(true)}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition-all hover:shadow-md"
        >
          <Send className="h-4 w-4" />
          {loading ? 'Đang lưu...' : 'Lưu và Trình duyệt'}
        </button>
      </div>
    </div>
  );
}
