# FIELD PROGRESS SYNC AND UI TEST REPORT

**Ngày thực hiện:** 09/06/2026  
**Người thực hiện:** Senior QA Engineer + Senior UI/UX Designer  
**Mục tiêu:** KIỂM THỬ LOGIC LIÊN THÔNG + TỐI ƯU MÀU SẮC + ĐỒNG BỘ TỶ LỆ BẢNG

---

## ⚠️ TRẠNG THÁI HIỆN TẠI

- **Dev Server:** ✅ Đang chạy trên http://localhost:3001
- **Git Status:** 6 files modified, chưa commit
- **Prisma:** ✅ Valid
- **TypeScript:** ✅ No errors
- **Build:** ✅ Production build successful

---

## 📋 DANH SÁCH FILES ĐÃ SỬA TRƯỚC ĐÓ (V3)

1. `src/app/(dashboard)/projects/[id]/field-progress/page.tsx`
2. `src/app/(dashboard)/projects/[id]/field-progress/daily/page.tsx`
3. `src/app/(dashboard)/projects/[id]/field-progress/summary/page.tsx`
4. `src/components/field-progress/master-table.tsx`
5. `src/components/field-progress/daily-entry-table.tsx`
6. `src/components/field-progress/daily-status-calendar.tsx` (MỚI)

---

## 🎯 MỤC TIÊU LẦN NÀY

### A. KIỂM THỬ LOGIC LIÊN THÔNG DỮ LIỆU

**Bắt buộc test bằng browser thật:**

#### TEST 1: LƯU TẠM NGÀY 09/06
- [ ] Truy cập: http://localhost:3001/projects/[id]/field-progress/daily?date=2026-06-09
- [ ] Chọn 3 dòng công việc bất kỳ
- [ ] Nhập khối lượng: Dòng 1: 0.1, Dòng 2: 22, Dòng 3: 40
- [ ] Bấm **"Lưu tạm"**
- [ ] **Reload lại trang (F5)**
- [ ] ✅ Kiểm tra: Dữ liệu 09/06 vẫn còn đúng
- [ ] ✅ Kiểm tra: Calendar Status hiển thị 09/06 là "Lưu tạm" (màu vàng)
- [ ] 📸 Chụp: `docs/qa/screenshots/field-progress-sync-test/daily-0906-draft-after-reload.png`

#### TEST 2: TÁCH DỮ LIỆU 09/06 VÀ 10/06
- [ ] Từ màn daily, chuyển sang: ?date=2026-06-10
- [ ] ✅ Kiểm tra: Dữ liệu 09/06 KHÔNG bị copy sang 10/06
- [ ] ✅ Kiểm tra: Các ô 10/06 phải rỗng
- [ ] Nhập dữ liệu khác cho 10/06: Dòng 1: 5, Dòng 2: 10
- [ ] Bấm **"Lưu tạm"**
- [ ] 📸 Chụp: `daily-1006-empty-before-input.png`
- [ ] 📸 Chụp: `daily-1006-draft-after-save.png`
- [ ] Quay lại ?date=2026-06-09
- [ ] ✅ Kiểm tra: Dữ liệu 09/06 vẫn đúng (0.1, 22, 40)
- [ ] 📸 Chụp: `daily-0906-return-check.png`
- [ ] Quay lại ?date=2026-06-10
- [ ] ✅ Kiểm tra: Dữ liệu 10/06 vẫn đúng (5, 10)

#### TEST 3: GỬI GIÁM SÁT
- [ ] Ở ngày 09/06 hoặc 10/06, bấm **"Gửi giám sát"**
- [ ] ✅ Kiểm tra: Có confirm rõ ràng trước khi gửi
- [ ] ✅ Kiểm tra: Trạng thái đổi sang "Chờ giám sát" hoặc "Chờ kiểm tra"
- [ ] ✅ Kiểm tra: Calendar Status đổi màu xanh dương
- [ ] ✅ Kiểm tra: UI giải thích rõ "đã gửi cho giám sát nhưng chưa phải khối lượng xác nhận"
- [ ] 📸 Chụp: `daily-submitted-status.png`

