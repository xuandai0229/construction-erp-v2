# BÁO CÁO FIX LỖI TỒN KHO BAN ĐẦU VÀ NGƯỠNG CẢNH BÁO

**Tên file:** `MATERIAL_CREATE_INITIAL_STOCK_AND_MIN_STOCK_FIX_2026_07_11.md`
**Ngày tạo:** 2026-07-11
**Trạng thái:** **GO**

## 1. Phân tích nguyên nhân hiểu nhầm
Trước đây, form "Thêm vật tư" có một trường là **"Tồn tối thiểu tại công trình"**. Khi người dùng tạo vật tư mới và nhập giá trị (ví dụ: `2340`) vào trường này, sau khi lưu, vật tư xuất hiện trong danh mục nhưng "Tồn hiện có" lại bằng `0`.
- **Lý do kỹ thuật:** `minStockLevel` (Tồn tối thiểu) thực chất chỉ là một con số tham chiếu dùng để bật cảnh báo màu đỏ (low stock alert) khi lượng tồn kho thực tế (`stock`) rớt xuống dưới mức này. Nó không phải là lượng vật tư đang có trong kho, do đó nó hoàn toàn không sinh ra `MaterialMovement` (giao dịch nhập kho).
- **Lý do UI/UX:** Tên label "Tồn tối thiểu tại công trình" dễ gây hiểu nhầm thành "Tồn kho ban đầu", khiến người dùng nghĩ rằng hệ thống bị lỗi không lưu tồn kho.

## 2. Giải pháp khắc phục triệt để

### 2.1 Cập nhật khái niệm và Giao diện (UI Label/Helper)
Tôi đã thay đổi hoàn toàn cách hiển thị để làm rõ sự khác biệt:
- **"Tồn tối thiểu tại công trình"** đã được đổi tên thành **"Ngưỡng cảnh báo tồn tối thiểu"**.
- Thêm mô tả phụ: *"Số này chỉ dùng để cảnh báo khi tồn kho thấp, không phải tồn ban đầu."*
- Trong Drawer chi tiết vật tư, các label hiển thị "Tối thiểu" cũng đã được đồng bộ thành **"Ngưỡng cảnh báo"**. Nếu tồn bằng `0` và có cài đặt ngưỡng cảnh báo, hệ thống sẽ hiện thêm nút CTA **"Nhập kho ban đầu"**.

### 2.2 Bổ sung tính năng "Nhập tồn ban đầu"
Khi tạo vật tư mới, giờ đây người dùng có thêm lựa chọn:
- **Checkbox:** "Nhập tồn ban đầu sau khi tạo vật tư".
- Khi bật lên, người dùng sẽ nhập được **Số lượng**, **Ngày nhập**, và **Ghi chú**.
- **Luồng xử lý Backend:** Trong cùng một Prisma transaction `createMaterialItem`:
  1. Tạo `MaterialItem`.
  2. Khởi tạo `ProjectMaterialStock` với `stock = 0` (để trigger upsert).
  3. Nếu có số lượng tồn ban đầu, hệ thống sẽ tự động gọi hàm `applyMaterialMovement` với type `IMPORT` (Nhập kho). 
  4. Lượng `stock` sẽ được cập nhật chính xác = Tồn ban đầu. Mọi nghiệp vụ diễn ra an toàn, đảm bảo tính Consistency.

### 2.3 Sửa thông báo UI (Toast)
- Nếu người dùng KHÔNG nhập tồn ban đầu: Hệ thống hiện thông báo rõ ràng: *"Đã tạo vật tư. Tồn hiện có đang là 0. Hãy nhập kho nếu công trình đã có vật tư này."*
- Form Nhập/Xuất kho cũng được đổi nhãn thành **"Số lượng nhập kho thật"** / **"Số lượng xuất kho thật"** để tuyệt đối không nhầm lẫn.

## 3. Kết quả QA Testing
Script kiểm tra `qa-material-initial-stock-and-min-stock.ts` đã chạy thành công 100% các Test Case sau:
- **Test Min Stock:** Khởi tạo vật tư "Ống nhựa Tiền Phong" với ngưỡng cảnh báo 2.340. Tồn kho vẫn là 0.
- **Test Casing Tiếng Việt:** Database lưu chính xác `"Ống nhựa Tiền Phong"` (không bị lỗi ép kiểu sang chữ thường hay mất dấu Unicode).
- **Test Nhập Xuất:**
  - Nhập 666 => Tồn = 666.
  - Xuất 555 => Tồn = 111. (Lượng tính toán hoàn toàn chuẩn xác).
  - Vì 111 < 2340 nên cờ cảnh báo (low stock) tiếp tục bật.
  - Nhập thêm 3000 => Tồn = 3111. Hết cảnh báo.
- **Test Initial Stock:** Tạo vật tư "Vật tư có tồn ban đầu" với 500 tồn ban đầu => Hệ thống sinh thành công phiếu IMPORT, tồn kho bằng 500 ngay sau khi tạo.

## 4. Kiểm tra Build & Runtime
- `npx prisma validate`: **PASS**
- `npx tsc --noEmit`: **PASS** (0 lỗi)
- `npm run build`: **PASS** (Build thành công toàn hệ thống).

## 5. Kết luận
Luồng tạo vật tư, quản lý tồn kho và logic cảnh báo đã được làm rõ và phân tách rạch ròi. Không còn rủi ro người dùng nhập nhầm. Toàn bộ mã nguồn tiếng Việt bảo toàn hoàn hảo.

=> **Kết luận: GO** (Sẵn sàng triển khai cập nhật lên Production).
