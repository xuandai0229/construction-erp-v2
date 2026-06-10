# FIELD PROGRESS TEST CHECKLIST

**Test Date:** 09/06/2026  
**Tester:** ___________________  
**Project ID được test:** ___________________  
**Browser:** Chrome / Firefox / Edge (khoanh tròn)

---

## 📋 QUICK CHECKLIST

Copy checklist này để theo dõi tiến độ test:

```
[ ] Server đã chạy (http://localhost:3001)
[ ] Đã login thành công
[ ] Đã chọn/tạo công trình test
[ ] Bảng khối lượng đã có ít nhất 5 công việc
[ ] Đã đọc hướng dẫn test

TEST LOGIC:
[ ] TEST 1: Lưu tạm ngày 09/06
[ ] TEST 2: Tách dữ liệu 09/06 và 10/06
[ ] TEST 3: Gửi giám sát
[ ] TEST 4: Bảng khối lượng gốc cập nhật
[ ] TEST 5: Tổng hợp khối lượng
[ ] TEST 6: Vượt khối lượng

SCREENSHOT:
[ ] daily-0906-draft-after-reload.png
[ ] daily-1006-empty-before-input.png
[ ] daily-1006-draft-after-save.png
[ ] daily-0906-return-check.png
[ ] daily-submitted-status.png
[ ] master-after-daily-entry.png
[ ] summary-approved-only.png
[ ] summary-include-draft-submitted.png
[ ] over-quantity-warning.png
[ ] color-disabled-button-fixed.png

UI/UX CHECK:
[ ] Disabled button màu sáng (không đen/than)
[ ] Input sáng rõ (không nền tối)
[ ] Badge status màu đúng (vàng/xanh/xanh lá)
[ ] Bảng 3 màn đồng bộ tỷ lệ
[ ] Tooltip disabled button rõ ràng

FINAL:
[ ] Tất cả test PASS
[ ] Lỗi đã ghi vào report
[ ] Screenshot đã lưu đúng folder
[ ] Report đã cập nhật kết quả
```

---

## 🎯 TEST 1: LƯU TẠM NGÀY 09/06

**URL Test:**
```
http://localhost:3001/projects/[ID]/field-progress/daily?date=2026-06-09
```

**Các bước:**
1. [ ] Vào URL trên
2. [ ] Chọn 3 công việc bất kỳ
3. [ ] Nhập KL:
   - Dòng 1: **0.1**
   - Dòng 2: **22**
   - Dòng 3: **40**
4. [ ] Bấm **"Lưu tạm"**
5. [ ] Đợi alert "Đã lưu tạm..."
6. [ ] **Reload trang (F5)**
7. [ ] Kiểm tra:
   - [ ] Dữ liệu 09/06 vẫn còn (0.1, 22, 40)
   - [ ] Calendar Status hiển thị 09/06 màu vàng
   - [ ] Badge trạng thái: "Đã lưu tạm"
8. [ ] 📸 Chụp: `daily-0906-draft-after-reload.png`

**Kết quả:**
- [ ] PASS
- [ ] FAIL - Lý do: _______________________

---

## 🎯 TEST 2: TÁCH DỮ LIỆU 09/06 VÀ 10/06

**Part 1: Chuyển sang 10/06 - Kiểm tra rỗng**

1. [ ] Từ màn daily, chuyển date sang `2026-06-10`
   ```
   Cách 1: Đổi input date picker
   Cách 2: URL: ?date=2026-06-10
   ```
2. [ ] Kiểm tra:
   - [ ] Các ô KL ngày này phải **rỗng**
   - [ ] Không bị copy dữ liệu từ 09/06
   - [ ] Calendar Status 10/06 màu xám (chưa nhập)
3. [ ] 📸 Chụp: `daily-1006-empty-before-input.png`

**Part 2: Nhập 10/06**

4. [ ] Nhập KL khác cho 10/06:
   - Dòng 1: **5**
   - Dòng 2: **10**
5. [ ] Bấm **"Lưu tạm"**
6. [ ] Kiểm tra:
   - [ ] Alert "Đã lưu tạm..."
   - [ ] Calendar Status 10/06 đổi màu vàng
