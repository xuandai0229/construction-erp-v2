import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import mime from "mime-types";
import path from "path";
import { canAccessProject } from "@/lib/rbac";
import { LocalStorageProvider } from "@/lib/storage/local-storage-provider";

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

    const hasAccess = await canAccessProject(
      { id: session.id, role: session.role as any },
      attachment.report.projectId
    );

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Guard against path traversal
    if (attachment.storagePath.includes('..')) {
      console.error("Path traversal detected in storagePath:", attachment.id);
      return new NextResponse("Forbidden", { status: 403 });
    }

    try {
      const storageProvider = new LocalStorageProvider();
      
      // Determine correct objectKey
      // Note: Legacy paths might be absolute, which LocalStorageProvider.resolvePath handles safely
      const objectKey = path.isAbsolute(attachment.storagePath) 
        ? attachment.storagePath 
        : attachment.storagePath.startsWith('storage') 
          ? attachment.storagePath.replace(/^storage[/\\]/, '') 
          : attachment.storagePath;

      // Use Node.js stream for minimal RAM footprint
      const fileStream = await storageProvider.readFileStream(objectKey);
      const ext = path.extname(attachment.fileName);
      const contentType = (mime.lookup(ext) || attachment.mimeType || "application/octet-stream") as string;
      const originalName = attachment.originalName || attachment.fileName;
      const fallbackName = sanitizeDispositionFilename(originalName).replace(/[^\x20-\x7E]/g, "_");
      const encodedName = encodeURIComponent(originalName);

      // Convert Node.js Readable to Web ReadableStream for NextResponse
      const { Readable } = require('stream');
      const webStream = Readable.toWeb(fileStream as any);

      const response = new NextResponse(webStream as any);
      response.headers.set("Content-Type", contentType);
      response.headers.set("X-Content-Type-Options", "nosniff");
      // Prevent caching of sensitive data
      response.headers.set("Cache-Control", "private, no-store, max-age=0");

      const isSafeInline = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(contentType);
      const isInline = attachment.kind === 'PHOTO' && isSafeInline;
      
      response.headers.set(
        "Content-Disposition",
        `${isInline ? "inline" : "attachment"}; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`
      );
      
      // If we have sizeBytes, we can set Content-Length
      if (attachment.sizeBytes) {
        response.headers.set("Content-Length", attachment.sizeBytes.toString());
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
