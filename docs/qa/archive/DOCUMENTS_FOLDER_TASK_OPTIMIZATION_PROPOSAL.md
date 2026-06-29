# DOCUMENTS FOLDER TASK OPTIMIZATION PROPOSAL

## 1. Executive Summary

Hiện tại, phân hệ Documents đang hoạt động theo cơ chế "kho chứa chung", cho phép người dùng upload file tự do vào bất kỳ thư mục nào. Nếu giữ nguyên cơ chế này ở giai đoạn triển khai thực tế công trình, hệ thống sẽ đối mặt với rủi ro rác hóa dữ liệu: file tải lên lộn xộn, sai thư mục, không thể tìm kiếm, không biết đâu là bản mới nhất (versioning), và thiếu các dữ kiện (metadata) để liên kết với các nghiệp vụ khác như Hóa đơn, Thanh toán, hay Nghiệm thu.

Mục tiêu của đề xuất này là chuyển đổi phân hệ Documents từ một "Kho lưu trữ file tĩnh" thành một "Hệ thống quản lý hồ sơ thông minh". Mỗi thư mục (folder) sẽ có một nhiệm vụ rõ ràng, quy định loại file được phép, và yêu cầu metadata cụ thể khi tải lên. Việc này giúp dữ liệu có cấu trúc, phục vụ tốt cho kế toán, chỉ huy trưởng và giám đốc trong quá trình kiểm tra, đối chiếu. Đề xuất được chia thành 3 giai đoạn (Phases) để đảm bảo có thể áp dụng MVP nhanh chóng mà không cần thay đổi database ngay lập tức.

## 2. Hiện trạng Code/Schema

Sau khi phân tích mã nguồn và schema hiện tại:
* **`DocumentFolder`**: Chỉ lưu trữ cấu trúc cây thư mục với `id`, `projectId`, `parentId`, `name`. Chưa có cờ phân loại thư mục (category type).
* **`Document`**: Lưu trữ các thông tin cơ bản về file như `originalName`, `storedName`, `mimeType`, `extension`, `size`, `storagePath`, `uploadedById`, và `version`.
  * *Thiếu sót*: Chưa có trường `metadata` (JSON) để lưu các thông tin bổ sung (ví dụ: Số hợp đồng, Giá trị hóa đơn, Ngày chụp ảnh). Chưa có trường `status`, `documentType`, `reviewedById`.
* **Upload Mechanism**: Hiện đang lưu trữ file trực tiếp tại Local File System (`fs.writeFile`) trên máy chủ.
* **RBAC & AuditLog**: Hệ thống đã có cơ chế phân quyền bảo vệ theo `projectId` (chỉ thành viên dự án mới được xem/tải), và `AuditLog` đã ghi nhận đầy đủ lịch sử Create/Upload/Delete.

## 3. Ma trận tác vụ theo 8 thư mục

| Folder | Mục đích | Loại tài liệu | Metadata cần thiết (Tương lai) | File Type cho phép | Quyền Upload/Duyệt | Trạng thái/Liên kết |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **01_Hợp đồng** | Lưu trữ hồ sơ pháp lý, hợp đồng chính, phụ lục | Hợp đồng, Phụ lục, Bảo lãnh, Biên bản ký kết | Số HĐ, Ngày ký, Giá trị, Bên ký, Loại HĐ | PDF, DOCX, XLSX | Kế toán, PM / Giám đốc duyệt | Liên kết Kế toán (Thanh toán) |
| **02_Bản vẽ** | Quản lý thiết kế, shopdrawing, hoàn công | Shopdrawing, Bản vẽ thiết kế, Bản vẽ hoàn công | Mã bản vẽ, Hạng mục, Version, Ngày phát hành | PDF, DWG, DXF, PNG | Chỉ huy, Kỹ sư / QA_QC duyệt | Cảnh báo bản vẽ cũ (Superseded) |
| **03_Dự toán** | Quản lý ngân sách, khối lượng gốc | Dự toán gốc, Dự toán điều chỉnh, Bảng khối lượng | Loại dự toán, Người lập, Ngày lập, Version | PDF, XLSX | PM, Kế toán | Liên kết WBS/Field Progress |
| **04_Nghiệm thu** | Quản lý hồ sơ chất lượng thi công | Biên bản nghiệm thu, Hồ sơ vật liệu, HSKL | Ngày NT, Đợt NT, Hạng mục, Trạng thái ký | PDF, DOCX, JPG | QA_QC, Chỉ huy trưởng | Liên kết Field Progress |
| **05_Hóa đơn** | Chứng từ đầu vào, đầu ra | Hóa đơn NCC, Hóa đơn VAT | Số hóa đơn, Ngày xuất, NCC, MST, Tổng tiền | PDF, JPG, XML | Kế toán, PM | Liên kết Contract/NCC |
| **06_Thanh toán** | Hồ sơ thanh/quyết toán | Phiếu chi, UNC, Biên nhận | Ngày TT, Số tiền, Người nhận, Phương thức | PDF, JPG | Kế toán / Giám đốc duyệt | Đối chiếu Hóa đơn/Hợp đồng |
| **07_Hình ảnh hiện trường** | Báo cáo trực quan tiến độ, vật tư | Ảnh công trường, Ảnh vật tư, Ảnh thi công | Ngày chụp, Khu vực, Mũi thi công, Ghi chú | JPG, PNG, HEIC | Giám sát, Kỹ sư, Chỉ huy | Liên kết Site Report |
| **08_Báo cáo ngày** | Lưu trữ báo cáo định kỳ dạng file cứng | Báo cáo ngày/tuần/tháng, Báo cáo CHT | Ngày BC, Loại BC, Người lập | PDF, DOCX, XLSX | Chỉ huy trưởng, CHT | Liên kết Site Report |

