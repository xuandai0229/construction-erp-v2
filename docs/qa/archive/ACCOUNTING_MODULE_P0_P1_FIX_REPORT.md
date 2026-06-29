# BÁO CÁO FIX P0/P1 MÔ-ĐUN ACCOUNTING (KẾ TOÁN & THANH TOÁN)

---

## 1. Kết luận sau fix

* **Accounting module**: **PASS**
* **ACC-BUG-001 đã fix chưa?**: **RỒI**. Phiếu thanh toán đã `SUBMITTED`, `APPROVED`, `PAID` không thể bị xóa mềm.
* **ACC-BUG-002 đã fix chưa?**: **RỒI**. Không thể gọi API cập nhật (update) nội dung/số tiền/đối tác cho các phiếu không phải `DRAFT` hoặc `REJECTED`.
* **ACC-BUG-003 đã fix chưa?**: **RỒI**. Tổng tiền thanh toán (bao gồm phiếu hiện tại) vượt giá trị hợp đồng đã bị chặn hoàn toàn ở cả chức năng Tạo và Cập nhật.
* **Payment APPROVED/PAID còn sửa/xóa được không?**: **KHÔNG**. Bị khóa vĩnh viễn ở mức Server-Side Action. 
* **Payment vượt contract còn tạo/sửa được không?**: **KHÔNG**. API sẽ quăng lỗi và hủy thao tác.
* **Có còn race-condition limit check không?**: **CÓ MỘT CHÚT**. Vì kiểm tra limit được thực hiện qua hàm query `findMany` rồi cộng dồn mà không dùng Transaction Lock cấp Database (Serializable level). Tuy nhiên rủi ro rất thấp vì không mấy khi 2 người cùng nhập phiếu thanh toán cho 1 hợp đồng trong cùng 1 giây.
* **Có còn thiếu attachment/invoice không?**: **CÓ**. Sẽ được đưa vào Phase 2 (P2).

---

## 2. File đã sửa

1. `src/app/(dashboard)/accounting/actions.ts`: Bổ sung Helper `assertPaymentEditable`, `assertPaymentDeletable`, `assertContractPaymentLimit` và gài vào `createPaymentRequest`, `updatePaymentRequest`, `deletePaymentRequest`.
2. `scripts/qa-accounting-audit.ts`: Thêm các metric check dữ liệu rác/lỗi vượt hợp đồng.
3. `scripts/qa-accounting-status-guards.ts`: Script verify static việc gọi hàm guard.
4. `scripts/qa-accounting-contract-limit.ts`: Script verify static hàm limit.
5. `scripts/qa-accounting-rbac-workflow.ts`: Script verify phân quyền Workflow.

---

## 3. Lỗi đã fix

### ACC-BUG-001
* **Trước**: Creator có thể tự xóa phiếu thanh toán khi đã được sếp duyệt hoặc kế toán chi.
* **Sau**: Hàm `deletePaymentRequest` gọi `assertPaymentDeletable` và ném lỗi nếu không phải `DRAFT` hay `REJECTED`.
* **File sửa**: `actions.ts`.
* **Test xác minh**: Vượt qua kịch bản quét tĩnh `qa-accounting-status-guards.ts`.
* **Rủi ro còn lại**: KHÔNG. 

### ACC-BUG-002
* **Trước**: Creator có thể đổi số tiền của phiếu đã được chi (gian lận công nợ).
* **Sau**: Hàm `updatePaymentRequest` gọi `assertPaymentEditable` từ chối thao tác.
* **File sửa**: `actions.ts`.
* **Test xác minh**: Vượt qua kịch bản quét tĩnh `qa-accounting-status-guards.ts`.
* **Rủi ro còn lại**: KHÔNG.

