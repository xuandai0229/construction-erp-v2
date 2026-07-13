"use client";

import { PageError } from "@/components/ui/page-error";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageError
      error={error}
      reset={reset}
      title="Không thể tải màn hình quản lý tài khoản"
      message="Không có dữ liệu nào bị thay đổi. Vui lòng thử lại hoặc quay về trang tổng quan."
    />
  );
}
