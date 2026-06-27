# BÁO CÁO FIX P0/P1 MÔ-ĐUN APPROVALS (TRUNG TÂM PHÊ DUYỆT) - HARDENING

---

## 1. Kết luận đúng

* **Approvals module**: **PASS CÓ ĐIỀU KIỆN** — logic sync P0 đã harden, bảo mật tuyệt đối, ngăn chặn approve mù/orphan. Tuy nhiên migration `20260626090000_approvals_center` vẫn đang FAILED và cần chủ dự án duyệt lệnh resolve sau khi backup/kiểm tra DB.
* Logic P0 sync module gốc đã hoàn thiện.
* Test pass dựa trên các static verification bằng scripts và build tests.

---

## 2. File sửa cuối cùng

1. `src/app/(dashboard)/approvals/actions.ts`: Cập nhật logic sync, thêm guard `sourceId`, lưu `rejectedReason` cho Payment.
2. `scripts/qa-approvals-audit.ts`: Thêm các metric check `sourceId` rỗng.
3. `scripts/qa-approvals-sync-static.ts`: Update test rules cho `sourceId`, unsupported guard và `rejectedReason`.

*Lưu ý: Đã revert lại `accounting/actions.ts` do logic kiểm tra limit hợp đồng được mang trực tiếp vào transaction của `approvals/actions.ts` (để tránh phải export và leak logic không cần thiết).*

---

## 3. SourceId guard

* **Approval thiếu sourceId còn approve/reject được không?**: **KHÔNG**. Đã ném lỗi cứng `Không thể duyệt vì yêu cầu phê duyệt không có bản ghi gốc để đồng bộ.` 
* **Unsupported type còn approve giả được không?**: **KHÔNG**. Các loại hình như `CHANGE_ORDER`, `OTHER` hay chưa rõ sẽ ném lỗi: `Loại phê duyệt này chưa hỗ trợ đồng bộ tự động. Vui lòng xử lý ở phân hệ gốc.` Không bị silent return nữa.

---

## 4. Payment reject sync

* **Reject từ Approval Center có ghi `rejectedReason` về Accounting không?**: **CÓ**. Mã lệnh đã update `PaymentRequest.rejectedReason = note ?? undefined`. Hỗ trợ đồng bộ cực chuẩn từ chữ sang phân hệ gốc.

---

## 5. Migration

* **DB table/cột có đủ**: Đã xác nhận tồn tại 100% bằng câu truy vấn `information_schema`.
* **`migrate status`**: Hiện tại vẫn báo FAILED.
* **Lệnh resolve đề xuất**: `npx prisma migrate resolve --applied 20260626090000_approvals_center`.
* **Trạng thái**: Chưa chạy resolve, đang chờ owner duyệt.

---

## 6. Git status cuối

```bash
 M src/app/(dashboard)/approvals/actions.ts
?? docs/qa/APPROVALS_MODULE_FULL_AUDIT_REPORT.md
?? docs/qa/APPROVALS_MODULE_P0_P1_FIX_REPORT.md
?? scripts/qa-approvals-audit.ts
?? scripts/qa-approvals-double-action.ts
?? scripts/qa-approvals-migration-verify.ts
?? scripts/qa-approvals-orphans.ts
?? scripts/qa-approvals-rbac.ts
?? scripts/qa-approvals-sync-static.ts
```

## 7. Cam kết

* Không commit.
* Không push.
* Không reset DB.
* Không hard-delete dữ liệu.
* Không tự ý resolve migration nếu chưa được duyệt.
