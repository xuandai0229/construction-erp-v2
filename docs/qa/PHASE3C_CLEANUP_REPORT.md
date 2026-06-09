# Báo Cáo Gỡ Bỏ Code Phase 3C (Rollback & Cleanup Report)

## 1. Lý do cleanup
- Đưa hệ thống quay trở lại trạng thái ổn định (phiên bản trước Phase 3C) để tiến hành phân tích và tái thiết kế lại luồng nghiệp vụ báo cáo hiện trường, quản lý hạng mục và đề xuất vật tư theo tiêu chuẩn thực tế mới.

## 2. Phạm vi đã gỡ
- Toàn bộ các module tạo mới, danh sách hiển thị, màn hình báo cáo nâng cao (inline table), màn tổng hợp tiến độ động, chức năng quản lý hạng mục WBS.
- Các tài liệu QA, báo cáo kiểm thử và screenshots sinh ra trong quá trình làm Phase 3C.

## 3. Các file và thư mục đã xóa hoàn toàn
- `src/app/(dashboard)/projects/[id]/progress-summary/`
- `src/app/(dashboard)/projects/[id]/progress/`
- `src/app/(dashboard)/projects/[id]/wbs/`
- `src/app/(dashboard)/reports/[id]/`
- `src/app/(dashboard)/reports/new/`
- `src/app/(dashboard)/reports/actions.ts`
- `src/components/reports/`
- `src/components/wbs/`
- `src/lib/progress.ts`
- Báo cáo và Screenshots test Phase 3C: `docs/qa/PHASE3CA_SITE_REPORTS_REPORT.md`, `PHASE3C_DYNAMIC_PROGRESS_SELF_TEST_REPORT.md`, `PHASE3C_DYNAMIC_PROGRESS_SUMMARY_REPORT.md`, `PHASE3C_INLINE_REPORT_TABLE_UX_FIX_REPORT.md`, `PHASE3C_SITE_REPORT_INLINE_TABLE_TEST_REPORT.md`, `PHASE3C_UI_QA_REPORT.md`, `docs/qa/screenshots/phase3c-dynamic-progress-self-test/`.

## 4. Các file đã sửa
- `src/app/(dashboard)/projects/[id]/page.tsx`: Gỡ bỏ các link chuyển hướng đến Hạng mục WBS, Tiến độ thi công, Tổng hợp báo cáo và thay thế bằng Placeholder "Báo cáo hiện trường đang được thiết kế lại".
- `src/app/(dashboard)/reports/page.tsx`: Thay thế toàn bộ logic báo cáo cũ bằng một Empty State / Placeholder page cực kỳ an toàn.
- `src/app/globals.css`: Xóa logic dark mode để khắc phục lỗi màu tương phản.

## 5. File/Folder Phase 3C còn giữ lại và lý do
- `prisma/schema.prisma` và `prisma/migrations/`: Các định nghĩa model mới (như `WBSItem`, `SiteReport`, `MaterialRequest`...) đều được giữ nguyên vẹn. Việc gỡ bỏ chúng lúc này không mang lại giá trị lớn nhưng lại ẩn chứa rủi ro rất cao về Data Drift và lỗi quan hệ khóa ngoại nếu reset migration. "Schema Phase 3C tạm giữ lại, sẽ quyết định tái thiết kế sau."

## 6. Xử lý Menu / Sidebar
- Sidebar (`src/components/layout/sidebar.tsx`) vẫn giữ mục "Báo cáo hiện trường", tuy nhiên thay vì trỏ đến màn hình vỡ lỗi, nó sẽ trỏ đến Placeholder `/reports`.
- Hệ thống đảm bảo 100% không thể click vào bất kỳ dead link (404) nào từ UI.

## 7. Giải pháp Placeholder `/reports`
- Màn hình `/reports` đã được thay bằng Component React Server tĩnh. 
- Hiển thị thông báo "Đang thiết kế lại phân hệ" và một đoạn văn giải thích lý do, giữ trải nghiệm người dùng luôn ở mức chuyên nghiệp, không gây gián đoạn.

## 8. Kết quả xác thực (Validation Build)
Sau khi dọn dẹp cache `.next`, quá trình biên dịch lại dự án cho kết quả xuất sắc:
- `npx prisma validate`: **Pass** (Schema chuẩn)
- `npx tsc --noEmit`: **Pass** (0 lỗi TypeScript)
- `npm run build`: **Pass** (Build static và dynamic pages trơn tru)

## 9. Kiểm thử UI Nhanh
- Quá trình điều hướng Dashboard -> Project -> Reports đều hoạt động an toàn. Hệ thống module Auth, Document và Dự án chạy ổn định và không hề bị ảnh hưởng bởi lần rollback này.

## 10. Đề xuất bước tiếp theo
- Tổ chức phân tích lại yêu cầu thiết kế hệ thống ngoài công trường (thực trạng nhập liệu, form mẫu thực tế, quyền hạn ký duyệt vật tư...) trước khi bắt tay code Phase 3C mới.
