# Báo Cáo Audit Lỗi Tách Biệt Công Trình Mới (Project Isolation)

## 1. Cơ Sở Thiết Kế (SKILL.md)
- **File đọc:** `.agents/skills/design-taste-frontend/SKILL.md`
- **Áp dụng:** Phân định rõ ràng giữa dữ liệu "hệ thống" và dữ liệu "công trình". Sử dụng Text Helper và Empty States để giao tiếp hiệu quả, xóa bỏ sự lầm tưởng do UI trình bày không đúng ngữ cảnh.

## 2. Phân Tích Lỗi "Thấy 5 mã vật tư ở công trình mới"
- **Vì sao xảy ra:** Do bảng `MaterialItem` trong Database được thiết kế là **Global Dictionary** (Từ điển dùng chung toàn hệ thống). Bất cứ vật tư nào được tạo ra cũng sẽ lưu vào đây để dùng lại ở các dự án khác.
- **Phân loại lỗi:** Đây **không phải lỗi Database**, hoàn toàn là **lỗi UI/UX ngữ cảnh**. UI cũ đã đếm `MaterialItem.length` (danh sách global) rồi gán nhãn là "Tổng mã vật tư" trên Dashboard của dự án, khiến user hiểu nhầm là dự án mới đã có 5 mã vật tư này.

## 3. Database Isolation Audit
**Kết quả script:** `scripts/qa-materials-project-isolation-audit.ts` chạy cho công trình `Ct-124`.
- **Global MaterialItem:** 5 (Từ điển chung).
- **ProjectMaterialStock:** 0 (Công trình chưa theo dõi vật tư nào).
- **MaterialMovement:** 0 (Chưa có giao dịch nào).
- -> **Kết luận:** DB Isolation (tách biệt dữ liệu) hoạt động hoàn hảo. Dữ liệu của công trình khác hoàn toàn không rò rỉ sang công trình mới. Lỗi chỉ nằm ở phần Frontend.

## 4. Sửa Đổi UI/UX Tránh Hiểu Nhầm
### A. Tab Tổng quan
- **Xóa Card:** "Tổng mã vật tư" (đếm số global).
- **Thêm Card:** **"Mã đang theo dõi"**, chỉ đếm dựa trên `ProjectMaterialStock` thuộc về project hiện tại. Với công trình mới, số này = 0.
- **Header:** Đã tách rõ con số "Từ điển chung hệ thống: 5 mã" ra một góc nhỏ màu xám nhạt bên trên, không nằm trong các card số liệu công trình để phân rõ ranh giới.
- **Empty State:** Thay thông báo cũ bằng: `"Công trình chưa theo dõi vật tư. Hãy nhập kho đầu kỳ hoặc chọn vật tư từ từ điển để bắt đầu theo dõi cho công trình này."` thay vì khen "Đã tạo danh mục vật tư thành công" do lấy nhầm cờ global.

### B. Tab Từ điển vật tư
- **Cảnh báo rõ ràng:** Thêm Box thông báo màu xanh lam: *"Đây là từ điển vật tư dùng chung toàn hệ thống. Muốn đưa vật tư vào công trình, hãy chọn 'Nhập'..."*
- **Cột Tồn tại công trình:** Các vật tư chưa được công trình này sử dụng thay vì hiển thị "0" (như thể là hàng hết) đã được chuyển thành **"Chưa theo dõi"** bằng chữ màu xám để phản ánh đúng thực tế bảng `ProjectMaterialStock` chưa có dòng này.

### C. Tab Tồn kho & Nhập/Xuất
- Cả 2 tab đều render dựa hoàn toàn trên `stocks` và `transactions` được filter strict theo `projectId`.
- **Empty State:** Được chỉnh sửa lại text thành *"Công trình này chưa có tồn kho / chưa có giao dịch vật tư"*.

### D. Nút Bấm
- **"Xuất kho"** đã được khóa cứng (Disabled) trên Header vì công trình chưa có tồn kho.

## 5. Xử Lý Demo Data Cũ
- **Phát hiện:** Quá trình Audit DB phát hiện 5 mã vật tư tạo từ session trước (Thép D10, D16, XM-PCB40, Cát vàng, Đá 1x2) là **dữ liệu Demo cũ không có prefix `DEMO-`**.
- **Đề xuất Cleanup:** Vì không có prefix `DEMO-`, script an toàn đã tự động bỏ qua để tránh xóa nhầm dữ liệu thật. Nếu anh chắc chắn 5 mã đó là giả, xin vui lòng vào UI thủ công xóa, hoặc đổi tên thêm chữ "Demo". Từ nay, script tạo demo sẽ tự động gán prefix `DEMO-` và tự động cleanup chuẩn xác.

## 6. Các Lệnh Đã Chạy & Trạng Thái Build
```bash
npx tsx scripts/qa-materials-project-isolation-audit.ts --projectId=cmqt6idtp0000scwk0nynyklg -> ✅ Project Isolation OK
npx tsx scripts/qa-materials-db-sync-audit.ts -> ✅ Sync OK (0 mismatch)
npx prisma format       -> 🚀 Formatted
npx prisma validate     -> 🚀 Valid
npx prisma generate     -> 🚀 Generated Prisma Client
npx tsc --noEmit        -> ✅ Pass (0 errors)
npm run build           -> ✅ Compiled successfully
```

## 7. Hướng Dẫn Test Thủ Công
1. Truy cập vào công trình mới `Ct-124`.
2. Ở tab **Tổng quan**, anh sẽ thấy các ô card số lượng báo `0`.
3. Nhìn góc trên bên phải của Tab Tổng quan, anh sẽ thấy text nhỏ: `Từ điển chung hệ thống: 5 mã`.
4. Sang tab **Từ điển vật tư**, anh vẫn thấy 5 mã, nhưng có thông báo màu xanh giải thích đây là từ điển dùng chung. Cột Tồn tại công trình sẽ báo `Chưa theo dõi` (thay vì 0).
5. Nhìn lên Header, nút "Nhập kho" sáng (do có từ điển để chọn) nhưng nút "Xuất kho" bị mờ Disable hoàn toàn do tồn kho đang rỗng.
6. Khi click "Nhập kho" 1 món bất kỳ, mã đó sẽ tự động được thêm vào Tồn kho của công trình.
