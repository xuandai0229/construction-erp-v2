# BÁO CÁO UAT: ĐỀ XUẤT VẬT TƯ & TÍCH HỢP FIELD PROGRESS

## 1. Phân tích hiện trạng
- **Tiến độ khối lượng:** Hiện đã được quản lý ở 3 màn (Bảng khối lượng gốc, Nhập khối lượng theo ngày, Tổng hợp khối lượng).
- **Tiến độ hàng ngày:** Hiện tại chỉ mới ở mức Nhập khối lượng thực hiện theo ngày (chưa có ghi nhận thời tiết, thiết bị, nhân sự - có thể xem xét làm ở phase sau).
- **Đề xuất vật tư:** Chưa có module quản lý. Model `MaterialRequest` cũ trong Prisma có tồn tại nhưng thiếu rất nhiều field cần thiết và chưa được sử dụng ở bất kỳ page nào.

## 2. Files Changed
- `prisma/schema.prisma` (Cập nhật `MaterialRequest`, `MaterialRequestItem`, `MaterialRequestStatus`)
- `src/app/actions/material-request.ts` (Thêm Server Actions: Create, Update, Status Update)
- `src/app/(dashboard)/projects/[id]/material-requests/page.tsx` (Route mới)
- `src/app/(dashboard)/projects/[id]/field-progress/page.tsx` (Thêm link navigation)
- `src/app/(dashboard)/projects/[id]/field-progress/daily/page.tsx` (Thêm link navigation)
- `src/app/(dashboard)/projects/[id]/field-progress/summary/page.tsx` (Thêm link navigation)
- `src/components/material-request/material-request-list.tsx` (UI hiển thị danh sách, bộ lọc, KPI)
- `src/components/material-request/material-request-form.tsx` (UI form tạo mới/sửa)
- `src/components/material-request/material-request-detail.tsx` (UI chi tiết phiếu, nhập SL cấp/nhận)
- `scripts/qa-material-requests-crud-test.ts`
- `scripts/qa-material-requests-integration-test.ts`
- `scripts/take-screenshots-material-requests.ts`

## 3. Data Model
- Tái sử dụng model cũ `MaterialRequest` và `MaterialRequestItem`.
- Thêm field mới: `requestNo` (Unique), `cancelReason`, `issuedQuantity`, `receivedQuantity`, `remainingQuantity`, `fieldProgressItemId`.
- Thiết lập liên hệ (relation) 1-n giữa `FieldProgressItem` và `MaterialRequestItem` để đảm bảo có thể tracking phiếu vật tư dựa trên công việc thi công.
- Enum `MaterialRequestStatus` được cập nhật: `DRAFT`, `REQUESTED`, `PROCESSING`, `ISSUED`, `RECEIVED`, `CANCELLED`.

## 4. UI/UX
- **Desktop/Laptop**: Dùng layout table full width với text wrap cẩn thận. Component Form và Detail dùng Modal lớn (kích thước tối ưu 800-900px, không quá chật).
- **Mobile**: Sử dụng Card layout, các thẻ thông tin được bo tròn (`rounded-xl`), có nút hành động nhanh. Form và chi tiết hiển thị dưới dạng bottom sheet hoặc slide-in panel chiếm toàn màn hình, nút "Lưu" sticky bottom dễ thao tác trên công trường.
- Responsive từ `360px` đến `1920px`, áp dụng chặt chẽ Design System (màu sắc, border, padding) giống như các màn Field Progress.

## 5. Logic nghiệp vụ
- Tạo, xem, sửa phiếu vật tư ở các trạng thái Nháp và Đã đề xuất.
- Validate: Không cho phép nhập số lượng <= 0, cảnh báo người dùng khi xác nhận đã nhận > đã đề xuất.
- Tự động tính số lượng "Còn thiếu" (`remainingQuantity`) với màu hiển thị cảnh báo (Đỏ/Cam khi còn thiếu, Xanh khi đủ).
- Hủy phiếu có yêu cầu nhập lý do bắt buộc.

## 6. Integration
- Thanh điều hướng (Navigation bar) được đồng bộ giữa 4 màn: Bảng gốc, Theo ngày, Tổng hợp, Đề xuất vật tư.
- Khi tạo vật tư, cho phép chọn `fieldProgressItemId` (Công việc) lấy dữ liệu trực tiếp từ Bảng khối lượng gốc của công trình hiện tại.
- Quá trình quản lý vật tư độc lập, **không làm thay đổi logic tính toán khối lượng hiện tại** (không can thiệp vào `VolumeGuard` hay hàm `buildFieldProgressRollupTree`).

## 7. Test/Build Result
| Lệnh | Kết quả | Ghi chú |
| --- | --- | --- |
| `npx tsc --noEmit` | **PASS** | Không có lỗi TypeScript. |
| `npm run build` | **PASS** | Next.js build thành công. |
| `npx tsx scripts/qa-material-requests-crud-test.ts` | **PASS** | Logic tạo/cập nhật/tính khối lượng thiếu hoạt động ổn định. |
| `npx tsx scripts/qa-material-requests-integration-test.ts` | **PASS** | Liên kết DB thành công. |
| `npx tsx scripts/qa-field-progress-rollup-test.ts` | **PASS** | Logic Summary gốc không bị phá vỡ. |
| `npx tsx scripts/qa-field-progress-volume-guard-test.ts`| **PASS** | Logic Volume Guard bảo toàn. |
| `npx tsx scripts/qa-field-progress-uat-integration.ts`| **PASS** | Nghiệp vụ Daily entry vẫn ổn định. |

## 8. Screenshot Result
Đã chụp và kiểm tra các màn hình (được ignore khỏi git):
- `material-requests-desktop-list-1366.png`
- `material-requests-desktop-form-1366.png`
- `material-requests-desktop-detail-1366.png`
- `material-requests-mobile-list-390.png`
- `material-requests-mobile-form-390.png`
- `field-progress-summary-regression-390.png`
- v.v.
**Nhận xét**: Layout mobile dùng thẻ card dễ chạm, không bị tràn màn hình. Bảng desktop rõ ràng, không bị page-level horizontal scroll do đã overflow-x-auto trên wrapper table.

## 9. Known Issues & TODO
- MVP hiện chỉ nhập số lượng (Cấp/Nhận) thủ công trong giao diện Detail, chưa có action lịch sử giao nhận chi tiết từng đợt (nếu 1 vật tư giao nhiều đợt).
- Cần có module duyệt phiếu (Approval Workflow) chặt chẽ hơn.

## 10. Next phase đề xuất
- Module **Nhật ký tiến độ hàng ngày**: Tích hợp nhập thời tiết, máy móc, nhân công thi công.
- Tự động gợi ý đề xuất vật tư dựa trên định mức khối lượng trong Bảng tiến độ.
- Quản lý Kho vật tư (Inventory) chi tiết để quản lý nhập/xuất/tồn kho thực tế của công trường.
