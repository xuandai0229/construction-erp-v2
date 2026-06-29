# Báo cáo: Documents Remove Classification Feature From UI

## 1. Executive Summary
Tiếp nối quyết định bỏ tính năng Auto-classify, qua đánh giá thực tế UI/UX của module Documents, tính năng "Phân loại hồ sơ" (Document Classification) được xác định là làm giao diện trở nên rườm rà, chưa mang lại hiệu quả thực tiễn cao so với chi phí thao tác của người dùng. Để tối ưu trải nghiệm và giữ ứng dụng đơn giản nhất có thể cho môi trường công trường, **toàn bộ tính năng phân loại hồ sơ đã được gỡ bỏ khỏi giao diện người dùng**.

## 2. Lý do gỡ bỏ
- **UX quá tải**: Người dùng phải chọn quá nhiều dropdown (thư mục, phân loại) khi upload.
- **Badge gây nhiễu**: Cảnh báo "Chưa phân loại" hoặc "Có X tài liệu chưa phân loại" gây áp lực giả tạo lên người dùng, trong khi việc phân loại không bắt buộc.
- **Ít giá trị sử dụng**: Thư mục gốc (`01_Hợp đồng`, `02_Bản vẽ`...) đã đóng vai trò phân loại chính. Việc phân loại thêm một cấp (vd: Hợp đồng chính, Phụ lục) chưa thực sự cấp bách ở giai đoạn này.

## 3. Những gì đã xóa khỏi UI

### 3.1 Upload Preflight Modal
- Gỡ bỏ dropdown "Loại hồ sơ".
- Gỡ bỏ mọi câu chữ hướng dẫn liên quan đến phân loại.
- Upload hiện tại chỉ yêu cầu: **Tệp, Tên hiển thị, Ghi chú, Lưu vào thư mục**.

### 3.2 File Card
- Gỡ bỏ hoàn toàn badge phân loại (xanh) và badge "Chưa phân loại" (vàng).

### 3.3 Edit Metadata Modal
- Gỡ bỏ dropdown "Loại hồ sơ" trong chức năng sửa thông tin.
- Form sửa chỉ còn: **Tên hiển thị, Ghi chú**.

### 3.4 Filter Panel & Smart Suggestions
- Xóa filter `filterDocType` (Lọc theo phân loại).
- Xóa tùy chọn `TYPE` trong tính năng "Gom nhóm hiển thị".
- Xóa tính toán số lượng file "Chưa phân loại" trong list gợi ý thông minh (Smart Suggestions).

### 3.5 Document Viewer
- Xóa hiển thị nhãn "Loại hồ sơ" trong footer của giao diện xem chi tiết.

### 3.6 Backend API
- `actions.ts` đã loại bỏ việc cập nhật field `documentType`.
- Mặc dù vậy, file logic `metadata-types.ts` và backend upload route vẫn giữ nguyên validate an toàn để không bị vỡ/crash nếu có dữ liệu cũ tồn tại.

## 4. Xử lý dữ liệu QA_AUTO
- Toàn bộ dữ liệu test auto-classify trước đó đã được dọn sạch hoàn toàn trong phiên trước (`cleanup-qa-documents-test-data.ts`). Không có file rác hiển thị.

## 5. UI sau khi tinh giản

### Upload Preflight
```
┌─────────────────────────────────────┐
│ Tệp đã chọn: document.pdf          │
│                                     │
│ Tên hiển thị: [___________________] │
│                                     │
│ Ghi chú:      [___________________] │
│                                     │
│ Lưu vào: 01_Hợp đồng               │
│                                     │
│              [Hủy]  [Tải lên]       │
└─────────────────────────────────────┘
```

### Bộ Lọc (Filter Panel)
- **Loại file**: Tất cả, Ảnh, PDF, Word, Excel, CAD, XML...
- **Thời gian**: Tất cả, Hôm nay, 7 ngày qua, Tháng này...
- **Người tải lên**: Danh sách người dùng trong folder.
- **Gom nhóm hiển thị**: Không, Theo trạng thái, Theo tháng, Theo người tải.

## 6. Những gì được giữ lại
- Field `documentType` vẫn tồn tại an toàn trong Prisma schema / PostgreSQL (trạng thái "dormant").
- Các tài liệu cũ nếu có field này vẫn an toàn, không bị mất dữ liệu hay lỗi khi truy xuất.
- Toàn bộ tính năng Search (tên hiển thị, file gốc), Sắp xếp (A-Z, thời gian, kích thước) và xem chi tiết vẫn hoạt động ổn định.

## 7. Kết quả Build & Test
- Môi trường: Local `d:\construction-erp-v2`
- `npx prisma validate`: PASS
- `tsc --noEmit`: PASS
- `npm run build`: PASS (Exit code 0)
- Git safety: Không add storage, không push repo cũ.

## 8. Rủi ro còn lại
- Không có rủi ro về mặt dữ liệu.
- Việc tinh gọn này có thể khiến việc tổ chức hồ sơ phụ thuộc hoàn toàn vào cấu trúc 8 thư mục gốc. Nếu số lượng file trong một thư mục lên đến hàng ngàn, có thể sẽ cần thiết kế lại cơ chế thư mục con.

## 9. Kết luận
- Classification removed from UI: PASS
- Auto-classify removed: PASS
- Documents UX simplified: PASS
- Có migration không: KHÔNG
- Push repo cũ: KHÔNG
- Production: NO-GO
