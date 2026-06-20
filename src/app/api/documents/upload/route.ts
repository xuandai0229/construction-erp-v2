import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { 
  createStoredFileName, 
  resolveDocumentStoragePath, 
  ensureDirectoryExists 
} from "@/lib/storage";
import { writeAuditLog } from "@/lib/audit";
import fs from "fs/promises";
import path from "path";
import { canAccessProject } from "@/lib/rbac";
import { getDocumentRule } from "@/lib/document-rules";
import { buildDocumentDisplayName } from "@/lib/document-file-utils";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

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
    const requestedDisplayName = formData.get("displayName");

    if (!file || !projectId || !folderId) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Tệp tin vượt quá giới hạn 50MB" }, { status: 400 });
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

    const fileExtension = path.extname(file.name).toLowerCase();
    const originalName = buildDocumentDisplayName(
      typeof requestedDisplayName === "string" && requestedDisplayName.trim()
        ? requestedDisplayName
        : file.name,
      fileExtension,
    );
    const extension = path.extname(originalName).toLowerCase();
    
    // Server-side validation based on folder rules
    const rule = getDocumentRule(folder.name);
    if (rule.allowedExtensions && rule.allowedExtensions.length > 0) {
      if (!rule.allowedExtensions.includes(extension)) {
        return NextResponse.json({ error: `File này không phù hợp với thư mục ${rule.title}. Chỉ cho phép: ${rule.allowedExtensions.join(", ").toUpperCase()}.` }, { status: 400 });
      }
    }

    const storedName = createStoredFileName(file.name);
    const storagePath = resolveDocumentStoragePath(project.code, folderId, storedName);
    
    await ensureDirectoryExists(path.dirname(storagePath));

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(storagePath, buffer);

    const document = await prisma.document.create({
      data: {
        projectId,
        folderId,
        originalName,
        storedName,
        mimeType: file.type || "application/octet-stream",
        extension: path.extname(originalName),
        size: file.size,
        storagePath,
        uploadedById: session.id,
      }
    });

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
