import { NextResponse } from 'next/server';
import { SafetyAssessmentService } from '@/lib/safety-reporting/assessment-service';
import { SafetyAssessmentDocxGenerator } from '@/lib/safety-reporting/assessment-docx-generator';
import { SafetyPdfConverter } from '@/lib/safety-reporting/pdf-converter';
import {
  getSafetyAuth,
  verifySafetyProjectAccess,
  errorResponse,
} from '@/lib/safety-reporting/safety-auth-guard';

function getSafeHeaderFilenames(rawName: string, prefix: string, extension: string) {
  const sanitized = rawName.replace(/[/\\?%*:|"<>]/g, '-').trim();
  const asciiOnly = sanitized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, "_");
  
  const asciiFilename = `${prefix}-${asciiOnly || 'Doc'}.${extension}`;
  const utf8Filename = `${prefix}-${encodeURIComponent(sanitized)}.${extension}`;

  return {
    inline: `inline; filename="${asciiFilename}"; filename*=UTF-8''${utf8Filename}`,
    attachment: `attachment; filename="${asciiFilename}"; filename*=UTF-8''${utf8Filename}`,
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const auth = await getSafetyAuth();
    if (auth instanceof NextResponse) return auth;

    const { reportId } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'docx';

    const report = await SafetyAssessmentService.getReportById(reportId);
    if (!report) {
      return errorResponse('NOT_FOUND', 'Không tìm thấy Báo cáo tự đánh giá để xuất tệp.', 404);
    }

    const projectIds = (report.entries || []).map((e: any) => e.projectId).filter(Boolean);
    const scopeErr = await verifySafetyProjectAccess(auth.session, projectIds);
    if (scopeErr) return scopeErr;

    const docNoRaw = report.officialDocumentNumber || report.documentNumber || reportId;
    const filenames = getSafeHeaderFilenames(docNoRaw, 'Bao-cao-tu-danh-gia-ATLD-PCCC-VSMT', format === 'pdf' ? 'pdf' : 'docx');

    if (format === 'pdf') {
      const pdfBuffer = await SafetyPdfConverter.generateAssessmentPdf(report);
      return new NextResponse(pdfBuffer as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': filenames.inline,
        },
      });
    }

    const docxBuffer = await SafetyAssessmentDocxGenerator.generateAssessmentDocx(report);
    return new NextResponse(docxBuffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': filenames.attachment,
      },
    });
  } catch (error: any) {
    console.error("[Export Assessment API Error]", error);
    return errorResponse('SERVER_ERROR', error.message || 'Không thể sinh tệp văn bản. Vui lòng thử lại.', 500);
  }
}
