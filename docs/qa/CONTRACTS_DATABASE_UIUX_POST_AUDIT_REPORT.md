# Báo cáo Hậu kiểm Database và UI/UX Hợp đồng (Contracts Post-Audit Report)

Báo cáo này ghi lại kết quả hậu kiểm toàn diện, khắc phục lỗi nghiệp vụ và tối ưu hóa UI/UX cho phân hệ **Contracts (Quản lý hợp đồng)** trên hệ thống ERP công trình.

---

## 1. Skill và Hướng dẫn Thiết kế Áp dụng
Chúng tôi đã áp dụng triệt để các nguyên tắc từ **`design-taste-frontend`** (`SKILL.md`):
- Sử dụng bảng màu chuyên nghiệp (emerald, amber, rose, indigo) cho các trạng thái thay vì màu đơn sắc mặc định.
- Loại bỏ các chuỗi text thiếu chuyên nghiệp như `N/A` hoặc kí hiệu tiền tệ mặc định không thống nhất.
- Đảm bảo hiển thị ngày tháng nhất quán giữa Server và Client nhằm tránh lỗi Hydration trong Next.js.
- Thiết kế layout Drawer chi tiết có cấu trúc rõ ràng, khoảng đệm hợp lý, và các thẻ tóm tắt (Summary Cards) có tương tác trực quan.

---

## 2. Cấu trúc Schema và Data Model (Contract)
Theo `prisma/schema.prisma`, model `Contract` hiện tại bao gồm các trường:

```prisma
model Contract {
  id         String         @id @default(cuid())
  projectId  String
  supplierId String?
  contractNo String         @unique
  name       String
  type       ContractType
  status     ContractStatus @default(DRAFT)
  value      Decimal        @db.Decimal(19, 4)
  signDate   DateTime?
  startDate  DateTime?
  endDate    DateTime?
  deletedAt  DateTime?
  createdAt  DateTime       @default(now())
  updatedAt  DateTime       @updatedAt

  project      Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  supplier     Supplier?     @relation(fields: [supplierId], references: [id])
  paymentPlans PaymentPlan[]

  @@index([projectId])
  @@index([supplierId])
  @@index([contractNo])
}
```

### Các Enums liên quan:
- **`ContractType`**: `CLIENT` (Chủ đầu tư), `SUBCONTRACTOR` (Thầu phụ), `SUPPLIER` (Nhà cung cấp), `LABOR` (Khoán nhân công).
- **`ContractStatus`** (lưu trữ vật lý trong DB): `DRAFT` (Nháp), `ACTIVE` (Đang thực hiện), `COMPLETED` (Đã hoàn thành), `TERMINATED` (Chấm dứt).

### Đánh giá các câu hỏi nghiệp vụ (Phase 1):
1. **Contract có những field nào**: Gồm đầy đủ các thuộc tính định danh, thông tin tài chính, các mốc thời gian và liên kết dự án/đối tác.
2. **Contract có `projectId` bắt buộc không**: Có, bắt buộc để phục vụ Project-scoped isolation.
3. **Contract có `supplierId` optional không**: Có, nullable String.
4. **Contract có `PaymentPlan` relation không**: Có, quan hệ 1-nhiều (`PaymentPlan[]`).
5. **Contract có `deletedAt` không**: Có, dùng để xóa mềm (soft delete).
6. **Enum `ContractType` gồm**: `CLIENT`, `SUBCONTRACTOR`, `SUPPLIER`, `LABOR`.
7. **Enum `ContractStatus` gồm**: `DRAFT`, `ACTIVE`, `COMPLETED`, `TERMINATED`.
8. **Status hiện tại được lưu DB hay tính động**: Status trạng thái gốc được lưu trong DB, nhưng trạng thái hiển thị chi tiết (`Quá hạn`, `Sắp hết hạn`) được tính động trên UI từ thời hạn `endDate`.
9. **Hợp đồng hết hạn có được nhận diện không**: Có, thông qua hàm tính trạng thái động mới thiết lập.
10. **Xóa Contract có kiểm tra liên kết**: Có, server action chặn xóa nếu có kế hoạch thanh toán (`paymentPlans.length > 0`).

---

## 3. Kết quả Audit và Cải tiến Nghiệp vụ & UI/UX

