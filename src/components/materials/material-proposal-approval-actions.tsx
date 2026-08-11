"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { decideMaterialProposal } from "@/lib/material-proposals/actions";
import { MaterialProposalApprovalStage } from "@prisma/client";
import { CheckCircle2, XCircle, RotateCcw, ShieldCheck, AlertCircle } from "lucide-react";

interface ApprovalActionsProps {
  proposalId: string;
  stage: MaterialProposalApprovalStage;
  canApproveStage: boolean;
  status: string;
}

export function MaterialProposalApprovalActions({
  proposalId,
  stage,
  canApproveStage,
  status,
}: ApprovalActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [note, setNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [error, setError] = useState("");

  if (status !== "SUBMITTED" || !canApproveStage) {
    return null;
  }

  const handleDecision = async (decision: "APPROVED" | "REJECTED") => {
    setError("");
    const idempotencyKey = `decide_${proposalId}_${stage}_${decision}_${Date.now()}`;

    startTransition(async () => {
      try {
        await decideMaterialProposal({
          proposalId,
          stage,
          decision,
          note: note.trim() || undefined,
          idempotencyKey,
        });
        setNote("");
        setShowNoteInput(false);
        setPendingDecision(null);
        router.refresh();
      } catch (err: any) {
        setError(err instanceof Error ? err.message : "Không thể thực hiện phê duyệt.");
      }
    });
  };

  const isTechnicalStage = stage === "TECHNICAL";
  const stageTitle = isTechnicalStage ? "Phê duyệt Kỹ thuật" : "Phê duyệt Ban Giám đốc";

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-200/60 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">BƯỚC XỬ LÝ: {stageTitle.toUpperCase()}</h3>
        </div>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
          Chờ bạn xử lý
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Note input field if requested */}
      {showNoteInput && (
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">
            Ghi chú ý kiến phê duyệt / lý do trả về (tùy chọn):
          </label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nhập ý kiến xử lý..."
            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs focus:border-blue-500 focus:outline-none shadow-xs"
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {!showNoteInput && (
          <button
            type="button"
            onClick={() => setShowNoteInput(true)}
            className="text-xs font-medium text-blue-700 hover:underline"
          >
            + Thêm ghi chú xử lý
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleDecision("REJECTED")}
            className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700 shadow-xs hover:bg-rose-50 disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Yêu cầu sửa / Từ chối
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={() => handleDecision("APPROVED")}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {isPending ? "Đang xử lý..." : isTechnicalStage ? "Duyệt kỹ thuật" : "Phê duyệt đề xuất"}
          </button>
        </div>
      </div>
    </div>
  );
}
