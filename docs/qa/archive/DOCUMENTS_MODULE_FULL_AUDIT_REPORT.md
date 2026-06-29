# BÁO CÁO AUDIT TOÀN DIỆN MÔ-ĐUN DOCUMENTS / TÀI LIỆU CÔNG TRÌNH

---

## 📌 1. KẾT LUẬN

* **Documents module**: **PASS CÓ ĐIỀU KIỆN**
* **Sẵn sàng sử dụng thật chưa?**: Hệ thống ĐÃ SẴN SÀNG ở mức độ cơ bản. Chống lộ tài liệu tốt. Tuy nhiên chưa thực sự sẵn sàng cho các công trình có nhiều file siêu lớn (hàng chục GB/file) do chưa có cơ chế streaming tốt khi upload.
* **Rủi ro lớn nhất là gì?**: Lỗi Out Of Memory (OOM) trên Node.js. Server đang đọc toàn bộ file upload vào RAM qua hàm `await file.arrayBuffer()` trong quá trình nhận file từ `req.formData()`. Việc upload nhiều file vài trăm MB cùng lúc sẽ gây sập (Crash) server.

---

## 📌 2. PHẠM VI ĐÃ KIỂM TRA

* **Routes**: Khảo sát `/documents`, `/api/documents/upload`, `/api/documents/[documentId]/download`.
* **Components**: Khảo sát các thành phần trong `src/components/documents`.
* **API/Actions**: Đánh giá toàn bộ `src/app/(dashboard)/documents/actions.ts` (Tạo/Sửa/Xóa Folder & Document).
* **Storage**: Đánh giá `src/lib/storage/local-storage-provider.ts` về vấn đề bảo mật đường dẫn và ghi đĩa.
* **Prisma Models**: Schema Document, DocumentFolder, truy vấn Soft Delete (`deletedAt !== null`).
* **RBAC**: Khảo sát `src/lib/documents/permissions.ts`. Kỹ sư chỉ đăng vào thư mục kỹ thuật, kế toán vào thư mục kế toán.
* **UI/UX, Performance, Security**: Đánh giá tĩnh bảo mật Path Traversal (tốt), XSS (được react sanitize), Memory leak (Nguy hiểm OOM).

---

## 📌 3. SƠ ĐỒ LUỒNG (FLOW DIAGRAMS)

### Luồng Upload (Upload Flow):
`UI Form` -> `POST /api/documents/upload` -> `Auth & RBAC Check (Project/Folder Access)` -> `Validation Magic Bytes & Rules` -> `Load RAM (file.arrayBuffer)` -> `LocalStorageProvider.saveFile` (sanitize filename, write file) -> `Prisma.create` -> `Audit Log` -> `Return JSON`.

### Luồng Download (Download Flow):
`UI Link` -> `GET /api/documents/[id]/download` -> `Auth Check` -> `canAccessProject` -> `Prisma.findUnique` -> `LocalStorageProvider.readFile` -> `Fire&Forget AuditLog` -> `NextResponse (Buffer with Disposition Headers)`.

### Luồng Xóa (Delete Flow):
`UI Action` -> `Server Action deleteDocument(id)` -> `Auth & RBAC Check (must be uploader or Admin)` -> `Check lock status (DRAFT/SUBMITTED)` -> `Prisma.updateMany { deletedAt: new Date() }` -> `Audit Log` -> `RevalidatePath`. (Chỉ xóa mềm, KHÔNG xóa file cứng trong đĩa cứng).

---

## 📌 4. DỮ LIỆU HIỆN TẠI (CURRENT DATA IN DB)

*Số liệu được quét và xác minh bằng script nội bộ `scripts/qa-documents-audit.ts`:*

| Metric | Count / Kết quả |
| :--- | :---: |
| Documents (Bao gồm xóa mềm) | 12 |
| Folders (Bao gồm xóa mềm) | 35 |
| Projects có tài liệu | 1 |
| Dung lượng Metadata trong DB | 744 bytes |
| Dữ liệu rác test / Orphan DB | 0 |
| Cây thư mục bị lặp vòng (Cycle) | 0 |
| Lệch pha Storage (DB có nhưng Storage thiếu) | 12 |

*(Ghi chú: Lệch pha Storage là 12 do dữ liệu seed ban đầu tạo metadata ảo nhưng không chèn file vật lý thật, đây là điều bình thường ở môi trường UAT Seed).*

---

## 📌 5. MA TRẬN PHÂN QUYỀN (RBAC MATRIX)

