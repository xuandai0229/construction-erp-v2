# Field Progress UI/UX Final Rework V3 - Screenshots Guide

## ⚠️ STATUS: CHƯA CÓ SCREENSHOT

**Date:** 09/06/2026  
**Reason:** Chưa test browser thật do giới hạn môi trường  
**Next Step:** Run `npm run dev` và test manual

---

## V3 IMPROVEMENTS

V3 là đợt rework toàn diện với các cải tiến lớn:

### UI/UX Changes:
- ✅ **Design System thống nhất:** Padding, fonts, colors đồng bộ 3 màn
- ✅ **Light theme:** Tất cả input/select/textarea bg-white, không còn nền tối
- ✅ **Calendar Status Component:** NEW - hiển thị 15 ngày với status màu sắc
- ✅ **Cards tổng quan:** 4 cards cho màn Master (Tổng hạng mục, Công việc, KL TK, % TH)
- ✅ **Info notices:** Giải thích rõ "Lưu tạm" vs "Gửi giám sát"
- ✅ **Button primary:** Đổi sang xanh dương (blue-600) thay vì emerald
- ✅ **Wording chính xác:** "KL ngày này" thay vì "KL hôm nay"
- ✅ **Filter Summary:** Inputs rõ ràng, h-11, border-2, font-bold

### Technical Changes:
- ✅ Query calendar entries (7 ngày trước/sau)
- ✅ Status priority: APPROVED > SUBMITTED > DRAFT
- ✅ Loại bỏ unused imports và deprecated code
- ✅ TypeScript 0 errors, Build successful

---

## Hướng dẫn chụp ảnh

### Yêu cầu:
1. Chạy database
2. Chạy `npm run dev`
3. Truy cập các trang
4. Chụp ảnh full màn hình
5. Lưu vào thư mục này với tên chính xác

---

## Danh sách screenshots (16 ảnh)

### Master Page (Bảng khối lượng gốc)

#### 1. master-overview-cards.png ⭐ NEW IN V3
**Trang:** `/projects/[id]/field-progress`  
**Nội dung:** 4 cards tổng quan ở đầu màn

**Điểm cần chụp rõ:**
- 4 cards gradient: blue, emerald, purple, amber
- Icons: Package, BarChart3, TrendingUp, CheckCircle2
- Số liệu: Tổng hạng mục, Tổng công việc, Tổng KL TK, % hoàn thành
- Border-2 với màu tương ứng

#### 2. master-notice.png ⭐ NEW IN V3
**Trang:** `/projects/[id]/field-progress`  
**Nội dung:** Card info notice về lũy kế

**Điểm cần chụp rõ:**
- Card bg-blue-50 với border-2 border-blue-200
- Icon CheckCircle2 trong box bg-blue-100
- Text giải thích "Lũy kế chỉ tính khối lượng đã được giám sát xác nhận"

#### 3. master-table-desktop.png
**Trang:** `/projects/[id]/field-progress`  
**Nội dung:** Bảng khối lượng gốc

**Điểm cần chụp rõ:**
- Subtitle: "Thiết lập hạng mục, công việc, mũi thi công..."
- Button primary BLUE-600 (không phải emerald): "Nhập khối lượng theo ngày"
- Hạng mục chính bg-sky-50, công việc con bg-white
- Alignment: text trái, số phải, STT/actions giữa

### Daily Page (Nhập khối lượng theo ngày)

#### 4. daily-calendar-status.png ⭐ NEW IN V3 - QUAN TRỌNG NHẤT
**Trang:** `/projects/[id]/field-progress/daily`  
**Nội dung:** Component Calendar Status Timeline

**Điểm cần chụp rõ:**
- Timeline ngang 15 ngày (7 trước + current + 7 sau)
- Màu sắc status:
  - Emerald (xanh lá): Đã xác nhận
  - Blue (xanh dương): Chờ giám sát
  - Amber (vàng): Lưu tạm
  - Slate (xám): Chưa nhập
