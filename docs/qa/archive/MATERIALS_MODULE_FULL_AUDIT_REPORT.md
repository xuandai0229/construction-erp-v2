# BÁO CÁO KIỂM TRA (AUDIT) TOÀN DIỆN MÔ-ĐUN QUẢN LÝ VẬT TƯ (MATERIALS)

---

## 1. Kết luận

* **Materials module**: **PASS CÓ ĐIỀU KIỆN (Có 1 lỗi High RBAC)**
* **Sẵn sàng cho sản xuất chưa?**: Sẵn sàng nhưng **phải fix** quyền RBAC cho Thủ kho/Kế toán và UI Mobile Input trước khi release cho end-user.
* **Rủi ro lớn nhất là gì?**: Lỗi phân quyền (RBAC) trong thư viện `materials-permissions.ts`, dẫn đến việc nhân viên "Thủ kho" hoặc "Kế toán" không thể thực hiện Nhập/Xuất kho (nút Nhập/Xuất kho sẽ bị ẩn/chặn). Ngoài ra, trên Mobile có thể gặp khó khăn khi gõ số thập phân ở field số lượng (thiếu `inputMode="decimal"`).
* *Tin tốt*: Logic Tồn kho cực kỳ an toàn. Hoàn toàn KHÔNG THỂ BỊ TỒN ÂM do đã khoá race-condition bằng điều kiện SQL.

---

## 2. Phạm vi đã kiểm tra

* **Routes**: `/materials`, `/projects/[id]/material-requests`, `/api/materials` (chưa có API route riêng, đều qua Server Actions).
* **Components**: Form đề xuất vật tư, Table tồn kho, Dialog nhập/xuất kho, Material List, Form master data vật tư.
* **API/actions**: `actions.ts`, `material-request.ts`.
* **Prisma models**: `MaterialItem`, `ProjectMaterialStock`, `MaterialMovement`, `MaterialRequest`, `MaterialRequestItem`.
* **RBAC**: `materials-permissions.ts` và cơ chế check quyền Project.
* **Inventory logic**: `ledger.ts` (cực kỳ tốt).
* **UI/UX**: Responsive và Mobile Form Data Entry.
* **Performance**: Load toàn bộ (chưa phân trang API danh mục vật tư), nhưng hiện tại data ít nên chưa quá chậm.
* **Security**: Chống IDOR/XSS qua Server Actions.
* **Build/typecheck**: 100% Pass.

---

## 3. Sơ đồ luồng

* **Material master flow**: Tạo -> Gắn vào Project -> Lưu DB (chống trùng mã `projectId_code`).
* **Request flow**: Tạo Nháp -> Đề Xuất (REQUESTED) -> Đang Xử Lý (PROCESSING) -> Đã Cấp (ISSUED) -> Đã Nhận (RECEIVED).
* **Stock in/out flow**: Chọn vật tư -> Nhập số lượng > 0 -> Gọi Server Action `createMaterialTransaction` -> `applyMaterialMovement`.
* **Inventory balance flow**: `updateMany` tồn kho nếu `EXPORT` (kèm điều kiện `stock >= quantity` để chặn xuất âm) -> Tạo log `MaterialMovement`.

---

## 4. Dữ liệu hiện tại

| Metric | Count / Kết quả |
| ------ | --------------: |
| Materials | 11 |
| Material Requests | 2 |
| Transactions (Nhập) | 11 |
| Transactions (Xuất) | 11 |
| Negative stock | 0 |
| Orphan records | 0 |
| QA_MATERIALS_ leftovers | 0 |

---

## 5. RBAC matrix

| Role/User | View | Create Req | Approve Req | Stock In | Stock Out | Edit/Delete |
| --------- | ---- | ---------- | ----------- | -------- | --------- | ----------- |
| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| MANAGER (CHT/Giám đốc) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| KẾ TOÁN/THỦ KHO | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| STAFF Kỹ Sư | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Kẻ mạo danh/Project khác | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