#### TEST 4: BẢNG KHỐI LƯỢNG GỐC CẬP NHẬT
- [ ] Sau khi có dữ liệu DRAFT/SUBMITTED, vào: /projects/[id]/field-progress
- [ ] ✅ Kiểm tra: Cột "Lũy kế" chỉ tính APPROVED
- [ ] ✅ Kiểm tra: DRAFT/SUBMITTED không được cộng vào Lũy kế chính thức
- [ ] ✅ Kiểm tra: Phải có khu vực riêng hiển thị "Khối lượng chờ xác nhận"
- [ ] ✅ Kiểm tra: Số liệu DRAFT + SUBMITTED hiển thị rõ ràng
- [ ] 📸 Chụp: `master-after-daily-entry.png`

#### TEST 5: TỔNG HỢP KHỐI LƯỢNG
- [ ] Vào: /projects/[id]/field-progress/summary
- [ ] Lọc từ 09/06/2026 đến 10/06/2026
- [ ] Filter: "Chỉ khối lượng đã xác nhận"
- [ ] ✅ Kiểm tra: "Lũy kế kỳ trước" đúng
- [ ] ✅ Kiểm tra: "Phát sinh trong kỳ" đúng
- [ ] ✅ Kiểm tra: "Lũy kế đến nay" đúng
- [ ] 📸 Chụp: `summary-approved-only.png`
- [ ] Đổi filter: "Bao gồm lưu tạm/chờ giám sát"
- [ ] ✅ Kiểm tra: Phát sinh trong kỳ có thay đổi
- [ ] ✅ Kiểm tra: Có dòng chú thích: "Phát sinh trong kỳ có thể bao gồm dữ liệu chưa xác nhận"
- [ ] 📸 Chụp: `summary-include-draft-submitted.png`
- [ ] Nếu không có dữ liệu phát sinh: kiểm tra empty state rõ ràng

#### TEST 6: VƯỢT KHỐI LƯỢNG
- [ ] Chọn 1 công việc có tổng KL thiết kế nhỏ
- [ ] Nhập khối lượng làm tổng vượt 100%
- [ ] ✅ Daily: Cảnh báo đỏ nhẹ
- [ ] ✅ Summary: Badge "Vượt KL"
- [ ] ✅ Master: Cảnh báo nếu dữ liệu đã APPROVED
- [ ] 📸 Chụp: `over-quantity-warning.png`

---

### B. SỬA MÀU SẮC TOÀN MODULE

#### Vấn đề hiện tại:
- ❌ Quá nhiều màu: xanh dương, xanh lá, tím, vàng, cyan, đỏ, gradient
- ❌ Disabled button có nền đen/than khó hiểu
- ❌ Một số input có nền tối

#### Quy định màu mới:

**Màu chính:**
- `bg-blue-600`, `text-blue-600`: Nút chính, link, focus
- Không dùng `cyan`/`emerald` cho ô nhập chính

**Màu nền:**
- Nền trang: `bg-slate-50`
- Card/table: `bg-white`
- Header bảng: `bg-slate-100` hoặc `bg-slate-50`
- Border: `border-slate-200`

**Trạng thái:**
- Lưu tạm / nháp: `bg-amber-50`, `text-amber-700`, `border-amber-200`
- Chờ giám sát: `bg-blue-50`, `text-blue-700`, `border-blue-200`
- Đã xác nhận: `bg-green-50`, `text-green-700`, `border-green-200`
- Vượt khối lượng: `bg-red-50`, `text-red-700`, `border-red-200`
- Chưa nhập: `bg-slate-50`, `text-slate-500`

**Disabled button:**
```tsx
bg-slate-100
text-slate-400
border border-slate-200
cursor-not-allowed
```
- Phải có `title` hoặc tooltip giải thích vì sao disabled

**Input:**
- Input thường: `bg-white`, `border-2 border-slate-300`, `text-slate-900`
- Input chính (KL ngày này): `bg-white`, `border-2 border-blue-300`, `focus:border-blue-500`
- Placeholder: `text-slate-400` (không quá mờ)

