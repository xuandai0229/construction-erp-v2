# FULL SYSTEM AUDIT REPORT

## 1. Phạm vi kiểm tra
- **Thời gian kiểm tra**: 2026-06-24
- **Repository/Path**: `d:\construction-erp-v2`
- **Tổng số file đã quét**: ~509 files (trong đó `src/` có 110 files)
- **Các nhóm file đã kiểm tra**:
  - Toàn bộ `src/app`, `src/components`, `src/lib`, `src/types`.
  - `prisma/schema.prisma` và các file cấu hình.
  - Các module chính: Field Progress (Master, Daily, Summary), Documents, Reports, Users.

## 2. Lệnh đã chạy
| Lệnh | Kết quả | Ghi chú |
|---|---|---|
| `git status --short` | **PASS** | Hoạt động bình thường. |
| `git ls-files` | **PASS** | Đã trích xuất danh sách file. |
| `npx prisma validate` | **PASS** | Schema Prisma hợp lệ. |
| `npx prisma generate` | **PASS** | Đã tạo Prisma Client thành công. |
| `npx tsc --noEmit` | **PASS** | Không có lỗi TypeScript nghiêm trọng cản trở build. |
| `npm run build` | **PASS** | Build Next.js thành công trong 20.8s. |

## 3. Bản đồ hệ thống
- **Routes chính**: `/projects`, `/projects/[id]/field-progress`, `/documents`, `/reports`, `/materials`, `/users`, `/login`.
- **Components chính**: Tách biệt Desktop và Mobile views (`master-table.tsx`, `daily-entry-table.tsx`, `summary-desktop-view.tsx`, `summary-mobile-view.tsx`).
- **Server Actions/API**: `projects/actions.ts`, `field-progress/daily/actions.ts`, `reports/actions.ts`, `users/actions.ts`, `/api/documents/upload`, `/api/reports/.../attachments`.
- **Prisma Models**: 22 models (User, Project, WBSItem, SiteReport, Document, FieldProgressItem, v.v.).
- **Scripts**: Rất nhiều file `scripts/qa-*` và `scripts/test-*` dùng để UAT, DB verify, và seeding.
- **Config**: `next.config.ts`, `prisma.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`.

## 4. Kết quả tổng quan
| Nhóm | Trạng thái | Số lỗi | Ghi chú |
|---|---|---:|---|
| **Architecture / Build** | 🟢 Tốt | 0 | Build thành công, cấu trúc Next.js App Router chuẩn. |
| **Database / Prisma** | 🟢 Tốt | 0 | Schema được thiết kế tốt, có relation/onDelete Cascade rõ ràng. |
| **Field Progress (3 màn)** | 🟢 Tốt | 0 | Các lỗi UX trước đây (như auto-focus, nhập trùng) đã được fix triệt để. |
| **Security / Auth** | 🟡 Khá | 1 | RBAC ở Reports chưa hoàn thiện 100%. |
| **UI/UX Mobile** | 🟢 Tốt | 0 | Chia component độc lập cho Mobile/Desktop, tối ưu không gian tốt. |
| **Code Quality** | 🟡 Khá | 2 | Còn sót 13 `eslint-disable`, 6 `TODO`, một số biến `any`. |

## 5. Lỗi CRITICAL
*(Không phát hiện lỗi CRITICAL. Hệ thống Build thành công, luồng dữ liệu chính hoạt động tốt, không có lỗ hổng phá hủy database trực tiếp.)*

## 6. Lỗi HIGH
- **Mã lỗi**: SEC-RBAC-REPORTS
- **Mô tả**: Thiếu kiểm tra Project-level RBAC trong Reports.
- **File liên quan**: 
  - `src/app/(dashboard)/reports/actions.ts` (Dòng 19, 31)
  - `src/app/api/reports/attachments/[attachmentId]/route.ts` (Dòng 44)
  - `src/app/api/reports/[reportId]/attachments/route.ts` (Dòng 84)
- **Nguyên nhân**: Đang để lại comment `TODO: Implement ProjectUser RBAC`. Non-admin hiện có thể thấy hoặc tương tác với report không thuộc dự án nếu biết URL/ID.
- **Ảnh hưởng**: Vấn đề bảo mật phân quyền ngang (Horizontal Privilege Escalation).
- **Cách tái hiện**: Đăng nhập user thuộc Project A, gọi API hoặc Action lấy Report của Project B.
- **Hướng fix đề xuất**: Cập nhật các hàm này để gọi `requireProjectAccess(projectId)` tương tự như bên `field-progress`.
- **Có nên fix ngay không**: **CÓ** (Phải làm trước khi lên Production thật).