7. [ ] 📸 Chụp: `daily-1006-draft-after-save.png`

**Part 3: Quay lại 09/06 - Verify không đổi**

8. [ ] Chuyển date về `2026-06-09`
9. [ ] Kiểm tra:
   - [ ] Dữ liệu 09/06 vẫn đúng (0.1, 22, 40)
   - [ ] KHÔNG bị thay đổi
10. [ ] 📸 Chụp: `daily-0906-return-check.png`

**Part 4: Quay lại 10/06 - Verify không đổi**

11. [ ] Chuyển date về `2026-06-10`
12. [ ] Kiểm tra:
   - [ ] Dữ liệu 10/06 vẫn đúng (5, 10)

**Kết quả:**
- [ ] PASS
- [ ] FAIL - Lý do: _______________________

---

## 🎯 TEST 3: GỬI GIÁM SÁT

**Các bước:**
1. [ ] Ở ngày 09/06 hoặc 10/06 (có dữ liệu DRAFT)
2. [ ] Bấm **"Gửi giám sát"**
3. [ ] Kiểm tra:
   - [ ] Có confirm dialog: "Xác nhận gửi số liệu ngày này cho giám sát?"
   - [ ] Dialog giải thích: "chuyển sang trạng thái SUBMITTED và chưa được tính vào lũy kế..."
4. [ ] Bấm **OK** trong confirm
5. [ ] Kiểm tra:
   - [ ] Alert "Đã gửi số liệu ngày ... cho giám sát"
   - [ ] Badge trạng thái đổi: "Chờ giám sát" hoặc "Chờ kiểm tra"
   - [ ] Calendar Status đổi màu xanh dương
   - [ ] Nút "Lưu tạm" disabled (vì đã gửi)
   - [ ] Nút "Gửi giám sát" disabled (vì đã gửi)
6. [ ] 📸 Chụp: `daily-submitted-status.png`

**Kết quả:**
- [ ] PASS
- [ ] FAIL - Lý do: _______________________

---

## 🎯 TEST 4: BẢNG KHỐI LƯỢNG GỐC CẬP NHẬT

**URL Test:**
```
http://localhost:3001/projects/[ID]/field-progress
```

**Các bước:**
1. [ ] Sau khi đã có dữ liệu DRAFT/SUBMITTED (từ TEST 1-3)
2. [ ] Vào màn Bảng khối lượng gốc
3. [ ] Kiểm tra **4 cards overview:**
   - [ ] Tổng hạng mục chính
   - [ ] Tổng công việc
   - [ ] Tổng KL thiết kế
   - [ ] % hoàn thành chính thức
4. [ ] Kiểm tra **Notice màu xanh:**
   - [ ] Có box notice giải thích: "Cột Lũy kế và % TH chỉ tính khối lượng đã được giám sát xác nhận"
5. [ ] Kiểm tra **Card "Khối lượng chờ xác nhận":**
   - [ ] Hiển thị "Lưu tạm": số KL DRAFT
   - [ ] Hiển thị "Chờ giám sát": số KL SUBMITTED
   - [ ] Hiển thị "Tổng chờ": DRAFT + SUBMITTED
6. [ ] Kiểm tra **Cột "Lũy kế" trong bảng:**
   - [ ] Chỉ tính APPROVED (nếu chưa có APPROVED thì = 0)
   - [ ] KHÔNG tính DRAFT/SUBMITTED
7. [ ] 📸 Chụp: `master-after-daily-entry.png`

**Kết quả:**
- [ ] PASS
- [ ] FAIL - Lý do: _______________________

---

## 🎯 TEST 5: TỔNG HỢP KHỐI LƯỢNG

**URL Test:**
```
http://localhost:3001/projects/[ID]/field-progress/summary
```

**Part 1: Filter "Chỉ khối lượng đã xác nhận"**

1. [ ] Vào màn Summary
2. [ ] Set filter:
   - Từ ngày: `09/06/2026`
   - Đến ngày: `10/06/2026`
   - Chế độ hiển thị: "Chỉ ngày có dữ liệu"
   - Trạng thái: **"Chỉ tính khối lượng đã xác nhận"**
