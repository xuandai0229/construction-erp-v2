# Báo cáo: Tối ưu UI/UX Mobile cho Màn hình Nhập khối lượng theo ngày (Large List UX)

## 1. Phân tích lỗi từ ảnh thực tế và Hướng giải quyết

- **Vấn đề chung:** Người dùng gặp khó khăn phải cuộn rất nhiều nếu hạng mục/công trình có số lượng công việc lớn. Giao diện card cũ tốn quá nhiều chiều dọc.
- **Giải quyết:** Đồng bộ với màn **Bảng khối lượng gốc Mobile**:
  - Nhóm các công việc theo **Hạng mục**. Mỗi hạng mục là một accordion/group có thể mở đóng.
  - Các công việc trong nhóm được thu gọn thành dạng Row cực kì tinh giản (Chỉ hiển thị Tên, Mũi, Đơn vị, Thiết kế, Đã làm, Sau nhập và Input nhập khối lượng).
- **Lỗi nhãn mác/từ vựng:** Chữ "KL" gây nhầm lẫn, cần mô tả chi tiết hơn các trạng thái lỗi/vượt ngưỡng.
- **Giải quyết:** 
  - Không sử dụng viết tắt. Sửa thành "Tổng thiết kế", "Vượt khối lượng thiết kế", v.v.
  - Vượt khối lượng được hiển thị rõ với thông báo "Cần ghi chú giải trình" nếu vượt thiết kế.
- **Lỗi tìm kiếm:** Tìm công việc quá lâu vì danh sách dài.
- **Giải quyết:**
  - Cập nhật ô tìm kiếm đa năng: Tên công việc, Hạng mục, Mũi thi công.
  - Bổ sung nhóm filter dạng chip/pill nằm vuốt ngang trên Mobile: "Tất cả", "Chưa nhập", "Đã nhập", "Vượt khối lượng". Điều này giúp site manager dễ dàng lọc nhanh các công việc cần hoàn thiện trong ngày.
- **Lỗi Bottom Sheet Chi tiết:** Cũ không có thông số khối lượng.
- **Giải quyết:** Bổ sung Grid 4 cột để summary lại các con số (Tổng thiết kế, Đã thực hiện, Sau nhập, Tỷ lệ) và warning (nếu có) ngay phía trên của các dòng ghi chú.

## 2. Các file đã sửa đổi
- `src/components/field-progress/daily-entry-table.tsx`
- Bổ sung Test Script Playwright: `scripts/take-screenshots-daily-mobile.ts`

## 3. Ảnh chụp (Screenshots)
Các hình ảnh kiểm tra đã được script Playwright lưu trữ tại:
`docs/qa/screenshots/field-progress-daily-mobile-large-list/`
- `daily-top-390.png`: Header cực gọn.
- `daily-group-collapsed-390.png`: Group hạng mục đóng, thấy rõ số lượng CV/chưa nhập/đã nhập.
- `daily-group-expanded-390.png`: Mở group hạng mục, render Row compact input.
- `daily-search-result-390.png`: Kết quả Filter & Search.
- `daily-work-row-input-390.png`: Ô input ngay trên row.
- `daily-over-volume-390.png`: Cảnh báo Vượt KL rõ ràng.
- `daily-detail-bottom-sheet-390.png`: Mở Bottom sheet Chi tiết xem thông số và ghi chú.

## 4. Tình trạng Test & Build
- Các script UAT Validation (Rollup, VolumeGuard, Direct Save Editable, Database Audit) đều Pass, đảm bảo Data Layer nguyên vẹn.
- Logic Nhập số lưu im lặng, Trạng thái không bị khoá, Volume Guard, Summary nhận số đều giữ nguyên.
- **Exit code 0** đối với lệnh `npx tsc --noEmit` & `npm run build`.

## 5. Kết luận
- **Thỏa mãn toàn bộ Yêu cầu nghiệm thu:**
  - Bố cục danh sách công việc trên Mobile đã được xử lý nhóm hạng mục mở/đóng và dạng Row siêu ngắn gọn, triệt tiêu vấn đề cuộn mỏi tay trên iOS/Android.
  - Bảng Desktop giữ nguyên không ảnh hưởng (Regression Passed).
  - Tích hợp liền mạch UI/UX với Bảng khối lượng gốc Mobile đã làm trước đó. Giao diện sáng, thoáng và chuyên nghiệp.
