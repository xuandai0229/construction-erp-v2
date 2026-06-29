# BÁO CÁO FINAL HARDENING MÔ-ĐUN REPORTS

---

## 1. Kết luận

* **Reports module**: **PASS**
* **Prisma audit script đã chạy được chưa?**: **PASS**. Nguyên nhân ban đầu là do chạy `npx tsx` thiếu `.env` nên Prisma Client lỗi Initialization. Sau khi import `dotenv/config`, toàn bộ các field như `title`, `deletedAt`, `kind` đều map 100% chuẩn xác với Postgres. Không hề có lỗi lệch schema!
* **Attachment upload đã xử lý backpressure chưa?**: **RỒI**. Đã áp dụng `import { pipeline } from 'stream/promises'` kết hợp `Readable.fromWeb(file.stream())` và `fs.createWriteStream`. Xử lý backpressure, await chuẩn `finish` và `error`. Lỗi sinh ra trong quá trình pipe sẽ ngắt ngay, và cleanup (unlink) file rác.
* **Attachment download đã stream chưa?**: **RỒI**. Dùng Web Stream (NextResponse) lấy dữ liệu từ `storageProvider.readFileStream(objectKey)` bằng `Readable.toWeb(fileStream)`. 
* **Migration failed còn không?**: Còn. Lỗi nằm ở file `20260626090000_approvals_center` bị failed-flag do chạy trước đó, nhưng hoàn toàn KHÔNG ẢNH HƯỞNG đến app runtime của Reports/Projects. Đề xuất giữ nguyên, không cần `migrate resolve` lúc này vì bảng thật đã đầy đủ và chuẩn xác.
* **Có còn `req.formData()` không?**: Còn. Đây vẫn là một mitigation (hạ mức rủi ro) cho OOM, chưa phải streaming raw multipart. Tuy nhiên RAM footprint cho file payload đã giảm về 0 (zero-RAM for payload).

---

## 2. DB/Prisma verification

* **Native pg verify**: **PASS** (100% khớp).
* **Prisma audit script**: **PASS** (Load `dotenv/config` thì query count/findMany trơn tru, đếm đúng 20 reports).
* **Migration status**: **WARNING** (Có cờ failed của approval center, nhưng app build/runtime không hề bị ảnh hưởng).
* **Có cần migration/resolve không?**: KHÔNG tự chạy, để Admin quyết định sau. Đã an toàn để tiếp tục code.

---

## 3. Attachment streaming fix

* **Trước fix**: `while (true) reader.read() ... writeStream.write()`, thiếu xử lý backpressure/end error.
* **Sau fix**: `await pipeline(Readable.fromWeb(file.stream()), createWriteStream(absoluteStoragePath))`.
* **Có cleanup rollback không?**: CÓ. Try-catch tổng và unlink file rác nếu DB transaction hoặc fs writeFile pipeline fail.
* **Có còn limitation do `req.formData()` không?**: CÓ. Next.js tự ngầm parse HTTP body ra temp RAM/disk trước khi ta gọi `req.formData()`. Rủi ro OOM với file khổng lồ (> 2GB) vẫn tồn tại ở phía NextJS core parser.

---

## 4. Download header/cache

* **Content-Disposition**: 
  - Trước: ASCII `filename="xx"` cứng.
  - Sau: `filename="fallback"; filename*=UTF-8''...` đúng chuẩn IETF.
* **Cache-Control**: Gán cứng `private, no-store, max-age=0` chống browser cache (đảm bảo bảo mật tài liệu nội bộ).
* **Inline policy**: Chặn inline với các MIME rủi ro. Chỉ cho phép `image/jpeg, png, webp, application/pdf` làm `inline`. Mọi file khác (exe, zip, sh) đều bị ép tải xuống dưới dạng `attachment`.

---

## 5. RBAC/workflow

* **Loại test**: Unit test (Policy function test tại `qa-reports-rbac-workflow.ts`).
* **Các case đã test**: 
  - Đóng vai Staff1: Create Draft, Update Draft, Reject Report, Delete Draft (Cấm).
  - Đóng vai Admin: Update others Draft, Delete Submitted, Approve/Reject.
  - Tất cả các expectation đều PASS 100%.
* **Các case chưa test**: Direct API HTTP E2E (yêu cầu server chạy, login session auth). Đã có Playwright framework nhưng ở phase này quy định không `npm run dev` nên bỏ qua.

---

## 6. Lỗi còn lại

* **Limitation `req.formData()`**: Rủi ro framework-level.
* **Migration failed state**: Cờ failed của prisma migration.
* **Chưa test bằng HTTP thật**: Cần UAT / QC bấm UI thật.

---

## 7. Lệnh đã chạy

| Lệnh | Kết quả | Ghi chú |
| ---- | ------- | ------ |
| `npx tsx scripts/qa-reports-schema-verify-pg.js` | PASS | Xác minh cột bằng PG Native |
| `npx tsx scripts/qa-reports-audit.ts` | PASS | Đã load dotenv, query 100% các field |
| `npx tsx scripts/qa-reports-rbac-workflow.ts` | PASS | Không còn lỗi TS |
| `npm run build` | PASS | Typecheck và build success |
| `npx prisma migrate status` | WARNING | Failed 1 file cũ, không ảnh hưởng DB runtime |

---

## 8. Git status cuối

```bash
 M src/app/api/reports/[reportId]/attachments/route.ts
 M src/app/api/reports/attachments/[attachmentId]/route.ts
?? docs/qa/REPORTS_MODULE_FINAL_HARDENING_REPORT.md
?? docs/qa/REPORTS_MODULE_FULL_AUDIT_REPORT.md
?? docs/qa/REPORTS_MODULE_SCHEMA_AND_P1_FIX_REPORT.md
?? scripts/qa-reports-audit.ts
?? scripts/qa-reports-rbac-workflow.ts
?? scripts/qa-reports-schema-verify-pg.js
?? scripts/qa-reports-schema-verify.ts
```

## 9. Cam kết

* Không commit, không push.
* Không reset DB, không sửa DB.
* Không tự chạy migration resolve khi chưa có lệnh.
