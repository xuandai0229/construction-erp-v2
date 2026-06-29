# BÁO CÁO KIỂM TRA (AUDIT) TOÀN DIỆN MÔ-ĐUN ACCOUNTING (KẾ TOÁN & THANH TOÁN)

---

## 1. Kết luận

* **Accounting module**: **FAIL / CẦN FIX GẤP TRƯỚC KHI DÙNG THỰC TẾ**
* **Có sẵn sàng cho kế toán/giám đốc/chỉ huy trưởng dùng thật chưa?**: **CHƯA**. 
* **Rủi ro lớn nhất là gì?**: Dữ liệu có thể bị phá hoại hợp lệ. Hệ thống hiện tại đang cho phép **người tạo phiếu** được quyền **Sửa** (updatePaymentRequest) hoặc **Xóa** (deletePaymentRequest) hồ sơ thanh toán **ngay cả khi phiếu đó đã được duyệt (APPROVED) hoặc đã được thanh toán (PAID)**. Đồng thời, không có cơ chế chặn tạo phiếu thanh toán vượt giá trị hợp đồng.

---

## 2. Phạm vi đã kiểm tra

* **Routes**: `/accounting`.
* **Components**: `accounting-workspace.tsx`, `payment-request-form-dialog.tsx`, `payment-request-detail-drawer.tsx`.
* **API/actions**: `src/app/(dashboard)/accounting/actions.ts` (Next.js Server Actions).
* **Prisma models**: Bảng `PaymentRequest` liên kết với `Project`, `Supplier`, `Contract`, `User`.
* **Money Logic**: Tái sử dụng `contract-money-utils.ts` (format, strip text).
* **RBAC**: `getAccountingPermissions` trong `accounting-permissions.ts`.

---

## 3. Sơ đồ luồng

* **List flow**: Lọc Payment Requests theo project mà user có quyền truy cập. Admin/Accountant thấy toàn bộ.
* **Create flow**: Người tạo nhập số tiền trước thuế, VAT -> Cộng thành Tổng. Lưu `DRAFT` vào DB.
* **Update flow**: Update DB. (LỖI: Chặn lỏng lẻo, sửa được phiếu cả khi đã duyệt/đã thanh toán).
* **Workflow**: `DRAFT` -> `SUBMITTED` (Chờ duyệt) -> `APPROVED` (Giám đốc duyệt) -> `PAID` (Kế toán chi). Hỗ trợ `REJECTED` và `CANCELLED`.
* **Delete flow**: Cập nhật `deletedAt`. (LỖI: Xóa được cả phiếu đã duyệt/chi).

---

## 4. Dữ liệu hiện tại

| Metric | Count / Kết quả |
| ------ | --------------: |
| Tổng số PaymentRequest | 6 |
| Active (chưa bị xóa) | 6 |
| Deleted (xóa mềm) | 0 |
| Dữ liệu rác (prefix QA_) | 0 |
| Thiếu projectId | 0 |
| Lỗi tiền (<= 0) | 0 |
| Đang DRAFT | 1 |
| Đang SUBMITTED | 1 |
| Đã APPROVED | 1 |
| Đã PAID | 2 |
| PAID nhưng thiếu approvedAt | 0 |

---

## 5. RBAC matrix

| Role/User | View | Create/Update | Delete | Approve | Mark Paid | Ghi chú |
| --------- | ---- | ------------- | ------ | ------- | --------- | ------- |
| ADMIN / DIRECTOR | Có | Có | Có | Có | Có | Full quyền |
| ACCOUNTANT | Có | Có | Không | Không | Có | Làm thủ quỹ |
| DEPUTY_DIRECTOR | Có | Có | Có | Có | Không | |
| MANAGER (PM/BCH) | Có | Có | Theo dự án | Có | Không | Đề xuất & Kỹ thuật duyệt |
| STAFF / ENGINEER | Có | Không | Không | Không | Không | Chỉ xem trong dự án |

---

## 6. Danh sách lỗi phát hiện

