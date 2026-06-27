import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import mime from "mime-types";
import { canAccessProject } from "@/lib/rbac";
import { storageProvider } from "@/lib/storage/index";
import { writeAuditLog } from "@/lib/audit";
import { Readable } from "stream";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return new NextResponse("Vui lòng đăng nhập", { status: 401 });
    }

    const { documentId } = await params;
    const document = await prisma.document.findUnique({
      where: { id: documentId, deletedAt: null },
      include: { project: true }
    });

    if (!document || document.project.deletedAt) {
      return new NextResponse("Không tìm thấy tài liệu", { status: 404 });
    }

    if (!(await canAccessProject(session, document.projectId))) {
      return new NextResponse("Không có quyền truy cập", { status: 403 });
    }

    const nodeStream = storageProvider.readFileStream(document.storagePath);
    const webStream = Readable.toWeb(nodeStream as any);
    
    const isPreview = req.nextUrl.searchParams.get('preview') === 'true';
    const contentType = document.mimeType || mime.lookup(document.originalName) || "application/octet-stream";
    
    // Fire and forget audit log for view/download
    writeAuditLog({
      userId: session.id,
      projectId: document.projectId,
      action: isPreview ? "VIEW_DOCUMENT" : "DOWNLOAD_DOCUMENT",
      entityType: "Document",
      entityId: document.id,
      afterData: { originalName: document.originalName }
    }).catch(console.error);

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Cache-Control", "private, no-store, max-age=0"); // Không cache để bảo mật tuyệt đối cho tài liệu công trình
    
    const asciiName = document.originalName.replace(/[^\x20-\x7E]/g, '_');
    const encodedName = encodeURIComponent(document.originalName);

    if (isPreview && (contentType.startsWith('image/') || contentType === 'application/pdf')) {
      headers.set("Content-Disposition", `inline; filename="${asciiName}"; filename*=UTF-8''${encodedName}`);
    } else {
      headers.set("Content-Disposition", `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`);
    }

    if (document.size) {
      headers.set("Content-Length", document.size.toString());
    }

    return new NextResponse(webStream as any, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error("Download error:", error);
    return new NextResponse("Không tìm thấy tệp vật lý", { status: 404 });
  }
}
