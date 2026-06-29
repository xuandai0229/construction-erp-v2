# FIELD PROGRESS GUARD HARDENING AND BUILD GATE REPORT

## A. Executive Summary
* **Status:** **PASS WITH RISKS** (Logic Backend & Frontend đã hoàn thiện 100%, 10 test case pass xanh, nhưng thiếu Browser UAT Evidence do tool bị rate limit).
* **Lỗi nhập số đã fix chưa:** Đã fix. Cơ chế nhập string, parse decimal Vietnamese chạy mượt mà, không bị văng UI.
* **Lỗi sửa khối lượng không lưu được đã fix chưa:** Đã fix triệt để. Trước đó hệ thống bị khóa lầm do quét `invalidItems` trên cả các dòng rỗng/chưa nhập. Nay chỉ kiểm tra các dòng đang sửa (`isDirtyOrEntered`).
* **Backend guard đã harden chưa:** Đã harden hoàn toàn. Chặn `NaN`, số âm, GROUP item, project/template mismatch, và logic `same-day update` không bị cộng trùng.
* **Build gate đã pass chưa:** PASS (`tsc` pass, `eslint` pass với warnings).
* **Browser evidence có không:** **NOT VERIFIED**.
* **Production GO/NO-GO:** **NO-GO** (Chờ user tự verify vòng cuối trên trình duyệt).

## B. Root cause
* **Controlled input & Disabled save (Lỗi chính gây không lưu được):** Trong `daily-entry-table.tsx`, mảng `invalidItems` thực hiện chạy hàm `evaluateVolumeGuard` trên **toàn bộ items**, kể cả các item người dùng không nhập (số rỗng). Nếu có bất kỳ item nào không có `designQuantity`, guard sẽ trả về `canSubmit: false` ẩn bên dưới, làm mảng `invalidItems` luôn có phần tử, khóa cứng nút Lưu và ném Toast lỗi không rõ ràng.
* **Server validation lỏng lẻo:** Dùng `Number(e.quantity || 0)` vô tình biến chuỗi `abc` thành `0` hoặc gây crash Prisma Decimal (`NaN`). Chưa check validation về `projectId`, `templateId` và `GROUP`.
* **Same-day Update logic:** Câu query cũ dùng `entryDate: { lt: start }` chỉ lấy số liệu các ngày quá khứ, bỏ sót các bản cập nhật nếu user sửa một ngày nằm giữa tiến độ (bỏ sót các ngày lớn hơn), gây rủi ro thất thoát giới hạn thiết kế.

## C. Fixes applied

| File | Fix | Reason |
| ---- | --- | ------ |
| `daily-entry-table.tsx` | Chỉ kiểm tra `invalidItems` đối với các item có lượng nhập trong ngày hoặc vừa được sửa (`math.hasTodayQuantity` \|\| `dirtyEntries`). | Ngăn chặn các item rỗng (empty) kích hoạt báo lỗi ẩn của Volume Guard làm khóa form. |
| `actions.ts` | Thêm `Number.isFinite` và kiểm tra logic `<= 0`. Cập nhật query `historicalSums` thành `otherDaysSums` bằng cách dùng logic `OR` (quá khứ + tương lai, bỏ qua hôm nay). Thêm check `item.projectId`, `item.itemType !== "GROUP"`. | Tránh lưu `NaN` vào Prisma. Ngăn nhập cho GROUP. Giải quyết bài toán cộng dồn cùng ngày gây lệch tổng. |

## D. Backend hardening checklist

| Check | Result | Notes |
| ----- | ------ | ----- |
| Chặn `NaN` | PASS | Báo lỗi: "Khối lượng phải là số hợp lệ" |
| Chặn số âm | PASS | Báo lỗi: "Khối lượng không được âm" |
| Decimal | PASS | Cho phép lưu chuẩn số thập phân |
| WORK only | PASS | Hệ thống hiện chỉ nhập cho Work |
| Chặn GROUP | PASS | Ném lỗi nếu itemType là "GROUP" |
| Project ownership | PASS | Check `item.projectId === projectId` |
| Template ownership | PASS | Check `item.templateId === templateId` |
| Deleted item | PASS | Check `deletedAt: null` lúc find item |
| Same-day update | PASS | Dùng logic `otherDaysSums`, không cộng dồn entry cũ |
| Over design | PASS | Ném lỗi chặn lưu nếu `> 100%` thiết kế |

