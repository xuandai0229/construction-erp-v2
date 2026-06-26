# Suppliers - Market Sample Data Seed Report

**Ngày:** 2026-06-26
**Module:** Nhà cung cấp & thầu phụ (`/suppliers`)

---

## 1. Mục tiêu và Tính chất dữ liệu

**Mục tiêu:** Tạo bộ dữ liệu mẫu thực tế, đủ đa dạng để có thể test toàn bộ tính năng CRUD, Search, Dashboard summary và layout UI trên cả desktop lẫn mobile của màn hình Suppliers.

**Tính chất dữ liệu:**
> [!IMPORTANT]  
> Đây là **dữ liệu mô phỏng thị trường**, hoàn toàn KHÔNG phải là dữ liệu pháp lý của các công ty thật trên thị trường.
- Tên công ty/đội thi công mô phỏng theo cấu trúc tên thường gặp trong ngành xây dựng tại Việt Nam.
- Mã số thuế (MST) dùng dạng `MST-TEST-xxx`.
- Số điện thoại dùng dạng `0900 000 xxx`.
- Email dùng domain nội bộ an toàn `example.local`.

---

## 2. Số lượng và Cơ cấu

**Tổng số lượng:** 30 suppliers
**Phân bổ theo nhóm thị trường (dựa vào `code` và `name`):**
- Nhà cung cấp vật liệu chính (Xi măng, Thép, Cát đá, Gạch, Bê tông): 7
- Nhà cung cấp vật tư hoàn thiện (Sơn, Chống thấm, Gạch ốp, Thạch cao, Cửa): 5
- Nhà cung cấp thiết bị, máy móc, an toàn (Giàn giáo, Máy thi công, BHLĐ, Điện nước, PCCC): 5
- Dịch vụ (Vận chuyển, Cẩu hạ, Thí nghiệm, Phế thải): 4
- Thầu phụ thi công (Xây thô, Cốp pha, MEP, PCCC, Nhôm kính, Sơn bả, Điện lạnh, Cảnh quan, Vệ sinh): 9

---

## 3. Danh sách dữ liệu mẫu đã seed

