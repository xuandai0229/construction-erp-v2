"use client";

import React from "react";
import type { FieldReport } from "./types";
import { 
  normalizeVietnameseText, 
  normalizeVietnameseUppercase, 
  cleanPrintableVietnameseText 
} from "@/lib/vietnamese-text";

interface ReportPrintTemplateProps {
  report: FieldReport;
}

export function translateRole(role?: string | null) {
  if (!role) return "Người lập";
  switch (role.toUpperCase()) {
    case "CHIEF_COMMANDER": return "Chỉ huy trưởng";
    case "PROJECT_MANAGER": return "Quản lý dự án";
    case "ENGINEER": return "Kỹ sư";
    case "ACCOUNTANT": return "Kế toán";
    case "ADMIN": return "Giám đốc";
    case "DIRECTOR": return "Giám đốc";
    case "DEPUTY_DIRECTOR": return "Phó giám đốc";
    default: return role;
  }
}

// Format date into: Ngày ... tháng ... năm ...
function formatVietnamDateFull(dateString: string) {
  if (!dateString) return "";
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `Ngày ${parts[2]} tháng ${parts[1]} năm ${parts[0]}`;
    }
    const d = new Date(dateString);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `Ngày ${day} tháng ${month} năm ${year}`;
    }
  } catch {}
  return dateString;
}

// Format date into: DD/MM/YYYY
function formatVietnamDateShort(dateString: string) {
  if (!dateString) return "";
  try {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateString);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch {}
  return dateString;
}

import { formatNumberSafe } from "@/lib/reports/report-format-utils";
import {
  formatProgressPercentDisplay,
  formatProgressQuantityDisplay,
  normalizeReportProgressLine,
} from "@/lib/reports/report-progress-display";

function formatQuantity(value: unknown) {
  if (value === null || value === undefined) return "-";
  return formatNumberSafe(value, { maximumFractionDigits: 2 });
}

function getPrintableProgressLine(line: FieldReport["workLines"][number], reportType: FieldReport["type"]) {
  return normalizeReportProgressLine({
    reportType,
    designQuantity: line.designQuantity,
    quantityBefore: line.quantityBefore,
    quantityToday: line.quantityToday,
    quantityCumulative: line.quantityCumulative,
    remainingQuantity: line.remainingQuantity,
    progressPercent: line.progressPercent,
  });
}

