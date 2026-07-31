# BÁO CÁO TOÀN DIỆN VỀ VIỆC ĐỒNG BỘ CHIỀU RỘNG BẢNG, TỶ LỆ CỘT VÀ THAO TÁC DÒNG PHÂN HỆ SAFETY THEO GIÁM SÁT

> **Trạng thái:** PASS (Runtime Verified)  
> **Production Policy:** NO-GO (Strictly restricted to local development & QA environment)  
> **Mã hồ sơ quy chuẩn:** `specs/002-safety-inspection-workflow/safety-table-supervision-width-parity-report.md`  

---

## 1. KẾT LUẬN ĐIỀU HÀNH

- **Trạng thái phân hệ:** **PASS 100%**  
- **Xác minh Khảo sát Code Giám sát:** Đã khảo sát trực tiếp các file code của phân hệ Giám sát (`/reports/weekly-inspection/[id]/edit`):
  - **Page component:** `src/app/(dashboard)/reports/weekly-inspection/[id]/edit/page.tsx`
  - **Editor component:** `src/components/supervision-weekly/weekly-editor.tsx`
  - **Bảng ngày & dòng:** `src/components/supervision-weekly/result-schedule-table.tsx`
  - **Row Action Menu:** `src/components/supervision-weekly/row-action-menu.tsx`
- **Tỷ lệ & Chiều rộng Bảng Safety mới:**
  - Bỏ hoàn toàn `max-w-6xl` / `max-w-4xl` bó hẹp. Sử dụng toàn bộ chiều rộng workspace (`w-full space-y-5`) đồng bộ 100% với Giám sát.
  - Cấu trúc Grid 5 cột: `[17%_minmax(0,30fr)_minmax(0,30fr)_minmax(0,23fr)_44px]`.
  - Cột 4 (`Phát sinh thay đổi`) rộng rãi (~23% vùng còn lại), viền rõ ràng, không bị chèn ép.
  - Cột 5 (`Thao tác dòng`) rộng đúng `44px` cố định ở mép phải, chứa nút ba chấm `MoreVertical` dùng React Portal.
- **Thao tác dòng (Action Menu UX):**
  - **Xóa bỏ hoàn toàn dòng chữ đỏ "Xóa dòng"** xuất hiện trực tiếp ở mỗi hàng.
  - Nút ba chấm `MoreVertical` hiển thị khi hover/focus hoặc trên mobile.
  - **Menu 3 chấm gồm 2 chức năng:**
    1. `Nhân bản dòng`: Tạo dòng mới trong cùng ngày và buổi, sao chép công trình, nội dung và phát sinh.
    2. `Xóa dòng`: Xóa dòng chưa lưu ngay lập tức; xóa dòng đã lưu hiển thị Toast Hoàn tác trong 5s.
- **Sắp xếp nhãn & Textarea (Tránh ép chiều ngang):**
  - Nhãn `Nội dung kiểm tra, huấn luyện` nằm bên trái, nút `[Chọn nội dung gợi ý]` nằm bên phải trên CÙNG HÀNG NHÃN.
  - `AutoTextarea` nằm riêng nguyên dòng bên dưới nhãn, chiếm 100% chiều rộng cột.
- **Dữ liệu dài & Auto-Resize:**
  - Các cột tự giãn theo chiều cao nội dung (`items-stretch` / `vertical-align: top`), viền cột kéo dài 100% chiều cao hàng, không bị khoảng trắng lơ lửng hay thanh cuộn nhỏ.
  - Đã test thành công với tên công trình 196 ký tự, nội dung 1.018 ký tự và phát sinh thay đổi 715 ký tự.

---

## 2. PHÂN TÍCH ẢNH ĐẦU VÀO & NGUYÊN NHÂN TỒN ĐẠI

| Thành phần / Vấn đề | Phân tích bản cũ | Giải pháp khắc phục ở bản mới |
|---|---|---|
| **Chiều rộng Editor** | Bị bọc trong `max-w-6xl` tạo 2 vùng trắng lớn ở hai bên trên màn hình 1920x1080 | Sử dụng `w-full` trải hết chiều ngang workspace như Giám sát |
| **Cột Phát sinh thay đổi** | Bị ép nhỏ, thiếu viền rõ ràng | Tách riêng cột 4 chiếm `minmax(0, 23fr)` (~23% vùng còn lại), có viền rõ |
| **Nút Chọn gợi ý** | Đặt chen vào vùng nhập làm textarea bị hẹp | Chuyển lên hàng nhãn (bên phải nhãn), textarea chiếm 100% bề ngang phía dưới |
| **Chữ đỏ Xóa dòng** | Chữ đỏ `"Xóa dòng"` hiện trực tiếp ở từng hàng gây rối mắt | Bỏ hoàn toàn chữ đỏ. Dùng nút ba chấm `MoreVertical` đẹp chuẩn Giám sát |
| **Thao tác Nhân bản** | Không có chức năng nhân bản dòng | Bổ sung nút `Nhân bản dòng` trong menu 3 chấm |

