# Báo cáo audit và chuẩn hóa tiếng Việt toàn hệ thống

Ngày hoàn tất: 13/07/2026 (ICT)

## 1. Kết luận tổng thể

**PASS có điều kiện.** Các chuỗi UI, thông báo server action/API, validation, toast, accessibility, dữ liệu tên tệp trong test và các nhãn viết tắt đã phát hiện đều đã được chuẩn hóa. Không thay đổi schema, migration, enum, route, API contract hay dữ liệu database.

Điều kiện còn lại là `npm run lint` chưa sạch do 33 lỗi có trước trong `scratch/` và `patch.js`, ngoài phạm vi thay đổi này; Playwright chức năng không chạy vì bộ test đang tạo/xóa project và user QA, không an toàn cho dữ liệu hiện hữu.

## 2. Phạm vi đã quét

- Baseline: 1.423 tệp văn bản thuộc các phần mở rộng yêu cầu, trước khi tạo các tài liệu audit.
- Quét hồi quy: 1.426 tệp (đã gồm tài liệu audit mới); 284 tệp runtime trong `src` và `prisma`.
- Thư mục trọng tâm: `src`, `prisma`, `scripts`, `docs`, `public` và `qa`; bỏ qua dependency, build output, lockfile, binary và test output.
- Đã đọc ngữ cảnh của các string literal/JSX, API response, server action, toast, mapping status, accessibility, seed/QA script và test trước khi sửa.

## 3. Thống kê trước và sau

| Nhóm lỗi | Trước sửa | Đã sửa | Còn lại |
| --- | ---: | ---: | ---: |
| Tiếng Việt không dấu trong nội dung runtime | 34 | 34 | 0 |
| Tiếng Anh có thể trả về người dùng | 60 | 60 | 0 trong các vị trí đã phân loại |
| Ngôn ngữ trộn trong UI | 10 | 10 | 0 trong các vị trí đã phân loại |
| Viết tắt UI khó hiểu | 14 | 14 | 0 |
| Thuật ngữ Project/Dự án không nhất quán | 16 | 16 | 0 cho nghĩa “Công trình” |

Số liệu là số chuỗi/lỗi hiển thị sau khi gộp theo ngữ cảnh, không tính enum key, mã nghiệp vụ và keyword nội bộ.

## 4. File đã sửa

| Nhóm | File | Nội dung |
| --- | --- | --- |
| Điều hướng | `src/components/layout/sidebar.tsx` | Chuẩn hóa toàn bộ menu, thương hiệu và nhãn khu vực. |
| Báo cáo | `src/lib/reports/report-transition-service.ts` | Thông báo workflow tiếng Việt có dấu. |
| Báo cáo | `src/app/(dashboard)/reports/actions.ts` | Lỗi xác thực/truy cập và cách gọi “Công trình”. |
| Báo cáo | `src/components/reports/reports-workspace.tsx` | Fallback “Công trình đang chọn”. |
| Báo cáo | `src/components/reports/reports-table.tsx`, `reports-mobile-cards.tsx` | Nhãn tệp lỗi và mã báo cáo rõ nghĩa. |
| Báo cáo | `src/components/reports/create-report-dialog.tsx`, `create-dialog/weekly-report-form.tsx`, `create-dialog/attachments-card.tsx` | Viết đầy đủ khối lượng/báo cáo và alt ảnh. |
| Báo cáo | `src/components/reports/report-print-template.tsx`, `create-dialog/work-picker.tsx` | Nhãn bản in và hướng dẫn theo thuật ngữ chuẩn. |
| Vật tư | `src/lib/materials/materials-access.ts`, `src/app/actions/material-request.ts` | Permission/lỗi không tìm thấy theo ngữ cảnh. |
| Vật tư | `src/components/material-request/material-request-list.tsx`, `material-request-detail.tsx` | Toast và thuật ngữ Công trình. |
| Vật tư | `src/components/materials/materials-transactions.tsx`, `purchase-request-placeholder.tsx` | Toast và UI không còn “workflow”. |
| Tài liệu | `src/app/(dashboard)/documents/actions.ts`, `src/app/(dashboard)/documents/page.tsx` | Permission và empty state. |
| Tài liệu | `src/app/api/documents/load-more/route.ts`, `src/lib/documents/upload-request.ts`, `src/lib/document-rules.ts` | API/upload và nhãn chứng từ thanh toán/quyết toán. |
| Tài liệu | `src/components/documents/document-manager.tsx`, `document-workspace.tsx` | Lỗi tải tệp, fallback người dùng, mô tả thư mục. |
| Khối lượng | `src/app/(dashboard)/projects/[id]/field-progress/actions.ts` | Lỗi trả về từ server action. |
| Khối lượng | `src/lib/field-progress/field-progress-permissions.ts`, `volume-balance.ts` | Permission/lỗi hạng mục. |
| Khối lượng | `src/components/field-progress/master-table.tsx`, `daily-entry-table.tsx` | Viết đầy đủ “Khối lượng”. |
| API | `src/app/api/reports/[reportId]/history/route.ts`, `src/app/api/reports/attachments/[attachmentId]/route.ts`, `src/app/api/cron/documents-trash-cleanup/route.ts` | Response tiếng Việt; giữ nguyên status code. |
| Cài đặt | `src/app/(dashboard)/settings/actions.ts`, `src/components/settings/settings-workspace.tsx`, `src/lib/settings/settings-registry.ts` | Lỗi quyền và thuật ngữ hệ thống. |
| Chung | `src/lib/rbac.ts`, `src/lib/navigation-permissions.ts`, `src/lib/date/work-date.ts`, `src/lib/reports/report-timezone.ts` | Permission, điều hướng, validation ngày. |
| Chung | `src/lib/dashboard/dashboard-queries.ts`, `components/dashboard/executive/executive-kpi-grid.tsx`, `executive-finance-panel.tsx`, `executive-project-progress.tsx` | Tải lên/Công trình/mã công trình. |
| Chung | `src/components/projects/project-list-client.tsx`, `project-form.tsx`, `src/app/(dashboard)/projects/[id]/page.tsx`, `src/app/(dashboard)/accounting/page.tsx` | Chủ đầu tư và thuật ngữ Công trình. |
| Phê duyệt | `src/app/(dashboard)/approvals/components/approval-center-client.tsx` | Viết đầy đủ “phiếu vật tư” và “công trình”. |
| Test | `src/lib/document-file-utils.test.ts` | Dữ liệu tên tệp tiếng Việt có dấu; assertion tương ứng. |
| Tài liệu QA | `docs/qa/VIETNAMESE_TERMINOLOGY_GLOSSARY.md`, `VIETNAMESE_LANGUAGE_AUDIT_PRE_FIX.md` | Từ điển chuẩn và baseline audit. |

