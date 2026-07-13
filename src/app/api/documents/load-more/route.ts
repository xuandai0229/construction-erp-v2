import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canAccessProject } from "@/lib/rbac";
import { resolvePermission } from "@/lib/permissions/permission-resolver";

export const dynamic = "force-dynamic";

/**
 * Load More API for Documents pagination.
 * Query params:
 *  - projectId: string (required)
 *  - type: "folders" | "files" | "deletedFolders" | "deletedFiles" | "trashFolders" | "trashFiles" (required)
 *  - parentId: string | null (for folders scoping)
 *  - folderId: string | null (for files scoping)
 *  - skip: number (offset)
 *  - take: number (page size, max 500)
 *  - sortBy: "NEWEST" | "OLDEST" | "NAME" | "SIZE" (for files)
 *  - search: string (optional)
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn." }, { status: 401 });
  }

  const url = req.nextUrl;
  const projectId = url.searchParams.get("projectId");
  const type = url.searchParams.get("type");
  const parentId = url.searchParams.get("parentId") || null;
  const folderId = url.searchParams.get("folderId") || null;
  const skip = Math.max(0, Number(url.searchParams.get("skip") || "0"));
  const take = Math.min(500, Math.max(1, Number(url.searchParams.get("take") || "200")));
  const sortBy = url.searchParams.get("sortBy") || "NEWEST";
  const search = url.searchParams.get("search") || "";

  if (!projectId || !type) {
    return NextResponse.json({ error: "Missing projectId or type" }, { status: 400 });
  }

  const permission = await resolvePermission(session, "documents.view", { projectId });
  if (!permission.allowed || !(await canAccessProject(session, projectId))) {
    return NextResponse.json({ error: "Bạn không có quyền xem tài liệu của công trình này." }, { status: 403 });
  }

  try {
    if (type === "folders" || type === "deletedFolders") {
      const isDeleted = type === "deletedFolders";
      const where: any = {
        projectId,
        deletedAt: isDeleted ? { not: null } : null,
        ...(parentId ? { parentId } : { parentId: null }),
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      };

      let folderOrderBy: any = { createdAt: "desc" };
      if (sortBy === "OLDEST") folderOrderBy = { createdAt: "asc" };
      else if (sortBy === "NAME") folderOrderBy = { name: "asc" };

      if (isDeleted) {
        if (sortBy === "OLDEST") folderOrderBy = { deletedAt: "asc" };
        else if (sortBy !== "NAME") folderOrderBy = { deletedAt: "desc" };
      }

      const [items, total] = await Promise.all([
        prisma.documentFolder.findMany({
          where,
          orderBy: folderOrderBy,
          skip,
          take,
          include: {
            _count: {
              select: isDeleted
                ? { documents: true, children: true }
                : { documents: { where: { deletedAt: null } }, children: { where: { deletedAt: null } } },
            },
          },
        }),
        prisma.documentFolder.count({ where }),
      ]);

      const mapped = items.map((f) => ({
        id: f.id,
        projectId: f.projectId,
        parentId: f.parentId,
        name: f.name,
        _count: f._count,
        ...(isDeleted ? { deletedAt: f.deletedAt?.toISOString() } : {}),
      }));

      return NextResponse.json({ items: mapped, total, hasMore: skip + take < total });
    }

    if (type === "files" || type === "deletedFiles") {
      const isDeleted = type === "deletedFiles";
      if (!folderId) {
        return NextResponse.json({ items: [], total: 0, hasMore: false });
      }

      const where: any = {
        projectId,
        folderId,
        deletedAt: isDeleted ? { not: null } : null,
        ...(search
          ? {
              OR: [
                { originalName: { contains: search, mode: "insensitive" } },
                { displayName: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      };

      let fileOrderBy: any = { createdAt: "desc" };
      if (sortBy === "OLDEST") fileOrderBy = { createdAt: "asc" };
      else if (sortBy === "NAME") fileOrderBy = { displayName: "asc" };
      else if (sortBy === "SIZE") fileOrderBy = { size: "desc" };

      if (isDeleted) {
        if (sortBy === "OLDEST") fileOrderBy = { deletedAt: "asc" };
        else if (sortBy !== "NAME" && sortBy !== "SIZE") fileOrderBy = { deletedAt: "desc" };
      }

      const [items, total] = await Promise.all([
        prisma.document.findMany({
          where,
          orderBy: fileOrderBy,
          skip,
          take,
          include: { uploadedBy: { select: { name: true } } },
        }),
        prisma.document.count({ where }),
      ]);

      const mapped = items.map((d) => ({
        id: d.id,
        projectId: d.projectId,
        folderId: d.folderId,
        originalName: d.originalName,
        displayName: d.displayName,
        documentType: d.documentType,
        status: d.status,
        metadata: d.metadata,
        fileHash: d.fileHash,
        storedName: d.storedName,
        mimeType: d.mimeType,
        extension: d.extension,
        size: d.size,
        version: d.version,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        ...(isDeleted ? { deletedAt: d.deletedAt?.toISOString() } : {}),
        uploadedById: d.uploadedById,
        uploadedBy: d.uploadedBy,
        rejectedReason: d.rejectedReason,
      }));

      return NextResponse.json({ items: mapped, total, hasMore: skip + take < total });
    }

    if (type === "trashFolders") {
      const where: any = {
        projectId,
        deletedAt: { not: null },
        ...(parentId 
          ? { parentId }
          : { OR: [{ parentId: null }, { parent: { deletedAt: null } }] }
        ),
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      };

      let orderBy: any;
      if (sortBy === "NAME") orderBy = { name: "asc" };
      else if (sortBy === "OLDEST") orderBy = { deletedAt: "asc" };
      else orderBy = { deletedAt: "desc" };

      const [items, total] = await Promise.all([
        prisma.documentFolder.findMany({
          where,
          orderBy,
          skip,
          take,
          include: {
            _count: { select: { documents: true, children: true } },
          },
        }),
        prisma.documentFolder.count({ where }),
      ]);

      const mapped = items.map((f) => ({
        id: f.id,
        projectId: f.projectId,
        parentId: f.parentId,
        name: f.name,
        _count: f._count,
        deletedAt: f.deletedAt?.toISOString(),
      }));

      return NextResponse.json({ items: mapped, total, hasMore: skip + take < total });
    }

    if (type === "trashFiles") {
      const where: any = {
        projectId,
        deletedAt: { not: null },
        ...(folderId
          ? { folderId }
          : { folder: { deletedAt: null } }
        ),
        ...(search
          ? {
              OR: [
                { originalName: { contains: search, mode: "insensitive" } },
                { displayName: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      };

      let orderBy: any;
      if (sortBy === "NAME") orderBy = { displayName: "asc" };
      else if (sortBy === "SIZE") orderBy = { size: "desc" };
      else if (sortBy === "OLDEST") orderBy = { deletedAt: "asc" };
      else orderBy = { deletedAt: "desc" };

      const [items, total] = await Promise.all([
        prisma.document.findMany({
          where,
          orderBy,
          skip,
          take,
          include: { uploadedBy: { select: { name: true } } },
        }),
        prisma.document.count({ where }),
      ]);

      const mapped = items.map((d) => ({
        id: d.id,
        projectId: d.projectId,
        folderId: d.folderId,
        originalName: d.originalName,
        displayName: d.displayName,
        documentType: d.documentType,
        status: d.status,
        metadata: d.metadata,
        fileHash: d.fileHash,
        storedName: d.storedName,
        mimeType: d.mimeType,
        extension: d.extension,
        size: d.size,
        version: d.version,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        deletedAt: d.deletedAt?.toISOString(),
        uploadedById: d.uploadedById,
        uploadedBy: d.uploadedBy,
        rejectedReason: d.rejectedReason,
      }));

      return NextResponse.json({ items: mapped, total, hasMore: skip + take < total });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error("Load more error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