*=> **LỖI RBAC**: Thủ kho/Kế toán đáng lẽ phải có quyền Nhập/Xuất kho.*

---

## 6. Inventory logic matrix

| Case | Kết quả hiện tại | Severity | Ghi chú |
| ---- | ---------------- | -------- | ------- |
| Xuất kho số lượng âm | Bị chặn (Throws `phải lớn hơn 0`) | NONE | Passed |
| Nhập ký tự NaN | Bị chặn | NONE | Passed |
| Nhập số quá lớn (Infinity) | Bị chặn (`isFinite` check) | NONE | Passed |
| Race Condition (Double click xuất kho nhanh) | Bị chặn | NONE | Logic `updateMany` kết hợp `gte` quá an toàn. |
| User cố API vào dự án B | Bị chặn 403 | NONE | Đã check IDOR. |

---

## 7. UI/UX matrix

| Khu vực | Vấn đề | Viewport | Severity | Ghi chú |
| ------- | ------ | -------- | -------- | ------- |
| Dialog Nhập/Xuất Kho | `input type="number"` không hiện bàn phím số thập phân trên iOS. | Mobile | HIGH | Cần thêm `inputMode="decimal"`. |
| Form Tạo Yêu Cầu Vật Tư | Tương tự Dialog kho (Thiếu decimal keyboard). | Mobile | HIGH | Khó bấm số thập phân `1.5`. |

---

## 8. Danh sách lỗi phát hiện

### MAT-BUG-001 — Lỗi phần quyền nhập xuất kho (RBAC)
* **Severity**: HIGH
* **Khu vực**: RBAC
* **File liên quan**: `src/lib/materials/materials-permissions.ts`
* **Cách tái hiện**: Login account có role `ACCOUNTANT` hoặc `STAFF`, mở màn vật tư.
* **Kết quả hiện tại**: Bị ẩn quyền Nhập, Xuất kho.
* **Kết quả mong muốn**: `ACCOUNTANT` và Thủ kho nên có quyền `canImport`, `canExport`.
* **Ảnh hưởng thực tế**: Tê liệt luồng nghiệp vụ thủ kho.
* **Phương án fix đề xuất**: Sửa file `materials-permissions.ts`.

### MAT-BUG-002 — Form nhập liệu thiếu Decimal Keyboard trên Mobile
* **Severity**: HIGH
* **Khu vực**: UI/UX
* **File liên quan**: `transaction-form-dialog.tsx`, `material-request-form.tsx`
* **Cách tái hiện**: Mở trên Safari/Chrome iOS, focus ô Số Lượng.
* **Kết quả hiện tại**: Bàn phím số mặc định của iOS có thể không có dấu phẩy/chấm.
* **Kết quả mong muốn**: Thêm thuộc tính `inputMode="decimal"`.

---

## 9. P0/P1/P2 plan

### P0 — Bắt buộc fix ngay
*(Không có, vì Tồn Kho không thể âm)*

### P1 — Fix trước UAT
* Sửa quyền `canImport`, `canExport` cho Thủ Kho / Kế Toán.
* Thêm `inputMode="decimal"` cho tất cả input số lượng.

### P2 — Tối ưu sau
* Phân trang danh mục vật tư.
* Lịch sử / Audit log thao tác duyệt phiếu.

---

## 10. Lệnh đã chạy

* `npx prisma validate`: PASS
* `npx prisma generate`: PASS
* `npx tsx scripts/qa-materials-audit.ts`: PASS (11 items, 0 lỗi).
* `npx tsx scripts/qa-materials-rbac.ts`: PASS, nhưng phát hiện được Bug logic thủ kho.
* `npm run build`: PASS 

---

## 11. Git status cuối

```bash
 M scripts/qa-materials-rbac.ts
?? scripts/qa-materials-audit.ts
```

## 12. Cam kết

* Chưa fix code.
* Chưa commit, chưa push.
* Không reset DB.
* Không xóa/sửa dữ liệu thật.
* Không tạo phiếu thật bằng script độc hại.
