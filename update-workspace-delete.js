const fs = require('fs');

let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

// Replace executeDelete with executeSoftDelete and executePermanentDelete
content = content.replace(
  /  const executeDelete = async \(\) => \{[\s\S]*?mutationRef\.current = false;\s*\}\s*\};\s*/,
  `  const executeSoftDelete = async (type: "folder" | "doc", id: string) => {
    if (mutationRef.current) return;
    mutationRef.current = true;
    try {
      if (type === "folder") {
        const result = await deleteFolder(projectId, id);
        if (result?.error) toast.error(result.error);
        else {
          toast.success("Đã chuyển thư mục vào Thùng rác");
          if (selectedFolderId === id) setSelectedFolderId(null);
          router.refresh();
        }
      } else {
        const result = await deleteDocument(projectId, id);
        if (result?.error) toast.error(result.error);
        else {
          setLocalDocuments((current) =>
            current.filter((document) => document.id !== id),
          );
          if (selectedDocumentId === id) closeDocument();
          toast.success("Đã chuyển tài liệu vào Thùng rác");
          router.refresh();
        }
      }
    } catch {
      toast.error("Không thể xóa. Vui lòng thử lại.");
    } finally {
      mutationRef.current = false;
    }
  };

  const executePermanentDelete = async () => {
    if (mutationRef.current) return;
    mutationRef.current = true;
    const { type, id } = deleteConfirm;
    setDeleteConfirm((current) => ({ ...current, isOpen: false }));

    try {
      if (type === "folder") {
        const result = await permanentDeleteFolder(projectId, id);
        if (result?.error) toast.error(result.error);
        else {
          toast.success("Xóa vĩnh viễn thư mục thành công");
          if (selectedFolderId === id) setSelectedFolderId(null);
          router.refresh();
        }
      } else {
        const result = await permanentDeleteDocument(projectId, id);
        if (result?.error) toast.error(result.error);
        else {
          setLocalDocuments((current) =>
            current.filter((document) => document.id !== id),
          );
          if (selectedDocumentId === id) closeDocument();
          toast.success("Xóa vĩnh viễn tài liệu thành công");
          router.refresh();
        }
      }
    } catch {
      toast.error("Không thể xóa vĩnh viễn. Vui lòng thử lại.");
    } finally {
      mutationRef.current = false;
    }
  };
  
  const handleRestore = async (type: "folder" | "doc", id: string) => {
    if (mutationRef.current) return;
    mutationRef.current = true;
    try {
      if (type === "folder") {
        const result = await restoreFolder(projectId, id);
        if (result?.error) toast.error(result.error);
        else {
          toast.success("Đã khôi phục thư mục");
          router.refresh();
        }
      } else {
        const result = await restoreDocument(projectId, id);
        if (result?.error) toast.error(result.error);
        else {
          toast.success("Đã khôi phục tài liệu");
          router.refresh();
        }
      }
    } catch {
      toast.error("Không thể khôi phục. Vui lòng thử lại.");
    } finally {
      mutationRef.current = false;
    }
  };

`
);

content = content.replace(
  /onConfirm=\{executeDelete\}/,
  'onConfirm={executePermanentDelete}'
);

fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
