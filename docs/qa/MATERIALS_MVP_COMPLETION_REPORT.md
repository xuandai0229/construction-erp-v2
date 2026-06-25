# Báo Cáo Hoàn Thiện MVP Phân Hệ Quản Lý Vật Tư

## 1. Cơ sở thực hiện
- Tuân thủ thiết kế và tiêu chuẩn mã nguồn theo `d:\construction-erp-v2\.agents\skills\design-taste-frontend\SKILL.md`.
- Vấn đề tồn tại từ phase trước: Các nút "Thêm vật tư", "Nhập kho", "Xuất kho" chỉ là dạng placeholder chưa nối form. Module chưa xử lý nghiệp vụ thực tế mặc dù đã có database và backend action. Lỗi runtime do Prisma Cache.

## 2. Các file đã bổ sung và thay đổi
- `src/components/materials/material-form-dialog.tsx` (Mới): Dialog Modal chứa form tạo Vật tư với validation đầy đủ (Bắt buộc nhập tên, đơn vị tính).
- `src/components/materials/transaction-form-dialog.tsx` (Mới): Dialog Modal chứa form Nhập kho / Xuất kho dùng chung, với validation số lượng hợp lệ, chống xuất vượt kho.
- `src/components/materials/materials-workspace.tsx` (Sửa): Nối state quản lý Dialog, tích hợp 2 Modal trên, nối với API Server Actions, hiển thị Toast message và `router.refresh()` khi giao dịch thành công.
- `src/components/materials/materials-transactions.tsx` (Sửa): Nối sự kiện cho nút "Tạo giao dịch".
- `src/components/materials/materials-catalog.tsx` (Sửa): Nối sự kiện cho nút "Tạo mã vật tư mới".
- `src/components/materials/materials-stock-table.tsx` (Sửa): Gắn nút "Nhập kho", "Xuất kho" cho từng vật tư trên cả phiên bản Desktop (Table) và Mobile (Card list), tự động pre-fill loại vật tư vào form.
- `scripts/qa-materials-mvp-flow.ts` (Mới): Script kiểm thử tự động toàn bộ flow nghiệp vụ mà không cần thao tác UI.
- `src/lib/prisma.ts` (Sửa từ lần trước): Khắc phục cache key lỗi.

## 3. Luồng nghiệp vụ (Flow) hiện tại
1. **Thêm vật tư (Catalog/Overview):** Người dùng bấm "Thêm vật tư" -> Điền Mã, Tên, Đơn vị, Nhóm -> Form submit lên server -> Tạo mới `MaterialItem` -> Hiển thị Toast thành công -> Nạp lại Dashboard.
2. **Nhập kho:** Bấm "Nhập kho" (hoặc chọn trực tiếp từ danh sách Tồn kho) -> Form "Nhập kho" hiện lên yêu cầu chọn vật tư, số lượng, ngày, ghi chú -> Submit tạo `MaterialMovement` loại `IMPORT` -> Tồn kho `ProjectMaterialStock` tự động tăng.
3. **Xuất kho:** Form "Xuất kho" tự động kiểm tra số lượng tồn hiện hành của `MaterialItem` đang chọn. Nếu số lượng nhập vào > Tồn kho -> Chặn submit và báo lỗi đỏ trên form. Nếu hợp lệ -> Submit tạo `MaterialMovement` loại `EXPORT` -> Tồn kho `ProjectMaterialStock` tự động giảm.

## 4. RBAC và Security (Project Scope)
- Toàn bộ flow Nhập/Xuất sử dụng thông tin `projectId` do thẻ select công trình hiện tại truyền xuống (được lấy an toàn).
- Trên server `actions.ts`, hàm `createMaterialTransaction` chặn user không có quyền thực hiện transaction tại `projectId` được chỉ định, tránh tình trạng client sửa thẻ HTML để đẩy dữ liệu sai lệch.
- Giao dịch sử dụng cơ chế `prisma.$transaction`, đảm bảo tính nguyên vẹn dữ liệu: Không xảy ra lỗi tạo movement thành công nhưng chưa update tồn kho.

## 5. Script QA tự động hóa
- Một script (`scripts/qa-materials-mvp-flow.ts`) đã được chạy thử qua CLI:
  1. Script dò tìm 1 Project hợp lệ.
  2. Tạo 1 vật tư mới với mã Random.
  3. Bơm vào hệ thống lệnh **Nhập 100 cái**, xác nhận tồn kho = 100.
  4. Lệnh **Xuất 30 cái**, xác nhận tồn kho = 70.
  5. Cố tình bắn lệnh **Xuất 999999 cái**, khẳng định hệ thống từ chối thành công do "Vượt quá tồn kho".
  6. Xóa vật tư và giao dịch rác đi để giữ data sạch.

## 6. Lệnh đã chạy và kết quả
```bash
npx prisma format     -> Success
npx prisma validate   -> Success
npx prisma generate   -> Success
npx tsc --noEmit      -> Success (0 error)
npm run build         -> Compiled successfully (Exit code 0)
npx ts-node -r dotenv/config scripts/qa-materials-mvp-flow.ts -> Pass 100% test case
```

## 7. Hướng dẫn test thủ công
1. Vào `/materials`.
2. Kiểm tra phần thẻ "Tồn kho" hoặc Tab "Danh mục", bấm nút "Thêm vật tư". Nhập tên là "Thép D10", đơn vị "Kg". Lưu thành công.
3. Chuyển sang thẻ "Nhập / Xuất" hoặc bấm nút "Nhập kho" ngay phần thao tác trên cùng. Chọn Thép D10, nhập số lượng "1000", Lưu. Kiểm tra thẻ Tổng quan, tồn kho sẽ lên 1,000.
4. Bấm "Xuất kho" ở thanh tác vụ, chọn Thép D10. Gõ số lượng "1001", Submit -> Form phải báo lỗi đỏ: "Số lượng xuất vượt quá tồn kho hiện tại (1000 kg)".
5. Gõ số lượng xuất là "300", Submit -> Lưu thành công. Kiểm tra lại tab Tồn Kho sẽ thấy Thép D10 còn "700".
6. Mở F12 chọn giao diện iPhone/Mobile -> Kiểm tra bảng tồn kho có bị vỡ bố cục không (Đã được chuyển từ Table thuần sang các Card list tối ưu). Đảm bảo thẻ Card Mobile vẫn chứa đủ các nút bấm Nhập/Xuất kho riêng cho từng vật tư.
