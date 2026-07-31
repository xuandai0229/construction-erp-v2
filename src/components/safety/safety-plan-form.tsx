'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Plus, Trash2, Save, Send } from 'lucide-react';

interface SafetyPlanFormProps {
  projects: Array<{ id: string; name: string; code: string }>;
  userId: string;
}

export function SafetyPlanForm({ projects, userId }: SafetyPlanFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('KẾ HOẠCH KIỂM TRA ATLĐ, PCCC, VSMT CÔNG TRÌNH HÀNG TUẦN');
  const [createdDate, setCreatedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Default period: Next Monday to Sunday
  const today = new Date();
  const periodStartInit = new Date(today);
  periodStartInit.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7));
  const periodEndInit = new Date(periodStartInit);
  periodEndInit.setDate(periodStartInit.getDate() + 6);

  const [periodStart, setPeriodStart] = useState(periodStartInit.toISOString().split('T')[0]);
  const [periodEnd, setPeriodEnd] = useState(periodEndInit.toISOString().split('T')[0]);

  const [recipientsText, setRecipientsText] = useState('Ban lãnh đạo công ty, Phòng kỹ thuật, Ban chỉ huy các công trình');
  const [purpose, setPurpose] = useState('Triển khai thực hiện quyết định giao nhiệm vụ của Ban giám đốc Công ty về việc đánh giá kiểm tra công tác ATLĐ, PCCC, VSMT trong quá trình thi công thực tế của các Ban chỉ huy công trường.');
  const [note, setNote] = useState('');

  // Days of week default entries
  const defaultEntries = [
    {
      inspectionDate: periodStartInit.toISOString().split('T')[0],
      shift: 'MORNING' as const,
      projectId: projects[0]?.id || '',
      constructionType: 'BUILDING' as const,
      inspectionContent: 'Kiểm tra hồ sơ pháp lý, sổ cấp phát bảo hộ, trang thiết bị bảo hộ tại hiện trường.',
      trainingContent: 'Huấn luyện an toàn 30 phút cho công nhân tổ đội.',
    },
  ];

  const [entries, setEntries] = useState(defaultEntries);

  const addEntry = () => {
    setEntries([
      ...entries,
      {
        inspectionDate: periodStart,
        shift: 'MORNING',
        projectId: projects[0]?.id || '',
        constructionType: 'BUILDING',
        inspectionContent: 'Kiểm tra hệ thống điện thi công, tủ điện, lán trại công nhân.',
        trainingContent: '',
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
        title,
        createdDate,
        periodStart,
        periodEnd,
        recipients: recipientsText.split(',').map((s) => s.trim()).filter(Boolean),
        purpose,
        note,
        entries,
      };

      const res = await fetch('/api/reports/safety/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Lỗi khi tạo kế hoạch');
      }

      const plan = await res.json();

      if (submitForApproval) {
        await fetch(`/api/reports/safety/plans/${plan.id}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actorId: userId }),
        });
      }

      router.push(`/reports/safety/plans/${plan.id}`);
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

      {/* Thông tin chung */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
          1. Thông tin chung kế hoạch
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tiêu đề kế hoạch</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày lập văn bản</label>
            <input
              type="date"
              value={createdDate}
              onChange={(e) => setCreatedDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Từ ngày</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Đến ngày</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nơi nhận</label>
            <input
              type="text"
              value={recipientsText}
              onChange={(e) => setRecipientsText(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mục đích kiểm tra</label>
            <textarea
              rows={2}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Chi tiết lịch kiểm tra theo ngày/buổi */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900">
            2. Chi tiết lịch kiểm tra công trình (Mẫu 04 cột)
          </h3>
          <button
            type="button"
            onClick={addEntry}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm buổi kiểm tra
          </button>
        </div>

        <div className="space-y-4">
          {entries.map((entry, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-3 relative">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-blue-700">Buổi #{idx + 1}</span>
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
                  <select
                    value={entry.projectId}
                    onChange={(e) => updateEntry(idx, 'projectId', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nội dung kiểm tra</label>
                  <textarea
                    rows={2}
                    value={entry.inspectionContent}
                    onChange={(e) => updateEntry(idx, 'inspectionContent', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nội dung huấn luyện an toàn (nếu có)</label>
                  <input
                    type="text"
                    value={entry.trainingContent}
                    onChange={(e) => updateEntry(idx, 'trainingContent', e.target.value)}
                    placeholder="Ví dụ: Huấn luyện an toàn điện, làm việc trên cao 30 phút"
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
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all hover:shadow-md"
        >
          <Send className="h-4 w-4" />
          {loading ? 'Đang lưu...' : 'Lưu và Trình duyệt'}
        </button>
      </div>
    </div>
  );
}
