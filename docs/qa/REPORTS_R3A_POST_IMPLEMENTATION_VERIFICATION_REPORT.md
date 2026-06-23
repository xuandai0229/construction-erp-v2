# REPORTS_R3A_POST_IMPLEMENTATION_VERIFICATION_REPORT

## A. Executive Summary

- **R3a post verification:** PASS WITH RISKS (Do còn tồn đọng dữ liệu test tự động từ script test chưa được dọn dẹp).
- **Có được sang R1 không:** ĐƯỢC PHÉP. Toàn bộ logic khóa server-side đã chạy ổn định và đạt yêu cầu.
- **Production GO/NO-GO:** NO-GO. Cần thực hiện dọn dẹp dữ liệu test và hoàn thiện các phase R1, R2, R4, R5 trước khi lên môi trường production.

## B. Git status

| File | Tình trạng thay đổi | Mục đích |
| --- | --- | --- |
| `src/app/(dashboard)/documents/actions.ts` | Modified | Áp dụng Document lock logic |
| `src/app/(dashboard)/projects/[id]/field-progress/daily/actions.ts` | Modified | Áp dụng FieldProgress lock logic |
| `src/app/(dashboard)/reports/actions.ts` | Modified | Sử dụng createSiteReportWithAudit |
| `src/app/api/reports/[reportId]/attachments/route.ts` | Modified | Refactor rollback attachment và single transaction |
| `src/lib/reports/report-create-service.ts` | Modified | Implement strict create logic |
| `scripts/audit-r3a-test-data-readonly.ts` | Created | Untracked, script hỗ trợ audit dữ liệu |
| `scripts/test-reports-r3a-server-locks.ts` | Created | Untracked, script unit test R3a |
| `docs/qa/..._REPORT.md` | Created | Các file báo cáo QA |

*(Không phát hiện file log, backup nhầm, hay migration mới sinh ra trái phép).*

## C. R3A test data audit

Kết quả từ việc chạy script `scripts/audit-r3a-test-data-readonly.ts`:

| Nhóm | Số lượng | Có ảnh hưởng UI chính không | Ghi chú |
| --- | ---: | --- | --- |
| **SiteReport** | 19 | CÓ | Gây rác trên danh sách hiển thị chung nếu không lọc |
| **SiteReportLine** | 0 | Không | Dữ liệu test không tạo lines |
| **SiteReportAttachment** | 0 | Không | Dữ liệu test không tạo attachments |
| **AuditLog (theo reportId)** | 33 | Không trực tiếp | Tồn tại log rác liên quan tới các test report |
| **Physical Files** | 0 | Không | Không phát sinh file vật lý |

**Hành động đề xuất:** Cần viết một script chạy dry-run để xóa sạch các record chứa chữ `R3A-` ở phase riêng. Không xóa ngay trong bước audit này.

## D. Lock verification

### 1. Report create/transition
- `createSiteReportWithAudit` đã xóa bỏ lỗi throw mock và hoàn toàn hoạt động tốt.
- `DRAFT` sinh ra `SITE_REPORT_CREATED`.
- `SUBMITTED` sinh ra `SITE_REPORT_CREATED` + `SITE_REPORT_SUBMITTED` và set `submittedAt`.
- Logic approve/reject khóa chặt đúng status, có validate `reject reason` không được bỏ trống. Transaction nguyên tử updateMany chặn race condition.

### 2. Attachment
- Chặn nghiêm ngặt upload ở status `SUBMITTED`, `APPROVED`, `CANCELLED`, `LOCKED`.
- Quá trình upload đã xử lý bằng cơ chế: **Ghi file vật lý -> DB Single Transaction cho tất cả file**. Nếu quá trình lưu database thất bại, không có `AuditLog` thừa nào được sinh ra, các file vật lý ghi thừa cũng được rollback (xóa) ở catch block. Sạch 100%.

### 3. FieldProgress
- `APPROVED` lock chặn thành công việc sửa hay xóa mềm. Code kiểm tra lock (throw error) được thực thi *trước* khi có bất kỳ tác động database nào thay đổi.
- **Hạn chế:** Entry tạo mới vẫn đang bị ép nhảy thẳng sang `APPROVED` do logic của hệ thống cũ. (Giữ nguyên theo quy định).

### 4. Document

| Action | APPROVED bị chặn? | ARCHIVED bị chặn? | SUPERSEDED bị chặn? | Transition hợp lệ? |
| --- | --- | --- | --- | --- |
| **Rename** | Có | Có | Có | N/A |
| **Update Meta** | Có | Có | Có | N/A |
| **Delete** | Có | Có | Có | N/A |
| **Change Status** | Có | Có | Có | Có (Chặn nhảy cóc) |

Trạng thái: **Document lock FULL**.

## E. Test/build results

| Lệnh | Kết quả | Ghi chú |
| --- | --- | --- |
| `npx tsx scripts/test-reports-r3a-server-locks.ts` | **PASS** | 100% tests passed. Sinh ra test data. |
| `npx prisma validate` | **PASS** | Schema valid 🚀 |
| `npx prisma generate` | **PASS** | Generated successfully |
| `npx tsc --noEmit` | **PASS** | Không lỗi type |
| `npx eslint ...` | **PASS** | 0 errors |
| `npm run build` | **PASS** | Build successful |

## F. Risks remaining

Các rủi ro tồn đọng bắt buộc phải giải quyết ở các Phase tiếp theo:
1. **FieldProgress new entry auto APPROVED:** Nhập khối lượng mới auto thành đã duyệt. Cần thiết kế lại workflow.
2. **R1 UX chưa làm:** Giao diện Search & Grouping chưa làm.
3. **R2 weekly source linkage chưa làm:** Báo cáo tuần chưa có link với báo cáo ngày gốc.
4. **R3b edit/delete/withdraw/cancel chưa làm:** UI hỗ trợ sửa/xóa/hủy bỏ báo cáo.
5. **R4 project-level RBAC chưa làm:** Kiểm tra User có thuộc Project cụ thể (ProjectUser).
6. **R5 cleanup storage chưa làm:** Dọn dẹp mismatch file và db.
7. **Dữ liệu test R3A:** Vẫn còn 19 Report và 33 AuditLog cần clean-up.

## G. Kết luận

- **Có nên sang R1 không:** **NÊN SANG R1**. Hệ thống back-end lock đã ổn định, chuẩn bị tốt cho việc tối ưu UX ở R1.
- **Có cần cleanup test data không:** Cần thiết thực hiện một kịch bản cleanup data bằng script dry-run cho các test data có prefix `R3A-`.
- **Có được production không:** **KHÔNG**. Mọi tính năng R1 -> R5 cần hoàn thiện trước khi Go-live.

## H. Xác nhận

- Tuyệt đối **KHÔNG** commit.
- Tuyệt đối **KHÔNG** push.
- Tuyệt đối **KHÔNG** reset DB.
- Tuyệt đối **KHÔNG** cleanup storage.
- Tuyệt đối **KHÔNG** xóa dữ liệu (audit script chạy read-only).
- Tuyệt đối **KHÔNG** tạo migration mới.
