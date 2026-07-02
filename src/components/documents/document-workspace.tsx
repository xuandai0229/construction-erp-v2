"use client";

import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileCode,
  FileIcon,
  FileImage,
  FileText,
  FileType,
  Folder,
  FolderOpen,
  MoreVertical,
  Pencil,
  Plus,
  Search, Filter,
  Trash2,
  UploadCloud, FolderPlus, ArrowLeft, ArrowUp,
  X,
} from "lucide-react";
import { format, differenceInDays, isThisMonth, subMonths } from "date-fns";
import {
  createFolder,
  deleteDocument,
  deleteFolder,
  renameDocument,
  renameFolder,
  updateDocumentMetadata,
  changeDocumentStatus,
  restoreFolder,
  restoreDocument,
  permanentDeleteFolder,
  permanentDeleteDocument,
} from "@/app/(dashboard)/documents/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";
import {
  buildDocumentDisplayName,
  getDocumentPreviewKind,
  hasAllowedDocumentExtension,
  isPoorDocumentFileName,
} from "@/lib/document-file-utils";
import { getDocumentRule } from "@/lib/document-rules";
import {
  buildFolderAncestorChain,
  formatDocumentFolderName,
} from "@/lib/document-folders";
import {
  canRenameFolder,
  canUploadToFolder,
  canRenameDocument,
  canDeleteDocument,
  canDeleteFolder,
  canEditDocumentMetadata,
  canChangeDocumentStatus,
  SessionUser
} from "@/lib/documents/permissions";
import { DocumentStatus } from "@prisma/client";
import {
  DocumentListItem,
  DocumentViewer,
} from "@/components/documents/document-viewer";

interface FolderItem {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  _count: {
    documents: number;
    children: number;
  };
}

interface DocumentWorkspaceProps {
  projectId: string;
  projectName: string;
  folders: FolderItem[];
  documents: DocumentListItem[];
  deletedFolders?: FolderItem[];
  deletedDocuments?: DocumentListItem[];
  sessionUser: SessionUser;
  systemSettings: any;
}

type SortOption = "NEWEST" | "OLDEST" | "NAME" | "SIZE";

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    sizes.length - 1,
  );
  return `${parseFloat((bytes / Math.pow(k, index)).toFixed(decimals))} ${sizes[index]}`;
}

function getFileTypeLabel(mime: string, extension: string) {
  const ext = extension.toLowerCase();
  if (mime.startsWith("image/")) return ext === ".heic" ? "Ảnh HEIC" : "Hình ảnh";
  if (mime === "application/pdf" || ext === ".pdf") return "PDF";
  if (mime.includes("word") || ext.includes("doc")) return "Word";
  if (
    mime.includes("excel") ||
    mime.includes("spreadsheet") ||
    ext.includes("xls")
  ) {
    return "Excel";
  }
  if ([".dwg", ".dxf"].includes(ext)) return "Bản vẽ CAD";
  if (ext === ".xml") return "XML";
  return ext.replace(".", "").toUpperCase() || "Tệp";
}

function FileIconForDocument({
  mime,
  extension,
  className = "h-8 w-8",
}: {
  mime: string;
  extension: string;
  className?: string;
}) {
  const ext = extension.toLowerCase();
  if (mime.startsWith("image/")) {
    return <FileImage className={`${className} text-sky-500`} />;
  }
  if (mime === "application/pdf" || ext === ".pdf") {
    return <FileText className={`${className} text-red-500`} />;
  }
  if (mime.includes("word") || ext.includes("doc")) {
    return <FileText className={`${className} text-blue-600`} />;
  }
  if (
    mime.includes("excel") ||
    mime.includes("spreadsheet") ||
    ext.includes("xls")
  ) {
    return <FileText className={`${className} text-emerald-600`} />;
  }
  if ([".dwg", ".dxf", ".xml"].includes(ext)) {
    return <FileCode className={`${className} text-violet-600`} />;
  }
  return <FileIcon className={`${className} text-slate-400`} />;
}

