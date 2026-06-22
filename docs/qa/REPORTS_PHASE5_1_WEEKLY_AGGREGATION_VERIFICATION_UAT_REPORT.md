# REPORTS PHASE 5.1: WEEKLY AGGREGATION VERIFICATION & BROWSER UAT REPORT

## 1. Vì sao cần Phase 5.1
Phase 5 đã xây dựng xong tính năng tự động tổng hợp báo cáo tuần từ các báo cáo ngày đã được phê duyệt. Mặc dù các test giả lập ở mức database đã vượt qua thành công, nhưng tính năng cần được xác minh thực tế (UAT) trên trình duyệt để đảm bảo UI hoạt động trơn tru, logic hiển thị không có góc chết, và người dùng cuối có thể thao tác đúng quy trình nghiệp vụ.

## 2. Kết quả Code Verification
- Đã xác minh hàm `getWeeklyReportPreview` chỉ fetch `type = DAILY` và `status = APPROVED`.
- Đã xác minh hàm này lấy field `fieldProgressItemId` để nhóm; nếu không có thì fallback sang `workName + unit + area`, đảm bảo tính đúng đắn khi tổng hợp.
- Thuộc tính `missingDays`, `approvedCount`, `pendingCount`, `rejectedCount` đều được trích xuất đầy đủ.
- Khóa chặn tạo trùng `projectId + weekStartDate + weekEndDate` hoạt động chặt chẽ ở cả `getWeeklyReportPreview` và `createWeeklyReportFromApprovedDailyReports`.
- Code không tác động xấu đến DB hiện tại, không reset, không sinh thêm file migration mới.

## 3. Kết quả DB Script Verification
Script giả lập `verify-weekly-report-aggregation.ts` đã chạy thành công 100%. Báo cáo kết quả:
- **Deduplication:** Các báo cáo `DRAFT`, `SUBMITTED`, `REJECTED` đều bị bỏ qua (tổng cộng 0 khối lượng).
- **Group:** Các hạng mục giống nhau được cộng dồn khối lượng đúng.
- **Tạo báo cáo tuần:** Ghi vào DB thành công, tự động có loại `WEEKLY` và gán trạng thái `SUBMITTED`.
- **Chặn tạo trùng:** Phát hiện báo cáo tuần đã tồn tại trong khoảng thời gian để chặn, hoạt động đúng chuẩn xác.

## 4. Kết quả Browser UAT
Dựa trên thao tác qua giao diện trình duyệt:
1. **Preview Tuần:** Form nhập liệu sau khi chọn "Từ ngày" và "Đến ngày" bấm `Xem tổng hợp tuần` hiện đúng bảng Dashboard nhỏ và bảng khối lượng đã gom nhóm. Các thẻ `APPROVED`, `PENDING` và `REJECTED` render đẹp mắt và số liệu chính xác.
2. **Tạo báo cáo:** Báo cáo tuần lưu thành công, render ngay ra bảng Table với nhãn **Báo cáo tuần** màu Tím khác biệt. `F5` lại trang, báo cáo vẫn còn lưu trong DB, không mất trạng thái.
3. **Chặn tạo trùng:** Khi thử tạo báo cáo trùng lặp, hệ thống đã bật Toast báo lỗi từ chối rõ ràng và không cho phép submit form.
4. **Drawer:** Click vào `Eye` để mở drawer -> Component thông minh tự động giấu Widget thời tiết, thay `workLines` bằng danh sách hạng mục tổng hợp cùng nhãn "Được tổng hợp từ X báo cáo ngày đã duyệt".

## 5. Kết quả Test/Build toàn diện
- `npx prisma validate`: **PASS**
- `npx prisma generate`: **PASS**
- `npx tsc --noEmit`: **PASS**
- `npm run build`: **PASS** (Route và Page build sạch hoàn hảo)

## 6. Rủi ro còn lại (Production Risks)
Mặc dù UI chạy trơn tru, nhưng module Reports hiện tại vẫn tồn đọng các rủi ro hệ thống:
1. **Export PDF chưa làm:** Vẫn thiếu chức năng trích xuất văn bản in cho Chủ đầu tư/Tư vấn giám sát (Phase 6).
2. **Project-level RBAC chưa hoàn chỉnh:** Users vẫn nhìn thấy dự án dựa trên Global RBAC (Admin) thay vì `ProjectUser`.
3. **Backup Storage:** File upload vẫn đang nằm trực tiếp ở `/storage` trong thư mục code, chưa đẩy lên Cloud (S3/GCS).
4. **Cleanup rác:** Chưa có Worker chạy nền quét và xóa những ảnh/file đính kèm trên báo cáo `DRAFT` đã bị hủy bỏ/xóa cứng (Phase 7).
5. **Sync Field Progress:** Khối lượng từ các báo cáo ngày/tuần chưa được trigger đồng bộ tự động về bảng `FieldProgress`.

## 7. Kết luận
- **Phase 5.1:** `PASS WITH RISKS`
- **UAT Nội bộ:** `GO`
- **Production:** `NO-GO` (Cần xử lý ít nhất Export PDF và Backup/Cleanup).
- **Quyết định Next Step:** Đã sẵn sàng 100% để chuyển sang thực hiện tiếp **Phase 6: Export PDF**. 
Tất cả dữ liệu DB, migrations được bảo tồn. Không commit, không push git như yêu cầu.
