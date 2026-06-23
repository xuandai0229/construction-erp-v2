import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import path from "path";
import crypto from "crypto";
import { promises as fs } from "fs";
import {
  assertReportWritableForAttachment,
  canUploadReportAttachment,
} from "@/lib/reports/report-workflow-policy";

export const runtime = "nodejs";

const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_PHOTOS_PER_REPORT = 10;
const MAX_FILES_PER_REPORT = 5;
const TOTAL_UPLOAD_LIMIT_BYTES = 50 * 1024 * 1024; // 50MB per request limit

// Valid extensions whitelist
const PHOTO_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
const FILE_EXTS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar'];

/**
 * Validate file magic bytes to detect extension spoofing.
 * Returns true if magic bytes match the declared extension.
 */
function validateMagicBytes(buffer: Buffer, extension: string): boolean {
  if (buffer.length < 4) return false;
  const hex = buffer.toString('hex', 0, 8).toUpperCase();
  const ext = extension.toLowerCase();

  if (ext === '.jpg' || ext === '.jpeg') {
    return hex.startsWith('FFD8');
  }
  if (ext === '.png') {
    return hex.startsWith('89504E47');
  }
  if (ext === '.webp') {
    return hex.startsWith('52494646') && buffer.length >= 12 &&
      buffer.toString('hex', 8, 12).toUpperCase() === '57454250';
  }
  if (ext === '.pdf') {
    return hex.startsWith('25504446'); // %PDF
  }
  if (ext === '.docx' || ext === '.xlsx' || ext === '.zip') {
    return hex.startsWith('504B0304'); // PK zip archive
  }
  if (ext === '.doc' || ext === '.xls') {
    return hex.startsWith('D0CF11E0'); // OLE
  }
  if (ext === '.rar') {
    return hex.startsWith('52617221'); // Rar!
  }
  // Unknown extension - reject by default for safety
  return false;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Vui lòng đăng nhập" }, { status: 401 });

    const resolvedParams = await params;
    const reportId = resolvedParams.reportId;

    // Validate reportId format (cuid)
    if (!reportId || !/^[a-z0-9]{20,30}$/i.test(reportId)) {
      return NextResponse.json({ error: "Invalid report ID" }, { status: 400 });
    }

    const report = await prisma.siteReport.findUnique({
      where: { id: reportId, deletedAt: null },
      include: {
        _count: {
          select: { attachments: true }
        }
      }
    });

    if (!report) return NextResponse.json({ error: "Không tìm thấy báo cáo" }, { status: 404 });

    // 1. RBAC - Check if User is Creator OR has sufficient role
    // TODO: (Phase 4) Check ProjectUser for project-specific permissions
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, role: true }
    });

    const isCreator = report.createdById === session.id;
    const isSystemAdmin = user && ['ADMIN', 'DIRECTOR'].includes(user.role);

    if (!isCreator && !isSystemAdmin) {
      return NextResponse.json({ error: "Không có quyền thêm file vào báo cáo này" }, { status: 403 });
    }

    if (!canUploadReportAttachment(report.status)) {
      return NextResponse.json(
        {
          error:
            "Báo cáo đã gửi/đã duyệt nên không thể thêm file đính kèm.",
        },
        { status: 409 },
      );
    }

    const formData = await req.formData();
    const kind = formData.get("kind") as string;
    const files = formData.getAll("files") as File[];

    if (!['PHOTO', 'FILE'].includes(kind)) {
      return NextResponse.json({ error: "Loại đính kèm không hợp lệ" }, { status: 400 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Không có file nào được gửi" }, { status: 400 });
    }

    // Count existing attachments by kind
    const existingCounts = await prisma.siteReportAttachment.groupBy({
      by: ['kind'],
      where: { reportId },
      _count: true
    });
    const existingPhotos = existingCounts.find(c => c.kind === 'PHOTO')?._count ?? 0;
    const existingFiles = existingCounts.find(c => c.kind === 'FILE')?._count ?? 0;

    // Check cumulative limits (existing + new)
    if (kind === 'PHOTO' && (existingPhotos + files.length) > MAX_PHOTOS_PER_REPORT) {
      return NextResponse.json({
        error: `Tối đa ${MAX_PHOTOS_PER_REPORT} ảnh/báo cáo. Hiện có ${existingPhotos}, bạn đang gửi thêm ${files.length}.`
      }, { status: 400 });
    }
    if (kind === 'FILE' && (existingFiles + files.length) > MAX_FILES_PER_REPORT) {
      return NextResponse.json({
        error: `Tối đa ${MAX_FILES_PER_REPORT} file/báo cáo. Hiện có ${existingFiles}, bạn đang gửi thêm ${files.length}.`
      }, { status: 400 });
    }

    // Calculate total upload size
    let totalSize = 0;
    for (const file of files) {
      totalSize += file.size;
    }
    
    if (totalSize > TOTAL_UPLOAD_LIMIT_BYTES) {
      return NextResponse.json({
        error: `Dung lượng upload vượt giới hạn ${TOTAL_UPLOAD_LIMIT_BYTES / 1024 / 1024}MB cho mỗi lần gửi. Vui lòng chia nhỏ hoặc giảm dung lượng file.`
      }, { status: 413 }); // 413 Payload Too Large
    }

    const allowedExts = kind === 'PHOTO' ? PHOTO_EXTS : FILE_EXTS;
    const maxSize = kind === 'PHOTO' ? MAX_PHOTO_SIZE : MAX_FILE_SIZE;

    // Pre-validate all files BEFORE writing anything to disk
    const validatedFiles: { file: File; ext: string; buffer: Buffer }[] = [];
    const rejectedFiles: string[] = [];

    for (const file of files) {
      const ext = path.extname(file.name).toLowerCase();

      // Check extension whitelist
      if (!allowedExts.includes(ext)) {
        rejectedFiles.push(`${file.name}: định dạng ${ext} không được phép`);
        continue;
      }

      // Check size
      if (file.size > maxSize) {
        rejectedFiles.push(`${file.name}: vượt quá ${maxSize / 1024 / 1024}MB`);
        continue;
      }

      if (file.size === 0) {
        rejectedFiles.push(`${file.name}: file rỗng`);
        continue;
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      // Magic byte validation
      if (!validateMagicBytes(buffer, ext)) {
        rejectedFiles.push(`${file.name}: nội dung file không khớp định dạng ${ext}`);
        continue;
      }

      validatedFiles.push({ file, ext, buffer });
    }

    if (validatedFiles.length === 0) {
      return NextResponse.json({
        error: "Không có file hợp lệ",
        rejectedFiles
      }, { status: 400 });
    }

    // Write files and create DB records with rollback on failure
    const baseStorageDir = path.join(process.cwd(), "storage", "site-reports", reportId);
    await fs.mkdir(baseStorageDir, { recursive: true });

    const savedFilePaths: string[] = [];
    const filesToInsert: {
      safeFileName: string;
      originalName: string;
      mimeType: string;
      sizeBytes: number;
      relativeStoragePath: string;
      kind: 'PHOTO' | 'FILE';
    }[] = [];

    try {
      for (const { file, ext, buffer } of validatedFiles) {
        const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
        const randomHex = crypto.randomBytes(4).toString("hex");
        const safeFileName = `${timestamp}-${randomHex}${ext}`;

        // storagePath uses relative path from project root for portability
        const relativeStoragePath = path.join("storage", "site-reports", reportId, safeFileName);
        const absoluteStoragePath = path.join(process.cwd(), relativeStoragePath);

        // Write file to disk
        await fs.writeFile(absoluteStoragePath, buffer);
        savedFilePaths.push(absoluteStoragePath);

        filesToInsert.push({
          safeFileName,
          originalName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          relativeStoragePath,
          kind: kind as 'PHOTO' | 'FILE'
        });
      }

      const resultAttachments = await prisma.$transaction(async (tx) => {
        const currentReport = await tx.siteReport.findFirst({
          where: { id: reportId, deletedAt: null },
          select: { status: true, projectId: true },
        });
        if (!currentReport) {
          throw new Error("Không tìm thấy báo cáo");
        }
        assertReportWritableForAttachment(currentReport);

        const createdAttachments = [];
        for (const fileData of filesToInsert) {
          const created = await tx.siteReportAttachment.create({
            data: {
              reportId,
              kind: fileData.kind,
              fileName: fileData.safeFileName,
              originalName: fileData.originalName,
              mimeType: fileData.mimeType,
              sizeBytes: fileData.sizeBytes,
              storagePath: fileData.relativeStoragePath
            }
          });

          await tx.auditLog.create({
            data: {
              userId: session.id,
              projectId: currentReport.projectId,
              action: "SITE_REPORT_ATTACHMENT_ADDED",
              entityType: "SiteReport",
              entityId: reportId,
              afterData: JSON.stringify({
                attachmentId: created.id,
                kind: created.kind,
                originalName: created.originalName,
                sizeBytes: created.sizeBytes,
              }),
            },
          });

          createdAttachments.push({
            id: created.id,
            kind: created.kind,
            originalName: created.originalName,
            sizeBytes: created.sizeBytes
          });
        }
        return createdAttachments;
      });

      // Return SAFE response: no storagePath, no absolute paths
      return NextResponse.json({
        success: true,
        uploaded: resultAttachments.length,
        attachments: resultAttachments,
        ...(rejectedFiles.length > 0 ? { rejectedFiles } : {})
      });
    } catch (error) {
      // Rollback: delete any files we wrote
      for (const filePath of savedFilePaths) {
        await fs.unlink(filePath).catch(() => {});
      }
      throw error;
    }
  } catch (error) {
    console.error("Upload report attachment error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống khi upload" }, { status: 500 });
  }
}
