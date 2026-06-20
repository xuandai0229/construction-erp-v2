# Báo cáo Triển khai: Documents Hide Pending Approval UI

## 1. Executive Summary
Thực hiện loại bỏ hoàn toàn khái niệm "Chờ duyệt" (SUBMITTED) khỏi giao diện phân hệ Documents thường ngày của người dùng. Hệ thống backend và DB vẫn lưu trữ đúng nguyên trạng (file mới upload mang status SUBMITTED) nhưng trên UI sẽ hiển thị và ứng xử như các file lưu trữ bình thường nhằm tránh tạo cảm giác ngột ngạt vì một quy trình duyệt thủ công hiện chưa được thiết kế riêng.

## 2. Các thay đổi UI đã thực hiện

### 2.1 File Card & Document Viewer
- Trên File Card: Ẩn hoàn toàn badge `Chờ duyệt` màu xanh. Các file sẽ không có trạng thái gì cho đến khi bị `Từ chối` (REJECTED), `Đã duyệt` (APPROVED), `Lưu trữ` (ARCHIVED) hoặc `Thay thế` (SUPERSEDED).
- Trên Document Viewer: Chỉ hiển thị text phụ `Mới tải lên` thay vì badge `Chờ duyệt`. Trải nghiệm nhẹ nhàng hơn rất nhiều.

### 2.2 Filter Panel
- Xóa bỏ filter **"Trạng thái duyệt"** (filterStatus dropdown) khỏi Filter Panel. 
- Người dùng sẽ không thể chọn lọc các file "Chờ duyệt" từ màn hình chính nữa. Nếu cần gom nhóm (Group by), hệ thống vẫn hỗ trợ gom theo Trạng thái nếu cần, nhưng bản thân dropdown status filter đã bị xóa để giao diện tinh gọn hơn từ 6 cột về 5 cột.
- Bỏ logic filter `filterStatus` khỏi hook `useMemo` tính toán `displayDocs`.

### 2.3 Cảnh báo Smart Suggestions
- Đã xóa dòng cảnh báo màu vàng: `Có X tài liệu đang chờ duyệt.`
- Chỉ giữ lại dòng cảnh báo hợp lệ duy nhất về metadata: `Có X tài liệu chưa phân loại.` để nhắc nhở người dùng phân loại file đúng chuẩn.

## 3. Quản lý Quy trình & Database
- Khẳng định 100% không đụng chạm tới `schema.prisma`. 
- DB vẫn hoạt động với 5 Enum Status.
- Backend upload API (`route.ts`) vẫn default status là `SUBMITTED`.
- API đổi trạng thái (`changeDocumentStatus`) vẫn hoạt động với quyền `canChangeDocumentStatus` cho cấp quản lý.
- Không có bất kỳ dòng migration nào được tạo.

## 4. Build Result & Testing
- `npx prisma validate`: Pass
- `tsc --noEmit`: Pass
- `npm run build`: Pass
- Repo an toàn, hoàn toàn lưu trên local, tuyệt đối không push.

## 5. Kết luận
- **Trải nghiệm người dùng**: Tốt hơn, không bị làm phiền bởi các luồng chưa hoàn thiện.
- **Tính toàn vẹn Dữ liệu**: An toàn 100%.
- **Sẵn sàng UAT tiếp theo**: PASS.
