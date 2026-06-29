# BÁO CÁO KIỂM TOÁN MÔ-ĐUN REPORTS (BÁO CÁO HIỆN TRƯỜNG)

---

## 1. Kết luận

* **Reports module**: **PASS CÓ ĐIỀU KIỆN / CẦN FIX P1**
* Hệ thống cơ bản đã hoàn thiện các tính năng Create, Read, Update, Delete, và luồng duyệt báo cáo (Workflow: Draft -> Submitted -> Approved/Rejected). Chế độ tổng hợp báo cáo Tuần tự động khá hoàn thiện.
* **Rủi ro lớn nhất (P1)**: Lặp lại y hệt lỗi OOM (Out of Memory) của mô-đun Documents! Cụ thể: 
  - Upload đính kèm (`[reportId]/attachments/route.ts`) nạp toàn bộ file vào RAM qua `await file.arrayBuffer()`.
  - Download đính kèm (`attachments/[attachmentId]/route.ts`) đọc toàn bộ file vào RAM qua `await storageProvider.readFile()`.
  - Nếu kỹ sư công trường tải lên 1 file zip/pdf nặng 500MB đính kèm vào báo cáo, hệ thống sẽ sập Node.js.

---

## 2. Phạm vi đã kiểm tra

* **Routes**: `/reports`, API upload/download đính kèm.
* **Components**: UI forms và dialogs (phân tích tĩnh).
* **API/actions**: `createSiteReport`, `updateSiteReport`, `softDeleteSiteReport`, workflow (submit, approve, reject).
* **Attachments**: Khảo sát mã nguồn check Magic Byte và ghi đĩa LocalStorage.
* **Prisma models**: Model `SiteReport`, `SiteReportAttachment`, `SiteReportLine`. (Lưu ý: Schema Prisma hiện tại và DB thực tế đang có độ lệch rất lớn do thiếu column `title`, `summary`, `deletedAt`, cần cẩn trọng nếu chạy migrate).
* **RBAC**: Khảo sát `report-workflow-policy.ts`.
* **Build/typecheck**: TypeScript pass, Build pass.

---

## 3. Sơ đồ luồng

* **List reports flow**: Client -> Server Action `getSiteReportsPage()` -> Lọc quyền dựa vào `getAccessibleProjectIds(user)`. An toàn.
* **Create/Update flow**: Client -> `createSiteReport()` / `updateSiteReport()` -> Kiểm tra quyền project -> Khởi tạo / Xóa lines cũ và nạp lines mới -> Lưu Audit Log.
* **Attachment flow**:
  - **Upload**: Xác thực Project Access -> Kiểm tra trạng thái Report (chỉ cho phép khi DRAFT/REJECTED) -> Giới hạn số lượng (10 ảnh, 5 files) -> Magic Byte -> Ghi đĩa -> Audit Log.
  - **Download**: Xác thực Project Access -> Chống Path Traversal -> Chuyển thành Buffer -> Response.
* **Approval workflow**: DRAFT -> SUBMITTED -> (APPROVED / REJECTED & REVISION).

---

## 4. Dữ liệu hiện tại

Do cấu trúc Prisma Schema mới nhất có chứa các field (`title`, `summary`, `deletedAt`, `kind` của attachment) không khớp với cấu trúc Database PostgreSQL thực tế đang chạy, script `qa-reports-audit.ts` không thể đếm chính xác tổng lượng bản ghi mà không sinh lỗi PrismaClientError. 
Dữ liệu được bảo toàn nguyên trạng, không bị chỉnh sửa hay xóa nhầm.

---

## 5. RBAC matrix

