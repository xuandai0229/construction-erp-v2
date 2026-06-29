# DOCUMENTS PHASE B/C — METADATA, RBAC & STORAGE ROADMAP

## 1. Executive Summary
- **Hiện trạng sau Phase A.1**: Module Documents đã có giao diện In-app Viewer hiện đại, trải nghiệm UX upload mượt mà thông qua Preflight Dialog, cấu trúc 8 thư mục chuẩn, đồng bộ URL State và kiểm soát đuôi file căn bản. UAT nội bộ có thể nghiệm thu ngay lập tức.
- **Vấn đề còn lại**: Hệ thống đang lưu trữ file vật lý trên local filesystem (`/storage`), dẫn tới rào cản chí mạng khi deploy Production lên môi trường Serverless (Vercel) hoặc multi-node Docker (nguy cơ mất trắng dữ liệu). Ngoài ra, file hiện tại chưa có các luồng nghiệp vụ (Workflow/Trạng thái duyệt) và chưa chặn được tấn công sửa đuôi file (Magic-byte).
- **Quyết định chiến lược (Nên làm B hay C trước)**: Bắt buộc phải thực hiện **Phase C (S3/MinIO Storage)** trước. Việc giải quyết bài toán hạ tầng lưu trữ là điều kiện tiên quyết trước khi đắp thêm bất kỳ logic nghiệp vụ phức tạp nào của Phase B (Metadata/Versioning), nhằm tránh việc phình to dữ liệu local gây khó khăn cho việc migrate sau này.
- **Kết luận khuyến nghị**: Lên kế hoạch triển khai Phase C ngay lập tức. Giữ nguyên source code Phase A.1 hiện tại, không sửa code hay migration cho đến khi chốt được hạ tầng Cloud Storage.

## 2. Current Architecture Review
- **Model `Document` hiện tại**: Rất cơ bản. Chỉ chứa `originalName`, `storedName`, `mimeType`, `size`, `storagePath`, `version` (int). Không có trạng thái, phân loại chi tiết hay dữ liệu JSON.
- **Upload/Download hiện tại**: Chạy trực tiếp qua API Route của Next.js, gọi lệnh `fs.writeFile` để ghi vào đĩa cứng. 
- **Viewer hiện tại**: Xử lý tốt ở Client-side thông qua iframe và object-fit, nhưng đang bóc file trực tiếp từ disk qua API `/api/documents/[id]/download`.
- **RBAC hiện tại**: Front-end đã ẩn action thông qua `capabilities`, nhưng Backend xoá/sửa file vẫn phụ thuộc lỏng lẻo vào `canManageProjects(session)` thay vì check Quyền sở hữu (Ownership) sâu.
- **Rủi ro**: 
  1. Ephemeral Storage: Mất dữ liệu khi redeploy.
  2. Memory Limit: API Route Next.js sẽ crash nếu upload file quá lớn.
  3. Security: Bypass extension (Đổi file `.exe` thành `.pdf` vẫn có thể lọt qua).

## 3. Phase B Metadata Design
Để chuyển đổi từ "Kho chứa file" thành "Hồ sơ công trình", cần cập nhật schema Prisma (yêu cầu Migration):

- **Field đề xuất thêm vào `Document`**:
  - `status` (Enum DocumentStatus: DRAFT, SUBMITTED, APPROVED, REJECTED, SUPERSEDED): Cần ngay cho luồng duyệt.
  - `documentType` (String): Xác định Hợp đồng phụ / Biên bản / Bản vẽ Shop...
  - `metadata` (Json?): Lưu trữ linh hoạt (ví dụ: Số hóa đơn, Tọa độ GPS).
  - `isLatest` (Boolean) & `versionGroupId` (String): Cần ngay cho Bản vẽ để quản lý Revision.
  - `supersedesDocumentId` (String?): File này thay thế cho file nào trước đó.
  - `fileHash` (String): Bắt buộc để chống file trùng lặp và verify toàn vẹn.
  - `reviewedById` & `reviewedAt` (DateTime?): Lưu vết kiểm duyệt.
- **Index đề xuất**: `@@index([versionGroupId])`, `@@index([status])`.
- **Migration Impact**: Sẽ làm thay đổi cấu trúc DB. 
- **Backward Compatibility**: Các file hiện tại sẽ mặc định `status = APPROVED` (hoặc `SUBMITTED`) và `isLatest = true`.

