import { NextResponse } from 'next/server';
import { SafetyPlanService } from '@/lib/safety-reporting/plan-service';
import { SafetyDocxGenerator } from '@/lib/safety-reporting/docx-generator';
import { SafetyPdfConverter } from '@/lib/safety-reporting/pdf-converter';

function getSafeHeaderFilenames(rawName: string, prefix: string, extension: string) {
  const sanitized = rawName.replace(/[/\\?%*:|"<>]/g, '-').trim();
  const asciiOnly = sanitized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, "_");
  
  const asciiFilename = `${prefix}-${asciiOnly || 'Plan'}.${extension}`;
  const utf8Filename = `${prefix}-${encodeURIComponent(sanitized)}.${extension}`;

  return {
    inline: `inline; filename="${asciiFilename}"; filename*=UTF-8''${utf8Filename}`,
    attachment: `attachment; filename="${asciiFilename}"; filename*=UTF-8''${utf8Filename}`,
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  try {
    const { planId } = await params;
    const requestUrl = new URL(request.url);
    const format = requestUrl.searchParams.get('format') || 'docx';

    const plan = await SafetyPlanService.getPlanById(planId);
    if (!plan) {
      return NextResponse.json({ error: 'Không tìm thấy kế hoạch' }, { status: 404 });
    }

    const docNoRaw = plan.officialDocumentNumber || plan.documentNumber || planId;
    const filenames = getSafeHeaderFilenames(docNoRaw, 'Ke-Hoach-ATLD', format === 'pdf' ? 'pdf' : 'docx');

    if (format === 'pdf') {
      const pdfBuffer = await SafetyPdfConverter.generatePlanPdf(plan);
      return new NextResponse(pdfBuffer as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': filenames.inline,
        },
      });
    }

    const docxBuffer = await SafetyDocxGenerator.generatePlanDocx(plan);
    return new NextResponse(docxBuffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': filenames.attachment,
      },
    });
  } catch (error: any) {
    console.error("[Export Plan API Error]", error);
    return NextResponse.json({ error: error.message || 'Lỗi sinh văn bản' }, { status: 500 });
  }
}