#### Files cần sửa màu:
- [ ] `src/components/field-progress/daily-entry-table.tsx`
- [ ] `src/components/field-progress/master-table.tsx`
- [ ] `src/components/field-progress/daily-status-calendar.tsx`

---

### C. ĐỒNG BỘ BẢNG GIỮA 3 MÀN

#### Vấn đề:
- 3 màn có tỷ lệ bảng khác nhau
- Row height không đồng bộ
- Padding cell khác nhau
- Font size header khác nhau

#### Chuẩn hóa:

**Container chung:**
```tsx
max-w-[1600px] mx-auto px-4 sm:px-6
```

**Card bảng:**
```tsx
rounded-2xl border border-slate-200 bg-white shadow-sm
```

**Header bảng:**
```tsx
bg-slate-50
text-xs font-semibold uppercase tracking-wide text-slate-500
```

**Row height:**
```tsx
h-14  // 56px thống nhất
```

**Cell padding:**
```tsx
px-4 py-3
```

**Text alignment:**
- Tên hạng mục / công việc: `text-left`
- Số lượng / lũy kế / %: `text-right`
- STT / đơn vị / trạng thái / hành động: `text-center`

#### Kiểm tra:
- [ ] Master table và Daily table có cùng row height
- [ ] Summary table không bị phóng quá lớn
- [ ] Padding cell đồng bộ
- [ ] Font size header đồng bộ
- [ ] 📸 Chụp: `three-tables-consistent-scale.png`

---

### D. SỬA CÁC NÚT BỊ LẶP

#### Kiểm tra:
- [ ] Màn Master: Chỉ giữ "Nhập khối lượng theo ngày" + "Xem tổng hợp" ở header
- [ ] Màn Daily: Chỉ giữ "Bảng khối lượng gốc" + "Xem tổng hợp" ở header
- [ ] Màn Summary: Chỉ giữ "Bảng khối lượng gốc" + "Nhập khối lượng theo ngày" ở header
- [ ] Không để lặp cùng chức năng ở nhiều nơi cùng màn

---

### E. GIẢI THÍCH RÕ DỮ LIỆU

#### Kiểm tra trong UI:

**"Lưu tạm":**
- [ ] Lưu vào `FieldProgressEntry.status = DRAFT`
- [ ] Có thể quay lại ngày đó để sửa
- [ ] Chưa tính vào lũy kế chính thức

**"Gửi giám sát":**
- [ ] Cập nhật `status = SUBMITTED`
- [ ] Hiển thị cho giám sát kiểm tra
- [ ] Chưa tính vào lũy kế chính thức nếu quy tắc là chỉ APPROVED mới tính

**"Đã xác nhận":**
- [ ] `status = APPROVED`
- [ ] Được tính vào lũy kế chính thức
- [ ] Xuất hiện ở Bảng khối lượng gốc và Tổng hợp

**Nếu chưa có màn duyệt:**
- [ ] Phải ghi rõ "chưa có luồng duyệt hoàn chỉnh"
- [ ] Không được giả vờ là đã xong

---

## 📸 DANH SÁCH SCREENSHOT CẦN CHỤP

Folder: `docs/qa/screenshots/field-progress-sync-test/`

### Bắt buộc (10 ảnh):
1. ✅ `daily-0906-draft-after-reload.png` - Ngày 09/06 sau reload vẫn còn dữ liệu
2. ✅ `daily-1006-empty-before-input.png` - Ngày 10/06 rỗng trước khi nhập
3. ✅ `daily-1006-draft-after-save.png` - Ngày 10/06 sau lưu tạm
4. ✅ `daily-0906-return-check.png` - Quay lại 09/06 vẫn đúng
5. ✅ `daily-submitted-status.png` - Sau gửi giám sát
6. ✅ `master-after-daily-entry.png` - Master sau khi nhập daily
7. ✅ `summary-approved-only.png` - Summary filter chỉ APPROVED
8. ✅ `summary-include-draft-submitted.png` - Summary bao gồm DRAFT/SUBMITTED
9. ✅ `over-quantity-warning.png` - Cảnh báo vượt khối lượng
10. ✅ `color-disabled-button-fixed.png` - Button disabled màu sáng

