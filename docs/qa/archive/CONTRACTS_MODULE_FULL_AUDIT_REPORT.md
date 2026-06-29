# BÁO CÁO KIỂM TRA (AUDIT) TOÀN DIỆN MÔ-ĐUN CONTRACTS (QUẢN LÝ HỢP ĐỒNG)

---

## 1. Kết luận

* **Contracts module**: **PASS CÓ ĐIỀU KIỆN (Mức độ MVP)**
* **Sẵn sàng cho người dùng chưa?**: Có thể dùng tốt cho nhu cầu lưu trữ và ghi nhận hợp đồng cơ bản. Hệ thống xử lý số tiền lớn và quyền truy cập cực kỳ tốt.
* **Rủi ro lớn nhất là gì?**: Lỗi Delete Hợp đồng thiếu kiểm tra ràng buộc thanh toán thực tế (Chỉ check `paymentPlans` mà bỏ quên `paymentRequests`), dẫn đến rủi ro mồ côi Đề nghị thanh toán nếu hợp đồng bị xóa.

---

## 2. Phạm vi đã kiểm tra

* **Routes**: `/contracts`.
* **Components**: `contract-form-dialog.tsx`, `contract-detail-drawer.tsx`, `contracts-workspace.tsx`.
* **API/actions**: `src/app/(dashboard)/contracts/actions.ts` (Next.js Server Actions).
* **Prisma models**: Bảng `Contract` liên kết với `Project`, `Supplier`, `PaymentRequest`.
* **Money Logic**: Helper `contract-money-utils.ts` (format, text chữ).
* **RBAC**: `getContractPermissions` trong `contracts-permissions.ts`.

---

## 3. Sơ đồ luồng

* **Contract list flow**: Server action `getContractsData` tự động map user với `ProjectMember` để lọc hợp đồng, đảm bảo người dùng chỉ thấy hợp đồng của dự án mình được cấp quyền (hoặc toàn bộ nếu là Admin/Director/Accountant).
* **Create/Update flow**: Điền Form (Tiền được format realtime) -> Gọi Server Action `createContract/updateContract` -> Kiểm tra RBAC (chặn user không có quyền quản lý) -> Insert DB.
* **Delete flow**: Chỉ MANAGER/ADMIN/DIRECTOR mới xóa được. Xóa mềm (`deletedAt`), chặn xóa nếu có Kế hoạch thanh toán.

---

## 4. Dữ liệu hiện tại

| Metric | Count / Kết quả |
| ------ | --------------: |
| Tổng số Hợp đồng | 5 |
| Active (chưa bị xóa) | 5 |
| Deleted (xóa mềm) | 0 |
| Trùng số hợp đồng | 0 |
| Giá trị <= 0 / Lỗi dữ liệu | 0 |
| Hợp đồng có Thanh toán liên kết | 3 |
| Dữ liệu rác (prefix QA_) | 0 |

---

## 5. RBAC matrix

| Role/User | View | Create/Update | Delete | Ghi chú |
| --------- | ---- | ------------- | ------ | ------- |
| ADMIN / DIRECTOR | Toàn cục | Toàn cục | Toàn cục | Full quyền |
| ACCOUNTANT | Toàn cục | Toàn cục | Theo Dự án | Tạo/sửa mọi dự án nhưng không được tùy ý xóa |
| CHỈ HUY TRƯỞNG (MANAGER) | Theo Dự án | Theo Dự án | Theo Dự án | Full quyền trong nội bộ dự án |
| KỸ SƯ / NHÂN VIÊN | Theo Dự án | ❌ | ❌ | Chỉ được xem nội bộ dự án |
| Người lạ / Project khác | ❌ | ❌ | ❌ | Bị chặn an toàn từ truy vấn DB |

---

## 6. Money validation matrix

| Case | Kết quả hiện tại | Severity | Ghi chú |
| ---- | ---------------- | -------- | ------- |
| Nhập số <= 0 | Bị chặn | NONE | Server validate `value <= 0` hoặc `NaN` |
| Giá trị quá lớn (Overflow) | Bị chặn | NONE | Giới hạn `rawValue.length > 15` (999 nghìn tỷ), hoàn toàn nằm trong mức an toàn của Javascript Number (`9007 nghìn tỷ`). |
| Format tiền (VND) | Rất Tốt | NONE | Live format `1.000.000` và hiển thị text (Ví dụ: `≈ 1.5 tỷ đồng`). |
| Lưu trữ DB | Tốt | NONE | Dùng kiểu `Decimal(19,4)` không mất độ chính xác. |

