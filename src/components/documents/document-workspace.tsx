"use client";

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
  Search,
  Trash2,
  UploadCloud,
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
  folders: FolderItem[];
  documents: DocumentListItem[];
  sessionUser: SessionUser;
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

function formatFolderName(name: string) {
  return name.replace(/^(\d{2})_/, "$1. ");
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
  folders,
  documents,
  sessionUser,
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
  const [changeStatusModal, setChangeStatusModal] = useState<{
    isOpen: boolean;
    id: string;
    status: DocumentStatus;
    rejectedReason: string;
  }>({ isOpen: false, id: "", status: "SUBMITTED", rejectedReason: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: "folder" | "doc";
    id: string;
  }>({ isOpen: false, type: "folder", id: "" });
  const [folderRenameModal, setFolderRenameModal] = useState<{
    isOpen: boolean;
    id: string;
    newName: string;
  }>({ isOpen: false, id: "", newName: "" });
  const [documentRenameModal, setDocumentRenameModal] = useState<{
    isOpen: boolean;
    id: string;
    newName: string;
  }>({ isOpen: false, id: "", newName: "" });

  useEffect(() => {
    setLocalDocuments(documents);
  }, [documents]);

  const replaceUrlState = useCallback(
    (folderId: string | null, documentId?: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (folderId) params.set("folder", folderId);
      else params.delete("folder");
      if (documentId) params.set("document", documentId);
      else params.delete("document");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
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

  const rootFolders = folders.filter((folder) => !folder.parentId);
  const selectedFolderData = folders.find(
    (folder) => folder.id === selectedFolderId,
  );
  const selectedFolderRule = selectedFolderData
    ? getDocumentRule(selectedFolderData.name)
    : null;

  const displayDocs = useMemo(() => {
    let filtered = localDocuments.filter(
      (document) => document.folderId === selectedFolderId,
    );

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
  ]);

  const groupedDocs = useMemo(() => {
    if (groupBy === "NONE") return { "": displayDocs };
    const groups: Record<string, DocumentListItem[]> = {};
    for (const doc of displayDocs) {
      let key = "Khác";
      if (groupBy === "STATUS") {
        const statusMap: Record<string, string> = {
          SUBMITTED: "Chờ duyệt",
          APPROVED: "Đã duyệt",
          REJECTED: "Từ chối",
          ARCHIVED: "Lưu trữ",
          SUPERSEDED: "Thay thế",
          DRAFT: "Bản nháp"
        };
        key = statusMap[doc.status] || doc.status;
      }
      else if (groupBy === "MONTH") key = format(new Date(doc.createdAt), "MM/yyyy");
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
  const canCreateNewFolder = canRenameFolder(sessionUser, { id: "new", name: "" }); // Cấp lãnh đạo
  const canUpload = selectedFolderData ? canUploadToFolder(sessionUser, { id: selectedFolderData.id, name: selectedFolderData.name }) : false;

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
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Tệp vượt quá giới hạn 50MB");
      event.target.value = "";
      return;
    }
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
        `Đã tải tài liệu lên thư mục ${formatFolderName(selectedFolderData?.name || "")}`,
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

  const handleRenameFolder = async () => {
    const name = folderRenameModal.newName.trim();
    if (mutationRef.current || !name) {
      if (!name) toast.error("Tên thư mục không được để trống");
      return;
    }

    const currentFolder = folders.find(
      (folder) => folder.id === folderRenameModal.id,
    );
    const isDuplicate = folders.some(
      (folder) =>
        folder.id !== folderRenameModal.id &&
        folder.name.toLowerCase() === name.toLowerCase() &&
        folder.parentId === currentFolder?.parentId,
    );
    if (isDuplicate) {
      toast.error("Tên thư mục đã tồn tại trong cùng cấp");
      return;
    }

    mutationRef.current = true;
    try {
      const result = await renameFolder(
        projectId,
        folderRenameModal.id,
        name,
      );
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Đổi tên thư mục thành công");
        setFolderRenameModal({ isOpen: false, id: "", newName: "" });
      }
    } catch {
      toast.error("Không thể đổi tên thư mục. Vui lòng thử lại.");
    } finally {
      mutationRef.current = false;
    }
  };

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

  const executeDelete = async () => {
    if (mutationRef.current) return;
    mutationRef.current = true;
    const { type, id } = deleteConfirm;
    setDeleteConfirm((current) => ({ ...current, isOpen: false }));

    try {
      if (type === "folder") {
        const result = await deleteFolder(projectId, id);
        if (result?.error) toast.error(result.error);
        else {
          toast.success("Xóa thư mục thành công");
          if (selectedFolderId === id) setSelectedFolderId(null);
        }
      } else {
        const result = await deleteDocument(projectId, id);
        if (result?.error) toast.error(result.error);
        else {
          setLocalDocuments((current) =>
            current.filter((document) => document.id !== id),
          );
          if (selectedDocumentId === id) closeDocument();
          toast.success("Xóa tệp thành công");
        }
      }
    } catch {
      toast.error("Không thể xóa. Vui lòng thử lại.");
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

  const handleChangeStatus = async () => {
    if (mutationRef.current) return;
    mutationRef.current = true;
    try {
      const result = await changeDocumentStatus(
        projectId,
        changeStatusModal.id,
        changeStatusModal.status,
        changeStatusModal.rejectedReason
      );
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Đã chuyển trạng thái hồ sơ");
        setLocalDocuments(current => current.map(item =>
          item.id === changeStatusModal.id
            ? { ...item, status: changeStatusModal.status, rejectedReason: changeStatusModal.status === "REJECTED" ? changeStatusModal.rejectedReason : null }
            : item
        ));
        setChangeStatusModal({ isOpen: false, id: "", status: "SUBMITTED", rejectedReason: "" });
        router.refresh();
      }
    } catch {
      toast.error("Lỗi chuyển trạng thái");
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
    const children = folders.filter((item) => item.parentId === folder.id);

    return (
      <div className="select-none">
        <div
          className={`flex cursor-pointer items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-slate-100 ${isSelected ? "bg-blue-50 text-blue-700" : "text-slate-700"
            }`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => setSelectedFolderId(folder.id)}
        >
          <div className="flex min-w-0 items-center gap-2">
            {isSelected ? (
              <FolderOpen className="h-4 w-4 shrink-0 text-blue-500" />
            ) : (
              <Folder className="h-4 w-4 shrink-0 text-slate-400" />
            )}
            <span className="truncate text-sm font-medium" title={folder.name}>
              {formatFolderName(folder.name)}
            </span>
            {folder._count.documents > 0 && (
              <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] text-slate-500">
                {folder._count.documents}
              </span>
            )}
          </div>
          {isSelected &&
            (canRenameCurrentFolder || canDeleteCurrentFolder) && (
              <div className="flex gap-1 rounded-md border border-slate-200 bg-white px-1 shadow-sm">
                {canRenameCurrentFolder && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setFolderRenameModal({
                        isOpen: true,
                        id: folder.id,
                        newName: folder.name,
                      });
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
                      setDeleteConfirm({
                        isOpen: true,
                        type: "folder",
                        id: folder.id,
                      });
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
        {isSelected &&
          children.map((child) => (
            <FolderNode key={child.id} folder={child} level={level + 1} />
          ))}
      </div>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white md:flex-row">
      <aside className="flex max-h-[210px] w-full shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-slate-50 md:h-auto md:max-h-none md:w-72">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-slate-50 p-4">
          <h2 className="font-semibold text-slate-800">Thư mục</h2>
          {canCreateNewFolder && (
            <button
              type="button"
              onClick={() => setShowNewFolder((value) => !value)}
              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-200"
              title="Tạo thư mục"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>

        {showNewFolder && (
          <div className="border-b border-slate-200 bg-white p-3">
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
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {selectedFolderId && selectedFolderRule ? (
          <>
            <div className="border-b border-slate-200 bg-white p-4">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      {selectedFolderRule.title}
                    </h2>
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {selectedFolderRule.friendlyAllowedTypes}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    {selectedFolderRule.description}
                  </p>
                  {selectedFolderRule.warning && (
                    <p className="mt-1 text-xs font-medium text-amber-600">
                      {selectedFolderRule.warning}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    Gợi ý đặt tên:{" "}
                    <span className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono text-slate-700">
                      {selectedFolderRule.namingHint}
                    </span>
                  </p>
                </div>

                {canUpload && (
                  <div className="w-full shrink-0 sm:w-auto">
                    <input
                      type="file"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileSelected}
                      accept={selectedFolderRule.accept}
                      capture={
                        selectedFolderRule.key ===
                          "07_Hình ảnh hiện trường"
                          ? "environment"
                          : undefined
                      }
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full sm:w-auto"
                    >
                      <UploadCloud className="mr-2 h-4 w-4" />
                      {isUploading
                        ? "Đang tải..."
                        : selectedFolderRule.uploadLabel}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {(() => {
              const activeFilters = [];
              if (filterType !== "ALL") activeFilters.push({ id: "type", label: "Loại file", value: filterType });
              if (filterDateRange !== "ALL") activeFilters.push({ id: "date", label: "Thời gian", value: filterDateRange === "TODAY" ? "Hôm nay" : filterDateRange === "LAST_7_DAYS" ? "7 ngày qua" : filterDateRange === "THIS_MONTH" ? "Tháng này" : "Tháng trước" });
              if (filterUploader !== "ALL") activeFilters.push({ id: "uploader", label: "Người tải lên", value: availableUploaders.find(u => u.id === filterUploader)?.name || filterUploader });

              const activeFilterCount = activeFilters.length;
              return (
                <>
                  {smartSuggestions.length > 0 && (
                    <div className="px-4 py-1.5 border-b border-slate-100 bg-slate-50 flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                      <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                      <span className="truncate">{smartSuggestions.join(" · ")}</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                      <div className="relative min-w-0 flex-1">
                        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Tìm tên hiển thị hoặc file gốc..."
                          value={searchQuery}
                          onChange={(event) => setSearchQuery(event.target.value)}
                          className="w-full rounded-md border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
                        <button
                          type="button"
                          onClick={() => setShowFilters(!showFilters)}
                          className={`shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium flex items-center gap-1.5 transition-colors ${activeFilterCount > 0 || showFilters
                              ? "border-blue-300 bg-blue-50 text-blue-700"
                              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                        >
                          Bộ lọc {activeFilterCount > 0 && `(${activeFilterCount})`}
                        </button>

                        <select
                          value={sortBy}
                          onChange={(event) => setSortBy(event.target.value as SortOption)}
                          className="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option className="bg-white text-slate-900" value="NEWEST">Mới nhất</option>
                          <option className="bg-white text-slate-900" value="OLDEST">Cũ nhất</option>
                          <option className="bg-white text-slate-900" value="NAME">Tên A-Z</option>
                          <option className="bg-white text-slate-900" value="SIZE">Kích thước</option>
                        </select>
                      </div>
                    </div>

                    {activeFilterCount > 0 && (
                      <div className="flex flex-wrap items-center gap-2 text-[13px] text-slate-600">
                        <span>Đang lọc:</span>
                        <span className="font-medium text-slate-800">
                          {activeFilters.map(f => f.value).join(" · ")}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setFilterType("ALL");
                            setFilterDateRange("ALL");
                            setFilterUploader("ALL");
                          }}
                          className="text-xs font-medium text-blue-600 hover:underline ml-1"
                        >
                          [Xóa]
                        </button>
                      </div>
                    )}
                  </div>

                  {showFilters && (
                    <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Loại file</label>
                          <select
                            value={filterType}
                            onChange={(event) => setFilterType(event.target.value)}
                            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option className="bg-white text-slate-900 font-medium" value="ALL">Tất cả loại file</option>
                            <option className="bg-white text-slate-900" value="IMAGE">Ảnh</option>
                            <option className="bg-white text-slate-900" value="PDF">PDF</option>
                            <option className="bg-white text-slate-900" value="WORD">Word</option>
                            <option className="bg-white text-slate-900" value="EXCEL">Excel</option>
                            <option className="bg-white text-slate-900" value="CAD">CAD</option>
                            <option className="bg-white text-slate-900" value="XML">XML</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Thời gian</label>
                          <select
                            value={filterDateRange}
                            onChange={(event) => setFilterDateRange(event.target.value)}
                            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option className="bg-white text-slate-900 font-medium" value="ALL">Tất cả thời gian</option>
                            <option className="bg-white text-slate-900" value="TODAY">Hôm nay</option>
                            <option className="bg-white text-slate-900" value="LAST_7_DAYS">7 ngày qua</option>
                            <option className="bg-white text-slate-900" value="THIS_MONTH">Tháng này</option>
                            <option className="bg-white text-slate-900" value="LAST_MONTH">Tháng trước</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Người tải lên</label>
                          <select
                            value={filterUploader}
                            onChange={(event) => setFilterUploader(event.target.value)}
                            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option className="bg-white text-slate-900 font-medium" value="ALL">Tất cả người tải</option>
                            {availableUploaders.map(u => (
                              <option className="bg-white text-slate-900" key={u.id} value={u.id}>{u.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Gom nhóm hiển thị</label>
                          <select
                            value={groupBy}
                            onChange={(event) => setGroupBy(event.target.value)}
                            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option className="bg-white text-slate-900 font-medium" value="NONE">Hiển thị bình thường</option>
                            <option className="bg-white text-slate-900" value="STATUS">Gom theo trạng thái</option>
                            <option className="bg-white text-slate-900" value="MONTH">Gom theo tháng</option>
                            <option className="bg-white text-slate-900" value="UPLOADER">Gom theo người tải</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end border-t border-slate-200 pt-3">
                        <button
                          type="button"
                          onClick={() => setShowFilters(false)}
                          className="rounded-md bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 shadow-sm"
                        >
                          Hoàn tất
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
              {displayDocs.length > 0 ? (
                <div className="space-y-8">
                  {Object.entries(groupedDocs).map(([groupName, groupDocs]) => (
                    <div key={groupName || "all"}>
                      {groupName && (
                        <div className="mb-3 flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-700">{groupName}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${groupName === 'Chưa phân loại' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                            {groupDocs.length} file
                          </span>
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {groupDocs.map((document) => {
                          const matchesRule = hasAllowedDocumentExtension(
                            document.extension,
                            selectedFolderRule.allowedExtensions,
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
                                      setOpenMenuId((current) =>
                                        current === document.id ? null : document.id,
                                      );
                                    }}
                                    className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                    title="Thêm thao tác"
                                    aria-expanded={openMenuId === document.id}
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
                                  {document.status !== "SUBMITTED" && (
                                    <span className={`px-1.5 py-0.5 rounded font-semibold text-[10px] ${document.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" :
                                        document.status === "REJECTED" ? "bg-red-100 text-red-700" :
                                          "bg-slate-100 text-slate-700"
                                      }`}>
                                      {document.status === "APPROVED" ? "Đã duyệt" : document.status === "REJECTED" ? "Từ chối" : document.status === "ARCHIVED" ? "Lưu trữ" : "Thay thế"}
                                    </span>
                                  )}
                                  <span>{formatBytes(document.size)} · {getFileTypeLabel(document.mimeType, document.extension)}</span>
                                </p>
                              </div>

                              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                                <span>
                                  {format(
                                    new Date(document.createdAt),
                                    "dd/MM/yyyy HH:mm",
                                  )}
                                </span>
                                <span
                                  className="ml-2 max-w-[100px] truncate text-right"
                                  title={document.uploadedBy?.name}
                                >
                                  {document.uploadedBy?.name || "Không rõ"}
                                </span>
                              </div>

                              {openMenuId === document.id && (
                                <div
                                  className="absolute right-3 top-12 z-20 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => openDocument(document)}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                  >
                                    <Eye className="h-4 w-4" /> Xem trong app
                                  </button>
                                  <a
                                    href={`/api/documents/${document.id}/download?preview=true`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                  >
                                    <ExternalLink className="h-4 w-4" /> Mở tab mới
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => copyDocumentLink(document)}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                  >
                                    <Copy className="h-4 w-4" /> Sao chép link nội bộ
                                  </button>
                                  {canRenameDocument(sessionUser, { id: document.id, status: document.status, uploadedById: document.uploadedById }, { id: selectedFolderData!.id, name: selectedFolderData!.name }) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDocumentRenameModal({
                                          isOpen: true,
                                          id: document.id,
                                          newName: document.originalName,
                                        });
                                        setOpenMenuId(null);
                                      }}
                                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                    >
                                      <Pencil className="h-4 w-4" /> Đổi tên
                                    </button>
                                  )}
                                  {canDeleteDocument(sessionUser, { id: document.id, status: document.status, uploadedById: document.uploadedById }, { id: selectedFolderData!.id, name: selectedFolderData!.name }) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDeleteConfirm({
                                          isOpen: true,
                                          type: "doc",
                                          id: document.id,
                                        });
                                        setOpenMenuId(null);
                                      }}
                                      className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" /> Xóa
                                    </button>
                                  )}
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center space-y-3 text-center text-slate-500">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-white">
                    <FileType className="h-8 w-8 text-slate-300" />
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="font-medium text-slate-700">
                      {searchQuery || filterType !== "ALL"
                        ? "Không có tài liệu phù hợp bộ lọc"
                        : selectedFolderRule.emptyStateText}
                    </p>
                    <p className="mb-4 mt-1 text-sm">
                      {searchQuery || filterType !== "ALL"
                        ? "Hãy thử xóa bộ lọc hoặc tìm bằng từ khóa khác."
                        : "Hãy tải tài liệu hợp lệ theo đúng định dạng được gợi ý."}
                    </p>
                    {canUpload &&
                      !searchQuery &&
                      filterType === "ALL" && (
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                        >
                          <UploadCloud className="mr-2 h-4 w-4" />
                          {selectedFolderRule.uploadLabel}
                        </Button>
                      )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 p-8 text-center text-slate-500">
            <FolderOpen className="mb-4 h-16 w-16 text-slate-300" />
            <h3 className="mb-1 text-lg font-medium text-slate-900">
              Chọn thư mục
            </h3>
            <p className="text-sm">
              Vui lòng chọn một thư mục bên trái để xem và tải lên tài liệu.
            </p>
          </div>
        )}
      </main>

      {selectedDocument && (
        <DocumentViewer
          key={selectedDocument.id}
          document={selectedDocument}
          folderName={formatFolderName(
            folders.find((folder) => folder.id === selectedDocument.folderId)
              ?.name || "Không rõ thư mục",
          )}
          hasPrevious={selectedDocumentIndex > 0}
          hasNext={
            selectedDocumentIndex >= 0 &&
            selectedDocumentIndex < displayDocs.length - 1
          }
          canRename={canRenameDocument(sessionUser, { id: selectedDocument.id, status: selectedDocument.status, uploadedById: selectedDocument.uploadedById }, { id: selectedFolderData!.id, name: selectedFolderData!.name })}
          canDelete={canDeleteDocument(sessionUser, { id: selectedDocument.id, status: selectedDocument.status, uploadedById: selectedDocument.uploadedById }, { id: selectedFolderData!.id, name: selectedFolderData!.name })}
          canEditMetadata={canEditDocumentMetadata(sessionUser, { id: selectedDocument.id, status: selectedDocument.status, uploadedById: selectedDocument.uploadedById }, { id: selectedFolderData!.id, name: selectedFolderData!.name })}
          canChangeStatus={canChangeDocumentStatus(sessionUser, { id: selectedDocument.id, status: selectedDocument.status, uploadedById: selectedDocument.uploadedById })}
          onEditMetadata={() => {
            setEditMetadataModal({
              isOpen: true,
              id: selectedDocument.id,
              displayName: selectedDocument.displayName || selectedDocument.originalName,
              note: selectedDocument.metadata?.note || "",
            });
          }}
          onChangeStatus={() => {
            setChangeStatusModal({
              isOpen: true,
              id: selectedDocument.id,
              status: selectedDocument.status,
              rejectedReason: selectedDocument.rejectedReason || "",
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
            setDeleteConfirm({
              isOpen: true,
              type: "doc",
              id: selectedDocument.id,
            })
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

              <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                Lưu vào thư mục: <span className="font-medium text-slate-700">{formatFolderName(selectedFolderData.name)}</span>
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
        onConfirm={executeDelete}
      />

      {folderRenameModal.isOpen && (
        <RenameDialog
          title="Đổi tên thư mục"
          value={folderRenameModal.newName}
          onChange={(newName) =>
            setFolderRenameModal((current) => ({ ...current, newName }))
          }
          onClose={() =>
            setFolderRenameModal({ isOpen: false, id: "", newName: "" })
          }
          onSave={handleRenameFolder}
        />
      )}

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
              <h3 className="text-lg font-bold text-slate-900">Sửa thông tin hồ sơ</h3>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Tên hiển thị</label>
                <input
                  value={editMetadataModal.displayName}
                  onChange={(e) => setEditMetadataModal(c => ({ ...c, displayName: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Ghi chú</label>
                <textarea
                  value={editMetadataModal.note}
                  onChange={(e) => setEditMetadataModal(c => ({ ...c, note: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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

      {changeStatusModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-bold text-slate-900">Đổi trạng thái</h3>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Trạng thái mới</label>
                <select
                  value={changeStatusModal.status}
                  onChange={(e) => setChangeStatusModal(c => ({ ...c, status: e.target.value as DocumentStatus }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="SUBMITTED">Chờ duyệt (SUBMITTED)</option>
                  <option value="APPROVED">Đã duyệt (APPROVED)</option>
                  <option value="REJECTED">Từ chối (REJECTED)</option>
                  <option value="ARCHIVED">Lưu trữ (ARCHIVED)</option>
                  <option value="SUPERSEDED">Thay thế (SUPERSEDED)</option>
                </select>
              </div>
              {changeStatusModal.status === "REJECTED" && (
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Lý do từ chối</label>
                  <textarea
                    value={changeStatusModal.rejectedReason}
                    onChange={(e) => setChangeStatusModal(c => ({ ...c, rejectedReason: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    rows={2}
                    placeholder="Bắt buộc..."
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 rounded-b-xl">
              <Button variant="outline" onClick={() => setChangeStatusModal(c => ({ ...c, isOpen: false }))}>Hủy</Button>
              <Button
                onClick={handleChangeStatus}
                disabled={changeStatusModal.status === "REJECTED" && !changeStatusModal.rejectedReason.trim()}
              >
                Xác nhận
              </Button>
            </div>
          </div>
        </div>
      )}
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
