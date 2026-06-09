# Báo Cáo Kiểm Tra Trước Khi Gỡ Bỏ Phase 3C (Precheck Report)

## 1. Thông tin Git
- **Branch hiện tại**: `main`
- **Commit gần nhất**: `e128057 fix`
- **Working Tree**: Có một số file modified và rất nhiều file untracked liên quan đến Phase 3C.

## 2. File Modified (Chưa commit)
- `prisma/schema.prisma`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/projects/[id]/page.tsx`
- `src/app/(dashboard)/reports/page.tsx`
- `src/app/globals.css`
- `src/components/documents/document-manager.tsx`

## 3. File Untracked (Thuộc Phase 3C)
- Thư mục route:
  - `src/app/(dashboard)/projects/[id]/progress-summary/`
  - `src/app/(dashboard)/projects/[id]/progress/`
  - `src/app/(dashboard)/projects/[id]/wbs/`
  - `src/app/(dashboard)/reports/[id]/`
  - `src/app/(dashboard)/reports/new/`
- Thư mục components:
  - `src/components/reports/`
  - `src/components/wbs/`
- Helper:
  - `src/lib/progress.ts`
  - `src/app/(dashboard)/reports/actions.ts`
- Báo cáo QA:
  - `docs/qa/PHASE3CA_SITE_REPORTS_REPORT.md`
  - `docs/qa/PHASE3C_DYNAMIC_PROGRESS_SELF_TEST_REPORT.md`
  - `docs/qa/PHASE3C_DYNAMIC_PROGRESS_SUMMARY_REPORT.md`
  - `docs/qa/PHASE3C_INLINE_REPORT_TABLE_UX_FIX_REPORT.md`
  - `docs/qa/PHASE3C_SITE_REPORT_INLINE_TABLE_TEST_REPORT.md`
  - `docs/qa/PHASE3C_UI_QA_REPORT.md`
- Screenshots test:
  - `docs/qa/screenshots/phase3c-site-report-test/`
  - `docs/qa/screenshots/phase3c-dynamic-progress-self-test/`
- Migrations:
  - `prisma/migrations/20260608082919_add_site_progress_reports/`
  - `prisma/migrations/20260608091127_add_site_report_line_issue_proposal_notes/`

## 4. Kiểm tra Migrations
- CÓ migration của Phase 3C: `20260608082919_add_site_progress_reports` và `20260608091127_add_site_report_line_issue_proposal_notes`.
- **Rủi ro**: Việc xóa file migration hoặc schema sẽ làm hỏng dữ liệu trong DB hiện tại và gây lệch (drift) khi tạo migration mới.
- **Biện pháp**: GIỮ LẠI schema và các file migration. Không đụng tới DB. "Schema Phase 3C tạm giữ lại, sẽ quyết định tái thiết kế sau."

## 5. Rủi ro khi gỡ
- Rủi ro duy nhất là việc xóa các hàm/route được import ở file khác (như `projects/[id]/page.tsx` hay `dashboard/page.tsx`).
- Cần dọn dẹp cẩn thận các file `page.tsx` gốc để không chứa dead link.

## 6. Điểm Backup
- Toàn bộ thay đổi diff (modified files) đã được lưu thành công ra file patch `docs/qa/phase3c-before-cleanup.patch`.
