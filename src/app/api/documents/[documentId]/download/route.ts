import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import fs from "fs/promises";
import mime from "mime-types";

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

    // Role check
    if (session.role !== "ADMIN" && session.role !== "DIRECTOR") {
      const isMember = await prisma.projectMember.findFirst({
        where: { projectId: document.projectId, userId: session.id }
      });
      if (!isMember) {
        return new NextResponse("Không có quyền truy cập", { status: 403 });
      }
    }

    const fileBuffer = await fs.readFile(document.storagePath);
    
    const isPreview = req.nextUrl.searchParams.get('preview') === 'true';
    const contentType = document.mimeType || mime.lookup(document.originalName) || "application/octet-stream";
    
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    
    if (isPreview && (contentType.startsWith('image/') || contentType === 'application/pdf')) {
      headers.set("Content-Disposition", `inline; filename="${encodeURIComponent(document.originalName)}"`);
    } else {
      headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(document.originalName)}"`);
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error("Download error:", error);
    return new NextResponse("Không tìm thấy tệp vật lý", { status: 404 });
  }
}
