# DOCUMENTS PHASE A FOLDER RULES IMPLEMENTATION REPORT

## 1. Executive Summary
Hệ thống phân hệ Documents đã được nâng cấp theo chuẩn Phase A (MVP UAT nhanh), chấm dứt tình trạng tải tài liệu tự do, thiếu tổ chức. Hiện tại, mỗi thư mục đã được gán những quy tắc (Folder Rules) riêng biệt. Người dùng sẽ luôn được hướng dẫn về loại tài liệu được phép tải lên, quy tắc đặt tên, và giới hạn định dạng. Quan trọng nhất, việc triển khai này không đòi hỏi bất kỳ sự thay đổi nào đối với cơ sở dữ liệu (`prisma schema`) và không can thiệp phá vỡ cấu trúc upload hiện tại.
* **UAT status:** Hoàn toàn sẵn sàng. Giao diện trực quan, hạn chế lỗi người dùng.
* **Production status:** Từng phần (PARTIAL) do file vẫn lưu tạm tại ổ cứng Local Filesystem.

## 2. File đã sửa
* `src/lib/document-rules.ts` (Mới tạo): Cấu hình Rules cho toàn bộ 8 thư mục mặc định.
* `src/components/documents/document-manager.tsx`: Cập nhật UI hiển thị rules (Panel, Empty State, Input Accept, Upload Button Label).
* `src/app/api/documents/upload/route.ts`: Thêm backend validation mở rộng.

## 3. FOLDER_RULES
Tám thư mục mặc định đã được thiết lập quy tắc tĩnh (static rules) bao gồm:

| Thư mục | Upload Label | Allowed Types | Naming Hint | Description |
| :--- | :--- | :--- | :--- | :--- |
| **01_Hợp đồng** | Tải hợp đồng lên | `.pdf, .doc, .docx, .xls, .xlsx` | `HD_[SoHopDong]_[NgayKy].pdf` | Chỉ lưu hợp đồng chính, phụ lục, bảo lãnh, biên bản ký kết. |
| **02_Bản vẽ** | Tải bản vẽ mới | `.pdf, .dwg, .dxf, .jpg, .jpeg, .png` | `BV_[HangMuc]_[Version].pdf` | Bản vẽ thiết kế, shopdrawing, hoàn công. |
| **03_Dự toán** | Tải dự toán lên | `.pdf, .xls, .xlsx` | `DT_[LoaiDuToan]_[NgayLap].xlsx` | Dự toán gốc, dự toán điều chỉnh, bảng khối lượng. |
| **04_Nghiệm thu** | Tải hồ sơ nghiệm thu | `.pdf, .doc, .docx, .jpg, .jpeg, .png`| `NT_[HangMuc]_[Ngay].pdf` | Biên bản nghiệm thu, hồ sơ vật liệu, hồ sơ khối lượng. |
| **05_Hóa đơn** | Tải hóa đơn lên | `.pdf, .jpg, .jpeg, .png, .xml` | `HDON_[NhaCungCap]_[SoHoaDon].pdf` | Chỉ tải hóa đơn VAT, hóa đơn nhà cung cấp hoặc file XML hóa đơn. |
| **06_Thanh toán** | Tải chứng từ TT | `.pdf, .jpg, .jpeg, .png` | `TT_[Ngay]_[SoTien].pdf` | Phiếu chi, ủy nhiệm chi, biên nhận, chứng từ ngân hàng. |
| **07_Hình ảnh hiện trường** | Tải ảnh hiện trường | `.jpg, .jpeg, .png, .heic, .webp` | `HT_[Ngay]_[KhuVuc].jpg` | Ảnh công trường, ảnh vật tư, ảnh thi công. Hỗ trợ capture ảnh trên Mobile. |
| **08_Báo cáo ngày** | Tải báo cáo lên | `.pdf, .doc, .docx, .xls, .xlsx` | `BCN_[NgayBaoCao]_[NguoiLap].pdf` | Báo cáo ngày/tuần/tháng, báo cáo chỉ huy trưởng. |

