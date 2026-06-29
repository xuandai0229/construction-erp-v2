# Báo cáo Precheck - Module Bảng Khối Lượng Hiện Trường (Phase 3C Mới)

## 1. Thông tin Git
- **Workspace hiện tại**: `D:\construction-erp-v2`
- **Git branch hiện tại**: `main`
- **Commit gần nhất**: `e128057 fix`
- **File đang modified**: `prisma/schema.prisma`, `src/app/(dashboard)/dashboard/page.tsx`, `src/app/(dashboard)/projects/[id]/page.tsx`, `src/app/(dashboard)/reports/page.tsx`, `src/app/globals.css`, `src/components/documents/document-manager.tsx`.
- **File untracked**: Một số file thừa từ lần dọn dẹp trước như `error.html`, `docs/qa/screenshots/`, v.v.

## 2. API & Database
- Không có bất kỳ API nguy hiểm nào (`/api/clean`, `/api/test-data`) tồn tại.
- `.env` không bị track bởi Git.
- Mọi thứ an toàn để tiến hành code.

## 3. Schema hiện có
- Các Model cũ như `WBSItem`, `SiteReport`, `SiteReportLine`, `MaterialRequest`, `MaterialRequestItem` hiện vẫn đang tồn tại trong `schema.prisma`. 
- Để tránh nguy cơ mất dữ liệu và lỗi migration, tôi sẽ KHÔNG drop hay sửa các model cũ này. Tôi sẽ tạo mới một cụm Model chuyên biệt cho màn bảng khối lượng dạng Excel bao gồm: `FieldProgressTemplate`, `FieldProgressItem`, `FieldProgressEntry`, `FieldMaterialRequest` và `FieldMaterialRequestItem`.

## 4. Route hiện trường cũ
- Route `/reports` hiện tại đã được trỏ tới một Placeholder Component ("Đang thiết kế lại phân hệ").
- Các link trong trang chi tiết Project cũng đã an toàn.
- Hệ thống UI hiện tại hoàn toàn ổn định. 

## 5. Rủi ro
- Việc tạo nhiều schema mới sẽ làm dài database. Tuy nhiên, nó an toàn tuyệt đối và cách ly được luồng nghiệp vụ mới khỏi dữ liệu rác cũ.
- Sử dụng Decimal cho các phép tính số thực (Khối lượng, Phần trăm) cần phải được định dạng chính xác trước khi gửi về Client (vì Next.js sẽ báo lỗi khi truyền trực tiếp đối tượng Decimal từ RSC xuống Client Components). Sẽ phải dùng `.toString()` hoặc convert sang `number` an toàn.
