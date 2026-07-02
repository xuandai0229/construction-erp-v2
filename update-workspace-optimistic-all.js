const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

content = content.replace(
  /  const executePermanentDelete = async \(\) => \{\n    if \(mutationRef\.current\) return;\n    mutationRef\.current = true;\n    const \{ type, id \} = deleteConfirm;\n    setDeleteConfirm\(\(current\) => \(\{ \.\.\.current, isOpen: false \}\)\);\n\n    try \{\n      if \(type === "folder"\) \{\n        const result = await permanentDeleteFolder\(projectId, id\);\n        if \(result\?\.error\) toast\.error\(result\.error\);\n        else \{\n          toast\.success\("Xóa vĩnh viễn thư mục thành công"\);\n          if \(selectedFolderId === id\) setSelectedFolderId\(null\);\n          router\.refresh\(\);\n        \}\n      \} else \{\n        const result = await permanentDeleteDocument\(projectId, id\);\n        if \(result\?\.error\) toast\.error\(result\.error\);\n        else \{\n          setLocalDocuments\(\(current\) =>\n            current\.filter\(\(document\) => document\.id !== id\),\n          \);\n          if \(selectedDocumentId === id\) closeDocument\(\);\n          toast\.success\("Xóa vĩnh viễn tài liệu thành công"\);\n          router\.refresh\(\);\n        \}\n      \}\n    \} catch \{\n      toast\.error\("Không thể xóa vĩnh viễn\. Vui lòng thử lại\."\);\n    \} finally \{\n      mutationRef\.current = false;\n    \}\n  \};/g,
  `  const executePermanentDelete = async () => {
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
  };`
);

content = content.replace(
  /  const handleRestore = async \(type: "folder" \| "doc", id: string\) => \{\n    if \(mutationRef\.current\) return;\n    mutationRef\.current = true;\n    try \{\n      if \(type === "folder"\) \{\n        const result = await restoreFolder\(projectId, id\);\n        if \(result\?\.error\) toast\.error\(result\.error\);\n        else \{\n          toast\.success\("Đã khôi phục thư mục"\);\n          router\.refresh\(\);\n        \}\n      \} else \{\n        const result = await restoreDocument\(projectId, id\);\n        if \(result\?\.error\) toast\.error\(result\.error\);\n        else \{\n          toast\.success\("Đã khôi phục tài liệu"\);\n          router\.refresh\(\);\n        \}\n      \}\n    \} catch \{\n      toast\.error\("Không thể khôi phục\. Vui lòng thử lại\."\);\n    \} finally \{\n      mutationRef\.current = false;\n    \}\n  \};/g,
  `  const handleRestore = async (type: "folder" | "doc", id: string) => {
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
  };`
);

fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
