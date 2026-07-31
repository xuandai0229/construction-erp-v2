import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { SafetyAssessmentService } from '@/lib/safety-reporting/assessment-service';
import { ArrowLeft, FileText, Download, Printer } from 'lucide-react';
import { PageHeader, PageHeading } from '@/components/ui/enterprise';

export const metadata = {
  title: 'Xem trước Báo cáo tự đánh giá | ATLĐ • PCCC • VSMT',
};

export default async function SafetyReportPreviewPage({ params }: { params: Promise<{ reportId: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login?reason=session_expired');

  const { reportId } = await params;
  const report = await SafetyAssessmentService.getReportById(reportId);
  if (!report) redirect('/reports/safety');

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <Link
          href={`/reports/safety/self-assessments/${report.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại Chi tiết Báo cáo
        </Link>
        <div className="flex items-center gap-2">
          <a
            href={`/api/reports/safety/self-assessments/${report.id}/export?format=docx`}
            download
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <Download className="h-4 w-4" />
            Tải File Word (.DOCX)
          </a>
          <a
            href={`/api/reports/safety/self-assessments/${report.id}/export?format=pdf`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition-all"
          >
            <Printer className="h-4 w-4" />
            Xem PDF / In
          </a>
        </div>
      </div>

      <PageHeader>
        <PageHeading
          title={
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                <FileText className="h-5 w-5" />
              </div>
              <span>Xem trước mẫu văn bản: {report.documentNumber || 'BC-ATLD'}</span>
            </div>
          }
          description="Văn bản được sinh trực tiếp từ Golden Master Word template biểu mẫu Công ty."
        />
      </PageHeader>

      {/* Embedded PDF / Preview Viewer */}
      <div className="rounded-2xl border border-slate-200 bg-slate-900 p-2 shadow-lg h-[800px] overflow-hidden">
        <iframe
          src={`/api/reports/safety/self-assessments/${report.id}/export?format=pdf`}
          className="w-full h-full rounded-xl bg-white border-0"
          title="PDF Preview"
        />
      </div>
    </div>
  );
}
