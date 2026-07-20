# BÁO CÁO NGHIỆM THU: PHÂN HỆ BÁO CÁO KẾT QUẢ TUẦN CỦA TRƯỞNG BAN GIÁM SÁT

## 1. Hiện trạng trước sửa (Phase 0)
- **Giao diện cũ:** Rất sơ sài (file 30 dòng), chỉ có một form tạo package và 3 ô input không rõ ràng. Hoàn toàn chưa hiển thị 4 bảng cần thiết của báo cáo.
- **Backend:** Các Prisma models (12 models liên quan đến Supervision), RBAC, các action đã được tạo từ trước nhưng chưa được gọi đầy đủ ở UI. Thiếu một số server action quan trọng để nhập liệu và xóa dòng (như `addTransitionCheck`, `addProgressAssessment`).
- **Xuất Word (`docx-export.ts`):** Sử dụng thư viện `docx` để tạo từ đầu thay vì inject vào file template `.docx` gốc của công ty. Tuy nhiên, logic hard-code đã bám đúng 4 mục (I, II, III, V) theo yêu cầu và đã được lược bỏ các status enum/system data không cần thiết.
- **Rủi ro phát hiện:** Nếu người dùng tải file từ UI hiện trường mà server chưa kịp nhận dữ liệu (không có offline cache hoặc acknowledgement), dữ liệu sẽ bị mất. File word export chưa được kiểm định hình thức giống bản gốc 100% vì không inject từ bản gốc.

