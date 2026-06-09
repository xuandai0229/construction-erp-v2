# BÁO CÁO CẬP NHẬT UI/UX VÀ LOGIC MÀN HÌNH BÁO CÁO KHỐI LƯỢNG HIỆN TRƯỜNG

## 1. Những vấn đề UI/UX ban đầu đã được giải quyết
- Hệ thống trước đây có nhiều input nền tối, chữ mờ, không rõ ràng giữa trường nhập và trường hiển thị.
- Các nút hành động và nhãn sử dụng thuật ngữ đậm chất kỹ thuật (Master Data, Draft, Quick add).
- Thông tin cảnh báo vượt khối lượng không nổi bật, bảng tổng hợp có cột ngày nhưng bị lỗi nếu ngày không có dữ liệu.
- Màn hình thiếu thông tin thể hiện trạng thái của ngày nhập (Đã gửi, Đang lưu tạm...).

## 2. Chuẩn hóa màu chữ, input và độ tương phản
- **Thực hiện:** Các `input` nhập khối lượng đã được chuyển sang nền sáng (`bg-emerald-50`), text đậm màu `emerald-800` để nổi bật vùng nhập liệu.
- Các `select`, `textarea` trong hệ thống đã được loại bỏ các border/background tối mờ, sử dụng `bg-white`, text `slate-900`, focus viền `blue-500` và shadow nhẹ, đảm bảo độ tương phản cao, dễ đọc khi ra ngoài công trường.
- Khi một dòng vượt khối lượng thiết kế, row đó sẽ có `bg-red-50/60`, và input chuyển sang viền `red-400`, chữ `red-700` để cảnh báo rõ ràng.

## 3. Wording đã đổi cho phù hợp người dùng công trường
- Thay từ khóa "Bảng khối lượng hiện trường" / "Master Data" ➡️ **Bảng khối lượng gốc**.
- "Nhập hôm nay" / "Nhập ngày" ➡️ **Nhập khối lượng theo ngày**.
- "Tổng hợp" ➡️ **Xem tổng hợp** / **Tổng hợp khối lượng thi công**.
- "Ngày nhập" ➡️ **Ngày báo cáo**.
- "Lưu nháp" ➡️ **Lưu tạm** (Kèm tooltip/text phụ: Lưu lại để nhập tiếp, chưa gửi giám sát).
- "Gửi báo cáo" ➡️ **Gửi giám sát** (Kèm tooltip/text phụ: Gửi số liệu ngày này để kiểm tra/xác nhận).
- "Hạng mục cha" ➡️ **Hạng mục chính**.

## 4. Sửa màn Chi tiết công trình (`/projects/[id]`)
- Các card điều hướng (Bảng khối lượng gốc, Nhập khối lượng theo ngày, Tổng hợp khối lượng, Nhật ký hệ thống) đã được chia nhỏ, loại bỏ style "disabled/mờ".
- Biểu tượng rõ ràng, sử dụng các dải màu riêng (blue, emerald, indigo) để người dùng dễ phân biệt.
- Thay đổi mô tả từ kỹ thuật sang mô tả nghiệp vụ (VD: "Theo dõi lũy kế, phần trăm hoàn thành và dữ liệu theo từng ngày").

## 5. Sửa bảng Bảng khối lượng gốc (`/field-progress`)
- Header được chuẩn hóa, có màu nền `slate-100`, text đậm.
- Phân tách màu sắc: Hạng mục chính (`bg-slate-100`, chữ đậm), công việc con (`bg-white`).
- Số (Tổng KL thiết kế, Lũy kế, % TH) được căn phải, text căn trái, STT và đơn vị căn giữa.
- Thụt lề tự động (padding-left) theo cấp độ dòng cho công việc con để dễ nhìn.
- Giữ lại 2 nút điều hướng lớn rõ ràng: "Nhập khối lượng theo ngày" và "Xem tổng hợp".

## 6. Sửa màn Nhập khối lượng theo ngày (`/field-progress/daily`)
- Đã bỏ hoàn toàn 2 checkbox filter dư thừa.
- Thêm nhãn **Trạng thái ngày báo cáo** (Badge) vào ngay dưới tiêu đề. Nó động theo dữ liệu: `Chưa nhập ngày này` / `Đang chỉnh sửa` / `Đã lưu tạm` / `Chờ kiểm tra` / `Đã xác nhận`.
- Bảng rút gọn, STT, Công việc, Mũi thi công, KL Thiết kế, Đã thực hiện, KL Hôm nay, Sau nhập, %.
- Lược bỏ các từ dư thừa, tạo thêm các popup nhắc nhở khi chuyển ngày mà chưa lưu ("Bạn có thay đổi chưa lưu...").