### Bổ sung (nếu có thời gian):
11. `three-tables-consistent-scale.png` - 3 bảng đồng bộ tỷ lệ
12. `calendar-status-working.png` - Calendar status hoạt động
13. `mobile-daily-responsive.png` - Daily mobile 390px
14. `mobile-summary-responsive.png` - Summary mobile 390px

---

## 🔧 FILES CẦN SỬA MÀU SẮC

### 1. daily-entry-table.tsx

**Disabled button hiện tại (nếu có màu tối):**
```tsx
// TÌM VÀ SỬA
className="... bg-slate-900 text-slate-400 ..."  // ❌ Sai
```

**Sửa thành:**
```tsx
className="... bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
title="Không có thay đổi để lưu"  // ✅ Phải có tooltip
```

**Input chính (KL ngày này):**
```tsx
// Kiểm tra có đúng không:
className="... border-2 border-blue-300 bg-white text-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 ..."
```

### 2. master-table.tsx

**Button "Lưu thay đổi" disabled:**
```tsx
// Tìm button Save
<Button 
  disabled={!hasChanges}
  className={hasChanges 
    ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700" 
    : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
  }
  title={!hasChanges ? "Không có thay đổi để lưu" : "Lưu các thay đổi"}
>
  <Save /> Lưu thay đổi
</Button>
```

### 3. daily-status-calendar.tsx

**Kiểm tra màu status:**
- APPROVED: `bg-green-100 border-green-300 text-green-700` ✅
- SUBMITTED: `bg-blue-100 border-blue-300 text-blue-700` ✅
- DRAFT: `bg-amber-100 border-amber-300 text-amber-700` ✅
- EMPTY: `bg-slate-100 border-slate-200 text-slate-400` ✅

---

## 📊 KẾT QUẢ KIỂM THỬ

### TEST 1: LƯU TẠM NGÀY 09/06
- **Kết quả:** [ ] PASS / [ ] FAIL
- **Lỗi phát hiện:** 
- **Screenshot:** 
- **Ghi chú:**

### TEST 2: TÁCH DỮ LIỆU 09/06 VÀ 10/06
- **Kết quả:** [ ] PASS / [ ] FAIL
- **Lỗi phát hiện:**
- **Screenshot:**
- **Ghi chú:**

### TEST 3: GỬI GIÁM SÁT
- **Kết quả:** [ ] PASS / [ ] FAIL
- **Lỗi phát hiện:**
- **Screenshot:**
- **Ghi chú:**

### TEST 4: BẢNG KHỐI LƯỢNG GỐC
- **Kết quả:** [ ] PASS / [ ] FAIL
- **Lỗi phát hiện:**
- **Screenshot:**
- **Ghi chú:**

### TEST 5: TỔNG HỢP KHỐI LƯỢNG
- **Kết quả:** [ ] PASS / [ ] FAIL
- **Lỗi phát hiện:**
- **Screenshot:**
- **Ghi chú:**

### TEST 6: VƯỢT KHỐI LƯỢNG
- **Kết quả:** [ ] PASS / [ ] FAIL
- **Lỗi phát hiện:**
- **Screenshot:**
- **Ghi chú:**

---

## 🐛 LỖI PHÁT HIỆN

### Lỗi Nghiêm Trọng (P0 - Phải fix ngay):
- [ ] Dữ liệu ngày bị lẫn lộn
- [ ] Lưu không thành công
- [ ] Lũy kế sai
- [ ] Crash ứng dụng

### Lỗi Quan Trọng (P1 - Phải fix trước khi deploy):
- [ ] Calendar status không cập nhật
- [ ] Màu sắc không đồng bộ
- [ ] Mobile responsive vỡ layout

### Lỗi Nhỏ (P2 - Có thể fix sau):
- [ ] Wording chưa chuẩn
- [ ] Tooltip thiếu
- [ ] Animation lag

---

## ✅ VERIFICATION CHECKLIST

### Build & Code Quality:
- [x] `npx prisma validate` - PASS
- [x] `npx tsc --noEmit` - PASS (0 errors)
- [x] `npm run build` - PASS

