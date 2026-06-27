import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { storageProvider } from "@/lib/storage/index";
import { writeAuditLog } from "@/lib/audit";
import path from "path";
import { canAccessProject } from "@/lib/rbac";
import { canUploadToFolder } from "@/lib/documents/permissions";
import crypto from "crypto";
import { getDocumentRule } from "@/lib/document-rules";
import { buildDocumentDisplayName } from "@/lib/document-file-utils";
import { getDocumentTypeOptionsForFolder } from "@/lib/documents/metadata-types";
import { getEnforcedSystemSettings } from "@/lib/settings/system-settings";
import { validateDocumentUploadPolicy } from "@/lib/documents/validation";

function validateFileSignature(buffer: Buffer, extension: string): boolean {
  const hex = buffer.toString('hex', 0, 8).toUpperCase();
  const ext = extension.toLowerCase();

  if (ext === '.pdf') {
    return hex.startsWith('25504446'); // %PDF
  }
  if (ext === '.jpg' || ext === '.jpeg') {
    return hex.startsWith('FFD8');
  }
  if (ext === '.png') {
    return hex.startsWith('89504E47'); // ‰PNG
  }
  if (ext === '.docx' || ext === '.xlsx' || ext === '.zip') {
    return hex.startsWith('504B0304'); // PK
  }
  if (ext === '.doc' || ext === '.xls') {
    return hex.startsWith('D0CF11E0'); // OLE signature
  }
  if (ext === '.webp') {
    return hex.startsWith('52494646') && buffer.toString('hex', 8, 12).toUpperCase() === '57454250'; // RIFF...WEBP
  }
  // For XML, CAD, and others, we bypass strict magic-byte for now to avoid false positives.
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const projectId = formData.get("projectId") as string;
    const folderId = formData.get("folderId") as string;
    const requestedDisplayName = formData.get("displayName") as string | null;
    const documentType = formData.get("documentType") as string | null;
    const note = formData.get("note") as string | null;

    if (!file || !projectId || !folderId) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    const settings = await getEnforcedSystemSettings();
    const validationResult = validateDocumentUploadPolicy({ name: file.name, size: file.size }, settings);
    
    if (!validationResult.valid) {
      await writeAuditLog({
        userId: session.id,
        projectId,
        action: "DOCUMENT_UPLOAD_BLOCKED_BY_POLICY",
        entityType: "Document",
        entityId: "none",
        afterData: { reason: validationResult.reason, fileName: file.name, ...validationResult.meta } as any
      });
      return NextResponse.json({ error: validationResult.error }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId, deletedAt: null } });
    if (!project) return NextResponse.json({ error: "Không tìm thấy công trình" }, { status: 404 });
    if (!(await canAccessProject(session, projectId))) {
      return NextResponse.json({ error: "Không có quyền truy cập công trình" }, { status: 403 });
    }

    const folder = await prisma.documentFolder.findFirst({
      where: { id: folderId, projectId, deletedAt: null },
    });
    if (!folder) return NextResponse.json({ error: "Không tìm thấy thư mục" }, { status: 404 });

    // RBAC: Check folder permission
    const sessionUser = { id: session.id, role: session.role as any };
    if (!canUploadToFolder(sessionUser, { id: folder.id, name: folder.name })) {
      return NextResponse.json({ error: "Không có quyền upload vào thư mục này." }, { status: 403 });
    }

    const originalName = file.name;
    const extension = path.extname(originalName).toLowerCase();
    
    // Server-side validation based on folder rules
    const rule = getDocumentRule(folder.name);
    if (rule.allowedExtensions && rule.allowedExtensions.length > 0) {
      if (!rule.allowedExtensions.includes(extension)) {
        return NextResponse.json({ error: `File này không phù hợp với thư mục ${rule.title}. Chỉ cho phép: ${rule.allowedExtensions.join(", ").toUpperCase()}.` }, { status: 400 });
      }
    }

    if (documentType) {
      const validOptions = getDocumentTypeOptionsForFolder(folder.name);
      if (!validOptions.some(opt => opt.value === documentType)) {
        return NextResponse.json({ error: "Loại hồ sơ không hợp lệ cho thư mục này" }, { status: 400 });
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Tính fileHash
    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");

    if (!validateFileSignature(buffer, extension)) {
      return NextResponse.json({ error: "Tệp tin không đúng định dạng chuẩn (Sai Magic-byte)" }, { status: 400 });
    }

    let storedFile;
    try {
      storedFile = await storageProvider.saveFile({
        buffer,
        projectId,
        projectCode: project.code,
        folderId,
        originalName: file.name
      });
    } catch (storageError) {
      console.error("Storage save error:", storageError);
      return NextResponse.json({ error: "Không thể lưu tệp vật lý" }, { status: 500 });
    }

    let version = 1;
    if (settings.autoVersioning) {
      const existingDoc = await prisma.document.findFirst({
        where: {
          folderId,
          projectId,
          originalName: originalName,
          deletedAt: null
        },
        orderBy: { version: 'desc' }
      });
      if (existingDoc) {
        version = existingDoc.version + 1;
      }
    }

    let document;
    try {
      const metadataObj = note ? { note } : null;
      document = await prisma.document.create({
        data: {
          projectId,
          folderId,
          originalName,
          displayName: requestedDisplayName && requestedDisplayName.trim() ? requestedDisplayName.trim() : originalName,
          documentType: documentType || null,
          status: "SUBMITTED",
          metadata: metadataObj ? metadataObj : undefined,
          fileHash: fileHash,
          storedName: path.basename(storedFile.objectKey),
          mimeType: file.type || "application/octet-stream",
          extension: path.extname(originalName),
          size: file.size,
          storagePath: storedFile.storagePath,
          uploadedById: session.id,
          version: version,
        }
      });
    } catch (dbError) {
      // Cleanup if DB fails
      await storageProvider.deleteFile(storedFile.storagePath).catch(console.error);
      throw dbError;
    }

    await writeAuditLog({
      userId: session.id,
      projectId,
      action: "UPLOAD_DOCUMENT",
      entityType: "Document",
      entityId: document.id,
      afterData: document as unknown as Record<string, unknown>
    });

    return NextResponse.json({
      success: true,
      document: {
        ...document,
        uploadedBy: { name: session.name },
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Lỗi hệ thống",
      },
      { status: 500 },
    );
  }
}
