# BÁO CÁO AUDIT & HARDENING TOÀN BỘ MÀN MATERIALS
**Date:** July 10, 2026

## 1. PHASE 0 - KẾT QUẢ DATA AUDIT

### 1.1. Luồng dữ liệu (Data Flow) các Tab
*   **Tổng quan:** Nhận `ProjectStockDto[]` và `MaterialMovementDto[]`. Các bộ đếm (count) KPI như "Tổng mã vật tư", "Có tồn kho", "Giao dịch tháng" đều được tính toán từ mảng dữ liệu này ở Client. Không có gọi API count riêng.
*   **Danh mục vật tư:** Nhận `MaterialItemDto[]` và `ProjectStockDto[]` để mapping danh sách vật tư kèm theo số lượng tồn kho hiện tại.
*   **Tồn kho:** Hiển thị `ProjectStockDto[]`, nhận thêm `transactions` để lọc top 5 giao dịch gần nhất cho từng vật tư trong Drawer chi tiết.
*   **Yêu cầu vật tư:** Dùng `MaterialRequest` và `MaterialRequestItem`. 
*   **Nhập / Xuất (Transactions):** Nhận mảng `MaterialMovementDto[]`.

### 1.2. Các vấn đề cấu trúc Database và Server Actions
*   **Foreign Keys (Technical Debt):** Model `MaterialMovement` hiện tại KHÔNG CÓ foreign key liên kết với `MaterialRequest` hay `MaterialRequestItem`. Do đó, không thể tự động mapping 1 giao dịch nhập/xuất kho cụ thể thuộc phiếu yêu cầu nào. Giao dịch hiện tại hoàn toàn là "giao dịch thủ công".
*   **Soft-delete (Xóa mềm):** 
    *   `MaterialRequest` và `MaterialRequestItem` CÓ hỗ trợ xóa mềm (`deletedAt`).
    *   `MaterialItem`, `MaterialMovement`, `ProjectMaterialStock` KHÔNG HỖ TRỢ xóa mềm.
*   **Hành động nguy hiểm (Xóa cứng):** Trong `actions.ts`, hàm `deleteMaterialItem` đang thực hiện **Xóa cứng (Hard Delete)**. Hành động này sẽ tự động xóa sạch toàn bộ lịch sử `MaterialMovement` và `ProjectMaterialStock` của vật tư đó (Cascade). **Điều này vi phạm nghiêm trọng quy tắc kế toán ERP.**
*   **Kiểu dữ liệu:** Các hàm trong `actions.ts` đã chuẩn hóa `Prisma.Decimal` về `Number` và `Date` về `toISOString()`. Rất may không có đối tượng phức tạp nào bị truyền thẳng xuống Client Component gây lỗi Serialization.
*   **Pagination / Slice ẩn:** Hàm `getRecentTransactions` trong `actions.ts` dùng `findMany` và **KHÔNG CÓ `take`**. Do đó, toàn bộ dữ liệu đang được trả về UI (không bị slice). Việc bảng "Nhập/Xuất" bị hiểu nhầm là do hiển thị UI.

## 2. KẾ HOẠCH PHASE 1 - NÂNG CẤP UI & NGHIỆP VỤ (Chuẩn bị code)

Dựa trên Audit, tôi sẽ thực hiện các bước sau:
1.  **Sửa lỗi Nguy hiểm (Hard Delete):** Cập nhật `materials-catalog.tsx` để chặn nút Xóa nếu vật tư đã phát sinh giao dịch (`hasMovement` hoặc tồn kho > 0). Đổi thành Menu Ba Chấm (DropdownMenu) chuẩn ERP.
2.  **Đồng bộ Tab Tổng quan:** Thêm KPI "Chờ duyệt/Cần cấp" lấy từ `materialRequests`.
3.  **Đồng bộ UI Tab Nhập/Xuất:** Thiết kế lại bảng thành ledger nguyên bản, không dùng vùng cuộn nội bộ cắt ngang dữ liệu, hiển thị chú thích "Đang hiển thị N giao dịch" một cách tường minh.
4.  **Cập nhật Date/Number Format toàn cục:** Kiểm tra tất cả các cột bảng để đảm bảo `Intl.NumberFormat('vi-VN')`.
5.  **Chuẩn hóa Tab Yêu cầu:** Cấu trúc lại Component `MaterialRequestForm` để list dài 10 dòng không bị lỗi tràn UI, combobox max-height gọn gàng chống chạm sticky footer.