### Browser Testing:
- [ ] Chrome Desktop
- [ ] Firefox Desktop
- [ ] Edge Desktop
- [ ] Chrome Mobile (390px)
- [ ] Safari iOS

### Data Testing:
- [ ] Lưu tạm ngày 09/06
- [ ] Lưu tạm ngày 10/06
- [ ] Dữ liệu ngày không bị lẫn
- [ ] Gửi giám sát
- [ ] Lũy kế chỉ tính APPROVED

### UI Testing:
- [ ] Màu sắc đồng bộ
- [ ] Disabled button sáng
- [ ] Input sáng rõ
- [ ] Bảng đồng bộ tỷ lệ
- [ ] Mobile responsive

---

## 📝 HƯỚNG DẪN TEST THỦ CÔNG

### Bước 1: Truy cập ứng dụng
```
URL: http://localhost:3001
Login: admin@example.com / password (hoặc theo seed data)
```

### Bước 2: Chọn một công trình
```
Vào: /projects
Chọn 1 công trình có ID rõ ràng
Click "Xem chi tiết"
```

### Bước 3: Vào Field Progress
```
Trong trang chi tiết công trình
Scroll xuống section "Phân hệ quản lý"
Click card "Khối lượng hiện trường"
Hoặc trực tiếp: /projects/[id]/field-progress
```

### Bước 4: Thiết lập bảng khối lượng (nếu chưa có)
```
Nếu bảng trống:
1. Bấm "Thêm hạng mục chính"
2. Nhập tên: "Phần móng"
3. Bấm "+" để thêm công việc con
4. Nhập: "Đào móng", Mũi 1, 100 m3, m3
5. Bấm "Lưu thay đổi"
Lặp lại để có ít nhất 5 công việc
```

### Bước 5: Thực hiện các test case
```
Làm theo danh sách TEST 1-6 ở trên
Chụp screenshot sau mỗi bước quan trọng
Ghi lại kết quả vào section "Kết quả kiểm thử"
```

### Bước 6: Kiểm tra màu sắc
```
Kiểm tra tất cả button disabled có màu sáng
Kiểm tra input không có nền tối
Kiểm tra badge status có màu đúng
```

### Bước 7: Chụp screenshot
```
Dùng công cụ chụp màn hình (Snipping Tool hoặc Snagit)
Lưu vào: docs/qa/screenshots/field-progress-sync-test/
Đặt tên đúng theo danh sách
```

---

## 🎨 SỬA MÀU SẮC - CHI TIẾT KỸ THUẬT

### Pattern tìm kiếm các màu cần sửa:

**Tìm disabled button màu tối:**
```
Search: bg-slate-900|bg-gray-900|bg-slate-800
Replace: bg-slate-100
```

**Tìm text mờ quá:**
```
Search: text-slate-300
Replace: text-slate-400 (hoặc text-slate-500)
```

**Tìm input nền tối:**
```
Search: bg-slate-900|bg-gray-900
Replace: bg-white
```

**Tìm border không rõ:**
```
Search: border-slate-100
Replace: border-slate-200 hoặc border-slate-300
```

---

## 📌 FINAL CHECKLIST

Trước khi kết thúc report:

- [ ] Tất cả 6 test cases đã chạy
- [ ] Tối thiểu 10 screenshot đã chụp
- [ ] Màu sắc đã được kiểm tra và sửa
- [ ] Bảng đã đồng bộ tỷ lệ
- [ ] Disabled button đã sáng
- [ ] Input đã sáng
- [ ] Lỗi đã được ghi lại
- [ ] DB record đã được kiểm tra (qua Prisma Studio nếu cần)
- [ ] Mobile responsive đã test

---

## 🚀 DEPLOYMENT READINESS

**CHƯA SẴN SÀNG DEPLOY** cho đến khi:
- [ ] Tất cả test cases PASS
- [ ] Tất cả screenshot có đầy đủ
- [ ] Lỗi P0 đã fix xong
- [ ] Lỗi P1 đã fix xong
- [ ] Code review đã pass
- [ ] QA sign-off

---

