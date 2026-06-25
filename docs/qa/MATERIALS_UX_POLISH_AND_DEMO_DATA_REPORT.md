# Báo Cáo Nâng Cấp UX Phân Hệ Materials & QA Demo Data

## 1. Cơ Sở Thiết Kế (SKILL.md)
- **File đọc:** `.agents/skills/design-taste-frontend/SKILL.md`
- **Tập trung:** Thiết kế Anti-slop, tạo giao diện B2B chuyên nghiệp, clean, sử dụng không gian padding rộng rãi nhưng hạn chế khoảng trống vô nghĩa bằng các checklist hướng dẫn (Empty States) thông minh. Nút bấm sử dụng tông slate/blue/emerald thay vì rực rỡ khó nhìn.

## 2. Phân Tích 5 Tab Trước Khi Sửa
1. **Tổng quan:** Đã có 4 card hiển thị nhưng cảm giác rỗng khi chưa có dữ liệu (hiển thị 0), phần không gian trống phía dưới chưa được tận dụng.
2. **Danh mục:** Trạng thái khi chưa tạo vật tư và khi search không ra bị gộp chung thành "Không tìm thấy", gây hiểu lầm là lỗi hệ thống.
3. **Tồn kho:** Tương tự như Danh mục, báo lỗi search thay vì hướng dẫn nhập kho đầu kỳ. Nút thao tác trên Header bị disable mà không có giải thích.
4. **Nhập / Xuất:** Nút tạo giao dịch vẫn sáng dù không có vật tư.
5. **Đề xuất mua:** Nút vẫn có thể click được nhưng không dẫn đến đâu, phần hiển thị số lượng tồn kho gây cảm giác thiết sót dữ liệu thay vì hướng dẫn.

## 3. Cải Thiện UI/UX Nhấn Điểm
- **Header:** Lược bỏ độ cao thừa. Biến `select` chọn dự án thành `truncate` để tránh dàn chữ gây vỡ giao diện trên điện thoại. 
- **Buttons (Thêm / Nhập / Xuất):** 
  - Đưa xuống layout ngang 3 cột. 
  - Nút "Thêm vật tư" đổi thành nền đen `bg-slate-900` chuẩn doanh nghiệp.
  - Các nút có Tooltip tự động giải thích chi tiết tại sao người dùng không thể bấm (Vd: "Cần tạo mã vật tư trước khi xuất kho", "Chưa có tồn kho để xuất").
- **Tab Tổng quan:** 
  - Khi `materialItems.length === 0`: Thay vì để màn hình trống, hiển thị ngay hộp thoại Welcome xanh biển kèm **Checklist 3 bước**: Tạo mã vật tư -> Nhập kho đầu kỳ -> Theo dõi tồn. Nút "Thêm vật tư" nổi bật ngay tại Box.
  - Khi đã có vật tư nhưng `stocks === 0`: Box đổi sang màu Xanh lá (`emerald`), tích chéo bước 1 và hướng dẫn User bấm nút "Nhập kho đầu kỳ" ngay bên cạnh.

## 4. Nâng Cấp Empty States
Tất cả các thành phần bảng và danh sách được tách bạch logic render `Empty State`:
- **Danh mục:** `Chưa có mã vật tư nào. Tạo mã vật tư đầu tiên để bắt đầu...` vs `Không tìm thấy vật tư phù hợp với từ khóa.`
- **Tồn kho:** `Chưa có tồn kho. Hãy tạo vật tư và nhập kho đầu kỳ.` vs `Không tìm thấy vật tư phù hợp với bộ lọc.`
- **Đề xuất mua:** Khi số lượng sắp hết = 0, chuyển `Aside Box` thành màu xám trung tính (Neutral) với thông báo "Công trình hiện không có vật tư nào chạm mốc tồn tối thiểu."

## 5. Đồng Bộ Logic Nút Bấm "Disabled"
- Header **Thêm / Nhập / Xuất**: Chỉ sáng khi có Project. Nhập/Xuất bị Disable nếu số lượng mã vật tư = 0. "Xuất" bị disable nếu Tồn kho của mọi vật tư đang $\le$ 0.
- Tab Nhập / Xuất (Transactions): Nút "Tạo giao dịch" nay đã thêm `hasMaterials={materialItems.length > 0}` vào logic, tự động Disable và hiển thị title: *"Cần tạo mã vật tư trước khi tạo giao dịch"* nếu bảng danh mục bằng 0.

## 6. QA Demo Data Script
- **Tên Script:** `scripts/qa-materials-demo-data.ts`
- **Bảo mật:** Script sử dụng `process.env.NODE_ENV` và `dotenv`. Báo lỗi chặn khởi chạy nếu trên `production` (trừ khi cố tình chèn flag `--force`).
- **Nội dung Seed:**
  - Lấy Project Active đầu tiên.
  - Tạo 5 vật tư (Thép D10, Thép D16, Xi măng PCB40, Cát vàng, Đá 1x2).
  - Khởi tạo hàng loạt lịch sử "Nhập/Xuất" xoay quanh 3 mốc (Đủ hàng, Sắp Hết, Hết hàng).
- **Chạy Seed:** `npx tsx --env-file=.env scripts/qa-materials-demo-data.ts --force`
- **Dọn dẹp Cleanup:** `npx tsx scripts/qa-materials-demo-data.ts --cleanup`

## 7. QA Flow Validation (Chạy Script Trên Data Demo)
- Đã test trực tiếp tạo vật tư và chạy dữ liệu Demo. Dashboard đã hiển thị chính xác tổng kho > 600, Vật tư sắp hết có 1 món (Xi măng, tồn 20/min 50) và Vật tư hết hàng có 1 (Thép D10, tồn 0/min 200). 
- Card "Cảnh báo sắp hết" móc chính xác Badge đỏ. Chart hoạt động hoàn hảo.

## 8. Responsive Check
- **Desktop (1440px):** Layout Overview hiển thị bảng dài đầy đủ. Check list và Grid Card không giãn quá mức.
- **Laptop (1366px):** Grid 4 card thu hẹp mượt mà.
- **Mobile (390px):** Các table được giấu đi và tráo bằng cấu trúc Article Card Component. Select công trình truncate chữ thay vì đẩy button rớt dòng. Các nút Dialog phủ form hoàn chỉnh 100% width mà không horizontal overflow.

## 9. Automation Pipeline
```bash
npx prisma format     -> Thành công
npx prisma validate   -> Schema Valid
npx prisma generate   -> Cập nhật PrismaClient
npx tsc --noEmit      -> Pass (0 Error)
npm run build         -> ✓ Compiled successfully (Exit code 0)
```

## 10. Hướng Dẫn Test Thủ Công
1. Truy cập trang `/materials` và chọn một dự án.
2. Di chuột lên nút "Nhập kho/Xuất kho" trên Header để xem Tooltip giải thích lý do disable.
3. Ở Tab "Tổng quan", bạn sẽ thấy Box Checklist 3 bước điều hướng. Bấm nút CTA "Thêm vật tư" ngay tại Box.
4. Để nạp dữ liệu Demo thực tế, mở terminal gốc chạy: `npx tsx scripts/qa-materials-demo-data.ts --force`.
5. Reset trang để xem Dashboard hiển thị số liệu các tab "Tồn kho" và "Nhập / Xuất" nhảy số liệu với các Badge màu sắc (Emerald = Đủ, Amber = Cảnh báo, Red = Hết hàng).
6. Khi thử nghiệm xong, bạn có thể xóa toàn bộ dữ liệu demo bằng lệnh: `npx tsx scripts/qa-materials-demo-data.ts --cleanup`.
