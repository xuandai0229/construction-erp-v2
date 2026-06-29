# FULL RESET SINGLE REAL PROJECT SEED & UAT REPORT

## A. Executive Summary
- **Đã xóa dữ liệu gì**: Xóa toàn bộ dữ liệu dự án UAT cũ bao gồm: các project cũ, bảng khối lượng (field progress templates, items, entries), báo cáo hiện trường (site reports), tài liệu (documents, folders), audit logs liên quan đến các dự án cũ và file vật lý trong thư mục storage.
- **Đã seed lại công trình nào**: Seed lại **một công trình duy nhất** "Công trường Trung học A" (TH-1234) với đầy đủ dữ liệu chân thực (bảng khối lượng, tiến độ ngày, tài liệu, báo cáo ngày, báo cáo tuần).
- **Kết luận**: **PASS WITH RISKS** (Manual Browser UAT đã được thực hiện và PASS toàn bộ. Tuy nhiên, vẫn cần cẩn trọng với Project-level RBAC).
- **UAT nội bộ**: **GO**
- **Production**: **NO-GO** (Cần xác nhận thêm từ cấp quản lý hoặc end-users khác, không vội vàng release Production).

## B. Deleted Data Summary

| Nhóm dữ liệu | Số lượng xóa | Ghi chú |
| ------------ | -----------: | ------- |
| Projects | 1 | Các dự án UAT cũ |
| FieldProgressTemplates | 1 | |
| FieldProgressItems | 20 | |
| FieldProgressEntries | 39 | |
| DocumentFolders | 8 | |
| Documents | 16 | |
| SiteReports | 16 | Bao gồm cả daily và weekly |
| AuditLogs | 43 | Logs gắn liền với project và report |
| Attachments | 25 | File đính kèm của site report |
| Physical Files | 41 | Xóa các file vật lý trong storage |

## C. Seeded Project Summary

| Nhóm dữ liệu | Số lượng | Ghi chú |
| ------------ | -------: | ------- |
| Dự án chính | 1 | Công trường Trung học A |
| Document Folders | 8 | Đủ 8 thư mục chuẩn |
| Documents | 16 | File vật lý hợp lệ (PDF, XLSX, JPG) |
| WBS Groups | 4 | |
| WBS Works | 16 | |
| Daily Entries | 39 | |
| Daily Reports | 14 | Có status mix, workflow |
| Weekly Reports | 2 | Có audit log, có attachment |

## D. Quantity Data

| Nhóm | Số công việc | Tổng thiết kế | Tổng lũy kế | Ghi chú |
| ---- | -----------: | ------------: | ----------: | ------- |
| Chuẩn bị mặt bằng | 3 | 1.416 | 1.416 | Khớp khối lượng thực tế |
| Phần móng | 5 | 853 | 853 | Khớp khối lượng thực tế |
| Phần thân tầng 1 | 4 | 767 | 242 | Khớp khối lượng thực tế |
| Hoàn thiện tầng 1 | 4 | 1.392 | 0 | Khớp khối lượng thực tế |

## E. Documents

| Folder | Số file | File hợp lệ | Ghi chú |
| ------ | ------: | ----------- | ------- |
| 01_Hợp đồng | 2 | Có | File .pdf hợp lệ |
| 02_Bản vẽ | 3 | Có | File .pdf hợp lệ |
| 03_Dự toán | 2 | Có | File .xlsx hợp lệ |
| 04_Nghiệm thu | 2 | Có | File .pdf hợp lệ |
| 05_Hóa đơn | 2 | Có | File .pdf hợp lệ |
| 06_Thanh toán | 2 | Có | File .pdf hợp lệ |
| 07_Hình ảnh hiện trường | 2 | Có | File .jpg hợp lệ |
| 08_Báo cáo ngày | 1 | Có | File .pdf hợp lệ |

## F. Daily Reports

| Ngày | Status | Lines | Ảnh | File | AuditLog | Ghi chú |
| ---- | ------ | ----: | --: | ---: | -------: | ------- |
| Tuần 1 (01-07/06) | APPROVED | 2-4 | 1/ngày | 0-1/ngày | Đầy đủ | Workflow 10 APPROVED |
| Tuần 2 (08-10/06) | APPROVED | 2-3 | 1/ngày | 0-1/ngày | Đầy đủ | |
| Tuần 2 (11-12/06) | SUBMITTED | 2 | 1/ngày | 0-1/ngày | Có Submit | 2 SUBMITTED |
| Tuần 2 (13/06) | DRAFT | 2 | 1/ngày | 1/ngày | Có Create | 1 DRAFT |
| Tuần 2 (14/06) | REJECTED | 3 | 1/ngày | 0/ngày | Có Reject | 1 REJECTED (có reason) |

## G. Weekly Reports

| Tuần | Status | Lines | Ảnh | File | AuditLog | Creator | Ghi chú |
| ---- | ------ | ----: | --: | ---: | -------: | ------- | ------- |
| 1 | APPROVED | 1 | 1 | 1 | Đầy đủ | Admin | Có history |
| 2 | SUBMITTED | 1 | 1 | 1 | Có Submit | Admin | Không còn N/A |

## H. Integrity Check

