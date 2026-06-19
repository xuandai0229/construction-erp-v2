"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function ProjectsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="bg-red-50 p-4 rounded-full mb-4">
        <AlertTriangle className="h-10 w-10 text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Đã xảy ra lỗi</h2>
      <p className="text-slate-500 mb-6 max-w-md">
        Không thể tải dữ liệu danh sách công trình. Lỗi này có thể do kết nối mạng hoặc máy chủ.
      </p>
      <Button onClick={() => reset()} className="bg-slate-900 text-white hover:bg-slate-800">
        Thử lại
      </Button>
    </div>
  );
}
