# RUNTIME PRISMA REPORTS FIX REPORT

## 1. Lỗi ban đầu
- **URL lỗi:** `http://localhost:3000` (khi load dashboard/reports)
- **File lỗi:** `src/app/(dashboard)/reports/actions.ts`
- **Dòng lỗi:** 107
- **Message lỗi:** `PrismaClientValidationError` - Invalid prisma.siteReport.findMany() invocation
- **Nguyên nhân thật:** Query Prisma cho `siteReport.findMany` nhận biến `where` được parse trực tiếp từ tham số `filters`. Khi client hoặc quá trình chuyển trang mang theo filter có giá trị mặc định cho toàn bộ danh sách (ví dụ: `type: "ALL"` hoặc `status: "ALL"`), các giá trị này bị truyền thẳng vào cấu trúc Enum của Prisma (`SiteReportType` và `SiteReportStatus`). Do không khớp Enum, Prisma lập tức bắn lỗi Runtime ValidationError.

## 2. Phạm vi đã kiểm tra
- **Các file đã đọc:** 
  - `src/app/(dashboard)/reports/actions.ts`
  - `src/app/(dashboard)/reports/page.tsx`
  - `src/components/reports/reports-workspace.tsx`
  - `src/app/(dashboard)/dashboard/page.tsx`
  - `prisma/schema.prisma`
- **Các query Prisma đã kiểm tra:** `prisma.siteReport.findMany`, cũng như dùng regex quét các file khác để tìm dạng lỗi tương tự.
- **Các route đã smoke test:** `/`, `/dashboard`, `/reports`.

## 3. Các thay đổi đã thực hiện
| File | Thay đổi | Lý do | Có đổi logic không |
| --- | --- | --- | --- |
| `src/app/(dashboard)/reports/actions.ts` | Thêm type guard cho `filters.type` và `filters.status` trước khi gán vào mảng `where`. Chỉ cho phép các value nằm trong Enum của Prisma (`DAILY`, `WEEKLY`, `DRAFT`, `SUBMITTED`, v.v.). Bỏ qua nếu là `'ALL'`. | Ngăn chặn truyền "rác" hoặc chuỗi không hợp lệ vào query enum của Prisma, gây lỗi crash trang. | Không (chỉ bảo vệ query DB) |

## 4. Kết quả test
| Lệnh | Kết quả |
| --- | --- |
| `npx prisma validate` | PASS |
| `npx prisma generate` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS |
| Browser smoke `/` | PASS |
| Browser smoke `/reports` | PASS |

## 5. Rủi ro còn lại
- Không có rủi ro nghiêm trọng. 
- Mọi logic filter "ALL" đều được Frontend (`reports-workspace.tsx`) tự động xử lý nội bộ in-memory và không làm ảnh hưởng tới server actions nhờ vào guard mới thêm.
- Hiện không phát hiện thêm query nào có chung mô hình filter string thẳng vào Enum mà không qua Zod/guard ở các module khác, nhưng nên thiết lập quy chuẩn Zod trong dài hạn.

## 6. Kết luận
- **PASS** vì đã xử lý triệt để lỗi runtime, các lệnh kiểm tra và build đều vượt qua thành công mà không chạm đến dữ liệu DB hay phá vỡ logic cũ.

## 7. Final Verification Lock

### Git status sau cleanup
- File thay đổi thực tế: `src/app/(dashboard)/reports/actions.ts` và `docs/qa/RUNTIME_PRISMA_REPORTS_FIX_REPORT.md`
- Đã dọn dẹp sạch toàn bộ file rác sinh ra trong quá trình debug.

### Diff thực tế
- Thay đổi duy nhất là thêm strict enum guard cho `where.type` và `where.status` tại function `getSiteReports`. Mọi thay đổi hoàn toàn nằm trong mục đích an toàn dữ liệu, giữ nguyên logic lấy data gốc. Không thay đổi DB schema, UI/UX hay luồng chạy.

### Browser smoke thực tế
| Route | Kết quả | Ghi chú |
| --- | --- | --- |
| `/` | PASS | Chạy redirect về `/dashboard` trơn tru |
| `/dashboard` | PASS | Load ổn định, không lỗi |
| `/reports` | PASS | Hiển thị tốt, không còn lỗi PrismaClientValidationError |

### Filter safety test
| Input filter | Kết quả |
| --- | --- |
| `{}` | PASS |
| `{ type: "ALL" }` | PASS |
| `{ status: "ALL" }` | PASS |
| `{ type: "INVALID" }` | PASS |
| `{ status: "INVALID" }` | PASS |

*(Note: Validation guard hoạt động hoàn hảo, Prisma query an toàn).*

### File rác đã xử lý
- **Có**
- **Danh sách:** `error.txt`, `out.txt`, `scripts/test-query.ts`, `test-findmany.ts`, `test-findmany2.ts`, `test-filters.ts`