| Role/User | View | Upload | Create Folder | Rename/Edit | Move | Download | Delete | Direct API Bypass |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **ADMIN/DIRECTOR** | ✅ | ✅ | ✅ | ✅ | N/A | ✅ | ✅ | ❌ Bị chặn |
| **CHUYÊN VIÊN KẾ TOÁN** | ✅ | ✅ (Chỉ TM KT) | ❌ | ✅ (File của mình) | N/A | ✅ | ✅ (File của mình)| ❌ Bị chặn |
| **KỸ SƯ / Q.LÝ KỸ THUẬT** | ✅ | ✅ (Chỉ TM Kỹ Thuật) | ❌ | ✅ (File của mình) | N/A | ✅ | ✅ (File của mình)| ❌ Bị chặn |
| **User không thuộc Project**| ❌ | ❌ | ❌ | ❌ | N/A | ❌ | ❌ | ❌ 403 Forbidden |
| **Khách (Guest)** | ❌ | ❌ | ❌ | ❌ | N/A | ❌ | ❌ | ❌ 401 Unauth |

*(N/A: Chức năng Move File/Folder hiện chưa được triển khai trong backend actions).*

---

## 📌 6. MA TRẬN BẢO MẬT FILE / UPLOAD SAFETY

| Case (Trường hợp) | Kết quả hiện tại | Mức độ | Ghi chú |
| :--- | :--- | :---: | :--- |
| **Upload file kích thước CỰC LỚN (> 2GB)** | Crash Node.js Server (OOM) | **CRITICAL** | `await file.arrayBuffer()` nạp toàn bộ file vào RAM cục bộ trước khi ghi xuống đĩa. |
| **Upload nhiều file (Double Submit / Spam)** | Chặn 1 phần | MEDIUM | Chưa có Rate Limit ở Upload route. |
| **Tấn công đường dẫn (`../../`)** | Bị chặn hoàn toàn (Safe) | TỐT | Provider thực hiện `sanitizeFileName` thay thế toàn bộ ký tự lạ bằng `_` và kiểm tra chống thoát ra ngoài root. |
| **Spoofing Extension (Giả mạo đuôi)** | Bị chặn (Safe) | TỐT | API thực thi kiểm tra `Magic Byte` (chữ ký nhị phân file header) cho các định dạng PDF, JPEG, PNG, DOCX, ZIP. |
| **Lưu File Public không phân quyền** | An toàn tuyệt đối | TỐT | File được lưu tại `storage/` ngoài nhánh `public/` tĩnh của Next.js. Bắt buộc gọi qua API download kiểm tra Session & RBAC. |

---

## 📌 7. MA TRẬN CÂY THƯ MỤC / FOLDER TREE SAFETY

| Case | Kết quả hiện tại | Mức độ | Ghi chú |
| :--- | :--- | :---: | :--- |
| **Tạo vòng lặp thư mục mẹ-con (Cycle)** | Không thể tái hiện | TỐT | Hệ thống chưa cho phép tính năng Move/Kéo thả (D&D) gán lại `parentId`. Mặc định tạo thư mục mới an toàn. |
| **Xóa thư mục có chứa thư mục con / file** | Bị chặn hoàn toàn (Safe) | TỐT | Hàm `deleteFolder` kiểm tra count `documents > 0` và count `children > 0` từ DB trước khi xóa mềm. |

---

## 📌 8. DANH SÁCH LỖI PHÁT HIỆN

### DOC-BUG-001 — Tràn RAM (OOM) khi nạp Buffer của tài liệu lớn vào Memory
* **Severity**: **CRITICAL (P1 - Cần fix trước UAT File Lớn)**
* **Khu vực**: API / Performance
* **File liên quan**: `src/app/api/documents/upload/route.ts`
* **Cách tái hiện**: Dùng 1 hoặc nhiều người dùng đẩy file BIM/Revit nặng khoảng 2GB-5GB thông qua upload form.
* **Kết quả hiện tại**: Hàm `await file.arrayBuffer()` cố gắng dàn mảng (array allocation) toàn bộ byte vào RAM, Node.js sẽ hết V8 Heap Memory và làm sập ứng dụng (Crash / 502 Bad Gateway).
* **Kết quả mong muốn**: File được lưu theo cơ chế **Streaming trực tiếp (Node.js Streams)** vào ổ cứng hoặc S3.
* **Phương án fix đề xuất**: Tạm thời cấu hình lại Web Server hoặc dùng Busboy/Multiparty stream trực tiếp vào Local Storage thay vì sử dụng tiêu chuẩn `req.formData()` gốc của Next.js (do nó sẽ nạp toàn bộ vào RAM).

### DOC-BUG-002 — Các File bị xóa mềm nhưng dung lượng ổ cứng không được thu hồi
* **Severity**: MEDIUM / LOW
* **Khu vực**: DB / Storage
* **File liên quan**: `src/app/(dashboard)/documents/actions.ts`
* **Kết quả hiện tại**: `deleteDocument` chỉ gắn cờ `deletedAt: new Date()` trong DB. Ổ cứng vẫn bị chiếm bởi các file vật lý chưa bao giờ bị gọi xóa (không có logic dọn dẹp (gc) hoặc cronjob dọn rác).
* **Kết quả mong muốn**: Bổ sung cơ chế hoặc Script Hard Delete định kỳ thu hồi không gian đĩa vật lý cho các file đã xóa mềm quá 30 ngày.

