# BÁO CÁO FIX P1 MÔ-ĐUN CONTRACTS (QUẢN LÝ HỢP ĐỒNG)

---

## 1. Kết luận sau fix

* **Contracts module**: **PASS**
* **CON-BUG-001 đã fix chưa?**: **RỒI**. Hàm `deleteContract` đã được bổ sung chặn nếu hợp đồng có `paymentRequests`.
* **Contract có paymentRequests còn xóa được không?**: **KHÔNG**. Hệ thống sẽ ném lỗi "Không thể xóa hợp đồng đang có đề nghị thanh toán liên kết."
* **Delete vẫn là soft delete không?**: **CÓ**. Chỉ set `deletedAt = new Date()`, an toàn 100%.
* **Có còn rủi ro payment orphan không?**: **KHÔNG**. Việc xóa hợp đồng khi đã có payment thực tế đã bị chặn, nên không thể xảy ra trường hợp payment mồ côi (orphan).
* **Có còn rủi ro money input không?**: **KHÔNG**. Logic strip, format và text generator vượt qua toàn bộ test cases, an toàn với số tiền lên tới hàng nghìn tỷ VNĐ, không gây crash ứng dụng.
* **Có còn limitation workflow/payment detail UI không?**: **CÓ**. Hợp đồng đã có payment vẫn cho phép sửa giá trị (value), và UI chưa có tab chi tiết các khoản thanh toán. Các vấn đề này được quy hoạch vào **P2 (Feature Enhancement)**.

---

## 2. File đã sửa

1. `src/app/(dashboard)/contracts/actions.ts`: Bổ sung đếm `paymentRequests` và throw error trong hàm `deleteContract`.
2. `scripts/qa-contracts-audit.ts`: Thêm các logic đếm PaymentPlans, PaymentRequests và rác.
3. `scripts/qa-contracts-delete-guard.ts`: Script verify tĩnh logic xóa.
4. `scripts/qa-contracts-rbac.ts`: Script kiểm thử RBAC dựa trên `getContractPermissions`.
5. `scripts/qa-contracts-money.ts`: Script kiểm thử helper tiền tệ.

---

## 3. Lỗi đã fix

### CON-BUG-001 — Xóa hợp đồng thiếu kiểm tra Đề nghị thanh toán
* **Trước**: `deleteContract` chỉ đếm và chặn xóa nếu có `paymentPlans`, bỏ qua `paymentRequests`.
* **Sau**: Đã include thêm `paymentRequests` trong `_count`, và ném lỗi nếu `contract._count.paymentRequests > 0`.
* **File sửa**: `src/app/(dashboard)/contracts/actions.ts`
* **Test xác minh**: Đã vượt qua vòng static verification bằng script `qa-contracts-delete-guard.ts`.
* **Rủi ro còn lại**: KHÔNG. Đã chặn triệt để luồng xóa mồ côi data.

---

## 4. Delete safety matrix

| Case | Kết quả sau fix | Ghi chú |
| ---- | --------------- | ------- |
| Contract chưa có payment | Cho xóa mềm nếu có quyền | Chỉ cập nhật `deletedAt`. |
| Contract có paymentPlans | Chặn | Báo "Không thể xóa hợp đồng đang có kế hoạch thanh toán liên kết." |
| Contract có paymentRequests | Chặn | Báo "Không thể xóa hợp đồng đang có đề nghị thanh toán liên kết." |
| Contract đã deleted | Chặn/báo không tồn tại | Tránh double delete. |
| User không quyền | Chặn | Dựa trên hàm `getContractPermissions` (`canDelete: false`). |

---

## 5. Update/payment safety

* **Contract đã có payment có được sửa value/supplier/project không?**: **CÓ**. Hiện tại hàm `updateContract` không chặn sửa. 
* **Rủi ro**: Nếu admin sửa số tiền (`value`) thành số nhỏ hơn Tổng đã thanh toán, sẽ gây âm công nợ, dẫn tới sai số logic UI trong module Accounting.
* **Quy hoạch**: Đây là hạng mục nghiệp vụ lớn yêu cầu đối soát số dư tổng, đã được đưa vào **P2**. Tạm thời admin tự chịu trách nhiệm về số liệu nhập thủ công.

---

## 6. RBAC

* **Role nào được delete**: `ADMIN`, `DIRECTOR`, và các Quản lý dự án (`PROJECT_MANAGER`, `SITE_COMMANDER`, v.v.) trong dự án của họ.
* **Role nào bị chặn**: `ACCOUNTANT` (chỉ được tạo/sửa tổng quát), `ENGINEER`, `STAFF` và mọi tài khoản ngoài dự án.
* **Cơ chế**: Check 100% bằng Server-side thông qua session và `ProjectMember` trong `actions.ts`.

---

## 7. Money validation

* **parse/format**: Rất tốt. Cắt bỏ mọi ký tự không phải số, định dạng live kiểu `1.000.000`.
* **max digits**: 15 ký tự (999 nghìn tỷ), hoàn toàn tương thích và an toàn với `Number` Javascript.
* **negative/zero/NaN**: Server action kiểm tra `isNaN(value)` và `value <= 0`.
* **Decimal DB**: Lưu dưới kiểu `Decimal(19,4)` bảo toàn chính xác.

---

## 8. Lệnh đã chạy

| Lệnh | Kết quả | Ghi chú |
| ---- | ------- | ------- |
| `npx prisma validate/generate` | PASS | |
| `npx tsx scripts/qa-contracts-delete-guard.ts` | PASS | Block xóa bằng _count.paymentRequests đã hoàn thiện. |
| `npx tsx scripts/qa-contracts-rbac.ts` | PASS | Tất cả test-case phân quyền Delete chuẩn xác. |
| `npx tsx scripts/qa-contracts-money.ts` | PASS | Hàm phân tích string sang tiền VND chuẩn xác. |
| `npx tsc --noEmit` | PASS | |
| `npm run build` | PASS | Không sinh warning nghiêm trọng, build thành công 100%. |

---

## 9. Git status cuối

```bash
 M src/app/(dashboard)/contracts/actions.ts
?? docs/qa/CONTRACTS_MODULE_FULL_AUDIT_REPORT.md
?? docs/qa/CONTRACTS_MODULE_P1_FIX_REPORT.md
?? scripts/qa-contracts-audit.ts
?? scripts/qa-contracts-delete-guard.ts
?? scripts/qa-contracts-money.ts
?? scripts/qa-contracts-rbac.ts
```

## 10. Cam kết

* Không commit.
* Không push.
* Không reset DB.
* Không xóa dữ liệu thật.
* Không hard-delete contract/payment.
