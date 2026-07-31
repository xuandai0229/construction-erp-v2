"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  CheckSquare,
  Clock,
  FileSpreadsheet,
  FileText,
  Info,
  ListOrdered,
  Plus,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentCard } from "@/components/ui/enterprise";
import { SafetyEditorHeader, AutoSaveState } from "./safety-editor-header";
import {
  saveSafetyAssessmentAction,
  transitionSafetyAssessmentAction,
} from "@/app/(dashboard)/reports/safety/actions";

export const FIXED_20_SAFETY_ITEMS = [
  "Phương tiện bảo vệ bảo hộ cá nhân (Mũ, giày, quần áo, găng tay, khẩu trang...)",
  "Thiết bị bảo hộ làm việc trên cao (Dây đai, mũ, lưới, hệ thống điểm neo...)",
  "An toàn thang và lối đi lại trên công trường",
  "Hệ thống giàn giáo, sàn thao tác, can chốt an toàn",
  "Lưới bao che: Chắn vật liệu rơi, chống bụi công trình",
  "Khu vực nguy hiểm: Hố đào sâu, lỗ mở sàn, hố ga, rào chắn cảnh báo",
  "Công việc phát sinh nhiệt (Hàn, cắt, mối nối điện, bình khí nén)",
  "Công việc ngày và việc bố trí lao động",
  "Dụng cụ, máy móc, thiết bị thi công (Kiểm định, tem an toàn)",
  "Lối đi lại và lối thoát hiểm công trình",
  "Vệ sinh công trình và gom dọn rác thải thi công",
  "Thiết bị và biển báo PCCC (Bình chữa cháy, nội quy PCCC)",
  "Hệ thống biển báo nội quy, biển cảnh báo nguy hiểm",
  "Sinh hoạt của công nhân (Nước uống, nhà vệ sinh tạm, lán trại)",
  "Hệ thống điện thi công (Tủ điện, cầu dao, dây dẫn điện, chống rò)",
  "Hồ sơ nhân công, hợp đồng và đăng ký lao động",
  "Công tác huấn luyện an toàn lao động đầu giờ/định kỳ",
  "Phối hợp nhân sự giữa các tổ đội và Ban chỉ huy",
  "Chế độ báo cáo và nhật ký an toàn công trình",
  "Các công tác kiểm tra an toàn khác theo quy định",
];

