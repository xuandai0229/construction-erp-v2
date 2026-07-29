import React from "react";
import type { WeeklyCompanySummary } from "@/lib/reports/weekly-company-summary";

function formatDateShortVN(ymd: string): string {
  if (!ymd) return "";
  const parts = ymd.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return ymd;
}

function formatDateFullVN(isoString: string): string {
  try {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `Hà Nội, ngày ${day} tháng ${month} năm ${year}`;
  } catch {
    return "Hà Nội, ngày ... tháng ... năm ...";
  }
}

export function WeeklySummaryPrintTemplate({
  data,
}: {
  data: WeeklyCompanySummary;
}) {
  const { week, generatedAt, summaryCounts, projects } = data;

  return (
    <div
      className="print-area bg-white text-black font-serif text-[13px] leading-relaxed mx-auto w-full max-w-[210mm] p-6 sm:p-10"
      style={{
        fontFamily: '"Times New Roman", Times, serif',
        textRendering: "optimizeLegibility",
      }}
    >
      {/* Header Hành Chính */}
      <div className="flex justify-between items-start mb-6 text-[12.5px]">
        <div className="text-center font-bold uppercase leading-tight">
          <p>CÔNG TY CỔ PHẦN XÂY DỰNG</p>
          <p>VÀ THƯƠNG MẠI SỐ 2 HÀ NỘI</p>
          <div className="w-24 h-[1px] bg-black mx-auto my-1"></div>
          <p className="font-normal text-[11px] normal-case mt-1">
            Số: ................
          </p>
        </div>
        <div className="text-center font-bold leading-tight">
          <p className="uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
          <p className="font-bold normal-case">Độc lập - Tự do - Hạnh phúc</p>
          <div className="w-32 h-[1px] bg-black mx-auto my-1"></div>
          <p className="font-normal italic text-[11.5px] mt-1 normal-case">
            {formatDateFullVN(generatedAt)}
          </p>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-6">
        <h1 className="text-[18px] font-bold uppercase tracking-wide mb-1">
          TỔNG HỢP BÁO CÁO TUẦN
        </h1>
        <p className="font-semibold text-[13px]">
          Tuần {week.weekNumber} (Từ ngày {formatDateShortVN(week.weekStartDate)}{" "}
          đến ngày {formatDateShortVN(week.weekEndDate)})
        </p>
      </div>

      {/* Section 1: Thống kê */}
      <div className="mb-6">
        <p className="font-bold text-[14px] mb-2 uppercase">
          1. Thống kê tình hình báo cáo
        </p>
        <table className="w-full border border-black text-center text-[12px]">
          <thead>
            <tr className="bg-gray-100 font-bold">
              <th className="border border-black p-2">Tổng số công trình</th>
              <th className="border border-black p-2">Đã có báo cáo</th>
              <th className="border border-black p-2">Chưa có báo cáo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-2 font-bold">{summaryCounts.totalProjects}</td>
              <td className="border border-black p-2 font-bold text-emerald-800">{summaryCounts.reportedProjects}</td>
              <td className="border border-black p-2 font-bold text-slate-700">{summaryCounts.missingProjects}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section 2: Bảng tổng hợp các công trình */}
      <div className="mb-6">
        <p className="font-bold text-[14px] mb-2 uppercase">
          2. Bảng tổng hợp kết quả các công trình
        </p>
        <table className="w-full border border-black text-[11.5px] border-collapse">
          <thead>
            <tr className="bg-gray-100 font-bold text-center">
              <th className="border border-black p-1.5 w-[32px]">STT</th>
              <th className="border border-black p-1.5 text-left w-[160px]">Công trình</th>
              <th className="border border-black p-1.5 text-left">Kết quả chính trong tuần</th>
              <th className="border border-black p-1.5 text-left w-[130px]">Vướng mắc</th>
              <th className="border border-black p-1.5 text-left w-[130px]">Cần Ban Giám đốc xử lý</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p, idx) => (
              <tr key={p.id} className="align-top">
                <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                <td className="border border-black p-1.5">
                  <div className="font-bold">{p.name}</div>
                  <div className="text-[10px] text-gray-600">Mã: {p.code}</div>
                  {p.reporter && (
                    <div className="text-[10px] italic text-gray-600">Phụ trách: {p.reporter}</div>
                  )}
                </td>
                <td className="border border-black p-1.5">
                  {p.hasReport ? p.result : <span className="italic text-gray-500">Chưa có báo cáo tuần.</span>}
                </td>
                <td className="border border-black p-1.5">
                  {p.hasReport ? p.issues || "Không có" : "-"}
                </td>
                <td className="border border-black p-1.5 font-semibold">
                  {p.hasReport ? p.supportNeeded || "Không có" : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