### 3.1. Trạng thái Hiển thị Động và Deadline (Phase 2)
- **Vấn đề**: Hợp đồng có ngày kết thúc trong quá khứ nhưng status lưu DB vẫn là `ACTIVE` khiến UI hiển thị sai lệch thông tin thành "Đang thực hiện". Thẻ summary `Sắp hết hạn` trước đây bỏ sót các hợp đồng đã quá hạn.
- **Giải pháp**: Xây dựng helper `getContractDisplayStatus` tính trạng thái hiển thị động:
  - Nếu trạng thái DB là `ACTIVE` nhưng `endDate < hôm nay`: Hiển thị **`Quá hạn`** (Màu đỏ).
  - Nếu trạng thái DB là `ACTIVE`, `endDate >= hôm nay` và cách không quá 30 ngày: Hiển thị **`Sắp hết hạn`** (Màu vàng).
  - Còn lại giữ nguyên theo trạng thái gốc.
- **Summary Cards (Trước / Sau)**:
  - *Trước*: `Tổng hợp đồng` | `Đang thực hiện` (tính gộp cả quá hạn/sắp hết hạn) | `Sắp hết hạn` (bỏ sót quá hạn) | `Tổng giá trị`
  - *Sau*: `Đang thực hiện` (chỉ đếm hoạt động thực tế) | `Sắp hết hạn` | `Quá hạn` | `Tổng giá trị`
  Thay đổi này giúp phản ánh chính xác 100% sức khỏe của các hợp đồng đang chạy.

### 3.2. Dynamic Seed Data (Phase 3)
- **Vấn đề**: File seed trước đây sử dụng các ngày cố định trong năm 2025, dẫn đến việc tất cả dữ liệu seed đều rơi vào trạng thái quá hạn khi chạy thử nghiệm ở hiện tại.
- **Giải pháp**: Cập nhật `scripts/seed-contracts-market-sample.ts` sử dụng ngày động tính từ ngày hiện tại (`new Date()`).
  - Hợp đồng 01: Dài hạn (Active, kết thúc sau 6 tháng).
  - Hợp đồng 02: Sắp hết hạn (Active, kết thúc sau 20 ngày).
  - Hợp đồng 03: Nháp (Draft, chưa có ngày).
  - Hợp đồng 04: Quá hạn (Active, đã kết thúc cách đây 10 ngày).
  - Hợp đồng 05: Đã hoàn thành (Completed, đã kết thúc cách đây 2 tháng).
- Sử dụng phương thức `upsert` của Prisma theo `contractNo` giúp quá trình seed mang tính idempotent, chạy lại nhiều lần không sinh trùng lặp dữ liệu và tự động cập nhật mốc thời gian động mới nhất.

### 3.3. Hiển thị Đối tác và Loại Hợp đồng (Phase 4)
- **Vấn đề**: Hợp đồng `CLIENT` hoặc thiếu đối tác hiển thị `N/A` trông thô và thiếu tính bản địa hóa. Form nhập liệu khóa chọn Supplier cho loại `LABOR` trong khi thực tế khoán nhân công vẫn cần chỉ định tổ đội thi công.
- **Giải pháp**:
  - Đối với loại `CLIENT` (Chủ đầu tư): Hiển thị text rõ ràng là `Chủ đầu tư`.
  - Đối với các loại khác bị thiếu liên kết Supplier: Hiển thị `Chưa chọn đối tác` (Màu vàng đất nổi bật) để cảnh báo nhẹ cho người quản lý.
  - Form nhập liệu: Mở khóa chọn đối tác cho loại hợp đồng `LABOR`. Chỉ khóa chọn đối tác đối với loại `CLIENT`.

### 3.4. Định dạng Ngày tháng và Tiền tệ (Phase 5)
- **Ngày tháng**: Khắc phục triệt để nguy cơ hydration mismatch bằng cách viết helper format rõ ràng `dd/MM/yyyy`. Nếu không có ngày, trả về `—`.
- **Tiền tệ**: Thay thế định dạng mặc định (cho ra kí hiệu `₫` khó đọc) bằng cấu trúc tường minh `15.000.000.000 đ`.

---

## 4. Bảng tổng hợp thay đổi UI/UX & Logic

