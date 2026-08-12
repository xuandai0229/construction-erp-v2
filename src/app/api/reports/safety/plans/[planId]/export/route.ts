import { NextResponse } from 'next/server';
import { SafetyPlanService } from '@/lib/safety-reporting/plan-service';
import { SafetyDocxGenerator } from '@/lib/safety-reporting/docx-generator';
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

export async function GET(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  try {
    const auth = await getSafetyAuth();
    if (auth instanceof NextResponse) return auth;

    const { planId } = await params;
    const requestUrl = new URL(request.url);
    const format = requestUrl.searchParams.get('format') || 'docx';

    const plan = await SafetyPlanService.getPlanById(planId);
    if (!plan) {
      return errorResponse('NOT_FOUND', 'Không tìm thấy kế hoạch kiểm tra để xuất tệp.', 404);
    }

    const projectIds = (plan.entries || []).map((e: any) => e.projectId).filter(Boolean);
    const scopeErr = await verifySafetyProjectAccess(auth.session, projectIds);
    if (scopeErr) return scopeErr;

    const docNoRaw = plan.officialDocumentNumber || plan.documentNumber || planId;
    const filenames = getSafeHeaderFilenames(docNoRaw, 'Ke-hoach-kiem-tra-ATLD-PCCC-VSMT', format === 'pdf' ? 'pdf' : 'docx');

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
    return errorResponse('SERVER_ERROR', error.message || 'Không thể sinh tệp văn bản. Vui lòng thử lại.', 500);
  }
}