| Mã (`code`) | Tên đối tác (`name`) | MST (`taxCode`) | SĐT (`phone`) | Email (`email`) | Người liên hệ (`contactPerson`) | Địa chỉ (`address`) |
|---|---|---|---|---|---|---|
| NCC-XM-001 | Công ty TNHH Vật liệu Xây dựng An Phát | MST-TEST-001 | 0900 000 001 | ncc.xm001@example.local | Nguyễn Văn Hùng | Khu công nghiệp Quang Minh, Mê Linh, Hà Nội |
| NCC-XM-002 | Công ty CP Xi măng và Bê tông Bắc Việt | MST-TEST-002 | 0900 000 002 | ncc.xm002@example.local | Trần Minh Đức | KCN Yên Phong, Bắc Ninh |
| NCC-THEP-001 | Công ty TNHH Thép Minh Long | MST-TEST-003 | 0900 000 003 | ncc.thep001@example.local | Lê Hoàng Nam | Đường Nguyễn Văn Linh, KCN Phố Nối A, Hưng Yên |
| NCC-THEP-002 | Công ty CP Thép Kết Cấu Đại Thành | MST-TEST-004 | 0900 000 004 | ncc.thep002@example.local | Phạm Anh Tuấn | KCN Đình Vũ, An Dương, Hải Phòng |
| NCC-CATDA-001 | Công ty TNHH Cát Đá Sông Hồng | MST-TEST-005 | 0900 000 005 | ncc.catda001@example.local | Đỗ Quốc Việt | Bến Bãi Phù Vân, Kim Bảng, Hà Nam |
| NCC-GACH-001 | Công ty CP Gạch Xây Dựng Đông Đô | MST-TEST-006 | 0900 000 006 | ncc.gach001@example.local | Bùi Thanh Sơn | Xã Liên Hà, Đan Phượng, Hà Nội |
| NCC-BETONG-001 | Công ty TNHH Bê Tông Thương Phẩm Hà An | MST-TEST-007 | 0900 000 007 | ncc.betong001@example.local | Hoàng Đức Long | Trạm trộn số 3, Gia Lâm, Hà Nội |
| NCC-SON-001 | Công ty TNHH Sơn và Vật Tư Hoàn Thiện Việt Phát | MST-TEST-008 | 0900 000 008 | ncc.son001@example.local | Vũ Mạnh Cường | Số 45 Nguyễn Trãi, Thanh Xuân, Hà Nội |
| NCC-CHONGTHAM-001 | Công ty TNHH Chống Thấm Nam Á | MST-TEST-009 | 0900 000 009 | ncc.chongtham001@example.local | Ngô Minh Quân | KCN Tân Bình, TP. Hồ Chí Minh |
| NCC-GACHOP-001 | Công ty CP Gạch Ốp Lát Minh Khang | MST-TEST-010 | 0900 000 010 | ncc.gachop001@example.local | Trịnh Văn Hải | KCN Mỹ Phước 3, Bến Cát, Bình Dương |
| NCC-THACHCAO-001 | Công ty TNHH Trần Vách Thạch Cao Hưng Thịnh | MST-TEST-011 | 0900 000 011 | ncc.thachcao001@example.local | Đinh Công Thắng | Số 12 Lê Duẩn, Hoàn Kiếm, Hà Nội |
| NCC-CUA-001 | Công ty CP Cửa và Phụ Kiện Xây Dựng An Gia | MST-TEST-012 | 0900 000 012 | ncc.cua001@example.local | Lý Quốc Bảo | KCN Bắc Thăng Long, Đông Anh, Hà Nội |
| NCC-GIANGIAO-001 | Công ty TNHH Giàn Giáo Cốp Pha Thành Công | MST-TEST-013 | 0900 000 013 | ncc.giangiao001@example.local | Dương Văn Trung | Xã Đại Mạch, Đông Anh, Hà Nội |
| NCC-MAYTHICONG-001 | Công ty CP Thiết Bị Thi Công Bắc Hà | MST-TEST-014 | 0900 000 014 | ncc.maythicong001@example.local | Phan Đình Phong | KCN Bình Xuyên, Vĩnh Phúc |
| NCC-BHLD-001 | Công ty TNHH Bảo Hộ Lao Động Việt Tín | MST-TEST-015 | 0900 000 015 | ncc.bhld001@example.local | Tạ Quang Minh | Số 78 Trường Chinh, Đống Đa, Hà Nội |
| NCC-DIENNUOC-001 | Công ty TNHH Vật Tư Điện Nước Phú Minh | MST-TEST-016 | 0900 000 016 | ncc.diennuoc001@example.local | Đặng Hữu Thành | Chợ Giời, Hai Bà Trưng, Hà Nội |
| NCC-PCCC-001 | Công ty CP Thiết Bị PCCC An Toàn Việt | MST-TEST-017 | 0900 000 017 | ncc.pccc001@example.local | Lương Đức Hiếu | Số 23 Ngọc Hồi, Thanh Trì, Hà Nội |
| DV-VANCHUYEN-001 | Công ty TNHH Vận Tải Công Trình Minh Đức | MST-TEST-018 | 0900 000 018 | dv.vanchuyen001@example.local | Cao Xuân Trường | Bãi xe Văn Điển, Thanh Trì, Hà Nội |
| DV-CAUHA-001 | Công ty CP Cẩu Hạ và Logistics Đông Bắc | MST-TEST-019 | 0900 000 019 | dv.cauha001@example.local | Mai Hồng Sơn | KCN VSIP, Từ Sơn, Bắc Ninh |
| DV-THINGHIEM-001 | Trung tâm Thí Nghiệm Vật Liệu Xây Dựng Sao Việt | MST-TEST-020 | 0900 000 020 | dv.thinghiem001@example.local | Nguyễn Thị Hương | Số 5 Phạm Hùng, Nam Từ Liêm, Hà Nội |
| DV-PHETHAI-001 | Công ty TNHH Thu Gom Phế Thải Xây Dựng Xanh | MST-TEST-021 | 0900 000 021 | dv.phethai001@example.local | Hà Văn Phúc | Bãi tập kết Sóc Sơn, Hà Nội |
| TP-XAYTHO-001 | Công ty TNHH Thầu Phụ Xây Thô Hòa Bình | MST-TEST-022 | 0900 000 022 | tp.xaytho001@example.local | Trần Quốc Đạt | Thị trấn Lương Sơn, Hòa Bình |
| TP-COPPHA-001 | Đội Thi Công Cốp Pha Cốt Thép Nam Sơn | MST-TEST-023 | 0900 000 023 | tp.coppha001@example.local | Phạm Hữu Lộc | Xã Thanh Liệt, Thanh Trì, Hà Nội |
| TP-MEP-001 | Công ty TNHH Cơ Điện Công Trình Tân Phát | MST-TEST-024 | 0900 000 024 | tp.mep001@example.local | Vương Đình Khôi | KCN Ngọc Hồi, Thanh Trì, Hà Nội |
| TP-PCCC-001 | Công ty CP Thi Công PCCC Đại An | MST-TEST-025 | 0900 000 025 | tp.pccc001@example.local | Lê Đình Khánh | Số 88 Giải Phóng, Hai Bà Trưng, Hà Nội |
| TP-NHOMKINH-001 | Công ty TNHH Nhôm Kính Mặt Dựng Á Đông | MST-TEST-026 | 0900 000 026 | tp.nhomkinh001@example.local | Đoàn Thanh Bình | KCN Tiên Sơn, Từ Sơn, Bắc Ninh |
| TP-SONBA-001 | Đội Sơn Bả Hoàn Thiện Minh Tâm | MST-TEST-027 | 0900 000 027 | tp.sonba001@example.local | Nguyễn Trung Kiên | Xã Dương Nội, Hà Đông, Hà Nội |
| TP-DIENLANH-001 | Công ty TNHH Điều Hòa Thông Gió An Khang | MST-TEST-028 | 0900 000 028 | tp.dienlanh001@example.local | Trương Quốc Huy | KCN Nhơn Trạch, Đồng Nai |
| TP-CANHQUAN-001 | Công ty TNHH Cảnh Quan và Hạ Tầng Xanh Việt | MST-TEST-029 | 0900 000 029 | tp.canhquan001@example.local | Hồ Sỹ Đức | Xã Xuân Phương, Nam Từ Liêm, Hà Nội |
| TP-VESINH-001 | Công ty TNHH Vệ Sinh Công Nghiệp Sau Xây Dựng Hưng Phát | MST-TEST-030 | 0900 000 030 | tp.vesinh001@example.local | Chu Mạnh Hà | Số 15 Tô Hiệu, Cầu Giấy, Hà Nội |

