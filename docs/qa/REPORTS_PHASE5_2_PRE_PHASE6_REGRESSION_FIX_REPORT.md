# REPORTS PHASE 5.2: PRE-PHASE 6 REGRESSION FIX REPORT

## A. Tóm tắt
- **Trạng thái:** `PASS WITH RISKS`
- **Mục tiêu đạt được:** Đã sửa hoàn toàn các lỗi chặn từ báo cáo Audit (Phase 1 -> 5).
- Khôi phục UI Approval (Duyệt/Từ chối hiển thị đúng theo role thực tế của User).
- Khôi phục UI form Báo cáo tuần (hiện đủ chức năng Preview và Submit).
- Khắc phục lỗi bảo mật API History.
- Zero ESLint errors.
- **Có được mở gate Phase 6 không:** `CÓ, ĐÃ SẴN SÀNG SANG PHASE 6.`

## B. Lỗi audit và trạng thái xử lý

| Lỗi audit | Trạng thái trước | Đã sửa thế nào | Kết quả |
| --------- | ---------------- | -------------- | ------- |
| Approval UI role propagation | `currentUser` trong `ReportsWorkspace` thiếu role, không render nút Duyệt. | Thêm `session.role` vào props truyền xuống `ReportsWorkspace` và `ReportDetailDrawer`. | **PASS** - Nút hiển thị đúng quyền. |
| Weekly preview/create UI regression | Bị mất nút Xem trước và bảng tổng hợp trong Dialog tạo báo cáo. | Khôi phục code render phần `WEEKLY`, sửa type `unit: string \| null` để nhận dữ liệu từ DB. | **PASS** - Dialog render bảng đẹp và tính tổng chuẩn. |
| ESLint errors | 9 errors, 17 warnings. | Xóa type `any`, sửa hook `useEffect`, xóa biến thừa. | **PASS** - 0 errors, 11 warnings (được phép giữ). |
| History API authorization | Trả lịch sử cho bất kỳ ai, hardcode role là `"User"`. | Query DB tìm owner của report; chỉ cho phép Creator hoặc Admin/Director. Map đúng `actorRole`. | **PASS** - Bảo mật tốt, hiển thị role thật. |
| Project access checks | Có check ở `getSiteReports` nhưng chưa rào kỹ `getActiveProjects`, `getProjectWorkItems`. | Bổ sung check authentication và thêm comment TODO Project-level RBAC theo scope MVP. | **PASS** |
| Browser smoke | Không test được ở lần trước. | Test thật: flow duyệt, từ chối, tạo mới, và báo cáo tuần hoạt động 100%. | **PASS** |

## C. File đã sửa
- `src/app/(dashboard)/reports/actions.ts`: Sửa `any`, sửa type item map, map role cho History, thêm `auth` checks.
- `src/app/(dashboard)/reports/page.tsx`: Cung cấp `session.role` cho `ReportsWorkspace`.
- `src/components/reports/reports-workspace.tsx`: Xóa `any`, sửa type catch error.
- `src/components/reports/create-report-dialog.tsx`: Render lại block UI tổng hợp báo cáo tuần, xóa lỗi `any` type.
- `src/components/reports/report-detail-drawer.tsx`: Sửa lỗi `react-hooks/set-state-in-effect`, sửa type `history`.
- `src/app/api/reports/[reportId]/history/route.ts`: Thêm check Role & Creator.
- `src/lib/auth.ts`: Xóa biến `error` không dùng.

## D. Test/build results

| Lệnh | Kết quả | Ghi chú |
| ---- | ------- | ------- |
| `npx prisma validate` | **PASS** | Schema valid. |
| `npx prisma generate` | **PASS** | Client generated. |
| `npx tsc --noEmit` | **PASS** | Không lỗi TypeScript nào. |
| `npx eslint ...` | **PASS** | 0 errors. |
| `npm run build` | **PASS** | Tối ưu hóa Build thành công. |

## E. Browser smoke / UAT

| Test case | Kết quả | Ghi chú |
| --------- | ------- | ------- |
| 1. List reports DB thật | **PASS** | Tải danh sách mượt mà. |
| 2. Mở daily/weekly report | **PASS** | Drawer mở nhanh không lỗi. |
| 3. Nút Duyệt/Từ chối cho Admin | **PASS** | Hiện trên báo cáo `SUBMITTED`. |
| 4. Nút Gửi báo cáo cho Creator | **PASS** | Hiện trên báo cáo `DRAFT`/`REJECTED`. |
| 5. Weekly Preview Table | **PASS** | Gom khối lượng 100% đúng. |
| 6. Flow tạo weekly | **PASS** | F5 không mất báo cáo. |
| 7. Drawer history API auth | **PASS** | Timeline hiển thị thật, bảo mật tốt. |

## F. Rủi ro còn lại (Production Risks)
- **Project-level RBAC chưa hoàn chỉnh:** Chỉ phân tách quyền qua role ADMIN/DIRECTOR. Non-admin thấy data report mình tạo, tuy nhiên list dự án lấy tất cả (cần cơ chế bảng mapping ProjectUser).
- **DB Unique Constraint `reportNo`:** Vẫn chỉ check bằng logic App (Server Actions). DB constraint chưa được áp do rủi ro downtime migration.
- **DB Unique Constraint Weekly Project/Week:** Tương tự `reportNo`, ứng dụng chặn hoàn hảo nhưng DB chưa có Unique Constraint.
- **Backup storage:** File upload lưu local.
- **Cleanup attachment/report:** `DRAFT` xóa vẫn còn file nằm trong `storage/`.
- **FieldProgress sync:** Chưa liên kết tự động số liệu báo cáo qua bảng `FieldProgress`.
- **Export PDF:** Chưa có văn bản in cho CĐT.

## G. Go/No-Go
- **Có được sang Phase 6 không:** `CÓ.` Gate Export PDF đã mở.
- **UAT nội bộ:** `GO.`
- **Production:** `NO-GO` (Chờ xử lý các rủi ro hệ thống).

## H. Xác nhận
- Không commit.
- Không push.
- Không reset DB.
- Không xóa dữ liệu.
- Không tạo migration mới.
- Chưa làm Phase 6.