## 5. Ví dụ trước và sau

| File | Trước | Sau |
| --- | --- | --- |
| `src/components/layout/sidebar.tsx` | `Cong trinh` | `Công trình` |
| `src/lib/reports/report-transition-service.ts` | `Khong co quyen duyet bao cao` | `Bạn không có quyền phê duyệt báo cáo này.` |
| `src/app/api/reports/[reportId]/history/route.ts` | `Unauthorized` | `Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.` |
| `src/components/reports/create-report-dialog.tsx` | `Tổng KL nhập` | `Tổng khối lượng nhập` |
| `src/components/projects/project-list-client.tsx` | `CĐT` | `Chủ đầu tư` |

## 6. Từ điển chuẩn

Từ điển chi tiết: `docs/qa/VIETNAMESE_TERMINOLOGY_GLOSSARY.md`.

Các thuật ngữ thống nhất gồm: Công trình, Vật tư, Phiếu đề xuất vật tư, Báo cáo ngày, Báo cáo tuần, Phê duyệt, Từ chối, Đề nghị thanh toán, Nhà cung cấp, Khối lượng, Chủ đầu tư và Chỉ huy trưởng.

## 7. Nội dung cố ý giữ nguyên

- Prisma model, enum key (`APPROVED`, `SUBMITTED`, …), database field, API path, route, permission key và query parameter là hợp đồng kỹ thuật.
- Mã phiếu/mã công trình (`VT-*`, `TT-*`, `CT-*`, `NCC-*`) và ví dụ mã là định danh nghiệp vụ, không phải label đứng độc lập.
- Keyword không dấu tại `src/lib/documents/permissions.ts` là đầu vào cho hàm normalize tên thư mục để kiểm soát phân quyền; đổi chúng sẽ làm sai so khớp.
- PDF, API, URL, UUID và các MIME type giữ nguyên vì là thuật ngữ kỹ thuật chuẩn.
- “Quản lý dự án” được giữ khi là chức danh nghề nghiệp `PROJECT_MANAGER`, không phải tên khái niệm Công trình.

## 8. Nội dung chưa thể tự động xác định

| Chuỗi/ngữ cảnh | File | Lý do và đề xuất |
| --- | --- | --- |
| Báo cáo/tài liệu lịch sử có ví dụ cũ | `docs/qa/archive/**` | Là bằng chứng QA lịch sử, không phải runtime; chỉ chỉnh khi có yêu cầu cập nhật tài liệu lịch sử. |
| Script maintenance chứa mapping không dấu → có dấu | `scripts/maintenance/update-hanoi-vietnamese-diacritics.ts` | Là dữ liệu đối chiếu cho migration một lần; không chạy hay đổi database trong task này. |
| Viết tắt trong mã định danh | Server actions và form mã | Được giữ để tránh ảnh hưởng dữ liệu/mã đã phát hành. |

## 9. Kết quả kiểm thử

| Kiểm tra | Kết quả | Ghi chú |
| --- | --- | --- |
| `npx prisma validate` | PASS | Schema hợp lệ. |
| `npx prisma generate` | PASS | Prisma Client 7.8.0 được tạo. |
| `npx tsc --noEmit` | PASS | Không có output lỗi. |
| `npm run build` | PASS có cảnh báo | Build Next.js 16.2.7 hoàn tất; còn một cảnh báo tracing có sẵn từ `next.config.ts`/storage provider. |
| `npx tsx --test src/lib/document-file-utils.test.ts` | PASS | 6/6 test pass. |
| `npm run lint` | FAIL ngoài phạm vi | 33 lỗi từ `scratch/*.js` và `patch.js`; không phát sinh ở file được sửa. |
| `npx playwright test --list` | PASS | Phát hiện 6 test Documents. |
| Playwright chức năng | Chưa chạy | Test tạo/xóa project, user và 1.000 document QA; không chạy để bảo toàn dữ liệu hiện hữu. |

## 10. Rủi ro còn lại

- Chưa có bằng chứng UI browser trực tiếp cho các màn hình vì Playwright hiện hữu có mutation database.
- Chưa gửi email hoặc xuất thử PDF/Excel trực tiếp; phần literal đã quét và bản build pass.
- Lint toàn repository vẫn thất bại do script scratch/patch có trước, không liên quan đến thay đổi ngôn ngữ.
