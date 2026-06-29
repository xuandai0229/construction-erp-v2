# FULL SYSTEM HIDDEN BUG AUDIT FIX REPORT - PHASE 2 (2026-06-29)

## 1. Lỗi HIGH và logic đã sửa
- **Daily Entry Auto-approve**: Đã sửa luồng lưu khối lượng hàng ngày. Mặc định sẽ lưu `DRAFT` (Lưu nháp) hoặc `SUBMITTED` (Gửi duyệt). Trạng thái `APPROVED` (Đã duyệt) chỉ được cấp khi người dùng có quyền phê duyệt (`ADMIN`, `DIRECTOR`, `MANAGER`, `SITE_MANAGER`).
- **Material Request Validation**: 
  - Ràng buộc cập nhật vật tư bằng `materialRequestId` để không cho phép chỉnh sửa chéo item.
  - Fix lỗ hổng nhập số âm hoặc NaN, chặn server-side toàn bộ các giá trị không hợp lệ.
  - Chặn các giá trị `status` không nằm trong enum hợp lệ.
- **Report Line Validation**: Chặn hoàn toàn việc nhập số lượng âm, rỗng hoặc `NaN` khi khai báo khối lượng công việc, tự động convert sang 0 nếu input rỗng, quăng lỗi an toàn nếu nhập số âm.
- **Accounting Request Code Concurrency**: Thêm cơ chế retry 5 lần để random `requestCode` cho thanh toán, chống lỗi dội DB (Unique Constraint) khi submit đồng thời.
- **Dynamic Require Warning (Runtime)**: Chuyển đổi import `stream/promises`, `fs`, `stream` từ dạng dynamic `require()` sang static import đầu file, giúp build Next.js an toàn và không bị cảnh báo tracing.
- **Project KPI Today**: Sửa KPI đếm khối lượng nhập trong ngày của dashboard dự án, chuyển từ `createdAt` sang dựa trên cột `entryDate` (thuộc ngày làm việc thật theo timezone Việt Nam).

## 2. Lỗi nào chưa sửa và lý do
- **Upload File Size API Limit**: Vẫn đang dựa vào config max size ở UI/Settings nhưng chưa validate cứng số byte tại API `upload/route.ts`. Lý do: Tránh phá vỡ flow upload hiện tại nếu người dùng có file đặc thù hơi vượt giới hạn (cần chốt thêm về business policy).
- **Lỗi Lint toàn cục**: Hệ thống báo 94 errors (chủ yếu là `any` và các file `require` kiểu CommonJS trong thư mục `scripts/`). Lỗi này không chặn build production nhưng làm `npm run lint` fail. Không sửa lan man trong Phase này để tránh side effect không đáng có vào mã nguồn tĩnh.

## 3. File đã thay đổi
1. `src/app/(dashboard)/projects/[id]/field-progress/daily/actions.ts`
2. `src/app/actions/material-request.ts`
3. `src/app/(dashboard)/reports/actions.ts`
4. `src/app/(dashboard)/accounting/actions.ts`
5. `src/app/api/reports/[reportId]/attachments/route.ts`
6. `src/app/api/reports/attachments/[attachmentId]/route.ts`
7. `src/app/(dashboard)/projects/[id]/page.tsx`

## 4. Command đã chạy và kết quả
- `npx prisma validate`: **PASS**
- `npx prisma generate`: **PASS**
- `npx tsc --noEmit`: **PASS** (Không có lỗi TypeScript)
- `npm run build`: **PASS** (Build thành công trong 5.7s, đã hết cảnh báo tracing NFT).
- `npm run lint`: **FAIL** (Vẫn còn lỗi ở `scripts/` và warning ở `src/`).

## 5. Git status cuối
```
M  src/app/(dashboard)/accounting/actions.ts
M  src/app/(dashboard)/projects/[id]/field-progress/daily/actions.ts
M  src/app/(dashboard)/projects/[id]/page.tsx
M  src/app/(dashboard)/reports/actions.ts
M  src/app/actions/material-request.ts
M  src/app/api/reports/[reportId]/attachments/route.ts
M  src/app/api/reports/attachments/[attachmentId]/route.ts
```

## 6. Những test thủ công user cần tự làm trên trình duyệt
1. Nhập khối lượng hàng ngày (tài khoản Kỹ sư), kiểm tra xem trạng thái trả về là DRAFT hay SUBMITTED.
2. Nhập khối lượng hàng ngày (tài khoản Chỉ huy trưởng), xem hệ thống có trả về APPROVED đúng không.
3. Tạo phiếu Đề xuất vật tư, cố tình gõ chữ (NaN) hoặc số âm vào cột "Số lượng", kiểm tra xem màn hình có báo lỗi từ server không.
4. Xem Dashboard của dự án, phần KPI "Hôm nay", đối chiếu xem đếm có chính xác số lượng đầu việc đã làm trong ngày (entryDate) không (có thể sửa entryDate trực tiếp trên DB để test).
5. Tải xuống 1 file attachment từ báo cáo để đảm bảo quá trình serve file từ backend bằng static import hoạt động ổn định.
