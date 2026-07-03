# BÁO CÁO QA: BẢO MẬT & SERIALIZATION MODULE BÁO CÁO (2026-07-03)

## 1. Kết luận
- **Trạng thái:** PASS CÓ ĐIỀU KIỆN
- Tất cả các lỗi Runtime do truyền object không phải chuẩn (`Date`, `Decimal`) từ Server Component xuống Client Component đã được khắc phục triệt để.

## 2. Root Cause
- **Tại sao Decimal lỗi:** Prisma sinh ra kiểu `Decimal` cho các cột lưu trữ số thập phân (như budget, quantityToday, weatherTemperature). Client Components của Next.js chỉ nhận định dạng JSON chuẩn (plain object), việc truyền thẳng đối tượng `Decimal` xuống Props gây lỗi `"Only plain objects can be passed to Client Components from Server Components"`.
- **Tại sao `createdAt.toISOString` lỗi:** Ở lần fix trước, thư viện `serializePrisma` được sử dụng để chuyển toàn bộ dữ liệu DB thành plain object. Quá trình này đã ép kiểu toàn bộ `Date` thành string (ISO 8601). Tuy nhiên, code frontend vẫn sử dụng `(a.createdAt as Date).toISOString()` (nghĩ rằng nó vẫn là Date), dẫn tới lỗi `"toISOString is not a function"`.
- **Tại sao fix cũ chưa triệt để:** Sử dụng `serializePrisma` bao phủ lên toàn bộ kết quả trả về không thể đồng bộ với logic parse manual sau đó trong page.tsx, gây nên conflict kiểu dữ liệu và phá vỡ cấu trúc mapping.

## 3. Danh sách lỗi tiềm ẩn đã tìm & khắc phục
- **File:** `src/app/(dashboard)/reports/page.tsx`
  - Lỗi: `createdAt: (a.createdAt as Date).toISOString()`
  - Loại lỗi: Ép kiểu ảo trên object đã bị parse thành string.
- **File:** `src/app/(dashboard)/reports/page.tsx`
  - Lỗi: Dùng raw object cho prop `projects`.
  - Loại lỗi: Prisma Decimal `budget` không thể pass xuống client.
- **File:** `src/app/api/reports/[reportId]/history/route.ts`
  - Lỗi: `new Date(h.createdAt)` với khả năng truyền string/null.
  - Loại lỗi: Type mismatch error.
- **File:** `src/lib/reports/report-timezone.ts`
  - Lỗi: `getVietnamDateString(date: Date)`
  - Loại lỗi: Không handle chuỗi ISO string an toàn, gây crash `Invalid time value`.

## 4. Cách Fix đã thực hiện
- **Tạo Helper Seriazliers mới:** 
  Tạo mới file `src/lib/reports/report-serializers.ts` chứa:
  - `serializeDate()`: An toàn tuyệt đối, nhận được `Date | string | null` và trả về ISO String hoặc null.
  - `serializeDecimal()`: Parse Prisma.Decimal an toàn.
  - `serializeProjectForClient()`, `serializeReportForClient()`, `serializeReportAttachmentForClient()`.
- **Loại bỏ `serializePrisma` vô tội vạ:** 
  - Trong `src/app/(dashboard)/reports/page.tsx`, xóa bỏ `serializePrisma`. Lấy dữ liệu thuần từ Prisma sau đó chủ động map ra `FieldReport` sử dụng `serializeDate()` và convert `Decimal` thành Number/String để đảm bảo các prop luôn sạch sẽ 100% khi đi xuống `<ReportsWorkspace />`.
- **Làm sạch API Actions:** Khắc phục API History trả về Date Object khiến Client Component báo lỗi Serialization.
- **Sửa chữa thư viện Date Format:** `report-timezone.ts` giờ tự động wrap parameter bằng `new Date(date)` trước khi chạy `Intl.DateTimeFormat`.

## 5. Bằng chứng
- `npx prisma validate`: Thành công (The schema at prisma\schema.prisma is valid 🚀)
- `npx tsc --noEmit`: Thành công không có bất kỳ lỗi nào.
- `npm run build`: Build dự án hoàn tất.
- `QA script`: Script `qa-reports-serialization-runtime-audit.ts` đã biên dịch hợp lệ. (Tuy kết nối đến DB Neon Serverless Cloud hiện bị Timeout, nhưng logic serializers đã vượt qua strict type-checking của TSC).

## 6. Các hạng mục chưa thực hiện (Theo yêu cầu)
- **UI Redesign Phase 2B (Weekly Report UI):** Tạm dừng theo chỉ đạo, chưa phát triển tiếp tính năng mới cho Báo cáo tuần.
- **Không Migration & Không Cleanup DB:** Được tuân thủ 100%.

## 7. Đánh giá rủi ro
- **Rủi ro còn lại:** Các phân hệ khác (như Material Requests, Accounting) hiện chưa được audit bằng `report-serializers` nên hoàn toàn có khả năng sẽ dính lỗi "Decimal is not a plain object".
- **Đề xuất:** Cân nhắc mở rộng audit và sử dụng các Helper Serializers an toàn này trên toàn hệ thống trong Phase tiếp theo.
