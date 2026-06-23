import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { PrintReportToolbar } from "@/components/reports/print-report-toolbar";

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

  // Filter attachments
  const photos = report.attachments.filter(a => a.kind === "PHOTO");
  const files = report.attachments.filter(a => a.kind === "FILE");

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
        <h1 className="text-2xl font-bold uppercase mb-2">
          {isWeekly ? 'Báo cáo hiện trường tuần' : 'Báo cáo hiện trường ngày'}
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
          {isWeekly && report.summary && (
            <p><span className="font-semibold w-24 inline-block">Đánh giá chung:</span> {report.summary}</p>
          )}
        </div>
      </div>

      {/* Work Lines Table */}
      <div className="mb-8 avoid-break">
        <h3 className="text-base font-bold mb-3 uppercase">1. {isWeekly ? 'Tổng hợp khối lượng công việc' : 'Chi tiết công việc'}</h3>
        <table className="w-full border-collapse border border-slate-400 text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-400 py-2 px-2 w-12 text-center">STT</th>
              <th className="border border-slate-400 py-2 px-3 text-left">Hạng mục / Công việc</th>
              {!isWeekly && <th className="border border-slate-400 py-2 px-3 text-left w-32">Khu vực</th>}
              <th className="border border-slate-400 py-2 px-2 text-center w-20">ĐVT</th>
              <th className="border border-slate-400 py-2 px-3 text-right w-28">{isWeekly ? 'Khối lượng tuần' : 'Khối lượng'}</th>
              <th className="border border-slate-400 py-2 px-3 text-left w-48">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {report.lines.length > 0 ? report.lines.map((line, idx) => (
              <tr key={line.id}>
                <td className="border border-slate-400 py-1.5 px-2 text-center">{idx + 1}</td>
                <td className="border border-slate-400 py-1.5 px-3">{line.workName || line.workContent}</td>
                {!isWeekly && <td className="border border-slate-400 py-1.5 px-3">{line.area || '-'}</td>}
                <td className="border border-slate-400 py-1.5 px-2 text-center">{line.unit || '-'}</td>
                <td className="border border-slate-400 py-1.5 px-3 text-right font-medium">{Number(line.quantityToday)}</td>
                <td className="border border-slate-400 py-1.5 px-3 text-slate-600 text-xs">{line.note || '-'}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={isWeekly ? 5 : 6} className="border border-slate-400 py-4 text-center text-slate-500">
                  Không có dữ liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Additional Details (Daily) */}
      {!isWeekly && (report.materials || report.labor || report.quality || report.issues || report.recommendations) && (
        <div className="mb-8 avoid-break space-y-4 text-sm">
          <h3 className="text-base font-bold mb-3 uppercase">2. Nguồn lực & Vấn đề</h3>
          
          {report.materials && <div><span className="font-semibold underline">Vật tư:</span> {report.materials}</div>}
          {report.labor && <div><span className="font-semibold underline">Nhân công/Máy móc:</span> {report.labor}</div>}
          {report.quality && <div><span className="font-semibold underline">Chất lượng/An toàn:</span> {report.quality}</div>}
          {report.issues && <div><span className="font-semibold underline">Vấn đề phát sinh:</span> {report.issues}</div>}
          {report.recommendations && <div><span className="font-semibold underline">Kiến nghị:</span> {report.recommendations}</div>}
        </div>
      )}

      {/* Additional Details (Weekly) */}
      {isWeekly && (report.issues || report.recommendations) && (
        <div className="mb-8 avoid-break space-y-4 text-sm">
          <h3 className="text-base font-bold mb-3 uppercase">2. Vấn đề & Kế hoạch</h3>
          
          {report.issues && <div><span className="font-semibold underline">Vấn đề phát sinh tuần:</span> {report.issues}</div>}
          {report.recommendations && <div><span className="font-semibold underline">Kế hoạch tuần tiếp theo:</span> {report.recommendations}</div>}
        </div>
      )}

      {/* Attachments list */}
      {files.length > 0 && (
        <div className="mb-8 avoid-break">
          <h3 className="text-base font-bold mb-2 uppercase">3. Tài liệu đính kèm</h3>
          <ul className="list-disc pl-5 text-sm">
            {files.map(f => (
              <li key={f.id}>{f.originalName || f.fileName} ({(f.sizeBytes / 1024 / 1024).toFixed(2)} MB)</li>
            ))}
          </ul>
        </div>
      )}

      {/* History */}
      {auditLogs.length > 0 && (
        <div className="mb-8 avoid-break">
          <h3 className="text-base font-bold mb-2 uppercase">4. Lịch sử trạng thái</h3>
          <ul className="list-inside text-sm space-y-1">
            {auditLogs.map(log => {
              const actionName = log.action.replace("SITE_REPORT_", "");
              let actionText = actionName;
              if (actionName === "SUBMITTED") actionText = "Gửi duyệt";
              else if (actionName === "APPROVED") actionText = "Đã duyệt";
              else if (actionName === "REJECTED") actionText = "Từ chối";
              
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

      {/* Signatures */}
      <div className="grid grid-cols-3 gap-8 mt-16 text-center text-sm font-bold avoid-break pb-10">
        <div>
          <p className="mb-20">Người lập báo cáo</p>
          <p className="font-normal text-slate-500">(Ký, ghi rõ họ tên)</p>
          <p className="mt-2 text-slate-800">{report.reporterName || report.createdBy?.name || ''}</p>
        </div>
        <div>
          <p className="mb-20">Chỉ huy trưởng</p>
          <p className="font-normal text-slate-500">(Ký, ghi rõ họ tên)</p>
        </div>
        <div>
          <p className="mb-20">Người phê duyệt</p>
          <p className="font-normal text-slate-500">(Ký, ghi rõ họ tên)</p>
        </div>
      </div>

      {/* Photos (Page Break if many) */}
      {photos.length > 0 && (
        <div className="page-break mt-8">
          <h3 className="text-base font-bold mb-4 uppercase text-center border-b pb-2">Hình ảnh hiện trường</h3>
          <div className="grid grid-cols-2 gap-4">
            {photos.map((photo, i) => (
              <div key={photo.id} className="border p-2 avoid-break text-center rounded">
                {/* We use standard img tag. The src points to API. On production, API auth must allow GET with cookie. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={`/api/reports/attachments/${photo.id}`} 
                  alt={photo.caption || `Ảnh ${i+1}`} 
                  className="max-w-full h-auto max-h-[350px] object-contain mx-auto mb-2"
                />
                <p className="text-xs text-slate-600">{photo.caption || `Ảnh hiện trường ${i+1}`}</p>
                <p className="text-[10px] text-slate-400">{format(photo.createdAt, 'dd/MM/yyyy HH:mm')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
