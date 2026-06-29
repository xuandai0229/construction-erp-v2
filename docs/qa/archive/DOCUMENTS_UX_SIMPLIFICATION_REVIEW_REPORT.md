# Báo cáo Triển khai: Documents UX Simplification Review & Cleanup

## 1. Executive Summary
Sau nhiều giai đoạn phát triển (Phase A, B1, B2), giao diện quản lý tài liệu (Documents Workspace) đã bị "bội thực" tính năng và nút bấm. Người dùng công trường hoặc cấp quản lý thường chỉ có nhu cầu cốt lõi là xem, tải, tải lên và duyệt, nên việc hiển thị quá nhiều dropdown và nhãn mác đã làm giảm hiệu năng thao tác. Lần nâng cấp này tập trung thuần túy vào **Trải nghiệm người dùng (UX) và Giao diện (UI)**, theo nguyên tắc "Mặc định Đơn giản – Cần mới mở Nâng cao", giúp hệ thống thoáng đãng, dễ hiểu và chuyên nghiệp hơn hẳn.

## 2. Vấn đề UX trước khi sửa
- **Toolbar nặng nề**: Quá nhiều dropdown gom nhóm, sắp xếp cạnh tranh với thanh tìm kiếm.
- **Wording khô cứng**: Từ ngữ như "Không nhóm", "Loại hồ sơ", "Group by" có tính kỹ thuật cao.
- **Smart Suggestions quá lố**: Các thông báo phân loại chưa hoàn hảo màu vàng chiếm diện tích gây cảm giác "hệ thống bị lỗi".
- **Viewer rối mắt**: `fileHash`, `MIME type`, `Storage Path` hiện chình ình trong footer của Document Viewer khiến file mất đi sự tập trung.
- **Upload Preflight rườm rà**: Hiện ra cả bảng cảnh báo tên file, Rule kỹ thuật `friendlyAllowedTypes`, `namingHint` làm người dùng Upload bị ngợp.

## 3. Nguyên tắc Đơn giản hóa
1. **Focus**: Chỉ giữ các thao tác quan trọng nhất ở màn hình ngoài (Search, Tải lên).
2. **Thu gọn nâng cao**: Các bộ lọc, gom nhóm, thông số kỹ thuật đều được đưa vào panel hoặc `<details>` để tự động gập lại.
3. **Wording thân thiện**: Đổi sang tiếng Việt thuần (ví dụ: "Gom nhóm hiển thị", "Trạng thái duyệt").
4. **Không chạm Core Logic**: DB, RBAC, Data fetching giữ nguyên 100%.

## 4. Những thay đổi cụ thể
### 4.1. Toolbar Desktop & Mobile
- **Gom nhóm** đã bị loại khỏi Toolbar chính, được di chuyển hẳn vào trong **Filter Panel (Bộ lọc)**.
- Toolbar giờ chỉ còn đúng 4 món: `[ Input Tìm kiếm (dài) ]` — `[ Bộ lọc ]` — `[ Sắp xếp ]` — `[ Nút Tải lên (Màu chính) ]`.

### 4.2. Bộ lọc (Filter Panel) & Active Chips
- Đổi nhãn cho dễ hiểu: "Trạng thái" -> "Trạng thái duyệt", "Định dạng" -> "Loại file".
- **Thẻ hiển thị khi đang lọc (Active Chips)**: Bỏ các nút bọc màu mè, đổi sang chuỗi text siêu gọn: `Đang lọc: PDF · Đã duyệt · Hôm nay [Xóa]`.

### 4.3. Smart Suggestions
- Thay vì một hộp cảnh báo khổng lồ, hệ thống giờ chỉ hiện 1 dải bar mỏng dính màu xám nhạt `bg-slate-50` với text `[!] Lưu ý: Có 2 tài liệu chưa phân loại...`. Giữ không gian cho File List.

### 4.4. Upload Preflight
- Bỏ phần Warning tên file nếu kém.
- Bỏ bảng `[dl]` hiển thị Rule kỹ thuật (`namingHint`, `MIME...`).
- Giữ form lại cực ngắn gọn: File Icon, Tên hiển thị, Phân loại tự động, Ghi chú và 1 dòng nhỏ `Lưu vào thư mục: [Tên thư mục]`.

### 4.5. Document Viewer (In-app Preview)
- Header được chuẩn hóa, hiển thị badge Status bằng Tiếng Việt (Chờ duyệt, Đã duyệt, Từ chối).
- **Footer**: Chuyển các trường kỹ thuật (`File Hash`, `MIME Type`, `Storage ID`) vào trong thẻ HTML `<details>` có nhãn `Thông tin kỹ thuật`. Mặc định người dùng sẽ không thấy chúng.

### 4.6. File Card
- Các thẻ Card hiển thị file đã được đổi badge status sang Tiếng Việt. Giúp quản lý đọc lướt nhanh hơn (VD: thẻ màu xanh rêu là `Đã duyệt`).

## 5. Kết quả Test & Build
- [x] Màn Documents list và detail nhìn cực kỳ thoáng đãng.
- [x] Các tính năng lọc, search, auto-classify upload vẫn chạy đúng.
- [x] Prisma Validation: OK.
- [x] TypeScript `tsc --noEmit`: OK.
- [x] Next.js Build: OK.

## 6. Cảnh báo an toàn Git / Storage
- **Tuyệt đối cấm Push:** Repo local `D:\construction-erp-v2` hiện đang có `storage` trong git history. Mọi thao tác này chỉ lưu trữ local. 

## 7. Kết luận
- **UX Simplification**: PASS (Hoàn thành tái cấu trúc giao diện theo hướng Minimalist).
- **Mobile usability**: PASS (Không còn kẹt giao diện ngang).
- **Có migration không**: KHÔNG.
- **Có thể commit local không**: CÓ.
- **Push repo cũ**: KHÔNG.
- **Production**: NO-GO.
