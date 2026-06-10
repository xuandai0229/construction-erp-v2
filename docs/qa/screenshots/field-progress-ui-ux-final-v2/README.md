# Field Progress UI/UX Final Rework V2 - Screenshots

## Hướng dẫn chụp ảnh

### Yêu cầu:
- Chạy `npm run dev`
- Truy cập các trang sau
- Chụp ảnh full màn hình
- Lưu vào thư mục này

---

## Danh sách screenshots cần có:

### 1. master-table-desktop.png
**Trang:** `/projects/[id]/field-progress`  
**Nội dung:**
- Bảng khối lượng gốc
- Hiển thị đầy đủ cột
- Có ít nhất 5-10 dòng dữ liệu

**Lưu ý:**
- Thể hiện rõ header bảng
- Thể hiện dòng hạng mục chính (nền xanh nhạt)
- Thể hiện dòng công việc con

---

### 2. daily-table-desktop-before-save.png
**Trang:** `/projects/[id]/field-progress/daily?date=2026-06-09`  
**Nội dung:**
- Bảng nhập khối lượng theo ngày
- Đã nhập vài dòng KL hôm nay
- Chưa bấm "Lưu tạm"
- Badge "Đang chỉnh sửa (Chưa lưu)" màu cam

**Lưu ý:**
- **Phải chụp ô "KL hôm nay" màu CYAN (xanh nước biển)** ← Điểm nhấn chính
- Thể hiện border cyan-400, background cyan-50
- Thể hiện số liệu đang nhập

---

### 3. daily-table-desktop-after-save.png
**Trang:** `/projects/[id]/field-progress/daily?date=2026-06-09` (sau khi bấm "Lưu tạm")  
**Nội dung:**
- Cùng trang nhưng sau khi lưu
- Badge "Đã lưu tạm" màu xanh
- Dữ liệu vẫn hiển thị

---

### 4. daily-detail-modal.png
**Trang:** `/projects/[id]/field-progress/daily?date=2026-06-09`  
**Nội dung:**
- Bấm nút "Chi tiết" ở 1 dòng
- Modal "Chi tiết công việc trong ngày" hiển thị
- 3 textarea hiển thị đầy đủ với numbered badge (1, 2, 3)

**Lưu ý:**
- Modal rộng 896px (max-w-3xl)
- Textarea cao 100px
- Border dày 2px
- Header có gradient
- Thể hiện "Ngày báo cáo" badge màu xanh

---

### 5. daily-quick-add-modal.png
**Trang:** `/projects/[id]/field-progress/daily`  
**Nội dung:**
- Bấm nút "Thêm công việc phát sinh"
- Modal hiển thị đầy đủ form

**Lưu ý:**
- Modal rộng 576px (max-w-xl)
- Input border 2px
- Input rounded-xl (bo góc lớn)
- Placeholder chi tiết: "Ví dụ: Đào móng đoạn Km3+200 đến Km3+500..."
- Nếu chọn "Tạo hạng mục mới": chụp luôn phần form màu xanh hiện ra

---

### 6. summary-table-desktop.png
**Trang:** `/projects/[id]/field-progress/summary`  
**Nội dung:**
- Bảng tổng hợp khối lượng thi công
- Lọc từ 09/06 đến 10/06
- Hiển thị đầy đủ các cột:
  - Lũy kế kỳ trước
  - Phát sinh trong kỳ (màu indigo)
  - Lũy kế đến nay (màu xanh)
  - Các ngày phát sinh (màu xanh lá)

**Lưu ý:**
- Thể hiện cột động theo ngày
- Thể hiện dòng có dữ liệu và dòng không có dữ liệu
- Thể hiện cảnh báo "Vượt KL" nếu có

---

### 7. daily-input-quantity-focus.png
**Trang:** `/projects/[id]/field-progress/daily`  
**Nội dung:**
- Zoom vào 1 dòng đang nhập
- Ô "KL hôm nay" đang focus (có ring xanh cyan lớn)
- Thể hiện rõ màu:
  - Border: cyan-600
  - Background: cyan-50
  - Text: cyan-900
  - Ring: cyan-100 (4px)

**Lưu ý:**
- Đây là ảnh quan trọng nhất
- Phải thể hiện rõ sự khác biệt so với màu cũ (emerald)
- Chụp khi đang focus để thấy ring

---

## So sánh trước và sau (nếu có thời gian):

### Before (Optional):
Checkout commit trước và chụp ảnh tương tự để so sánh màu emerald vs cyan

### After:
Chụp ảnh hiện tại với màu cyan

---

## Checklist:

- [ ] master-table-desktop.png
- [ ] daily-table-desktop-before-save.png
- [ ] daily-table-desktop-after-save.png
- [ ] daily-detail-modal.png
- [ ] daily-quick-add-modal.png
- [ ] summary-table-desktop.png
- [ ] daily-input-quantity-focus.png

---

## Lưu ý chung:

1. Chụp ảnh độ phân giải cao (1920x1080 trở lên)
2. Không zoom quá to hoặc quá nhỏ
3. Thể hiện đầy đủ context (header, footer, sidebar nếu có)
4. Đặt tên file đúng như trên
5. Format: PNG (nén lossless)
