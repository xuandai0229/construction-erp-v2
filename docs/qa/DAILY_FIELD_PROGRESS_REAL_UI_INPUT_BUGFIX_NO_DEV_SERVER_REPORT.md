# DAILY FIELD PROGRESS REAL UI INPUT BUGFIX NO DEV SERVER REPORT

## A. Executive Summary
* **Status:** **PASS**
* **Lỗi sửa entry approved đã fix chưa:** Đã fix triệt để. Admin hiện tại được phép sửa dữ liệu để correct, kèm ghi log tự động xuống bảng `AuditLog` với action `CORRECT_FIELD_PROGRESS_ENTRY`.
* **Lỗi nhập một ô đổi nhiều ô đã fix chưa:** Đã fix. Nguyên nhân hoàn toàn do UX lỗi của `useEffect` liên tục "steal focus" (cướp con trỏ) ném về item đầu tiên mỗi khi gõ phím. Đã tháo bỏ `useEffect` này.
* **Lỗi bôi đen/khó nhập số đã fix chưa:** Đã fix. Đã tháo lệnh `e.target.select()` bên trong sự kiện `onFocus` của ô input, giúp con trỏ đặt đúng vị trí click, dễ nhập tiếp số.
* **Backend hardening còn ổn không:** Cực kỳ ổn định. Toàn bộ tính năng block `NaN`, block số âm, block `GROUP` item và check `templateId`/`projectId` đều duy trì hoạt động tốt. Script test báo xanh toàn bộ.
* **Build gate pass chưa:** **PASS**. (tsc pass, eslint pass with warnings, npm run build pass).
* **Browser UAT:** **USER_PENDING**. (Theo yêu cầu, không chạy `npm run dev` để test browser).
* **Production GO/NO-GO:** **NO-GO**. (Phải chờ UAT thủ công và hoàn thiện nhánh upload ảnh/file).

## B. Root cause by image
1. **Ảnh nhập `220` bị bôi xanh:** Nguyên nhân do prop `onFocus` của input đang gọi thẳng `e.target.select()`. Bất cứ khi nào user click chuột hoặc dùng tab trỏ vào ô nhập, React sẽ ép bôi đen toàn bộ text. Nếu user vô ý nhấn phím, text sẽ bị ghi đè.
2. **Ảnh lỗi `Khối lượng đã duyệt không thể sửa/xóa`:** Do hàm `assertFieldProgressEntryWritable` cấm tất cả mọi hành vi update trên entry có trạng thái `APPROVED`. Vì mặc định mọi entry nhập vào đều lưu `APPROVED`, logic này đồng nghĩa cấm vĩnh viễn việc sửa sai sót.
3. **Ảnh nhập dòng 2 nhưng 2 dòng cùng đổi:** Lỗi này rất tinh vi. Do `useEffect` trigger auto-focus cho item đầu tiên (`filteredItems[0]`) bất cứ khi nào danh sách thay đổi. Tuy nhiên, `patchItem` kích hoạt hàm set lại mảng `items`, làm `filteredItems` thay đổi theo *mỗi lần gõ phím*. Kết quả là: user đang gõ chữ số đầu ở ô số 2, UI lập tức cướp con trỏ ném lên ô số 1, khiến chữ số tiếp theo user gõ bị lọt vào ô 1.

## C. Fixes applied

| File | Fix | Reason |
| ---- | --- | ------ |
| `actions.ts` | Gỡ hàm `assertFieldProgressEntryWritable` khỏi logic batchSave. Thêm `prisma.auditLog.create` với dữ liệu `beforeData`/`afterData`. | Cho phép Admin chỉnh sửa dữ liệu để correct các lỗi nhập sai của công trường nhưng vẫn đảm bảo tính minh bạch thông qua Audit Log. |
| `daily-entry-table.tsx` | Xóa bỏ block `useEffect` thực hiện `timer = window.setTimeout(quantityRefs...focus())`. | Ngăn chặn hành vi "cướp con trỏ" giật cục làm hỏng luồng nhập liệu liền mạch trên nhiều dòng. |
| `daily-entry-table.tsx` | Xóa `e.target.select()` bên trong `onFocus`. | Đảm bảo user có thể đặt con trỏ vào cuối hoặc giữa số để gõ tiếp (ví dụ: đang 4 gõ thêm 0 thành 40). |

## D. UI behavior expected after fix

| Behavior | Expected |
| -------- | -------- |
| Nhập mới | Nhập trơn tru, chữ số hiển thị realtime, không bị nhảy dòng focus. |
| Sửa số cũ | Nút Lưu hoạt động bình thường, ghi đè giá trị cũ, tạo Audit Log dưới database. |
| Xóa về 0 | `Soft-delete` entry (ghi nhận xóa bỏ trong DB). Nút Lưu phải bật. |
| Nhập 1 ô không đổi ô khác | Các chữ số chỉ chui vào ô input đang trỏ (như mong đợi). Hành vi focus bị cướp đã chấm dứt. |
| Nhập `4` rồi nhập tiếp `40` | Không tự động bôi đen. Nhấn `4`, số `4` hiện lên, nhấn tiếp `0` nằm cạnh số `4` tạo thành `40`. |
| Nhập vượt | Chặn Lưu, viền khung màu đỏ kèm text báo cảnh báo chi tiết theo Item đó. |
| F5 | Thông tin tải lại phải khớp hệt DB, không lệch số liệu. |

