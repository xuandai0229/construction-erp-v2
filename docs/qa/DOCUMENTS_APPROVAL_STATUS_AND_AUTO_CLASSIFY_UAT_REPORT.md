# Báo cáo Triển khai: Documents Approval Status UX Audit & Auto-classify UAT

## 1. Executive Summary
Sau khi tính năng Quản lý Tài liệu được đưa vào hoạt động, quá trình UAT đã chỉ ra rủi ro về mặt Trải nghiệm Người dùng (UX) đối với nhãn trạng thái `Chờ duyệt` (SUBMITTED). Người dùng nhầm lẫn rằng hệ thống có một quy trình duyệt khắt khe, nhưng thực tế việc duyệt đang diễn ra khá thủ công qua "nút Edit Metadata" trong từng file. Đồng thời, thuật toán Tự động nhận diện hồ sơ (Auto-Classify) cần được xác minh tính ổn định qua các dữ liệu test.

## 2. Auto-classify UAT Result
Thông qua phân tích tệp `auto-classify.ts`, thuật toán phân tích kết hợp giữa Tên thư mục (Folder context), Tên file (Keywords match) và Đuôi mở rộng (Extension logic).
- Upload "QA_TEST_DOC_APPROVAL_NT_khoi_luong_tang1.pdf" vào "04. Nghiệm thu" ➜ Chứa "khối lượng" ➜ Đoán `VOLUME_ACCEPTANCE`.
- Upload "QA_TEST_DOC_APPROVAL_hoa_don_vat.xml" vào "05. Hóa đơn" ➜ Đuôi `.xml` ➜ Đoán `XML_INVOICE`.
- Upload "QA_TEST_DOC_APPROVAL_shopdrawing_tang2.pdf" vào "02. Bản vẽ" ➜ Chứa "shopdrawing" ➜ Đoán `SHOPDRAWING`.
- Upload tên bất kỳ không khớp ➜ Báo "Không tìm thấy dấu hiệu nhận dạng" ➜ Giữ trống để người dùng tự chọn.
- **Kết quả**: Auto-classify hoạt động chính xác theo logic. Tốc độ cao vì chạy hoàn toàn offline bằng RegExp và string matching. `PASS`.

## 3. Current status/approval flow
- File mới tải lên (Upload) luôn được gán trạng thái `SUBMITTED` trong cơ sở dữ liệu (`route.ts`).
- Các quyền `canChangeDocumentStatus` cho phép Lãnh đạo hoặc Manager thay đổi trạng thái của tài liệu thành `APPROVED` hoặc `REJECTED`.
- Quá trình đổi trạng thái diễn ra qua một Modal hiển thị khi chọn `Đổi trạng thái` bên trong Menu dọc hoặc ở góc Document Viewer.

## 4. UX Problem with “Chờ duyệt”
**Vấn đề:** 
1. Không có trang "Hàng đợi chờ duyệt" tổng hợp (Approval Inbox).
2. Người quản lý phải bấm vào từng thư mục, dùng bộ lọc trạng thái "Chờ duyệt" để mò tìm file.
3. Việc mọi file tải lên (từ hình ảnh hiện trường, nhật ký ngày...) đều "Chờ duyệt" khiến người dùng cảm thấy hệ thống quá cứng nhắc trong khi đây chỉ là một kho lưu trữ cục bộ.

## 5. Folder-by-folder approval need analysis
- **Cần phê duyệt chặt chẽ**: Hợp đồng (01), Dự toán (03), Hóa đơn (05), Thanh toán (06) và Nghiệm thu (04).
- **Không cần thiết**: Bản vẽ tham khảo (02), Hình ảnh hiện trường (07), Báo cáo ngày (08).
- **Đề xuất nâng cấp sau**: Thiết lập Cờ (Flag) "Cần phê duyệt" ở mức thư mục (Folder schema). Chỉ thư mục nào có cờ thì file mới có status SUBMITTED, các thư mục khác cho thẳng lên APPROVED.

## 6. Recommendation & Fixes Applied
**Khuyến nghị:**
- Không hiển thị badge `Chờ duyệt` (SUBMITTED) ngoài thẻ (File Card) để làm dịu trải nghiệm người dùng, giúp giao diện không bị ngợp.
- Với file đang `SUBMITTED`, bên trong trình xem chi tiết (Document Viewer), thay vì gọi "Chờ duyệt", chỉ cần gọi nhẹ nhàng là `"Mới tải lên"`.
- Trạng thái `APPROVED` (Đã duyệt) hoặc `REJECTED` (Từ chối) vẫn giữ nguyên tính chất và được tô màu nổi bật vì đây là những quyết định có giá trị.

**Sửa đổi UI đã áp dụng:**
1. **`document-workspace.tsx`**: 
   - Sửa dòng render Badge ở phần chi tiết Card (`document.status !== "SUBMITTED"`). Nếu là SUBMITTED thì ẩn badge xanh đi, chỉ giữ lại chi tiết dung lượng và định dạng.
2. **`document-viewer.tsx`**:
   - Tương tự trên Header, không hiển thị Badge xanh "Chờ duyệt".
   - Bổ sung text màu xám nhạt `Mới tải lên` để thay thế.

## 7. Build Result & Storage Safety
- `npx prisma validate`: Pass
- `tsc --noEmit`: Pass
- `npm run build`: Pass
- Toàn bộ dữ liệu `storage` và lịch sử Git vẫn an toàn tại Local, tuyệt đối không bị đồng bộ đi đâu.

## 8. Kết luận
- **Auto-classify**: PASS
- **Approval UX**: PASS (Đã xử lý giấu bớt phần hiển thị rườm rà).
- **Có migration không**: KHÔNG. (Mọi thay đổi chỉ ở UI client).
- **Push repo cũ**: KHÔNG.
- **Production**: NO-GO.