export function ReportPrintTemplate({ report }: ReportPrintTemplateProps) {
  const isWeekly = report.type === "WEEKLY";
  
  // Clean notes in worklines
  const lines = (report.workLines || []).map(line => ({
    ...line,
    note: cleanPrintableVietnameseText(line.note),
    issueNote: cleanPrintableVietnameseText(line.issueNote),
    proposalNote: cleanPrintableVietnameseText(line.proposalNote)
  }));
  const printableSummary = cleanPrintableVietnameseText(report.summary);
  const printableLabor = cleanPrintableVietnameseText(report.labor);
  const printableMaterials = cleanPrintableVietnameseText(report.materials);
  const printableQuality = cleanPrintableVietnameseText(report.quality);
  const printableIssues = cleanPrintableVietnameseText(report.issues);
  const printableRecommendations = cleanPrintableVietnameseText(report.recommendations);

  const hasPhotos = report.photos && report.photos.length > 0;
  const hasFiles = report.attachments && report.attachments.length > 0;
  const hasMaterials = !!report.materials;
  const hasLabor = !!report.labor;

  // Determine next week plan
  const nextWeekPlan = isWeekly && report.weeklyNote?.nextWeekPlan 
    ? report.weeklyNote.nextWeekPlan 
    : [];
  
  // Adjust Section counter dynamically
  let sectionCounter = 6;
  const getNextSection = () => sectionCounter++;

  return (
    <div className="print-area bg-white text-black font-serif text-[14px] leading-relaxed mx-auto w-full max-w-[210mm] p-4 sm:p-8" style={{ fontFamily: '"Times New Roman", Times, serif', textRendering: 'optimizeLegibility', fontKerning: 'normal' }}>
      {/* CSS specific for print */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            font-family: "Times New Roman", Times, serif !important;
            text-rendering: optimizeLegibility !important;
            font-kerning: normal !important;
          }
          .print-area {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          .page-break-inside-avoid {
            page-break-inside: avoid;
          }
          .print-hidden {
            display: none !important;
          }
          table {
            border-collapse: collapse;
            overflow-wrap: break-word;
          }
          th, td {
            border: 1px solid black !important;
          }
        }
      `}} />

      {/* Header Hành Chính */}
      <div className="flex justify-between items-start mb-8 text-[13px]">
        <div className="text-center font-bold">
          <p>{normalizeVietnameseUppercase("CÔNG TY CỔ PHẦN XÂY DỰNG")}</p>
          <p>{normalizeVietnameseUppercase("VÀ THƯƠNG MẠI SỐ 2 HÀ NỘI")}</p>
          <div className="w-1/3 h-[1px] bg-black mx-auto mt-1 mb-2"></div>
          <p className="font-normal mt-2">Số: ……./………</p>
        </div>
        <div className="text-center font-bold">
          <p>{normalizeVietnameseUppercase("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM")}</p>
          <p className="font-bold">{normalizeVietnameseText("Độc lập - Tự do - Hạnh phúc")}</p>
          <div className="w-1/2 h-[1px] bg-black mx-auto mt-1 mb-2"></div>
          <p className="font-normal italic text-[12px] mt-2">Hà Nội, {formatVietnamDateFull(report.date)}</p>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-6">
        <h1 className="text-[20px] font-bold mb-1">
          {isWeekly ? normalizeVietnameseUppercase("BÁO CÁO KẾT QUẢ TUẦN") : normalizeVietnameseUppercase("BÁO CÁO THI CÔNG NGÀY")}
        </h1>
        <p className="italic text-[13px]">
          {isWeekly 
            ? `Từ ngày ${formatVietnamDateShort(report.weekStartDate || report.date)} đến ngày ${formatVietnamDateShort(report.weekEndDate || report.date)}`
            : formatVietnamDateFull(report.date)}
        </p>
      </div>

      {/* Meta info block */}
      <div className="mb-4 text-[14px]">
        <table className="w-full border-none">
          <tbody>
            <tr>
              <td className="border-none py-1 w-[20px] font-bold align-top">1.</td>
              <td className="border-none py-1 w-[160px] font-bold align-top">Dự án</td>
              <td className="border-none py-1 align-top">: {normalizeVietnameseText(report.projectName)}</td>
            </tr>
            <tr>
              <td className="border-none py-1 font-bold align-top">2.</td>
              <td className="border-none py-1 font-bold align-top">Mã báo cáo</td>
              <td className="border-none py-1 align-top">: {normalizeVietnameseText(report.reportNo)}</td>
            </tr>
            <tr>
              <td className="border-none py-1 font-bold align-top">3.</td>
              <td className="border-none py-1 font-bold align-top">Người lập báo cáo</td>
              <td className="border-none py-1 align-top">: {normalizeVietnameseText(report.creatorName)} – {normalizeVietnameseText(translateRole(report.creatorRole))}</td>
            </tr>
            <tr>
              <td className="border-none py-1 font-bold align-top">4.</td>
              <td className="border-none py-1 font-bold align-top">Thời gian báo cáo</td>
              <td className="border-none py-1 align-top">: {isWeekly ? `Từ ngày ${formatVietnamDateShort(report.weekStartDate || report.date)} đến ngày ${formatVietnamDateShort(report.weekEndDate || report.date)}` : formatVietnamDateShort(report.date)}</td>
            </tr>
            {!isWeekly && report.weatherCondition && (
              <tr>
                <td className="border-none py-1 font-bold align-top">5.</td>
                <td className="border-none py-1 font-bold align-top">Thời tiết trong ngày</td>
                <td className="border-none py-1 align-top">: {report.weatherCondition === 'SUNNY' ? 'Nắng' : 
                   report.weatherCondition === 'CLOUDY' ? 'Có mây' :
                   report.weatherCondition === 'LIGHT_RAIN' ? 'Mưa nhẹ' :
                   report.weatherCondition === 'HEAVY_RAIN' ? 'Mưa lớn' :
                   report.weatherCondition === 'STORM' ? 'Bão' :
                   report.weatherCondition === 'WINDY' ? 'Gió mạnh' : 'Âm u'}
                  {report.weatherTemperature ? ` (${report.weatherTemperature}°C)` : ''}
                </td>
              </tr>
            )}
            {!isWeekly && report.gpsLocation && (
              <tr>
                <td className="border-none py-1 font-bold align-top">6.</td>
                <td className="border-none py-1 font-bold align-top">Vị trí GPS</td>
                <td className="border-none py-1 align-top">: {normalizeVietnameseText(report.gpsLocation)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isWeekly && report.summary && (
        <div className="mb-4 text-[14px]">
          <p className="font-bold mb-1">{getNextSection()}. Tình hình thi công trong tuần</p>
          <div className="pl-4 whitespace-pre-line text-left">
            {printableSummary}
          </div>
        </div>
      )}

      {/* Nội dung công việc thực hiện */}
      <div className="mb-4">
        <p className="font-bold mb-2">{getNextSection()}. {isWeekly ? "Tổng hợp khối lượng thực hiện trong tuần" : "Nội dung công việc thực hiện"}</p>
        
        {lines.length > 0 ? (
          isWeekly ? (
            <table className="w-full border border-black mb-2 text-[12px] ml-4" style={{ width: 'calc(100% - 16px)' }}>
              <thead>
                <tr className="bg-gray-100 font-bold text-center">
                  <th className="border border-black py-2 px-1 w-[30px]">STT</th>
                  <th className="border border-black py-2 px-1 text-left">Hạng mục / Công việc</th>
                  <th className="border border-black py-2 px-1 w-[40px]">ĐVT</th>
                  <th className="border border-black py-2 px-1 w-[60px]">Thiết kế</th>
                  <th className="border border-black py-2 px-1 w-[60px]">Trước tuần</th>
                  <th className="border border-black py-2 px-1 w-[60px]">Tuần này</th>
                  <th className="border border-black py-2 px-1 w-[60px]">Lũy kế</th>
                  <th className="border border-black py-2 px-1 w-[60px]">Còn lại</th>
                  <th className="border border-black py-2 px-1 w-[50px]">%</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx} className="page-break-inside-avoid text-center">
                    <td className="border border-black py-1 px-1">{idx + 1}</td>
                    <td className="border border-black py-1 px-1 text-left">
                      {normalizeVietnameseText(line.workContent)}
                      {line.categoryName && <span className="block text-[10px] italic text-gray-600 mt-1">Khu vực: {normalizeVietnameseText(line.categoryName)}</span>}
                    </td>
                    <td className="border border-black py-1 px-1">{normalizeVietnameseText(line.unit) || "-"}</td>
                    <td className="border border-black py-1 px-1 text-right">{formatProgressQuantityDisplay(getPrintableProgressLine(line, report.type).designQuantity)}</td>
                    <td className="border border-black py-1 px-1 text-right">{formatProgressQuantityDisplay(getPrintableProgressLine(line, report.type).quantityBefore)}</td>
                    <td className="border border-black py-1 px-1 text-right font-bold text-blue-700">{formatProgressQuantityDisplay(getPrintableProgressLine(line, report.type).quantityToday)}</td>
                    <td className="border border-black py-1 px-1 text-right text-emerald-700 font-bold">{formatProgressQuantityDisplay(getPrintableProgressLine(line, report.type).quantityCumulative)}</td>
                    <td className="border border-black py-1 px-1 text-right">{formatProgressQuantityDisplay(getPrintableProgressLine(line, report.type).remainingQuantity)}</td>
                    <td className="border border-black py-1 px-1">{formatProgressPercentDisplay(getPrintableProgressLine(line, report.type).progressPercent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full border border-black mb-2 text-[13px] ml-4" style={{ width: 'calc(100% - 16px)' }}>
              <thead>
                <tr className="bg-gray-100 font-bold text-center">
                  <th className="border border-black py-2 px-2 w-[40px]">STT</th>
                  <th className="border border-black py-2 px-2 text-left">Hạng mục / Công việc</th>
                  <th className="border border-black py-2 px-2 w-[60px]">Đơn vị</th>
                  <th className="border border-black py-2 px-2 w-[80px]">Khối lượng</th>
                  <th className="border border-black py-2 px-2 w-[200px] text-left">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx} className="page-break-inside-avoid">
                    <td className="border border-black py-1 px-2 text-center">{idx + 1}</td>
                    <td className="border border-black py-1 px-2">
                      {normalizeVietnameseText(line.workContent)}
                      {line.categoryName && <span className="block text-[11px] italic text-gray-600 mt-1">Khu vực: {normalizeVietnameseText(line.categoryName)}</span>}
                    </td>
                    <td className="border border-black py-1 px-2 text-center">{normalizeVietnameseText(line.unit) || "-"}</td>
                    <td className="border border-black py-1 px-2 text-right">
                      {line.quantityToday !== undefined && line.quantityToday !== null ? formatQuantity(line.quantityToday) : "-"}
                    </td>
                    <td className="border border-black py-1 px-2 text-[12px]">
                      <div className="text-[11px] leading-snug">
                        TK: {formatProgressQuantityDisplay(getPrintableProgressLine(line, report.type).designQuantity)}; Trước: {formatProgressQuantityDisplay(getPrintableProgressLine(line, report.type).quantityBefore)};
                        Lũy kế: {formatProgressQuantityDisplay(getPrintableProgressLine(line, report.type).quantityCumulative)}; Còn lại: {formatProgressQuantityDisplay(getPrintableProgressLine(line, report.type).remainingQuantity)};
                        HT: {formatProgressPercentDisplay(getPrintableProgressLine(line, report.type).progressPercent)}
                      </div>
                      {line.note && line.note !== "-" ? normalizeVietnameseText(line.note) : ""}
                      {line.proposalNote && line.proposalNote !== "-" ? (
                        <>
                          {line.note && line.note !== "-" ? <br /> : ""}
                          <span className="italic">Đề xuất: {normalizeVietnameseText(line.proposalNote)}</span>
                        </>
                      ) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          <p className="italic pl-4">{isWeekly ? "Chưa có dữ liệu khối lượng từ báo cáo ngày trong tuần." : "Không có khối lượng công việc được ghi nhận."}</p>
        )}
      </div>

      {/* Kế hoạch tuần sau (WEEKLY) */}
      {isWeekly && nextWeekPlan.length > 0 && (
        <div className="mb-4 page-break-inside-avoid">
          <p className="font-bold mb-2">{getNextSection()}. Kế hoạch thực hiện tuần sau</p>
          <table className="w-full border border-black mb-2 text-[11px] ml-4" style={{ width: 'calc(100% - 16px)' }}>
            <thead>
              <tr className="bg-gray-100 font-bold text-center">
                <th className="border border-black py-2 px-1 text-left">Nội dung công việc</th>
                <th className="border border-black py-2 px-1 w-[40px]">ĐVT</th>
                <th className="border border-black py-2 px-1 w-[60px]">Còn lại</th>
                <th className="border border-black py-2 px-1 w-[60px]">KL Tuần tới</th>
                <th className="border border-black py-2 px-1 w-[70px]">Từ ngày</th>
                <th className="border border-black py-2 px-1 w-[70px]">Đến ngày</th>
                <th className="border border-black py-2 px-1 w-[80px]">Phụ trách</th>
                <th className="border border-black py-2 px-1 w-[60px]">Vật tư</th>
                <th className="border border-black py-2 px-1 w-[60px]">Thiết bị</th>
                <th className="border border-black py-2 px-1 w-[80px]">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {nextWeekPlan.map((item, iIdx) => (
                <tr key={iIdx} className="page-break-inside-avoid">
                  <td className="border border-black py-1 px-1">{normalizeVietnameseText(item.workContent)}</td>
                  <td className="border border-black py-1 px-1 text-center">{normalizeVietnameseText(item.unit) || "-"}</td>
                  <td className="border border-black py-1 px-1 text-right">{item.remainingQuantity !== undefined && item.remainingQuantity !== null ? formatQuantity(item.remainingQuantity) : "-"}</td>
                  <td className="border border-black py-1 px-1 text-right font-bold text-blue-700">{item.plannedQuantityNextWeek !== undefined && item.plannedQuantityNextWeek !== null ? formatQuantity(item.plannedQuantityNextWeek) : "-"}</td>
                  <td className="border border-black py-1 px-1 text-center">{item.plannedStartDate ? item.plannedStartDate.split("-").reverse().join("/") : "-"}</td>
                  <td className="border border-black py-1 px-1 text-center">{item.plannedEndDate ? item.plannedEndDate.split("-").reverse().join("/") : "-"}</td>
                  <td className="border border-black py-1 px-1 text-center">{normalizeVietnameseText(item.constructionCrew) || "-"}</td>
                  <td className="border border-black py-1 px-1 text-center">{normalizeVietnameseText(item.materialNeeds) || "-"}</td>
                  <td className="border border-black py-1 px-1 text-center">{normalizeVietnameseText(item.equipmentNeeds) || "-"}</td>
                  <td className="border border-black py-1 px-1 text-[10px] italic">{normalizeVietnameseText(item.riskNote) || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Nguồn lực sử dụng */}
      {(!isWeekly || hasMaterials || hasLabor) && (
        <div className="mb-4 page-break-inside-avoid">
          <p className="font-bold mb-1">{getNextSection()}. Nguồn lực sử dụng{isWeekly ? " trong tuần" : ""}</p>
          <ul className="list-disc pl-8">
            <li><span className="font-bold">Nhân công / Máy móc:</span> {report.labor ? printableLabor : "Không ghi nhận"}</li>
            <li><span className="font-bold">Vật tư sử dụng:</span> {report.materials ? printableMaterials : "Không ghi nhận"}</li>
          </ul>
        </div>
      )}

      {/* Chất lượng, An toàn, Vấn đề */}
      <div className="mb-4 page-break-inside-avoid">
        <p className="font-bold mb-1">{getNextSection()}. Chất lượng / An toàn / Vấn đề phát sinh{isWeekly ? " trong tuần" : ""}</p>
        <ul className="list-disc pl-8">
          <li><span className="font-bold">Chất lượng / An toàn:</span> {report.quality ? printableQuality : "Đảm bảo yêu cầu"}</li>
          <li><span className="font-bold">Vấn đề phát sinh:</span> {report.issues ? printableIssues : "Không có sự cố nghiêm trọng."}</li>
        </ul>
      </div>

      {/* Kiến nghị / Đề xuất */}
      <div className="mb-4 page-break-inside-avoid">
        <p className="font-bold mb-1">{getNextSection()}. Kiến nghị / Đề xuất</p>
        <div className="pl-4 whitespace-pre-line text-left">
          {report.recommendations ? printableRecommendations : "Không có"}
        </div>
      </div>

      {/* Tài liệu hình ảnh */}
      <div className="mb-6 page-break-inside-avoid">
        <p className="font-bold mb-2">{getNextSection()}. Tài liệu, hình ảnh đính kèm</p>
        
        {!hasPhotos && !hasFiles && (
          <p className="italic pl-4">Không có tài liệu/hình ảnh đính kèm.</p>
        )}

        {hasFiles && (
          <ul className="list-disc pl-8 mb-3">
            {report.attachments.map(file => (
              <li key={file.id}>
                {normalizeVietnameseText(file.name)} 
                {file.isMissing ? " (Tệp không khả dụng)" : ""}
              </li>
            ))}
          </ul>
        )}

        {hasPhotos && (
          <ul className="list-disc pl-8 mb-2">
             {report.photos.map((photo, i) => (
               <li key={photo.id}>{normalizeVietnameseText(photo.caption) || `Ảnh hiện trường ${i+1}`}</li>
             ))}
          </ul>
        )}

        {hasPhotos && (
          <div className="grid grid-cols-2 gap-4 ml-4 mt-2">
            {report.photos.map((photo, i) => (
              <div key={photo.id} className="text-center page-break-inside-avoid border border-gray-300 p-2">
                {photo.isMissing ? (
                  <div className="w-full h-[150px] bg-gray-100 flex items-center justify-center text-gray-500 italic">
                    Ảnh hiện trường: {normalizeVietnameseText(photo.caption) || `Ảnh ${i+1}`} (lỗi không khả dụng)
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={photo.url || ""} 
                    alt={normalizeVietnameseText(photo.caption) || `Ảnh ${i+1}`}
                    className="max-w-full h-[180px] object-contain mx-auto mb-1"
                  />
                )}
                <p className="text-[12px] italic">{normalizeVietnameseText(photo.caption) || `Hình ảnh ${i+1}`}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Signature Section */}
      <div className="mt-12 page-break-inside-avoid flex justify-end">
        <div className="w-[250px] text-center">
          <p className="font-bold mb-1">Người lập báo cáo</p>
          <p className="italic text-[13px] text-gray-600">(Ký, ghi rõ họ tên)</p>
          <div className="h-[80px]"></div> {/* Space for signature */}
          <p className="font-bold">{normalizeVietnameseUppercase(report.creatorName)}</p>
        </div>
      </div>
    </div>
  );
}