---

## 7. Workflow/status matrix

| Case | Kết quả hiện tại | Severity | Ghi chú |
| ---- | ---------------- | -------- | ------- |
| Đổi trạng thái | Có Enum cơ bản | LOW | DRAFT, ACTIVE, COMPLETED, TERMINATED. Chưa có Approval Workflow phức tạp (như submit duyệt -> duyệt hợp đồng). Người có quyền sửa được phép tự đổi trạng thái. |
| Tính quá hạn (Overdue) | Tốt | NONE | Tự động tính toán dựa trên ngày endDate trong hàm `getContractDisplayStatus`. |

---

## 8. UI/UX matrix

| Khu vực | Vấn đề | Viewport | Severity | Ghi chú |
| ------- | ------ | -------- | -------- | ------- |
| Ô nhập Số tiền | Cực kỳ mượt | Mobile & Desktop | NONE | Dùng `inputMode="numeric"` và hiển thị chữ số tỷ đồng. |
| Chi tiết Hợp đồng | Thiếu thông tin Thanh toán | Tất cả | MEDIUM | `ContractDetailDrawer` chỉ hiện Thông tin chung & Giá trị, không hiện tab Thanh toán, chưa rõ đã trả bao nhiêu, còn nợ bao nhiêu. (Nghiệp vụ thanh toán đang nằm ở module Accounting riêng). |

---

## 9. Danh sách lỗi / Rủi ro phát hiện

### CON-BUG-001 — Xóa hợp đồng thiếu kiểm tra Đề nghị thanh toán (PaymentRequests)
* **Severity**: CRITICAL / HIGH
* **Khu vực**: API (Server Actions)
* **File liên quan**: `deleteContract` (`actions.ts`)
* **Cách tái hiện**: Hợp đồng đã được tạo `PaymentRequest`, sau đó Admin thực hiện chức năng Xóa hợp đồng.
* **Kết quả hiện tại**: Hệ thống chỉ check `contract._count.paymentPlans > 0` và bỏ qua `paymentRequests`. Hợp đồng bị xóa mềm thành công.
* **Hậu quả**: Để lại các "Đề nghị thanh toán mồ côi" (vẫn trỏ về contractId nhưng contract bị ẩn), gây lỗi thống kê hoặc crash UI.
* **Phương án fix đề xuất**: Thêm check `paymentRequests: true` vào khối đếm (`_count`) và báo lỗi "Không thể xóa hợp đồng đang có thanh toán liên kết."
* **Có cần fix ngay không**: Có. Bắt buộc fix P1.

### CON-BUG-002 — UI Chi tiết hợp đồng thiếu Tab công nợ/thanh toán
* **Severity**: MEDIUM
* **Khu vực**: UI (Contract Detail)
* **Phương án fix đề xuất**: Cần tích hợp hiển thị Tổng đã thanh toán, Tổng chưa thanh toán vào trang chi tiết hợp đồng để người dùng dễ theo dõi.

---

## 10. P0/P1/P2 plan

### P0 — Bắt buộc fix ngay
*(Không có lỗi P0 nào khiến hệ thống crash hoặc lộ dữ liệu giữa các công trình).*

### P1 — Fix trước UAT
* **CON-BUG-001**: Bổ sung chặn Xóa hợp đồng khi đã có `PaymentRequests`.

### P2 — Tối ưu sau
* Tích hợp UI hiển thị danh sách Thanh toán (Payments) vào bên trong Drawer chi tiết Hợp đồng.
* Bổ sung tính năng upload File mềm hợp đồng (Bản scan PDF).
* Đưa hợp đồng vào luồng Duyệt Ký (Approval Center).

---

## 11. Lệnh đã chạy

| Lệnh | Kết quả | Ghi chú |
| ---- | ------- | ------- |
| `npx prisma validate/generate` | PASS | |
| `npx tsx scripts/qa-contracts-audit.ts`| PASS | Script đọc data an toàn. |
| `npx tsc --noEmit` | PASS | Code Typescript hoàn toàn sạch. |
| `npm run build` | PASS | NextJS build tối ưu thành công. |

---

## 12. Git status cuối

```bash
?? docs/qa/CONTRACTS_MODULE_FULL_AUDIT_REPORT.md
?? scripts/qa-contracts-audit.ts
```

## 13. Cam kết
* Chưa fix bất kỳ dòng code nào.
* Chưa commit/push.
* Không reset DB / bảo toàn 100% dữ liệu gốc.
