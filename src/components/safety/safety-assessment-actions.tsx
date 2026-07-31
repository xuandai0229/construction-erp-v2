'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, CheckCircle, AlertTriangle } from 'lucide-react';

interface SafetyAssessmentActionsProps {
  report: any;
  userId: string;
  isManagement: boolean;
}

export function SafetyAssessmentActions({ report, userId, isManagement }: SafetyAssessmentActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await fetch(`/api/reports/safety/self-assessments/${report.id}/submit`, {
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
      await fetch(`/api/reports/safety/self-assessments/${report.id}/approve`, {
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

  return (
    <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
      {(report.status === 'DRAFT' || report.status === 'REVISION_REQUIRED') && (
        <button
          type="button"
          disabled={loading}
          onClick={handleSubmit}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition-all"
        >
          <Send className="h-4 w-4" />
          Trình duyệt Báo cáo
        </button>
      )}

      {report.status === 'PENDING_APPROVAL' && isManagement && (
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
            Duyệt báo cáo
          </button>
        </>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900">Yêu cầu chỉnh sửa Báo cáo</h3>
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
