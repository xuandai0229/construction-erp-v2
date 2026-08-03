# Import công trình thật và chỉ huy trưởng

## A. Nguồn dữ liệu

- Spreadsheet ID: `1RQMU9no_Q52i5Nt6HyVr7YUNbPLsd37PlhUgBjrRwyM`
- Spreadsheet: `CÁC CT CÁC BAN`
- Sheet: `2HN và PTN (3)`
- Source type: `approved-xlsx`
- File: `CÁC CT CÁC BAN.xlsx`
- SHA-256: `62eaea7de404a62a131e9992444b36a23cf9e3707afaf0a1464d5c65630d6c51`
- Rows scanned: `91`
- Valid projects: `21`
- Unique commanders: `11`
- Assignments: `18`
- Source verified: `PASS` — XLSX supplied and explicitly approved with `--approve-source`.

## B. Kết quả import

| Lần chạy | CREATE | UPDATE | UNCHANGED | CONFLICT | SKIP_INVALID |
|---|---:|---:|---:|---:|---:|
| Dry-run trước apply | 21 | 0 | 0 | 0 | 0 |
| Apply | 21 | 0 | 0 | 0 | 0 |
| Dry-run sau apply | 0 | 0 | 21 | 0 | 0 |

Mỗi project có `externalSourceKey` ổn định từ spreadsheet, sheet, tên chuẩn hóa, địa chỉ, ban quản lý và đơn vị thực hiện. Hai gói Đại Mỗ được giữ thành hai project riêng, cùng gán cho Phạm Anh Tuấn.

## C. Tài khoản và phân công

- 11 tài khoản `CHIEF_COMMANDER` đã được tạo hoặc đối chiếu.
- 18 `ProjectMember` đã được tạo/đối chiếu, không trùng.
- Mật khẩu khởi tạo tài khoản mới: `123456`; lưu bằng bcrypt, không ghi hash vào báo cáo.
- Không có trường `mustChangePassword` trong schema hiện tại; đây là rủi ro cần migration riêng nếu muốn bắt đổi mật khẩu lần đầu.
- Không tự động tạo tài khoản cho cán bộ ban, kỹ thuật hoặc bảo vệ.

Các kiểm tra số lượng:

- Đoàn Văn Giang: 3 công trình.
- Trần Quốc Dũng: 2 công trình.
- Phạm Anh Tuấn: 4 công trình.
- Vũ Hưng: 2 công trình.
- Project nguồn: 21; user: 11; membership: 18; duplicate code/key: 0.

## D. Backup và manifest

- Manifest: `docs/import/real-projects-import-manifest.json`
- Backup trước apply: `docs/import/backups/real-projects-*.json`
- Apply bị khóa nếu SHA-256 nguồn khác manifest hoặc không có admin active hợp lệ.

## E. Kiểm thử

| Kiểm thử | Kết quả | Bằng chứng |
|---|---|---|
| Prisma generate | PASS | Command completed |
| TypeScript | PASS | `npx tsc --noEmit` |
| Build | PASS | `npm run build` |
| Apply transaction | PASS | `applied: true`, source hash khớp |
| Idempotency | PASS | Lần 2: CREATE 0, UPDATE 0, UNCHANGED 21, CONFLICT 0 |
| Bcrypt hash | PASS | 11/11 tài khoản có hash bcrypt |
| Login `lemanhhung` | PASS | HTTP 200, redirect `/projects` |
| Login `doanvangiang` | PASS | HTTP 200, redirect `/projects` |
| Login `phamanhtuan` | PASS | HTTP 200, redirect `/projects` |
| Login `vuhung` | PASS | HTTP 200, redirect `/projects` |
| `/projects` sau login | PASS | HTTP 200 cho cả 4 tài khoản |
| Backend RBAC API trái phạm vi | BLOCKED | Chưa có test endpoint đại diện được chỉ định trong phiên này |
| Dashboard/module không rò dữ liệu | BLOCKED | Chưa hoàn tất kiểm thử UI/API theo từng module |

## F. Kết luận

`DATA APPLIED / RUNTIME PARTIAL — RBAC AND CROSS-PROJECT RUNTIME UNVERIFIED`

Dữ liệu đã được apply an toàn và đạt idempotency. Chưa kết luận `PASS` vì chưa có bằng chứng đầy đủ cho RBAC backend trái phạm vi và toàn bộ dashboard/module runtime.
