const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

content = content.replace(
  /  const executeSoftDelete = async \(type: "folder" \| "doc", id: string\) => \{\n    if \(mutationRef\.current\) return;\n    mutationRef\.current = true;\n    try \{\n      if \(type === "folder"\) \{\n        const result = await deleteFolder\(projectId, id\);\n        if \(result\?\.error\) toast\.error\(result\.error\);\n        else \{\n          toast\.success\("Đã chuyển thư mục vào Thùng rác"\);\n          if \(selectedFolderId === id\) setSelectedFolderId\(null\);\n          router\.refresh\(\);\n        \}\n      \} else \{\n        const result = await deleteDocument\(projectId, id\);\n        if \(result\?\.error\) toast\.error\(result\.error\);\n        else \{\n          setLocalDocuments\(\(current\) =>\n            current\.filter\(\(document\) => document\.id !== id\),\n          \);\n          if \(selectedDocumentId === id\) closeDocument\(\);\n          toast\.success\("Đã chuyển tài liệu vào Thùng rác"\);\n          router\.refresh\(\);\n        \}\n      \}\n    \} catch \{\n      toast\.error\("Không thể xóa\. Vui lòng thử lại\."\);\n    \} finally \{\n      mutationRef\.current = false;\n    \}\n  \};/g,
  `  const executeSoftDelete = async (type: "folder" | "doc", id: string) => {
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
  };`
);

fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
