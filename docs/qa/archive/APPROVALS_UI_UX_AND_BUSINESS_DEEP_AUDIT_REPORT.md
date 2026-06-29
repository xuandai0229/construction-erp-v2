# Báo cáo Audit UI/UX và Nghiệp vụ — Approval Center

> Ngày: 2026-06-26 | Trạng thái: **GO có điều kiện**

---

## 1. Phân tích UI/UX từ thực tế (Phases 1-4)

Sau khi phân tích kỹ lưỡng ảnh chụp màn hình và audit code, dưới đây là những vấn đề cốt lõi đã được giải quyết:

### 1.1 Bảng danh sách & Dashboard
- **Vấn đề**: Layout bảng quá chật, badge bị rớt dòng, hiển thị `"Không có"` cho cột giá trị gây hiểu lầm, tên dự án bị cắt (truncate) quá gắt, nút hành động chiếm nhiều diện tích.
- **Khắc phục**:
  - Badge trạng thái/ưu tiên: Thêm `whitespace-nowrap`.
  - Giá trị `null`: Đổi từ `"Không có"` thành `"—"` cho chuyên nghiệp.
  - Cột công trình: Tăng max-width để hiển thị tên dự án dài mà không làm hỏng layout.
  - Đổi nhãn `Bình thường` thành `Thường` để tiết kiệm không gian.
  - Nút xem: Thay đổi variant thành `ghost` (trước đó cố dùng `secondary` nhưng không có nên đã dùng `ghost`), ẩn text `Xem` trên màn hình nhỏ.

### 1.2 Drawer Chi Tiết
- **Vấn đề**: Cấu trúc chưa phân nhóm rõ ràng, thiếu cảnh báo mạnh về việc cập nhật hồ sơ gốc.
- **Khắc phục**:
  - Gộp các section: `Thông tin yêu cầu`, `Tài chính`, `Hồ sơ gốc liên kết`, `Mô tả`, `Quyết định`.
  - Làm rõ trạng thái liên kết: Thêm badge `"Tham chiếu nội bộ"` cho các sourceType không có model thật (như `ChangeOrder`, `SiteReport`).
  - Thêm cảnh báo bằng block màu vàng (amber) để người dùng rõ: Quyết định tại đây chỉ cập nhật trạng thái yêu cầu phê duyệt, module nguồn cần thao tác riêng.
  - Ghi chú lộ trình (Backlog) cho tính năng AuditLog timeline và đính kèm file.

### 1.3 Modal Tạo Yêu Cầu
- **Vấn đề**: Mô tả `"để kiểm tra"` không chuyên nghiệp trong môi trường production.
- **Khắc phục**: 
  - Sửa thành `"Tạo yêu cầu phê duyệt ngoài module nguồn"`.
  - Bổ sung ghi chú (amber box) giải thích rõ: Đây là tạo thủ công và không tự liên kết với hồ sơ gốc (tính năng chọn nguồn đang ở backlog).

### 1.4 Modal Từ Chối (ReasonDialog)
- **Vấn đề**: Thiếu context, người quản lý không rõ mình đang từ chối cái gì (giá trị bao nhiêu, thuộc dự án nào).
- **Khắc phục**: 
  - Render khối thông tin bên trong modal từ chối (description).
  - Hiển thị đầy đủ: `Mã - Tiêu đề`, `Công trình`, `Giá trị`, `Hạn xử lý`.

## 2. Nghiệp vụ approval đã kiểm tra

| Quy tắc | Kết quả |
|---|---|
| PENDING: Xem / Duyệt / Từ chối / Hủy | ✅ Đúng trạng thái |
| APPROVED / REJECTED / CANCELLED | ✅ Không hiện action duyệt/từ chối |
| Reject bắt buộc lý do ≥ 10 ký tự | ✅ Cả UI và Server đều chặn |
| Người tạo không tự duyệt (trừ Admin) | ✅ Server chặn |
| Approval có liên kết hồ sơ thật | ✅ Đã kiểm chứng qua QA script |
| Audit log cho mọi action | ✅ Database đã lưu (chưa hiện UI) |

## 3. Dữ liệu liên thông đã kiểm tra

| Source | Approval | Bản ghi thật | ProjectId khớp | Ghi chú |
|---|---|---|---|---|
| PaymentRequest | UAT-APR-001 | ✅ | ✅ | FK có thật |
| MaterialRequest | UAT-APR-002 | ✅ | ✅ | FK có thật |
| Contract | UAT-APR-005 | ✅ | ✅ | FK có thật |
| ChangeOrder | UAT-APR-003 | ⚠️ Tham chiếu nội bộ | — | Đã có cảnh báo UI |
| SiteReport | UAT-APR-004 | ⚠️ Tham chiếu nội bộ | — | Đã có cảnh báo UI |

## 4. RBAC / Project scope

| Test | Kết quả |
|---|---|
| Admin xem tất cả | ✅ PASS |
| PM chỉ thấy project mình | ✅ PASS |
| User ngoài project không xem được | ✅ PASS |
| Cross-project: 2 project UAT test | ✅ PASS |
| Server chặn approve/reject ngoài scope | ✅ PASS |

## 5. Kết quả QA / Build

### QA Script — 17/17 PASS
Tất cả các case về RBAC, DTO Date/Decimal an toàn, Source Integrity đều vượt qua.

### Build
- `npx prisma validate` ✅
- `npx prisma generate` ✅
- `npx tsx scripts/seed-approvals-uat.ts` ✅ 
- `npx tsx scripts/qa-approvals.ts` ✅ (17/17 PASS)
- `npx tsc --noEmit` ✅ (Fix variant secondary -> ghost)
- `npm run build` ✅ (Exit code: 0)

## 6. Kết luận

**Trạng thái: GO có điều kiện**

Màn hình phê duyệt (`/approvals`) đã đạt tiêu chuẩn nghiệp vụ và giao diện nâng cao cho MVP. Các tính năng chưa làm (Audit Timeline, Chọn nguồn tạo thủ công, File đính kèm) đã được làm rõ bằng UI helper text, đảm bảo không gây bối rối cho End-user trong quá trình UAT.