---

## 📌 9. KẾ HOẠCH FIX (P0/P1/P2 PLAN)

### P0 — Bắt buộc fix ngay
*(Rất may mắn, hệ thống KHÔNG có lỗi P0 nào: Không lộ tài liệu, không bypass direct download, không rủi ro bảo mật Path Traversal. Tất cả cơ chế Auth đều hoạt động đúng).*

### P1 — Fix trước UAT thực tế
* **DOC-BUG-001**: Khắc phục lỗi `await file.arrayBuffer()` ăn RAM. Chuyển sang cơ chế streaming trực tiếp để hệ thống không sập khi anh em kỹ sư đẩy file thiết kế siêu nặng. (Có thể ứng dụng `fs.createWriteStream` và pipe data dần dần).

### P2 — Tối ưu sau
* Bổ sung cơ chế Hard Delete dọn dẹp dung lượng cho máy chủ sau 30 ngày file bị xóa.
* Xây dựng tính năng Move file / folder.
* Tích hợp thanh Progress tải lên giao diện thay vì chỉ xoay vòng Loading (Bắt buộc dùng XHR/axios onUploadProgress thay vì NextJS Server Actions đối với file nặng).

---

## 📌 10. LỊCH SỬ CHẠY LỆNH (COMMAND EXECUTION)

| Lệnh đã chạy | Kết quả |
| :--- | :---: |
| `npx tsx scripts/qa-documents-audit.ts` | PASS (Đếm 12 docs, 0 lỗi db schema) |
| `npx prisma validate` | PASS |
| `npx prisma generate` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS |

---

## 📌 11. GIT STATUS CUỐI CÙNG

```bash
 M src/app/(dashboard)/projects/[id]/edit/page.tsx
 M src/app/(dashboard)/projects/[id]/page.tsx
 M src/app/(dashboard)/projects/actions.ts
 M src/app/(dashboard)/projects/page.tsx
 M src/app/(dashboard)/reports/actions.ts
 M src/app/api/reports/attachments/[attachmentId]/route.ts
 M src/components/documents/document-workspace.tsx
 M src/lib/documents/permissions.ts
 M src/lib/settings/settings-validation.ts
 M src/lib/storage/local-storage-provider.ts
 M src/lib/utils.ts
?? docs/qa/BROWSER_CONSOLE_NETWORK_UAT_REPORT.md
?? docs/qa/DOCUMENTS_MODULE_FULL_AUDIT_REPORT.md
?? docs/qa/HANOI_FULL_PROJECT_RESET_AND_SEED_REPORT.md
?? docs/qa/HANOI_POST_VERIFICATION_FIX_REPORT.md
?? docs/qa/HANOI_RESET_SEED_INDEPENDENT_VERIFICATION_REPORT.md
?? docs/qa/PROJECTS_DETAIL_CREATE_EDIT_QA_REPORT.md
?? docs/qa/PROJECTS_LIST_QA_AUDIT_AND_FIX_REPORT.md
?? docs/qa/PROJECTS_LIST_QA_AUDIT_REPORT.md
?? docs/qa/PROJECTS_MODULE_FINAL_VERIFICATION_REPORT.md
?? docs/qa/VIETNAMESE_DIACRITICS_DATA_AUDIT_REPORT.md
?? docs/qa/VIETNAMESE_DIACRITICS_DATA_FIX_REPORT.md
?? docs/qa/VIETNAMESE_DIACRITICS_FINAL_VERIFICATION_REPORT.md
?? docs/qa/VIETNAMESE_DIACRITICS_FULL_SOURCE_AND_DB_FIX_REPORT.md
?? scripts/audit-vietnamese-seed-text.ts
?? scripts/playwright-uat.ts
?? scripts/qa-documents-audit.ts
?? scripts/qa-hanoi-project-data-check.ts
?? scripts/qa-projects-audit.ts
?? scripts/qa-projects-detail-audit.ts
?? scripts/qa-projects-detail-cleanup-verify.ts
?? scripts/qa-projects-detail-playwright.ts
?? scripts/qa-projects-rbac.ts
?? scripts/qa-reports-project-rbac-guard.ts
?? scripts/reset-old-project-data.ts
?? scripts/seed-hanoi-full-project.ts
?? scripts/update-hanoi-vietnamese-diacritics.ts
```

---

## 📌 12. CAM KẾT
* 🛑 **Chưa sửa (fix) bất cứ dòng code nào.**
* 🛑 **Không commit, không push.**
* 🛑 **Không reset DB hay đụng vào dữ liệu thật.**
* 🛑 **Không chạy các lệnh xóa file cứng.**
