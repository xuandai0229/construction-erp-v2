import { Fragment } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getMaterialProposal } from "@/lib/material-proposals/actions";
import { isHighLevel } from "@/lib/material-proposals/permissions";
import {
  FileSpreadsheet,
  ArrowLeft,
  Edit,
  Building2,
  MapPin,
  User,
  Calendar,
  Layers,
  FileText,
} from "lucide-react";

export default async function MaterialProposalDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const proposal = await getMaterialProposal(id).catch(() => null);
  if (!proposal) notFound();

  const isCreator = proposal.requestedById === session.id || isHighLevel(session.role);

  const requestedReturnTo = typeof resolvedSearchParams.returnTo === "string" ? resolvedSearchParams.returnTo : "";
  const safeReturnTo = requestedReturnTo.startsWith("/materials") && !requestedReturnTo.startsWith("//") ? requestedReturnTo : null;
  const backUrl = safeReturnTo || `/materials?tab=requests&scope=project${proposal.projectId ? `&projectId=${proposal.projectId}` : ""}`;
  const editUrl = `/materials/proposals/new?edit=${proposal.id}&returnTo=${encodeURIComponent(backUrl)}`;

  return (
    <main className="w-full max-w-full space-y-6">
      {/* Top Navigation & Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={backUrl}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50"
            aria-label="Quay lại danh sách"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              {proposal.proposalNo}
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
              ĐỀ XUẤT VẬT TƯ
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {isCreator && (
            <Link
              href={editUrl}
              className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 shadow-2xs hover:bg-blue-100"
            >
              <Edit className="h-3.5 w-3.5" />
              Chỉnh sửa
            </Link>
          )}

          <a
            href={`/materials/proposals/${proposal.id}/export`}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 shadow-2xs hover:bg-emerald-100"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            Tải Excel
          </a>

          <Link
            href={backUrl}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
          >
            Quay lại
          </Link>
        </div>
      </div>

      {/* SECTION 1: THÔNG TIN TỔNG QUAN (Proposal Snapshot) */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
            <FileText className="h-4 w-4 text-blue-600" />
            THÔNG TIN HỒ SƠ ĐỀ XUẤT
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Ngày khởi tạo: {new Date(proposal.createdAt).toLocaleDateString("vi-VN")}
          </span>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="block text-xs font-semibold uppercase text-slate-500 mb-1 flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              Công trình
            </span>
            <p className="text-sm font-bold text-slate-900">{proposal.projectNameSnapshot}</p>
          </div>

          <div>
            <span className="block text-xs font-semibold uppercase text-slate-500 mb-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              Địa điểm
            </span>
            <p className="text-sm font-medium text-slate-800">
              {proposal.projectLocationSnapshot || "Chưa nhập"}
            </p>
          </div>

          <div>
            <span className="block text-xs font-semibold uppercase text-slate-500 mb-1 flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-slate-400" />
              Người đề nghị / Chức danh
            </span>
            <p className="text-sm font-bold text-slate-900">{proposal.requesterNameSnapshot}</p>
            <p className="text-xs text-slate-500 font-medium">
              {proposal.requesterRoleSnapshot || "Thành viên dự án"}
            </p>
          </div>

          <div>
            <span className="block text-xs font-semibold uppercase text-slate-500 mb-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Ngày đề nghị / Cần cấp
            </span>
            <p className="text-xs text-slate-700 font-medium">
              Đề nghị: {new Date(proposal.proposalDate).toLocaleDateString("vi-VN")}
            </p>
            <p className="text-xs text-blue-700 font-bold mt-0.5">
              Cần cấp:{" "}
              {proposal.requiredDeliveryDate
                ? new Date(proposal.requiredDeliveryDate).toLocaleDateString("vi-VN")
                : "Chưa nhập"}
            </p>
          </div>

          <div className="sm:col-span-2 lg:col-span-4 rounded-xl bg-slate-50 p-4 border border-slate-200">
            <span className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Lý do mua hàng
            </span>
            <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap">
              {proposal.purchaseReason || "Chưa nhập"}
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 2: DANH SÁCH VẬT TƯ (Golden 2-Level Header Structure) */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between bg-slate-50 p-4 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
            <Layers className="h-4 w-4 text-blue-600" />
            CHI TIẾT DANH SÁCH VẬT TƯ ({proposal.items.length} mục)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-slate-100/90 text-slate-800 font-bold border-b border-slate-200">
              {/* Row 1 Header */}
              <tr>
                <th
                  rowSpan={2}
                  className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 text-center font-bold w-12"
                >
                  STT
                </th>
                <th
                  rowSpan={2}
                  className="whitespace-nowrap border-r border-slate-200 px-4 py-2.5 text-left font-bold min-w-[280px]"
                >
                  TÊN VẬT TƯ / VẬT LIỆU
                </th>
                <th
                  rowSpan={2}
                  className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 text-center font-bold w-20"
                >
                  ĐƠN VỊ
                </th>
                <th
                  colSpan={2}
                  className="whitespace-nowrap border-b border-r border-slate-200 px-4 py-1.5 text-center font-bold bg-slate-200/60"
                >
                  KHỐI LƯỢNG
                </th>
                <th
                  rowSpan={2}
                  className="whitespace-nowrap border-r border-slate-200 px-4 py-2.5 text-left font-bold min-w-[220px]"
                >
                  QUY CÁCH / THÔNG SỐ KỸ THUẬT
                </th>
                <th
                  rowSpan={2}
                  className="whitespace-nowrap border-r border-slate-200 px-4 py-2.5 text-left font-bold min-w-[200px]"
                >
                  HÃNG SẢN XUẤT / XUẤT XỨ
                </th>
                <th
                  rowSpan={2}
                  className="whitespace-nowrap px-4 py-2.5 text-left font-bold min-w-[180px]"
                >
                  GHI CHÚ
                </th>
              </tr>
              {/* Row 2 Header */}
              <tr>
                <th className="whitespace-nowrap border-r border-slate-200 px-3 py-1.5 text-center font-bold w-32 bg-slate-100">
                  THEO HỢP ĐỒNG
                </th>
                <th className="whitespace-nowrap border-r border-slate-200 px-3 py-1.5 text-center font-bold w-32 bg-slate-100 text-blue-900">
                  THỰC TẾ
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 bg-white">
              {proposal.items.map((item, index) => {
                const isSectionHeader =
                  item.sectionName &&
                  (index === 0 || proposal.items[index - 1].sectionName !== item.sectionName);

                const sequenceNum = index + 1;

                return (
                  <Fragment key={item.id}>
                    {/* Section Header Row */}
                    {isSectionHeader && (
                      <tr className="bg-slate-100/90 font-bold text-slate-900 border-y border-slate-300">
                        <td colSpan={8} className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-blue-600 shrink-0" />
                            <span className="text-xs uppercase text-slate-500 font-bold">
                              Phần vật tư:
                            </span>
                            <span className="text-xs font-bold text-blue-900">
                              {item.sectionName}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}

                    <tr className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-3 py-2.5 text-center font-semibold text-slate-600 border-r border-slate-100 align-middle">
                        {sequenceNum}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-slate-900 border-r border-slate-100 align-middle whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word] min-w-[280px]">
                        {item.materialName}
                        {item.materialItemId ? (
                          <span className="ml-2 inline-block rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 whitespace-nowrap">
                            Danh mục
                          </span>
                        ) : (
                          <span className="ml-2 inline-block rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 whitespace-nowrap">
                            Ngoài danh mục
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center font-medium text-slate-700 border-r border-slate-100 align-middle whitespace-nowrap">
                        {item.unit}
                      </td>
                      <td className="px-3 py-2.5 text-center text-slate-600 border-r border-slate-100 align-middle whitespace-nowrap">
                        {item.contractQuantityText || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold text-blue-900 border-r border-slate-100 align-middle whitespace-nowrap">
                        {String(item.actualQuantity)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 text-xs border-r border-slate-100 align-middle whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word] min-w-[200px]">
                        {item.specification || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 text-xs border-r border-slate-100 align-middle whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word] min-w-[180px]">
                        {item.manufacturerOrigin || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 text-xs align-middle whitespace-pre-wrap [overflow-wrap:anywhere] [word-break:break-word] min-w-[160px]">
                        {item.note || "—"}
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