## 4. UX Đề xuất khi chọn Folder

Thay vì chỉ hiển thị một danh sách file và nút "Tải lên" chung chung, trải nghiệm người dùng cần thay đổi linh hoạt theo từng folder:
* **Layout theo Context**: Khi chọn folder, phần header của khu vực nội dung sẽ hiển thị Tiêu đề và **Mô tả mục đích** của thư mục đó (Ví dụ: "Thư mục Hóa đơn: Chỉ tải lên hóa đơn VAT, chứng từ hợp lệ").
* **Nút Upload thông minh**: Đổi tên nút thành ngữ cảnh, ví dụ: "Tải Hóa đơn lên", "Tải Bản vẽ mới".
* **Upload Form & Metadata Checklist**: Khi bấm Upload, thay vì chỉ mở popup chọn file, hệ thống sẽ mở một Dialog. Tùy thuộc vào folder mà Dialog sẽ yêu cầu nhập các trường (nếu có hỗ trợ ở Phase B), hoặc tối thiểu là gợi ý **Naming Convention** (Ví dụ: Yêu cầu đặt tên `HDON_[NhaCungCap]_[SoHoaDon].pdf`).
* **Empty State**: Nếu thư mục chưa có tài liệu, hiển thị checklist hoặc luồng hướng dẫn loại hồ sơ còn thiếu (Ví dụ: "Hiện chưa có Hợp đồng chính nào được tải lên").
* **File List Badge**: Thêm badge trạng thái (Ví dụ: `Bản mới nhất`, `Bản cũ`, `Đã duyệt`) thay vì chỉ hiện tên file.
* **Mobile UX**: Đặc biệt tối ưu thư mục "Hình ảnh hiện trường" trên Mobile bằng nút "Chụp ảnh ngay" truy cập camera trực tiếp.

## 5. Upload Rules

Nhằm giữ sạch hệ thống, cần áp đặt các Rule Upload cứng ở phía backend và frontend:
* **Allowed Types**: Giới hạn MIME type nghiêm ngặt theo bảng ma trận (Hóa đơn không được tải `.dwg`).
* **Max Size**: 
  * Ảnh hiện trường: Giới hạn tự động nén ảnh, tối đa 5-10MB/file.
  * Bản vẽ/Hợp đồng: 50MB.
* **Duplicate Detection**: Chặn tải lên file có cùng tên, cùng dung lượng, cùng loại trong cùng một folder.
* **Versioning**: Nếu upload file trùng tên với file đã có, hệ thống không báo lỗi mà hỏi người dùng: "Bạn muốn ghi đè lên bản cũ thành Version mới không?". Tự động tăng `version`.
* **Naming Suggestion**: Cung cấp Text Input cho phép người dùng đổi tên file chuẩn trước khi đẩy lên server, thay vì giữ nguyên tên `zalo_image_xxx.jpg` vô nghĩa.

## 6. Roadmap 3 Phase

### Phase A: UAT Nhanh & MVP Cơ Bản (Không đổi Schema)
* **Mục tiêu**: Làm cho các Folder có ý nghĩa hơn thông qua UX/UI.
* **Thực thi**:
  * Gắn cứng (hard-code) phần mô tả (Description) cho 8 folder mặc định hiển thị trên UI.
  * Hiển thị cảnh báo Rule định dạng file (ví dụ: "Chỉ nhận PDF/JPG") khi click vào thư mục.
  * Lọc file type trực tiếp trên thẻ `<input type="file" accept="..." />` tương ứng với mỗi folder.
  * Suggestion format tên file trên UI để người dùng tự sửa.
* **Rủi ro**: Dễ thực hiện, an toàn, không tốn thời gian.

