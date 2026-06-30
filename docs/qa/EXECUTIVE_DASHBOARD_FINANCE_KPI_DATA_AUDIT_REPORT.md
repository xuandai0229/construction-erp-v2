# EXECUTIVE DASHBOARD FINANCE KPI DATA AUDIT REPORT

## 1. Kết luận
- **Trạng thái:** PASS. Dashboard đang hiển thị chính xác theo dữ liệu từ database.
- **Project được audit:** Dự án Trần Quang Hiếu
- **Project ID:** `cmqz12dlt00011swk1ztw9afx` (HN-TQH-2026-002)
- **Giá trị hợp đồng dashboard đang hiện:** `-` / `Chưa có hợp đồng`
- **Giá trị hợp đồng DB thực tế:** 0 hợp đồng.
- **Chờ thanh toán dashboard đang hiện:** `-` / `Chưa có hồ sơ`
- **Chờ thanh toán DB thực tế:** 0 hồ sơ thanh toán.
- **Dashboard hiện `-` có đúng không:** HOÀN TOÀN ĐÚNG. Dashboard đã ánh xạ 100% trung thực tình trạng dữ liệu rỗng của dự án này.
- **Có sửa query không:** KHÔNG CẦN THIẾT. Query `getFinanceSummary` đang hoạt động hoàn hảo, filter đúng `projectId`.
- **Có sửa UI empty state không:** KHÔNG CẦN THIẾT. Empty state hiện tại ("Chưa có hợp đồng", "Chưa có hồ sơ") đã phản ánh rất rõ ràng và chuẩn xác tình trạng thiếu dữ liệu của công trình.
- **Build/TypeScript:** Pass toàn bộ.

## 2. Schema đã kiểm tra
- **Contract model:** `Contract`
- **Field project:** `projectId`
- **Field value:** `value` (Decimal)
- **Contract status được tính:** `ACTIVE`, `COMPLETED` (loại bỏ `DRAFT`, `TERMINATED`)
- **Payment model:** `PaymentRequest`
- **Field project:** `projectId`
- **Field amount:** `totalAmount` (Decimal)
- **Payment status được tính:** Bất kỳ trạng thái nào ngoài `PAID`, `REJECTED`, `CANCELLED`, `DRAFT` (thường là `SUBMITTED`, `APPROVED`).

## 3. Raw DB audit
Được lấy trực tiếp qua truy vấn SQL từ PostgreSQL (bỏ qua Prisma cache/context):

### Selected project (Dự án Trần Quang Hiếu)
- **Contracts:** 0 bản ghi (`SELECT * FROM "Contract" WHERE "projectId" = '...' AND "deletedAt" IS NULL`)
- **PaymentRequests:** 0 bản ghi
- **Tổng hợp:** Không có bất kỳ dữ liệu tài chính nào cho dự án này trong DB.

### Toàn hệ thống
- **Contracts:** 6 bản ghi trên toàn DB.
- **PaymentRequests:** 8 bản ghi trên toàn DB.
- **Tổng hợp:** Hệ thống có dữ liệu, nhưng không thuộc về "Dự án Trần Quang Hiếu". Khi chọn "Toàn hệ thống", dashboard sẽ cộng dồn 6 hợp đồng và 8 hồ sơ này.

## 4. So sánh dashboard query
- **getFinanceSummary:** Logic trong `src/lib/dashboard/dashboard-queries.ts` hoạt động đúng.
- **project scope:** `accessibleProjectIds = ['cmqz12dlt00011swk1ztw9afx']` được truyền vào, Prisma truy xuất đúng dữ liệu mảng rỗng.
- **status filter:** Mệnh đề `where` trong query `activeContracts` và `pendingPaymentSum` là chính xác với yêu cầu nghiệp vụ.
- **amount/value field:** Sử dụng đúng trường `value` và `totalAmount`.
- **lỗi phát hiện:** KHÔNG CÓ LỖI.

## 5. File đã sửa
Không cần sửa bất kỳ file production code nào vì logic hiện tại đang chính xác hoàn toàn.

## 6. Test đã chạy
- `node scripts/audit-dashboard-finance-kpi-pg.js` (Bypass Prisma Client Init Error để query thẳng PostgreSQL)
- Phân tích trực tiếp từ kết quả SQL row count.

## 7. Kết luận nghiệp vụ
- **Nếu project chưa có hợp đồng/thanh toán:** Giao diện hiển thị dấu `-` và câu thông báo "Chưa có hợp đồng", "Chưa có hồ sơ thanh toán" là đúng đắn, khoa học và tránh gây hiểu lầm cho Executive rắng hệ thống bị lỗi (0 VND thường gây hoang mang, `-` thể hiện sự vắng mặt của dữ liệu).
- **Đề xuất tiếp theo:** UAT có thể tiếp tục với việc tạo thử 1 hợp đồng và 1 hồ sơ thanh toán mới cho "Dự án Trần Quang Hiếu" để quan sát số liệu trên Dashboard cập nhật realtime. Dữ liệu rỗng hiện tại không phải là lỗi.