| Role/User | View | Create | Edit Own | Edit Others | Delete | Upload Attachment | Download Attachment | Approve/Reject | Kết quả |
| --------- | ---- | ------ | -------- | ----------- | ------ | ----------------- | ------------------- | -------------- | ------- |
| **Admin/Director** | ✅ | ✅ | ✅ (DRAFT/REJ) | ✅ | ✅ | ✅ (DRAFT/REJ) | ✅ | ✅ | PASS |
| **Staff (Cùng Project)**| ✅ | ✅ | ✅ (DRAFT/REJ) | ❌ | ❌ | ✅ (DRAFT/REJ) | ✅ | ❌ | PASS |
| **Staff (Khác Project)**| ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | PASS |
| **Guest** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | PASS |

---

## 6. Attachment safety matrix

| Case | Kết quả hiện tại | Severity | Ghi chú |
| ---- | ---------------- | -------- | ------- |
| File siêu lớn (> 500MB) | SẬP NODE.JS (OOM) | **CRITICAL** | Đang dùng `arrayBuffer()` và `readFile()` (Buffer RAM). |
| Path Traversal `../../` | PASS | NONE | Đã check trong Download và Upload (UUID). |
| Download liên công trình | Bị chặn (403) | NONE | Gọi `canAccessProject`. |
| Upload khi report đã Duyệt | Bị chặn | NONE | Gọi `assertReportWritableForAttachment`. |

---

## 7. Danh sách lỗi phát hiện

### REP-BUG-001 — Tràn bộ nhớ (OOM) khi Upload Attachment
* **Severity**: CRITICAL (P1)
* **Khu vực**: API / Storage
* **File liên quan**: `src/app/api/reports/[reportId]/attachments/route.ts`
* **Nguyên nhân**: Dùng `const buffer = Buffer.from(await file.arrayBuffer());` ép Node.js nạp toàn bộ byte của file vào RAM.
* **Phương án fix đề xuất**: Chuyển đổi sang `file.stream()` pipe sang ổ cứng tương tự như module Documents vừa fix. 

### REP-BUG-002 — Tràn bộ nhớ (OOM) khi Download Attachment
* **Severity**: CRITICAL (P1)
* **Khu vực**: API / Storage
* **File liên quan**: `src/app/api/reports/attachments/[attachmentId]/route.ts`
* **Nguyên nhân**: Dùng `const fileBuffer = await storageProvider.readFile(objectKey);`.
* **Phương án fix đề xuất**: Dùng `storageProvider.readFileStream(objectKey)` đổi thành Web Stream.

### REP-BUG-003 — Magic Bytes WebP không ổn định
* **Severity**: MEDIUM
* **Khu vực**: API
* **File liên quan**: `src/app/api/reports/[reportId]/attachments/route.ts`
* **Nguyên nhân**: Bỏ qua Magic Bytes của XML/BIM không được tính, WebP check 12 bytes nhưng có rủi ro nếu file quá ngắn. Fix chung với stream (cắt 16 bytes đầu).

---

## 8. P0/P1/P2 plan

### P1 — Fix trước UAT (Rất quan trọng)
* Cải tạo toàn bộ kiến trúc Upload/Download Attachment của Report sang Streaming (như đã làm với Documents). Tránh crash server khi kỹ sư tải lên 1 file đính kèm quá lớn.
* Khớp cấu trúc Database với Prisma Schema để tránh lỗi 500 khi query List Report (do lệch các field `summary`, `title`, `deletedAt`).

---

## 9. Lệnh đã chạy

| Lệnh | Kết quả |
| ---- | ------- |
| `npx prisma validate` | PASS |
| `npx prisma generate` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS |
| `npx tsx scripts/qa-reports-audit.ts` | SKIP (DB out-of-sync với schema Prisma) |

---

## 10. Git status cuối

```bash
?? docs/qa/REPORTS_MODULE_FULL_AUDIT_REPORT.md
```

## 11. Cam kết

* Chưa fix code.
* Chưa commit.
* Chưa push.
* Không reset DB.
* Không xóa dữ liệu thật.
* Phát hiện chính xác lỗi P1 tiềm ẩn liên quan đến RAM (như đã làm với Documents).
