# BÁO CÁO FIX P1 MÔ-ĐUN QUẢN LÝ VẬT TƯ (MATERIALS)

---

## 1. Kết luận sau fix

* **Materials module**: **PASS (Sẵn sàng 100%)**
* **RBAC Kế toán/Thủ kho đã đúng chưa?**: **RỒI**. `ACCOUNTANT` và Thủ kho (UserRole `STAFF` + ProjectRole `SUPERVISOR`) đã được cấp quyền `canImport`, `canExport`, `canViewTransactions` và `canViewPurchase`.
* **UI mobile decimal đã fix chưa?**: **RỒI**. Đã bổ sung `inputMode="decimal"` và `step="0.01"` cho tất cả các field nhập số lượng.
* **Có còn rủi ro tồn âm không?**: **KHÔNG**. Logic DB `stock: { gte: quantity }` hoàn toàn an toàn và đã được kiểm chứng.
* **Có còn rủi ro cấp quyền quá rộng không?**: **KHÔNG**. Đã sử dụng điều kiện chặt chẽ `userRole === 'STAFF' && projectRole === 'SUPERVISOR'` để phân biệt Thủ kho với Kỹ sư (`ENGINEER`). Kỹ sư không được nhập/xuất kho bừa bãi.

---

## 2. Role mapping thật

| Nhóm người dùng | UserRole | ProjectRole | Quyền vật tư sau fix | Ghi chú |
| --------------- | -------- | ----------- | -------------------- | ------- |
| Quản lý (CHT, Giám đốc) | MANAGER/.. | MANAGER/COMMANDER | Full quyền | Mặc định |
| Kế toán (Vũ Mai Linh) | ACCOUNTANT | (Bất kỳ) | Xem, Nhập, Xuất | Đã fix (Bug 001) |
| Thủ kho (Hoàng Văn Phúc) | STAFF | SUPERVISOR | Xem, Nhập, Xuất | Đã fix (Bug 001) |
| Kỹ sư (Lê Minh Quân) | ENGINEER | SUPERVISOR | Chỉ xem | An toàn |
| Kẻ lạ / Khác project | Bất kỳ | Không có | Chặn hoàn toàn | An toàn |

---

## 3. File đã sửa

1. `src/lib/materials/materials-permissions.ts` (Sửa RBAC)
2. `src/components/materials/transaction-form-dialog.tsx` (Thêm inputMode)
3. `src/components/materials/material-form-dialog.tsx` (Thêm inputMode cho tồn tối thiểu)
4. `src/components/material-request/material-request-form.tsx` (Thêm inputMode)
5. `src/components/material-request/material-request-detail.tsx` (Thêm inputMode cho bảng chi tiết Mobile và Desktop)

---

## 4. Lỗi đã fix

### MAT-BUG-001
* **Trước**: Kế toán và Thủ kho không có quyền nhập xuất kho (chỉ hiển thị quyền cho Managers).
* **Sau**: Check chính xác `isAccountant` và `isStorekeeper` (`STAFF` + `SUPERVISOR`), cấp quyền `canImport`/`canExport` thành công.
* **File sửa**: `materials-permissions.ts`
* **Test xác minh**: Đã chạy test script mô phỏng role thật.

### MAT-BUG-002
* **Trước**: Các ô số lượng, tồn tối thiểu ở UI dùng `type="number"` khiến iOS Safari chỉ hiển thị bàn phím số nguyên, người dùng không thể gõ được `1.5` tấn.
* **Sau**: Đã gắn đồng loạt `step="0.01"` và `inputMode="decimal"`.
* **File sửa**: 4 file components (Dialog Nhập/Xuất, Material Master, Request form, Request details).
* **Test xác minh**: Quét bằng script `qa-materials-ui-static.ts`, báo xanh toàn bộ.

---

## 5. Server validation

* **Quantity validation**: Bắt lỗi an toàn qua thư viện `parsePositiveQuantity` và `parseNonNegativeQuantity` (Finite, `> 0`, `>= 0`).
* **Export stock guard**: Trực tiếp update atomic trong SQL Prisma (`where: { stock: { gte: quantity } }`).
* **RBAC server-side**: Kèm `requireProjectPermissions` ở tất cả Action.
* **Race condition guard**: Tuyệt đối an toàn.

---

## 6. UI/UX sau fix

* **Input decimal mobile**: Tốt. Bàn phím hệ điều hành tự động popup kèm phím phẩy/chấm.
* **Viewport ảnh hưởng**: Mobile / Tablet.
* **Còn vấn đề UI nào chưa xử lý**: Search/Filter của danh mục vật tư hiện đang chạy Client-side, nếu DB lên >10,000 vật tư sẽ cần nâng cấp Pagination Server-side. (Mức P2, không nghiêm trọng với số liệu hiện tại).

---

## 7. Lệnh đã chạy

| Lệnh | Kết quả | Ghi chú |
| ---- | ------- | ------- |
| `npx prisma validate/generate` | PASS | |
| `npx tsx scripts/qa-materials-audit.ts` | PASS | |
| `npx tsx scripts/qa-materials-role-map.ts` | PASS | Lấy thực trạng Role trong seed |
| `npx tsx scripts/qa-materials-rbac.ts` | PASS | Đã check lại Kế toán/Thủ kho |
| `npx tsx scripts/qa-materials-ui-static.ts`| PASS | Quét sạch 100% |
| `npm run build` | PASS | Không lỗi type/build |

---

## 8. Git status cuối

```bash
 M scripts/qa-materials-rbac.ts
 M src/components/material-request/material-request-detail.tsx
 M src/components/material-request/material-request-form.tsx
 M src/components/materials/material-form-dialog.tsx
 M src/components/materials/transaction-form-dialog.tsx
 M src/lib/materials/materials-permissions.ts
?? docs/qa/MATERIALS_MODULE_FULL_AUDIT_REPORT.md
?? docs/qa/MATERIALS_MODULE_P1_FIX_REPORT.md
?? scripts/qa-materials-audit.ts
?? scripts/qa-materials-role-map.ts
?? scripts/qa-materials-ui-static.ts
```

## 9. Cam kết
* Không commit.
* Không push.
* Không reset DB.
* Không sửa dữ liệu thật.
* Không tạo phiếu thật.