## 4. Folder-specific Metadata & Workflow
- **01. Hợp đồng**: 
  - *Metadata*: Số hợp đồng, Bên B, Ngày ký, Giá trị.
  - *Action*: Cảnh báo hết hạn. (Làm sau).
- **02. Bản vẽ**: 
  - *Workflow*: Liên tục update revision. Rất cần `isLatest` và `supersedesDocumentId`.
  - *Làm ngay*: Versioning.
- **03. Dự toán**: 
  - *Liên kết*: Cần connect ID với WBS. (Làm sau).
- **04. Nghiệm thu**: 
  - *Status*: Cần luồng Ký duyệt (APPROVED/REJECTED).
- **05. Hóa đơn**: 
  - *Metadata*: Số hóa đơn, Mã số thuế, VAT. (Làm sau: Parse XML tự động).
- **06. Thanh toán**: 
  - *Liên kết*: Connect tới chứng từ hợp đồng.
- **07. Hình ảnh hiện trường**: 
  - *Metadata*: Bóc tách tự động tọa độ GPS và Thời gian chụp từ EXIF. (Làm ngay).
- **08. Báo cáo ngày**: 
  - *Workflow*: Tích hợp hệ thống Report có sẵn.

## 5. Folder-level RBAC Design
- **Role/Action Matrix**:
  - `DIRECTOR / PM`: View tất cả, Xóa/Sửa bất cứ file nào (Full quyền).
  - `ENGINEER`: View tất cả. Chỉ được Upload vào (Bản vẽ, Nghiệm thu, Hình ảnh). Xóa file *của chính mình*.
  - `ACCOUNTANT`: Chỉ Upload vào (Hóa đơn, Thanh toán, Hợp đồng). Không được xóa file đã Approved.
  - `VIEWER`: Chỉ View/Download (có Watermark nếu làm được).
- **Backend Guard Helpers**:
  - `canDeleteDocument(session, documentId)`: Phải check `document.uploadedById === session.id` nếu không phải là PM.
  - `canApproveDocument(session, folderId)`: Phải có quyền duyệt tùy folder.
- **API cần sửa**: Sửa lại toàn bộ các route POST/DELETE để wrap logic check quyền này.

## 6. Phase C Object Storage Design
- **Chọn Storage**:
  - Nếu Cloud/SaaS: **AWS S3** hoặc **Cloudflare R2** (R2 rẻ hơn cho băng thông Egress).
  - Nếu On-premise (Máy chủ công ty): **MinIO** (Tương thích 100% S3 API).
- **Object Key Design**: Tuyệt đối không dùng tên file gốc làm path.
  - *Chuẩn*: `projects/{projectId}/docs/{folderId}/{documentId}_{randomhash}{ext}`
- **Upload Flow (Khuyến nghị)**:
  - Bỏ luồng truyền Buffer qua Next.js API.
  - Thay bằng **Presigned URL**: Frontend xin API một URL ngắn hạn -> Frontend `PUT` trực tiếp file lên S3. Giải phóng hoàn toàn RAM/Băng thông cho Server Next.js.
- **Download/Preview Flow**:
  - Trả về S3 Presigned URL có tuổi thọ 5 phút (tránh lộ link vĩnh viễn).
- **Migration Local -> Object Storage**:
  - Quét thư mục `/storage/`.
  - Push lên S3.
  - Update `storagePath` trong DB bằng Script, thêm cột `storageProvider = 'S3'`.
- **Backup/Restore**: Tận dụng S3 Versioning và S3 Lifecycle rules.

## 7. Security & Compliance Hardening
- **Magic-byte validation**: API sẽ đọc 4-8 bytes đầu tiên (Hex signature) của file để xác nhận nó thực sự là PDF (bắt đầu bằng `%PDF`) hay JPG (bắt đầu bằng `FF D8`), loại bỏ rủi ro user đổi đuôi file độc hại.
- **Virus scan**: Tích hợp luồng Async gửi sự kiện cho ClamAV. File vừa upload sẽ ở trạng thái `SCANNING`, không cho download cho đến khi an toàn.
- **Audit view/download**: DB cần có bảng `DocumentAudit` để ghi nhận ai đã xem/tải file lúc nào (Quan trọng cho bảo mật bản vẽ).
- **Rate limit**: Giới hạn 20 request upload / 1 phút / 1 IP để chống DDOS Storage.
- **Storage leak prevention**: `S3 Bucket` hoàn toàn Private, chặn `Public Access`.