## 7. Lỗi MEDIUM
- **Mã lỗi**: CQ-ESLINT-TODO
- **Mô tả**: Lạm dụng `eslint-disable` và các kiểu `any` chưa được làm rõ.
- **File liên quan**: Rải rác trong `src/components/reports/create-report-dialog.tsx`, `src/app/(dashboard)/reports/actions.ts`, và `src/components/reports/types.ts`.
- **Nguyên nhân**: Code chạy nhanh để pass CI/CD.
- **Ảnh hưởng**: Giảm maintainability, rủi ro runtime crash nếu dữ liệu không đúng định dạng.
- **Hướng fix đề xuất**: Định nghĩa Prisma types rõ ràng (thay vì `any`), xóa bỏ các `eslint-disable-next-line react-hooks/exhaustive-deps` hoặc fix dependencies.

## 8. Lỗi LOW
- **Mã lỗi**: CODE-CLEANUP
- **Mô tả**: Dư thừa quá nhiều script test/QA trên production repository.
- **File liên quan**: Thư mục `scripts/`.
- **Nguyên nhân**: Đã tạo nhiều script trong quá trình audit/UAT.
- **Ảnh hưởng**: Làm rối source code, không ảnh hưởng production.

## 9. File nghi ngờ thừa/chết/duplicate
| File | Lý do nghi ngờ | Có import ở đâu không | Đề xuất |
|---|---|---|---|
| `docs/qa/archive/*` | File backup cũ | Không | Chuyển ra ngoài repo hoặc đưa vào `.gitignore`. |
| `scripts/test-fake.pdf`, `test.mjs`, `test-output.html` | File sinh ra lúc test | Không | Nên dọn dẹp hoặc cho vào `.gitignore`. |

## 10. Rủi ro dữ liệu/database
- Dữ liệu `quantity` dùng Decimal xử lý tốt.
- `evaluateVolumeGuard` ngăn chặn nhập quá thiết kế an toàn.
- Upload file lưu vào ổ cứng thư mục `storage/site-reports/` và `storage/documents/`. Các API kiểm tra dung lượng và Magic Byte rất chặt chẽ, an toàn.

## 11. Rủi ro UI/UX mobile
- Không phát hiện rủi ro vỡ layout lớn.
- Các màn hình phức tạp như `Summary` và `Master` đã được chia file `mobile-view` và `desktop-view` riêng. Điều này giúp tránh vỡ bảng trên điện thoại.
- UX nhập số có xử lý dấu phẩy của VN (`parseVietnameseDecimalInput`).

## 12. Rủi ro bảo mật/phân quyền
- API Documents và Auth bảo mật tốt.
- Cần fix lỗi HIGH liên quan đến **Project RBAC** ở module Reports như đã đề cập. Double submit prevention đã được tích hợp qua `operationRef.current`.

## 13. Rủi ro build/production
- Lệnh `npm run build` PASS, chứng tỏ Next.js caching và static generation không bị lỗi.
- Đã chạy `tsc --noEmit` PASS, đảm bảo an toàn biên dịch.
- Chưa thấy cấu hình PWA (manifest, service worker) để chạy offline-first tốt ngoài công trường, cần bổ sung nếu user yêu cầu.

## 14. Checklist 3 màn Field Progress
| Tiêu chí | Master | Daily | Summary | Kết quả |
|---|---|---|---|---|
| **Hiển thị đúng Group/Work** | PASS | PASS | PASS | Hiển thị phân cấp đúng, Mobile chia Card. |
| **Logic nhập số liệu/vượt thiết kế**| N/A | PASS | PASS | Có `evaluateVolumeGuard` + audit trail. |
| **Thao tác nhanh/Focus mất** | N/A | PASS | N/A | Đã tắt auto-focus gây lỗi UX (Comment trong code). |
| **Lưu/Cập nhật đồng bộ** | PASS | PASS | PASS | Batch update dùng transaction. |
| **Hiển thị Responsive** | PASS | PASS | PASS | Có `mobile-view` tách biệt. |

## 15. Đề xuất thứ tự fix
1. **Fix ngay trước build/deploy**:
   - Thêm `requireProjectAccess` hoặc logic RBAC tương đương vào các TODO trong `reports/actions.ts` và API liên quan.
2. **Fix sau nhưng không được quên**:
   - Dọn dẹp thư mục `scripts/` và xóa các file rác như `test.mjs`, `test-output.html`.
3. **Roadmap**:
   - Chuẩn hóa lại các biến `any` thành Prisma Types.
   - Thêm tính năng PWA / Offline Mode cho điện thoại ngoài công trường.

## 16. Kết luận Go/No-Go
**Kết luận: GO (Sẵn sàng UAT cuối cùng và Triển khai)**
- **Có thể build app cho người dùng công trường chưa?**: CÓ. Hệ thống cốt lõi và các tính năng nhập liệu (Field Progress) đã được làm rất kỹ lưỡng và an toàn (Transaction, Magic Bytes, Validation).
- **Điểm bắt buộc phải xử lý**: Implement nốt Project RBAC cho màn Reports.
- **Lưu ý khi triển khai**: Đảm bảo thư mục `storage/` có quyền ghi trên server production và cần setup backup định kỳ cho thư mục này.
