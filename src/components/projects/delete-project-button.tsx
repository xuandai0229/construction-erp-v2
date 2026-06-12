"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteProject } from "@/app/(dashboard)/projects/actions";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function DeleteProjectButton({ id, projectName }: { id: string, projectName: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const res = await deleteProject(id);
    setIsDeleting(false);

    if (res?.error) {
      alert(res.error);
    } else {
      router.push('/projects');
      router.refresh();
    }
  };

  return (
    <>
      <Button 
        variant="destructive" 
        onClick={() => setShowConfirm(true)} 
        disabled={isDeleting}
        title="Xóa công trình"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        {isDeleting ? "Đang xóa..." : "Xóa"}
      </Button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Xóa công trình?</h3>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                Bạn có chắc chắn muốn xóa công trình <strong className="text-slate-900">{projectName}</strong>?
              </p>
              <div className="p-3 bg-red-50 text-red-800 text-sm rounded-lg border border-red-100">
                <span className="font-semibold block mb-1">Lưu ý:</span>
                Thao tác này không xóa dữ liệu vật lý nhưng sẽ ẩn công trình khỏi danh sách.
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button 
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                disabled={isDeleting}
              >
                Hủy
              </button>
              <button 
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 border border-red-600 rounded-lg hover:bg-red-700 flex items-center gap-1.5 transition-colors shadow-sm"
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4" /> {isDeleting ? "Đang xóa..." : "Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