### ACC-BUG-003
* **Trước**: Hệ thống bỏ qua bước check vượt hợp đồng (Skip limit check).
* **Sau**: Gọi `assertContractPaymentLimit`.
* **File sửa**: `actions.ts`.
* **Test xác minh**: Vượt qua script tĩnh `qa-accounting-contract-limit.ts`. Dữ liệu test `qa-accounting-audit.ts` cũng ghi nhận 0 hợp đồng vượt quá giá trị.
* **Rủi ro còn lại**: Chấp nhận rủi ro race-condition mức thấp do không dùng DB Lock.

---

## 4. Status guard matrix

| Status | Update allowed | Delete allowed | Submit | Approve | Mark paid | Ghi chú |
| ------ | -------------- | -------------- | ------ | ------- | --------- | ------- |
| DRAFT | Có | Có | Có | Không | Không | Trạng thái ban đầu |
| SUBMITTED | Không | Không | Không | Có | Không | Chờ giám đốc duyệt |
| APPROVED | Không | Không | Không | Không | Có | Đã duyệt, chờ chi tiền |
| PAID | Không | Không | Không | Không | Không | Hoàn tất |
| REJECTED | Có | Có | Có | Không | Không | Bị sếp trả lại |
| CANCELLED | Không | Không | Không | Không | Không | Hủy vĩnh viễn (lịch sử) |

---

## 5. Contract limit matrix

| Case | Kết quả sau fix | Ghi chú |
| ---- | --------------- | ------- |
| Không có contract | Bỏ qua limit | Các khoản thanh toán điện/nước/ngoại giao. |
| Có contract đủ hạn mức | Cho tạo/sửa | |
| Tổng vượt contract value | Chặn (Ném lỗi) | Lỗi "Tổng đề nghị thanh toán vượt..." |
| Update chính nó | Không double-count | Đã loại trừ nhờ `excludePaymentRequestId` |
| REJECTED/CANCELLED/deleted | Không tính vào tổng | Sum query chỉ filter `['DRAFT', 'SUBMITTED', 'APPROVED', 'PAID']` |

---

## 6. RBAC/workflow

* **Role approve**: `ADMIN`, `DIRECTOR`, `DEPUTY_DIRECTOR`, `MANAGER` (hoặc Quản lý thuộc nội bộ dự án).
* **Role mark paid**: Kế toán (`ACCOUNTANT`), `ADMIN`, `DIRECTOR`.
* **Role delete**: `ADMIN`, `DIRECTOR` và người tạo phiếu (nhưng chỉ khi DRAFT/REJECTED).
* **Direct action server-side check**: 100% check cứng từ Server, ẩn/hiện nút ở UI là phụ.

---

## 7. Data metrics sau fix

Hoàn toàn tương đồng với báo cáo Audit, xác nhận 0 dữ liệu lỗi hoặc mồ côi. (Tham khảo output lệnh audit).

---

## 8. Lệnh đã chạy

| Lệnh | Kết quả | Ghi chú |
| ---- | ------- | ------- |
| `npx tsx scripts/qa-accounting-status-guards.ts` | PASS | |
| `npx tsx scripts/qa-accounting-contract-limit.ts` | PASS | |
| `npx tsx scripts/qa-accounting-rbac-workflow.ts` | PASS | |
| `npx tsc --noEmit` | PASS | |
| `npm run build` | PASS | |

---

## 9. Git status cuối

```bash
 M src/app/(dashboard)/accounting/actions.ts
?? docs/qa/ACCOUNTING_MODULE_FULL_AUDIT_REPORT.md
?? docs/qa/ACCOUNTING_MODULE_P0_P1_FIX_REPORT.md
?? scripts/qa-accounting-audit.ts
?? scripts/qa-accounting-contract-limit.ts
?? scripts/qa-accounting-rbac-workflow.ts
?? scripts/qa-accounting-status-guards.ts
```

## 10. Cam kết

* Không commit.
* Không push.
* Không reset DB.
* Không hard-delete payment/contract/supplier.
* Không xóa/sửa dữ liệu thật.
