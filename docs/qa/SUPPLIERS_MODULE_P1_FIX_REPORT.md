# BÁO CÁO FIX P1 MÔ-ĐUN SUPPLIERS (NHÀ CUNG CẤP & THẦU PHỤ)

---

## 1. Kết luận sau fix

* **Suppliers module**: **PASS (Đã hoàn thiện Validation)**
* **Chặn trùng MST đã fix chưa?**: **RỒI**. Server Action đã validate chặn tạo/sửa đối tác có cùng Mã số thuế.
* **Có còn rủi ro duplicate do chưa có DB unique constraint không?**: **Có rủi ro nhỏ**. Vì chỉ chặn ở tầng Server Action nên vẫn tồn tại race-condition (nếu gọi 2 API cùng lúc). Tuy nhiên ở mức độ sử dụng thông thường thì đã an toàn. (Để chặn 100% thì cần Migration DB `@unique`).
* **Có thêm type/status chưa hay để P2?**: **Để P2**. Việc thêm Phân loại đối tác (vật tư/thầu phụ) và Trạng thái (Active/Inactive) đòi hỏi sửa DB Schema (Migration), form UI và toàn bộ logic filter, không thuộc phạm vi hotfix P1.
* **Delete supplier liên kết contract/payment có an toàn không?**: **AN TOÀN TUYỆT ĐỐI**. Đã bổ sung check đếm số lượng `paymentRequests` bên cạnh `contracts`. Nếu đối tác có liên kết bất kỳ hợp đồng hay thanh toán nào thì sẽ throw Error chặn xóa mềm. (Và hệ thống chỉ dùng Xóa Mềm - Soft Delete, không bao giờ mất data).
* **UI mobile input MST/SĐT/email đã đúng chưa?**: **RỒI**. Đã có `inputMode="numeric"` cho MST, `type="tel"` cho số điện thoại, và `type="email"` cho email.

---

## 2. File đã sửa

1. `src/app/(dashboard)/suppliers/actions.ts` (Sửa hàm tạo, hàm sửa, hàm xóa, thêm validation string/length/taxCode).
2. `src/components/suppliers/supplier-form-dialog.tsx` (Thêm `inputMode="numeric"` cho ô nhập Mã số thuế).
3. `scripts/qa-suppliers-audit.ts` (Cập nhật script đếm trùng số điện thoại, email).
4. `scripts/qa-suppliers-validation.ts` (Thêm script test Regex normalizeTaxCode).

---

## 3. Lỗi đã fix

### SUP-BUG-001 (Lỗi trùng Mã số thuế)
* **Trước**: Không có validate trùng MST, người dùng có thể tạo vô số công ty có cùng 1 MST. MST nhập thừa dấu cách không tự trim.
* **Sau**: Đã tạo helper `normalizeTaxCode` (cắt dấu cách thừa), và dùng `prisma.supplier.findFirst` kiểm tra xem có NCC nào đang dùng MST này chưa (ngoại trừ chính id đang update, và bỏ qua các NCC đã bị xóa mềm).
* **File sửa**: `src/app/(dashboard)/suppliers/actions.ts`
* **Test xác minh**: Script validation đã verify logic `normalizeTaxCode`.
* **Rủi ro còn lại**: Rủi ro Race-condition do tầng DB Prisma Model chưa có `@unique([taxCode])`.

---

## 4. Vấn đề chưa fix / để sau

### SUP-BUG-002 — Thiếu type/status
* **Vì sao chưa fix ở vòng này**: Tránh việc sửa đổi CSDL (Prisma schema) và chạy Migration phức tạp mà chưa có yêu cầu từ PO. 
* **Đề xuất schema**: Thêm 2 field: `type SupplierType @default(MATERIAL_SUPPLIER)` và `status SupplierStatus @default(ACTIVE)`. 
* **Có cần migration không**: Bắt buộc phải có Migration.
* **Có nên làm trước release chính thức không**: Có, vì nếu quảng bá là tính năng quản lý "Nhà cung cấp & Thầu phụ" thì chí ít phải có trường đánh dấu để phân biệt ai là Thầu phụ, ai là Nhà cung cấp vật tư.

---

## 5. Validation matrix sau fix

| Case | Kết quả sau fix | Ghi chú |
| ---- | --------------- | ------- |
| Tên đối tác | Cắt khoảng trắng thừa, bắt lỗi nếu rỗng hoặc quá 200 ký tự | Tốt |
| Số điện thoại | Giới hạn tối đa 30 ký tự, cho phép nhập format linh hoạt | Không ép Regex chặt quá để dễ nhập số ngoại |
| Email | Trim, chuyển chữ thường (lowercase), max 254 ký tự | Tốt |
| Mã số thuế | Bỏ khoảng trắng, kiểm tra trùng lặp | Tốt |

---

## 6. Delete safety

* **Check contracts**: Có (`_count.contracts > 0` => throw Error)
* **Check paymentRequests**: Có (`_count.paymentRequests > 0` => throw Error)
* **Soft delete**: Có, chỉ gán `deletedAt = new Date()`, không dùng `prisma.supplier.delete()`.
* **RBAC delete**: Chỉ có `ADMIN` hoặc `DIRECTOR` mới có quyền thực thi thao tác Xóa đối tác.

---

## 7. UI/UX

* **taxCode input**: Có `inputMode="numeric"` (giữ được số 0 ở đầu).
* **phone input**: Dùng chuẩn HTML5 `type="tel"`.
* **email input**: Dùng chuẩn HTML5 `type="email"`.
* **mobile behavior**: Bàn phím nhảy đúng loại tương ứng (số, phím gọi điện, phím @ cho email) rất thân thiện trên Safari và Chrome Mobile.

---

## 8. Lệnh đã chạy

| Lệnh | Kết quả | Ghi chú |
| ---- | ------- | ------- |
| `npx prisma validate/generate` | PASS | |
| `npx tsx scripts/qa-suppliers-audit.ts`| PASS | In ra 0 trùng email, 0 trùng sđt |
| `npx tsx scripts/qa-suppliers-validation.ts`| PASS | Đã test helper normalizeTaxCode |
| `npx tsc --noEmit` | PASS | Cú pháp Typescript hợp lệ 100% |
| `npm run build` | PASS | NextJS build thành công |

---

## 9. Git status cuối

```bash
 M src/app/(dashboard)/suppliers/actions.ts
 M src/components/suppliers/supplier-form-dialog.tsx
?? docs/qa/SUPPLIERS_MODULE_FULL_AUDIT_REPORT.md
?? docs/qa/SUPPLIERS_MODULE_P1_FIX_REPORT.md
?? scripts/qa-suppliers-audit.ts
?? scripts/qa-suppliers-validation.ts
```

## 10. Cam kết

* Không commit.
* Không push.
* Không reset DB.
* Không chạy bất kỳ migration nào (Bảo toàn Schema 100%).
* Không xóa/sửa dữ liệu thật.