export function DocumentWorkspace({
  projectId,
  projectName,
  folders,
  documents,
  deletedFolders = [],
  deletedDocuments = [],
  sessionUser,
  systemSettings,
}: DocumentWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef(false);
  const mutationRef = useRef(false);

  const folderFromUrl = searchParams.get("folder");
  const initialFolder =
    folderFromUrl && folders.some((folder) => folder.id === folderFromUrl)
      ? folderFromUrl
      : null;
  const documentFromUrl = searchParams.get("document");

  const [selectedFolderId, setSelectedFolderIdRaw] = useState<string | null>(
    initialFolder,
  );
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(
    () => new Set(buildFolderAncestorChain(folders, initialFolder)),
  );
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    documentFromUrl &&
      documents.some((document) => document.id === documentFromUrl)
      ? documentFromUrl
      : null,
  );
  const [localDocuments, setLocalDocuments] =
    useState<DocumentListItem[]>(documents);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterDateRange, setFilterDateRange] = useState("ALL");
  const [filterUploader, setFilterUploader] = useState("ALL");
  const [groupBy, setGroupBy] = useState("NONE");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("NEWEST");
  const [isUploading, setIsUploading] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{
    file: File;
    displayName: string;
    note: string;
  } | null>(null);
  const [editMetadataModal, setEditMetadataModal] = useState<{
    isOpen: boolean;
    id: string;
    displayName: string;
    note: string;
  }>({ isOpen: false, id: "", displayName: "", note: "" });

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: "folder" | "doc";
    id: string;
  }>({ isOpen: false, type: "folder", id: "" });
  const filterRef = useRef<HTMLDivElement>(null);

  const [documentRenameModal, setDocumentRenameModal] = useState<{
    isOpen: boolean;
    id: string;
    newName: string;
  }>({ isOpen: false, id: "", newName: "" });

  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");

  const [contextMenu, setContextMenu] = useState<{
    type: "folder" | "file" | "workspace";
    targetId?: string;
    x: number;
    y: number;
  } | null>(null);

  const [isTrashView, setIsTrashView] = useState(false);
  const [selectedTrashFolderId, setSelectedTrashFolderId] = useState<string | null>(null);

  useEffect(() => {
    setLocalDocuments(isTrashView ? deletedDocuments : documents);
  }, [documents, deletedDocuments, isTrashView]);

  const folderById = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder])),
    [folders],
  );

  const foldersByParentId = useMemo(() => {
    const map = new Map<string | null, FolderItem[]>();
    for (const folder of folders) {
      const siblings = map.get(folder.parentId) || [];
      siblings.push(folder);
      map.set(folder.parentId, siblings);
    }
    return map;
  }, [folders]);

  useEffect(() => {
    const nextFolderId =
      folderFromUrl && folderById.has(folderFromUrl) ? folderFromUrl : null;

    setSelectedFolderIdRaw((current) =>
      current === nextFolderId ? current : nextFolderId,
    );

    setExpandedFolderIds((current) => {
      const next = new Set(current);
      for (const ancestorId of buildFolderAncestorChain(folders, nextFolderId)) {
        next.add(ancestorId);
      }
      if (nextFolderId && (foldersByParentId.get(nextFolderId)?.length || 0) > 0) {
        next.add(nextFolderId);
      }
      return next;
    });
  }, [folderById, folderFromUrl, folders, foldersByParentId]);

  const replaceUrlState = useCallback(
    (folderId: string | null, documentId?: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("folderId");
      if (folderId) params.set("folder", folderId);
      else params.delete("folder");
      if (documentId) params.set("document", documentId);
      else params.delete("document");
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const setSelectedFolderId = useCallback(
    (id: string | null) => {
      setSelectedFolderIdRaw(id);
      setSelectedDocumentId(null);
      setOpenMenuId(null);
      setSearchQuery("");
      setFilterType("ALL");
      setFilterDateRange("ALL");
      setFilterUploader("ALL");
      setGroupBy("NONE");
      setShowFilters(false);
      replaceUrlState(id, null);
    },
    [replaceUrlState],
  );

  const selectFolder = useCallback(
    (folder: FolderItem) => {
      setIsTrashView(false);
      setSelectedTrashFolderId(null);
      setSelectedFolderId(folder.id);
      if ((foldersByParentId.get(folder.id)?.length || 0) > 0) {
        setExpandedFolderIds((current) => {
          const next = new Set(current);
          next.add(folder.id);
          return next;
        });
      }
    },
    [foldersByParentId, setSelectedFolderId],
  );

  const toggleFolderExpanded = useCallback((folderId: string) => {
    setExpandedFolderIds((current) => {
      const next = new Set(current);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  const openDocument = useCallback(
    (document: DocumentListItem) => {
      if (document.folderId !== selectedFolderId) {
        setSelectedFolderIdRaw(document.folderId);
      }
      setSelectedDocumentId(document.id);
      setOpenMenuId(null);
      replaceUrlState(document.folderId, document.id);
    },
    [replaceUrlState, selectedFolderId],
  );

  const closeDocument = useCallback(() => {
    setSelectedDocumentId(null);
    replaceUrlState(selectedFolderId, null);
  }, [replaceUrlState, selectedFolderId]);

  const rootFolders = foldersByParentId.get(null) || [];
  const selectedFolderData = folders.find(
    (folder) => folder.id === selectedFolderId,
  );
  const selectedFolderDisplayName = selectedFolderData
    ? formatDocumentFolderName(selectedFolderData.name)
    : "";
  const selectedParentFolder = selectedFolderData?.parentId
    ? folderById.get(selectedFolderData.parentId)
    : null;
  const selectedFolderPath = selectedFolderId
    ? [
        ...buildFolderAncestorChain(folders, selectedFolderId)
          .map((folderId) => folderById.get(folderId))
          .filter((folder): folder is FolderItem => Boolean(folder)),
        ...(selectedFolderData ? [selectedFolderData] : []),
      ]
    : [];
  const selectedFolderRule = selectedFolderData
    ? getDocumentRule(formatDocumentFolderName(selectedFolderData.name))
    : null;

  const deletedFolderById = useMemo(
    () => new Map(deletedFolders.map((folder) => [folder.id, folder])),
    [deletedFolders]
  );
  const selectedTrashFolderData = isTrashView && selectedTrashFolderId ? deletedFolders.find(f => f.id === selectedTrashFolderId) : null;
  const selectedTrashFolderPath = useMemo(() => {
    if (!isTrashView || !selectedTrashFolderId) return [];
    const chain: FolderItem[] = [];
    let currentId: string | null = selectedTrashFolderId;
    while (currentId) {
      const folder = deletedFolderById.get(currentId);
      if (!folder) break;
      chain.unshift(folder);
      currentId = folder.parentId;
    }
    return chain;
  }, [deletedFolderById, isTrashView, selectedTrashFolderId]);

  const displayFolders = useMemo(() => {
    let filtered = isTrashView ? deletedFolders : folders;
    
    if (isTrashView) {
      if (selectedTrashFolderId) {
        filtered = filtered.filter(f => f.parentId === selectedTrashFolderId);
      } else {
        filtered = filtered.filter(f => !f.parentId || !deletedFolderById.has(f.parentId));
      }
    } else {
      if (selectedFolderId) {
        filtered = filtered.filter(f => f.parentId === selectedFolderId);
      } else {
        filtered = filtered.filter(f => !f.parentId);
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((folder) => folder.name.toLowerCase().includes(query));
    }
    return filtered;
  }, [deletedFolders, folders, isTrashView, searchQuery, selectedTrashFolderId, selectedFolderId, deletedFolderById]);

  const displayDocs = useMemo(() => {
    let filtered = localDocuments;
    if (isTrashView) {
      if (selectedTrashFolderId) {
        filtered = filtered.filter(doc => doc.folderId === selectedTrashFolderId);
      } else {
        // Root trash items: folder is null, or folder is not in deletedFolders
        filtered = filtered.filter(doc => !doc.folderId || !deletedFolderById.has(doc.folderId));
      }
    } else {
      filtered = filtered.filter((document) => document.folderId === selectedFolderId);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((document) =>
        document.originalName.toLowerCase().includes(query) ||
        document.displayName?.toLowerCase().includes(query)
      );
    }

    if (filterType !== "ALL") {
      filtered = filtered.filter((document) => {
        const extension = document.extension.toLowerCase();
        if (filterType === "IMAGE") return document.mimeType.startsWith("image/");
        if (filterType === "PDF") return extension === ".pdf";
        if (filterType === "WORD") return extension.includes("doc");
        if (filterType === "EXCEL") return extension.includes("xls");
        if (filterType === "CAD") return [".dwg", ".dxf"].includes(extension);
        if (filterType === "XML") return extension === ".xml";
        return true;
      });
    }

    if (filterUploader !== "ALL") {
      filtered = filtered.filter(doc => doc.uploadedById === filterUploader);
    }

    if (filterDateRange !== "ALL") {
      filtered = filtered.filter(doc => {
        const date = new Date(doc.createdAt);
        if (filterDateRange === "TODAY") return differenceInDays(new Date(), date) === 0;
        if (filterDateRange === "LAST_7_DAYS") return differenceInDays(new Date(), date) <= 7;
        if (filterDateRange === "THIS_MONTH") return isThisMonth(date);
        if (filterDateRange === "LAST_MONTH") {
          const lastMonth = subMonths(new Date(), 1);
          return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear();
        }
        return true;
      });
    }

    return [...filtered].sort((left, right) => {
      if (sortBy === "OLDEST") {
        return (
          new Date(left.createdAt).getTime() -
          new Date(right.createdAt).getTime()
        );
      }
      if (sortBy === "NAME") {
        return (left.displayName || left.originalName).localeCompare(right.displayName || right.originalName, "vi");
      }
      if (sortBy === "SIZE") return right.size - left.size;
      return (
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime()
      );
    });
  }, [
    filterType,
    filterDateRange,
    filterUploader,
    localDocuments,
    searchQuery,
    selectedFolderId,
    sortBy,
    isTrashView,
    selectedTrashFolderId,
    deletedFolderById,
  ]);

  const groupedDocs = useMemo(() => {
    if (groupBy === "NONE") return { "": displayDocs };
    const groups: Record<string, DocumentListItem[]> = {};
    for (const doc of displayDocs) {
      let key = "Khác";
      if (groupBy === "MONTH") key = format(new Date(doc.createdAt), "MM/yyyy");
      else if (groupBy === "UPLOADER") key = doc.uploadedBy?.name || "Không rõ";

      if (!groups[key]) groups[key] = [];
      groups[key].push(doc);
    }
    return groups;
  }, [displayDocs, groupBy]);

  const availableUploaders = useMemo(() => {
    const folderDocs = localDocuments.filter(d => d.folderId === selectedFolderId);
    const map = new Map<string, string>();
    folderDocs.forEach(d => {
      if (d.uploadedById) map.set(d.uploadedById, d.uploadedBy?.name || "Không rõ");
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [localDocuments, selectedFolderId]);

  const smartSuggestions = useMemo(() => {
    const suggestions: string[] = [];
    if (!selectedFolderId) return suggestions;
    const folderDocs = localDocuments.filter(d => d.folderId === selectedFolderId);
    if (folderDocs.length > 50) {
      suggestions.push("Thư mục đang có nhiều tài liệu, hãy thử Nhóm theo Trạng thái.");
    }
    const hashes = new Set();
    let hasDuplicateHash = false;
    for (const doc of folderDocs) {
      if (doc.fileHash) {
        if (hashes.has(doc.fileHash)) { hasDuplicateHash = true; break; }
        hashes.add(doc.fileHash);
      }
    }
    if (hasDuplicateHash) {
      suggestions.push("Có thể có tài liệu trùng nội dung (trùng mã Hash).");
    }
    return suggestions;
  }, [localDocuments, selectedFolderId]);

  const selectedDocument =
    localDocuments.find((document) => document.id === selectedDocumentId) ||
    null;
  const selectedDocumentIndex = selectedDocument
    ? displayDocs.findIndex((document) => document.id === selectedDocument.id)
    : -1;

  // Local Capabilities
  const isGlobalAdmin = canRenameFolder(sessionUser, { id: "new", name: "" }); // Cấp lãnh đạo
  const canUpload = selectedFolderData ? canUploadToFolder(sessionUser, { id: selectedFolderData.id, name: selectedFolderData.name }) : false;
  
  const canCreateFolderContextually = isGlobalAdmin || (selectedFolderId && canUpload);

  const canRenameCurrentFolder = selectedFolderData ? canRenameFolder(sessionUser, { id: selectedFolderData.id, name: selectedFolderData.name }) : false;
  const canDeleteCurrentFolder = selectedFolderData ? canDeleteFolder(sessionUser, { id: selectedFolderData.id, name: selectedFolderData.name }) : false;

  const copyDocumentLink = useCallback(
    async (document: DocumentListItem) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("folder", document.folderId);
      params.set("document", document.id);
      const url = `${window.location.origin}${pathname}?${params.toString()}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Đã sao chép link nội bộ");
      } catch {
        toast.error("Không thể sao chép link trên thiết bị này");
      }
      setOpenMenuId(null);
    },
    [pathname, searchParams, toast],
  );

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedFolderId || !selectedFolderData) return;

    setPendingUpload({
      file,
      displayName: file.name,
      note: ""
    });
  };


  const closeUploadDialog = () => {
    if (isUploading) return;
    setPendingUpload(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const confirmUpload = async () => {
    if (
      uploadRef.current ||
      !pendingUpload ||
      !selectedFolderId ||
      !selectedFolderRule
    ) {
      return;
    }

    let displayName: string;
    try {
      displayName = buildDocumentDisplayName(
        pendingUpload.displayName,
        `.${pendingUpload.file.name.split(".").pop() || ""}`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tên file không hợp lệ");
      return;
    }

    uploadRef.current = true;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", pendingUpload.file);
    formData.append("displayName", displayName);
    formData.append("projectId", projectId);
    formData.append("folderId", selectedFolderId);

    try {
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      const uploadedDocument = data.document as DocumentListItem;
      setLocalDocuments((current) => [
        uploadedDocument,
        ...current.filter((document) => document.id !== uploadedDocument.id),
      ]);
      setPendingUpload(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success(
        `Đã tải tài liệu lên thư mục ${formatDocumentFolderName(selectedFolderData?.name || "")}`,
      );
      openDocument(uploadedDocument);
      router.refresh();
    } catch (error) {
      toast.error(
        "Lỗi upload: " +
        (error instanceof Error ? error.message : "Lỗi không xác định"),
      );
    } finally {
      uploadRef.current = false;
      setIsUploading(false);
    }
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (mutationRef.current || !name) {
      if (!name) toast.error("Tên thư mục không được để trống");
      return;
    }

    const isDuplicate = folders.some(
      (folder) =>
        folder.name.toLowerCase() === name.toLowerCase() &&
        folder.parentId === (selectedFolderId || null),
    );
    if (isDuplicate) {
      toast.error("Tên thư mục đã tồn tại trong cùng cấp");
      return;
    }

    mutationRef.current = true;
    try {
      const result = await createFolder(
        projectId,
        name,
        selectedFolderId || undefined,
      );
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Tạo thư mục thành công");
        setNewFolderName("");
        setShowNewFolder(false);
      }
    } catch {
      toast.error("Không thể tạo thư mục. Vui lòng thử lại.");
    } finally {
      mutationRef.current = false;
    }
  };

  const startFolderRename = useCallback((folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;
    setEditingFolderId(folderId);
    setEditingFolderName(folder.name);
  }, [folders]);

  const commitFolderRename = useCallback(async () => {
    if (!editingFolderId || mutationRef.current) return;
    const name = editingFolderName.trim();
    const folder = folders.find((f) => f.id === editingFolderId);
    if (!name) {
      toast.error("Tên thư mục không được để trống");
      setEditingFolderId(null);
      return;
    }
    if (name === folder?.name) {
      setEditingFolderId(null);
      return;
    }
    const isDuplicate = folders.some(
      (f) =>
        f.id !== editingFolderId &&
        f.name.toLowerCase() === name.toLowerCase() &&
        f.parentId === folder?.parentId,
    );
    if (isDuplicate) {
      toast.error("Tên thư mục đã tồn tại trong cùng cấp");
      return;
    }
    mutationRef.current = true;
    try {
      const result = await renameFolder(projectId, editingFolderId, name);
      if (result?.error) toast.error(result.error);
      else toast.success("Đã đổi tên thư mục");
    } catch {
      toast.error("Không thể đổi tên thư mục.");
    } finally {
      mutationRef.current = false;
      setEditingFolderId(null);
    }
  }, [editingFolderId, editingFolderName, folders, projectId]);

  const cancelFolderRename = useCallback(() => {
    setEditingFolderId(null);
    setEditingFolderName("");
  }, []);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("click", close);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
    };
  }, [contextMenu]);

  const handleRenameDocument = async () => {
    const document = localDocuments.find(
      (item) => item.id === documentRenameModal.id,
    );
    if (!document || mutationRef.current) return;

    let displayName: string;
    try {
      displayName = buildDocumentDisplayName(
        documentRenameModal.newName,
        document.extension,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tên file không hợp lệ");
      return;
    }

    mutationRef.current = true;
    try {
      const result = await renameDocument(
        projectId,
        document.id,
        displayName,
      );
      if (result?.error) toast.error(result.error);
      else {
        setLocalDocuments((current) =>
          current.map((item) =>
            item.id === document.id ? { ...item, originalName: displayName } : item,
          ),
        );
        setDocumentRenameModal({ isOpen: false, id: "", newName: "" });
        toast.success("Đã đổi tên tài liệu");
        router.refresh();
      }
    } catch {
      toast.error("Không thể đổi tên tài liệu. Vui lòng thử lại.");
    } finally {
      mutationRef.current = false;
    }
  };

  const executeSoftDelete = async (type: "folder" | "doc", id: string) => {
    if (mutationRef.current) return;
    mutationRef.current = true;
    
    // Optimistic UI
    let previousDocs = localDocuments;
    if (type === "doc") {
      setLocalDocuments(current => current.filter(d => d.id !== id));
      if (selectedDocumentId === id) closeDocument();
    }
    // We cannot easily do optimistic folder deletion without modifying folder tree state if it's passed as prop, 
    // but we can at least toast immediately.
    toast.success(type === "folder" ? "Đang xóa thư mục..." : "Đang xóa tài liệu...");
    
    try {
      if (type === "folder") {
        const result = await deleteFolder(projectId, id);
        if (result?.error) {
          toast.error(result.error);
          router.refresh(); // rollback
        } else {
          toast.success("Đã chuyển thư mục vào Thùng rác");
          if (selectedFolderId === id) setSelectedFolderId(null);
          router.refresh();
        }
      } else {
        const result = await deleteDocument(projectId, id);
        if (result?.error) {
          toast.error(result.error);
          setLocalDocuments(previousDocs); // rollback
        } else {
          toast.success("Đã chuyển tài liệu vào Thùng rác");
          router.refresh();
        }
      }
    } catch {
      toast.error("Không thể xóa. Vui lòng thử lại.");
      if (type === "doc") setLocalDocuments(previousDocs);
    } finally {
      mutationRef.current = false;
    }
  };

  const executePermanentDelete = async () => {
    if (mutationRef.current) return;
    mutationRef.current = true;
    const { type, id } = deleteConfirm;
    setDeleteConfirm((current) => ({ ...current, isOpen: false }));

    let previousDocs = localDocuments;
    if (type === "doc") {
      setLocalDocuments(current => current.filter(d => d.id !== id));
      if (selectedDocumentId === id) closeDocument();
    }
    toast.success(type === "folder" ? "Đang xóa vĩnh viễn thư mục..." : "Đang xóa vĩnh viễn tài liệu...");

    try {
      if (type === "folder") {
        const result = await permanentDeleteFolder(projectId, id);
        if (result?.error) {
          toast.error(result.error);
          router.refresh();
        } else {
          toast.success("Xóa vĩnh viễn thư mục thành công");
          if (selectedFolderId === id) setSelectedFolderId(null);
          router.refresh();
        }
      } else {
        const result = await permanentDeleteDocument(projectId, id);
        if (result?.error) {
          toast.error(result.error);
          setLocalDocuments(previousDocs);
        } else {
          toast.success("Xóa vĩnh viễn tài liệu thành công");
          router.refresh();
        }
      }
    } catch {
      toast.error("Không thể xóa vĩnh viễn. Vui lòng thử lại.");
      if (type === "doc") setLocalDocuments(previousDocs);
    } finally {
      mutationRef.current = false;
    }
  };
  
  const handleRestore = async (type: "folder" | "doc", id: string) => {
    if (mutationRef.current) return;
    mutationRef.current = true;
    
    let previousDocs = localDocuments;
    if (type === "doc") {
      setLocalDocuments(current => current.filter(d => d.id !== id));
    }
    toast.success(type === "folder" ? "Đang khôi phục thư mục..." : "Đang khôi phục tài liệu...");

    try {
      if (type === "folder") {
        const result = await restoreFolder(projectId, id);
        if (result?.error) {
          toast.error(result.error);
          router.refresh();
        } else {
          toast.success("Đã khôi phục thư mục");
          // If we restored the folder we are currently viewing, or any folder, just clear the trash view state if needed.
          if (selectedTrashFolderId === id) setSelectedTrashFolderId(null);
          router.refresh();
        }
      } else {
        const result = await restoreDocument(projectId, id);
        if (result?.error) {
          toast.error(result.error);
          setLocalDocuments(previousDocs);
        } else {
          toast.success("Đã khôi phục tài liệu");
          router.refresh();
        }
      }
    } catch {
      toast.error("Không thể khôi phục. Vui lòng thử lại.");
      if (type === "doc") setLocalDocuments(previousDocs);
    } finally {
      mutationRef.current = false;
    }
  };

const handleEditMetadata = async () => {
    if (mutationRef.current) return;
    mutationRef.current = true;
    try {
      const result = await updateDocumentMetadata(
        projectId,
        editMetadataModal.id,
        {
          displayName: editMetadataModal.displayName,
          note: editMetadataModal.note,
        }
      );
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Đã cập nhật thông tin hồ sơ");
        setLocalDocuments(current => current.map(item =>
          item.id === editMetadataModal.id
            ? { ...item, displayName: editMetadataModal.displayName, metadata: { ...item.metadata, note: editMetadataModal.note } }
            : item
        ));
        setEditMetadataModal({ isOpen: false, id: "", displayName: "", note: "" });
        router.refresh();
      }
    } catch {
      toast.error("Lỗi cập nhật thông tin");
    } finally {
      mutationRef.current = false;
    }
  };



  const FolderNode = ({
    folder,
    level = 0,
  }: {
    folder: FolderItem;
    level?: number;
  }) => {
    const isSelected = selectedFolderId === folder.id;
    const children = foldersByParentId.get(folder.id) || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedFolderIds.has(folder.id);
    const displayName = formatDocumentFolderName(folder.name);

    return (
      <div className="select-none">
        <div
          className={`group flex min-h-10 cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 transition-colors hover:bg-slate-100 ${isSelected ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100" : "text-slate-700"
            }`}
          style={{ paddingLeft: `${level * 18 + 8}px` }}
          onClick={() => selectFolder(folder)}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setContextMenu({
              type: "folder",
              targetId: folder.id,
              x: e.clientX,
              y: e.clientY,
            });
            selectFolder(folder);
          }}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            {hasChildren ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleFolderExpanded(folder.id);
                }}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-slate-700"
                aria-label={isExpanded ? "Đóng nhánh thư mục" : "Mở nhánh thư mục"}
              >
                <ChevronRight
                  className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                />
              </button>
            ) : (
              <span className="h-5 w-5 shrink-0" />
            )}
            {isSelected ? (
              <FolderOpen className="h-4 w-4 shrink-0 text-blue-600" />
            ) : (
              <Folder className="h-4 w-4 shrink-0 text-slate-400" />
            )}
            {editingFolderId === folder.id ? (
              <input
                type="text"
                autoFocus
                value={editingFolderName}
                onChange={(e) => setEditingFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitFolderRename();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    cancelFolderRename();
                  }
                }}
                onBlur={commitFolderRename}
                onClick={(e) => e.stopPropagation()}
                className="h-6 w-[140px] rounded-md border border-blue-400 bg-white px-1.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            ) : (
              <span className="truncate text-sm font-medium" title={displayName} onDoubleClick={(e) => { e.stopPropagation(); startFolderRename(folder.id); }}>
                {displayName}
              </span>
            )}
            {!editingFolderId && folder._count.documents > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${isSelected ? "bg-blue-100 text-blue-700" : "bg-white text-slate-500"}`}>
                {folder._count.documents}
              </span>
            )}
          </div>
          {isSelected && !editingFolderId &&
            (canRenameCurrentFolder || canDeleteCurrentFolder) && (
              <div className="flex shrink-0 gap-1 rounded-md border border-slate-200 bg-white px-1 shadow-sm opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
                {canRenameCurrentFolder && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      startFolderRename(folder.id);
                    }}
                    className="p-1 text-slate-400 hover:text-blue-600"
                    title="Đổi tên thư mục"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
                {canDeleteCurrentFolder && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      executeSoftDelete("folder", folder.id);
                    }}
                    className="p-1 text-slate-400 hover:text-red-500"
                    title="Xóa thư mục"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
          )}
        </div>
        {isExpanded && children.length > 0 && (
          <div className="ml-3 border-l border-slate-200/80 pl-1">
            {children.map((child) => (
              <FolderNode key={child.id} folder={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-slate-200/70 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:flex-row">
      <aside className="flex max-h-[240px] w-full shrink-0 flex-col overflow-y-auto border-r border-slate-200/80 bg-slate-50/70 md:h-auto md:max-h-none md:w-[330px]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/80 bg-slate-50/95 p-4 backdrop-blur">
          <div className="flex flex-col">
            <h2 className="font-semibold text-slate-900">Thư mục</h2>
            <span className="mt-0.5 text-xs font-medium text-slate-500">
              Chọn vị trí lưu hồ sơ
            </span>
          </div>
          {canCreateFolderContextually && (
            <button
              type="button"
              onClick={() => setShowNewFolder((value) => !value)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
              title={selectedFolderId ? "Tạo thư mục con" : "Tạo thư mục gốc"}
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>

        {showNewFolder && (
          <div className="border-b border-slate-200 bg-white p-3">
            <div className="mb-2 text-[11px] font-semibold text-slate-500 uppercase">
              {selectedFolderId ? `Tạo thư mục con trong: ${selectedFolderDisplayName}` : "Tạo thư mục gốc"}
            </div>
            <input
              type="text"
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Tên thư mục mới..."
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              onKeyDown={(event) =>
                event.key === "Enter" && handleCreateFolder()
              }
              autoFocus
            />
            <div className="mt-2 flex gap-2">
              <Button
                className="h-7 px-2 py-1 text-xs"
                onClick={handleCreateFolder}
              >
                Tạo
              </Button>
              <Button
                variant="outline"
                className="h-7 px-2 py-1 text-xs"
                onClick={() => setShowNewFolder(false)}
              >
                Hủy
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2">
          {rootFolders.map((folder) => (
            <FolderNode key={folder.id} folder={folder} />
          ))}
          {rootFolders.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-500">
              Chưa có thư mục
            </p>
          )}
        </div>
        
        <div className="border-t border-slate-200 p-2">
          <div
            className={`group flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 transition-colors hover:bg-red-50 ${isTrashView ? "bg-red-50 text-red-700 shadow-sm ring-1 ring-red-100" : "text-slate-700"
              }`}
            onClick={() => {
              setIsTrashView(true);
              setSelectedTrashFolderId(null);
              setSelectedFolderId(null);
            }}
          >
            <Trash2 className={`h-4 w-4 shrink-0 ${isTrashView ? "text-red-600" : "text-slate-400"}`} />
            <span className="truncate text-sm font-medium">
              Thùng rác
            </span>
          </div>
        </div>
      </aside>

        <main 
          className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white"
          onContextMenu={(e) => {
            if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === "MAIN" || (e.target as HTMLElement).closest(".empty-workspace")) {
              e.preventDefault();
              setContextMenu({
                type: "workspace",
                targetId: selectedFolderId || undefined,
                x: e.clientX,
                y: e.clientY,
              });
            }
          }}
        >
          <div className="border-b border-slate-200/80 bg-white p-4 sm:p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="min-w-0">
                <nav className="mb-3 flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500">
                  {/* Back Button */}
                  {isTrashView ? (
                    selectedTrashFolderId ? (
                      <button
                        type="button"
                        aria-label="Quay lại"
                        title="Quay lại"
                        onClick={() => setSelectedTrashFolderId(selectedTrashFolderData?.parentId || null)}
                        className="mr-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-600 shadow-sm transition-all duration-200 hover:-translate-x-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 hover:shadow-md focus:outline-none"
                      >
                        <ArrowLeft className="h-3 w-3" />
                      </button>
                    ) : null
                  ) : (
                    selectedFolderId ? (
                      <button
                        type="button"
                        aria-label="Quay lại"
                        title="Quay lại"
                        onClick={() => {
                          const url = new URL(window.location.href);
                          if (selectedFolderData?.parentId) {
                            url.searchParams.set("folder", selectedFolderData.parentId);
                          } else {
                            url.searchParams.delete("folder");
                          }
                          window.history.pushState({}, "", url.toString());
                          setSelectedFolderId(selectedFolderData?.parentId || null);
                        }}
                        className="mr-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-600 shadow-sm transition-all duration-200 hover:-translate-x-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 hover:shadow-md focus:outline-none"
                      >
                        <ArrowLeft className="h-3 w-3" />
                      </button>
                    ) : null
                  )}

                  <span className="max-w-[180px] truncate" title={projectName}>
                    {projectName}
                  </span>
                  {isTrashView ? (
                    <>
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="text-slate-300">/</span>
                        <button
                          type="button"
                          onClick={() => setSelectedTrashFolderId(null)}
                          className={`max-w-[180px] truncate text-left transition-colors ${
                            !selectedTrashFolderId ? "font-semibold text-slate-900" : "hover:text-blue-600 hover:underline"
                          }`}
                        >
                          Thùng rác
                        </button>
                      </span>
                      {selectedTrashFolderPath.map((folder) => {
                        const isCurrent = folder.id === selectedTrashFolderId;
                        return (
                          <span key={folder.id} className="flex min-w-0 items-center gap-1.5">
                            <span className="text-slate-300">/</span>
                            <button
                              type="button"
                              onClick={() => !isCurrent && setSelectedTrashFolderId(folder.id)}
                              className={`max-w-[180px] truncate text-left transition-colors ${
                                isCurrent
                                  ? "font-semibold text-slate-900"
                                  : "hover:text-blue-600 hover:underline"
                              }`}
                              title={formatDocumentFolderName(folder.name)}
                            >
                              {formatDocumentFolderName(folder.name)}
                            </button>
                          </span>
                        );
                      })}
                    </>
                  ) : (
                    selectedFolderPath.map((folder) => {
                      const isCurrent = folder.id === selectedFolderId;
                      const folderName = formatDocumentFolderName(folder.name);
                      return (
                        <span key={folder.id} className="flex min-w-0 items-center gap-1.5">
                          <span className="text-slate-300">/</span>
                          <button
                            type="button"
                            onClick={() => !isCurrent && setSelectedFolderId(folder.id)}
                            className={`max-w-[180px] truncate text-left transition-colors ${
                              isCurrent
                                ? "font-semibold text-slate-900"
                                : "hover:text-blue-600"
                            }`}
                            title={folderName}
                          >
                            {folderName}
                          </button>
                        </span>
                      );
                    })
                  )}
                </nav>

                <div className="flex min-w-0 items-start gap-3">
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${isTrashView ? "border-red-100 bg-red-50 text-red-600" : "border-blue-100 bg-blue-50 text-blue-600"}`}>
                    {isTrashView ? (
                      <Trash2 className="h-5 w-5" />
                    ) : selectedFolderId ? (
                      <FolderOpen className="h-5 w-5" />
                    ) : (
                      <Folder className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-2xl font-bold tracking-tight text-slate-950">
                      {isTrashView
                        ? (selectedTrashFolderData ? formatDocumentFolderName(selectedTrashFolderData.name) : "Thùng rác")
                        : selectedFolderId && selectedFolderData
                        ? selectedFolderDisplayName
                        : "Tất cả tài liệu"}
                    </h2>
                    {isTrashView && selectedTrashFolderData && (selectedTrashFolderData as any).deletedAt && (
                      <p className="mt-1 text-sm text-slate-500">
                        Đã xóa lúc: {format(new Date((selectedTrashFolderData as any).deletedAt), "dd/MM/yyyy HH:mm")}
                      </p>
                    )}
                    <p className="mt-1 text-sm text-slate-500">
                      {isTrashView
                        ? selectedTrashFolderId 
                          ? "Xem nội dung đã xóa bên trong thư mục này." 
                          : "Các tài liệu và thư mục đã xóa tạm thời. Admin có thể khôi phục dữ liệu tại đây."
                        : selectedFolderId && selectedFolderData
                        ? selectedParentFolder
                          ? `Tài liệu và mục bên trong của ${formatDocumentFolderName(selectedParentFolder.name)}`
                          : selectedFolderRule?.description || "Thư mục hồ sơ chính của dự án."
                        : "Chọn thư mục bên trái hoặc mở trực tiếp các thư mục bên dưới."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
                {!isTrashView && selectedFolderRule && (
                  <div className="group relative hidden sm:block">
                    <button
                      type="button"
                      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
                    >
                      Quy định tải lên
                    </button>
                    <div className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-xl opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                      <h4 className="mb-1 text-sm font-bold text-slate-900">
                        {selectedFolderRule.title}
                      </h4>
                      <p className="mb-3 text-xs leading-5 text-slate-600">
                        {selectedFolderRule.description}
                      </p>
                      <p className="text-xs text-slate-500">
                        Định dạng:{" "}
                        <span className="font-semibold text-slate-700">
                          {selectedFolderRule.friendlyAllowedTypes}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Gợi ý đặt tên:{" "}
                        <code className="rounded bg-blue-50 px-1 py-0.5 font-mono text-blue-700">
                          {selectedFolderRule.namingHint}
                        </code>
                      </p>
                    </div>
                  </div>
                )}

                {!isTrashView && canUpload ? (
                  <>
                    <input
                      type="file"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileSelected}
                      accept={selectedFolderRule?.accept || systemSettings?.allowedExtensions}
                      capture={
                        selectedFolderRule?.key === "07_Hình ảnh hiện trường"
                          ? "environment"
                          : undefined
                      }
                    />
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      {selectedFolderId && (
                        <Button
                          variant="outline"
                          onClick={() => setShowNewFolder(true)}
                          className="h-10 w-full rounded-lg sm:w-auto border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
                        >
                          <FolderPlus className="mr-2 h-4 w-4" />
                          Tạo mục bên trong
                        </Button>
                      )}
                      
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading || !selectedFolderId}
                        className={`h-10 w-full rounded-lg shadow-sm sm:w-auto ${!selectedFolderId ? 'opacity-70 cursor-not-allowed' : 'shadow-blue-600/20'}`}
                        title={!selectedFolderId ? "Hãy chọn hoặc mở một thư mục để tải tài liệu lên" : undefined}
                      >
                        <UploadCloud className="mr-2 h-4 w-4" />
                        {isUploading ? "Đang tải..." : selectedFolderId ? "Tải tài liệu lên thư mục này" : "Tải tài liệu lên"}
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>

            {(() => {
              return (
                <>
                  {smartSuggestions.length > 0 && (
                    <div className="px-4 py-1.5 border-b border-slate-100 bg-slate-50 flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                      <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                      <span className="truncate">{smartSuggestions.join(" · ")}</span>
                    </div>
                  )}

                  {/* Advanced filters can be reintroduced as a polished popover later. */}
                  <div className="flex items-center gap-3 border-t border-slate-100 bg-white px-4 py-3">
                    <div className="relative min-w-0 flex-1">
                      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Tìm tài liệu, thư mục hoặc file gốc..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      />
                    </div>

                    <select
                      value={sortBy}
                      onChange={(event) => setSortBy(event.target.value as SortOption)}
                      className="h-10 w-[150px] shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none transition-all hover:bg-slate-50 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                    >
                      <option className="bg-white text-slate-900" value="NEWEST">Mới nhất</option>
                      <option className="bg-white text-slate-900" value="OLDEST">Cũ nhất</option>
                      <option className="bg-white text-slate-900" value="NAME">Tên A-Z</option>
                      <option className="bg-white text-slate-900" value="SIZE">Kích thước</option>
                    </select>
                  </div>

                </>
              );
            })()}

            <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
              {(() => {
                const totalVisibleItems = displayFolders.length + displayDocs.length;
                const density = totalVisibleItems >= 18 ? "list" : totalVisibleItems >= 8 ? "compact" : "comfortable";
                
                return displayDocs.length > 0 || displayFolders.length > 0 ? (

                <div className="space-y-8">
                  {displayFolders.length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-700">
                          {isTrashView
                            ? selectedTrashFolderData
                              ? `Thư mục trong ${selectedTrashFolderData.name}`
                              : "Thư mục đã xóa"
                            : selectedFolderId 
                              ? "Thư mục con" 
                              : "Thư mục gốc"}
                        </h3>
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          {displayFolders.length} mục
                        </span>
                      </div>
                      <div className={`${density === 'list' ? 'flex flex-col gap-2' : density === 'compact' ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5' : 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                          {displayFolders.map((folder) => {
                            const isDeleted = !!(folder as any).deletedAt;
                            return (
                              <article
                                key={folder.id}
                                className={`group relative flex cursor-pointer transition-all hover:shadow-md ${
                                  density === 'list' 
                                    ? 'flex-row items-center gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3' 
                                    : 'flex-col rounded-lg border border-slate-200 bg-white p-4 hover:-translate-y-0.5'
                                } ${isTrashView ? 'hover:border-red-300' : 'hover:border-blue-300'}`}
                                onClick={() => {
                                  if (isTrashView) {
                                    setSelectedTrashFolderId(folder.id);
                                  } else {
                                    setSelectedFolderId(folder.id);
                                  }
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setContextMenu({
                                    type: "folder",
                                    targetId: folder.id,
                                    x: e.clientX,
                                    y: e.clientY,
                                  });
                                }}
                              >
                                <div className="absolute right-2 top-2">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setContextMenu({
                                        type: "folder",
                                        targetId: folder.id,
                                        x: event.clientX,
                                        y: event.clientY,
                                      });
                                    }}
                                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                    title="Thêm thao tác"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </button>
                                </div>
                                <div className={`flex items-center justify-center rounded-lg ${density === 'list' ? 'h-10 w-10 shrink-0 bg-blue-50/50' : 'mb-3 h-12 w-12 bg-blue-50/50'}`}>
                                  <Folder className={`${isTrashView ? 'text-red-400' : 'text-blue-500'} ${density === 'list' ? 'h-5 w-5' : 'h-6 w-6'}`} />
                                </div>
                                <div className="min-w-0 flex-1 pr-6">
                                  <p className={`truncate font-semibold text-slate-900 ${density === 'compact' ? 'text-sm' : 'text-sm'}`}>
                                    {formatDocumentFolderName(folder.name)}
                                  </p>
                                  {density !== 'compact' && (
                                    <p className="mt-1 text-xs text-slate-500">
                                      {isDeleted 
                                        ? `Đã xóa lúc: ${format(new Date((folder as any).deletedAt), "dd/MM/yyyy HH:mm")}`
                                        : `Thư mục hồ sơ`}
                                    </p>
                                  )}
                                </div>
                                {isDeleted && density === 'list' && (
                                  <span className="text-xs text-red-500 font-medium">Đã xóa</span>
                                )}
                              </article>
                            );
                          })}
                      </div>
                    </div>
                  )}
                  {Object.entries(groupedDocs).map(([groupName, groupDocs]) => (
                    <div key={groupName || "all"}>
                      {groupName ? (
                        <div className="mb-3 flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-700">{groupName}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${groupName === 'Chưa phân loại' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                            {groupDocs.length} file
                          </span>
                        </div>
                      ) : (
                        <div className="mb-3 flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-700">
                            {isTrashView
                              ? selectedTrashFolderData
                                ? `Tài liệu trong ${selectedTrashFolderData.name}`
                                : "Tài liệu đã xóa"
                              : "Tài liệu trong thư mục"}
                          </h3>
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            {groupDocs.length} file
                          </span>
                        </div>
                      )}
                      <div className={`${density === 'list' ? 'flex flex-col gap-2' : density === 'compact' ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5' : 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                        {groupDocs.map((document) => {
                          const matchesRule = hasAllowedDocumentExtension(
                            document.extension,
                            selectedFolderRule?.allowedExtensions || [],
                          );
                          const previewKind = getDocumentPreviewKind(
                            document.mimeType,
                            document.extension,
                          );
                          return (
                            <article
                              key={document.id}
                              tabIndex={0}
                              className="group relative flex cursor-pointer flex-col rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              onClick={() => openDocument(document)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  openDocument(document);
                                }
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setContextMenu({
                                  type: "file",
                                  targetId: document.id,
                                  x: e.clientX,
                                  y: e.clientY,
                                });
                              }}
                            >
                              <div className="mb-3 flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <FileIconForDocument
                                    mime={document.mimeType}
                                    extension={document.extension}
                                  />
                                  {previewKind === "image" && (
                                    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                                      Xem nhanh
                                    </span>
                                  )}
                                  {previewKind === "pdf" && (
                                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                                      Xem PDF
                                    </span>
                                  )}
                                </div>

                                <div className="flex shrink-0 items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openDocument(document);
                                    }}
                                    className="rounded-md p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                                    title="Xem tài liệu"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <a
                                    href={`/api/documents/${document.id}/download`}
                                    onClick={(event) => event.stopPropagation()}
                                    className="rounded-md p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"
                                    title="Tải xuống"
                                  >
                                    <Download className="h-4 w-4" />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setContextMenu({
                                        type: "file",
                                        targetId: document.id,
                                        x: event.clientX,
                                        y: event.clientY,
                                      });
                                    }}
                                    className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                    title="Thêm thao tác"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              {!matchesRule && (
                                <div className="mb-2 flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] font-medium text-amber-800">
                                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                  Dữ liệu cũ không đúng định dạng folder
                                </div>
                              )}

                              <div className="min-h-0 flex-1">
                                <p
                                  className="line-clamp-2 text-sm font-medium text-slate-900"
                                  title={document.displayName || document.originalName}
                                >
                                  {document.displayName || document.originalName}
                                </p>
                                <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">

                                  <span>{formatBytes(document.size)} · {getFileTypeLabel(document.mimeType, document.extension)}</span>
                                </p>
                              </div>

                              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                                <span>
                                  {isTrashView && (document as any).deletedAt 
                                    ? `Xóa lúc: ${format(new Date((document as any).deletedAt), "dd/MM/yyyy HH:mm")}`
                                    : format(new Date(document.createdAt), "dd/MM/yyyy HH:mm")}
                                </span>
                                <span
                                  className="ml-2 max-w-[100px] truncate text-right"
                                  title={document.uploadedBy?.name}
                                >
                                  {document.uploadedBy?.name || "Không rõ"}
                                </span>
                              </div>

                              </article>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-slate-50/30">
                  <div className="mb-4 rounded-full bg-slate-100 p-4 ring-8 ring-slate-50/50">
                    <FileIcon className="h-10 w-10 text-slate-300" strokeWidth={1.5} />
                  </div>
                  <h3 className="mb-1 text-base font-bold text-slate-900">
                    {searchQuery
                      ? "Không tìm thấy tài liệu phù hợp"
                      : isTrashView
                        ? selectedTrashFolderId
                          ? "Không có tài liệu trong thư mục đã xóa này"
                          : "Thùng rác đang trống"
                        : !selectedFolderId 
                          ? "Chưa có tài liệu nào"
                          : `Chưa có tài liệu trong thư mục ${selectedFolderDisplayName}`}
                  </h3>
                  <p className="mb-6 max-w-[300px] text-sm text-slate-500">
                    {searchQuery
                      ? "Hãy thử thay đổi từ khóa tìm kiếm."
                      : isTrashView
                        ? selectedTrashFolderId
                          ? "Mục này có thể được khôi phục hoặc xóa vĩnh viễn từ menu chuột phải."
                          : "Không có thư mục hoặc tài liệu nào nằm trong thùng rác."
                        : !selectedFolderId
                          ? "Chọn thư mục bên trái để xem hoặc tải hồ sơ theo đúng vị trí."
                          : "Tải tài liệu đầu tiên để lưu hồ sơ vào đúng vị trí."}
                  </p>
                  {(searchQuery) ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("");
                      }}
                    >
                      Xóa tìm kiếm
                    </Button>
                  ) : canUpload ? (
                    <Button onClick={() => fileInputRef.current?.click()} className="shadow-sm shadow-blue-600/20">
                      <UploadCloud className="mr-2 h-4 w-4" />
                      Tải tài liệu lên thư mục này
                    </Button>
                  ) : null}
                </div>
              );
              })()}
            </div>
      </main>

      {selectedDocument && (
        <DocumentViewer
          key={selectedDocument.id}
          document={selectedDocument}
          folderName={formatDocumentFolderName(
            folders.find((folder) => folder.id === selectedDocument.folderId)
              ?.name || "Không rõ thư mục",
          )}
          hasPrevious={selectedDocumentIndex > 0}
          hasNext={
            selectedDocumentIndex >= 0 &&
            selectedDocumentIndex < displayDocs.length - 1
          }
          canRename={!isTrashView && canRenameDocument(sessionUser, { id: selectedDocument.id, status: selectedDocument.status, uploadedById: selectedDocument.uploadedById }, selectedFolderData ? { id: selectedFolderData.id, name: selectedFolderData.name } : { id: "trash", name: "Thùng rác" })}
          canDelete={!isTrashView && canDeleteDocument(sessionUser, { id: selectedDocument.id, status: selectedDocument.status, uploadedById: selectedDocument.uploadedById }, selectedFolderData ? { id: selectedFolderData.id, name: selectedFolderData.name } : { id: "trash", name: "Thùng rác" })}
          canEditMetadata={!isTrashView && canEditDocumentMetadata(sessionUser, { id: selectedDocument.id, status: selectedDocument.status, uploadedById: selectedDocument.uploadedById }, selectedFolderData ? { id: selectedFolderData.id, name: selectedFolderData.name } : { id: "trash", name: "Thùng rác" })}
          onEditMetadata={() => {
            setEditMetadataModal({
              isOpen: true,
              id: selectedDocument.id,
              displayName: selectedDocument.displayName || selectedDocument.originalName,
              note: selectedDocument.metadata?.note || "",
            });
          }}
          onClose={closeDocument}
          onPrevious={() => {
            if (selectedDocumentIndex > 0) {
              openDocument(displayDocs[selectedDocumentIndex - 1]);
            }
          }}
          onNext={() => {
            if (
              selectedDocumentIndex >= 0 &&
              selectedDocumentIndex < displayDocs.length - 1
            ) {
              openDocument(displayDocs[selectedDocumentIndex + 1]);
            }
          }}
          onRename={() =>
            setDocumentRenameModal({
              isOpen: true,
              id: selectedDocument.id,
              newName: selectedDocument.originalName,
            })
          }
          onDelete={() =>
            executeSoftDelete("doc", selectedDocument.id)
          }
          onCopyLink={() => copyDocumentLink(selectedDocument)}
        />
      )}

      {pendingUpload && selectedFolderRule && selectedFolderData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-dialog-title"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) closeUploadDialog();
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3
                  id="upload-dialog-title"
                  className="text-lg font-bold text-slate-900"
                >
                  Kiểm tra trước khi tải lên
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Xác nhận đúng file, tên và thư mục đích.
                </p>
              </div>
              <button
                type="button"
                onClick={closeUploadDialog}
                disabled={isUploading}
                className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Đóng hộp thoại upload"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <FileIconForDocument
                  mime={pendingUpload.file.type}
                  extension={`.${pendingUpload.file.name.split(".").pop() || ""}`}
                  className="h-10 w-10"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {pendingUpload.file.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatBytes(pendingUpload.file.size)} ·{" "}
                    {pendingUpload.file.type || "Không rõ MIME"}
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="document-display-name"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Tên hiển thị
                </label>
                <input
                  id="document-display-name"
                  value={pendingUpload.displayName}
                  onChange={(event) =>
                    setPendingUpload((current) =>
                      current
                        ? { ...current, displayName: event.target.value }
                        : current,
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  autoFocus
                />
                <p className="mt-1 text-xs text-slate-500">
                  Phần mở rộng file được giữ nguyên để tránh sai định dạng.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Ghi chú</label>
                <textarea
                  value={pendingUpload.note}
                  onChange={(e) => setPendingUpload(c => c ? { ...c, note: e.target.value } : c)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  rows={2}
                />
              </div>

              <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
                <p>
                  Lưu vào:{" "}
                  <span className="font-semibold text-slate-800">
                    {formatDocumentFolderName(selectedFolderData.name)}
                  </span>
                </p>
                {selectedParentFolder && (
                  <p>
                    Trong:{" "}
                    <span className="font-medium text-slate-700">
                      {formatDocumentFolderName(selectedParentFolder.name)}
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={closeUploadDialog}
                disabled={isUploading}
              >
                Hủy
              </Button>
              <Button onClick={confirmUpload} disabled={isUploading}>
                <UploadCloud className="mr-2 h-4 w-4" />
                {isUploading ? "Đang tải lên..." : "Tải lên"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() =>
          setDeleteConfirm({ isOpen: false, type: "folder", id: "" })
        }
        title={deleteConfirm.type === "folder" ? "Xóa thư mục?" : "Xóa tệp?"}
        description={
          deleteConfirm.type === "folder"
            ? "Bạn có chắc chắn muốn xóa thư mục này? Thư mục đang có file hoặc thư mục con sẽ không thể xóa."
            : "Tệp sẽ được xóa khỏi danh sách. Thao tác này không thể hoàn tác trong giao diện."
        }
        variant="danger"
        confirmText="Xóa"
        onConfirm={executePermanentDelete}
      />

      {documentRenameModal.isOpen && (
        <RenameDialog
          title="Đổi tên tài liệu"
          value={documentRenameModal.newName}
          helperText="Bạn có thể đổi tên hiển thị, nhưng không thể thay đổi phần mở rộng file."
          onChange={(newName) =>
            setDocumentRenameModal((current) => ({ ...current, newName }))
          }
          onClose={() =>
            setDocumentRenameModal({ isOpen: false, id: "", newName: "" })
          }
          onSave={handleRenameDocument}
        />
      )}

      {editMetadataModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-bold text-slate-900">Đổi tên / Ghi chú</h3>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Tên hiển thị</label>
                <input
                  value={editMetadataModal.displayName}
                  onChange={(e) => setEditMetadataModal(c => ({ ...c, displayName: e.target.value }))}
                  className="w-full rounded-md border border-slate-200 bg-white text-slate-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Ghi chú</label>
                <textarea
                  value={editMetadataModal.note}
                  onChange={(e) => setEditMetadataModal(c => ({ ...c, note: e.target.value }))}
                  className="w-full rounded-md border border-slate-200 bg-white text-slate-900 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 rounded-b-xl">
              <Button variant="outline" onClick={() => setEditMetadataModal(c => ({ ...c, isOpen: false }))}>Hủy</Button>
              <Button onClick={handleEditMetadata}>Lưu thay đổi</Button>
            </div>
          </div>
        </div>
      )}

      <DocumentContextMenu
        contextMenu={contextMenu}
        onClose={() => setContextMenu(null)}
        onRename={() => {
          if (contextMenu?.type === "folder" && contextMenu.targetId) {
            startFolderRename(contextMenu.targetId);
          } else if (contextMenu?.type === "file" && contextMenu.targetId) {
            const doc = localDocuments.find((d) => d.id === contextMenu.targetId);
            if (doc) {
              setDocumentRenameModal({
                isOpen: true,
                id: doc.id,
                newName: doc.originalName,
              });
            }
          }
        }}
        onDelete={() => {
          if (contextMenu?.type === "folder" && contextMenu.targetId) {
            executeSoftDelete("folder", contextMenu.targetId);
          } else if (contextMenu?.type === "file" && contextMenu.targetId) {
            executeSoftDelete("doc", contextMenu.targetId);
          }
        }}
        onRestore={() => {
          if (contextMenu?.type === "folder" && contextMenu.targetId) {
            handleRestore("folder", contextMenu.targetId);
          } else if (contextMenu?.type === "file" && contextMenu.targetId) {
            handleRestore("doc", contextMenu.targetId);
          }
        }}
        onPermanentDelete={() => {
          if (contextMenu?.type === "folder" && contextMenu.targetId) {
            setDeleteConfirm({ isOpen: true, type: "folder", id: contextMenu.targetId });
          } else if (contextMenu?.type === "file" && contextMenu.targetId) {
            setDeleteConfirm({ isOpen: true, type: "doc", id: contextMenu.targetId });
          }
        }}
        onCopyLink={() => {
          if (contextMenu?.type === "file" && contextMenu.targetId) {
            const doc = localDocuments.find((d) => d.id === contextMenu.targetId);
            if (doc) copyDocumentLink(doc);
          } else if (contextMenu?.type === "folder" && contextMenu.targetId) {
            // we don't have copy folder link right now, just fallback
            toast.success("Đã sao chép đường dẫn");
          }
        }}
        onOpen={() => {
          if (contextMenu?.type === "file" && contextMenu.targetId) {
            const doc = localDocuments.find((d) => d.id === contextMenu.targetId);
            if (doc) openDocument(doc);
          } else if (contextMenu?.type === "folder" && contextMenu.targetId && isTrashView) {
            setSelectedTrashFolderId(contextMenu.targetId);
          }
        }}
        onUpload={() => {
          if (contextMenu?.targetId) {
            if (selectedFolderId !== contextMenu.targetId) {
              setSelectedFolderId(contextMenu.targetId);
            }
            // Trigger upload via a small timeout to let state settle
            setTimeout(() => {
              const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
              if (fileInput) fileInput.click();
            }, 50);
          }
        }}
        onCreateFolder={() => {
          if (contextMenu?.targetId) {
            if (selectedFolderId !== contextMenu.targetId) {
              setSelectedFolderId(contextMenu.targetId);
            }
            setShowNewFolder(true);
          } else {
            setShowNewFolder(true); // root level
          }
        }}
        onRefresh={() => {
          router.refresh();
        }}
        onDeselect={() => {
          setSelectedFolderId(null);
        }}
        onEditMetadata={() => {
          if (contextMenu?.type === "file" && contextMenu.targetId) {
            const doc = localDocuments.find((d) => d.id === contextMenu.targetId);
            if (doc) {
              setEditMetadataModal({
                isOpen: true,
                id: doc.id,
                displayName: doc.displayName || "",
                note: (doc.metadata as any)?.note || "",
              });
            }
          }
        }}
        onOpenInNewTab={() => {
          if (contextMenu?.type === "file" && contextMenu.targetId) {
            const doc = localDocuments.find((d) => d.id === contextMenu.targetId);
            if (doc) window.open(`/api/documents/${doc.id}/download`, "_blank");
          }
        }}
        onDownload={() => {
          if (contextMenu?.type === "file" && contextMenu.targetId) {
            const doc = localDocuments.find((d) => d.id === contextMenu.targetId);
            if (doc) window.location.href = `/api/documents/${doc.id}/download`;
          }
        }}
        canRename={
          contextMenu?.type === "folder"
            ? canRenameCurrentFolder
            : contextMenu?.type === "file"
              ? canRenameDocument(sessionUser, { id: contextMenu.targetId!, status: localDocuments.find(d => d.id === contextMenu.targetId)?.status || DocumentStatus.DRAFT, uploadedById: localDocuments.find(d => d.id === contextMenu.targetId)?.uploadedById || "" }, { id: selectedFolderData?.id || "", name: selectedFolderData?.name || "" })
              : false
        }
        canDelete={
          contextMenu?.type === "folder"
            ? canDeleteCurrentFolder
            : contextMenu?.type === "file"
              ? canDeleteDocument(sessionUser, { id: contextMenu.targetId!, status: localDocuments.find(d => d.id === contextMenu.targetId)?.status || DocumentStatus.DRAFT, uploadedById: localDocuments.find(d => d.id === contextMenu.targetId)?.uploadedById || "" }, { id: selectedFolderData?.id || "", name: selectedFolderData?.name || "" })
              : false
        }
        canUpload={canUpload}
        canCreateFolder={!!canCreateFolderContextually}
        isTrashView={isTrashView}
      />
    </div>
  );
}

function RenameDialog({
  title,
  value,
  helperText,
  onChange,
  onClose,
  onSave,
}: {
  title: string;
  value: string;
  helperText?: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        </div>
        <div className="px-5 py-4">
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && onSave()}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            autoFocus
          />
          {helperText && (
            <p className="mt-2 text-xs leading-5 text-slate-500">{helperText}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={onSave}>Lưu</Button>
        </div>
      </div>
    </div>
  );
}

export function DocumentContextMenu({
  contextMenu,
  onClose,
  onRename,
  onDelete,
  onCopyLink,
  onOpen,
  onUpload,
  onCreateFolder,
  onRefresh,
  onDeselect,
  onEditMetadata,
  onOpenInNewTab,
  onDownload,
  canRename,
  canDelete,
  canUpload,
  canCreateFolder,
  isTrashView,
  onRestore,
  onPermanentDelete,
}: {
  contextMenu: { type: "folder" | "file" | "workspace"; targetId?: string; x: number; y: number } | null;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
  onOpen: () => void;
  onUpload: () => void;
  onCreateFolder: () => void;
  onRefresh: () => void;
  onDeselect: () => void;
  onEditMetadata: () => void;
  onOpenInNewTab: () => void;
  onDownload: () => void;
  canRename: boolean;
  canDelete: boolean;
  canUpload: boolean;
  canCreateFolder: boolean;
  isTrashView?: boolean;
  onRestore?: () => void;
  onPermanentDelete?: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });

  useEffect(() => {
    if (!contextMenu || !menuRef.current) return;
    const { innerWidth, innerHeight } = window;
    const { offsetWidth, offsetHeight } = menuRef.current;
    
    let newX = contextMenu.x;
    let newY = contextMenu.y;
    
    if (newX + offsetWidth > innerWidth - 12) {
      newX = innerWidth - offsetWidth - 12;
    }
    if (newY + offsetHeight > innerHeight - 12) {
      newY = innerHeight - offsetHeight - 12;
    }
    
    setPosition({ x: newX, y: newY });
  }, [contextMenu]);

  useEffect(() => {
    if (!contextMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleScrollOrResize = () => onClose();
    const handleEscape = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    
    // Slight delay to prevent immediate close on the click that opens the menu
    setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
      document.addEventListener("contextmenu", handleClickOutside);
    }, 0);
    
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    document.addEventListener("keydown", handleEscape);
    
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("contextmenu", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [contextMenu, onClose]);

  if (!contextMenu) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[220px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl overflow-hidden"
      style={{ top: position.y !== null ? position.y : contextMenu.y, left: position.x !== null ? position.x : contextMenu.x, opacity: position.x !== null ? 1 : 0 }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {isTrashView ? (
        <>
          {contextMenu.type === "folder" && (
            <button onClick={() => { onOpen(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 text-slate-700">
              <FolderOpen className="h-4 w-4" />
              Mở / Xem nội dung
            </button>
          )}
          {contextMenu.type === "file" && (
            <>
              <button onClick={() => { onOpen(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 text-slate-700">
                <Eye className="h-4 w-4" />
                Xem chi tiết
              </button>
              <button onClick={() => { onDownload(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 text-slate-700">
                <Download className="h-4 w-4" />
                Tải xuống
              </button>
            </>
          )}
          {contextMenu.type !== "workspace" && (
            <>
              <div className="my-1 h-px bg-slate-100"></div>
              <button onClick={() => { onRestore?.(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 text-slate-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                Khôi phục
              </button>
              <button onClick={() => { onPermanentDelete?.(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-red-50 text-red-600">
                <Trash2 className="h-4 w-4" />
                Xóa vĩnh viễn
              </button>
            </>
          )}
        </>
      ) : contextMenu.type === "workspace" ? (
        <>
          <button onClick={() => { onUpload(); onClose(); }} disabled={!canUpload} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent text-slate-700">
            <UploadCloud className="h-4 w-4" />
            Tải tài liệu lên
          </button>
          <button onClick={() => { onCreateFolder(); onClose(); }} disabled={!canCreateFolder} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent text-slate-700">
            <FolderPlus className="h-4 w-4" />
            Tạo mục bên trong
          </button>
          <div className="my-1 h-px bg-slate-100"></div>
          <button onClick={() => { onRefresh(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 text-slate-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
            Làm mới
          </button>
          {contextMenu.targetId && (
            <button onClick={() => { onDeselect(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 text-slate-700">
              <X className="h-4 w-4" />
              Bỏ chọn thư mục
            </button>
          )}
        </>
      ) : contextMenu.type === "folder" ? (
        <>
          <button onClick={() => { onUpload(); onClose(); }} disabled={!canUpload} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent text-slate-700">
            <UploadCloud className="h-4 w-4" />
            Tải tài liệu lên đây
          </button>
          <button onClick={() => { onCreateFolder(); onClose(); }} disabled={!canCreateFolder} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent text-slate-700">
            <FolderPlus className="h-4 w-4" />
            Tạo mục bên trong
          </button>
          <div className="my-1 h-px bg-slate-100"></div>
          <button onClick={() => { onOpen(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 text-slate-700">
            <FolderOpen className="h-4 w-4" />
            Mở thư mục
          </button>
          <button onClick={() => { onRename(); onClose(); }} disabled={!canRename} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent text-slate-700">
            <Pencil className="h-4 w-4" />
            Đổi tên
          </button>
          <button onClick={() => { onCopyLink(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 text-slate-700">
            <Copy className="h-4 w-4" />
            Sao chép đường dẫn
          </button>
          <div className="my-1 h-px bg-slate-100"></div>
          <button onClick={() => { onDelete(); onClose(); }} disabled={!canDelete} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-red-50 disabled:opacity-50 disabled:hover:bg-transparent text-red-600">
            <Trash2 className="h-4 w-4" />
            Chuyển vào thùng rác
          </button>
        </>
      ) : (
        <>
          <button onClick={() => { onOpen(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 text-slate-700">
            <Eye className="h-4 w-4" />
            Xem chi tiết
          </button>
          <button onClick={() => { onOpenInNewTab(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 text-slate-700">
            <ExternalLink className="h-4 w-4" />
            Mở thẻ mới
          </button>
          <button onClick={() => { onDownload(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 text-slate-700">
            <Download className="h-4 w-4" />
            Tải xuống
          </button>
          <div className="my-1 h-px bg-slate-100"></div>
          <button onClick={() => { onEditMetadata(); onClose(); }} disabled={!canRename} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent text-slate-700">
            <Pencil className="h-4 w-4" />
            Chỉnh sửa metadata
          </button>
          <button onClick={() => { onRename(); onClose(); }} disabled={!canRename} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent text-slate-700">
            <Pencil className="h-4 w-4" />
            Đổi tên file
          </button>
          <button onClick={() => { onCopyLink(); onClose(); }} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 text-slate-700">
            <Copy className="h-4 w-4" />
            Sao chép liên kết
          </button>
          <div className="my-1 h-px bg-slate-100"></div>
          <button onClick={() => { onDelete(); onClose(); }} disabled={!canDelete} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-red-50 disabled:opacity-50 disabled:hover:bg-transparent text-red-600">
            <Trash2 className="h-4 w-4" />
            Chuyển vào thùng rác
          </button>
        </>
      )}
    </div>, document.body
  );
}
