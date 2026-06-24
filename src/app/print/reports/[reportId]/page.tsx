import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { PrintReportToolbar } from "@/components/reports/print-report-toolbar";

const formatFileSize = (bytes: number | null | undefined | string | bigint) => {
  if (bytes === undefined || bytes === null || bytes === "") return "Không rõ dung lượng";
  const num = Number(bytes);
  if (isNaN(num)) return "Không rõ dung lượng";
  if (num === 0) return "0 Bytes";
  if (num < 1024) return "< 1 KB";
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  const mb = num / (1024 * 1024);
  if (mb < 0.01) return "< 0.01 MB";
  return `${mb.toFixed(2)} MB`;
};

export const metadata = {
  title: "In Báo Cáo Hiện Trường",
};

export default async function PrintReportPage({ params }: { params: Promise<{ reportId: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { reportId } = await params;

  const report = await prisma.siteReport.findUnique({
    where: { id: reportId },
    include: {
      project: true,
      createdBy: true,
      lines: { orderBy: { sortOrder: 'asc' } },
      attachments: true,
    }
  });

  if (!report) notFound();

  if (report.project?.deletedAt) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full text-center border border-red-100">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Báo cáo không khả dụng</h1>
          <p className="text-slate-600 mb-6">Công trình của báo cáo này đã bị xóa hoặc không còn hoạt động trên hệ thống.</p>
          <a href="/reports" className="inline-block px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 transition-colors">
            Quay lại danh sách
          </a>
        </div>
      </div>
    );
  }

  // Fetch audit logs separately
  const auditLogs = await prisma.auditLog.findMany({
    where: { entityType: "SiteReport", entityId: reportId },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  });

  // Authorization MVP
  const isSystemAdmin = ['ADMIN', 'DIRECTOR'].includes(session.role);
  if (!isSystemAdmin && report.createdById !== session.id) {
    return (
      <div className="p-8 text-center text-red-600 font-bold">
        Bạn không có quyền xem báo cáo này (Mã: {report.reportNo}).
        {/* TODO: Implement ProjectUser RBAC */}
      </div>
    );
  }

  const mappedAttachments = report.attachments.map(a => {
    const physicalPath = a.storagePath ? path.join(process.cwd(), a.storagePath.startsWith('storage') ? '' : 'storage', a.storagePath) : "";
    const isMissing = a.storagePath ? !fs.existsSync(physicalPath) : true;
    return { ...a, isMissing };
  });

  const photos = mappedAttachments.filter(a => a.kind === "PHOTO");
  const files = mappedAttachments.filter(a => a.kind === "FILE");

  // Format Status
  const getStatusText = (status: string) => {
    switch(status) {
      case 'APPROVED': return 'Đã duyệt';
      case 'SUBMITTED': return 'Chờ duyệt / Đã gửi';
      case 'REJECTED': return 'Từ chối';
      case 'DRAFT': return 'Bản nháp';
      default: return status;
    }
  };

  // Format Weather
  const getWeatherText = (weather: string | null) => {
    switch(weather) {
      case 'SUNNY': return 'Nắng';
      case 'CLOUDY': return 'Có mây';
      case 'OVERCAST': return 'Âm u';
      case 'LIGHT_RAIN': return 'Mưa nhẹ';
      case 'HEAVY_RAIN': return 'Mưa lớn';
      case 'WINDY': return 'Gió mạnh';
      case 'STORM': return 'Bão';
      default: return 'Khác';
    }
  };

  const isWeekly = report.type === 'WEEKLY';

  return (
    <div className="print-container max-w-4xl mx-auto bg-white min-h-screen text-slate-900 font-sans p-8">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4; margin: 15mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
          .avoid-break { page-break-inside: avoid; }
          .print-container { padding: 0; max-width: 100%; box-shadow: none; }
        }
      `}} />
      
      {/* Action Bar (Client Component) */}
      <PrintReportToolbar />

      {/* Header */}
      <div className="text-center mb-8 avoid-break">
        <h2 className="text-sm font-semibold mb-2">CT2 Hà Nội</h2>
        <h1 className="text-2xl font-bold uppercase mb-2">
          {isWeekly ? 'BÁO CÁO HIỆN TRƯỜNG TUẦN' : 'BÁO CÁO HIỆN TRƯỜNG NGÀY'}
        </h1>
        <p className="text-slate-600 italic">Mã báo cáo: {report.reportNo}</p>
      </div>

      {/* Meta Info */}
      <div className="grid grid-cols-2 gap-4 mb-8 text-sm avoid-break border border-slate-300 p-4 rounded-md">
        <div>
          <p><span className="font-semibold w-24 inline-block">Công trình:</span> {report.project?.name}</p>
          <p>
            <span className="font-semibold w-24 inline-block">Thời gian:</span> 
            {isWeekly 
              ? `Từ ${format(report.weekStartDate!, 'dd/MM/yyyy')} đến ${format(report.weekEndDate!, 'dd/MM/yyyy')}`
              : format(report.reportDate, 'EEEE, dd/MM/yyyy', { locale: vi })}
          </p>
          <p><span className="font-semibold w-24 inline-block">Người lập:</span> {report.reporterName || report.createdBy?.name || 'N/A'}</p>
        </div>
        <div>
          <p><span className="font-semibold w-24 inline-block">Trạng thái:</span> <span className="font-bold">{getStatusText(report.status)}</span></p>
          {!isWeekly && (
            <p>
              <span className="font-semibold w-24 inline-block">Thời tiết:</span> 
              {getWeatherText(report.weatherCondition)} {report.weatherTemperature ? `(${report.weatherTemperature}°C)` : ''}
            </p>
          )}
        </div>
      </div>

      {!isWeekly ? (
        // ================= DAILY REPORT =================
        <>
          {/* 1. Chi tiết công việc */}
          <div className="mb-8 avoid-break">
            <h3 className="text-base font-bold mb-3 uppercase">1. Chi tiết công việc</h3>
            <table className="w-full border-collapse border border-slate-400 text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-400 py-2 px-2 w-12 text-center">STT</th>
                  <th className="border border-slate-400 py-2 px-3 text-left">Hạng mục / Công việc</th>
                  <th className="border border-slate-400 py-2 px-3 text-left w-32">Khu vực</th>
                  <th className="border border-slate-400 py-2 px-2 text-center w-20">ĐVT</th>
                  <th className="border border-slate-400 py-2 px-3 text-right w-28">Khối lượng</th>
                  <th className="border border-slate-400 py-2 px-3 text-left w-48">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {report.lines.length > 0 ? report.lines.map((line, idx) => (
                  <tr key={line.id}>
                    <td className="border border-slate-400 py-1.5 px-2 text-center">{idx + 1}</td>
                    <td className="border border-slate-400 py-1.5 px-3">{line.workName || line.workContent}</td>
                    <td className="border border-slate-400 py-1.5 px-3">{line.area || '-'}</td>
                    <td className="border border-slate-400 py-1.5 px-2 text-center">{line.unit || '-'}</td>
                    <td className="border border-slate-400 py-1.5 px-3 text-right font-medium">{Number(line.quantityToday)}</td>
                    <td className="border border-slate-400 py-1.5 px-3 text-slate-600 text-xs">{line.note || '-'}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="border border-slate-400 py-4 text-center text-slate-500">
                      Không có dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 2. Nguồn lực & Vấn đề */}
          <div className="mb-8 avoid-break space-y-4 text-sm">
            <h3 className="text-base font-bold mb-3 uppercase">2. Nguồn lực & Vấn đề</h3>
            {!report.materials && !report.labor && !report.quality && !report.issues && !report.recommendations && (
               <div className="text-slate-500 italic">Không có dữ liệu</div>
            )}
            {report.materials && <div><span className="font-semibold underline">Vật tư:</span> {report.materials}</div>}
            {report.labor && <div><span className="font-semibold underline">Nhân công/Máy móc:</span> {report.labor}</div>}
            {report.quality && <div><span className="font-semibold underline">Chất lượng/An toàn:</span> {report.quality}</div>}
            {report.issues && <div><span className="font-semibold underline">Vấn đề phát sinh:</span> {report.issues}</div>}
            {report.recommendations && <div><span className="font-semibold underline">Kiến nghị:</span> {report.recommendations}</div>}
          </div>

          {/* 3. Tài liệu đính kèm */}
          <div className="mb-8 avoid-break">
            <h3 className="text-base font-bold mb-2 uppercase">3. Tài liệu đính kèm</h3>
            {files.length > 0 ? (
              <ul className="list-disc pl-5 text-sm">
                {files.map(f => (
                  <li key={f.id}>
                    {f.originalName || f.fileName} ({formatFileSize(f.sizeBytes)})
                    {f.isMissing && <span className="text-amber-600 font-medium ml-2">(Tệp không khả dụng)</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 italic">Không có tài liệu</p>
            )}
          </div>
        </>
      ) : (
        // ================= WEEKLY REPORT =================
        <>
          {/* 1. Tổng quan tuần & Đánh giá */}
          <div className="mb-8 avoid-break space-y-4 text-sm">
            <h3 className="text-base font-bold mb-3 uppercase">1. Tổng quan & Đánh giá tuần</h3>
            <div>
              <p className="font-semibold mb-1 underline">Đánh giá tuần:</p>
              <div className="whitespace-pre-line border border-slate-200 p-3 rounded bg-slate-50">
                {report.summary || 'Không có đánh giá.'}
              </div>
            </div>
          </div>

          {/* 2. Tổng hợp công việc */}
          <div className="mb-8 avoid-break">
            <h3 className="text-base font-bold mb-3 uppercase">2. Tổng hợp công việc</h3>
            <table className="w-full border-collapse border border-slate-400 text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-400 py-2 px-2 w-12 text-center">STT</th>
                  <th className="border border-slate-400 py-2 px-3 text-left">Công việc</th>
                  <th className="border border-slate-400 py-2 px-2 text-center w-20">ĐVT</th>
                  <th className="border border-slate-400 py-2 px-3 text-right w-28">Khối lượng</th>
                  <th className="border border-slate-400 py-2 px-3 text-left w-48">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {report.lines.length > 0 ? report.lines.map((line, idx) => (
                  <tr key={line.id}>
                    <td className="border border-slate-400 py-1.5 px-2 text-center">{idx + 1}</td>
                    <td className="border border-slate-400 py-1.5 px-3">{line.workName || line.workContent}</td>
                    <td className="border border-slate-400 py-1.5 px-2 text-center">{line.unit || '-'}</td>
                    <td className="border border-slate-400 py-1.5 px-3 text-right font-medium">{Number(line.quantityToday)}</td>
                    <td className="border border-slate-400 py-1.5 px-3 text-slate-600 text-xs">{line.note || '-'}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="border border-slate-400 py-4 text-center text-slate-500">
                      Không có dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 3. Vấn đề & Kế hoạch */}
          <div className="mb-8 avoid-break space-y-4 text-sm">
            <h3 className="text-base font-bold mb-3 uppercase">3. Vấn đề phát sinh & Kiến nghị</h3>
            {!report.issues && !report.recommendations && (
               <div className="text-slate-500 italic">Không có dữ liệu</div>
            )}
            {report.issues && <div><span className="font-semibold underline">Vấn đề phát sinh tuần:</span> {report.issues}</div>}
            {report.recommendations && <div><span className="font-semibold underline">Kiến nghị / kế hoạch tuần sau:</span> {report.recommendations}</div>}
          </div>

          {/* 4. Tài liệu đính kèm */}
          <div className="mb-8 avoid-break">
            <h3 className="text-base font-bold mb-2 uppercase">4. Tài liệu đính kèm</h3>
            {files.length > 0 ? (
              <ul className="list-disc pl-5 text-sm">
                {files.map(f => (
                  <li key={f.id}>
                    {f.originalName || f.fileName} ({formatFileSize(f.sizeBytes)})
                    {f.isMissing && <span className="text-amber-600 font-medium ml-2">(Tệp không khả dụng)</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 italic">Không có tài liệu</p>
            )}
          </div>
        </>
      )}

      {/* History */}
      {auditLogs.length > 0 && (
        <div className="mb-8 avoid-break">
          <h3 className="text-base font-bold mb-2 uppercase">{isWeekly ? '5' : '4'}. Lịch sử trạng thái</h3>
          <ul className="list-inside text-sm space-y-1">
            {auditLogs.map(log => {
              const actionName = log.action.replace("SITE_REPORT_", "");
              let actionText = actionName;
              if (actionName === "SUBMITTED") actionText = "Gửi duyệt";
              else if (actionName === "APPROVED") actionText = "Đã duyệt";
              else if (actionName === "REJECTED") actionText = "Từ chối";
              else if (actionName === "REVISION_REQUESTED") actionText = "Yêu cầu chỉnh sửa";
              
              let detailText = "";
              if (log.afterData) {
                try {
                  const parsed = JSON.parse(log.afterData);
                  detailText = parsed.reason || parsed.note || "";
                } catch { /* ignore */ }
              }

              return (
                <li key={log.id} className="text-slate-700">
                  <span className="font-semibold">[{format(log.createdAt, 'dd/MM/yyyy HH:mm')}]</span> {actionText} bởi {log.user?.name} {detailText ? `- Lý do: ${detailText}` : ''}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <div className="mt-8 mb-12">
          <h3 className="text-base font-bold mb-4 uppercase text-center border-b pb-2 avoid-break">{isWeekly ? 'Ảnh tiêu biểu' : 'Hình ảnh hiện trường'}</h3>
          <div className="grid grid-cols-2 gap-4">
            {photos.map((photo, i) => (
              <div key={photo.id} className="border border-slate-300 p-2 avoid-break text-center rounded">
                {photo.isMissing ? (
                  <div className="w-full h-[250px] flex items-center justify-center bg-slate-50 text-slate-400 mb-2">
                    Ảnh không khả dụng
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={`/api/reports/attachments/${photo.id}`} 
                    alt={photo.caption || `Ảnh ${i+1}`} 
                    className="max-w-full h-auto max-h-[300px] object-contain mx-auto mb-2"
                  />
                )}
                <p className="text-xs text-slate-600 font-medium">{photo.caption || `Ảnh ${isWeekly ? 'tiêu biểu' : 'hiện trường'} ${i+1}`}</p>
                <p className="text-[10px] text-slate-400 mt-1">{format(photo.createdAt, 'dd/MM/yyyy HH:mm')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signatures */}
      <div className="grid grid-cols-3 gap-4 mt-8 text-center text-sm font-bold avoid-break pb-8">
        <div>
          <p className="mb-16">Người lập báo cáo</p>
          <p className="font-normal text-slate-500">(Ký, ghi rõ họ tên)</p>
          <p className="mt-2 text-slate-800">{report.reporterName || report.createdBy?.name || ''}</p>
        </div>
        <div>
          <p className="mb-16">Chỉ huy trưởng</p>
          <p className="font-normal text-slate-500">(Ký, ghi rõ họ tên)</p>
        </div>
        <div>
          <p className="mb-16">Người phê duyệt</p>
          <p className="font-normal text-slate-500">(Ký, ghi rõ họ tên)</p>
        </div>
      </div>


    </div>
  );
}