- Border xanh đậm cho ngày hiện tại
- Legend ở dưới với 4 status
- Title: "Lịch trạng thái báo cáo"

#### 5. daily-info-notice.png ⭐ NEW IN V3
**Trang:** `/projects/[id]/field-progress/daily`  
**Nội dung:** Card info giải thích Lưu tạm và Gửi giám sát

**Điểm cần chụp rõ:**
- Card bg-blue-50 với title "Ý nghĩa các nút lưu"
- Icon Save (amber) + text "Lưu tạm: DRAFT, chưa tính vào lũy kế"
- Icon Send (blue) + text "Gửi giám sát: SUBMITTED, chờ kiểm tra"
- Badge status ví dụ trong text



#### 6. daily-table-desktop.png
**Trang:** `/projects/[id]/field-progress/daily`  
**Nội dung:** Bảng nhập khối lượng với dữ liệu

**Điểm cần chụp rõ:**
- Wording: **"KL ngày này"** (không phải "KL hôm nay")
- Cột KL ngày này: bg-cyan-50, border-cyan-400
- Stats cards: Tổng công việc, Đã nhập ngày này, Chưa nhập, Vượt KL
- Badge status: "Đang chỉnh sửa" hoặc "Đã lưu tạm"
- Filter inputs: bg-white, border-2, rõ ràng

#### 7. daily-detail-modal.png
**Trang:** `/projects/[id]/field-progress/daily`  
**Nội dung:** Bấm "Chi tiết" 1 dòng

**Điểm cần chụp rõ:**
- Modal max-w-3xl (896px)
- Title: "Chi tiết công việc trong ngày"
- 3 numbered badges (1, 2, 3) với màu khác nhau:
  - 1: bg-blue-100 - Diễn biến công việc
  - 2: bg-amber-100 - Khó khăn/Vướng mắc
  - 3: bg-emerald-100 - Đề xuất/Kiến nghị
- Textarea bg-white, min-h-[100px], border-2
- Badge ngày báo cáo bg-blue-100

#### 8. daily-buttons.png
**Trang:** `/projects/[id]/field-progress/daily`  
**Nội dung:** Desktop: nút Lưu tạm và Gửi giám sát

**Điểm cần chụp rõ:**
- Nút "Lưu tạm": amber-400 border, amber-50 bg, icon Save
- Nút "Gửi giám sát": blue-600 bg, white text, icon Send
- Tooltip/title hiển thị ý nghĩa khi hover

### Summary Page (Tổng hợp khối lượng)

#### 9. summary-filter.png ⭐ NEW IN V3
**Trang:** `/projects/[id]/field-progress/summary`  
**Nội dung:** Filter card

**Điểm cần chụp rõ:**
- Inputs: h-11, border-2, bg-white, text-slate-900
- Label: font-bold, text-sm
- Button "Lọc": bg-blue-600 (không phải emerald), với icon Filter
- Không còn mờ/nhạt như trước

#### 10. summary-table-desktop.png
**Trang:** `/projects/[id]/field-progress/summary`  
**Nội dung:** Bảng tổng hợp

**Điểm cần chụp rõ:**
- Button primary: blue-600 "Nhập khối lượng theo ngày"
- Cột "Phát sinh trong kỳ": bg-indigo-50, text-indigo-700
- Cột "Lũy kế đến nay": bg-blue-50, text-blue-800
- Cột ngày phát sinh (nếu có): bg-green-50
- Badge "VƯỢT" nếu % > 100

#### 11. summary-notice.png
**Trang:** `/projects/[id]/field-progress/summary`  
**Nội dung:** Notice cuối bảng

**Điểm cần chụp rõ:**
- Notice giải thích logic tính lũy kế theo filter
- Màu bg-blue-50 hoặc bg-yellow-50 tùy filter

### Mobile Views

#### 12. daily-mobile-390.png
**Trang:** `/projects/[id]/field-progress/daily` (390px width)  
**Nội dung:** Mobile responsive

