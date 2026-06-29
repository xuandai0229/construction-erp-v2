# R3B.1 + R3B.2 — EDIT & SOFT DELETE IMPLEMENTATION REPORT

## A. Executive Summary
- **R3b.1/R3b.2:** PASS WITH RISKS (Browser UAT not verified)
- **Đã thêm sửa chưa:** Đã thêm API `updateSiteReport` và UI nút Sửa.
- **Đã thêm xóa mềm chưa:** Đã thêm API `softDeleteSiteReport` và UI nút Xóa.
- **Status được sửa/xóa:** `DRAFT` và `REJECTED`.
- **Status bị chặn:** `SUBMITTED`, `APPROVED`, `CANCELLED`, `LOCKED`.
- **Có sửa DB/migration không:** Không có bất kỳ schema migration nào.
- **Production GO/NO-GO:** **NO-GO** (Cần hoàn tất verify UI Browser thủ công trước khi Go-live).

## B. Implementation Details
- **Server Actions (`actions.ts`):** 
  - `updateSiteReport`: Xóa các workLines cũ và tạo lại lines mới trong một transaction an toàn. Lưu snapshot cũ/mới vào `AuditLog` với action `SITE_REPORT_UPDATED`.
  - `softDeleteSiteReport`: Cập nhật `deletedAt = new Date()`, lưu log `SITE_REPORT_SOFT_DELETED`.
- **UI List (`reports-table.tsx` & `reports-mobile-cards.tsx`):** Thêm nút Sửa (`Edit2`) và Xóa (`Trash2`) cho các báo cáo hợp lệ, chỉ hiện cho người tạo hoặc Admin/Director.
- **UI Drawer (`report-detail-drawer.tsx`):** Tích hợp nút Sửa/Xóa. Nút Xóa có window confirmation.
- **Form Edit Mode (`create-report-dialog.tsx`):**
  - Hỗ trợ `mode="edit"`.
  - Populate toàn bộ dữ liệu từ `initialReport`.
  - Không tự động tải lại file đính kèm cũ vào form để tránh upload trùng lặp, có hiển thị note rõ ràng.
- **Soft Delete Logic:** Dữ liệu bị ẩn do query `where { deletedAt: null }` mặc định trong `getSiteReportsPage`.

## C. Policy Matrix (Updated)
| Status | Sửa (Edit) | Xóa mềm (Soft Delete) | Gửi duyệt (Submit) | Upload File (Attachments) |
| --- | --- | --- | --- | --- |
| **DRAFT** | Có (Người tạo/Admin) | Có (Người tạo/Admin) | Có | Có |
| **REJECTED**| Có (Người tạo/Admin) | Có (Người tạo/Admin) | Có | Có |
| **SUBMITTED**| Bị chặn tuyệt đối | Bị chặn tuyệt đối | - | Bị chặn tuyệt đối |
| **APPROVED** | Bị chặn tuyệt đối | Bị chặn tuyệt đối | - | Bị chặn tuyệt đối |
| **CANCELLED**| Bị chặn tuyệt đối | Bị chặn tuyệt đối | - | Bị chặn tuyệt đối |
| **LOCKED** | Bị chặn tuyệt đối | Bị chặn tuyệt đối | - | Bị chặn tuyệt đối |

## D. Test Results
- **Test Script (`scripts/test-reports-r3b-edit-delete.ts`):** **PASS**
  - ✅ Update DRAFT pass
  - ✅ Update REJECTED pass
  - ✅ Update SUBMITTED/APPROVED blocked
  - ✅ Soft delete DRAFT/REJECTED pass
  - ✅ Soft delete SUBMITTED/APPROVED blocked
- **Browser UAT:** **Browser NOT VERIFIED** (Subagent skipped/interrupted).
- **Build/Test (`tsc` / `eslint` / `npm run build`):** **PASS**. Không có lỗi type, linter. Build thành công tối ưu.

## E. Data Integrity
- **Tạo report test không:** Có (Script tự tạo mock project và fake reports).
- **Có cleanup không:** Có (Script đã xóa an toàn các lines, log và report test tự tạo).
- **Có hard delete không:** Không. API dùng `update { deletedAt: new Date() }`.
- **Có xóa file vật lý không:** Không.

## F. Risks Remaining
- **Withdraw submitted:** Chưa làm trong phase này (Cần thiết cho R3b.3).
- **Cancel report:** Chưa làm (Cần thiết cho R3b.4).
- **R2 Weekly Source Linkage:** Chưa làm.
- **R4 Project-level RBAC:** Chưa làm toàn diện.
- **R5 Storage Cleanup:** Chưa dọn các file vật lý khi báo cáo bị soft-delete (Vẫn còn 25 attachment missing file cũ từ đợt audit trước).
- **Browser UAT:** UI chưa được con người kiểm tra click/form thật sự trên trình duyệt.

## G. Go/No-Go
- **R3b UAT:** **GO for manual UAT** (Sẵn sàng để QA kiểm tra tay).
- **Tiếp tục phase sau:** Có thể tiếp tục làm R3b.3 Withdraw.
- **Production:** **NO-GO**.

## H. Xác nhận (Confirmation)
- [x] Không commit
- [x] Không push
- [x] Không reset DB
- [x] Không hard delete dữ liệu thật
- [x] Không cleanup storage
- [x] Không tạo migration