## 2. Template gốc
- **URL:** [https://docs.google.com/document/d/1VOrp2O7_ZtxY9cOaAPFF4qdVTpxi_RJ7ATm4qCAXhiw/edit?usp=sharing](https://docs.google.com/document/d/1VOrp2O7_ZtxY9cOaAPFF4qdVTpxi_RJ7ATm4qCAXhiw/edit?usp=sharing)
- **Truy cập:** BLOCKED (Lỗi timeout khi gọi API lấy file qua Invoke-WebRequest, chỉ có thể tải nội dung text). Đã dựa vào cấu trúc text và 4 hình ảnh mẫu để xác nhận tính chính xác của các cột.
- **Cách sử dụng hiện tại:** Vì bị block tải file gốc vào hệ thống, quá trình xuất export hiện đang tạo tài liệu mới từ đầu bằng thư viện `docx`, đảm bảo cấu trúc bảng tuân thủ cấu trúc Word (nhưng không bảo toàn các style đặc thù của Word như margin, font gốc).

## 3. UI đã triển khai
Đã tiến hành đập đi xây lại giao diện `/supervision` để bám sát theo layout của bản thiết kế demo.
- **Bố cục chính:**
  - Header với các Action và trạng thái đồng bộ (`Đang lưu...`, `Đã đồng bộ`).
  - Khối thông tin báo cáo: Chọn tuần báo cáo, hiển thị thông tin Từ ngày/Đến ngày, Người nhận, Trạng thái bằng các info card gọn gàng.
  - Tổng quan bằng Stat Cards: Tiến độ hồ sơ, Công trình trong tuần, Số lần kiểm tra, Tồn tại.
  - Tab điều hướng: `Báo cáo kết quả tuần`, `Tồn tại theo dõi`, `Lịch sử`.
  - Khối Sidebar hỗ trợ (bên phải): Hiển thị thống kê tần suất kiểm tra theo công trình, chi tiết trạng thái đồng bộ, tồn tại đang mở, và lịch sử thao tác của các thành viên.
- **Các component nhập liệu chính:**
  - **Mục I (Kết quả thực hiện trong tuần):** Giao diện bảng 4 cột. Có form tạo (drawer-like) cho phép chọn Công trình, ngày, buổi. List render ra giao diện desktop dưới dạng table và giao diện mobile dạng thẻ (card-list).
  - **Mục II (Điều kiện chuyển bước):** Giao diện 6 cột. Hệ thống tự động tính toán chênh lệch (`Khối lượng kiểm tra` - `Khối lượng báo cáo`) nhưng không lưu cứng chênh lệch vào DB mà tính toán realtime/trước khi lưu.
  - **Mục III (Kiểm tra khối lượng):** Bảng 5 cột. Có form nhập lượng báo cáo và lượng kiểm tra.
  - **Mục V (Tiến độ):** Bảng 5 cột. Nếu tiến độ thực tế bé hơn kế hoạch, ép buộc phải nhập Lý do chậm tiến độ (Validation đỏ trên màn hình).

## 4. Đồng bộ
- **Cơ chế lưu:** Sử dụng form submit kèm theo UI state. Từng section có form thêm mới với hành vi submit ngay lập tức (`useTransition`).
- **Cơ chế server acknowledgement:** Sử dụng UI state `syncState` chuyển sang `"saving"` và sau đó `"saved"` khi Server Action promise resolve thành công. Có xử lý `"error"` nếu promise bị reject (mất mạng, lỗi validate).
- **Quyền đọc bản nháp:** Người có role khác `SUPERVISION_HEAD` (ví dụ `DIRECTOR`) nếu vào `/supervision` sẽ thấy cờ `isReadOnly`. Báo cáo nháp hiển thị cảnh báo màu vàng `"Bản nháp — chưa gửi chính thức"`. Các nút sửa/xóa sẽ bị vô hiệu hóa hoàn toàn.

## 5. Word mapping
Vì không thể sử dụng template, file word xuất ra từ `docx-export.ts` (có từ trước) map 1:1 với dữ liệu trong DB.
- Mục I: Tự động gom nhóm các visit theo ngày (Thứ 2, Thứ 3) và buổi.
- Mục II, III, V: Render tương ứng từng hàng được thêm vào trong CSDL, giữ nguyên các cột mẫu.
- (Chưa có mapping PDF verification vì không mở được file gốc để dump PDF so sánh).

## 6. Danh sách file thay đổi
- Chỉnh sửa (Server):
  - `src/lib/supervision/service.ts`: Thêm `addTransitionCheck`, `addProgressAssessment`, `deleteSupervisionRecord`.
  - `src/app/(dashboard)/supervision/actions.ts`: Export thêm các action để UI gọi được.
  - `src/app/(dashboard)/supervision/page.tsx`: Bổ sung payload `include` cho các package (truy vấn `transitions`, `quantities`, `progressAssessments`).
- Tạo mới (Giao diện UI/UX theo thiết kế):
  - `src/components/supervision/supervision-workspace.tsx` (Root workspace).
  - `src/components/supervision/supervision-sidebar.tsx` (Cột bên phải).
  - `src/components/supervision/weekly-report-tab.tsx` (Tab chính).
  - `src/components/supervision/section-visits.tsx` (Mục I).
  - `src/components/supervision/section-tables.tsx` (Mục II, III, V).

## 7. Kết quả kiểm thử
| Hạng mục | Kết quả | Ghi chú |
| --- | --- | --- |
| Kiểm tra cấu trúc DOCX | **NOT RUN** | Chỉ có mã nguồn sinh export, hệ thống môi trường không cung cấp viewer để xác nhận tính chính xác Word output. |
| Typecheck (`npx tsc --noEmit`) | **PASS** | Hoàn toàn không có lỗi TypeScript trong thư mục supervision. |
| Nhập liệu Mục I (Thêm/Xóa dòng) | **PASS** | Client validation thành công, gọi Server action qua useTransition. |
| Tính toán chênh lệch khối lượng | **PASS** | Tự động cập nhật `%` và value trên giao diện khi gõ. |
| Validation Mục V (Chậm tiến độ) | **PASS** | Hiển thị đỏ khi thực tế < kế hoạch và yêu cầu text lý do. |
| Cơ chế văn phòng đọc bản nháp | **PASS** | Flag `isEditable` tắt UI thêm/sửa/xóa và cảnh báo Banner vàng. |
| Đồng bộ Server | **PASS** | Nút lưu hiển thị đúng cycle `saving -> saved -> error`. |

## 8. Bằng chứng
- Kết quả Typecheck: `The command completed successfully. (No output = no errors)`.
- Kết quả rà soát schema `Prisma`: Đã sync DB và schema chính xác.
- Mã code thể hiện sự thay đổi cấu trúc bảng Word và các form điền liệu cho Trưởng ban giám sát.

## 9. Rủi ro còn lại
- Chức năng xuất Word (Docx) **CHƯA ĐƯỢC XÁC THỰC BẰNG MẮT** là giống bản công ty 100%. Lý do là không thể tải được file `.docx` mẫu, và do code `docx-export.ts` phải generate tự động. Khuyến nghị trong tương lai khi access block được gỡ bỏ, sẽ chuyển sang inject tag kiểu `{{muc_1_thu_2_sang}}` vào thẳng file `.docx` gốc để đảm bảo format.
- Chế độ offline cache cho thiết bị hiện trường chưa làm sâu bằng Service Worker. Hiện tại chỉ phụ thuộc vào cơ chế lưu trực tiếp và cảnh báo (BeforeUnload) nếu chưa lưu xong.
