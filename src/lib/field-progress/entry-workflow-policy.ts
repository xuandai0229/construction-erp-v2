export function assertFieldProgressEntryWritable(status: string): void {
  if (status === "APPROVED") {
    throw new Error("Khối lượng đã duyệt không thể sửa/xóa.");
  }
}
