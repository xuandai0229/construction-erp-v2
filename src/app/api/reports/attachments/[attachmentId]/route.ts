import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { promises as fs } from "fs";
import mime from "mime-types";
import path from "path";

export const runtime = "nodejs";

/**
 * Sanitize filename for Content-Disposition header.
 * Remove or replace characters that could cause header injection.
 */
function sanitizeDispositionFilename(name: string): string {
  return name
    .replace(/["\\\r\n]/g, '_')  // Remove quotes, backslash, newlines
    .replace(/[^\x20-\x7E\u00C0-\u024F\u1E00-\u1EFF]/g, '_')  // Keep ASCII printable + Vietnamese
    .substring(0, 200);  // Limit length
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ attachmentId: string }> }) {
  try {
    const session = await getSession();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const resolvedParams = await params;
    const attachmentId = resolvedParams.attachmentId;

    // Validate ID format
    if (!attachmentId || !/^[a-z0-9]{20,30}$/i.test(attachmentId)) {
      return new NextResponse("Invalid attachment ID", { status: 400 });
    }

    const attachment = await prisma.siteReportAttachment.findUnique({
      where: { id: attachmentId },
      include: { report: true }
    });

    if (!attachment || attachment.report.deletedAt) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // 1. RBAC - Check if User has access to this report
    // TODO: (Phase 4) Check ProjectUser for project-specific permissions
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, role: true }
    });

    const isCreator = attachment.report.createdById === session.id;
    const isSystemAdmin = user && ['ADMIN', 'DIRECTOR'].includes(user.role);

    if (!isCreator && !isSystemAdmin) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Guard against path traversal
    if (attachment.storagePath.includes('..')) {
      console.error("Path traversal detected in storagePath:", attachment.id);
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Resolve path: handle both legacy absolute and new relative paths
    const storageRoot = path.join(process.cwd(), "storage");
    let absolutePath: string;

    if (path.isAbsolute(attachment.storagePath)) {
      // Legacy record with absolute path - validate it's within storage dir
      absolutePath = path.resolve(attachment.storagePath);
      if (!absolutePath.startsWith(storageRoot)) {
        console.error("Legacy path outside storage root:", attachment.id);
        return new NextResponse("Forbidden", { status: 403 });
      }
    } else {
      // New relative path
      absolutePath = path.join(process.cwd(), attachment.storagePath);
      if (!absolutePath.startsWith(storageRoot)) {
        console.error("Resolved path outside storage root:", attachment.id);
        return new NextResponse("Forbidden", { status: 403 });
      }
    }

    try {
      const fileBuffer = await fs.readFile(absolutePath);
      const ext = path.extname(attachment.fileName);
      const contentType = (mime.lookup(ext) || attachment.mimeType || "application/octet-stream") as string;

      const safeName = sanitizeDispositionFilename(attachment.originalName || attachment.fileName);

      const response = new NextResponse(fileBuffer);
      response.headers.set("Content-Type", contentType);
      response.headers.set("X-Content-Type-Options", "nosniff");
      // Prevent caching of sensitive data
      response.headers.set("Cache-Control", "private, no-store, max-age=0");

      // Photos displayed inline, files as download
      if (attachment.kind === 'PHOTO') {
        response.headers.set("Content-Disposition", `inline; filename="${safeName}"`);
      } else {
        response.headers.set("Content-Disposition", `attachment; filename="${safeName}"`);
      }
      return response;
    } catch {
      return new NextResponse("File not found on disk", { status: 404 });
    }

  } catch (error) {
    console.error("Serve report attachment error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