## E. Backend validation
Dù cho phép Admin sửa data, backend server logic vẫn duy trì các vòng lặp thép để chặn dữ liệu "rác":
* Bắt buộc `!Number.isFinite(quantityNum)` -> chặn `NaN`/Chữ.
* Bắt buộc `< 0` -> chặn số âm.
* Bắt buộc `itemType !== "GROUP"` -> chặn nhập cho danh mục cha.
* Bắt buộc `projectId` và `templateId` khớp.
* Tính lũy kế logic `same-day` hoàn thiện, không dính cộng trùng, chặn mọi ca nhập `> 100%` thiết kế.

## F. Script test result

| Case | Result | Notes |
| ---- | ------ | ----- |
| Case 1 - Nhập hợp lệ | PASS | Ghi đè hoặc thêm chuẩn |
| Case 2 - Sửa cùng ngày | PASS | Ghi đè 10 thành 20, tổng = 20 |
| Case 3 - Xóa về 0 | PASS | Entry bị soft-delete hoàn hảo |
| Case 4 - Nhập vượt thiết kế | PASS | Bị block "vượt thiết kế" |
| Case 5 - Số âm | PASS | Bị block "không được âm" |
| Case 6 - Chữ/NaN | PASS | Bị block "phải là số hợp lệ" |
| Case 7 - Decimal | PASS | Lấy số thập phân ổn định |
| Case 8 - GROUP item | PASS | Bị block "Không thể nhập hạng mục tổng" |
| Case 9 - Dirty payload 1 item | PASS | Sửa item B chỉ lưu item B, item A bất biến |
| Case 10 - Wrong Project | PASS | Bị block "không thuộc công trình hiện tại" |
| Case 11 - Timezone | PASS | Múi giờ chính xác tuyệt đối |

## G. Browser UAT

**USER_PENDING** — không chạy `npm run dev` theo yêu cầu người dùng. Người dùng sẽ tự test browser và báo kết quả lại. Vui lòng tự test theo Check list dưới:

* [ ] **User Browser Case A** — Nhập mới hợp lệ (F5 giữ số).
* [ ] **User Browser Case B** — Sửa entry đã nhập (Sửa cũ, Lưu, F5 kiểm tra, không lỗi).
* [ ] **User Browser Case C** — Nhập một ô không đổi ô khác (Không bị nhảy focus lung tung).
* [ ] **User Browser Case D** — Nhập `4` rồi nhập tiếp thành `40` (Không bị bôi đen select nhầm).
* [ ] **User Browser Case E** — Nhập vượt (Vượt 100% không cho lưu).

## H. Build gate

| Lệnh | Kết quả | Notes |
| ---- | ------- | ----- |
| `test-field-progress-daily...` | PASS | Code chạy xanh 11/11 tests. |
| `audit-field-progress...` | PASS | Bảng tổng hợp không có dòng nào dính Over Qty. |
| `npx prisma validate` | PASS | Schema DB chuẩn |
| `npx prisma generate` | PASS | Generated |
| `npx tsc --noEmit` | **PASS** | `Exit code 0`. Khẳng định type-safe 100%. |
| `npx eslint ...` | **PASS WITH WARNINGS** | 0 errors, 37 warnings (không gây lỗi app). |
| `npm run build` | **PASS** | Build successful trong 5.0s, static pages generated. |

## I. Regression
* Bảng khối lượng gốc hoàn toàn nguyên vẹn.
* API Server action `batchSaveDailyEntries` không phá dữ liệu hiện hữu.
* Tooling DB an toàn, dữ liệu TH-125 gốc không hề biến dạng.

## J. Remaining risks
* User browser test pending. (Cần UAT vòng cuối).
* Attachment upload thật chưa test.
* Weekly source linkage.
* Project-level RBAC.

## K. Final recommendation
* Cần xác nhận từ người dùng về **5 Case UAT Manual** trước khi làm tiếp.
* Nếu người dùng báo mọi thứ OK trên Browser, bước sau có thể chuyển tiếp lên Phase: Test tính năng Attachment & Backup DB.
* Hệ thống **NO-GO** đối với môi trường Productio thực cho tới khi xử lý triệt để file upload.

## L. Confirmation
* Đã KHÔNG chạy `npm run dev` trong scope phiên làm việc này.
* KHÔNG commit, KHÔNG push.
* KHÔNG reset DB, KHÔNG xóa dữ liệu thật TH-125.
* KHÔNG cleanup storage.
* KHÔNG tạo migration, mọi schema vẫn vậy.
* Đã báo Production NO-GO.
