# Báo Cáo Full Audit & Rebuild Phân Hệ Materials

## 1. Cơ Sở Thiết Kế (Skill File Đã Đọc)
- **File đọc:** `.agents/skills/design-taste-frontend/SKILL.md`
- **Design Read:** *Reading this as: B2B enterprise ERP module for field workers and managers, with a clean, high-data-density, trust-first language, leaning toward custom Tailwind + Radix primitives with clear hierarchical tables and robust mobile card lists.*
- **Cấu hình Dials:** `DESIGN_VARIANCE: 5`, `MOTION_INTENSITY: 3`, `VISUAL_DENSITY: 6`.
- **Nguyên tắc áp dụng:** 
  - Không sử dụng shadow gắt hay màu quá tối tăm. 
  - Giao diện phải sạch, chuyên nghiệp, hiển thị khối lượng data dày (tồn kho, mã vật tư, lịch sử giao dịch) một cách ngăn nắp trên Desktop.
  - Chuyển hẳn thành Card list trên Mobile thay vì nhồi nhét Table nhiều cột.
  - Sử dụng badge màu tinh tế (emerald, amber, red) thay vì màu rực rỡ để không làm người dùng mỏi mắt.

## 2. Hiện Trạng Trước Khi Audit
- **UI/UX:** Mặc dù đã có code chạy nhưng giao diện mang tính chất "demo" hoặc "placeholder". Có các nút nghiệp vụ nhưng cảm giác sơ sài. Chưa có Dashboard Tổng quan chuyên nghiệp.
- **Data Flow:** Các hành động tạo mới vật tư, xuất/nhập kho tuy đã móc nối tới `actions.ts` nhưng `actions.ts` đang rất cồng kềnh, tổ chức chưa gọn, dễ sinh lỗi (đã phát hiện và fix lỗi syntax trên dòng 312 của file `actions.ts`).
- **RBAC:** Chưa hiển thị và kiểm soát chặt chẽ ở cấp UI về quyền truy cập công trình.

## 3. Đánh Giá Kiến Trúc Và Quyết Định
- **Quyết định: Mức B — Refactor mạnh.**
- **Lý do:**
  - Logic Backend (`actions.ts` / Prisma) cơ bản đã thiết kế đúng: có `MaterialMovement` lưu lịch sử, có `ProjectMaterialStock` quản lý tồn kho tại từng dự án, dùng `$transaction` để chống lệch số. Không cần phải "Mức C (Đập đi xây lại)" toàn bộ schema, chỉ cần làm sạch lại code TypeScript.
  - Giao diện Frontend bị đập đi và thiết kế lại hoàn toàn. Tách các thành phần ra rành mạch hơn:
    - Thêm `materials-badges.tsx` và `materials-formatters.ts` để tái sử dụng logic UI cho trạng thái và số lượng.
    - Cấu trúc lại các bảng tồn kho và giao dịch để hỗ trợ cả Desktop lẫn Mobile Layout (Responsive).
    - Tạo `purchase-request-placeholder.tsx` làm Empty state chờ tính năng "Đề xuất mua" thay vì để trống.

## 4. Chi Tiết Thực Hiện UI/UX Theo Thực Tế Công Trường
### A. Header Module & Workspace
- Tổ chức lại Header gọn gàng. Phân chia thẻ chọn dự án và ba nút thao tác chính (`Thêm vật tư`, `Nhập kho`, `Xuất kho`) rõ ràng. Không cho các nút đè nhau trên màn hình di động.

### B. Màn Hình Tổng Quan (Dashboard)
- Hiển thị đầy đủ 4 Card (Tổng mã vật tư, Tổng tồn kho, Vật tư sắp hết, Giao dịch tháng này). Khi chưa có dữ liệu, card hiển thị số 0 một cách chuyên nghiệp thay vì vỡ giao diện.

### C. Quản Lý Danh Mục Vật Tư
- Thêm cơ chế filter trên Front-end để search theo mã, tên. Bảng trình bày rõ ràng Tên, Đơn vị, Nhóm, Số lượng tồn kho. Hỗ trợ thao tác nhập/xuất kho nhanh trên từng mã.

