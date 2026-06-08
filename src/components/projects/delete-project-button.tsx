"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteProject } from "@/app/(dashboard)/projects/actions";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function DeleteProjectButton({ id, projectName }: { id: string, projectName: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`Bạn có chắc chắn muốn xóa công trình "${projectName}"?\nThao tác này không xóa dữ liệu vật lý nhưng sẽ ẩn công trình khỏi danh sách.`)) {
      return;
    }
    
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
    <Button 
      variant="destructive" 
      onClick={handleDelete} 
      disabled={isDeleting}
      title="Xóa công trình"
    >
      <Trash2 className="h-4 w-4 mr-2" />
      {isDeleting ? "Đang xóa..." : "Xóa"}
    </Button>
  );
}
