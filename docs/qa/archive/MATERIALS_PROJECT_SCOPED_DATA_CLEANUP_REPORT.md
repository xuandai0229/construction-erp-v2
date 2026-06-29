# Báo Cáo Làm Sạch Dữ Liệu & Thiết Lập Tách Biệt Theo Công Trình Phân Hệ Materials

## 1. Cơ Sở Thiết Kế (SKILL.md)
- **File đọc:** `.agents/skills/design-taste-frontend/SKILL.md`
- **Áp dụng:** Tôi đã cấu trúc lại Empty States để làm "trắng" công trình mới đúng nghĩa. Tránh việc trình bày dữ liệu Global đè lên UI của Project khiến user bị nhầm lẫn context (ngữ cảnh).

## 2. Phân Tích Mô Hình Global Dictionary (Từ điển chung)
- **Sai lầm trước đó:** Việc trộn lẫn độ dài danh sách `MaterialItem` (vốn là bảng Global dùng chung) vào Dashboard của một công trình cụ thể, và đặt tab "Từ điển vật tư" làm tab số 2 gây cảm giác công trình này đã bị ép nhận 5 vật tư cố định.
- **Quyết định Mô hình (Hướng B):** Tôi quyết định giữ lại mô hình **Global dictionary + project tracking**. 
  - *Lý do:* Tạo lại mã Thép, Xi măng... lặp đi lặp lại cho mỗi công trình mới là ác mộng data entry ngoài công trường. Từ điển chung là cần thiết. Nhưng UI phải được thiết kế lại để phân định rạch ròi: Từ điển chung chỉ để "Tham khảo" hoặc "Chọn nhanh" khi nhập kho, không được phép tính vào Dashboard của công trình nếu chưa thực sự phát sinh `ProjectMaterialStock`.

## 3. Quá Trình Thay Đổi UI/UX (Làm "Trắng" Công Trình Mới)
- **Dashboard:** Xóa hoàn toàn card đếm số Từ điển. Đổi nhãn Card 1 thành **"Mã đang theo dõi"** (đếm số `ProjectMaterialStock` của project hiện tại).
- **Empty States ở Overview:** Nếu công trình chưa có Tồn kho (stock), màn hình báo ngay lập tức: `"Công trình chưa theo dõi vật tư"`, kèm lời kêu gọi *"Thêm vật tư"* hoặc *"Nhập kho đầu kỳ"*.
- **Tab Danh mục -> Từ điển tham khảo:** 
  - Đã đổi tên tab thành **"Từ điển tham khảo"** và di chuyển nó xuống dưới cùng trong danh sách Tab.
  - Thêm hộp Box xanh giải thích rõ: *"Đây là danh sách mẫu dùng chung (Từ điển tham khảo). Vật tư chỉ được tính vào công trình sau khi bạn chọn "Nhập" để tạo tồn kho đầu kỳ"*.
- **Tab Tồn kho / Nhập xuất:** Nếu chưa nhập gì, màn hình hiển thị hoàn toàn trống với thông báo: *"Công trình này chưa có tồn kho vật tư / chưa có giao dịch vật tư"*. Mọi dữ liệu render ở 2 tab này đã được ghim cứng với `projectId`.

## 4. Audit Nguồn Gốc 5 Mã Vật Tư Cũ
- **Script:** `scripts/qa-materials-origin-audit.ts`
- **Kết quả:** Các mã THEP-D10, THEP-D16, CAT-V, DA-1X2, XM-PCB40 **chưa hề có tiền tố `DEMO-`** và đặc biệt là **ĐANG ĐƯỢC SỬ DỤNG** (có Stock và Movement) trong một công trình trước đó (`QA-TUHIEP-5F-001`).
- **Xử lý:** Tôi quyết định **KHÔNG XÓA**. Vì dữ liệu đã gắn chặt vào các hóa đơn nhập/xuất của công trình kia, việc xóa trắng sẽ gây vỡ Referential Integrity hoặc mất dữ liệu demo của phiên QA trước. Tôi đã viết thêm script `scripts/qa-materials-clean-legacy-demo.ts` có chứa cờ `--confirm-legacy-demo-cleanup` để dọn dẹp an toàn khi không còn sử dụng.

## 5. Kết Quả Project Isolation Audit (Cho `Ct-124`)
- **Script:** `scripts/qa-materials-project-isolation-audit.ts --projectId=cmqt6idtp0000scwk0nynyklg`
- **Kết quả trả về:**
  - `Global MaterialItem count: 5`
  - `ProjectMaterialStock count: 0`
  - `MaterialMovement count: 0`
- **Xác nhận:** `Ct-124` trắng hoàn toàn trong cơ sở dữ liệu.

## 6. Kết Quả DB Sync Audit
- **Script:** `scripts/qa-materials-db-sync-audit.ts`
- **Kết quả trả về:**
  - `Projects audited: 2`
  - `Total stock rows: 5`
  - `Total movement rows: 7`
  - `Total Mismatches: 0`
- Cơ sở dữ liệu đồng bộ 100%.

## 7. Đánh Giá RBAC & Security
- `MaterialItem` là Global, do đó bất kỳ user nào thao tác tạo vật tư đều đang thêm vào "Từ điển chung". Mọi hành động làm thay đổi tồn kho (Import/Export/Update Min Stock) qua API `createMaterialTransaction` hay `setProjectMinStock` đều đi qua hàm `assertProjectAccess` kiểm tra người dùng phải là `ADMIN` hoặc phải có mặt trong bảng `ProjectMember` của công trình đó. User không thể dùng Postman hay inspect để hack ghi dữ liệu vào công trình người khác.

## 8. Lệnh Build Đã Chạy
```bash
npx prisma format       -> 🚀 Formatted
npx prisma validate     -> 🚀 Valid
npx prisma generate     -> 🚀 Generated Prisma Client
npx tsc --noEmit        -> ✅ Pass (0 errors)
npm run build           -> ✅ Compiled successfully (0 mismatches, Next.js build pass)
```

## 9. Hướng Dẫn Test Thủ Công
1. Mở trang quản lý vật tư, chọn công trình **Công trình test (Ct-124)**.
2. Tại tab **Tổng quan**: Kiểm tra các card phải hiện số `0`.
3. Tab **Tồn kho** và **Nhập / Xuất**: Trống trơn, với dòng chữ thông báo công trình chưa có gì.
4. Chuyển sang tab cuối cùng **Từ điển tham khảo**: Đọc phần giải thích màu xanh dương, anh sẽ thấy 5 mã có sẵn, nhưng nó chỉ là danh sách mẫu tham khảo.
5. Click **Nhập kho** (trên header), chọn mã `Thép D10` và nhập số lượng 500 kg.
6. Quay lại **Tổng quan**: Card *Mã đang theo dõi* nảy lên 1, *Giao dịch tháng này* nảy lên 1. Mọi thứ đã đi vào hoạt động chính xác!