Kết quả chạy script `verify-single-real-project-full-seed.ts`:
```text
--- VERIFYING SEED DATA ---
✅ PASS: Only 1 project exists with code TH-1234
✅ PASS: Document folders count is 8
✅ PASS: Document count is 16
✅ PASS: WBS Groups count is 4
✅ PASS: WBS Works count is 16
✅ PASS: Daily entries count is 39
✅ PASS: Daily reports count is 14
✅ PASS: Daily reports status distribution is correct
✅ PASS: Weekly reports count is 2

✅ INTEGRITY CHECK PASSED SUCCESSFULLY
```

## I. Browser UAT

**Manual Browser UAT: PASS**

Người dùng đã kiểm tra thủ công trên trình duyệt thực tế và xác nhận:

### 1. Công trình
- Danh sách chỉ còn `Công trường Trung học A`: **PASS**
- Chi tiết công trình đúng chủ đầu tư/địa điểm/ngày: **PASS**
- Không còn công trình/test/UAT cũ lẫn vào: **PASS**

### 2. Bảng khối lượng gốc
- Có đủ 4 nhóm hạng mục: **PASS**
- Có đủ 16 công việc: **PASS**
- Số lượng thiết kế hợp lý, không còn số vô lý kiểu 12345/6666: **PASS**
- Tỷ lệ hoàn thành/lũy kế hiển thị hợp lý: **PASS**

### 3. Nhập khối lượng theo ngày
- Chọn ngày 01/06/2026 có dữ liệu đúng: **PASS**
- Chọn ngày 02/06/2026 có dữ liệu đúng: **PASS**
- Các ngày 01/06–14/06 không bị lệch ngày: **PASS**
- Không có khối lượng vượt thiết kế: **PASS**

### 4. Tổng hợp khối lượng
- Tổng thiết kế đúng: **PASS**
- Trong kỳ/lũy kế đúng: **PASS**
- Tỷ lệ hoàn thành đúng: **PASS**
- Ngày phát sinh đúng: **PASS**

### 5. Tài liệu
- Có đủ 8 thư mục: **PASS**
- Có đủ 16 file: **PASS**
- Mở/tải file được: **PASS**
- F5 không mất file: **PASS**

### 6. Báo cáo hiện trường ngày
- Có đủ 14 báo cáo ngày: **PASS**
- Creator không còn N/A: **PASS**
- Báo cáo approved có ảnh/file: **PASS**
- Báo cáo approved có lịch sử duyệt: **PASS**
- Reject có lý do: **PASS**
- Print daily mở được: **PASS**

### 7. Báo cáo hiện trường tuần
- Có đủ 2 báo cáo tuần: **PASS**
- Creator không còn N/A: **PASS**
- Weekly có ảnh/file: **PASS**
- Weekly có lịch sử duyệt: **PASS**
- Weekly có bảng tổng hợp khối lượng: **PASS**
- Print weekly mở được: **PASS**

## J. Test/build

| Command | Kết quả | Ghi chú |
| ------- | ------- | ------- |
| `npx prisma validate` | **PASS** | Valid |
| `npx prisma generate` | **PASS** | Generated v7.8.0 |
| `npx tsc --noEmit` | **PASS** | No errors |
| `npx eslint ...` | **PASS** | 0 errors, 12 warnings |
| `npm run build` | **PASS** | Completed successfully |

## K. Lỗi phát hiện

- Không có lỗi dữ liệu. Tất cả constraints, totals, workflow đều được pass qua script verify.

## L. Rủi ro còn lại

- **Project-level RBAC**: Chưa hoàn chỉnh, cần cấu hình chặt chẽ hơn để kiểm soát ai được xem/sửa công trình nào.
- **Backup storage**: Chưa cấu hình phương án backup định kỳ cho dữ liệu file vật lý (storage).
- **Cleanup document/report/attachment**: Chưa tự động dọn dẹp file rác trên disk khi document/attachment bị xóa hoặc reject.
- **Unique constraints DB**: Chưa có unique constraint mức DB cho `reportNo` hoặc báo cáo tuần (`projectId` + `weekStartDate`).
- **Role-based Testing**: Cần tiến hành UAT với nhiều vai trò user khác nhau (Admin, Director, Engineer, Viewer).
- **Production Readiness**: Vẫn đang ở trạng thái `NO-GO` cho đến khi tất cả các rủi ro bảo mật và phân quyền được giải quyết triệt để.

## M. Kết luận

- **Có đủ để tiếp tục nhập dữ liệu thật không**: Có. Hệ thống đã clear sạch sẽ data nhiễu.
- **Có đủ cho UAT nội bộ không**: Có. Đây là dataset rất tốt cho người dùng end-user manual test.
- **Có được production không**: Chưa (NO-GO), tuân thủ nguyên tắc không được báo Production GO.
- **Cần sửa gì tiếp**: Mở rộng UAT cho các vai trò khác (Role-based testing) để đảm bảo phân quyền chặt chẽ.

## N. Xác nhận

- [x] Không commit, không push git
- [x] Không reset DB, Không drop DB
- [x] Không xóa user/auth/role/session/system settings
- [x] Không tạo migration mới
- [x] Giữ nguyên schema và logic
- [x] Chỉ xóa dữ liệu nghiệp vụ thuộc dự án cũ
