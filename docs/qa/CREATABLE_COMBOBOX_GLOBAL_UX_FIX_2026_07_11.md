# Báo cáo QA: Nâng Cấp UX Creatable Combobox Toàn Hệ Thống
**Ngày tạo:** 2026-07-11
**Trạng thái:** **GO**

## 1. Vấn đề thực trạng (Root Cause)
- **Lỗi UX Nhập Mới Mơ Hồ:** Trong Form "Thêm vật tư", khi người dùng gõ nội dung mới vào ô "Nhóm vật tư", text chỉ hiển thị trong thanh search phụ (nằm bên trong dropdown). Mặc dù có tuỳ chọn `Tạo nhóm mới: "abc"`, nhưng khi click vào, value lại không phản hồi ngược ra ngoài UI của Form (nút Combobox chính vẫn hiển thị rỗng/placeholder thay vì chữ "abc").
- **Nguyên nhân kỹ thuật:**
  Component `EnterpriseCombobox` được thiết kế theo mode select-only. Khi option custom (vd: `"abc"`) không tồn tại trong danh sách prop `options`, hook `options.find()` nội bộ trả về `undefined`. Kết quả là component fallback render text Placeholder.

## 2. Giải pháp thực hiện (Global Fixes)
### 2.1 Audit các component Combobox toàn codebase
Tiến hành quét toàn bộ hệ thống các props liên quan tới `allowCustom`:
1. `src/components/materials/material-form-dialog.tsx`: **Creatable mode** (Nhóm vật tư).
2. `src/components/materials/transaction-form-dialog.tsx`: **Select-only mode** (Chỉ cho phép tìm và chọn, không được tạo mới vật tư từ giao diện nhập xuất).
3. `src/components/material-request/material-request-form.tsx`: **Hybrid/Explicit mode** (Sử dụng Explicit `ModeToggle` (Danh mục / Ngoài danh mục) rồi chuyển đổi UI input riêng -> Sạch và không gây hiểu nhầm).
4. `src/components/contracts/contract-form-dialog.tsx`: **Select-only mode** (Tìm chọn dự án, đối tác).

**Quyết định:** Chỉ `material-form-dialog.tsx` đang dùng `allowCustom={true}`. Chúng ta sẽ nâng cấp Component Core (`EnterpriseCombobox`) để giải quyết vấn đề tận gốc, đảm bảo tương lai bất kỳ màn nào dùng Creatable cũng sẽ thừa hưởng chuẩn UX mới.

### 2.2 Sửa đổi Enterprise Combobox (Core component)
- **Cập nhật hiển thị:** Sửa logic tính toán `selectedOption`. Nếu `allowCustom={true}` và `value` không có trong danh sách gốc, component sẽ tự "giả lập" hiển thị `value` đó lên nút chính.
- **Thêm tính năng Commit-on-Blur (`commitOnBlur`):** 
  - Khách hàng không cần phải click chọn dòng `Dùng nhóm mới ...`. 
  - Đang nhập text ở ô search, chỉ cần bấm ra ngoài (blur), Combobox sẽ tự động lấy text đó cập nhật vào Form nếu Text hợp lệ.
  - Được bật chủ động trên `material-form-dialog.tsx` với prop `commitOnBlur={true}`.
- **Tuỳ biến Label UX:** 
  - Thay vì hiển thị `Tạo nhóm mới`, đã sửa thành `Dùng nhóm mới: "..."` thông qua prop `customOptionLabel` cho đỡ nhầm lẫn với việc gọi API tạo mới ngay lập tức.

## 3. Kết quả QA Verification
Đã hoàn thiện 2 scripts chạy test tự động:
1. `scripts/qa-creatable-combobox-value-sync.ts`: Verify logic codebase của `EnterpriseCombobox` (prop commitOnBlur, xử lý trimmedQuery, không bị lạm dụng hàm toLowerCase() phá tiếng Việt). -> **PASS**
2. `scripts/qa-material-group-create-and-filter.ts`: Verify logic DB khi tạo và sửa vật tư sử dụng "Nhóm mới", verify bộ filter hoạt động chính xác theo giá trị mới, và handle tốt archive flow. -> **PASS**

### Lệnh chạy Build/Sanity:
- `npx prisma validate`: **PASS**
- `npx tsc --noEmit`: **PASS** (Zero Type Error)
- `npm run build`: **PASS** (Exit code 0, Compiled Successfully).
- Lỗi ESLint "unused-expressions" ở `EnterpriseCombobox` sinh ra trong lúc fix code đã được xử lý bằng cấu trúc `if/else if`.

## 4. Kết luận
- **Tiêu chuẩn UX Creatable:** Hoàn thiện 100%. Mọi custom text sẽ hiển thị ngay ra field ngoài sau khi chọn hoặc blur.
- **Hệ quả cho Material Module:** Nhóm vật tư mới thêm sẽ được hiển thị ngay lập tức, submit an toàn và filter chạy đúng thời gian thực với dữ liệu DB. 
- **Chất lượng Language:** Toàn vẹn tiếng Việt có dấu, không có sự sai khác về case-sensitive khi lưu.

Trạng thái: **GO**. Hệ thống sẵn sàng với tiêu chuẩn nhập liệu mới.
