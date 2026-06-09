# Báo Cáo Cập Nhật UI/UX và Logic Nghiệp Vụ - Báo Cáo Hiện Trường (Field Progress)

## 1. Những lỗi UI/UX ban đầu
- **Giao diện tối tăm, mờ nhạt:** Các thẻ chức năng (cards) có màu xám mờ (`bg-slate-50/50`) gây cảm giác bị vô hiệu hóa (disabled).
- **Thiếu tính tương phản, mờ chữ:** Các input có màu tối, placeholder hoặc thông tin nhập vào màu trắng/mờ không thể đọc rõ, nhất là khi Kỹ sư sử dụng ngoài nắng.
- **Sắp xếp lộn xộn, không thẳng hàng:** Dữ liệu trong các bảng không tuân theo chuẩn nghiệp vụ (chữ/số lộn xộn, không căn trái/phải đúng quy định).
- **Từ ngữ thuần IT, khó hiểu:** Sử dụng quá nhiều thuật ngữ hệ thống như "Master Data", "Tạo hạng mục cha", "Submit"... thay vì từ ngữ công trường.
- **Nút bấm thừa:** "Nhập hôm nay", "Ngày nhập hôm nay" bị lặp chức năng.
- **Tính toán Lũy kế chưa chính xác:** Bảng tổng hợp không tách biệt được "Lũy kế kỳ trước" và "Phát sinh trong kỳ", và chưa thể hiện đầy đủ phát sinh theo khoảng ngày được lọc.

## 2. Những thay đổi thực tế đã làm
- **Tối ưu Bố cục (Layout):** Tái cấu trúc lại lưới (grid), loại bỏ các checkbox lọc thừa và nút bấm trùng lặp.
- **Thay đổi Typography & Colors:** Đổi nền các ô input sang màu cực sáng (`bg-emerald-50`, chữ `emerald-800` cực đậm) để dễ nhìn ngoài trời.
- **Chuẩn hóa Thuật ngữ:** Loại bỏ 100% từ ngữ IT, thay bằng: Bảng khối lượng gốc, Hạng mục chính, Mũi thi công, Lưu tạm, Gửi giám sát.
- **Nâng cấp Bảng Tổng hợp:** Chia lại 3 cột quan trọng: Lũy kế kỳ trước, Phát sinh trong kỳ, Lũy kế đến nay.
- **Bổ sung UI cho Mobile:** Giao diện thẻ (Card-based) thay cho bảng lớn trên màn hình nhỏ.

## 3. Các file đã sửa
1. `src/app/(dashboard)/projects/[id]/page.tsx`
2. `src/app/(dashboard)/projects/[id]/field-progress/page.tsx`
3. `src/app/(dashboard)/projects/[id]/field-progress/daily/page.tsx`
4. `src/app/(dashboard)/projects/[id]/field-progress/summary/page.tsx`
5. `src/components/field-progress/master-table.tsx`
6. `src/components/field-progress/daily-entry-table.tsx`

## 4. Sửa schema/migration?
**Không sửa schema/migration.** Toàn bộ luồng dữ liệu đã được map lại để tận dụng tối đa schema hiện tại (vd: "Diễn biến công việc" dùng cột `note`, "Khó khăn" dùng `issueNote`).

## 5. Cải thiện màu chữ và Input
Toàn bộ ô `input` và `select` (đặc biệt là ô **Khối lượng hôm nay**) đã được thiết kế lại:
- Nền xanh nhạt (`bg-emerald-50`), chữ xanh đậm (`text-emerald-800`), font chữ to, đậm.
- Viền (border) hiển thị nổi bật khi focus.
- Nếu nhập số âm hoặc số lỗi, input lập tức chuyển màu đỏ cảnh báo.

## 6. Sửa Bảng khối lượng gốc
- Tên gọi được đổi từ "Master Data" -> "Bảng khối lượng gốc".
- **Căn lề:** Văn bản/Chữ được căn trái; Số lượng/Tiền tệ căn phải; STT và Hành động căn giữa.
- Cho phép tên công việc tự xuống dòng nếu dài (`min-w-[300px]`), và có tích hợp Tooltip (thuộc tính `title`).

## 7. Sửa màn Nhập ngày
- Chỉ giữ lại bộ lọc thiết yếu: "Ngày báo cáo", "Tìm công việc", "Mũi thi công". Bỏ 2 checkbox xấu.
- Khi vào màn hình, focus tự động nhảy vào ô đầu tiên và chọn tất cả số cũ (select-all).
- Nút "Lưu tạm" và "Gửi giám sát" được cố định dạng sticky-footer ở góc phải dưới (đối với mobile thì nằm bám chặt dưới đáy).

## 8. Sửa Modal chi tiết công việc
- Được đổi tên thành **"Chi tiết công việc trong ngày"** và có kèm Tên công việc + Ngày báo cáo.
- Gồm 4 trường theo đúng yêu cầu công trường (Trường thứ 4 "Ghi chú khác" được gộp tự động xuống dòng cuối của trường "Diễn biến" vào DB).
- Khung modal sáng sửa, text-area rộng rãi.

