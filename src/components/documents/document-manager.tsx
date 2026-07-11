"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronRight, Folder, FolderOpen, FileIcon, Search, Plus, FileText, FileImage, FileCode, UploadCloud, FileType, Trash2, Eye, Download, Pencil } from "lucide-react";
import { format } from "date-fns";
import { createFolder, renameFolder, deleteFolder, deleteDocument } from "@/app/(dashboard)/documents/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";
import { getDocumentRule } from "@/lib/document-rules";

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function DocumentManager({ projectId, folders, documents, canEdit }: any) {
  const formatFolderName = (name: string) => {
    return name.replace(/^(\d{2})_/, "$1. ");
  };
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Read initial folder from URL query param — survives page refresh
  const folderFromUrl = searchParams.get("folder");
  const initialFolder = folderFromUrl && folders.some((f: any) => f.id === folderFromUrl) ? folderFromUrl : null;

  const [selectedFolderId, setSelectedFolderIdRaw] = useState<string | null>(initialFolder);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => {
    const expanded = new Set<string>();
    let current = folders.find((folder: any) => folder.id === initialFolder);
    while (current?.parentId) {
      expanded.add(current.parentId);
      current = folders.find((folder: any) => folder.id === current.parentId);
    }
    return expanded;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [isUploading, setIsUploading] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const toast = useToast();

  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean, type: 'folder' | 'doc', id: string }>({ isOpen: false, type: 'folder', id: '' });
  const [renameModal, setRenameModal] = useState<{ isOpen: boolean, id: string, newName: string }>({ isOpen: false, id: "", newName: "" });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef(false);
  const mutationRef = useRef(false);

  useEffect(() => {
    const nextFolderId = folderFromUrl && folders.some((folder: any) => folder.id === folderFromUrl) ? folderFromUrl : null;
    setSelectedFolderIdRaw(nextFolderId);
    setExpandedFolderIds((current) => {
      const next = new Set(current);
      let currentFolder = folders.find((folder: any) => folder.id === nextFolderId);
      while (currentFolder?.parentId) {
        next.add(currentFolder.parentId);
        currentFolder = folders.find((folder: any) => folder.id === currentFolder.parentId);
      }
      if (nextFolderId && folders.some((folder: any) => folder.parentId === nextFolderId)) {
        next.add(nextFolderId);
      }
      return next;
    });
  }, [folderFromUrl, folders]);

  // Sync selectedFolderId to URL query param
  const setSelectedFolderId = useCallback((id: string | null) => {
    setSelectedFolderIdRaw(id);
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("folder", id);
    } else {
      params.delete("folder");
    }
    params.delete("folderId");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [router, pathname, searchParams]);

  const rootFolders = folders.filter((f: any) => !f.parentId);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (uploadRef.current || !selectedFolderId || !e.target.files || e.target.files.length === 0) return;

    uploadRef.current = true;
    setIsUploading(true);
    const file = e.target.files[0];

    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", projectId);
    formData.append("folderId", selectedFolderId);

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const folderName = folders.find((f: any) => f.id === selectedFolderId)?.name;
      toast.success(`Đã tải tài liệu lên thư mục ${formatFolderName(folderName || "")}`);
      router.refresh();
    } catch (error: unknown) {
      toast.error("Lỗi upload: " + (error instanceof Error ? error.message : "Lỗi không xác định"));
    } finally {
      uploadRef.current = false;
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (mutationRef.current || !name) {
      if (!name && showNewFolder) toast.error("Tên thư mục không được để trống");
      return;
    }

    const isDuplicate = folders.some((f: any) => f.name.toLowerCase() === name.toLowerCase() && f.parentId === (selectedFolderId || null));
    if (isDuplicate) {
      toast.error("Tên thư mục đã tồn tại trong cùng cấp");
      return;
    }

    mutationRef.current = true;
    try {
      const res = await createFolder(projectId, name, selectedFolderId || undefined);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Tạo thư mục thành công");
        setNewFolderName("");
        setShowNewFolder(false);
      }
    } catch {
      toast.error("Không thể tạo thư mục. Vui lòng kiểm tra kết nối và thử lại.");
    } finally {
      mutationRef.current = false;
    }
  };

  const handleRenameFolder = async () => {
    const { id, newName } = renameModal;
    const name = newName.trim();
    if (mutationRef.current || !name) {
      if (!name) toast.error("Tên thư mục không được để trống");
      return;
    }

    const currentFolder = folders.find((f: any) => f.id === id);
    if (currentFolder && name !== currentFolder.name) {
      const isDuplicate = folders.some((f: any) => f.name.toLowerCase() === name.toLowerCase() && f.parentId === currentFolder.parentId);
      if (isDuplicate) {
        toast.error("Tên thư mục đã tồn tại trong cùng cấp");
        return;
      }
    }

    mutationRef.current = true;
    try {
      const res = await renameFolder(projectId, id, name);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Đổi tên thành công");
        setRenameModal({ isOpen: false, id: "", newName: "" });
      }
    } catch {
      toast.error("Không thể đổi tên thư mục. Vui lòng kiểm tra kết nối và thử lại.");
    } finally {
      mutationRef.current = false;
    }
  };

  const executeDelete = async () => {
    if (mutationRef.current) return;
    mutationRef.current = true;
    const { type, id } = deleteConfirm;
    setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
    try {
      if (type === 'folder') {
        const res = await deleteFolder(projectId, id);
        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success("Xóa thư mục thành công");
          if (selectedFolderId === id) setSelectedFolderId(null);
        }
      } else {
        const res = await deleteDocument(projectId, id);
        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success("Xóa tệp thành công");
        }
      }
    } catch {
      toast.error("Không thể xóa. Vui lòng kiểm tra kết nối và thử lại.");
    } finally {
      mutationRef.current = false;
    }
  };

  const displayDocs = useMemo(() => {
    let filtered = documents.filter((d: any) => d.folderId === selectedFolderId);

    if (searchQuery) {
      filtered = filtered.filter((d: any) => d.originalName.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (filterType !== "ALL") {
      filtered = filtered.filter((d: any) => {
        if (filterType === "IMAGE") return d.mimeType.startsWith("image/");
        if (filterType === "PDF") return d.mimeType === "application/pdf";
        if (filterType === "WORD") return d.mimeType.includes("word") || d.extension.includes("doc");
        if (filterType === "EXCEL") return d.mimeType.includes("excel") || d.mimeType.includes("spreadsheet") || d.extension.includes("xls");
        if (filterType === "CAD") return d.extension.includes("dwg") || d.extension.includes("dxf");
        return true;
      });
    }

    return filtered;
  }, [documents, selectedFolderId, searchQuery, filterType]);

  const selectedFolderData = useMemo(() => folders.find((f: any) => f.id === selectedFolderId), [folders, selectedFolderId]);
  const selectedFolderRule = useMemo(() => selectedFolderData ? getDocumentRule(selectedFolderData.name) : null, [selectedFolderData]);

  const FolderNode = ({ folder, level = 0 }: { folder: any, level?: number }) => {
    const isSelected = selectedFolderId === folder.id;
    const hasChildren = folder._count.children > 0;
    const children = folders.filter((f: any) => f.parentId === folder.id);
    const isExpanded = expandedFolderIds.has(folder.id);

    return (
      <div className="select-none">
        <div
          className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-100 rounded-md transition-colors ${isSelected ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => {
            setSelectedFolderId(folder.id);
            if (hasChildren) {
              setExpandedFolderIds((current) => {
                const next = new Set(current);
                next.add(folder.id);
                return next;
              });
            }
          }}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {hasChildren && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedFolderIds((current) => {
                    const next = new Set(current);
                    if (next.has(folder.id)) next.delete(folder.id);
                    else next.add(folder.id);
                    return next;
                  });
                }}
                className="rounded p-0.5 text-slate-400 hover:bg-white hover:text-slate-700"
                aria-label={isExpanded ? "Đóng nhánh thư mục" : "Mở nhánh thư mục"}
              >
                <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
              </button>
            )}
            {isSelected ? <FolderOpen className="h-4 w-4 shrink-0 text-blue-500" /> : <Folder className="h-4 w-4 shrink-0 text-slate-400" />}
            <span className="text-sm font-medium truncate" title={folder.name}>{formatFolderName(folder.name)}</span>
          </div>
          {canEdit && isSelected && (
            <div className="flex gap-1 bg-white shadow-sm rounded-md border border-slate-200 px-1">
              <button
                onClick={(e) => { e.stopPropagation(); setRenameModal({ isOpen: true, id: folder.id, newName: folder.name }); }}
                className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                title="Đổi tên thư mục"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ isOpen: true, type: 'folder', id: folder.id }); }}
                className="text-slate-400 hover:text-red-500 transition-colors p-1"
                title="Xóa thư mục"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
        {isExpanded && children.map((child: any) => (
          <FolderNode key={child.id} folder={child} level={level + 1} />
        ))}
      </div>
    );
  };

  const getFileIcon = (mime: string, ext: string) => {
    if (mime.startsWith("image/")) return <FileImage className="h-8 w-8 text-blue-400" />;
    if (mime === "application/pdf") return <FileText className="h-8 w-8 text-red-400" />;
    if (mime.includes("word") || ext.includes("doc")) return <FileText className="h-8 w-8 text-blue-600" />;
    if (mime.includes("excel") || mime.includes("spreadsheet") || ext.includes("xls")) return <FileText className="h-8 w-8 text-green-500" />;
    if (ext.includes("dwg") || ext.includes("dxf")) return <FileCode className="h-8 w-8 text-purple-500" />;
    return <FileIcon className="h-8 w-8 text-slate-400" />;
  };

  return (
    <div className="flex flex-col md:flex-row flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden min-h-0">
      {/* Folder Tree Sidebar */}
      <div className="w-full md:w-72 border-r border-slate-200 flex flex-col bg-slate-50 shrink-0 max-h-[200px] md:max-h-none md:h-auto overflow-y-auto">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-slate-50 z-10">
          <h2 className="font-semibold text-slate-800">Thư mục</h2>
          {canEdit && (
            <button
              onClick={() => setShowNewFolder(!showNewFolder)}
              className="p-1.5 hover:bg-slate-200 rounded-md text-slate-600 transition-colors"
              title="Tạo thư mục"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>

        {showNewFolder && (
          <div className="p-3 bg-white border-b border-slate-200">
            <input  autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
              type="text"
              className="w-full bg-white px-2 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900 font-medium placeholder:text-slate-400"
              placeholder="Tên thư mục mới..."
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreateFolder()}
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <Button variant="default" className="h-7 text-xs px-2 py-1" onClick={handleCreateFolder}>Tạo</Button>
              <Button variant="outline" className="h-7 text-xs px-2 py-1" onClick={() => setShowNewFolder(false)}>Hủy</Button>
            </div>
          </div>
        )}

        <div className="p-2 flex-1 overflow-y-auto">
          {rootFolders.map((folder: any) => (
            <FolderNode key={folder.id} folder={folder} />
          ))}
          {rootFolders.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">Chưa có thư mục</p>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedFolderId ? (
          <>
            {selectedFolderRule && (
              <div className="bg-white border-b border-slate-200">
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-lg font-bold text-slate-900">{selectedFolderRule.title}</h2>
                        <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-full border border-slate-200" title={selectedFolderRule.allowedExtensions.join(", ").toUpperCase()}>
                          Loại file nhận: {selectedFolderRule.friendlyAllowedTypes || selectedFolderRule.allowedExtensions.join(", ").toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{selectedFolderRule.description}</p>
                      {selectedFolderRule.warning && (
                        <p className="text-xs text-amber-600 mt-1 font-medium">{selectedFolderRule.warning}</p>
                      )}
                      <div className="text-xs text-slate-500 mt-1 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                        <span>Gợi ý đặt tên: <span className="font-mono text-slate-700 bg-slate-50 px-1 py-0.5 rounded border border-slate-200">{selectedFolderRule.namingHint}</span></span>
                        {selectedFolderRule.namingExample && (
                          <span className="italic text-slate-400">{selectedFolderRule.namingExample}</span>
                        )}
                      </div>
                    </div>
                    
                    {canEdit && (
                      <div className="shrink-0 flex gap-2 w-full sm:w-auto">
                        <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true" 
                          type="file" 
                          className="hidden" 
                          ref={fileInputRef} 
                          onChange={handleUpload}
                          accept={selectedFolderRule.accept}
                          capture={selectedFolderRule.key === "07_Hình ảnh hiện trường" ? "environment" : undefined}
                        />
                        <Button 
                          onClick={() => fileInputRef.current?.click()} 
                          disabled={isUploading}
                          className="w-full sm:w-auto"
                        >
                          <UploadCloud className="h-4 w-4 mr-2" />
                          {isUploading ? "Đang tải..." : selectedFolderRule.uploadLabel}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center flex-1 gap-2 min-w-0">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input  autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
                      type="text"
                      placeholder="Tìm tên tệp..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 font-medium placeholder:text-slate-400"
                    />
                  </div>
                  <select
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                    className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 font-medium"
                  >
                    <option value="ALL">Tất cả</option>
                    <option value="IMAGE">Ảnh</option>
                    <option value="PDF">PDF</option>
                    <option value="WORD">Word</option>
                    <option value="EXCEL">Excel</option>
                    <option value="CAD">Bản vẽ CAD</option>
                  </select>
                  {(searchQuery || filterType !== "ALL") && (
                    <button onClick={() => { setSearchQuery(""); setFilterType("ALL"); }} className="text-sm text-blue-600 font-medium hover:underline whitespace-nowrap">Xóa lọc</button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                {displayDocs.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {displayDocs.map((doc: any) => (
                      <div key={doc.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow group flex flex-col">
                        <div className="flex items-start justify-between mb-3">
                          {getFileIcon(doc.mimeType, doc.extension)}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a
                              href={`/api/documents/${doc.id}/download?preview=true`}
                              target="_blank"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Xem trước"
                            >
                              <Eye className="h-4 w-4" />
                            </a>
                            <a
                              href={`/api/documents/${doc.id}/download`}
                              download
                              className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                              title="Tải xuống"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                            {canEdit && (
                              <button
                                onClick={() => setDeleteConfirm({ isOpen: true, type: 'doc', id: doc.id })}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Xóa"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-h-0">
                          <p className="font-medium text-slate-900 text-sm line-clamp-2" title={doc.originalName}>{doc.originalName}</p>
                          <p className="text-xs text-slate-500 mt-1">{formatBytes(doc.size)} • {doc.extension.toUpperCase()}</p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                          <span>{format(new Date(doc.createdAt), "dd/MM/yyyy HH:mm")}</span>
                          <span className="truncate ml-2 max-w-[100px] text-right" title={doc.uploadedBy?.name}>{doc.uploadedBy?.name || "User"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3">
                    <div className="h-16 w-16 bg-white border border-slate-200 rounded-full flex items-center justify-center">
                      <FileType className="h-8 w-8 text-slate-300" />
                    </div>
                    {selectedFolderRule && (
                      <div className="text-center flex flex-col items-center">
                        <p className="font-medium text-slate-700">{selectedFolderRule.emptyStateText || "Chưa có tài liệu nào trong thư mục này"}</p>
                        <p className="text-sm mt-1 mb-4">Hãy tải tài liệu hợp lệ theo đúng định dạng được gợi ý.</p>
                        {canEdit && (
                          <Button 
                            onClick={() => fileInputRef.current?.click()} 
                            disabled={isUploading}
                            className="w-auto"
                          >
                            <UploadCloud className="h-4 w-4 mr-2" />
                            {isUploading ? "Đang tải..." : selectedFolderRule.uploadLabel}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
            ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-slate-50 p-8 text-center">
              <FolderOpen className="h-16 w-16 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">Chọn thư mục</h3>
              <p className="text-sm">Vui lòng chọn một thư mục bên trái để xem và tải lên tài liệu.</p>
            </div>
        )}
          </div>

        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, type: 'folder', id: '' })}
          title={deleteConfirm.type === 'folder' ? "Xóa thư mục?" : "Xóa tệp?"}
          description={deleteConfirm.type === 'folder' ? "Bạn có chắc chắn muốn xóa thư mục này? Thao tác này không thể hoàn tác." : "Bạn có chắc chắn muốn xóa tệp này? Thao tác này không thể hoàn tác."}
          variant="danger"
          confirmText="Xóa"
          onConfirm={executeDelete}
        />

        {renameModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-lg max-w-sm w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">Đổi tên thư mục</h3>
              </div>
              <div className="px-5 py-4">
                <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
                  type="text"
                  value={renameModal.newName}
                  onChange={e => setRenameModal(prev => ({ ...prev, newName: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && handleRenameFolder()}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400"
                  placeholder="Nhập tên mới..."
                  autoFocus
                />
              </div>
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => setRenameModal({ isOpen: false, id: "", newName: "" })}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleRenameFolder}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  Lưu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      );
}