## 8. Decision Matrix: Phase B vs Phase C

| Tiêu chí | Phase B (Metadata/RBAC) | Phase C (S3/MinIO) |
| --- | --- | --- |
| **Giá trị cho UAT** | Cực Cao (Nghiệp vụ rõ ràng) | Không đổi (Ẩn dưới hạ tầng) |
| **Giá trị Production** | Trung bình | **Bắt buộc / Cốt lõi** |
| **Độ khó** | Trung bình (Sửa DB, UI) | Cao (DevOps, AWS SDK) |
| **Rủi ro** | Thấp | Cao (Gãy luồng đọc/ghi nếu sai) |
| **Có Migration DB?** | CÓ (Schema update) | CÓ (Data + Schema nhẹ) |
| **Ảnh hưởng dữ liệu cũ**| Có (Thiếu metadata) | Có (Phải chuyển file vật lý) |
| **Có nên làm ngay?** | KHÔNG | **CÓ** |
| **Điều kiện tiên quyết** | Hạ tầng storage phải ổn định | Setup Bucket S3 / MinIO |

**Khuyến nghị**: **Làm Phase C trước**.

## 9. Recommended Implementation Plan

1. **Phase C1 — S3/MinIO Abstraction & Migration**
   - *Mục tiêu*: Chuyển đổi an toàn local filesystem sang Object Storage.
   - *Thay đổi*: Cài `@aws-sdk/client-s3`. Sửa API upload/download sang Presigned URL.
   - *Rủi ro*: Mất kết nối DB vs File thực tế.
   - *Rollback*: Tắt cờ `USE_S3`, quay lại dùng folder local.
2. **Phase C2 — Security Hardening**
   - *Mục tiêu*: Magic-byte validation, Rate Limit, Ownership check Backend.
3. **Phase B1 — Metadata Nền tảng & Versioning**
   - *Mục tiêu*: Thêm `status`, `isLatest`, `fileHash` vào Prisma Schema. Hiển thị UI Document Detail mở rộng.
   - *Migration*: Bắt đầu chạm vào schema.
4. **Phase B2 — Workflow & Folder RBAC**
   - *Mục tiêu*: Xây luồng duyệt tài liệu (Nghiệm thu, Bản vẽ), phân quyền theo Role/Folder.

## 10. Definition of Done
- **Phase C1/C2 (Xong khi)**: Mọi thao tác upload, view, download hoàn toàn đi qua S3. Thư mục `/storage` local trống rỗng. Lệnh lấy Presigned URL chạy dưới 200ms. Thử upload file `.exe` giả đuôi bị chặn thành công.
- **Phase B1 (Xong khi)**: Bấm vào file sẽ hiện bảng Metadata, cho phép update trạng thái file. File upload lên trùng hash bị từ chối.
- **Phase B2 (Xong khi)**: User Staff upload không hiện nút "Xóa", User Manager có thể Approve tài liệu Nghiệm thu.

## 11. Final Recommendation
- **Làm gì tiếp theo**: Bắt tay ngay vào **Phase C1 (S3/MinIO Storage)**. Đây là blocker lớn nhất ngăn dự án Go-live Production.
- **Không nên làm gì ngay**: Không đụng vào Prisma Schema, không làm tính năng duyệt file (Phase B) lúc này, vì nếu làm, hệ thống file sẽ sinh ra rất nhiều, gây lãng phí công sức làm Migration Tool từ Disk sang S3 sau này.
- **Điều kiện trước khi code Phase C**: Đội DevOps / Admin cần cung cấp thông tin kết nối AWS S3 (hoặc Cloudflare R2 / Server MinIO): `ACCESS_KEY`, `SECRET_KEY`, `BUCKET_NAME`, `REGION`.
- **Điều kiện trước khi Production**: Bắt buộc Phase C1 và C2 phải hoàn tất. Tuyệt đối không xách local filesystem này deploy lên Vercel.