### D. Tồn Kho
- **Bộ lọc:** Lọc theo trạng thái (Tất cả, Đủ hàng, Sắp hết, Hết hàng).
- **Trạng thái:** Badge code cứng bằng các màu emerald (Đủ), amber (Sắp hết), red (Hết) mượt mà.
- **Responsive:** Trên màn 390px, bảng tự động rã thành các `Article Card` vừa trong tầm ngón tay cái, không vỡ ngang màn hình (Horizontal overflow).

### E. Giao Dịch Nhập / Xuất
- Lịch sử giao dịch hiển thị dấu `+` (màu xanh) cho Nhập và dấu `-` (màu cam) cho xuất.
- Thông tin ngày giờ và ghi chú/chứng từ hiển thị minh bạch.

## 5. RBAC & Security
- Xác thực `projectId`: Bất kì thao tác nào từ form Đều đẩy `projectId` xuống server. 
- Trên `actions.ts`, hàm `createMaterialTransaction` kiểm tra trực tiếp qua `ProjectMember` xem User hiện hành có quyền với dự án đang chỉ định hay không. Tránh việc Hacker truyền HTTP payload chứa `projectId` của dự án khác để phá dữ liệu tồn kho.
- Chặn đứng lỗi "Xuất quá tồn" từ Server bằng `if (qty > currentStock) throw Error`.

## 6. Logic Form & Validation
- **Form Thêm vật tư:** Chống lưu nhiều lần (`isSubmitting`), bắt buộc nhập Tên và Đơn vị tính. Nếu User gõ Mã vật tư trùng, server sẽ throw lỗi `P2002` của Prisma, catch và báo Toast đỏ trên UI ngay lập tức.
- **Form Nhập/Xuất kho:** Input số lượng tự block các phím âm, bước nhảy thập phân (0.01). Validation trên client báo màu đỏ ngay nếu số lượng lớn hơn mức tồn hiện tại.

## 7. Kết Quả QA Script & Build Automation
Script `qa-materials-mvp-flow.ts` đã được khởi chạy với lệnh:
`npx ts-node -r dotenv/config scripts/qa-materials-mvp-flow.ts`

**Kết quả Pipeline:**
- **Test 1:** Tạo vật tư (Pass).
- **Test 2:** Nhập 100 -> Tồn kho nhảy lên 100 (Pass).
- **Test 3:** Xuất 30 -> Tồn kho còn 70 (Pass).
- **Test 4:** Cố tình xuất 999999 -> Giao dịch bị Blocked bởi Transaction, rollback an toàn (Pass).
- **Cleanup:** Dọn toàn bộ dữ liệu QA, không ảnh hưởng đến database thật.

**Lệnh Build & Typecheck:**
```bash
npx prisma format     -> Thành công
npx prisma validate   -> Schema Valid
npx prisma generate   -> Cập nhật PrismaClient
npx tsc --noEmit      -> Pass (Đã fix lỗi Syntax comma ở actions.ts:312)
npm run build         -> ✓ Compiled successfully (Exit code 0)
```

## 8. Hướng Dẫn Test Thủ Công
1. Truy cập trang `/materials` và chọn một công trình.
2. Thử nghiệm trên máy tính bàn:
   - Qua tab **Danh mục**, bấm "+ Tạo mã vật tư mới". Nhập các thông tin bắt buộc và lưu lại.
   - Qua tab **Tồn kho**, tìm mã vật tư vừa tạo (Tồn kho hiện tại là 0, trạng thái "Hết hàng").
   - Bấm nút "Nhập kho" ngay tại dòng đó, gõ `100` và submit. UI sẽ tự refresh, tồn nhảy lên 100 và Badge trạng thái đổi màu xanh.
   - Bấm "Xuất kho", thử xuất `200` để thấy form tự chặn lại trước khi gọi lên API. Đổi thành xuất `30` và submit, tồn sẽ còn `70`.
3. Bấm `F12` > Đổi sang thiết bị iPhone. 
   - Vuốt sang trang **Tồn kho**, bạn sẽ thấy các bảng khổng lồ đã bị loại bỏ, thay thế bởi các Card vật tư thao tác được bằng ngón tay với trải nghiệm ERP thực thụ.
