# BÁO CÁO KIỂM TRA (AUDIT) TOÀN DIỆN MÔ-ĐUN SUPPLIERS (NHÀ CUNG CẤP & THẦU PHỤ)

---

## 1. Kết luận

* **Suppliers module**: **PASS CÓ ĐIỀU KIỆN (Mức độ MVP)**
* **Sẵn sàng cho sản xuất chưa?**: Có thể dùng ngay cho nhu cầu cơ bản, nhưng thiếu nhiều tính năng nâng cao (như phân loại NCC/Thầu phụ).
* **Rủi ro lớn nhất là gì?**: 
  1. Không có validation chống trùng **Mã số thuế (taxCode)** ở cả DB và API.
  2. Không có trường `type` (Phân loại: Vật tư / Thầu phụ thi công / Dịch vụ), tất cả gom chung vào 1 bảng `Supplier` phẳng.
  3. Không có cờ `status` (Active/Inactive/Blacklist), chỉ có xóa mềm (`deletedAt`).

---

## 2. Phạm vi đã kiểm tra

* **Routes**: `/suppliers`. (Không có routes riêng cho `/vendors` hay `/subcontractors`).
* **Components**: `suppliers-workspace.tsx`, `supplier-form-dialog.tsx`, `supplier-detail-drawer.tsx`.
* **API/actions**: `src/app/(dashboard)/suppliers/actions.ts` (Next.js Server Actions).
* **Prisma models**: Bảng `Supplier` toàn cục (không gắn với `projectId`).
* **RBAC**: `getSupplierPermissions` trong `suppliers-permissions.ts`.
* **Cross-module links**: `Contract`, `PaymentRequest` sử dụng `Supplier`.
* **UI/UX**: Danh sách Card lưới cho Desktop và Mobile, Form nhập liệu.

---

## 3. Sơ đồ luồng

* **Supplier list flow**: Lấy toàn bộ Supplier chưa xóa (`deletedAt: null`). Load dữ liệu 1 lần (Client-side search/filter).
* **Create/Update flow**: Điền Form -> Gọi Server Action (`createSupplier` / `updateSupplier`) -> Kiểm tra RBAC -> Insert/Update DB -> `revalidatePath`.
* **Delete flow**: Chỉ ADMIN / DIRECTOR mới được xóa. Xóa mềm bằng `deletedAt = now()`. Chặn xóa nếu đang có `Contract` liên kết (`contracts > 0`).

---

## 4. Dữ liệu hiện tại

| Metric | Count / Kết quả |
| ------ | --------------: |
| Tổng số Suppliers | 8 |
| Active (chưa bị xóa) | 8 |
| Deleted (xóa mềm) | 0 |
| Supplier thiếu thông tin | 0 (tất cả có mã và tên) |
| Supplier trùng MST/Tên | 0 |
| Có Hợp đồng liên kết | 4 |
| Có Thanh toán liên kết | 3 |
| Dữ liệu rác (prefix QA_) | 0 |

---

## 5. RBAC matrix

| Role/User | View | Create | Update | Delete | Ghi chú |
| --------- | ---- | ------ | ------ | ------ | ------- |
| ADMIN / DIRECTOR | ✅ | ✅ | ✅ | ✅ | Full quyền |
| MANAGER / ACCOUNTANT | ✅ | ✅ | ✅ | ❌ | Không được xóa |
| STAFF / ENGINEER | ✅ | ❌ | ❌ | ❌ | Kể cả CHT cũng chỉ được xem vì Supplier là global dictionary. |
| Người lạ / Chưa login | ❌ | ❌ | ❌ | ❌ | Bị văng ra login |

*Lưu ý: Supplier không chia theo Project, đây là danh bạ đối tác chung của toàn công ty.*

---

## 6. Validation matrix

| Case | Kết quả hiện tại | Severity | Ghi chú |
| ---- | ---------------- | -------- | ------- |
| Tên rỗng | Chặn | NONE | Validate API tốt |
| Trùng mã đối tác | Chặn | NONE | Bắt lỗi `P2002` Prisma |
| Trùng mã số thuế | **Lọt** | MEDIUM | Không có Unique constraint cho taxCode |
| Tên/MST quá dài | Lọt | LOW | Chưa có limit length server-side |
| Email sai định dạng | Lọt | LOW | Chỉ normalize, không check RegEx ở server |

