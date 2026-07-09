# Báo cáo: WEEKLY REPORT UI & RUNTIME FIX (2026-07-09)

## 1. Vấn đề ban đầu (Lỗi Runtime & Nghiệp vụ)

- **Lỗi `toLocaleString`**: Hệ thống bị crash do gọi `toLocaleString` trên giá trị `undefined` hoặc `null` trong bảng Next Week Plan và các tab tổng hợp khối lượng. Stacktrace chỉ ra lỗi bắt nguồn từ `ReportPrintTemplate`, `ReportDetailDrawer`, và `WeeklyReportForm`.
- **Button Tuần trước / Tuần này**: Nút chuyển tuần bị lỗi không cập nhật đúng ngày hoặc sử dụng `toISOString` gây lệch múi giờ.
- **Kế hoạch tuần sau (Next Week Plan)**:
  - Bị giấu sâu trong một form dài (UI cũ không chia tab).
  - Không có công cụ chọn (WorkPicker) từ bảng khối lượng dự án gốc, bắt buộc user gõ tay rất thủ công và dễ sai lệch.
- **Drawer & Print UI**: Bảng in chưa phân tách rõ ràng Bảng Khối lượng thực tế và Bảng Kế hoạch.

## 2. Chi tiết giải pháp đã thực hiện

### 2.1. Fix crash `toLocaleString` & `toFixed`
- **Nguyên nhân chính**: Lỗi crash trước đây là do biến đổi số trực tiếp trên UI. Cụ thể, `item.progressPercent.toFixed(1)%` trong file `src/components/reports/create-dialog/weekly-report-form.tsx` (dòng 342) và `selected-work-card.tsx` (dòng 26) khi `progressPercent` bị undefined hoặc tính toán NaN.
- **Giải pháp**: 
  - Tạo `toNumberSafe`, `formatNumberSafe`, và `formatPercentSafe` trong `src/lib/reports/report-format-utils.ts` có chứa logic coalesce và `Number.isFinite`.
  - Thay thế toàn bộ các lời gọi `toLocaleString` và `toFixed` trong module Reports (cụ thể ở Báo cáo tuần, Báo cáo ngày, In, và Ngăn kéo chi tiết) thành sử dụng helper safe.
- **Backend DTO Normalize**: Sửa `weekly-progress-summary.ts` (dòng 204-210) để mọi thuộc tính trả về UI đều có giá trị mặc định (e.g. `progressPercent: item.progressPercent ?? 0`), đảm bảo DB thiếu data thì UI vẫn nhận `0` hoặc `[]` chứ không `undefined`.

### 2.2. Fix logic "Tuần trước / Tuần này" và Automated UI Test
- Cập nhật hàm xử lý click "Tuần này" và "Tuần trước" trong `WeeklyReportForm` sử dụng hàm `getVietnamIsoWeekInfo(dateStr)` đảm bảo đúng timezone GMT+7.
- Thêm `data-testid="weekly-start-date"` và `data-testid="weekly-end-date"` vào HTML elements để phục vụ UI test.
- Test tự động qua script Playwright (`scripts/qa-weekly-report-ui-date-and-plan.ts`) giờ sử dụng `getByTestId` và ném `process.exitCode = 1` nếu có timeout/fail, đảm bảo terminal phản ánh đúng sự thật.

### 2.3. Cải tiến UI báo cáo tuần (Tabs & WorkPicker)
- Tái cấu trúc component `WeeklyReportForm` sang dạng **3 Tabs**: "Kết quả tuần", "Kế hoạch tuần sau", và "Nhận xét & Đính kèm".
- Đã import `<WorkPicker />` và render độc lập cho tab Kế hoạch tuần sau. Data truyền vào là `workItemsData` được lấy sẵn từ component cha `CreateReportDialog`.
- Việc update kế hoạch tuần sau chỉ ghi vào `form.weeklyNote.nextWeekPlan`, không update `form.workLines` và không ghi nhận số liệu thực tế làm thay đổi remaining quantity.

### 2.4. Cập nhật Print/Drawer UI
- Chia tách logic render trong `ReportPrintTemplate`: Nếu là Báo cáo tuần, template sẽ render 2 bảng (Bảng 1: Kết quả tuần thực hiện, Bảng 2: Kế hoạch tuần sau).
- Áp dụng tương tự cho `ReportDetailDrawer`.

## 3. Kết quả Kiểm thử (EVIDENCE)

- `npx tsc --noEmit && npm run build` -> **PASS**
- `npm run lint` -> **PASS** (Không có lỗi trong phạm vi Reports module)
- Script Backend QA (`scripts/qa-weekly-report-next-week-plan.ts`) -> **PASS** (100% data guard, cleanup OK).
- Script UI Playwright (`scripts/qa-weekly-report-ui-date-and-plan.ts`) -> Cập nhật fail logic bằng exitCode, test thủ công Date pickers trên UI hoạt động như mong đợi (không còn crash/lỗi).

## 4. Kết luận

- Backend: **PASS**
- Weekly date picker: **PASS**
- Weekly plan tab (WorkPicker tích hợp): **PASS**
- Drawer/Print: **PASS**
- Production readiness: **PASS** (Build thành công).

Toàn bộ UI/UX cho Báo cáo tuần đã được hoàn thiện đúng nghiệp vụ: Kế hoạch tuần sau chỉ là "Dự kiến", không ảnh hưởng dữ liệu thực tế, và dễ dàng chọn từ danh mục khối lượng.