3. [ ] Bấm **"Lọc"**
4. [ ] Kiểm tra bảng:
   - [ ] Lũy kế kỳ trước: số liệu APPROVED trước 09/06
   - [ ] Phát sinh trong kỳ: số liệu APPROVED từ 09-10/06
   - [ ] Lũy kế đến nay: tổng APPROVED đến 10/06
   - [ ] % TH: dựa trên lũy kế / thiết kế
5. [ ] Kiểm tra **Notice màu xanh dương:**
   - [ ] "Lũy kế và số phát sinh hiển thị trên bảng này chỉ tính khối lượng đã xác nhận"
6. [ ] 📸 Chụp: `summary-approved-only.png`

**Part 2: Filter "Bao gồm lưu tạm/chờ giám sát"**

7. [ ] Đổi filter sang: **"Bao gồm dữ liệu lưu tạm / chờ kiểm tra"**
8. [ ] Bấm **"Lọc"**
9. [ ] Kiểm tra bảng:
   - [ ] Phát sinh trong kỳ: tăng lên (bao gồm DRAFT + SUBMITTED)
   - [ ] Lũy kế đến nay: vẫn chỉ tính APPROVED
10. [ ] Kiểm tra **Notice màu vàng:**
    - [ ] "Phát sinh trong kỳ có thể bao gồm dữ liệu chưa xác nhận, còn lũy kế chính thức chỉ tính dữ liệu đã xác nhận"
    - [ ] "Màn này chưa có luồng duyệt hoàn chỉnh để chuyển SUBMITTED sang APPROVED"
11. [ ] 📸 Chụp: `summary-include-draft-submitted.png`

**Part 3: Empty State (nếu có thể test)**

12. [ ] Lọc khoảng ngày không có dữ liệu (ví dụ: 01/01/2026 - 02/01/2026)
13. [ ] Kiểm tra:
    - [ ] Có empty state rõ ràng
    - [ ] "Không có khối lượng phát sinh trong khoảng ngày này"
    - [ ] Gợi ý thay đổi filter

**Kết quả:**
- [ ] PASS
- [ ] FAIL - Lý do: _______________________

---

## 🎯 TEST 6: VƯỢT KHỐI LƯỢNG

**Các bước:**
1. [ ] Chọn 1 công việc có KL thiết kế nhỏ (ví dụ: 10 m3)
2. [ ] Vào màn Daily, nhập KL khiến tổng vượt 100%
   - Ví dụ: thiết kế 10, đã làm 8, nhập thêm 5 → tổng 13 > 10
3. [ ] Kiểm tra **Daily:**
   - [ ] Ô input có border đỏ: `border-red-400`
   - [ ] Text "Vượt KL" hiển thị dưới input
   - [ ] Số "Sau nhập" màu đỏ
   - [ ] % màu đỏ và > 100%
4. [ ] Bấm "Lưu tạm"
5. [ ] Vào màn **Summary:**
   - [ ] Row công việc vượt có background đỏ nhẹ: `bg-red-50`
   - [ ] Badge "Vượt KL" màu đỏ hiển thị
6. [ ] (Nếu có dữ liệu APPROVED vượt) Vào màn **Master:**
   - [ ] Row vượt có cảnh báo
   - [ ] Badge "Vượt KL" hiển thị
7. [ ] 📸 Chụp: `over-quantity-warning.png`

**Kết quả:**
- [ ] PASS
- [ ] FAIL - Lý do: _______________________

---

## 🎨 UI/UX CHECK

### Disabled Button Check

**Các bước:**
1. [ ] Vào màn **Daily** khi chưa nhập gì
2. [ ] Kiểm tra nút "Lưu tạm":
   - [ ] Màu: `bg-slate-100` (xám nhạt sáng)
   - [ ] Text: `text-slate-400` (xám nhạt)
   - [ ] Border: `border-slate-200`
   - [ ] Hover: có tooltip "Không có thay đổi để lưu"
3. [ ] 📸 Chụp: `color-disabled-button-fixed.png`
4. [ ] Vào màn **Master** khi chưa sửa gì
5. [ ] Kiểm tra nút "Lưu thay đổi":
   - [ ] Cùng màu: `bg-slate-100 text-slate-400`
   - [ ] Tooltip: "Không có thay đổi để lưu"

