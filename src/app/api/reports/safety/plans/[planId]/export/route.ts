import { NextResponse } from 'next/server';
import { SafetyPlanService } from '@/lib/safety-reporting/plan-service';
import { SafetyDocxGenerator } from '@/lib/safety-reporting/docx-generator';
import { SafetyPdfConverter } from '@/lib/safety-reporting/pdf-converter';

export async function GET(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  try {
    const { planId } = await params;
    const requestUrl = new URL(request.url);
    const format = requestUrl.searchParams.get('format') || 'docx';

    const plan = await SafetyPlanService.getPlanById(planId);
    if (!plan) {
      return NextResponse.json({ error: 'Không tìm thấy kế hoạch' }, { status: 404 });
    }

    const docxBuffer = await SafetyDocxGenerator.generatePlanDocx(plan);

    if (format === 'pdf') {
      const pdfBuffer = await SafetyPdfConverter.generatePlanPdf(plan);
      return new NextResponse(pdfBuffer as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="Ke-Hoach-ATLD-${plan.documentNumber || planId}.pdf"`,
        },
      });
    }

    return new NextResponse(docxBuffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Ke-Hoach-ATLD-${plan.documentNumber || planId}.docx"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi sinh văn bản' }, { status: 500 });
  }
}
