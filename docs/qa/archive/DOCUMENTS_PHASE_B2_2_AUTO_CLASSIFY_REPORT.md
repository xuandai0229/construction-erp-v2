# Báo cáo Triển khai: Documents Phase B2.2 — Auto Document Type Suggestion

## 1. Executive Summary
Phase B2.2 triển khai tính năng Tự động Nhận diện và Gợi ý Loại Hồ sơ (Auto Classify) thông minh ngay tại bước Upload Preflight. Dựa trên tên thư mục đích, định dạng mở rộng (extension), và các từ khóa tiếng Việt/Anh trong tên file, hệ thống sẽ đề xuất một `documentType` phù hợp nhất. Tính năng này giúp giảm bớt thao tác thủ công, hạn chế sai sót phân loại nhưng vẫn cho phép người dùng tự do chỉnh sửa lại trước khi quyết định tải lên. Hoàn toàn không sửa đổi Schema, không cần migration.

## 2. File thay đổi
1. `src/lib/documents/auto-classify.ts` (Mới tạo - chứa logic Suggestion).
2. `src/components/documents/document-workspace.tsx` (Thêm logic hiển thị gợi ý tại màn hình Upload Preflight).
3. `src/app/api/documents/upload/route.ts` (Thêm bước chặn documentType không hợp lệ với folder hiện tại tại Backend).

## 3. Rule Auto Classify theo folder
Logic được thiết kế để chuẩn hóa chuỗi (bỏ dấu tiếng Việt, đưa về chữ thường) và đối chiếu từ khóa với thư mục đích.
- **Hợp đồng**: Chứa từ khóa `phụ lục`, `bảo lãnh`, `biên bản`, `hợp đồng` -> Tự gán các Type tương ứng.
- **Bản vẽ**: Extension `.dwg/.dxf`, hoặc tên chứa `shopdrawing`, `hoàn công`, `thiết kế`.
- **Dự toán**: Chứa `điều chỉnh`, `khối lượng`, `dự toán`.
- **Nghiệm thu**: Chứa `vật liệu`, `khối lượng`, `nghiệm thu`, `nt`.
- **Hóa đơn**: Extension `.xml`, tên chứa `hóa đơn/VAT`, `nhà cung cấp`.
- **Thanh toán**: Chứa `ủy nhiệm chi`, `chuyển khoản`, `biên lai`.
- **Hình ảnh hiện trường**: Chứa `vật liệu`, `tiến độ`, extension `.jpg, .png, .heic...`.
- **Báo cáo ngày**: Chứa `ngày`, `tuần`, `tháng`.

## 4. Confidence Logic (Độ tin cậy)
- Trả về `HIGH` khi dựa vào Extension chính xác và khó có khả năng sai lệch (như `.dwg`, `.xml`).
- Trả về `MEDIUM` khi dựa trên việc bắt khớp Keyword từ tên file.
- Trả về `LOW` (kèm `documentType: null`) khi tên file không mang ý nghĩa rõ ràng (vd: `scan123.pdf`). 

## 5. Upload Preflight Behavior
- Nếu kết quả trả về `HIGH/MEDIUM`: Dropdown `Loại hồ sơ` tự động điền sẵn gợi ý, bên dưới xuất hiện dòng thông báo chữ xanh nhạt (VD: `✨ Đã gợi ý: Biên bản nghiệm thu — Tên chứa từ khóa nghiệm thu.`).
- Nếu kết quả trả về `LOW`: Dropdown giữ trống `-- Chọn loại --` và xuất hiện dòng thông báo nhỏ màu xám (`Chưa nhận diện được loại hồ sơ, vui lòng tự chọn.`).
- Người dùng luôn có thể đổi thủ công. Nếu đã đổi và bấm Tải lên, lựa chọn cuối cùng sẽ được gửi đi.

## 6. Backend Validation
- Nếu Payload `documentType` được gửi kèm file, API `POST /api/documents/upload` sẽ quét toàn bộ danh sách hợp lệ của thư mục (thông qua `getDocumentTypeOptionsForFolder`). 
- Nếu sai lệch hoặc gửi bừa, API lập tức phản hồi HTTP 400: `Loại hồ sơ không hợp lệ cho thư mục này`.

## 7. Test Result
- [x] Upload XML hóa đơn -> Nhận đúng Hóa đơn XML.
- [x] Upload PDF nghiệm thu -> Nhận đúng Biên bản nghiệm thu.
- [x] Upload file vô danh -> Trả về chưa phân loại.
- [x] Thử Submit sai type -> Backend chặn.

## 8. Build Result
- **Prisma**: Valid 100%.
- **TSC**: No emit thành công, không có lỗi type.
- **Build**: Next.js production build PASS.

## 9. Cảnh báo an toàn (Git / Storage)
- **Tuyệt đối cấm Push:** Repo local `D:\construction-erp-v2` chứa lịch sử file mật trong `/storage/`. Việc phát triển tại đây chỉ dành cho Local Testing và Test-run.

## 10. Rủi ro còn lại
- Chức năng dò tìm Keyword hiện tại dùng Normalize tiếng Việt. Có thể bỏ sót nếu tên file gõ theo chuẩn lạ hoặc bị mã hóa bảng mã không chuẩn. Sẽ khắc phục dần qua thực tế.

## 11. Kết luận
- **Phase B2.2**: PASS (Hoàn thành hệ thống nhận diện file Auto-classify).
- **Auto classify**: PASS (Chính xác, linh hoạt, an toàn).
- **Có migration không**: KHÔNG.
- **Push repo cũ**: KHÔNG.
- **Production**: NO-GO.
