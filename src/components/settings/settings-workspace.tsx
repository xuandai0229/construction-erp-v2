"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, FileText, History, Save, X } from "lucide-react";
import { useToast } from "@/components/ui/toast-context";
import { cn } from "@/lib/utils";
import {
  companyProfileSchema,
  documentPolicySchema,
  type CompanyProfileInput,
  type DocumentPolicyInput,
} from "@/lib/settings/settings-validation";
import type { SettingsAccess } from "@/lib/settings/settings-permissions";
import type { SettingsSnapshot } from "@/lib/settings/system-settings";
import { updateCompanyProfile, updateDocumentPolicies } from "@/app/(dashboard)/settings/actions";
import { getSettingsFieldLabel, parseSettingsAuditPayload } from "@/lib/settings/settings-audit";

type SectionId = "company" | "documents" | "administration";
type FieldErrors = Record<string, string | undefined>;

type RecentChange = {
  id: string;
  action: string;
  beforeData: string | null;
  afterData: string | null;
  createdAt: string;
  actorName: string;
  actorRole: string | null;
};

const SECTION_META: Record<SectionId, { label: string; description: string; icon: typeof Building2 }> = {
  company: { label: "Thông tin doanh nghiệp", description: "Thông tin nhận diện dùng chung trên các đầu ra có hỗ trợ.", icon: Building2 },
  documents: { label: "Chính sách tài liệu", description: "Áp dụng cho mọi tệp được tải lên hệ thống.", icon: FileText },
  administration: { label: "Quản trị hệ thống", description: "Nhật ký thay đổi cấu hình gần đây.", icon: History },
};

function isEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function formatSavedAt(value: string | Date | null, actor: { name: string } | null) {
  if (!value) return "Chưa có cấu hình nào được lưu.";
  const date = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  return `Đã lưu lúc ${date}${actor ? ` bởi ${actor.name}` : ""}.`;
}

function decodeChange(change: RecentChange) {
  const payload = parseSettingsAuditPayload(change.afterData);
  if (payload?.section) {
    const section = payload.section === "documents" ? "Chính sách tài liệu" : "Thông tin doanh nghiệp";
    const fields = (payload.changedFields ?? []).map(getSettingsFieldLabel);
    return { section, fields: fields.length ? `${fields.length} nội dung đã thay đổi: ${fields.join(", ")}` : "Khởi tạo cấu hình" };
  }
  try {
    const value = JSON.parse(change.afterData || "{}");
    const section = value.section === "documents" ? "Chính sách tài liệu" : "Thông tin doanh nghiệp";
    const fields = Array.isArray(value.changedFields) ? value.changedFields : [];
    return { section, fields: fields.join(", ") || "Khởi tạo cấu hình" };
  } catch {
    return { section: "Cài đặt hệ thống", fields: "Đã cập nhật cấu hình" };
  }
}

