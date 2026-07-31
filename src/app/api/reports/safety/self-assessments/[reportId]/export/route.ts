import { NextResponse } from 'next/server';
import { SafetyAssessmentService } from '@/lib/safety-reporting/assessment-service';
import { SafetyDocxGenerator } from '@/lib/safety-reporting/docx-generator';
import { SafetyPdfConverter } from '@/lib/safety-reporting/pdf-converter';

export async function GET(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const { reportId } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'docx';

    const report = await SafetyAssessmentService.getReportById(reportId);
    if (!report) {
      return NextResponse.json({ error: 'Không tìm thấy Báo cáo' }, { status: 404 });
    }

    const docxBuffer = await SafetyDocxGenerator.generateAssessmentDocx(report);

    if (format === 'pdf') {
      const pdfBuffer = await SafetyPdfConverter.convertDocxToPdf(docxBuffer, `Bao-Cao-Tu-Danh-Gia-${report.documentNumber || reportId}`);
      return new NextResponse(pdfBuffer as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="Bao-Cao-Tu-Danh-Gia-${report.documentNumber || reportId}.pdf"`,
        },
      });
    }

    return new NextResponse(docxBuffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Bao-Cao-Tu-Danh-Gia-${report.documentNumber || reportId}.docx"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi sinh văn bản' }, { status: 500 });
  }
}