export function SafetyAssessmentEditor({
  report,
  projects,
  currentUser,
}: {
  report: any;
  projects: Array<{ id: string; name: string }>;
  currentUser: { id: string; role: string; name: string };
}) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("GENERAL");
  const [pending, startTransition] = useTransition();

  // Form State
  const [title, setTitle] = useState(report.title || "");
  const [previousWeekRemediation, setPreviousWeekRemediation] = useState(
    report.previousWeekRemediation || ""
  );
  const [reinspectionConfirmation, setReinspectionConfirmation] = useState(
    report.reinspectionConfirmation || ""
  );
  const [managementRecommendation, setManagementRecommendation] = useState(
    report.managementRecommendation || ""
  );
  const [otherOpinion, setOtherOpinion] = useState(report.otherOpinion || "");

  const [entries, setEntries] = useState<any[]>(
    (report.entries || []).map((e: any) => ({
      id: e.id,
      inspectionDate: new Date(e.inspectionDate).toISOString().split("T")[0],
      shift: e.shift || "MORNING",
      projectId: e.projectId,
      inspectionContent: e.inspectionContent || "",
      assessment: e.assessment || "Đạt yêu cầu an toàn",
      recommendation: e.recommendation || "",
      implementationResult: e.implementationResult || "Đã hoàn thành",
      sortOrder: e.sortOrder || 0,
    }))
  );

  const [lockVersion, setLockVersion] = useState(report.version || 1);
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>("saved");
  const isInitialMount = useRef(true);

  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionReasonInput, setRevisionReasonInput] = useState("");

  const isOwner = report.createdById === currentUser.id;
  const canEdit = isOwner && ["DRAFT", "REVISION_REQUIRED"].includes(report.status);
  const canSubmit = isOwner && ["DRAFT", "REVISION_REQUIRED"].includes(report.status);
  const canApprove =
    ["DIRECTOR", "ADMIN", "SUPERVISION_HEAD", "PROJECT_MANAGER"].includes(currentUser.role) &&
    report.status === "PENDING_APPROVAL";

  // Ctrl+S shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (canEdit) handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    canEdit,
    title,
    previousWeekRemediation,
    reinspectionConfirmation,
    managementRecommendation,
    otherOpinion,
    entries,
    lockVersion,
  ]);

  // Debounced auto-save (900ms)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!canEdit) return;

    setAutoSaveState("dirty");
    const timer = setTimeout(() => {
      handleSaveSilently();
    }, 900);

    return () => clearTimeout(timer);
  }, [
    title,
    previousWeekRemediation,
    reinspectionConfirmation,
    managementRecommendation,
    otherOpinion,
    entries,
  ]);

  const handleSaveSilently = async () => {
    try {
      setAutoSaveState("saving");
      const res = await saveSafetyAssessmentAction(report.id, {
        expectedLockVersion: lockVersion,
        title,
        previousWeekRemediation,
        reinspectionConfirmation,
        managementRecommendation,
        otherOpinion,
        entries,
      });
      setLockVersion(res.lockVersion);
      setAutoSaveState("saved");
    } catch (err: any) {
      if (err.message?.includes("CONFLICT")) {
        setAutoSaveState("conflict");
      } else {
        setAutoSaveState("error");
      }
    }
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        setAutoSaveState("saving");
        const res = await saveSafetyAssessmentAction(report.id, {
          expectedLockVersion: lockVersion,
          title,
          previousWeekRemediation,
          reinspectionConfirmation,
          managementRecommendation,
          otherOpinion,
          entries,
        });
        setLockVersion(res.lockVersion);
        setAutoSaveState("saved");
        router.refresh();
      } catch (err: any) {
        alert(err.message || "Lỗi lưu bản nháp.");
        setAutoSaveState("error");
      }
    });
  };

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        await saveSafetyAssessmentAction(report.id, {
          expectedLockVersion: lockVersion,
          title,
          previousWeekRemediation,
          reinspectionConfirmation,
          managementRecommendation,
          otherOpinion,
          entries,
        });
        await transitionSafetyAssessmentAction(report.id, "SUBMIT");
        router.refresh();
      } catch (err: any) {
        alert(err.message || "Lỗi trình duyệt Báo cáo.");
      }
    });
  };

  const handleApprove = () => {
    startTransition(async () => {
      try {
        await transitionSafetyAssessmentAction(report.id, "APPROVE");
        router.refresh();
      } catch (err: any) {
        alert(err.message || "Lỗi duyệt Báo cáo.");
      }
    });
  };

  const handleRequestRevision = () => {
    if (!revisionReasonInput.trim()) {
      alert("Vui lòng nhập lý do yêu cầu sửa.");
      return;
    }
    startTransition(async () => {
      try {
        await transitionSafetyAssessmentAction(report.id, "REQUEST_REVISION", revisionReasonInput);
        setRevisionModalOpen(false);
        router.refresh();
      } catch (err: any) {
        alert(err.message || "Lỗi gửi yêu cầu chỉnh sửa.");
      }
    });
  };

  const handleAddEntry = () => {
    if (!canEdit) return;
    const lastDate =
      entries.length > 0
        ? entries[entries.length - 1].inspectionDate
        : new Date().toISOString().split("T")[0];
    const defaultProj = projects[0]?.id || "";

    setEntries([
      ...entries,
      {
        id: `temp-${Date.now()}`,
        inspectionDate: lastDate,
        shift: "MORNING",
        projectId: defaultProj,
        inspectionContent: FIXED_20_SAFETY_ITEMS[0],
        assessment: "Đạt yêu cầu an toàn",
        recommendation: "Duy trì thường xuyên",
        implementationResult: "Đã hoàn thành",
        sortOrder: entries.length,
      },
    ]);
  };

  const handleRemoveEntry = (index: number) => {
    if (!canEdit) return;
    setEntries(entries.filter((_, idx) => idx !== index));
  };

  const handleEntryChange = (index: number, field: string, value: any) => {
    if (!canEdit) return;
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };
    setEntries(updated);
  };

  const sections = [
    { id: "GENERAL", label: "1. Thông tin chung", icon: Info },
    { id: "CHECKLIST", label: "2. 20 Danh mục kiểm tra", icon: ListOrdered },
    { id: "WEEKLY_RESULTS", label: "3. Kết quả kiểm tra tuần", icon: CheckSquare },
    { id: "REMEDIATION", label: "4. Khắc phục & Đề xuất", icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <SafetyEditorHeader
        documentNumber={report.documentNumber}
        title={report.title}
        docTypeLabel="Mẫu 01 — Báo cáo tự đánh giá"
        status={report.status}
        version={lockVersion}
        autoSaveState={autoSaveState}
        sections={sections}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        onSave={handleSave}
        onSubmit={handleSubmit}
        onApprove={handleApprove}
        onRequestRevision={() => setRevisionModalOpen(true)}
        onPreview={() => router.push(`/reports/safety/self-assessments/${report.id}/preview`)}
        canEdit={canEdit}
        canSubmit={canSubmit}
        canApprove={canApprove}
        currentUserRole={currentUser.role}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        {/* Revision Required Alert */}
        {report.status === "REVISION_REQUIRED" && report.revisionReason && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900 shadow-xs flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <div className="font-bold text-sm text-rose-950">Yêu cầu chỉnh sửa từ cấp phê duyệt:</div>
              <div className="text-rose-800 whitespace-pre-wrap">{report.revisionReason}</div>
            </div>
          </div>
        )}

        {/* Section 1: General Info */}
        {activeSection === "GENERAL" && (
          <ContentCard className="p-6 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900">Thông tin chung về Báo cáo tự đánh giá</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Các thông tin theo Mẫu 01 quy định của công ty
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số văn bản</label>
                <input
                  type="text"
                  disabled
                  value={report.documentNumber || "Tự động sinh khi duyệt (BC-ATLD-YYYY-XXXX)"}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cán bộ An toàn (Người lập)</label>
                <input
                  type="text"
                  disabled
                  value={report.createdBy?.name || currentUser.name}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-semibold"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tiêu đề báo cáo</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500"
                />
              </div>

              {report.sourcePlan && (
                <div className="md:col-span-2 rounded-xl bg-blue-50/70 p-3.5 border border-blue-100 text-xs text-blue-900 flex items-center justify-between">
                  <div>
                    <span className="font-bold">Kế thừa từ Kế hoạch kiểm tra: </span>
                    <span>{report.sourcePlan.documentNumber || report.sourcePlan.title}</span>
                  </div>
                </div>
              )}
            </div>
          </ContentCard>
        )}

        {/* Section 2: Fixed 20 Checklist Items */}
        {activeSection === "CHECKLIST" && (
          <ContentCard className="p-6 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900">
                20 Nội dung tự đánh giá cố định (Mẫu 01)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Các nội dung kiểm tra tiêu chuẩn ATLĐ, PCCC, VSMT công trình do Công ty quy định
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {FIXED_20_SAFETY_ITEMS.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-colors flex items-start gap-3"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-700 font-bold text-xs shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="text-xs text-slate-800 font-medium leading-relaxed">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </ContentCard>
        )}

        {/* Section 3: Weekly Inspection Results Table */}
        {activeSection === "WEEKLY_RESULTS" && (
          <ContentCard className="p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Bảng kết quả kiểm tra tuần</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chi tiết kết quả đánh giá, kiến nghị và khắc phục từng ngày
                </p>
              </div>
              {canEdit && (
                <Button
                  size="sm"
                  onClick={handleAddEntry}
                  className="bg-blue-600 text-white hover:bg-blue-700 gap-1.5 text-xs"
                >
                  <Plus className="h-4 w-4" />
                  Thêm dòng đánh giá
                </Button>
              )}
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-3 w-32">Ngày kiểm tra</th>
                    <th className="py-3 px-3 w-24">Buổi</th>
                    <th className="py-3 px-3 w-48">Công trình</th>
                    <th className="py-3 px-3 min-w-[180px]">Nội dung kiểm tra</th>
                    <th className="py-3 px-3 min-w-[160px]">Đánh giá công trình</th>
                    <th className="py-3 px-3 min-w-[160px]">Kiến nghị yêu cầu</th>
                    <th className="py-3 px-3 min-w-[140px]">Kết quả thực hiện</th>
                    {canEdit && <th className="py-3 px-3 w-12 text-center">Xóa</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {entries.map((entry, idx) => (
                    <tr key={entry.id || idx} className="hover:bg-slate-50/50">
                      {/* Date */}
                      <td className="py-2.5 px-3">
                        <input
                          type="date"
                          disabled={!canEdit}
                          value={entry.inspectionDate}
                          onChange={(e) => handleEntryChange(idx, "inspectionDate", e.target.value)}
                          className="w-full text-xs p-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Shift */}
                      <td className="py-2.5 px-3">
                        <select
                          disabled={!canEdit}
                          value={entry.shift}
                          onChange={(e) => handleEntryChange(idx, "shift", e.target.value)}
                          className="w-full text-xs p-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 bg-white"
                        >
                          <option value="MORNING">Sáng</option>
                          <option value="AFTERNOON">Chiều</option>
                          <option value="EVENING">Tối</option>
                        </select>
                      </td>

                      {/* Project */}
                      <td className="py-2.5 px-3">
                        <select
                          disabled={!canEdit}
                          value={entry.projectId}
                          onChange={(e) => handleEntryChange(idx, "projectId", e.target.value)}
                          className="w-full text-xs p-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500 bg-white font-semibold text-slate-800"
                        >
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Inspection Content */}
                      <td className="py-2.5 px-3">
                        <textarea
                          rows={2}
                          disabled={!canEdit}
                          value={entry.inspectionContent}
                          onChange={(e) => handleEntryChange(idx, "inspectionContent", e.target.value)}
                          className="w-full p-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Assessment */}
                      <td className="py-2.5 px-3">
                        <textarea
                          rows={2}
                          disabled={!canEdit}
                          value={entry.assessment || ""}
                          onChange={(e) => handleEntryChange(idx, "assessment", e.target.value)}
                          className="w-full p-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Recommendation */}
                      <td className="py-2.5 px-3">
                        <textarea
                          rows={2}
                          disabled={!canEdit}
                          value={entry.recommendation || ""}
                          onChange={(e) => handleEntryChange(idx, "recommendation", e.target.value)}
                          className="w-full p-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Implementation Result */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          disabled={!canEdit}
                          value={entry.implementationResult || ""}
                          onChange={(e) => handleEntryChange(idx, "implementationResult", e.target.value)}
                          className="w-full text-xs p-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Action */}
                      {canEdit && (
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleRemoveEntry(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ContentCard>
        )}

        {/* Section 4: Remediation & Recommendations */}
        {activeSection === "REMEDIATION" && (
          <ContentCard className="p-6 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900">
                Theo dõi khắc phục tồn tại & Đề xuất kiến nghị
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Các mục tổng hợp đánh giá khắc phục tồn tại tuần trước và kiến nghị Ban Giám đốc
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  1. Theo dõi khắc phục các yêu cầu của tuần trước còn tồn đọng
                </label>
                <textarea
                  rows={3}
                  disabled={!canEdit}
                  value={previousWeekRemediation}
                  onChange={(e) => setPreviousWeekRemediation(e.target.value)}
                  placeholder="Nhập tình hình khắc phục các tồn tại của tuần trước..."
                  className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  2. Kiểm tra lại sau khắc phục và xác nhận đã hoàn thành
                </label>
                <textarea
                  rows={3}
                  disabled={!canEdit}
                  value={reinspectionConfirmation}
                  onChange={(e) => setReinspectionConfirmation(e.target.value)}
                  placeholder="Xác nhận việc kiểm tra lại các vị trí đã khắc phục..."
                  className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  3. Kiến nghị đề xuất Ban Giám đốc về kết quả tuần
                </label>
                <textarea
                  rows={3}
                  disabled={!canEdit}
                  value={managementRecommendation}
                  onChange={(e) => setManagementRecommendation(e.target.value)}
                  placeholder="Các đề xuất trang bị bổ sung bảo hộ, thiết bị PCCC hoặc khen thưởng/xử phạt..."
                  className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  4. Ý kiến khác (nếu có)
                </label>
                <textarea
                  rows={2}
                  disabled={!canEdit}
                  value={otherOpinion}
                  onChange={(e) => setOtherOpinion(e.target.value)}
                  placeholder="Ý kiến đóng góp khác..."
                  className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </ContentCard>
        )}
      </div>

      {/* Revision Dialog */}
      {revisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <h3 className="text-base font-bold text-slate-900">Yêu cầu chỉnh sửa Báo cáo</h3>
              </div>
              <button onClick={() => setRevisionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Nhập lý do / nội dung yêu cầu sửa <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={revisionReasonInput}
                onChange={(e) => setRevisionReasonInput(e.target.value)}
                placeholder="Nhập chi tiết các nội dung cần sửa..."
                className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setRevisionModalOpen(false)}>
                Hủy
              </Button>
              <Button
                onClick={handleRequestRevision}
                disabled={pending}
                className="bg-rose-600 text-white hover:bg-rose-700"
              >
                Gửi yêu cầu sửa
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
