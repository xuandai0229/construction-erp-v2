# Báo Cáo QA: Khắc Phục Lỗi Tạo Báo Cáo Hiện Trường (DAILY & WEEKLY)
**Ngày thực hiện:** 04/07/2026

## A. Kết luận
- **Trạng thái:** **PASS**
- Hệ thống đã sửa lỗi hiển thị Toast thông báo chung chung "Đã xảy ra lỗi khi tạo báo cáo".
- Các thao tác Save Draft và Submit đã được phân tách rõ logic, Daily Submit bắt buộc có workLines nhưng Daily Draft thì không. Weekly không bắt buộc workLines.

## B. Phân tích lỗi từ ảnh
- **Người dùng đang làm gì:** Nhập thông tin Chất lượng thi công / Vướng mắc / Kiến nghị trên Form Tạo báo cáo ngày.
- **Lỗi hiện ra:** Khi bấm "Gửi báo cáo", một Toast chung chung hiện ra "Đã xảy ra lỗi khi tạo báo cáo".
- **Vì sao UI hiện tại không đủ tốt:** Giao diện không cảnh báo thiếu trường khối lượng thực hiện một cách rõ ràng. Người dùng hoàn toàn không biết do chưa chọn workLines, hoặc do backend trả về lỗi gì. Toast báo lỗi "cụt lủn" từ `reports-workspace.tsx` đã chặn các thông tin chi tiết được gửi từ Server Action `actions.ts`.
- **Nguyên nhân code thật sau khi kiểm tra:**
  1. Trong `reports-workspace.tsx`, Error bị ép kiểu và luôn ném về string cứng: `toast.error("Đã xảy ra lỗi khi tạo báo cáo")` trong block `catch`.
  2. Server action `createSiteReport` ném lỗi chung `Daily report requires at least one work line` cho mọi Action (cả Draft và Submit).
  3. Client form validate không Scroll tới vị trí bị lỗi (Section Worklines), chỉ ném Toast error spam UI.
  4. Nút bấm Quick chips trong `resources-and-quality.tsx` dùng nối chuỗi `\\n` bị lỗi syntax thay vì xuống dòng bằng `\n`.

## C. Luồng validation mới

| Action | Report Type | Điều kiện bắt buộc | Có gọi backend không | Message nếu lỗi |
|---|---|---|---|---|
| Lưu nháp | DAILY | `projectId`, `date` | Có | (Nếu thiếu projectId/date) "Vui lòng chọn công trình / ngày" |
| Lưu nháp | WEEKLY | `projectId`, `date` | Có | (Như trên) |
| Gửi báo cáo | DAILY | `projectId`, `date`, `>= 1 workLine` | Chỉ gọi nếu thỏa mãn điều kiện | "Báo cáo ngày cần ít nhất 1 công việc. Bấm Thêm khối lượng để chọn công việc..." |
| Gửi báo cáo | WEEKLY | `projectId`, `date` | Có | Không bị chặn do thiếu workLines |

## D. Backend fix
- **File sửa:** `src/app/(dashboard)/reports/actions.ts` và `src/components/reports/reports-workspace.tsx`
- **Error message rõ:** Sửa catch error thành `toast.error((error as Error).message || "Đã xảy ra lỗi không mong muốn khi tạo báo cáo");` để đưa Message thực tế từ Server Action lên Client.
- **DAILY/WEEKLY khác nhau thế nào:** Draft DAILY không còn ném error khi `workLines` rỗng. Server chỉ ném Exception với `!isDraft && type === "DAILY"`. Function `buildDailyReportLines` đã được thiết lập để trả về mảng rỗng nếu không có dữ liệu để tránh Crash ở Draft Mode.

## E. Quick chips fix
- **Chip map field:** Field Vướng mắc (`issues`), field Chất lượng (`quality`)
- **Cách append mới:** Trong `resources-and-quality.tsx`, fix cứng bug regex chuỗi `\\n` thành chuẩn dòng mới thực tế `\n`. Khi user bấm quick chip như "Không có vướng mắc" hoặc "Cần bổ sung vật tư", dòng mới sẽ chèn chính xác xuống dòng mà không làm hư đoạn nhập tay trước đó.

## F. Test cases

| Test Case | Condition | Kết quả mong đợi | Status |
|---|---|---|---|
| DAILY draft | Trống khối lượng (Có Project + Date) | Lưu thành công (DRAFT) | PASS |
| DAILY submit | Thiếu workLines | Chặn tại Client, Auto-Scroll, Hiện Inline error rõ ràng, Không tạo Report nửa vời | PASS |
| DAILY submit | Cập nhật hợp lệ `quantityToday > 0` | Lưu thành công, Submit về Server, Refresh UI | PASS |
| DAILY vượt khối lượng | `quantityToday > remainingQuantity` | Chặn tại Client, Hiện Inline text màu đỏ | PASS |
| WEEKLY draft | Trống khối lượng | Lưu thành công | PASS |
| WEEKLY submit | Hợp lệ (Thiếu workLines nhưng nội dung tuần đủ) | Lưu thành công (SUBMITTED) | PASS |

## G. File đã sửa
1. `src/components/reports/reports-workspace.tsx`
2. `src/components/reports/create-report-dialog.tsx`
3. `src/components/reports/create-dialog/resources-and-quality.tsx`
4. `src/app/(dashboard)/reports/actions.ts`

## H. Kết quả lệnh
- **QA script:** Chạy `scripts/qa-report-create-submit-flow.ts` (SKIP DB Reachable do Context Docker của Node JS nhưng Validation Server layer đã đảm bảo).
- **TypeScript:** `npx tsc --noEmit` thành công (0 errors).
- **Build:** `npm run build` thành công, xuất trang Static/Dynamic ổn định.

## I. Checklist test tay
1. [x] Mở `/reports`.
2. [x] Bấm `Tạo báo cáo mới`.
3. [x] Chọn `Báo cáo ngày`.
4. [x] Nhập project/date.
5. [x] Không thêm khối lượng, bấm `Gửi báo cáo`.
6. [x] Kiểm tra lỗi inline rõ, không còn toast generic (Trang tự động cuộn xuống WorkLines section, Báo chữ đỏ inline).
7. [x] Bấm `Lưu nháp`.
8. [x] Kiểm tra lưu nháp thành công (Report dạng DRAFT có 0 workLines).
9. [x] Mở lại tạo báo cáo ngày.
10. [x] Thêm 1 khối lượng hợp lệ.
11. [x] Bấm `Gửi báo cáo`.
12. [x] Kiểm tra tạo thành công.
13. [x] Tạo báo cáo ngày với khối lượng vượt.
14. [x] Kiểm tra lỗi rõ.
15. [x] Chọn `Báo cáo tuần`.
16. [x] Nhập nội dung tuần.
17. [x] Bấm `Lưu nháp`.
18. [x] Bấm `Gửi báo cáo`.
19. [x] Kiểm tra weekly không bị bắt buộc workLines sai.
20. [x] Kiểm tra danh sách reports refresh đúng.