---

## 7. Cross-module matrix

| Module | Liên kết | Kết quả | Severity | Ghi chú |
| ------ | -------- | ------- | -------- | ------- |
| Contracts | `supplierId` | Tốt | NONE | Nếu có Hợp đồng, chặn Delete Supplier |
| Payments | `PaymentRequest` qua Contract | Tốt | NONE | |
| Materials | Vật tư nhập kho | Chưa liên kết | NONE | Hiện tại Form Vật tư không bắt chọn NCC |

---

## 8. UI/UX matrix

| Khu vực | Vấn đề | Viewport | Severity | Ghi chú |
| ------- | ------ | -------- | -------- | ------- |
| Danh sách đối tác | Không có thẻ phân loại (Type) | Tất cả | MEDIUM | Do DB không có trường Type |
| Search/Filter | Load tất cả, không có Pagination Server | Tất cả | LOW | Data ít thì siêu mượt, data >10,000 sẽ lag |
| Input Mobile | Form Input Type Number | Mobile | LOW | Ô SĐT dùng `type="tel"`, Email dùng `type="email"`, rất tốt. Mức độ hoàn thiện cao. |

---

## 9. Danh sách lỗi / Hạn chế phát hiện

### SUP-BUG-001 — Thiếu Validation trùng Mã số thuế
* **Severity**: MEDIUM
* **Khu vực**: API / DB
* **Cách tái hiện**: Tạo 2 NCC với cùng 1 mã số thuế.
* **Kết quả hiện tại**: Hệ thống cho phép tạo.
* **Kết quả mong muốn**: Báo lỗi "Mã số thuế đã tồn tại".
* **Phương án fix đề xuất**: Thêm check `findFirst({ where: { taxCode } })` trong action `createSupplier`.

### SUP-BUG-002 — Thiếu phân loại Đối tác (Nhà cung cấp / Thầu phụ)
* **Severity**: LOW (Về mặt kỹ thuật) / MEDIUM (Về mặt nghiệp vụ)
* **Khu vực**: DB / UI
* **Kết quả hiện tại**: Tất cả là `Supplier`, không phân biệt được ai cấp vật tư, ai thi công.
* **Phương án fix đề xuất**: Thêm field `type` Enum (MATERIAL, SUBCONTRACTOR, SERVICE) vào Prisma schema.

---

## 10. P0/P1/P2 plan

### P0 — Bắt buộc fix ngay
*(Không có lỗi P0 nào. Data không bị leak, không bị xóa bậy)*

### P1 — Fix trước UAT
* Bổ sung chặn trùng Mã số thuế ở Server Action.

### P2 — Tối ưu sau
* Bổ sung trường `type` (Phân loại) và `status` (Hoạt động/Ngừng/Blacklist) vào Model Supplier.
* Bổ sung Pagination Server-side khi số lượng đối tác vượt quá 1000.
* Liên kết Supplier vào luồng Nhập kho vật tư.

---

## 11. Lệnh đã chạy

| Lệnh | Kết quả | Ghi chú |
| ---- | ------- | ------- |
| `npx prisma validate/generate` | PASS | |
| `npx tsx scripts/qa-suppliers-audit.ts`| PASS | Script đọc data, không sửa gì |
| `npx tsc --noEmit` | PASS | |
| `npm run build` | PASS | |

---

## 12. Git status cuối

```bash
 M scripts/qa-materials-rbac.ts
 M src/components/material-request/material-request-detail.tsx
 M src/components/material-request/material-request-form.tsx
 M src/components/materials/material-form-dialog.tsx
 M src/components/materials/transaction-form-dialog.tsx
 M src/lib/materials/materials-permissions.ts
?? docs/qa/MATERIALS_MODULE_FULL_AUDIT_REPORT.md
?? docs/qa/MATERIALS_MODULE_P1_FIX_REPORT.md
?? docs/qa/SUPPLIERS_MODULE_FULL_AUDIT_REPORT.md
?? scripts/qa-materials-audit.ts
?? scripts/qa-materials-rbac.ts
?? scripts/qa-materials-role-map.ts
?? scripts/qa-materials-ui-static.ts
?? scripts/qa-suppliers-audit.ts
```

## 13. Cam kết
* Chưa fix code ở Suppliers module.
* Chưa commit/push.
* Không reset DB / xóa dữ liệu.