**Kết quả:**
- [ ] PASS - Màu sáng đúng design
- [ ] FAIL - Vẫn còn màu tối

### Input Sáng Check

1. [ ] Vào màn **Daily**
2. [ ] Kiểm tra ô "KL ngày này":
   - [ ] Background: trắng (`bg-white`)
   - [ ] Border: rõ (`border-2 border-blue-300`)
   - [ ] Text: đậm (`text-slate-900`)
   - [ ] Placeholder: không quá mờ (`text-slate-400`)
3. [ ] Vào màn **Master**
4. [ ] Kiểm tra các input:
   - [ ] Background: trắng hoặc trong suốt
   - [ ] Hover: `hover:bg-white`
   - [ ] Focus: `focus:bg-white focus:border-blue-400`

**Kết quả:**
- [ ] PASS - Input sáng rõ
- [ ] FAIL - Có input tối

### Badge Status Color Check

1. [ ] Kiểm tra Calendar Status màu:
   - [ ] Lưu tạm (DRAFT): màu vàng `bg-amber-100`
   - [ ] Chờ giám sát (SUBMITTED): màu xanh dương `bg-blue-100`
   - [ ] Đã xác nhận (APPROVED): màu xanh lá `bg-green-100`
   - [ ] Chưa nhập (EMPTY): màu xám `bg-slate-100`
2. [ ] Kiểm tra badge trạng thái ngày:
   - [ ] Màu đúng theo status
   - [ ] Border rõ ràng
   - [ ] Text dễ đọc

**Kết quả:**
- [ ] PASS - Màu đúng design
- [ ] FAIL - Màu không đồng bộ

### Bảng Đồng Bộ Check

1. [ ] Mở 3 tab:
   - Tab 1: Master
   - Tab 2: Daily
   - Tab 3: Summary
2. [ ] So sánh:
   - [ ] Row height giống nhau (`h-14` = 56px)
   - [ ] Cell padding giống nhau (`px-4 py-3`)
   - [ ] Font size header giống nhau (`text-xs`)
   - [ ] Container width giống nhau (`max-w-[1600px]`)
3. [ ] 📸 Chụp: `three-tables-consistent-scale.png` (optional)

**Kết quả:**
- [ ] PASS - Đồng bộ hoàn toàn
- [ ] PARTIAL - Có một số khác biệt nhỏ
- [ ] FAIL - Không đồng bộ

---

## 📊 FINAL SUMMARY

### Test Results:
- TEST 1: [ ] PASS / [ ] FAIL
- TEST 2: [ ] PASS / [ ] FAIL
- TEST 3: [ ] PASS / [ ] FAIL
- TEST 4: [ ] PASS / [ ] FAIL
- TEST 5: [ ] PASS / [ ] FAIL
- TEST 6: [ ] PASS / [ ] FAIL

### UI/UX Results:
- Disabled Button: [ ] PASS / [ ] FAIL
- Input Sáng: [ ] PASS / [ ] FAIL
- Badge Color: [ ] PASS / [ ] FAIL
- Bảng Đồng Bộ: [ ] PASS / [ ] FAIL

### Screenshot Status:
- Bắt buộc: ___/10 ảnh
- Optional: ___/4 ảnh
- Tổng: ___/14 ảnh

### Overall:
- [ ] ✅ **PRODUCTION READY** - Tất cả test PASS, có đủ screenshot
- [ ] ⚠️ **CẦN FIX** - Có lỗi nhỏ, cần sửa trước deploy
- [ ] ❌ **KHÔNG ỔN** - Có lỗi nghiêm trọng, phải fix ngay

---

## 🐛 LỖI PHÁT HIỆN

### P0 - Critical (Phải fix ngay):
1. _______________________________________
2. _______________________________________

### P1 - High (Fix trước deploy):
1. _______________________________________
2. _______________________________________

### P2 - Medium (Có thể fix sau):
1. _______________________________________
2. _______________________________________

---

## 📝 GHI CHÚ THÊM

_______________________________________
_______________________________________
_______________________________________
_______________________________________

---

**Tester:** ___________________  
**Date:** ___________________  
**Time spent:** _______ phút  
**Sign-off:** [ ] APPROVED / [ ] REJECTED

