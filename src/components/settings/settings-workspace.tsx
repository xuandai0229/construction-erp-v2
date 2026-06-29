"use client";

import { useMemo, useState, useTransition } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Building2,
  CheckCircle2,
  Clock3,
  DatabaseBackup,
  FileText,
  LockKeyhole,
  RotateCcw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Workflow,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/components/ui/toast-context";
import { cn } from "@/lib/utils";
import type { SystemSettingsInput } from "@/lib/settings/settings-validation";
import { updateSystemSettings } from "@/app/(dashboard)/settings/actions";
import { DEFAULT_SYSTEM_SETTINGS } from "@/lib/settings/settings-validation";

type SettingsSectionId = "organization" | "system" | "security" | "workflow" | "documents" | "notifications" | "data";

const sectionMeta: {
  id: SettingsSectionId;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    id: "organization",
    title: "Doanh nghiệp",
    description: "Thông tin nhận diện công ty/tổ chức.",
    icon: Building2,
  },
  {
    id: "system",
    title: "Hệ thống",
    description: "Tiền tệ, múi giờ và cấu hình hệ thống chung.",
    icon: Settings2,
  },
  {
    id: "security",
    title: "Bảo mật",
    description: "Phiên đăng nhập, xác thực quản trị và nhật ký nhạy cảm.",
    icon: ShieldCheck,
  },
  {
    id: "workflow",
    title: "Quy trình",
    description: "Luồng phê duyệt cho vật tư, thanh toán, hợp đồng và báo cáo.",
    icon: Workflow,
  },
  {
    id: "documents",
    title: "Tài liệu",
    description: "Chuẩn đặt tên, phiên bản hồ sơ và giới hạn tải lên.",
    icon: FileText,
  },
  {
    id: "notifications",
    title: "Thông báo",
    description: "Nhắc việc hiện trường, tổng hợp email và leo thang phê duyệt.",
    icon: Bell,
  },
  {
    id: "data",
    title: "Dữ liệu",
    description: "Sao lưu, xuất dữ liệu, lưu trữ và cửa sổ bảo trì.",
    icon: DatabaseBackup,
  },
];

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function formatSavedAt(value: Date | string | undefined) {
  if (!value) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

// Flat system settings type + some metadata from Prisma
type SystemSettingsData = SystemSettingsInput & { id?: string; updatedAt?: Date; updatedById?: string | null };

export function SettingsWorkspace({ initialSettings }: { initialSettings: SystemSettingsData }) {
  const toast = useToast();
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("organization");
  const [query, setQuery] = useState("");
  
  // The state being edited
  const [profile, setProfile] = useState<SystemSettingsData>(initialSettings);
  
  // The last confirmed saved state from server
  const [savedSnapshot, setSavedSnapshot] = useState<SystemSettingsData>(initialSettings);
  
  const [isPending, startTransition] = useTransition();

  const isDirty = useMemo(() => {
    // Basic deep compare avoiding dates
    const current = { ...profile, updatedAt: null, id: null, updatedById: null };
    const saved = { ...savedSnapshot, updatedAt: null, id: null, updatedById: null };
    return JSON.stringify(current) !== JSON.stringify(saved);
  }, [profile, savedSnapshot]);

  const visibleSections = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return sectionMeta;
    return sectionMeta.filter((section) =>
      `${section.title} ${section.description}`.toLowerCase().includes(normalized),
    );
  }, [query]);

  const updateField = <K extends keyof SystemSettingsInput>(
    field: K,
    value: SystemSettingsInput[K],
  ) => {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        const result = await updateSystemSettings(profile);
        setProfile(result);
        setSavedSnapshot(result);
        toast.success("Đã lưu cấu hình cài đặt vào cơ sở dữ liệu hệ thống.");
      } catch (error: any) {
        toast.error(error.message || "Lỗi khi lưu cấu hình.");
      }
    });
  };

  const handleRestoreSaved = () => {
    setProfile(savedSnapshot);
    toast.info("Đã hoàn tác về cấu hình hiện tại trên server.");
  };

  const handleResetDefaults = () => {
    setProfile(prev => ({
        ...prev,
        ...DEFAULT_SYSTEM_SETTINGS
    }) as SystemSettingsData);
    toast.warning("Đã đưa màn hình về cấu hình mặc định. Nhấn Lưu để áp dụng.");
  };

  // Tính toán số metrics trung thực
  const enabledControls = [
    profile.requireTwoFactorForAdmins,
    profile.auditSensitiveActions,
    profile.requireProjectCodeBeforeSpending,
    profile.materialRequestApproval,
    profile.paymentTwoStepApproval,
    profile.reportLockAfterApproval,
    profile.enforceNamingConvention,
    profile.autoVersioning,
    profile.exportRequiresApproval,
  ].filter(Boolean).length;

  return (
    <div className="app-page mx-auto max-w-[1440px] space-y-5">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-950/[0.03]">
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-start lg:p-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <Settings2 className="h-3.5 w-3.5" />
              Trung tâm cấu hình ERP
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Cài đặt hệ thống
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Điều chỉnh các tiêu chuẩn vận hành dùng chung cho bảo mật, phê duyệt, tài liệu,
              thông báo và dữ liệu của ERP công trình. (Dữ liệu đang được liên kết thực tế với DB).
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
            <button
              type="button"
              onClick={handleRestoreSaved}
              disabled={!isDirty || isPending}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm shadow-slate-950/[0.03] transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Hoàn tác
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty || isPending}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-950/10 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className={cn("h-4 w-4", isPending && "animate-spin")} />
              {isPending ? "Đang lưu..." : "Lưu cài đặt"}
            </button>
          </div>
        </div>

        <div className="grid border-t border-slate-200 bg-slate-50/80 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="Kiểm soát đang bật"
            value={`${enabledControls}/9`}
            description="Các guardrail vận hành quan trọng"
            icon={CheckCircle2}
            tone="success"
          />
          <MetricTile
            label="Trạng thái Bảo mật"
            value="Chưa liên kết"
            description="Tính năng quét bảo mật sẽ ra mắt ở Phase 2"
            icon={AlertTriangle}
            tone="neutral"
          />
          <MetricTile
            label="Hệ thống Backup"
            value="Chưa liên kết"
            description="Chưa có Backup Job tự động"
            icon={DatabaseBackup}
            tone="neutral"
          />
          <MetricTile
            label="Lần cập nhật gần nhất"
            value={formatSavedAt(savedSnapshot.updatedAt)}
            description="Từ cơ sở dữ liệu thật"
            icon={Clock3}
            tone="success"
          />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <div className="surface-panel p-3">
            <label htmlFor="settings-search" className="sr-only">
              Tìm nhóm cài đặt
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="settings-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Tìm cài đặt..."
                type="search"
              />
            </div>
          </div>

          <nav className="surface-panel overflow-hidden p-2" aria-label="Nhóm cài đặt">
            {visibleSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                  )}
                >
                  <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", isActive ? "text-blue-600" : "text-slate-400")} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{section.title}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">{section.description}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="surface-panel p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <SlidersHorizontal className="h-4 w-4 text-blue-600" />
              Trạng thái chỉnh sửa
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {isDirty
                ? "Có thay đổi chưa lưu. Hãy lưu trước khi rời trang."
                : "Cấu hình đang khớp với dữ liệu trên máy chủ."}
            </p>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Đưa về mặc định
            </button>
          </div>
        </aside>

        <main className="min-w-0 space-y-5">
          <SectionShell meta={sectionMeta.find((section) => section.id === activeSection) ?? sectionMeta[0]}>
            {activeSection === "organization" && (
              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  label="Tên doanh nghiệp"
                  value={profile.companyName}
                  onChange={(value) => updateField("companyName", value)}
                />
                <TextField
                  label="Mã số thuế"
                  value={profile.taxCode || ""}
                  onChange={(value) => updateField("taxCode", value)}
                />
                <TextField
                  label="Hotline nội bộ"
                  value={profile.hotline || ""}
                  onChange={(value) => updateField("hotline", value)}
                />
              </div>
            )}

            {activeSection === "system" && (
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  label="Múi giờ"
                  value={profile.timezone}
                  onChange={(value) => updateField("timezone", value)}
                  disabled={true}
                  badge="Chưa kích hoạt"
                  options={[
                    ["Asia/Bangkok", "Việt Nam, Thái Lan"],
                    ["Asia/Singapore", "Singapore"],
                    ["UTC", "UTC"],
                  ]}
                />
                <SelectField
                  label="Tiền tệ mặc định"
                  value={profile.currency}
                  onChange={(value) => updateField("currency", value)}
                  disabled={true}
                  badge="Chưa kích hoạt"
                  options={[
                    ["VND", "VND"],
                    ["USD", "USD"],
                  ]}
                />
                <SelectField
                  label="Tháng bắt đầu năm tài chính"
                  value={profile.fiscalYearStartMonth}
                  onChange={(value) => updateField("fiscalYearStartMonth", value)}
                  disabled={true}
                  badge="Chưa kích hoạt"
                  options={[
                    ["01", "Tháng 01"],
                    ["04", "Tháng 04"],
                    ["07", "Tháng 07"],
                  ]}
                />
              </div>
            )}

            {activeSection === "security" && (
              <div className="space-y-4">
                <SwitchRow
                  title="Bắt buộc 2FA cho quản trị"
                  description="Sẽ yêu cầu Admin xác thực 2 bước."
                  checked={profile.requireTwoFactorForAdmins}
                  onChange={(value) => updateField("requireTwoFactorForAdmins", value)}
                  disabled={true}
                  badge="Chưa kích hoạt"
                />
                <SwitchRow
                  title="Ghi audit cho thao tác nhạy cảm"
                  description="Ghi lại thay đổi quyền, xuất dữ liệu, duyệt thanh toán và xóa mềm."
                  checked={profile.auditSensitiveActions}
                  onChange={(value) => updateField("auditSensitiveActions", value)}
                  disabled={true}
                  badge="Chưa kích hoạt"
                />
                <div className="grid gap-4 md:grid-cols-3">
                  <NumberField
                    label="Hết phiên sau"
                    suffix="phút"
                    value={profile.sessionTimeoutMinutes}
                    onChange={(value) => updateField("sessionTimeoutMinutes", value)}
                    disabled={true}
                    badge="Chưa kích hoạt"
                  />
                  <NumberField
                    label="Đổi mật khẩu sau"
                    suffix="ngày"
                    value={profile.passwordRotationDays}
                    onChange={(value) => updateField("passwordRotationDays", value)}
                    disabled={true}
                    badge="Chỉ hiển thị"
                  />
                  <NumberField
                    label="Rà soát thiết bị tin cậy"
                    suffix="ngày"
                    value={profile.trustedDeviceReviewDays}
                    onChange={(value) => updateField("trustedDeviceReviewDays", value)}
                    disabled={true}
                    badge="Chỉ hiển thị"
                  />
                </div>
                <SelectField
                  label="Chế độ IP truy cập"
                  value={profile.allowedIpMode}
                  onChange={(value) => updateField("allowedIpMode", value as any)}
                  disabled={true}
                  badge="Chưa kích hoạt"
                  options={[
                    ["restricted", "Giới hạn theo danh sách tin cậy"],
                    ["open", "Mở cho mọi IP"],
                  ]}
                />
              </div>
            )}

            {activeSection === "workflow" && (
              <div className="space-y-4">
                <SwitchRow
                  title="Bắt buộc mã công trình trước khi chi"
                  description="Không cho tạo đề nghị thanh toán nếu chưa chọn công trình."
                  checked={profile.requireProjectCodeBeforeSpending}
                  onChange={(value) => updateField("requireProjectCodeBeforeSpending", value)}
                  disabled={true}
                  badge="Chưa kích hoạt"
                />
                <SwitchRow
                  title="Vật tư phải qua phê duyệt"
                  description="Phiếu yêu cầu vật tư từ hiện trường cần được duyệt trước khi xuất."
                  checked={profile.materialRequestApproval}
                  onChange={(value) => updateField("materialRequestApproval", value)}
                  disabled={true}
                  badge="Chưa kích hoạt"
                />
                <SwitchRow
                  title="Thanh toán duyệt hai bước"
                  description="Tách bước kiểm tra kế toán và bước duyệt điều hành."
                  checked={profile.paymentTwoStepApproval}
                  onChange={(value) => updateField("paymentTwoStepApproval", value)}
                  disabled={true}
                  badge="Chưa kích hoạt"
                />
                <SwitchRow
                  title="Khóa báo cáo sau khi duyệt"
                  description="Báo cáo hiện trường đã duyệt chỉ được sửa bằng yêu cầu điều chỉnh."
                  checked={profile.reportLockAfterApproval}
                  onChange={(value) => updateField("reportLockAfterApproval", value)}
                  disabled={true}
                  badge="Chưa kích hoạt"
                />
                <NumberField
                  label="Ngưỡng hợp đồng cần duyệt cấp cao"
                  suffix={currencyFormatter.format(profile.contractValueThreshold)}
                  value={profile.contractValueThreshold}
                  onChange={(value) => updateField("contractValueThreshold", value)}
                  disabled={true}
                  badge="Chỉ hiển thị"
                />
              </div>
            )}

            {activeSection === "documents" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 text-blue-600" />
                    <div>
                      <h3 className="text-sm font-semibold text-blue-900">Giới hạn dung lượng tải lên</h3>
                      <p className="mt-1 text-sm leading-6 text-blue-700">
                        Hệ thống không đặt giới hạn dung lượng ở tầng ứng dụng. Dung lượng thực tế phụ thuộc reverse proxy, hosting và storage.
                      </p>
                    </div>
                  </div>
                </div>
                <SwitchRow
                  title="Bắt buộc chuẩn đặt tên hồ sơ"
                  description="Cảnh báo tên file camera, chat hoặc tên quá chung."
                  checked={profile.enforceNamingConvention}
                  onChange={(value) => updateField("enforceNamingConvention", value)}
                />
                <SwitchRow
                  title="Tự động tạo phiên bản"
                  description="Tài liệu trùng tên được lưu thành phiên bản mới."
                  checked={profile.autoVersioning}
                  onChange={(value) => updateField("autoVersioning", value)}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <NumberField
                    label="Lưu hồ sơ tối thiểu"
                    suffix="năm"
                    value={profile.documentRetentionYears}
                    onChange={(value) => updateField("documentRetentionYears", value)}
                    disabled={true}
                    badge="Chỉ hiển thị"
                  />
                </div>
                <TextField
                  label="Định dạng được phép"
                  value={profile.allowedExtensions}
                  onChange={(value) => updateField("allowedExtensions", value)}
                />
              </div>
            )}

            {activeSection === "notifications" && (
              <div className="space-y-4">
                <SwitchRow
                  title="Gửi tổng hợp email hằng ngày"
                  description="Email tổng hợp cuối ngày"
                  checked={profile.emailDailyDigest}
                  onChange={(value) => updateField("emailDailyDigest", value)}
                  disabled={true}
                  badge="Chưa kích hoạt"
                />
                <SwitchRow
                  title="Leo thang phê duyệt quá hạn"
                  description="Tự động nhắc/leo thang duyệt"
                  checked={profile.approvalEscalation}
                  onChange={(value) => updateField("approvalEscalation", value)}
                  disabled={true}
                  badge="Chưa kích hoạt"
                />
                <SwitchRow
                  title="Nhắc báo cáo hiện trường"
                  description="Gửi push nhắc nộp báo cáo."
                  checked={profile.fieldReportReminder}
                  onChange={(value) => updateField("fieldReportReminder", value)}
                  disabled={true}
                  badge="Chưa kích hoạt"
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField
                    label="Giờ nhắc báo cáo"
                    value={profile.reminderTime}
                    onChange={(value) => updateField("reminderTime", value)}
                    disabled={true}
                    badge="Chỉ hiển thị"
                  />
                  <NumberField
                    label="Leo thang sau"
                    suffix="giờ"
                    value={profile.escalationHours}
                    onChange={(value) => updateField("escalationHours", value)}
                    disabled={true}
                    badge="Chỉ hiển thị"
                  />
                </div>
              </div>
            )}

            {activeSection === "data" && (
              <div className="space-y-4">
                <SwitchRow
                  title="Sao lưu tự động"
                  description="Backup DB tự động"
                  checked={profile.automaticBackup}
                  onChange={(value) => updateField("automaticBackup", value)}
                  disabled={true}
                  badge="Chưa kích hoạt"
                />
                <SwitchRow
                  title="Xuất dữ liệu cần phê duyệt"
                  description="Giảm rủi ro rò rỉ dữ liệu khi tải hàng loạt."
                  checked={profile.exportRequiresApproval}
                  onChange={(value) => updateField("exportRequiresApproval", value)}
                  disabled={true}
                  badge="Chưa kích hoạt"
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    label="Tần suất sao lưu"
                    value={profile.backupFrequency}
                    onChange={(value) => updateField("backupFrequency", value as any)}
                    disabled={true}
                    badge="Chỉ hiển thị"
                    options={[
                      ["daily", "Hằng ngày"],
                      ["weekly", "Hằng tuần"],
                    ]}
                  />
                  <NumberField
                    label="Lưu dữ liệu tối thiểu"
                    suffix="năm"
                    value={profile.retentionYears}
                    onChange={(value) => updateField("retentionYears", value)}
                    disabled={true}
                    badge="Chỉ hiển thị"
                  />
                </div>
                <TextField
                  label="Cửa sổ bảo trì"
                  value={profile.maintenanceWindow}
                  onChange={(value) => updateField("maintenanceWindow", value)}
                  disabled={true}
                  badge="Chỉ hiển thị"
                />
              </div>
            )}
          </SectionShell>
        </main>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  description,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  tone: "success" | "warning" | "neutral";
}) {
  const iconClass = {
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    neutral: "bg-slate-100 text-slate-700",
  }[tone];

  return (
    <div className="border-b border-slate-200 p-4 sm:border-r sm:last:border-r-0 xl:border-b-0">
      <div className="flex items-start gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", iconClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 truncate text-xl font-bold text-slate-950">{value}</p>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>
    </div>
  );
}

