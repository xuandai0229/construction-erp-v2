# FIELD_PROGRESS_FULL_AUDIT_RECONCILE_CURRENT_STATE_REPORT

**Date**: 2026-06-11
**Objective**: Reconcile previous full audit findings with the actual active database state after Phase 3.1E.

## 1. Executive Summary
Báo cáo audit tổng thể trước đây đã **có sai lệch nghiêm trọng** do đếm cả dữ liệu đã bị soft-delete (`deletedAt IS NOT NULL`). 
Khi tách biệt dữ liệu active và soft-deleted, trạng thái hiện tại của DB **khớp hoàn toàn 100% với kỳ vọng sau Phase 3.1E**. 
Không có lỗi duplicate hay timezone nào đang active. Tuy nhiên, dự án đang bị lỗi build (P0) do script audit cũ sai cú pháp. Các đánh giá về UI/UX và Performance bottleneck vẫn hoàn toàn chính xác.

## 2. Active DB Audit (`deletedAt IS NULL`)

| Nhóm                                | Count |
| ----------------------------------- | ----: |
| Active duplicate itemId + entryDate |     0 |
| Active timezone issues              |     0 |
| Active orphan entries               |     5 |
| Active over-volume items            |     1 |
| Active approved over design         |     0 |
| Active zero/negative quantity       |     3 |

## 3. Soft-deleted Data Audit (`deletedAt IS NOT NULL`)

| Nhóm                             | Count |
| -------------------------------- | ----: |
| Soft-deleted timezone entries    |     1 |
| Soft-deleted duplicate remnants  |     3 |
| Soft-deleted orphan DRAFT        |     3 |
| Soft-deleted volume test entries |     1 |

## 4. Difference vs Previous Full Audit
Báo cáo cũ dùng `prisma.fieldProgressEntry.findMany()` **mà không lọc `where: { deletedAt: null }`**.
Hậu quả:
- **Duplicate**: Báo cáo cũ nói có 3 duplicate, thực tế đó là 3 bản ghi (tổng cộng 6 entries) **đã bị soft-delete** từ trước. Hiện tại KHÔNG CÓ duplicate active nào.
- **Timezone**: Báo cáo cũ đếm 1 lỗi lệch giờ (17:00:00Z), thực tế bản ghi đó **đã bị soft-delete** (từ Phase 3.1D). Không có lỗi timezone nào active.
- **Volume**: Báo cáo cũ báo "Cống tròn D1000" vượt 1770%, thực tế là do nó tính cả test entry 1000 khối lượng **đã soft-delete** trong Phase 3.1E. Lượng active thực sự của item đó hiện chỉ là 62 (103%).
- **Orphan**: Báo cáo cũ nói có 8 orphan, thực tế là 5 SUBMITTED (active) + 3 DRAFT (đã bị soft delete từ 3.1B).

=> Mọi số liệu dọn dẹp từ Phase 3.1A -> 3.1E đều đang bảo toàn hoàn hảo.

## 5. Build/Test Result

| Command | Pass/Fail | Error file | Có liên quan Field Progress không? | Có chặn release không? |
| ------- | --------- | ---------- | ---------------------------------- | ---------------------- |
| `npx tsc --noEmit` | **FAIL** | `scripts/qa-field-progress-db-audit.ts` (lỗi `_gt`) | Có | **CÓ** |
| `npm run build` | **FAIL** | Cùng nguyên nhân trên | Có | **CÓ** |

## 6. UI/UX Findings Still Valid
- **Master Table**: Tên danh mục dài bị cắt (truncation) không có tooltip.
- **Daily Input**: Mobile card-view hoạt động tốt, layout rất mượt. Cảnh báo lỗi giá trị âm và "Vượt KL" trực quan, dễ nhìn.
- **Summary Table**: Tên group name bị lặp lại ở từng con gây rối mắt.
- **Responsive**: Các viewport nhỏ (390px, 414px) hoạt động ổn định.

## 7. Logic/Performance Findings Still Valid
- **UI Leak**: Khi soft-delete hạng mục cha, các hạng mục con nhảy lên cấp Root trên Master/Summary table vì không tìm thấy node cha.
- **Timezone Logic**: `todayWorkDate()` trả về ngày hôm trước nếu gọi lúc 0h-7h sáng giờ VN.
- **Cache Staleness**: Thiếu revalidate path `/daily` và `/summary` trong các action mutation, bắt buộc người dùng F5.
- **Performance**: Trang Daily đang fetch toàn bộ historical entries vào RAM để tính luỹ kế.

## 8. Items NOT Safe To Fix Yet
- **5 Orphan SUBMITTED**: Cần quyết định nghiệp vụ (Xoá entry hay khôi phục item?).
- **Unique Constraint (`@@unique`)**: Chưa thể thêm. Nếu thêm sẽ chặn việc nhập nhiều phiếu (nhiều tổ, ca, mũi thi công) trong cùng một ngày. Cần chốt nghiệp vụ trước khi dùng partial unique index.
- **3 Active zero/negative quantity**: Cần xác minh xem có cho phép nhập khối lượng 0 không.

## 9. Corrected Fix Plan

### Phase 3.2 — UI Guard/Validation
Ngăn chặn và cảnh báo nhập vượt khối lượng thiết kế trên giao diện Daily (không ảnh hưởng tới CSDL).

### Phase 3.3 — UI/UX Responsive Polish
Bổ sung tooltip, dọn gọn bảng Summary, và sửa lỗi UI Leak khi soft-delete nhóm cha. Sửa lỗi syntax chặn build trong script audit.

### Phase 3.4 — Performance Optimization
Chuyển đổi tính toán luỹ kế sang `groupBy + _sum` DB thay vì Array.reduce trong RAM. Sửa bug `todayWorkDate()`.

### Phase 3.5 — DB Constraint Decision
Chỉ áp dụng Unique Constraint sau khi đã chốt nghiệp vụ về việc có cho phép chia tổ/ca trong cùng 1 ngày hay không.

## 10. Final Decision
- **Có còn lỗi P0 active không?** CÓ (Lỗi build tsc do script cũ). Không có lỗi P0 hỏng dữ liệu.
- **Có còn lỗi P1 active không?** KHÔNG có P1 hỏng DB. Còn P1 về UI leak và Cache.
- **Có được fix UI guard chưa?** RẤT SẴN SÀNG (Tiến hành Phase 3.2).
- **Có được thêm unique chưa?** CHƯA.
- **Có được build/PWA test chưa?** Chưa, phải xoá lỗi `_gt` trong script cũ trước.