### ACC-BUG-001 — Xóa được phiếu thanh toán đã DUYỆT hoặc đã CHI
* **Severity**: CRITICAL
* **Khu vực**: API (`deletePaymentRequest`)
* **Cách tái hiện**: Người tạo (Creator) gọi hàm xóa đối với phiếu đang có `status === "PAID"` hoặc `APPROVED`.
* **Kết quả hiện tại**: Hệ thống không kiểm tra trạng thái phiếu, cập nhật `deletedAt = new Date()` thành công.
* **Hậu quả**: Tiền đã chi thực tế hoặc được sếp duyệt bị xóa mất khỏi công nợ, dẫn tới mất tiền của công ty mà không ai biết.
* **Phương án fix**: Yêu cầu bắt buộc kiểm tra `if (pr.status !== 'DRAFT' && pr.status !== 'REJECTED') throw new Error("Chỉ được xóa phiếu Nháp hoặc Bị từ chối")`.

### ACC-BUG-002 — Sửa được nội dung, số tiền phiếu thanh toán đã DUYỆT hoặc đã CHI
* **Severity**: CRITICAL
* **Khu vực**: API (`updatePaymentRequest`)
* **Cách tái hiện**: Gọi sửa phiếu đang có `status === "PAID"`.
* **Kết quả hiện tại**: Phiếu bị đổi giá trị `totalAmount`, `supplierId`, v.v.
* **Hậu quả**: Gian lận kế toán cực kỳ nghiêm trọng. Kế toán chi 1 tỷ, sau đó sửa phiếu thành 100 triệu để giấu thông tin.
* **Phương án fix**: Thêm check trạng thái khóa cứng form khi trạng thái không phải `DRAFT`/`REJECTED`.

### ACC-BUG-003 — Thiếu kiểm tra và chặn vượt Tổng giá trị hợp đồng
* **Severity**: HIGH
* **Khu vực**: API (`createPaymentRequest`, `updatePaymentRequest`)
* **Cách tái hiện**: Tạo phiếu thanh toán số lượng 100 Tỷ cho Hợp đồng có giá trị 1 Tỷ.
* **Kết quả hiện tại**: Hệ thống có code bỏ qua (`// Skip limit check for simple CRUD phase`).
* **Hậu quả**: Gây âm công nợ khổng lồ, thanh toán lố số tiền cho thầu phụ.
* **Phương án fix**: Sum các payment của contract (loại trừ CANCELLED/REJECTED), nếu `totalAmount + existing > contract.value`, báo lỗi chặn lại.

### ACC-BUG-004 — Model PaymentRequest thiếu Document/Attachment
* **Severity**: MEDIUM
* **Khu vực**: Prisma / Schema
* **Hậu quả**: Hệ thống hiện tại chưa thể đính kèm Hóa đơn PDF (Invoices) hay Chứng từ Ủy nhiệm chi vào Đề nghị thanh toán.

---

## 7. P0/P1/P2 plan

### P0 — Bắt buộc fix ngay
* **ACC-BUG-001**: Khóa tính năng Xóa phiếu (deletePaymentRequest) nếu `status` không phải DRAFT/REJECTED.
* **ACC-BUG-002**: Khóa tính năng Sửa phiếu (updatePaymentRequest) nếu `status` không phải DRAFT/REJECTED.

### P1 — Fix trước UAT
* **ACC-BUG-003**: Cảnh báo hoặc block nếu tạo payment vượt giá trị Contract.

### P2 — Tối ưu sau
* Tích hợp Document storage cho Hóa đơn / Chứng từ gốc (ACC-BUG-004).
* Bổ sung tính năng In phiếu (Print).

---

## 8. Lệnh đã chạy

| Lệnh | Kết quả | Ghi chú |
| ---- | ------- | ------- |
| `npx tsx scripts/qa-accounting-audit.ts` | PASS | Đọc dữ liệu thành công. |
| `npx prisma validate/generate` | PASS | |
| `npx tsc --noEmit` | PASS | Code Typescript hoàn toàn sạch. |
| `npm run build` | PASS | NextJS build tối ưu thành công. |

---

## 9. Git status cuối

```bash
?? docs/qa/ACCOUNTING_MODULE_FULL_AUDIT_REPORT.md
?? scripts/qa-accounting-audit.ts
```

## 10. Cam kết
* Chưa fix dòng code nào.
* Chưa commit/push.
* Bảo toàn 100% dữ liệu gốc.
