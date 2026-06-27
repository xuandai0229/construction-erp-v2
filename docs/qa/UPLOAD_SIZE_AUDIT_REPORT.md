# Báo Cáo: Gỡ Bỏ Giới Hạn Dung Lượng Upload & Kiểm Tra Hệ Thống

**Ngày thực hiện:** 26/06/2026

Báo cáo này trình bày chi tiết quá trình kiểm tra (audit) và loại bỏ các giới hạn dung lượng file upload dạng hardcode trên toàn bộ hệ thống ERP, nhằm đáp ứng yêu cầu thực tế về lưu trữ file lớn (bản vẽ CAD, hồ sơ nghiệm thu, hình ảnh/video hiện trường).

---

## 1. Kết Quả Quét Code (Audit)

Tôi đã tiến hành rà soát toàn diện codebase (bao gồm frontend, backend API, server actions, validation schema, constants, settings, database schema) với các từ khóa liên quan như `maxSize`, `maxFileSize`, `uploadLimit`, `MB`, `MiB`, `Dung lượng tối đa`, v.v.

### 📋 Danh sách file đã kiểm tra
*   `src/lib/settings/settings-validation.ts` (Zod Schema & Defaults)
*   `src/lib/documents/validation.ts` (Upload Policy)
*   `src/components/settings/settings-workspace.tsx` (UI Settings)
*   `src/app/api/reports/[reportId]/attachments/route.ts` (API Báo cáo hiện trường)
*   `src/components/documents/document-manager.tsx` (UI Quản lý tài liệu)
*   `src/components/reports/create-report-dialog.tsx` (UI Upload Báo cáo)
*   `src/app/api/documents/upload/route.ts` (API Quản lý tài liệu)
*   `scripts/qa-document-upload-settings.ts` (Test script)
*   `src/components/contracts/contract-form-dialog.tsx`
*   `prisma/schema.prisma`

---

## 2. Các Giới Hạn Đã Tìm Thấy Và Gỡ Bỏ

### 🛠️ Danh sách file đã sửa:

1.  **`src/lib/settings/settings-validation.ts`**
    *   **Tìm thấy:** `maxUploadSizeMb: z.number().int().min(1).max(500)` và cấu hình mặc định là `80MB`.
    *   **Hành động:** Đã xóa hoàn toàn thuộc tính `maxUploadSizeMb` khỏi schema cài đặt hệ thống.
2.  **`src/lib/documents/validation.ts`**
    *   **Tìm thấy:** Kiểm tra chặn file theo `maxUploadSizeMb` từ DB.
    *   **Hành động:** Đã loại bỏ logic kiểm tra `size` và các thông báo lỗi "Tệp tin vượt quá giới hạn...".
3.  **`src/components/settings/settings-workspace.tsx`**
    *   **Tìm thấy:** Form nhập "Dung lượng tối đa (MB)" trong phần Cài đặt Tài liệu.
    *   **Hành động:** Đã xóa UI form input này.
4.  **`src/app/api/reports/[reportId]/attachments/route.ts`**
    *   **Tìm thấy:** Các hằng số hardcode `MAX_PHOTO_SIZE = 10MB`, `MAX_FILE_SIZE = 20MB`, và `TOTAL_UPLOAD_LIMIT_BYTES = 50MB`.
    *   **Hành động:** Đã loại bỏ hoàn toàn các hằng số này và bỏ các lệnh `if` kiểm tra chặn request. (Vẫn giữ lại kiểm tra file rỗng/0 byte).
5.  **`src/components/documents/document-manager.tsx`**
    *   **Tìm thấy:** Lệnh `if (file.size > 50 * 1024 * 1024)` chặn file 50MB trên UI hiển thị Toast lỗi.
    *   **Hành động:** Đã xóa logic chặn.
6.  **`src/components/reports/create-report-dialog.tsx`**
    *   **Tìm thấy:** Chặn upload ảnh >10MB và tài liệu >20MB ngay khi người dùng chọn file trên máy tính.
    *   **Hành động:** Đã xóa logic chặn trên UI. Vẫn giữ kiểm tra file rỗng.