**Điểm cần chụp rõ:**
- Card list gọn gàng
- Sticky bottom buttons: "Lưu tạm" + "Gửi giám sát"
- Không tràn ngang
- Input dễ bấm (h-12 hoặc h-14)

#### 13. summary-mobile-390.png
**Trang:** `/projects/[id]/field-progress/summary` (390px width)  
**Nội dung:** Mobile responsive

**Điểm cần chụp rõ:**
- Card công việc với metrics
- Ngày phát sinh scroll ngang
- Không tràn ngang

### Test Flow Screenshots

#### 14. calendar-draft-status.png
**Trang:** `/projects/[id]/field-progress/daily`  
**Nội dung:** Calendar với ngày có status DRAFT (amber)

#### 15. calendar-submitted-status.png
**Trang:** `/projects/[id]/field-progress/daily`  
**Nội dung:** Calendar với ngày có status SUBMITTED (blue)

#### 16. over-quantity-warning.png
**Trang:** `/projects/[id]/field-progress/daily`  
**Nội dung:** Dòng vượt khối lượng

**Điểm cần chụp rõ:**
- Dòng bg-red-50
- Text màu đỏ
- Badge "Vượt KL"
- Cảnh báo dưới input

---

## Checklist (16 screenshots)

**Master Page:**
- [ ] 1. master-overview-cards.png (4 cards gradient)
- [ ] 2. master-notice.png (info về lũy kế)
- [ ] 3. master-table-desktop.png (bảng gốc)

**Daily Page:**
- [ ] 4. daily-calendar-status.png ⭐ (timeline 15 ngày)
- [ ] 5. daily-info-notice.png ⭐ (giải thích Lưu tạm/Gửi GS)
- [ ] 6. daily-table-desktop.png ("KL ngày này")
- [ ] 7. daily-detail-modal.png (3 textarea sáng)
- [ ] 8. daily-buttons.png (amber + blue buttons)

**Summary Page:**
- [ ] 9. summary-filter.png ⭐ (filter sáng rõ)
- [ ] 10. summary-table-desktop.png (bảng tổng hợp)
- [ ] 11. summary-notice.png (notice logic)

**Mobile:**
- [ ] 12. daily-mobile-390.png
- [ ] 13. summary-mobile-390.png

**Test Flow:**
- [ ] 14. calendar-draft-status.png (amber)
- [ ] 15. calendar-submitted-status.png (blue)
- [ ] 16. over-quantity-warning.png (red warning)

---

## FINAL CHECKLIST

Trước khi coi là hoàn thành:

**Code:**
- [x] TypeScript: 0 errors
- [x] Prisma: Valid
- [x] Build: Success
- [x] Lint: Pass

**UI:**
- [ ] All 16 screenshots captured
- [ ] Screenshots saved to this folder
- [ ] File names exact match

**Testing:**
- [ ] Test A: Lưu tạm ngày 09/06 ✅
- [ ] Test B: Tách ngày 09/06 và 10/06 ✅
- [ ] Test C: Gửi giám sát ✅
- [ ] Test D: Summary đúng ✅
- [ ] Test E: Master cập nhật ✅
- [ ] Test F: Vượt KL warning ✅
- [ ] Test G: Mobile responsive ✅

**Documentation:**
- [ ] Report updated with test results
- [ ] README updated with screenshot status
- [ ] Bugs documented if found

---

**⚠️ KHÔNG CÓI LÀ "PRODUCTION READY" CHO ĐẾN KHI:**
- Tất cả 16 screenshots đã được chụp
- Tất cả 7 test scenarios đã pass
- Report đã cập nhật với kết quả thật

---

**Next Steps:**
1. Run `npm run dev`
2. Login và chọn project
3. Chụp 16 screenshots theo danh sách
4. Run 7 test scenarios
5. Document kết quả trong report
6. Update checkboxes trong README này