function SectionShell({
  meta,
  children,
}: {
  meta: (typeof sectionMeta)[number];
  children: React.ReactNode;
}) {
  const Icon = meta.icon;

  return (
    <section className="surface-panel overflow-hidden">
      <div className="border-b border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-950">{meta.title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{meta.description}</p>
          </div>
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function SwitchRow({
  title,
  description,
  checked,
  onChange,
  disabled,
  badge,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between", disabled && "opacity-75")}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-950">{title}</p>
          {badge && (
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700 uppercase tracking-wide">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
          checked ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition",
            checked ? "left-6" : "left-1",
          )}
        />
        <span className="sr-only">{checked ? "Đang bật" : "Đang tắt"}</span>
      </button>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  disabled,
  badge,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <label className={cn("block", disabled && "opacity-75")}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        {badge && (
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700 uppercase tracking-wide">
            {badge}
          </span>
        )}
      </div>
      <input
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
        type="text"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  suffix,
  onChange,
  disabled,
  badge,
}: {
  label: string;
  value: number;
  suffix: string;
  onChange: (value: number) => void;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <label className={cn("block", disabled && "opacity-75")}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        {badge && (
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700 uppercase tracking-wide">
            {badge}
          </span>
        )}
      </div>
      <div className={cn("mt-1 flex overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100", disabled && "bg-slate-50")}>
        <input
          value={value}
          min={0}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-10 min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-slate-900 outline-none disabled:cursor-not-allowed"
          type="number"
        />
        <span className="flex max-w-[55%] items-center border-l border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-500">
          {suffix}
        </span>
      </div>
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  disabled,
  badge,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <label className={cn("block", disabled && "opacity-75")}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        {badge && (
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700 uppercase tracking-wide">
            {badge}
          </span>
        )}
      </div>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
      >
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}