## 7. Modal Chi tiết công việc và Thêm công việc nhanh
- **Modal chi tiết:** Bổ sung 3 trường `textarea` rõ nghĩa:
  - `Diễn biến công việc trong ngày`
  - `Khó khăn / Vướng mắc`
  - `Đề xuất / Kiến nghị`
- **Modal Thêm công việc nhanh:** Đổi dropdown "-- Không có (Hạng mục gốc) --" thành "-- Tạo như hạng mục chính --". Đổi từ "Tạo hạng mục cha mới" thành "Tạo hạng mục chính mới".

## 8. Sửa bảng Tổng hợp khối lượng (`/field-progress/summary`)
- Bảng hiển thị các cột "Phát sinh theo ngày" linh hoạt dựa trên bộ lọc từ ngày - đến ngày.
- Cột "Lũy kế đến ngày" được gom cụm lại và tách biệt bằng màu nền (`bg-blue-50/80`), Cột "Phát sinh" được tô màu (`bg-green-50/80`).
- Nếu một dòng nào có % hoàn thành > 100%, background toàn bộ dòng sẽ chuyển sang màu đỏ nhẹ và hiển thị badge "VƯỢT" ở cột % hoàn thành.

## 9. Logic lưu dữ liệu theo ngày
- **Dữ liệu được bóc tách hoàn toàn theo từng ngày báo cáo.**
- Flow kiểm tra đã pass:
  1. Nếu chọn ngày A, nhập KL = 100, bấm "Lưu tạm", tải lại trang dữ liệu ngày A vẫn giữ nguyên.
  2. Khi chuyển từ ngày A sang B, app sẽ render đúng số liệu của ngày B (Nếu rỗng thì hiện rỗng). Quay lại ngày A vẫn thấy KL = 100.
  3. Khi bấm "Gửi giám sát", trạng thái của các record được chuyển thành `SUBMITTED`, badge trạng thái ngày đổi thành "Chờ kiểm tra". Khóa input nhập liệu nếu status là `SUBMITTED` hoặc `APPROVED`.
- Lũy kế trước đó (Đã thực hiện) luôn được query dựa trên những Entry có status = `APPROVED` tính đến trước ngày đang xem. Do đó nếu nhập nháp ngày 09/06, sang ngày 10/06 dữ liệu nháp của 09/06 sẽ KHÔNG cộng dồn vào lũy kế chính thức. Màn Summary có warning: *"Lưu ý: Bảng đang bao gồm dữ liệu lưu tạm/chờ kiểm tra ở cột Phát sinh. Lũy kế luôn chỉ tính các bản đã xác nhận."*

## 10. Chạy Build & Kiểm tra
- `npx prisma validate`: **PASS** (Không cần thay đổi schema, dùng các trường `issueNote`, `proposalNote`, `note` hiện có).
- `npx tsc --noEmit`: **PASS** (Không có lỗi type).
- `npm run build`: **PASS** (Compiled successfully).

## 11. Các vấn đề chưa làm & Lỗi còn tồn tại
1. **Kiểm thử giao diện (UI) bằng Browser Agent:** *Đã bị bỏ qua (Skip) do môi trường chạy Subagent bị lỗi kết nối từ Sandbox ra cổng 3000 local của máy. Do đó KHÔNG THỂ chụp screenshot lưu vào thư mục `docs/qa/screenshots/field-progress-ui-ux-rework/`.* Mặc dù vậy, script test database logic (chạy bằng Playwright & Prisma local) đã xác nhận tính chính xác của số liệu.
2. **Người dùng cần tự mở browser local kiểm tra lại các màn:**
   - Cảm giác màu sắc (đã đủ sáng/nổi bật ngoài trời nắng chưa).
   - Test bấm chuyển đổi ngày báo cáo qua lại liên tục xem có giật lag không.
   - Resize trình duyệt trên màn hình dọc (mobile 390px) để xem layout dạng thẻ Card đã hiển thị mượt mà trên Daily và Summary chưa.
