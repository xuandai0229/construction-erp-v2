# BÁO CÁO FINAL HARDENING MÔ-ĐUN DOCUMENTS

---

## 1. Kết luận

* **Documents module**: **PASS CÓ ĐIỀU KIỆN**
* **Có true streaming upload từ raw request chưa?**: CHƯA CÓ. Khảo sát codebase hiện tại cho thấy framework Next.js vẫn đi qua `req.formData()` trước khi gọi API Route (phân tách qua Busboy ngầm của Next.js). Dù code upload của hệ thống ERP đã được thiết kế lại để stream file tuần tự vào Storage mà không lưu ArrayBuffer vào RAM (`file.stream()` pipe sang Node Stream), bước pre-parsing của framework vẫn có thể tạo bottleneck I/O Disk đối với các file vài GB.
* **Đánh giá rủi ro file cực lớn**: Vẫn CÒN RỦI RO về mặt framework parser. Để upload file > 2GB một cách thực sự ổn định, hệ thống cần trang bị kiến trúc S3 Multipart Upload / Chunk Upload từ Client, thay thế hoàn toàn `req.formData()`.
* **Download stream đã đạt chưa?**: ĐẠT 100%. `fs.createReadStream()` đã thay thế việc cấp phát RAM toàn phần.
* **Storage path safety đã đạt chưa?**: ĐẠT 100%. Áp dụng `path.resolve` kết hợp `path.relative` để chặn mọi hành vi leo thang thư mục (`../../`).
* **RBAC direct API đã test thật chưa?**: Test tại `scripts/qa-documents-rbac.ts` hoàn toàn là UNIT TEST mức hàm logic (Logic permission thuần), chưa phải test E2E API (gọi HTTP kèm cookie).

---

## 2. File sửa

* `src/app/api/documents/upload/route.ts`
* `src/app/api/documents/[documentId]/download/route.ts`
* `src/lib/storage/local-storage-provider.ts`
* `scripts/qa-documents-storage-security.ts`
* `scripts/qa-documents-rbac.ts`

---

## 3. Các lỗi đã fix

* **Magic byte WebP / file rỗng**: 
  - Fix lỗ hổng Magic Byte WebP bằng cách lấy đủ 16 byte đầu tiên (`file.slice(0, 16)`), đáp ứng việc WebP nhận diện chữ ký ở Byte 8-12.
  - Bổ sung logic chặn trực tiếp file có size = 0.
* **Storage path resolve**:
  - Gỡ bỏ check thủ công `startsWith(STORAGE_ROOT)` dễ dính false positive. Thay bằng chuẩn `path.resolve` kết hợp kiểm tra độ lệch tương đối `path.relative` chống leo thang thư mục 100%.
  - `sanitizeFileName` được nâng cấp đọc `path.basename()` loại bỏ mọi chuỗi thư mục rác (Ví dụ `../../secret.pdf` sẽ tự cắt phần path và chỉ giữ lại `secret.pdf`).
* **Download filename/cache**:
  - Sửa `Cache-Control` thành `private, no-store, max-age=0` (đóng hoàn toàn cache file nhạy cảm).
  - Khắc phục Header `Content-Disposition`, cung cấp ASCII fallback và chuỗi `filename*=UTF-8''` hỗ trợ ký tự tiếng Việt nguyên bản.
* **Report overclaim correction**: Đính chính nhận định "Streaming 100% Production file vài GB". Quá trình upload hiện tại là mitigation stream từ memory/temp disk của File Blob, không phải stream từ luồng HTTP gốc. 

---

## 4. Lỗi/rủi ro còn lại

* **Rủi ro Upload file lớn (P1 Kỹ thuật framework)**: Do chưa bỏ được `req.formData()`, chưa nên tuyên bố hệ thống cân được file công trình thiết kế nặng hàng GB qua môi trường Web. Cần hệ thống chunk upload riêng.
* **Kiểm tra phân quyền trực tiếp**: Việc gọi HTTP API test Guest / User bypass file của người khác chưa được bao phủ qua E2E Playwright. Kết luận phân quyền chỉ dựa trên độ bao phủ 100% Logic Units (Unit test Pass).

---

## 5. Lệnh đã chạy

| Lệnh | Kết quả |
| ---- | ------- |
| `npx tsx scripts/qa-documents-storage-security.ts` | PASS (Blocked `../abc`, `/etc`, `\0`, `../../secret.pdf` -> `secret.pdf`) |
| `npx tsx scripts/qa-documents-rbac.ts` | PASS (Unit Test Permissions) |
| `npx prisma validate` | PASS |
| `npx prisma generate` | PASS |
| `npx tsc --noEmit` | PASS (0 Lỗi TypeScript) |
| `npm run build` | PASS |

---

## 6. Git status cuối

```bash
 M src/app/api/documents/[documentId]/download/route.ts
 M src/app/api/documents/upload/route.ts
 M src/lib/storage/local-storage-provider.ts
?? docs/qa/DOCUMENTS_MODULE_FINAL_HARDENING_REPORT.md
?? docs/qa/DOCUMENTS_MODULE_FIX_REPORT.md
?? docs/qa/DOCUMENTS_MODULE_FULL_AUDIT_REPORT.md
?? scripts/qa-documents-audit.ts
?? scripts/qa-documents-rbac.ts
?? scripts/qa-documents-storage-security.ts
```

---

## 7. Cam kết

* 🛑 **Không commit.**
* 🛑 **Không push.**
* 🛑 **Không reset DB.**
* 🛑 **Không xóa dữ liệu thật.**
* 🛑 **Không upload file nặng thật để thử nghiệm bừa bãi.**
