# Field Progress Sync and UI Test Screenshots

**Test Date:** 09/06/2026  
**Module:** Field Progress (Khối lượng hiện trường)  
**Objective:** Test logic liên thông dữ liệu + UI/UX màu sắc + đồng bộ tỷ lệ bảng

---

## 📸 Danh Sách Screenshot

### 1. daily-0906-draft-after-reload.png
**Test Case:** TEST 1 - Lưu tạm ngày 09/06  
**Mô tả:** Sau khi nhập khối lượng cho 3 dòng (0.1, 22, 40) và bấm "Lưu tạm", reload lại trang. Dữ liệu phải vẫn còn đúng.  
**Kiểm tra:**
- [x] Dữ liệu 09/06 vẫn còn sau reload
- [x] Calendar Status hiển thị 09/06 là "Lưu tạm" (màu vàng)
- [x] Trạng thái ngày hiển thị "Đã lưu tạm"

---

### 2. daily-1006-empty-before-input.png
**Test Case:** TEST 2 - Tách dữ liệu ngày 09/06 và 10/06 (Part 1)  
**Mô tả:** Chuyển sang ngày 10/06. Các ô phải rỗng, không bị copy dữ liệu từ 09/06.  
**Kiểm tra:**
- [x] Dữ liệu 09/06 KHÔNG bị copy sang 10/06
- [x] Các ô 10/06 rỗng hoặc bằng 0

---

### 3. daily-1006-draft-after-save.png
**Test Case:** TEST 2 - Tách dữ liệu ngày 09/06 và 10/06 (Part 2)  
**Mô tả:** Nhập dữ liệu khác cho 10/06 (5, 10) và bấm "Lưu tạm".  
**Kiểm tra:**
- [x] Dữ liệu 10/06 đã lưu thành công
- [x] Calendar Status hiển thị 10/06 là "Lưu tạm"

---

### 4. daily-0906-return-check.png
**Test Case:** TEST 2 - Tách dữ liệu ngày 09/06 và 10/06 (Part 3)  
**Mô tả:** Quay lại ngày 09/06. Dữ liệu cũ (0.1, 22, 40) phải vẫn đúng.  
**Kiểm tra:**
- [x] Dữ liệu 09/06 vẫn đúng (0.1, 22, 40)
- [x] Không bị thay đổi bởi việc nhập 10/06

---

### 5. daily-submitted-status.png
**Test Case:** TEST 3 - Gửi giám sát  
**Mô tả:** Ở ngày có dữ liệu DRAFT, bấm "Gửi giám sát".  
**Kiểm tra:**
- [x] Có confirm dialog rõ ràng trước khi gửi
- [x] Trạng thái đổi sang "Chờ giám sát" hoặc "Chờ kiểm tra"
- [x] Calendar Status đổi màu xanh dương
- [x] UI giải thích rõ "đã gửi cho giám sát nhưng chưa tính vào lũy kế"

---

### 6. master-after-daily-entry.png
**Test Case:** TEST 4 - Bảng khối lượng gốc cập nhật  
**Mô tả:** Sau khi có dữ liệu DRAFT/SUBMITTED, vào màn Bảng khối lượng gốc.  
**Kiểm tra:**
- [x] Cột "Lũy kế" chỉ tính APPROVED
- [x] DRAFT/SUBMITTED không được cộng vào Lũy kế chính thức
- [x] Có khu vực riêng "Khối lượng chờ xác nhận" hiển thị DRAFT + SUBMITTED
- [x] Số liệu DRAFT + SUBMITTED rõ ràng

---

### 7. summary-approved-only.png
**Test Case:** TEST 5 - Tổng hợp khối lượng (Part 1)  
**Mô tả:** Vào màn Summary, lọc từ 09/06/2026 đến 10/06/2026, filter "Chỉ khối lượng đã xác nhận".  
**Kiểm tra:**
- [x] Lũy kế kỳ trước đúng
- [x] Phát sinh trong kỳ đúng (chỉ APPROVED)
- [x] Lũy kế đến nay đúng
- [x] Có notice giải thích "chỉ tính khối lượng đã xác nhận"

---

### 8. summary-include-draft-submitted.png
**Test Case:** TEST 5 - Tổng hợp khối lượng (Part 2)  
**Mô tả:** Đổi filter sang "Bao gồm lưu tạm/chờ giám sát".  
**Kiểm tra:**
- [x] Phát sinh trong kỳ có thay đổi (bao gồm DRAFT/SUBMITTED)
- [x] Có dòng chú thích: "Phát sinh trong kỳ có thể bao gồm dữ liệu chưa xác nhận"
- [x] Lũy kế đến nay vẫn chỉ tính APPROVED

---

### 9. over-quantity-warning.png
**Test Case:** TEST 6 - Vượt khối lượng  
**Mô tả:** Nhập khối lượng khiến tổng vượt 100% so với thiết kế.  
**Kiểm tra:**
- [x] Daily: Cảnh báo đỏ nhẹ "Vượt KL"
- [x] Summary: Badge "Vượt KL" màu đỏ
- [x] Master: Cảnh báo nếu dữ liệu đã APPROVED

---

### 10. color-disabled-button-fixed.png
**Test Case:** UI/UX - Màu sắc disabled button  
**Mô tả:** Kiểm tra disabled button có màu sáng (không phải đen/than).  
**Kiểm tra:**
- [x] Disabled button: `bg-slate-100 text-slate-400 border-slate-200`
- [x] Có tooltip giải thích vì sao disabled
- [x] Không dùng màu tối: `bg-slate-900`, `bg-gray-900`

---

### 11. three-tables-consistent-scale.png (Optional)
**Test Case:** UI/UX - Đồng bộ tỷ lệ bảng  
**Mô tả:** So sánh 3 màn (Master, Daily, Summary) để kiểm tra đồng bộ.  
**Kiểm tra:**
- [x] Row height: `h-14` (56px) thống nhất
- [x] Cell padding: `px-4 py-3` thống nhất
- [x] Font size header: `text-xs` thống nhất
- [x] Container: `max-w-[1600px]` thống nhất

---

## 🎯 Test Results Summary

### Data Logic Tests:
- [ ] TEST 1: Lưu tạm ngày 09/06 - PASS / FAIL
- [ ] TEST 2: Tách dữ liệu 09/06 và 10/06 - PASS / FAIL
- [ ] TEST 3: Gửi giám sát - PASS / FAIL
- [ ] TEST 4: Bảng khối lượng gốc - PASS / FAIL
- [ ] TEST 5: Tổng hợp khối lượng - PASS / FAIL
- [ ] TEST 6: Vượt khối lượng - PASS / FAIL

### UI/UX Tests:
- [ ] Màu sắc đồng bộ - PASS / FAIL
- [ ] Disabled button sáng - PASS / FAIL
- [ ] Input sáng rõ - PASS / FAIL
- [ ] Bảng đồng bộ tỷ lệ - PASS / FAIL

---

## 📝 Notes

**Cách chụp screenshot:**
1. Dùng Snipping Tool (Windows + Shift + S)
2. Hoặc dùng Snagit / ShareX
3. Save vào folder này với đúng tên file
4. Đảm bảo ảnh rõ nét, không bị crop quan trọng

**Quy tắc đặt tên:**
- Lowercase
- Dùng dấu gạch ngang `-`
- Mô tả rõ nội dung test
- Theo đúng danh sách ở trên

---

**Last Updated:** 09/06/2026  
**Tester:** Senior QA Engineer

