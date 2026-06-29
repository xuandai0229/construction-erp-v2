# FIELD_PROGRESS_PHASE3_2B_UI_GUARD_VALIDATION_REPORT

**Date**: 2026-06-11
**Phase**: Phase 3.2B - UI Guard & Server Validation for Volume Input
**Status**: 🟢 COMPLETE

## 1. Files changed
- `src/lib/field-progress/volume-guard.ts` (New file)
- `src/app/(dashboard)/projects/[id]/field-progress/daily/actions.ts`
- `src/components/field-progress/daily-entry-table.tsx`
- `scripts/qa-field-progress-volume-guard-test.ts` (New file)

## 2. Guard rules implemented

| Rule | Frontend | Backend | Status |
| ---- | -------- | ------- | ------ |
| designQuantity <= 0 | Show "Chưa có khối lượng thiết kế", tính `%` = null | Cho phép lưu DRAFT, Block cứng SUBMIT | ✅ Implemented |
| percent <= 90 | Normal blue UI | Allow Save/Submit | ✅ Implemented |
| percent > 90 và <= 100 | Amber "Gần hết KL" warning | Allow Save/Submit | ✅ Implemented |
| percent > 100 và <= 110 | Red "Vượt KL (100-110%)" hoặc "Cần lý do" | Block SUBMIT nếu không có ghi chú >= 10 ký tự | ✅ Implemented |
| percent > 110 | Red "Vượt thiết kế" hoặc "Chặn gửi" | Block cứng SUBMIT nếu không có ghi chú. Cảnh báo đỏ nếu có ghi chú. | ✅ Implemented |

## 3. UI behavior
- **DRAFT vượt 110%**: Khuyến khích user công trường nhập nháp nhanh chóng nên **được phép lưu tạm**. UI sẽ hiển thị cảnh báo đỏ rực (`bg-red-50/40`) và thêm badge `Vượt thiết kế` hoặc `Cần lý do` cạnh ô input, nhưng không chặn action save DRAFT.
- **SUBMITTED vượt 110%**: Nếu gửi đi (SUBMIT) mà thiếu ghi chú dài hơn 10 ký tự, UI sẽ hiển thị huy hiệu đỏ `Chặn gửi` cạnh input. Action sẽ throw lỗi.
- **Vượt 100% nhưng <=110%**: Tương tự, cảnh báo `Cần lý do`, nếu nhấn gửi sẽ báo lỗi.
- **designQuantity = 0**: Giao diện không báo `Infinity` hay `NaN` mà trả về khoảng trắng `-` tại phần trăm `%`. Cảnh báo `Chưa có khối lượng thiết kế` hiển thị rõ. DRAFT được, SUBMITTED bị block.
- **Mobile card**: Thêm badge cảnh báo đỏ, ô nhập khối lượng có viền/nền đỏ. Tỷ lệ "% sau nhập" và luỹ kế chuyển sang text đậm màu đỏ `text-red-600`.

## 4. Server validation
- **Tính projected cumulative**: Server dùng `prisma.fieldProgressEntry.groupBy` để tính tổng số lượng `_sum: { quantity }` từ các records lịch sử (`deletedAt: null` và `entryDate < start`). Con số này cộng với `todayQuantity` do Client truyền lên để ra `projectedCumulative`.
- **Tránh double count update existing entry**: Việc truy vấn `lt: start` thay vì `<= start` đảm bảo luỹ kế lịch sử KHÔNG lấy cả record của ngày hiện tại vào, vì vậy khi edit record hôm nay thì sẽ không bị cộng đúp.
- **Dùng field note nào**: Hỗ trợ quét linh hoạt cả 3 field (`note`, `issueNote`, `proposalNote`). Nếu ít nhất 1 field chứa text >= 10 ký tự (sau khi trim), hệ thống pass.
- **Error tiếng Việt**: Lỗi server-side ném ra chuẩn xác câu: *"Khối lượng sau khi gửi vượt giới hạn cho phép. Vui lòng nhập lý do phát sinh tối thiểu 10 ký tự hoặc điều chỉnh lại số liệu."*

## 5. Test result

Toàn bộ script `qa-field-progress-volume-guard-test.ts` đã chạy và khớp hoàn toàn logic.

| Test | Expected | Actual | Pass/Fail |
| ---- | -------- | ------ | :-------: |
| OK (70%) | OK, Submit: true | OK, Submit: true | ✅ PASS |
| NEAR_LIMIT (95%) | NEAR_LIMIT, Submit: true | NEAR_LIMIT, Submit: true | ✅ PASS |
| 105% DRAFT no note | REQUIRE_NOTE, Submit: true | REQUIRE_NOTE, Submit: true | ✅ PASS |
| 105% SUBMITTED no note | REQUIRE_NOTE, Submit: false | REQUIRE_NOTE, Submit: false | ✅ PASS |
| 105% SUBMITTED with note | REQUIRE_NOTE, Submit: true | REQUIRE_NOTE, Submit: true | ✅ PASS |
| 120% DRAFT no note | OVER_DESIGN, Submit: false | OVER_DESIGN, Submit: false | ✅ PASS |
| 120% SUBMITTED no note | BLOCK_SUBMIT, Submit: false | BLOCK_SUBMIT, Submit: false | ✅ PASS |
| 120% SUBMITTED with note | OVER_DESIGN, Submit: true | OVER_DESIGN, Submit: true | ✅ PASS |
| Design = 0 DRAFT | NEED_DESIGN_QUANTITY, Submit: false | NEED_DESIGN_QUANTITY, Submit: false | ✅ PASS |
| Negative quantity check | OK, Submit: true | OK, Submit: true | ✅ PASS |

## 6. Build result
- `npx tsx scripts/qa-field-progress-db-audit.ts` + 3 Test scripts: ✅ PASS 100%
- `npx tsc --noEmit`: ✅ PASS
- `npm run build`: ✅ PASS (Exit code: 0)

## 7. Not done / deferred
- Chưa thêm unique constraint (Chờ thảo luận nghiệp vụ).
- Chưa xử lý 5 orphan SUBMITTED (Đã fix UI Leak thì orphan không ảnh hưởng cây WBS, nhưng data vẫn chờ xử lý).
- Chưa tối ưu performance groupBy cho các màn hình frontend (Sẽ làm ở Phase 3.4).
- Chưa xử lý rò rỉ UI (UI leak parent soft-delete) (Sẽ làm ở Phase 3.3).
- Chưa thêm manager approval workflow phức tạp.

## 8. Final conclusion
- **Người dùng còn có thể submit nhầm quantity 1000 mà không lý do không?** **KHÔNG THỂ.** Hệ thống server action sẽ chặn cứng toàn bộ lệnh SUBMIT nếu `percent > 100` mà không tìm thấy lý do dài ít nhất 10 ký tự.
- **Có thể lưu DRAFT vượt bất thường không?** **CÓ.** Kỹ sư có thể nhập DRAFT thả ga kể cả nhập sai hay vội vã. Điều kiện ngoài công trường thường thiếu thời gian, hệ thống sẽ chớp đỏ nhưng vẫn lưu lại để tối về chỉnh sửa. Tuy nhiên, gửi báo cáo chính thức thì bắt buộc phải giải trình hoặc sửa lại.
- **Có thể sang Phase 3.3 UI/UX Responsive Polish không?** **RẤT SẴN SÀNG.** Hệ thống Input Validation đã đạt độ trưởng thành cực kỳ cao và hoàn toàn an toàn cho DB.