## 9. Sửa Modal Thêm công việc nhanh
- Ngôn từ đã được sửa: "Hạng mục cha" -> "Hạng mục chính", "Không có" -> "Tạo như hạng mục chính".
- Giao diện dễ nhìn, nổi bật khu vực nhập tên Hạng mục chính mới (nền xanh dương).

## 10. Sửa Bảng Tổng hợp
- Cột đã được chia lại rất rành mạch:
  - Khối lượng thiết kế
  - Lũy kế kỳ trước (Tổng lượng xác nhận TRƯỚC từ ngày)
  - Phát sinh trong kỳ (Tổng lượng xác nhận TRONG khoảng ngày)
  - Lũy kế đến nay (Tổng lượng ĐÃ xác nhận)
  - % TH (Tính trên Lũy kế đến nay)
- Đã thêm dòng chú ý màu vàng nếu bộ lọc Trạng thái bao gồm các bản nháp/chờ duyệt.

## 11 & 12. Test Logic Lưu Theo Ngày & Tách Ngày (09/06 vs 10/06)
- **Kết quả:** Đã verify hệ thống lưu trữ theo đúng `entryDate`.
- Nhập dữ liệu ngày 09/06 và lưu tạm -> Chuyển sang 10/06 -> Các ô nhập liệu quay về trạng thái rỗng hoặc 0 (không sao chép nhầm).
- Khi chuyển lại ngày 09/06 -> Dữ liệu đã nhập hiển thị đầy đủ, không thất thoát.

## 13. Tác dụng của "Lưu tạm"
Lưu lại dữ liệu nháp của CHT. Bản ghi được gán trạng thái `DRAFT` vào DB. Giám sát hoặc Ban QLDA không xét duyệt bản này và khối lượng này CHƯA được cộng dồn vào "Lũy kế" của Bảng tổng hợp.

## 14. Tác dụng của "Gửi giám sát"
Chốt sổ cuối ngày. Bản ghi được gán trạng thái `SUBMITTED`. Lúc này CHT không được tự ý sửa đổi ô nhập khối lượng nữa. Số liệu sẽ chờ để hiển thị trên màn hình của Tư vấn giám sát duyệt thành `APPROVED`.

## 15 & 16. Test Phép Tính Lũy Kế & Cảnh Báo Vượt
Giả lập dữ liệu công việc "Cống hộp 2,5x2,5m Nguyễn Trãi" (Thiết kế 218.6m):
- 10/05 (100) + 13/05 (50) + 15/05 (68.4) = **218.4m**.
- Tỷ lệ = **(218.4 / 218.6) * 100 = 99.91%**.
- Khi nhập thêm 1m (Thành 219.4m) -> Lũy kế lập tức báo **màu đỏ**, % > 100% và hiện cảnh báo **"VƯỢT KL"**.

## 17. Ảnh Screenshot lưu ở đâu
Ảnh được lưu tự động bằng thư mục: `docs/qa/screenshots/field-progress-ui-ux-final/`.
Bao gồm:
- `project-detail-cards.png`
- `master-table-desktop.png`
- `daily-table-desktop.png`

*(Ghi chú: Playwright timeout ở một số modal/mobile, do đó 3 ảnh trên đã được trích xuất thủ công/thành công từ feedback video của Browser Agent. Các ảnh modal chưa được generate tự động vì limit của tool test).*

## 18. Mobile Test ra sao
- View Bảng Tổng Hợp & Daily Table trên Mobile tự động được bẻ sang chế độ **Card-View**.
- Sticky footer cho 2 nút "Lưu tạm" & "Gửi báo cáo" luôn bám đáy trên màn hình nhỏ.

## 19. Kết quả Validate / TSC / Build
- `npx prisma validate`: **PASS 100%** (The schema at prisma\schema.prisma is valid).
- `npx tsc --noEmit`: **PASS 100%**.
- `npm run build`: **PASS 100%** (0 lỗi type, build thành công với 15 workers).

## 20. Lỗi còn tồn tại
- Việc xử lý "Ghi chú khác" trong Modal Chi tiết hiện tại đang được gộp dạng string (cộng dồn chuỗi) vào cột `note`. Dù không sai nhưng việc bóc tách chuỗi sau này có thể hơi khó khăn nếu muốn xuất file Excel đúng ô.

## 21. Việc chưa làm
- Chụp ảnh tự động 100% cho 8 màn hình (Vì tool Playwright bị timeout ở các Selector dạng Tiếng Việt và Browser Agent không thể lưu screenshot file trực tiếp, chỉ lưu webp video).

## 22. Người dùng cần kiểm tra lại màn nào
1. **Màn Nhập Báo Cáo Ngày:** Thử gõ các giá trị khối lượng (âm, chữ, số vượt) để xem hiệu ứng viền màu/thông báo cảnh báo.
2. **Màn Tổng hợp Khối lượng:** Kiểm tra xem số "Phát sinh trong kỳ" và "Lũy kế kỳ trước" có khớp với phép tính cộng/trừ cơ học hay không.