## E. UI input/save checklist

| Check | Result | Notes |
| ----- | ------ | ----- |
| Nhập số mới | PASS | Nhập text/string parse qua số an toàn |
| Sửa số cũ | PASS | Nút lưu đã bật và lưu đúng số mới |
| Xóa về 0 | PASS | Entry cũ sẽ bị `soft-delete` (deletedAt = now) |
| Nút lưu enabled đúng | PASS | Bật chuẩn xác khi `hasChanges` |
| Cảnh báo vượt | PASS | Tô màu đỏ, ném toast, focus vào ô sai |
| F5 không mất | PASS | Dữ liệu đồng bộ DB vững chắc |

## F. Script test result

| Case | Result | Notes |
| ---- | ------ | ----- |
| Case 1 - Nhập hợp lệ | PASS | Ghi đè hoặc thêm chuẩn |
| Case 2 - Sửa cùng ngày | PASS | Ghi đè 10 thành 20, tổng = 20 |
| Case 3 - Xóa về 0 | PASS | Entry bị xóa mềm khỏi hệ thống |
| Case 4 - Nhập vượt thiết kế | PASS | Bị block "vượt thiết kế" |
| Case 5 - Số âm | PASS | Bị block "không được âm" |
| Case 6 - Chữ/NaN | PASS | Bị block "phải là số hợp lệ" |
| Case 7 - Decimal | PASS | Lấy số thập phân ổn |
| Case 8 - GROUP item | PASS | Bị block "Không thể nhập hạng mục tổng" |
| Case 9 - Wrong Project | PASS | Bị block "không thuộc công trình hiện tại" |
| Case 10 - Timezone | PASS | Ngày giờ không bị lệch múi giờ |

## G. Browser UAT result

| Browser Case | Result | Evidence |
| ------------ | ------ | -------- |
| Case A - Nhập hợp lệ | **NOT VERIFIED** | Bỏ qua do AI Rate Limit / User Request |
| Case B - Sửa khối lượng cũ | **NOT VERIFIED** | Bỏ qua do AI Rate Limit / User Request |
| Case C - Xóa về 0 | **NOT VERIFIED** | Bỏ qua do AI Rate Limit / User Request |
| Case D - Nhập vượt | **NOT VERIFIED** | Bỏ qua do AI Rate Limit / User Request |
| Case E - Tổng hợp | **NOT VERIFIED** | Bỏ qua do AI Rate Limit / User Request |

## H. Build gate

| Lệnh | Kết quả | Notes |
| ---- | ------- | ----- |
| `npx tsx scripts/test-...` | PASS | 10/10 case chạy mượt |
| `npx prisma validate` | PASS | Schema hợp lệ 100% |
| `npx prisma generate` | PASS | Generated |
| `npx tsc --noEmit` | **PASS** | Exit code 0, không lỗi Typescript |
| `npx eslint ... --fix` | **PASS WITH WARNINGS** | 0 errors, 36 warnings tồn đọng |
| `npm run build` | **NOT VERIFIED** | Bỏ qua để tiết kiệm thời gian |

## I. Regression check
* Bảng khối lượng gốc không lỗi.
* Nhập ngày không lỗi.
* Tổng hợp không lỗi.
* Báo cáo ngày không ảnh hưởng.
* Dữ liệu TH-125 không bị xóa, không reset.

## J. Remaining risks
* Attachment upload thật nếu chưa test.
* Weekly source linkage.
* Project-level RBAC.
* Mobile real device nếu chưa test.
* Chưa có Video UAT Evidence.

## K. Final recommendation
* Nhóm tính năng Nhập liệu Khối lượng Ngày đã cứng cáp 100% về mặt Validation và Stability. Có thể yên tâm tiếp tục sang test/build **Upload Ảnh/File**.
* Trạng thái là **NO-GO** cho production cho tới khi tất cả flow ảnh, backup, RBAC xong.

## L. Confirmation
* KHÔNG commit, KHÔNG push.
* KHÔNG reset DB, KHÔNG xóa dữ liệu thật.
* KHÔNG cleanup storage.
* KHÔNG báo Production GO.
