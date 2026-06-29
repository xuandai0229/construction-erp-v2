# Báo cáo Triển khai: Documents Auto-classify Runtime UAT

## 1. Executive Summary
Thực hiện UAT đánh giá tính năng "Auto Document Type Suggestion" (Tự động gợi ý phân loại hồ sơ). Quá trình kiểm tra xác nhận rằng tính năng này chỉ can thiệp vào bước *Upload Preflight* (khi người dùng vừa chọn file mới) và tuyệt đối không tự ý phân loại lại các tệp (files) đã tồn tại trong quá khứ nhằm đảm bảo tính toàn vẹn dữ liệu. Giao diện (UI) gợi ý đã được tinh chỉnh lại theo góp ý để hiển thị thân thiện, rõ ràng hơn.

## 2. Auto-classify chạy ở đâu?
- Tính năng Tự động gợi ý (Auto-classify) được kích hoạt ngay khi hàm `handleFileSelected` chạy ở phía Front-end (`document-workspace.tsx`). 
- Khi người dùng chọn 1 file để tải lên, hệ thống sẽ đẩy Tên file, Đuôi file và Ngữ cảnh Thư mục hiện tại (Folder Name) vào hàm offline `suggestDocumentType`.
- Kết quả trả về sẽ được điền tự động vào Select Box "Loại hồ sơ" trong màn hình modal Upload Preflight.

## 3. Hành vi với File cũ
- File cũ đang mang trạng thái `Chưa phân loại` sẽ tiếp tục giữ nguyên.
- Auto-classify KHÔNG thực hiện rà quét lại hàng loạt dữ liệu cũ. Đây là hành vi *được thiết kế có chủ ý* (by-design) để bảo vệ các metadata do con người đã tự thiết lập trước đó (tránh việc thuật toán đè lên quyết định của quản lý).

## 4. Test Cases & Kết quả Upload Preflight
Đã test giả lập hành vi tải lên theo kịch bản:
- **Test 1 — `QA_TEST_AUTO_NT_khoi_luong_tang1.pdf` vào `04. Nghiệm thu`**: UI hiển thị Select box chuyển ngay sang "Hồ sơ khối lượng". Phía dưới có dòng màu xanh ngọc báo `✨ Gợi ý phân loại: Hồ sơ khối lượng — Tên chứa từ khóa khối lượng.` 
- **Test 2 — `QA_TEST_AUTO_nghiem_thu_vat_lieu_thep.docx` vào `04. Nghiệm thu`**: Chuyển ngay sang "Hồ sơ vật liệu". 
- **Test 3 — `QA_TEST_AUTO_hoa_don_vat.xml` vào `05. Hóa đơn`**: Gợi ý thành công "Hóa đơn điện tử XML" (nhờ bắt đúng extension `.xml`).
- **Test 4 — `QA_TEST_AUTO_shopdrawing_tang2.pdf` vào `02. Bản vẽ`**: Gợi ý đúng "Bản vẽ Shopdrawing".
- **Test 5 — `QA_TEST_AUTO_scan123.pdf` vào thư mục bất kỳ**: Select box hiển thị `-- Chọn loại --`. Dòng text mờ xám thông báo: `Chưa nhận diện được, bạn có thể chọn thủ công.` Người dùng không bị khóa thao tác.

**Kết quả: PASS 100%**. 

## 5. Kết quả sau Upload & Filter
- File sau khi upload thành công sẽ mang đúng giá trị `documentType` đã được set ở Upload Preflight lưu thẳng vào DB.
- Bộ lọc (Filter) "Phân loại hồ sơ" trên thanh công cụ sẽ tự động xuất hiện mục vừa được phân loại (nếu trước đó thư mục chưa có file nào loại đó). Bộ lọc hoạt động hoàn hảo.
- Việc "Gom nhóm theo phân loại" (Group by Type) hoạt động chính xác, gom các file vừa được tự động phân loại chung với các file cùng loại đã tải lên trước đó.

## 6. UI Wording
Đã cập nhật lại text thông báo để người dùng dễ đọc và cảm thấy "con người" hơn.
- *Có gợi ý:* `✨ Gợi ý phân loại: [Tên Loại] — [Lý do].`
- *Không có gợi ý:* `Chưa nhận diện được, bạn có thể chọn thủ công.`

## 7. Build Result & Git Safety
- `npx prisma validate`: Pass
- `tsc --noEmit`: Pass
- `npm run build`: Pass
- Repo an toàn, hoàn toàn lưu trên local `D:\construction-erp-v2`, tuyệt đối không đẩy code (no git push).

## 8. Kết luận
- **Auto classify runtime**: PASS
- **UI visibility**: PASS
- **Có cần sửa thêm không**: Không, chức năng ổn định.
- **Có migration không**: KHÔNG.
- **Push repo cũ**: KHÔNG.
- **Production**: NO-GO.
