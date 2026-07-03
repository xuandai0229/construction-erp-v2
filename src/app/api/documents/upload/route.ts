import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { storageProvider } from "@/lib/storage/index";
import { writeAuditLog } from "@/lib/audit";
import path from "path";
import { Readable } from "stream";
import { canAccessProject } from "@/lib/rbac";
import { canUploadToFolder } from "@/lib/documents/permissions";
import { getDocumentRule } from "@/lib/document-rules";
import { getDocumentTypeOptionsForFolder } from "@/lib/documents/metadata-types";
import { getEnforcedSystemSettings } from "@/lib/settings/system-settings";
import { validateDocumentUploadPolicy } from "@/lib/documents/validation";
import { parseDocumentUploadRequest } from "@/lib/documents/upload-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIVATE_NO_STORE = "no-store, no-cache, must-revalidate";

function json(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", PRIVATE_NO_STORE);
  return response;
}

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
    return hex.startsWith('89504E47'); // PNG signature
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

async function createValidatedUploadStream(
  body: ReadableStream<Uint8Array>,
  extension: string,
): Promise<NodeJS.ReadableStream> {
  const reader = body.getReader();
  const initialChunks: Uint8Array[] = [];
  let initialBytes = 0;

  while (initialBytes < 16) {
    const { done, value } = await reader.read();
    if (done) break;
    initialChunks.push(value);
    initialBytes += value.byteLength;
  }

  if (initialBytes === 0) {
    throw new Error("File rỗng (0 bytes) không hợp lệ");
  }

  const magicBuffer = Buffer.concat(
    initialChunks.map((chunk) => Buffer.from(chunk)),
    Math.min(initialBytes, 16),
  );
  if (!validateFileSignature(magicBuffer, extension)) {
    throw new Error("Tệp tin không đúng định dạng chuẩn (sai magic-byte)");
  }

  async function* replayBody() {
    for (const chunk of initialChunks) {
      yield Buffer.from(chunk);
    }
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield Buffer.from(value);
    }
  }

  return Readable.from(replayBody());
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return json({ error: "Vui lòng đăng nhập" }, { status: 401 });
    }

    let upload;
    try {
      upload = parseDocumentUploadRequest(req);
    } catch (error) {
      return json(
        { error: error instanceof Error ? error.message : "Thiếu thông tin bắt buộc" },
        { status: 400 },
      );
    }

    const settings = await getEnforcedSystemSettings();
    const validationResult = validateDocumentUploadPolicy(
      { name: upload.originalName, size: upload.size },
      settings,
    );

    if (!validationResult.valid) {
      await writeAuditLog({
        userId: session.id,
        projectId: upload.projectId,
        action: "DOCUMENT_UPLOAD_BLOCKED_BY_POLICY",
        entityType: "Document",
        entityId: "none",
        afterData: {
          reason: validationResult.reason,
          fileName: upload.originalName,
          ...validationResult.meta,
        } as any,
      });
      return json({ error: validationResult.error }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: upload.projectId, deletedAt: null },
    });
    if (!project) return json({ error: "Không tìm thấy công trình" }, { status: 404 });
    if (!(await canAccessProject(session, upload.projectId))) {
      return json({ error: "Không có quyền truy cập công trình" }, { status: 403 });
    }

    const folder = await prisma.documentFolder.findFirst({
      where: { id: upload.folderId, projectId: upload.projectId, deletedAt: null },
    });
    if (!folder) return json({ error: "Không tìm thấy thư mục" }, { status: 404 });

    const sessionUser = { id: session.id, role: session.role as any };
    if (!canUploadToFolder(sessionUser, { id: folder.id, name: folder.name })) {
      return json({ error: "Không có quyền upload vào thư mục này." }, { status: 403 });
    }

    const originalName = upload.originalName;
    const extension = path.extname(originalName).toLowerCase();
    const rule = getDocumentRule(folder.name);
    if (rule.allowedExtensions.length > 0 && !rule.allowedExtensions.includes(extension)) {
      return json(
        {
          error: `File này không phù hợp với thư mục ${rule.title}. Chỉ cho phép: ${rule.allowedExtensions.join(", ").toUpperCase()}.`,
        },
        { status: 400 },
      );
    }

    if (upload.documentType) {
      const validOptions = getDocumentTypeOptionsForFolder(folder.name);
      if (!validOptions.some((option) => option.value === upload.documentType)) {
        return json({ error: "Loại hồ sơ không hợp lệ cho thư mục này" }, { status: 400 });
      }
    }

    if (!req.body) {
      return json({ error: "Thiếu nội dung file upload" }, { status: 400 });
    }

    let stream: NodeJS.ReadableStream;
    try {
      stream = await createValidatedUploadStream(req.body, extension);
    } catch (error) {
      return json(
        { error: error instanceof Error ? error.message : "File upload không hợp lệ" },
        { status: 400 },
      );
    }

    let storedFile;
    try {
      storedFile = await storageProvider.saveFile({
        stream,
        projectId: upload.projectId,
        projectCode: project.code,
        folderId: upload.folderId,
        originalName,
      });
    } catch (storageError) {
      console.error("Storage save error:", storageError);
      return json({ error: "Không thể lưu tệp vật lý" }, { status: 500 });
    }

    if (storedFile.size !== upload.size) {
            console.error(`[Upload] Size mismatch: received=${storedFile.size}, expected=${upload.size}`);
await storageProvider.deleteFile(storedFile.storagePath).catch(console.error);
      return json({ error: `Size mismatch: received ${storedFile.size}, expected ${upload.size}` }, { status: 400 });
    }

    let version = 1;
    if (settings.autoVersioning) {
      const existingDoc = await prisma.document.findFirst({
        where: {
          folderId: upload.folderId,
          projectId: upload.projectId,
          originalName,
          deletedAt: null,
        },
        orderBy: { version: "desc" },
      });
      if (existingDoc) version = existingDoc.version + 1;
    }

    let document;
    try {
      const metadataObj = upload.note ? { note: upload.note } : null;
      document = await prisma.document.create({
        data: {
          projectId: upload.projectId,
          folderId: upload.folderId,
          originalName,
          displayName: upload.requestedDisplayName?.trim() || originalName,
          documentType: upload.documentType || null,
          status: "SUBMITTED",
          metadata: metadataObj || undefined,
          fileHash: storedFile.fileHash || "",
          storedName: path.basename(storedFile.objectKey),
          mimeType: upload.contentType,
          extension,
          size: upload.size,
          storagePath: storedFile.storagePath,
          uploadedById: session.id,
          version,
        },
      });
    } catch (dbError) {
      await storageProvider.deleteFile(storedFile.storagePath).catch(console.error);
      throw dbError;
    }

    await writeAuditLog({
      userId: session.id,
      projectId: upload.projectId,
      action: "UPLOAD_DOCUMENT",
      entityType: "Document",
      entityId: document.id,
      afterData: document as unknown as Record<string, unknown>,
    });

    return json({
      success: true,
      document: {
        ...document,
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
        deletedAt: document.deletedAt?.toISOString(),
        uploadedBy: { name: session.name },
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return json(
      {
        error: error instanceof Error ? error.message : "Lỗi hệ thống",
      },
      { status: 500 },
    );
  }
}