7.  **`scripts/qa-document-upload-settings.ts`**
    *   **Tìm thấy:** Test case kiểm tra file bị chặn khi dung lượng >1MB.
    *   **Hành động:** Đã xóa test case này, đảm bảo `npm run build` không bị lỗi.
8.  **`src/app/api/documents/upload/route.ts`**
    *   **Hành động:** Đã khắc phục lỗi cú pháp tồn tại trước đó do có một khối code bị xóa không cẩn thận từ thao tác chỉnh sửa trước, khôi phục lại cách lấy `originalName` và `extension`.

---

## 3. Các Tính Năng Bảo Mật Vẫn Được Giữ Nguyên
Quá trình gỡ bỏ kích thước upload không làm ảnh hưởng đến:
*   **Bảo mật:** Hệ thống vẫn kiểm tra magic-byte, chặn các đuôi file nguy hiểm (`.exe`, `.bat`, `.vbs`, ...).
*   **Phân quyền (RBAC):** Vẫn kiểm tra chặt chẽ session (`getSession`), quyền vào project (`canAccessProject`) và quyền trên thư mục (`canUploadToFolder`).
*   **Toàn vẹn hệ thống:** Vẫn chặn path traversal (tên file chứa `../` hoặc ký tự lạ), vẫn validate các meta-data bắt buộc.

---

## 4. Kiểm Tra Database Schema & Rủi Ro Kỹ Thuật

*   **Database:** Trường `size` trong bảng `Document` và `SiteReportAttachment` hiện đang sử dụng kiểu `Int`.
    *   *Đánh giá:* Kiểu `Int` trong PostgreSQL (INT4) có giới hạn khoảng `2.14GB`. Đây là một giới hạn lớn, phù hợp với hầu hết các file công trình hiện tại. Nếu đổi sang `BigInt` (cho file > 2GB) sẽ gặp lỗi lớn về JSON serialization (`TypeError: Do not know how to serialize a BigInt`) trên toàn hệ thống vì Next.js mặc định không parse BigInt qua API Responses.
    *   *Quyết định:* Tạm thời giữ nguyên `Int`. Đây là giới hạn "thực tế hạ tầng (2GB)", không phải giới hạn nghiệp vụ.
*   **Giới hạn Body Payload của Next.js:** Hiện tại file vẫn đang stream qua Server Next.js bằng `req.formData()`. Next.js/Vercel hoặc Nginx/Proxy phía trước có thể tự động ngắt kết nối với lỗi `413 Payload Too Large` nếu file quá lớn (thường là >50MB trên Serverless hoặc >100MB qua Cloudflare).

---

## 5. Kết Quả Test/Build

*   ✅ Lệnh `npx tsc --noEmit` hoàn tất thành công không lỗi.
*   ✅ Lệnh `npx prisma validate` hoàn tất thành công.
*   ✅ Lệnh `npx tsx scripts/qa-document-upload-settings.ts` Pass tất cả (đã bỏ test case dung lượng).
*   ✅ Lệnh `npm run build` chạy thành công (Exit code: 0).
*   Không chạy lệnh `npm run dev` theo yêu cầu.

---

## 6. Khuyến Nghị Tiếp Theo Cho Hạ Tầng (Để upload file RẤT lớn)

Do hiện tại file vẫn đi qua trung gian là Next.js Server (Buffering in memory hoặc temp files), nên để mở rộng lên file nhiều GB, hệ thống nên cân nhắc:

1.  **Presigned URLs (Direct Upload):** Trả về 1 URL tạm thời từ S3/R2/MinIO để Frontend tự push thẳng file lên Storage. Backend Next.js sẽ không bị nghẽn băng thông và không bị quá tải RAM (Body parser).
2.  **Multipart Upload:** Cho phép client (trình duyệt) chia nhỏ file CAD, Video thành nhiều chunk 5MB-10MB và gửi tuần tự hoặc song song.
3.  **Resumable Upload:** Lưu trữ trạng thái upload vào LocalStorage, nếu đứt mạng có thể bấm upload tiếp mà không cần tải lại từ đầu.

---

*Lưu ý: Không thực hiện lệnh `git commit` hay `git push` theo đúng yêu cầu.*