| Hạng mục | Trước cải tiến | Sau cải tiến (Hiện tại) | Lý do/Nghiệp vụ áp dụng |
| :--- | :--- | :--- | :--- |
| **Trạng thái hiển thị** | Dựa thuần túy vào Enum DB (`DRAFT`, `ACTIVE`, `COMPLETED`, `TERMINATED`) | Thêm `OVERDUE` (Quá hạn - Đỏ) và `EXPIRING` (Sắp hết hạn - Vàng) tính động | Quản lý rủi ro tiến độ hợp đồng |
| **Bộ lọc Trạng thái** | Lọc theo trạng thái DB | Lọc trực quan theo trạng thái hiển thị động | Giúp người dùng tìm nhanh hợp đồng cần chú ý |
| **Cột Đối tác** | Hiện `N/A` nếu thiếu | Hiện `Chủ đầu tư` (CLIENT) hoặc `Chưa chọn đối tác` | Tăng độ chuyên nghiệp, bản địa hóa ngôn ngữ |
| **Form - HĐ Nhân công** | Khóa chọn đối tác | Cho phép chọn đối tác | Khoán nhân công cần chọn tổ đội/đại diện nhân công |
| **Format Tiền** | `1.000.000 ₫` | `1.000.000 đ` | Đồng bộ cách viết Tiếng Việt chuẩn |
| **Format Ngày** | `toLocaleDateString` (Dễ lỗi Hydration) | Chuỗi định dạng thủ công `dd/MM/yyyy` ổn định | Đảm bảo tính ổn định khi Server-Side Rendering |

---

## 5. Phân quyền và Bảo mật (RBAC) (Phase 6)
Hệ thống phân quyền được kiểm tra nghiêm ngặt:
- **Global Roles**: `ADMIN`, `DIRECTOR`, `DEPUTY_DIRECTOR`, `MANAGER`, `ACCOUNTANT` có quyền xem toàn bộ hợp đồng thuộc tất cả các dự án.
- **Site Roles**: Các role thuộc công trình (ví dụ: `PROJECT_MANAGER`, `SITE_COMMANDER`) chỉ có thể xem và thao tác trên các hợp đồng thuộc dự án mà họ được gán là thành viên hoạt động (`ProjectMember`).
- Các hành động tạo, sửa, xóa đều được hậu kiểm quyền trực tiếp trên Server Action dựa trên ID dự án của hợp đồng đó, ngăn chặn hoàn toàn việc bypass từ Client-side.

---

## 6. Liên kết Dữ liệu và Xóa mềm (Phase 7)
- Hệ thống áp dụng **Xóa mềm** (`deletedAt`) cho hợp đồng để duy trì vết kiểm toán (Audit Trail).
- Server Action `deleteContract` kiểm tra chặt chẽ liên kết với `PaymentPlan`. Nếu hợp đồng đã có kế hoạch thanh toán, hành động xóa sẽ bị từ chối kèm thông báo: `"Không thể xóa hợp đồng đã có kế hoạch thanh toán."` để tránh mất tính toàn vẹn dữ liệu.

---

## 7. Kết quả Kiểm thử Tự động & Build (Phase 9)

1. **Chạy Seed Hợp đồng**:
   ```bash
   npx tsx --env-file=.env scripts/seed-contracts-market-sample.ts
   ```
   *Kết quả*: Upsert thành công 5 hợp đồng mẫu với mốc thời gian động chuẩn xác.

2. **Chạy QA Script**:
   ```bash
   npx tsx --env-file=.env scripts/qa-contracts-crud-rbac.ts
   ```
   *Kết quả*: PASS toàn bộ các bước kiểm tra (ADMIN tạo, sửa, xóa mềm hợp đồng).

3. **Kiểm tra TypeScript**:
   ```bash
   npx tsc --noEmit
   ```
   *Kết quả*: PASS (Không có lỗi biên dịch).

4. **Kiểm tra Build Next.js**:
   ```bash
   npm run build
   ```
   *Kết quả*: PASS (Build thành công).

---

## 8. Kết luận & Hướng phát triển tiếp theo
- **Trạng thái**: Phân hệ `Contracts` đã đạt trạng thái MVP hoàn chỉnh, bảo mật cao và sẵn sàng đưa vào vận hành thực tế.
- **Blocker**: Không có blocker nào.
- **Khuyến nghị bước tiếp theo**:
  - Tích hợp thêm các trường cảnh báo tiến độ thanh toán khi các module `PaymentPlan` và `PaymentRecord` được xây dựng đầy đủ.
  - Thiết lập cơ chế gửi thông báo (Notification) tự động cho người quản lý dự án khi hợp đồng rơi vào trạng thái `Quá hạn` hoặc `Sắp hết hạn`.
