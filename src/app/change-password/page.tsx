"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Building2, CheckCircle2, LockKeyhole } from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmation }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Không thể đổi mật khẩu.");
      router.replace(typeof result.redirectTo === "string" ? result.redirectTo : "/");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể đổi mật khẩu.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-lg shadow-slate-200/40 sm:p-9">
        <header className="mb-7">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Building2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Đổi mật khẩu lần đầu</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Tài khoản đang dùng mật khẩu tạm thời. Bạn cần đặt mật khẩu riêng trước khi truy cập hệ thống.
          </p>
        </header>

        {error ? (
          <div role="alert" className="mb-5 flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <PasswordField label="Mật khẩu tạm thời" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
          <PasswordField label="Mật khẩu mới" value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
          <PasswordField label="Xác nhận mật khẩu mới" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            Ít nhất 10 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.
          </div>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {pending ? "Đang cập nhật..." : "Đặt mật khẩu và tiếp tục"}
          </button>
        </form>
      </section>
    </main>
  );
}

function PasswordField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  const id = props.label.toLowerCase().replaceAll(" ", "-");
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700">{props.label}</label>
      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" />
        <input
          id={id}
          type="password"
          required
          value={props.value}
          autoComplete={props.autoComplete}
          onChange={(event) => props.onChange(event.target.value)}
          className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>
    </div>
  );
}
