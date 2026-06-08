"use client";

import { useState, useMemo, useRef } from "react";
import { Folder, FolderOpen, FileIcon, Search, Plus, MoreVertical, FileText, FileImage, FileCode, UploadCloud, FileType, Trash2, Eye, Download, Pencil } from "lucide-react";
import { format } from "date-fns";
import { createFolder, renameFolder, deleteFolder, deleteDocument } from "@/app/(dashboard)/documents/actions";
import { Button } from "@/components/ui/button";

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function DocumentManager({ projectId, folders, documents, canEdit }: any) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [isUploading, setIsUploading] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rootFolders = folders.filter((f: any) => !f.parentId);
  
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedFolderId || !e.target.files || e.target.files.length === 0) return;
    
    setIsUploading(true);
    const file = e.target.files[0];
    
    if (file.size > 50 * 1024 * 1024) {
      alert("Tệp vượt quá giới hạn 50MB");
      setIsUploading(false);
      return;
    }

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
      window.location.reload();
    } catch (error: any) {
      alert("Lỗi upload: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const res = await createFolder(projectId, newFolderName, selectedFolderId || undefined);
    if (res?.error) alert(res.error);
    else {
      setNewFolderName("");
      setShowNewFolder(false);
    }
  };

  const handleRenameFolder = async (id: string, oldName: string) => {
    const newName = window.prompt("Nhập tên mới cho thư mục:", oldName);
    if (!newName || newName.trim() === "" || newName === oldName) return;
    const res = await renameFolder(projectId, id, newName);
    if (res?.error) alert(res.error);
  };

  const handleDeleteFolder = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa thư mục này?")) return;
    const res = await deleteFolder(projectId, id);
    if (res?.error) alert(res.error);
    if (selectedFolderId === id) setSelectedFolderId(null);
  };

  const handleDeleteDoc = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa tệp này?")) return;
    const res = await deleteDocument(projectId, id);
    if (res?.error) alert(res.error);
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

  const FolderNode = ({ folder, level = 0 }: { folder: any, level?: number }) => {
    const isSelected = selectedFolderId === folder.id;
    const hasChildren = folder._count.children > 0;
    const children = folders.filter((f: any) => f.parentId === folder.id);

    return (
      <div className="select-none">
        <div 
          className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-slate-100 rounded-md transition-colors ${isSelected ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => setSelectedFolderId(folder.id)}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {isSelected ? <FolderOpen className="h-4 w-4 shrink-0 text-blue-500" /> : <Folder className="h-4 w-4 shrink-0 text-slate-400" />}
            <span className="text-sm font-medium truncate">{folder.name}</span>
          </div>
          {canEdit && isSelected && (
            <div className="flex gap-1 bg-white shadow-sm rounded-md border border-slate-200 px-1">
              <button 
                onClick={(e) => { e.stopPropagation(); handleRenameFolder(folder.id, folder.name); }}
                className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                title="Đổi tên thư mục"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                className="text-slate-400 hover:text-red-500 transition-colors p-1"
                title="Xóa thư mục"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
        {isSelected && children.map((child: any) => (
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
            <input 
              type="text" 
              className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-blue-500 text-slate-900 font-medium"
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
            <div className="p-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
              <div className="flex items-center flex-1 gap-2 min-w-0">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Tìm tên tệp..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 font-medium"
                  />
                </div>
                <select 
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-900 font-medium"
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
              
              {canEdit && (
                <div>
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleUpload}
                  />
                  <Button 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={isUploading}
                    className="w-full sm:w-auto shrink-0"
                  >
                    <UploadCloud className="h-4 w-4 mr-2" />
                    {isUploading ? "Đang tải lên..." : "Tải tệp lên"}
                  </Button>
                </div>
              )}
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
                              onClick={() => handleDeleteDoc(doc.id)}
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
                  <p>Chưa có tệp nào trong thư mục này</p>
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
    </div>
  );
}
