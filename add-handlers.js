const fs = require('fs');
let content = fs.readFileSync('src/components/documents/document-workspace.tsx', 'utf-8');

const target = `    }
  };`;

const replacement = `    }
  };

  const handleRestore = async (type: 'folder' | 'file', id: string) => {
    if (mutationRef.current) return;
    mutationRef.current = true;
    try {
      const result = type === 'folder' 
        ? await restoreFolder(projectId, id)
        : await restoreDocument(projectId, id);
      if (result?.error) toast.error(result.error);
      else {
        toast.success(type === 'folder' ? 'Khôi phục thư mục thành công' : 'Khôi phục tài liệu thành công');
        router.refresh();
      }
    } catch {
      toast.error('Lỗi khôi phục');
    } finally {
      mutationRef.current = false;
    }
  };

  const handlePermanentDelete = async (type: 'folder' | 'file', id: string) => {
    if (mutationRef.current) return;
    mutationRef.current = true;
    try {
      const result = type === 'folder'
        ? await permanentDeleteFolder(projectId, id)
        : await permanentDeleteDocument(projectId, id);
      if (result?.error) toast.error(result.error);
      else {
        toast.success(type === 'folder' ? 'Đã xóa vĩnh viễn thư mục' : 'Đã xóa vĩnh viễn tài liệu');
        router.refresh();
      }
    } catch {
      toast.error('Lỗi xóa vĩnh viễn');
    } finally {
      mutationRef.current = false;
    }
  };`;

const targetImports = `  renameFolder,
  updateDocumentMetadata,
  changeDocumentStatus,
} from "@/app/(dashboard)/documents/actions";`;

const replacementImports = `  renameFolder,
  updateDocumentMetadata,
  changeDocumentStatus,
  restoreFolder,
  restoreDocument,
  permanentDeleteFolder,
  permanentDeleteDocument,
} from "@/app/(dashboard)/documents/actions";`;

content = content.replace(target, replacement);
content = content.replace(targetImports, replacementImports);
fs.writeFileSync('src/components/documents/document-workspace.tsx', content);