export function SettingsWorkspace({
  initialSettings,
  initialSection,
  access,
  recentChanges,
}: {
  initialSettings: SettingsSnapshot;
  initialSection: SectionId;
  access: SettingsAccess;
  recentChanges: RecentChange[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [activeSection, setActiveSection] = useState<SectionId>(initialSection);
  const [snapshot, setSnapshot] = useState(initialSettings);
  const [company, setCompany] = useState<CompanyProfileInput>(initialSettings.company);
  const [documents, setDocuments] = useState<DocumentPolicyInput>(initialSettings.documents);
  const [companyErrors, setCompanyErrors] = useState<FieldErrors>({});
  const [documentErrors, setDocumentErrors] = useState<FieldErrors>({});
  const [isPending, startTransition] = useTransition();

  const sections = useMemo(() => {
    const available: SectionId[] = [];
    if (access.canViewCompany) available.push("company");
    if (access.canViewDocuments) available.push("documents");
    if (access.canViewAdministration) available.push("administration");
    return available;
  }, [access]);
  const companyDirty = !isEqual(company, snapshot.company);
  const documentsDirty = !isEqual(documents, snapshot.documents);
  const isCompanyIncomplete = !company.companyName.trim();

  const selectSection = (section: SectionId) => {
    setActiveSection(section);
    router.replace(`/settings?section=${section}`);
  };

  const saveCompany = () => {
    const parsed = companyProfileSchema.safeParse(company);
    if (!parsed.success) {
      setCompanyErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
      return;
    }
    setCompanyErrors({});
    startTransition(async () => {
      try {
        const result = await updateCompanyProfile({ ...parsed.data, expectedVersion: snapshot.version });
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        setSnapshot(result.snapshot);
        setCompany(result.snapshot.company);
        toast.success("Đã lưu thông tin doanh nghiệp.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể lưu thông tin doanh nghiệp.");
      }
    });
  };

  const saveDocuments = () => {
    const parsed = documentPolicySchema.safeParse(documents);
    if (!parsed.success) {
      setDocumentErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
      return;
    }
    setDocumentErrors({});
    startTransition(async () => {
      try {
        const result = await updateDocumentPolicies({ ...parsed.data, expectedVersion: snapshot.version });
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        setSnapshot(result.snapshot);
        setDocuments(result.snapshot.documents);
        toast.success("Đã lưu chính sách tài liệu. Chính sách mới áp dụng cho các lần tải lên tiếp theo.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Không thể lưu chính sách tài liệu.");
      }
    });
  };

  return (
    <div className="app-page mx-auto max-w-[1400px] space-y-6 pb-24 lg:pb-8">
      <header className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Cài đặt hệ thống</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Quản lý thông tin doanh nghiệp và các chính sách dùng chung đang được hệ thống áp dụng.</p>
        <p className="mt-3 break-words text-xs font-medium text-slate-500">{formatSavedAt(snapshot.updatedAt, snapshot.updatedBy)}</p>
      </header>

      <div className="lg:grid lg:grid-cols-[252px_minmax(0,1fr)] lg:gap-8">
        <aside className="hidden lg:block">
          <nav aria-label="Nhóm cài đặt" className="sticky top-20 space-y-1 border-l border-slate-200 pl-3">
            {sections.map((section) => {
              const meta = SECTION_META[section];
              const Icon = meta.icon;
              const active = activeSection === section;
              return (
                <button
                  key={section}
                  type="button"
                  onClick={() => selectSection(section)}
                  className={cn("flex w-full items-start gap-3 rounded-r-xl px-3 py-3 text-left transition", active ? "bg-blue-50 text-blue-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950")}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    <span className="block text-sm font-semibold">{meta.label}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">{meta.description}</span>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="lg:hidden">
          <label htmlFor="settings-section" className="sr-only">Chọn nhóm cài đặt</label>
          <select id="settings-section" value={activeSection} onChange={(event) => selectSection(event.target.value as SectionId)} className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
            {sections.map((section) => <option key={section} value={section}>{SECTION_META[section].label}</option>)}
          </select>
        </div>

        <main className="mt-5 min-w-0 lg:mt-0">
          {activeSection === "company" && (
            <section aria-labelledby="company-heading" className="max-w-3xl">
              <SectionHeading title="Thông tin doanh nghiệp" description="Các đầu ra đã tích hợp đọc thông tin này từ cùng một nguồn cấu hình." />
              {isCompanyIncomplete && <div role="status" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">Thông tin doanh nghiệp chưa hoàn tất. Hãy nhập tên doanh nghiệp trước khi lưu để tránh dùng dữ liệu nhận diện không chính xác.</div>}
              {access.canManageCompany ? (
                <form onSubmit={(event) => { event.preventDefault(); saveCompany(); }} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <TextField label="Tên doanh nghiệp" name="companyName" value={company.companyName} error={companyErrors.companyName} required onChange={(value) => setCompany((current) => ({ ...current, companyName: value }))} />
                    <TextField label="Mã số thuế" name="taxCode" value={company.taxCode} error={companyErrors.taxCode} onChange={(value) => setCompany((current) => ({ ...current, taxCode: value }))} />
                  </div>
                  <TextField label="Hotline nội bộ" name="hotline" value={company.hotline} error={companyErrors.hotline} onChange={(value) => setCompany((current) => ({ ...current, hotline: value }))} />
                  <SectionActions dirty={companyDirty} pending={isPending} onCancel={() => { setCompany(snapshot.company); setCompanyErrors({}); }} />
                </form>
              ) : <ReadOnlyFields fields={[['Tên doanh nghiệp', company.companyName], ['Mã số thuế', company.taxCode], ['Hotline nội bộ', company.hotline]]} />}
            </section>
          )}

          {activeSection === "documents" && (
            <section aria-labelledby="documents-heading" className="max-w-3xl">
              <SectionHeading title="Chính sách tài liệu" description="Áp dụng cho tất cả tệp được tải lên hệ thống từ thời điểm lưu thay đổi." />
              {access.canManageDocuments ? (
                <form onSubmit={(event) => { event.preventDefault(); saveDocuments(); }} className="space-y-5">
                  <NumberField label="Dung lượng tải lên tối đa" name="maxUploadSizeMb" value={documents.maxUploadSizeMb} error={documentErrors.maxUploadSizeMb} suffix="MB" onChange={(value) => setDocuments((current) => ({ ...current, maxUploadSizeMb: value }))} />
                  <TextField label="Định dạng tệp được phép" name="allowedExtensions" value={documents.allowedExtensions} error={documentErrors.allowedExtensions} description="Nhập các đuôi tệp, cách nhau bằng dấu phẩy. Ví dụ: pdf, docx, xlsx." onChange={(value) => setDocuments((current) => ({ ...current, allowedExtensions: value }))} />
                  <SwitchField label="Bắt buộc chuẩn đặt tên hồ sơ" description="Từ chối các tên tệp quá ngắn, quá chung chung hoặc có dấu hiệu đường dẫn không hợp lệ." checked={documents.enforceNamingConvention} onChange={(value) => setDocuments((current) => ({ ...current, enforceNamingConvention: value }))} />
                  <SwitchField label="Tự động tạo phiên bản" description="Khi tải tệp trùng tên trong cùng thư mục và công trình, hệ thống lưu thành phiên bản mới." checked={documents.autoVersioning} onChange={(value) => setDocuments((current) => ({ ...current, autoVersioning: value }))} />
                  <SectionActions dirty={documentsDirty} pending={isPending} onCancel={() => { setDocuments(snapshot.documents); setDocumentErrors({}); }} />
                </form>
              ) : <ReadOnlyFields fields={[['Dung lượng tải lên tối đa', `${documents.maxUploadSizeMb} MB`], ['Định dạng tệp được phép', documents.allowedExtensions], ['Chuẩn đặt tên hồ sơ', documents.enforceNamingConvention ? 'Có áp dụng' : 'Không áp dụng'], ['Tự động tạo phiên bản', documents.autoVersioning ? 'Có áp dụng' : 'Không áp dụng']]} />}
            </section>
          )}

          {activeSection === "administration" && access.canViewAdministration && (
            <section aria-labelledby="administration-heading" className="max-w-4xl">
              <SectionHeading title="Quản trị hệ thống" description="Theo dõi các thay đổi cấu hình gần đây từ dữ liệu nhật ký hệ thống." />
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                {recentChanges.length === 0 ? <p className="px-5 py-8 text-sm text-slate-600">Chưa có thay đổi cấu hình nào được ghi nhận.</p> : recentChanges.map((change) => {
                  const detail = decodeChange(change);
                  return <article key={change.id} className="border-b border-slate-100 px-5 py-4 last:border-b-0"><div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><h3 className="text-sm font-semibold text-slate-900">{detail.section}</h3><time className="text-xs text-slate-500">{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(change.createdAt))}</time></div><p className="mt-1 text-sm text-slate-600">{detail.fields}</p><p className="mt-2 text-xs text-slate-500">Người thực hiện: {change.actorName}{change.actorRole ? ` · ${change.actorRole}` : ""}</p></article>;
                })}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return <div className="mb-6"><h2 className="text-xl font-bold tracking-tight text-slate-950">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></div>;
}

function SectionActions({ dirty, pending, onCancel }: { dirty: boolean; pending: boolean; onCancel: () => void }) {
  return <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end"><button type="button" disabled={!dirty || pending} onClick={onCancel} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><X className="h-4 w-4" />Hủy thay đổi chưa lưu</button><button type="submit" disabled={!dirty || pending} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"><Save className={cn("h-4 w-4", pending && "animate-spin")} />{pending ? "Đang lưu..." : "Lưu thay đổi"}</button></div>;
}

function TextField({ label, name, value, error, description, required, onChange }: { label: string; name: string; value: string; error?: string; description?: string; required?: boolean; onChange: (value: string) => void }) {
  const descriptionId = `${name}-description`;
  const errorId = `${name}-error`;
  return <div className="space-y-2"><label htmlFor={name} className="block text-sm font-semibold text-slate-800">{label}{required && <span className="ml-1 text-rose-700" aria-hidden="true">*</span>}</label>{description && <p id={descriptionId} className="text-xs leading-5 text-slate-500">{description}</p>}<input id={name} name={name} type="text" value={value} required={required} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={cn(description && descriptionId, error && errorId) || undefined} className={cn("h-11 w-full rounded-lg border bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-2", error ? "border-rose-500 focus:border-rose-600 focus:ring-rose-100" : "border-slate-300 focus:border-blue-600 focus:ring-blue-100")} />{error && <p id={errorId} className="text-xs font-medium text-rose-700">{error}</p>}</div>;
}

function NumberField({ label, name, value, error, suffix, onChange }: { label: string; name: string; value: number; error?: string; suffix: string; onChange: (value: number) => void }) {
  const errorId = `${name}-error`;
  return <div className="max-w-xs space-y-2"><label htmlFor={name} className="block text-sm font-semibold text-slate-800">{label}</label><div className="relative"><input id={name} name={name} type="number" min={1} value={value} onChange={(event) => onChange(Number(event.target.value))} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} className={cn("h-11 w-full rounded-lg border bg-white px-3 pr-12 text-sm text-slate-950 outline-none transition focus:ring-2", error ? "border-rose-500 focus:border-rose-600 focus:ring-rose-100" : "border-slate-300 focus:border-blue-600 focus:ring-blue-100")} /><span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-500">{suffix}</span></div>{error && <p id={errorId} className="text-xs font-medium text-rose-700">{error}</p>}</div>;
}

function SwitchField({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-start justify-between gap-5 rounded-xl border border-slate-200 p-4"><div><h3 className="text-sm font-semibold text-slate-900">{label}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{description}</p></div><button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cn("relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2", checked ? "bg-blue-700" : "bg-slate-300")}><span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition", checked ? "left-5" : "left-0.5")} /></button></div>;
}

function ReadOnlyFields({ fields }: { fields: [string, string][] }) {
  return <dl className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white px-5">{fields.map(([label, value]) => <div key={label} className="grid gap-1 py-4 sm:grid-cols-[minmax(0,180px)_1fr] sm:gap-6"><dt className="text-sm font-medium text-slate-500">{label}</dt><dd className="text-sm text-slate-900">{value || "Chưa thiết lập"}</dd></div>)}</dl>;
}