### Phase B: MVP Thực Thụ (Bắt đầu liên kết Dữ liệu)
* **Mục tiêu**: Có lưu trữ Metadata, Versioning và Phân quyền Folder.
* **Thực thi**:
  * Chạy Schema Migration: Bổ sung trường `documentType` (Enum) và `metadata` (JSONB) cho bảng `Document`.
  * Xây dựng Component Upload Dialog động: Khi chọn `type = INVOICE`, form bắt buộc nhập `Số hóa đơn`, `Ngày`, `Giá trị`. Data này save vào trường `metadata`.
  * Hiển thị Filter/Search nâng cao dựa trên `metadata` (ví dụ: Lọc hóa đơn theo tháng).
  * Chạy luồng Versioning cơ bản (đánh dấu `isLatest` trong schema).
* **Rủi ro**: Cần cẩn trọng khi migrate dữ liệu json.

### Phase C: Production Hardening
* **Mục tiêu**: Chuẩn hóa lưu trữ Doanh nghiệp.
* **Thực thi**:
  * Tích hợp Object Storage (AWS S3, MinIO) thay vì dùng `fs.writeFile` để giải quyết bài toán scale, dung lượng và an toàn dữ liệu.
  * Cấp phát Signed URL để xem/tải file thay vì stream trực tiếp từ Next.js.
  * Audit Policy, File retention (xóa file thùng rác sau 30 ngày).
  * Quy trình Approval (Trình duyệt Bản vẽ, Ký nháy Hóa đơn).

## 7. Technical Design

* **Làm ngay (Phase A)**: Thay đổi file `document-manager.tsx`. Định nghĩa một config Object `FOLDER_RULES` trong code frontend (map ID hoặc Name của folder với Config: `acceptType`, `description`, `namingConvention`).
* **Cần Migration (Phase B)**:
  ```prisma
  model Document {
    ... // fields hiện có
    status       String?   // DRAFT, APPROVED, REJECTED
    metadata     Json?     // Lưu { "contractNo": "...", "amount": ... }
    isLatest     Boolean   @default(true)
  }
  ```
* **Cần Storage Service (Phase C)**: Đổi toàn bộ logic `api/documents/upload` để sinh Presigned URL từ S3, client upload thẳng lên S3 để giảm tải cho Next.js Backend.

## 8. RBAC / Workflow Đề xuất

Phân quyền không chỉ nằm ở Project mà nằm ở **Nghiệp vụ**:
* **Admin / Director**: Được quyền xem và tải tất cả tài liệu. Được quyền Xóa.
* **Kế toán (Accountant)**: Có quyền Upload/Edit ở các folder **Hợp đồng, Hóa đơn, Thanh toán, Dự toán**. Chỉ được xem (View-only) Bản vẽ, Ảnh hiện trường.
* **Chỉ huy trưởng / Kỹ sư (Chief Commander / Engineer)**: Có quyền Upload/Edit ở các folder **Bản vẽ, Nghiệm thu, Báo cáo ngày, Ảnh hiện trường**. Có thể View Hợp đồng nhưng không được sửa/xóa.
* **Workflow Cơ bản**:
  * File tải lên mặc định ở trạng thái `SUBMITTED`.
  * Tùy folder (Bản vẽ, Hóa đơn), PM hoặc QA_QC sẽ ấn nút `Approve` hoặc `Reject`. (Cần Phase B).

## 9. Rủi ro nếu không tối ưu

* **Dữ liệu loạn (Data Swamp)**: Documents trở thành thùng rác số. Các phòng ban không thể tìm thấy file cần thiết khi thanh tra, kiểm toán.
* **Rủi ro pháp lý & Tài chính**: Hóa đơn thất lạc, Hợp đồng lưu sai bản cũ (không có phụ lục mới nhất), Bản vẽ thi công nhầm version cũ dẫn đến sai sót trên công trường.
* **Không thể tích hợp**: Khi phân hệ Kế toán hoặc Phê duyệt hoàn thiện, không thể link tới một file hóa đơn "chết" vì nó không có Metadata (Số tiền, Mã số thuế). 
* **Quá tải máy chủ**: Upload local file system sẽ nhanh chóng làm đầy ổ cứng server production, và việc stream file lớn qua nodejs làm nghẽn cổ chai ứng dụng.

## 10. Quyết định Đề xuất

1. **Cho bản UAT sắp tới**: Áp dụng ngay **Phase A**. Hard-code các quy tắc (hiển thị mô tả folder, ràng buộc `accept` mime-type của input file, hiển thị badge "Bản vẽ", "Hóa đơn") trên giao diện để khách hàng thấy được định hướng chuyên nghiệp. Không đụng vào schema lúc này.
2. **Cho Milestone tiếp theo**: Đưa **Phase B (Schema Migration - Metadata/Status)** vào Sprint kế tiếp ngay sau UAT.
3. **Tuyệt đối không**: Không code luồng duyệt (Workflow) hay Versioning ngay bây giờ vì sẽ làm phình to scope dự án hiện tại. Dành chúng cho hệ thống khi đã chuẩn hóa được S3 Storage.