## ✅ KIỂM TRA CODE SƠ BỘ (Trước khi test browser)

### Màu sắc - Kết quả kiểm tra:

**✅ Disabled Button (master-table.tsx):**
```tsx
className={hasChanges 
  ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700" 
  : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
}
title={!hasChanges ? "Không có thay đổi để lưu" : "Lưu các thay đổi"}
```
- ✅ Màu sáng: `bg-slate-100 text-slate-400`
- ✅ Border rõ: `border-slate-200`
- ✅ Có tooltip

**✅ Disabled Button (daily-entry-table.tsx):**
```tsx
// Button "Lưu tạm"
className={hasChanges 
  ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100" 
  : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
}

// Button "Gửi giám sát"
className="... disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
```
- ✅ Màu sáng khi disabled
- ✅ Có tooltip giải thích

**✅ Status Colors (daily-status-calendar.tsx):**
- APPROVED: `bg-green-100 border-green-300 text-green-700` ✅
- SUBMITTED: `bg-blue-100 border-blue-300 text-blue-700` ✅
- DRAFT: `bg-amber-100 border-amber-300 text-amber-700` ✅
- EMPTY: `bg-slate-100 border-slate-200 text-slate-400` ✅

**✅ Input Style (daily-entry-table.tsx):**
```tsx
// Input chính KL ngày này
className="... border-2 border-blue-300 bg-white text-slate-900 
           focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
```
- ✅ Background sáng: `bg-white`
- ✅ Border rõ: `border-2 border-blue-300`
- ✅ Text đậm: `text-slate-900`

**✅ Container & Table (3 màn):**
- Container: `max-w-[1600px] mx-auto px-4 sm:px-6` ✅
- Row height: `h-14` (56px) ✅
- Cell padding: `px-4 py-3` ✅
- Header: `bg-slate-50 text-xs font-semibold` ✅

### Kết luận kiểm tra code:
- ✅ **KHÔNG CÓ** màu tối (`bg-slate-900`, `bg-gray-900`)
- ✅ **KHÔNG CÓ** input nền tối
- ✅ **CÓ** tooltip cho disabled button
- ✅ **ĐỒNG BỘ** màu status giữa các component
- ✅ **ĐỒNG BỘ** container và table style

### ⚠️ Việc còn lại:
- ⏳ **TEST BROWSER THẬT** để verify UI thực tế
- ⏳ **TEST LOGIC LIÊN THÔNG** dữ liệu
- ⏳ **CHỤP SCREENSHOT** 10 ảnh bắt buộc

---

**Người thực hiện:** Senior QA Engineer  
**Ngày bắt đầu:** 09/06/2026  
**Status:** ✅ Code đã kiểm tra sơ bộ - ⏳ Đang chờ test browser thủ công

---

## 🎬 HƯỚNG DẪN BẮT ĐẦU TEST

**Server đã chạy:** http://localhost:3001

### Bước 1: Đăng nhập
```
URL: http://localhost:3001/login
Email: admin@example.com (hoặc theo seed data)
Password: password (hoặc theo seed data)
```

### Bước 2: Chọn hoặc tạo công trình test
```
1. Vào: http://localhost:3001/projects
2. Chọn 1 công trình có ID rõ ràng
   Hoặc tạo mới nếu chưa có
3. Ghi lại ID: ________________
```

### Bước 3: Thiết lập bảng khối lượng (nếu trống)
```
URL: http://localhost:3001/projects/[ID]/field-progress

Nếu bảng trống:
1. Bấm "Thêm hạng mục chính"
2. Nhập: "Phần móng"
3. Bấm "+" thêm công việc con:
   - Đào móng: 100 m3
   - Đổ bê tông móng: 50 m3  
   - Đào hố ga: 20 cái
   - Xây tường móng: 150 m2
   - Đổ dầm móng: 30 m3
4. Bấm "Lưu thay đổi"
```

### Bước 4: Bắt đầu test theo danh sách
```
Làm theo TEST 1-6 ở section "MỤC TIÊU LẦN NÀY"
Chụp screenshot sau mỗi bước
Lưu vào: docs/qa/screenshots/field-progress-sync-test/
```