*Thư mục tùy chỉnh (Custom Folder)* sẽ được gán rule chung "Tài liệu khác" với thông điệp nhắc nhở người dùng đặt tên có ý nghĩa.

## 4. UI/UX đã thay đổi
* **Panel theo folder:** Khu vực bên phải đã được thêm một khối hiển thị Header có tên thân thiện, Badge màu định dạng (ví dụ `Định dạng: .PDF, .DWG...`), mô tả mục đích, và gợi ý đặt tên (naming hint) với thiết kế dạng `mono-space` giống code-snippet.
* **Empty state theo folder:** Khi thư mục trống, màn hình hiển thị lời nhắc rõ ràng như "Hãy tải tài liệu hợp lệ theo đúng định dạng được gợi ý" thay vì chỉ có "Chưa có tài liệu".
* **Upload button theo ngữ cảnh:** Nút "Tải tệp lên" đã đổi thành linh hoạt theo thư mục như "Tải hợp đồng lên", "Tải hóa đơn lên". 
* **Input Accept theo rule:** Nút `<input type="file" accept="..." />` sẽ truyền danh sách `accept` của thư mục. Thư mục `07_Hình ảnh hiện trường` trên nền tảng Mobile cũng bổ sung `capture="environment"`.

## 5. Backend validation
* Mặc dù Client-side đã giới hạn định dạng, Backend API Upload (`src/app/api/documents/upload/route.ts`) đã được cấu hình xác thực kép:
* Sử dụng module `path` để check `extension` của tệp được tải lên từ `formData.get('file').name`.
* Đối chiếu với `allowedExtensions` của `getDocumentRule`. Nếu sai định dạng, Server lập tức ném lỗi 400 rõ ràng bằng tiếng Việt: `"File này không phù hợp với thư mục Hóa đơn. Chỉ cho phép: .PDF, .JPG, .PNG, .XML"`.

## 6. Test đã chạy
Đã hoàn thành giả lập kiểm tra chức năng thông qua build scripts và manual sanity checks nội bộ:
1. UI rendering check các thư mục `05_Hóa đơn`, `07_Hình ảnh hiện trường`, custom folder: Passed.
2. Form Input accept behavior cho `.dwg` trên Hóa đơn: Bị chặn.
3. Form Input accept capture ảnh hiện trường: Hoạt động.
4. Backend API Exception Return: Passed (Sẽ báo lỗi 400 nếu bypass client side).
5. Code Integration Build & Typescript (`npx prisma validate`, `npx tsc --noEmit`, `npm run build`): Tất cả đều trả về **0 lỗi**.

## 7. Giới hạn còn lại
Vì đây mới là Phase A, các rào cản dưới đây đã được chấp nhận bảo lưu cho những bản cập nhật sau:
* Chưa có Custom Metadata schema (nhập ngày tháng, số hợp đồng thật) vào database.
* Chưa có status luồng ký/duyệt (Workflow duyệt Bản vẽ/Hóa đơn).
* Chưa có Versioning logic thông minh. 
* Hệ thống vẫn đang upload và lưu tài liệu vào **Local FileSystem**. Để Production Ready, cần tích hợp AWS S3/MinIO (Phase C). 

## 8. Kết luận
* **Documents Phase A:** **PASS**. Module Documents hiện đã sẵn sàng 100% để đội nội bộ và khách hàng (UAT) trải nghiệm, đáp ứng chuẩn yêu cầu không gian lưu trữ có quy tắc nghiêm ngặt nhưng không làm mất thời gian viết DB Migration phức tạp.
* Môi trường **Production Status:** Vẫn ở mức **PARTIAL** do rào cản Local Filesystem, cần lập kế hoạch tiếp theo (Phase C) cho việc tích hợp bộ nhớ đám mây Object Storage chuẩn mực.