---

## 3. KHẢO SÁT BẢNG GIÁM SÁT (`weekly-inspection`)

| Thành phần | Giám sát đang dùng | Safety hiện tại (Trước sửa) | Safety sau sửa |
|---|---|---|---|
| **Container** | `w-full space-y-5` | `max-w-6xl mx-auto` | `w-full space-y-5` |
| **Chiều rộng bảng** | Giãn hết chiều ngang workspace | Bị ép giữa màn hình | Trải toàn bộ 100% viewport workspace |
| **Cột 1 (Thời gian)** | `17%` (`md:grid-cols-[17%_83%]`) | `16%` | `17%` (Thời gian kiểm tra & các checkbox Sáng/Chiều/Tối) |
| **Cột 2 (Công trình)** | `minmax(0, 30fr)` | `27%` | `minmax(0, 30fr)` (Chọn combobox / Tự nhập) |
| **Cột 3 (Nội dung)** | `minmax(0, 30fr)` | `37%` (Nút gợi ý đè ô nhập) | `minmax(0, 30fr)` (Nút gợi ý ở hàng nhãn, textarea nằm riêng nguyên dòng) |
| **Cột 4 (Phát sinh)** | `minmax(0, 23fr)` | Bị co hẹp | `minmax(0, 23fr)` (Cột riêng rộng rãi, `AutoTextarea` riêng) |
| **Cột 5 (Action menu)** | `44px` fixed mép phải với `MoreVertical` | Chữ đỏ `"Xóa dòng"` lặp trực tiếp | `44px` fixed mép phải với `SafetyRowActionMenu` (3 chấm: `Nhân bản` & `Xóa`) |
| **Textarea auto-grow** | `AutoTextarea` dùng `useLayoutEffect` | `AutoTextarea` | `AutoTextarea` tự co giãn 100% chiều cao không cuộn nhỏ |
| **Nhân bản dòng** | Nút `Nhân bản` trong menu 3 chấm | Không có | Có nút `Nhân bản dòng` trong menu 3 chấm |
| **Xóa dòng** | Menu 3 chấm -> Xóa | Chữ đỏ `"Xóa dòng"` trực tiếp | Menu 3 chấm -> `Xóa dòng` (Xóa ngay / Toast Hoàn tác 5s) |
| **Mobile layout** | Grid 1 cột thành card từng dòng | Bị ép bảng hẹp | Card từng dòng compact, bảo toàn menu 3 chấm & thêm dòng |

---

## 4. MA TRẬN FILE ĐÃ SỬA ĐỔI

1. **`src/components/safety/safety-row-action-menu.tsx`** (MỚI)  
   - Component Menu 3 chấm `SafetyRowActionMenu` sử dụng `MoreVertical` icon và React Portal (`createPortal`).  
   - Hỗ trợ 2 action: `Nhân bản dòng` và `Xóa dòng`.  
2. **`src/components/safety/safety-plan-editor.tsx`**  
   - Rebuilt container sang `w-full space-y-5` (bỏ `max-w-6xl`).  
   - Áp dụng Grid 5 cột `[17%_minmax(0,30fr)_minmax(0,30fr)_minmax(0,23fr)_44px]`.  
   - Tách nút `[Chọn nội dung gợi ý]` lên hàng nhãn, cho `AutoTextarea` chiếm 100% width.  
   - Tích hợp `SafetyRowActionMenu` cho từng dòng.  
   - Xử lý `handleDuplicateEntry` và `handleDeleteEntry` với Toast Hoàn tác 5s.  

---

## 5. XÁC MINH KỸ THUẬT & BUILD AUDIT

- **`npx tsc --noEmit`**: PASSED (0 errors)  
- **`npm run build`**: PASSED (Exit code 0)  
- **Runtime Browser QA**: PASSED trên các viewport 1920x1080, 1366x768 và 390x844 (Mobile).  
- **Cách ly hệ thống**: Không sửa hay ảnh hưởng `Supervision*`.  

---

> **Báo cáo hoàn tất.** Bảng Safety đã đạt 100% đồng bộ UI/UX và độ rộng workspace với phân hệ Giám sát.
