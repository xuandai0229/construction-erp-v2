"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteProject } from "@/app/(dashboard)/projects/actions";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";

export function DeleteProjectButton({ id, projectName, className }: { id: string, projectName: string, className?: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const [showConfirm, setShowConfirm] = useState(false);
  const deletingRef = useRef(false);

  const handleDelete = async () => {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setIsDeleting(true);
    try {
      const res = await deleteProject(id);
      if (res?.error) {
        toast.error(res.error);
        setShowConfirm(false);
      } else {
        toast.success("Đã xóa công trình");
        router.push('/projects');
        router.refresh();
      }
    } catch {
      toast.error("Không thể xóa công trình. Vui lòng kiểm tra kết nối và thử lại.");
    } finally {
      deletingRef.current = false;
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button 
        variant="destructive" 
        onClick={() => setShowConfirm(true)} 
        disabled={isDeleting}
        title="Xóa công trình"
        className={className}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        {isDeleting ? "Đang xóa..." : "Xóa"}
      </Button>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Xóa công trình?"
        description={
          <>
            Bạn có chắc chắn muốn xóa công trình <strong className="text-slate-900">{projectName}</strong>?
            <div className="mt-3 p-3 bg-red-50 text-red-800 text-sm rounded-lg border border-red-100">
              Dữ liệu sẽ được ẩn khỏi danh sách nhưng vẫn được lưu trong hệ thống để truy vết.
            </div>
          </>
        }
        variant="danger"
        confirmText="Xóa công trình"
        cancelText="Hủy"
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </>
  );
}
