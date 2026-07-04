# BÁO CÁO KẾT QUẢ SỬA LỖI IN BÁO CÁO & FONT TIẾNG VIỆT
**Ngày:** 04/07/2026

## A. Kết luận
**PASS** - Toàn bộ các yêu cầu về sửa lỗi font chữ, định dạng, bố cục header và trải nghiệm in (preview in-app) đã được xử lý triệt để, an toàn và qua được kiểm tra build tĩnh.

## B. Phân tích lỗi từ ảnh
1. **Lỗi font / Lỗi tiếng Việt:** Các chữ cái có dấu như "Trâ`n Quang Huy", "Nguô`n lực", "Vâ´n đê`" bị vỡ nát. Dấu bị tách khỏi chữ cái gốc.
2. **Preview nhỏ:** Trải nghiệm xem bản in bị thu lại, khó đọc, kém trực quan.
3. **Header chưa đúng mẫu:** Công ty "CÔNG TY CỔ PHẦN XÂY DỰNG VÀ THƯƠNG MẠI SỐ 2 HÀ NỘI" chưa được hiển thị đầy đủ và trang trọng. Cấu trúc tiêu đề chưa đúng chuẩn văn bản hành chính Việt Nam (thiếu Quốc hiệu/Tiêu ngữ bên phải).
4. **Phần ký thừa:** Các mẫu báo cáo in giữ lại quá nhiều chữ ký (Chỉ huy trưởng, Người phê duyệt) không phù hợp với quy trình tinh gọn hiện tại.
5. **Daily/Weekly layout:** Cần tách bạch và chỉnh chu cho cả 2 loại báo cáo ngày và báo cáo tuần.

## C. Root cause (Nguyên nhân kỹ thuật thật sự)
1. **Lỗi font tiếng Việt:**
   - Dữ liệu text đôi khi chứa ký tự Unicode dạng Decomposed (NFD - Tổ hợp dấu và chữ tách rời, thường xuất hiện khi gõ tiếng Việt trên MacOS hoặc copy từ phần mềm khác). Trình duyệt hoặc engine tạo file PDF không thể render tốt NFD trên một số font chữ, dẫn tới dấu bay lơ lửng.
   - Thêm vào đó, font fallback trong CSS chưa ép kiểu chuẩn Serif (Times New Roman), dẫn tới việc thay font có thể làm lỗi glyph.
2. **Thiết kế preview:** CSS chưa giới hạn tối ưu trải nghiệm đọc (max-width, shadow, margin).
3. **Template:** Không có một template thống nhất xử lý chuẩn format tiếng Việt cũng như phân biệt daily/weekly tốt nhất, dẫn đến thiết kế rườm rà.

## D. Những gì đã sửa
1. **Font & Tiếng Việt:** 
   - Đã viết helper `normalizeVN(text)` để tự động chạy hàm `String.prototype.normalize('NFC')` trên mọi giá trị chuỗi (string) render trong mẫu in. Hàm này tự động nối chữ cái và dấu thành một ký tự nguyên khối (Precomposed Unicode), triệt tiêu hoàn toàn lỗi vỡ dấu.
   - Đã chèn cứng CSS cho bản in: `font-family: 'Times New Roman', Times, serif !important;` giúp hiển thị font chuẩn chỉ khi xuất ra PDF.
2. **Preview UI:** Modal `ReportPrintPreviewDialog` đã được làm chuẩn `max-w-5xl` với `bg-slate-200` mô phỏng background xám bên ngoài tờ giấy trắng (có đổ bóng `shadow-lg`), tối ưu hóa để giống hệt một tờ A4 thật trong màn hình app. Không hề mở popup rời app.
3. **Template Header:** Đã làm lại header với 2 cột: Cột trái "CÔNG TY CP XÂY DỰNG VÀ TM SỐ 2 HÀ NỘI" và "BCH CÔNG TRÌNH: [TÊN]"; Cột phải là Quốc hiệu và ngày tháng.
4. **Chữ ký (Signature):** Đã thu gọn hoàn toàn phần chân báo cáo, chỉ giữ lại mục "Người lập báo cáo" theo đúng yêu cầu tối giản.
5. **Daily/Weekly Print Layout:** Tối ưu section "I. NỘI DUNG CÔNG VIỆC", "II. NGUỒN LỰC", "III. VẤN ĐỀ" theo từng trường hợp `isWeekly`, hiển thị bảng chi tiết cực kỳ gãy gọn. Không có dữ liệu sẽ tự fallback thông báo lịch sự "Không ghi nhận".

## E. File đã sửa
1. `src/components/reports/report-print-template.tsx`: Chịu trách nhiệm hiển thị form in chính thức (vừa được refactor bằng NFC normalize và format mẫu).
2. `src/components/reports/report-print-preview-dialog.tsx`: Chịu trách nhiệm render modal preview in-app kích thước lớn, sang trọng.
3. `src/components/reports/reports-workspace.tsx` & `reports-table.tsx` & `report-detail-drawer.tsx`: Tích hợp tính năng gọi in-app overlay.
4. `src/app/print/reports/[reportId]/page.tsx`: Route dùng để hỗ trợ người dùng có link direct cũng render bằng đúng `ReportPrintTemplate` cho đồng nhất hệ thống.

## F. Kết quả lệnh
- `npx tsc --noEmit`: **PASS** (Exit code 0, không có lỗi type nào trong file TS/TSX).
- `npm run build`: **PASS** (Build tĩnh qua mượt mà, sẵn sàng triển khai môi trường Production).

## G. Checklist test tay
- [x] Preview Daily: Hiển thị A4, bảng chi tiết công việc, thời tiết, đầy đủ.
- [x] Preview Weekly: Hiển thị A4, tiêu đề từ ngày - đến ngày, tổng hợp công việc, không có thời tiết.
- [x] In/PDF: Bấm In sẽ gọi `window.print()` nội bộ an toàn, tự động ngắt CSS lề và ẩn UI web.
- [x] Font tiếng Việt: Chuỗi bị tách (NFD) đã được tự động compose lại thành NFC, hiển thị đẹp trên Times New Roman.
- [x] Header: 2 cột đúng chuẩn văn bản nhà nước.
- [x] Chữ ký: Chỉ có "Người lập báo cáo".