---

## 4. Kết quả Seed và QA Scripts

### Seed lần 1 (Tạo mới)
```
  Tổng dòng seed: 30
  Tạo mới:       30
  Cập nhật:       0
  Khôi phục:      0
Tổng supplier trong DB (active): 31 (bao gồm 1 test supplier trước đó)
```

### Seed lần 2 (Kiểm tra Idempotency - Không tạo trùng)
```
  Tổng dòng seed: 30
  Tạo mới:       0
  Cập nhật:       30
  Khôi phục:      0
Tổng supplier trong DB (active): 31
```
> [!NOTE]  
> Dữ liệu được `upsert` an toàn theo `code`, đảm bảo chạy nhiều lần không tạo ra record rác.

### QA Script `qa-suppliers-crud-rbac.ts`
```
Kết quả: 20 PASS / 0 FAIL
```
> [!NOTE]  
> Các test cases CRUD và RBAC vẫn pass hoàn toàn, xác nhận script seed không làm vỡ tính toàn vẹn hệ thống hay ảnh hưởng logic phân quyền.

---

## 5. Build Result & Git Status

- `npx tsc --noEmit` -> PASS
- `npm run build` -> PASS (Exit code 0)
- Git tracking: 
  - Đã thêm `scripts/seed-suppliers-market-sample.ts`
  - Đã cập nhật text accuracy trong `src/app/(dashboard)/suppliers/page.tsx` và `src/components/suppliers/suppliers-workspace.tsx`.

---

## 6. Hướng dẫn Test thủ công trên UI (Manual UAT)

Sau khi bộ data mẫu này đã có sẵn trong hệ thống, người dùng/tester có thể trải nghiệm giao diện `/suppliers` như sau:

**1. Test Search/Filter cơ bản:**
- Gõ `"thép"` vào ô tìm kiếm -> Trả về 2 nhà cung cấp thép.
- Gõ `"MEP"` -> Trả về 1 thầu phụ MEP.
- Gõ `"MST-TEST-001"` -> Trả về đúng 1 công ty.
- Gõ `"0900 000 001"` -> Trả về đúng 1 công ty.

**2. Test Dashboard Summary:**
- Xem thẻ **"Tổng đối tác"**, số lượng phải hiển thị `>= 30`.
- Xem thẻ **"Có SĐT"**, phải bằng với tổng đối tác (do bộ seed 100% có SĐT).

**3. Test RBAC View-only vs. Write:**
- **Đăng nhập vai trò Admin / Manager / Director:**
  - Sẽ thấy đầy đủ nút "Thêm đối tác".
  - Mỗi dòng trong bảng đều có icon "Sửa" và "Xóa".
- **Đăng nhập vai trò STAFF / ENGINEER (hoặc gán vai trò tương đương):**
  - Vẫn thấy danh sách toàn bộ đối tác.
  - KHÔNG thấy nút "Thêm đối tác".
  - KHÔNG thấy icon "Sửa" hay "Xóa" trên từng dòng.
  - Cột "Thao tác" sẽ biến mất.

---

## 7. Kết luận

**Đã đạt tiêu chuẩn MVP chưa?**
- **Đã đạt.** Dữ liệu mẫu hoàn thành xuất sắc vai trò phủ đầy UI, mô phỏng đúng tính đa dạng và mật độ text trên thực tế của một màn hình danh bạ.

**Đề xuất tương lai (Sprint tiếp theo):**
- **Bổ sung Schema:** Hiện tại nhóm thị trường (Vật liệu, Thầu phụ, Dịch vụ...) chỉ đang được ngầm hiểu qua `code` (NCC- / TP- / DV-). Cần thêm trường `type` (Enum: `SUPPLIER`, `SUBCONTRACTOR`, `SERVICE`) và `serviceCategory` để có thể Filter trên UI một cách trực quan hơn.
- Thêm filter theo trạng thái nếu có thêm field `status`.
