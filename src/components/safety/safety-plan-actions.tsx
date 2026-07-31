'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, CheckCircle, AlertTriangle, Trash2, PlusCircle } from 'lucide-react';

interface SafetyPlanActionsProps {
  plan: any;
  userId: string;
  isManagement: boolean;
}

export function SafetyPlanActions({ plan, userId, isManagement }: SafetyPlanActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await fetch(`/api/reports/safety/plans/${plan.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorId: userId }),
      });
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approve: boolean) => {
    setLoading(true);
    try {
      await fetch(`/api/reports/safety/plans/${plan.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorId: userId, approve, reason }),
      });
      setShowRejectModal(false);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReportFromPlan = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/safety/self-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorId: userId,
          sourcePlanId: plan.id,
          initFromPlan: true,
        }),
      });
      if (res.ok) {
        const report = await res.json();
        router.push(`/reports/safety/self-assessments/${report.id}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {plan.status === 'APPROVED' && (
          <button
            type="button"
            disabled={loading}
            onClick={handleCreateReportFromPlan}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            Lập Báo cáo tự đánh giá từ Kế hoạch này
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        {(plan.status === 'DRAFT' || plan.status === 'REVISION_REQUIRED') && (
          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
          >
            <Send className="h-4 w-4" />
            Trình duyệt Kế hoạch
          </button>
        )}

        {plan.status === 'PENDING_APPROVAL' && isManagement && (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowRejectModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
            >
              <AlertTriangle className="h-4 w-4" />
              Yêu cầu sửa
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleApprove(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all"
            >
              <CheckCircle className="h-4 w-4" />
              Duyệt kế hoạch
            </button>
          </>
        )}
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900">Yêu cầu chỉnh sửa Kế hoạch</h3>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập lý do yêu cầu chỉnh sửa..."
              className="w-full px-3 py-2 border rounded-xl text-xs"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs bg-slate-100"
              >
                Hủy
              </button>
              <button
                onClick={() => handleApprove(false)}
                className="px-3 py-1.5 rounded-lg text-xs bg-rose-600 text-white font-semibold"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
