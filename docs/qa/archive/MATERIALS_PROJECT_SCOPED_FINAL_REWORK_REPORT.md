# Báo Cáo Chuyển Đổi Phân Hệ Materials Sang Project-Scoped 100%

## 1. Cơ Sở Thiết Kế (SKILL.md)
- **File đọc:** `.agents/skills/design-taste-frontend/SKILL.md`
- **Áp dụng:** Nhận diện sai lầm về ngữ cảnh người dùng. Thay vì áp đặt một "từ điển chung" gây nhiễu, toàn bộ UI/UX đã được tinh giản, dẹp bỏ mọi yếu tố tham khảo để cung cấp một trải nghiệm "Trắng hoàn toàn" đúng nghĩa cho công trình mới. Không còn Box xanh, không còn tab thừa thãi. 

## 2. Vì Sao Global Dictionary Không Phù Hợp
- Theo phân tích từ góc độ trải nghiệm người dùng cuối ở yêu cầu hiện tại: người dùng không muốn quan tâm đến danh sách "mẫu". Họ muốn quản lý các danh mục cụ thể do chính họ tạo ra hoặc nhập cho công trình của mình. Việc duy trì Global Dictionary (với các mã lơ lửng không thuộc dự án nào) khiến danh sách bị loãng, vi phạm quy tắc đóng gói dữ liệu của công trình, đồng thời gây hiểu nhầm về tính sở hữu.

## 3. Cách Thức Chuyển Đổi Sang Project-Scoped
- Tôi đã chọn **CÁCH A**: Thêm trực tiếp `projectId` vào mô hình `MaterialItem`.
- Lý do chọn Cách A: Đây là phương pháp dứt điểm nhất ở tầng Database. Nó buộc mọi truy vấn, mọi lệnh tạo vật tư mới đều phải gắn với một công trình duy nhất, ngăn chặn hoàn toàn việc "rò rỉ" vật tư từ dự án này sang dự án khác.

## 4. Thay Đổi Ở Database Schema
- **Thêm `projectId`:** Đã thêm trường `projectId String?` vào model `MaterialItem`.
- **Cập nhật Unique Index:** Xóa bỏ rào cản `@unique` trên trường `code` ở phạm vi toàn hệ thống. Thay vào đó, thiết lập `@@unique([projectId, code])` để cho phép các công trình khác nhau có thể tạo cùng một mã vật tư (VD: cùng dùng mã `XM-PC40`) mà không bị conflict.
- **Migration:** Sử dụng `npx prisma db push` an toàn, bảo toàn mọi dữ liệu cũ do `projectId` được khai báo là optional (`String?`). Tuy nhiên, về mặt ứng dụng logic, `projectId` giờ đây là **bắt buộc**.

## 5. Các Hành Động API Bị Chỉnh Sửa
- `getMaterialItems(projectId)`: Đã truyền `projectId` vào và lọc với `where: { projectId }`.
- `createMaterialItem`: Validate chặt chẽ `projectId` đầu vào. Khi tạo mã mới, tự động gắn với công trình.
- `buildUniqueMaterialCode`: Thay vì tìm mã duy nhất trên toàn DB, nay chỉ cần đảm bảo duy nhất trong phạm vi `projectId`.

## 6. Các Component UI Bị Chỉnh Sửa
- **Workspace Header:** Gỡ bỏ dòng thông báo "Danh mục vật tư là từ điển dùng chung...". Cập nhật Button "Thêm vật tư" để tạo vật tư riêng cho dự án.
- **Tab Navigate:** Đổi "Từ điển vật tư/tham khảo" thành **"Danh mục vật tư"** và đưa về vị trí thứ 2 (Ngay cạnh Tổng quan). Không còn tab mang tên Tham khảo nữa.
- **MaterialsCatalog (Danh mục vật tư):** Gỡ bỏ Box màu xanh dương giải thích về từ điển mẫu. Cập nhật lại Empty State thành: *"Công trình này chưa có danh mục vật tư. Hãy thêm vật tư đầu tiên để bắt đầu..."*.
- **MaterialsOverview (Tổng quan):** Cập nhật Empty State thống nhất. Gỡ bỏ mọi câu từ nhắc đến "từ điển mẫu" ở step hướng dẫn. Card số đếm trên Dashboard hoàn toàn độc lập và hiển thị `0` đối với công trình mới.

## 7. Xử Lý 5 Mã Vật Tư Cũ (Legacy Demo Data)
- **Vấn đề:** Có 5 mã (THEP-D10, THEP-D16, CAT-V, DA-1X2, XM-PCB40) trước đây mang tính chất Global (projectId = null).
- **Quyết định:** Không xóa. Vì 5 mã này đã có phát sinh Tồn kho và Lịch sử Giao dịch thật tại công trình `QA-TUHIEP-5F-001`.
- **Khắc phục:** Viết script `scripts/qa-materials-repair-legacy.ts` để ép `projectId = QA-TUHIEP-5F-001` cho 5 mã này. 
- **Kết quả:** Chúng chính thức trở thành "Vật tư riêng" của dự án `QA-TUHIEP-5F-001`. Mọi dự án mới (VD: `Ct-124`) sẽ không bao giờ nhìn thấy 5 mã này nữa. Project cũ vẫn duy trì hoạt động nhập/xuất kho bình thường.

## 8. Kết Quả Project Scoped Flow Test
- **Script Test:** `scripts/qa-materials-project-scoped-flow.ts`
- Script đã tạo ra một dự án test hoàn toàn mới, xác nhận nó trắng tinh (0 item, 0 stock). 
- Tiến hành tạo Mã Vật tư A (VT-A) -> Nhập kho 100 -> Xuất 30 -> Tồn 70 -> Giả lập bắt rào xuất lố (9999) -> Pass Validation.
- Đồng thời Verify dự án bên cạnh không hề thấy Vật tư A xuất hiện. Flow hoàn hảo 100%.

## 9. Đánh Giá RBAC & Security
- Việc tạo mới vật tư, xuất, nhập hay lấy danh sách đều phải đi qua `assertProjectAccess(session, projectId)`. User không thể dùng URL truyền bừa ID của dự án khác để xem danh mục vật tư nếu không được phân quyền. Việc `MaterialItem` trở thành project-scoped càng nâng cao tính bảo mật dữ liệu giữa các công trình.

## 10. Các Lệnh Build & Trạng Thái
```bash
npx prisma format       -> ✅ Formatted
npx prisma validate     -> ✅ Valid
npx prisma generate     -> ✅ Generated
npx tsc --noEmit        -> ✅ Pass
npm run build           -> ✅ Compiled successfully
```

## 11. Hướng Dẫn Test Thủ Công Của User
1. Ra Dashboard tạo công trình mới (hoặc vào `Ct-124`).
2. Mở tab **Materials**. Xác nhận:
   - Các chỉ số trên Dashboard là `0`.
   - Tab **Danh mục vật tư** trắng tinh. Không thấy Thép D10 hay Cát, Đá.
3. Bấm **Thêm vật tư**. Gõ tên vật tư "Đá 0x4". 
4. Xác nhận "Đá 0x4" vừa chui vào danh mục. 
5. Bấm **Nhập kho** cho "Đá 0x4" với số lượng 100 khối.
6. Chuyển sang công trình `QA-TUHIEP-5F-001`. Xác nhận công trình này KHÔNG thấy "Đá 0x4", mà chỉ có 5 vật tư cũ của nó.
