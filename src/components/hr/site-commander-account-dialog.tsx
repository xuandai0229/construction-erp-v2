"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Copy, KeyRound, X } from "lucide-react";
import { provisionSiteCommanderAccountAction } from "@/app/hr/employees/actions/employee-actions";
import type { EmployeeListDTO } from "@/lib/hr/hr-projection";

export function SiteCommanderAccountDialog(props: {
  employee: EmployeeListDTO | null;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    email: string | null;
    username: string | null;
    temporaryPassword?: string;
    membershipsCreated: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!props.employee) return null;

  function provision() {
    if (!props.employee || pending) return;
    setError("");
    startTransition(async () => {
      const response = await provisionSiteCommanderAccountAction(props.employee!.id);
      if (!response.success) {
        setError(response.error);
        return;
      }
      setResult(response.result);
      props.onCompleted();
    });
  }

  async function copyTemporaryPassword() {
    if (!result?.temporaryPassword) return;
    await navigator.clipboard.writeText(result.temporaryPassword);
    setCopied(true);
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/40 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="provision-account-title" className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id="provision-account-title" className="text-base font-bold text-slate-950">Tạo tài khoản Chỉ huy trưởng</h2>
            <p className="mt-1 text-sm text-slate-600">{props.employee.fullName} · {props.employee.code}</p>
          </div>
          <button type="button" onClick={props.onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Đóng">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="space-y-4 px-5 py-5">
          {result ? (
            <>
              <div className="flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Tài khoản đã được liên kết với {props.employee.siteCommanderProjectCount} công trình Chỉ huy trưởng.</span>
              </div>
              <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 rounded-lg border border-slate-200 p-4 text-sm">
                <dt className="text-slate-500">Email</dt><dd className="font-semibold text-slate-950">{result.email || "Chưa có"}</dd>
                <dt className="text-slate-500">Tên đăng nhập</dt><dd className="font-mono font-semibold text-slate-950">{result.username || "Không có"}</dd>
                <dt className="text-slate-500">Quyền công trình mới</dt><dd className="font-semibold text-slate-950">{result.membershipsCreated}</dd>
                {result.temporaryPassword ? (
                  <>
                    <dt className="text-slate-500">Mật khẩu tạm</dt>
                    <dd className="flex items-center gap-2">
                      <code className="break-all rounded bg-slate-100 px-2 py-1 font-semibold text-slate-950">{result.temporaryPassword}</code>
                      <button type="button" onClick={copyTemporaryPassword} className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50" aria-label="Sao chép mật khẩu tạm">
                        <Copy className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </dd>
                  </>
                ) : null}
              </dl>
              <p className="text-xs leading-5 text-amber-800">
                Mật khẩu tạm chỉ hiển thị trong phiên này. Người dùng bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên.
              </p>
              {copied ? <p className="text-xs font-semibold text-emerald-700">Đã sao chép mật khẩu tạm.</p> : null}
            </>
          ) : (
            <>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                Hệ thống chỉ thực hiện khi hồ sơ nhân sự có phân công Chỉ huy trưởng đang hiệu lực, chưa có tài khoản trùng và không có xung đột tại công trình.
              </div>
              <dl className="grid grid-cols-[9rem_1fr] gap-x-3 gap-y-2 text-sm">
                <dt className="text-slate-500">Email nguồn</dt><dd className="font-semibold text-slate-900">{props.employee.personalEmail || "Thiếu thông tin"}</dd>
                <dt className="text-slate-500">Công trình phụ trách</dt><dd className="font-semibold text-slate-900">{props.employee.siteCommanderProjectCount}</dd>
                <dt className="text-slate-500">Vai trò</dt><dd className="font-semibold text-slate-900">Chỉ huy trưởng</dd>
              </dl>
            </>
          )}

          {error ? (
            <div role="alert" className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : null}
        </div>

        <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button type="button" onClick={props.onClose} className="h-9 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            {result ? "Đóng" : "Hủy"}
          </button>
          {!result ? (
            <button
              type="button"
              onClick={provision}
              disabled={pending}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              {pending ? "Đang kiểm tra..." : "Tạo tài khoản"}
            </button>
          ) : null}
        </footer>
      </section>
    </div>
  );
}
