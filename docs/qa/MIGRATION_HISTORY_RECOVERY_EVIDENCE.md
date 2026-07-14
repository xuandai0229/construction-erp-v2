# Bằng chứng khôi phục migration history

Ngày kiểm tra: 2026-07-14. Phạm vi chỉ gồm đọc Git và đọc ledger `_prisma_migrations`; không chạy `db push`, `migrate reset`, `migrate deploy`, SQL mutation, `migrate resolve`, reset, clean, stash hay chỉnh sửa `schema.prisma`.

## Bảo vệ worktree

Đã chạy trước khi phục hồi: `git status --short`, `git branch --show-current`, `git log -1 --oneline`, `git diff --stat`.

- Branch đang dùng: `main`; HEAD: `08828aa don_pate35`.
- Worktree đã có thay đổi thuộc công việc khác, đặc biệt ở Documents và scripts. Không checkout, reset, clean, stash, xóa migration directory hay sửa các file đó.

## Migration thiếu và ledger

Mỗi thư mục ban đầu không chứa `migration.sql` hay file khác. Ba file có đánh dấu “đã phục hồi” dưới đây hiện chỉ chứa đúng artifact đã chứng minh từ Git object; không có file phụ trong từng thư mục.

| Migration / đường dẫn đầy đủ | `migration.sql` hiện tại | Development ledger | QA ledger |
|---|---|---|---|
| `prisma/migrations/20260713153000_phase1_structure_wbs_lbs` | Có, đã phục hồi | finished `2026-07-13T08:09:24.380Z`; rollback `null`; steps `1`; SHA-256 `4b661e308a30c0b4dff8313444e6dc8b1535666db5da8907f3d29c58aee3d254`; logs `null` | finished `2026-07-13T07:48:13.254Z`; rollback `null`; steps `1`; cùng checksum; logs `null` |
| `prisma/migrations/20260713154208_phase2_schema` | Không; chưa tìm thấy source gốc | Không có row | Có 3 row: (1) rollback `2026-07-13T08:43:52.988Z`, steps `0`, checksum `409726497bda24a3f425b40ed7d098b37e288a6020f3e94dec139f9cc6a516a5`, log `string contains embedded null`; (2) rollback `2026-07-13T08:44:17.923Z`, steps `0`, checksum `435bc98663a5565106641764b98aafc990f46ae3d4ecf558a9c742b82ca80885`, log PostgreSQL `42601`, BOM at first character; (3) finished `2026-07-13T08:44:25.375Z`, rollback `null`, steps `1`, checksum `734950976b78fa8325465c158283b58e1759b4b0bb4a903e9593842a15ae5c42`, logs `null` |
| `prisma/migrations/20260713155300_phase3_quality_safety_schema` | Không; chưa tìm thấy source gốc | Không có row | finished `2026-07-13T08:54:52.915Z`; rollback `null`; steps `1`; checksum `657b5760f7dfd7b331637acb1fe06ce69ab6a5836108314fffeb7c05cc894c78`; logs `null` |
| `prisma/migrations/20260713160000_phase1_index_name_correction` | Có, đã phục hồi | finished `2026-07-13T08:09:24.381Z`; rollback `null`; steps `1`; SHA-256 `7eccf2855a820d900dac4c64b22085a0be4fc83cc63e36516d5ea77e6e4dc314`; logs `null` | finished `2026-07-13T08:07:02.988Z`; rollback `null`; steps `1`; cùng checksum; logs `null` |
| `prisma/migrations/20260713170000_phase1_optional_wbs_lbs_context` | Có, đã phục hồi | finished `2026-07-13T08:34:14.025Z`; rollback `null`; steps `1`; SHA-256 `0f83cbb1781b35ce93487d4b0806c2d66cbe59d6ab0414c721ef0ca7fa5431c5`; logs `null` | finished `2026-07-13T08:34:01.151Z`; rollback `null`; steps `1`; cùng checksum; logs `null` |
| `prisma/migrations/20260713173000_remove_redundant_structure_module` | Không; chưa tìm thấy source gốc | Không có row | finished `2026-07-13T10:12:27.368Z`; rollback `null`; steps `0`; checksum `f638ad1effaab7a24b7e1f440e10561f7024b5aff56ed03db1fbea3ed8d4deae`; logs rỗng |

Truy vấn ledger đã dùng `pg` với `SELECT migration_name, finished_at, rolled_back_at, applied_steps_count, checksum, logs FROM "_prisma_migrations" ...`; URL, password và secret không được in.

## Truy tìm source of truth

Đã chạy các lệnh read-only: `git log --all --name-status -- prisma/migrations`, `git log --all --full-history -- prisma/migrations/<migration-name>`, `git rev-list --all --objects`, `git reflog`, `git stash list`, `git fsck --no-reflogs --unreachable`, và `git cat-file -p <blob>`.

- Local branch: `main`; remote-tracking branch: `origin/main`; không có tag. Stash chỉ có `stash@{0}: Dashboard diffs`, không chứa artifact migration cần tìm.
- Không có commit reachable nào chứa sáu `migration.sql` này.
- Các Git blob unreachable sau là source of truth cho đúng ba file đã phục hồi:
  - `a691fd65149f7aad14a89a9d819194e8376214f4` → `20260713153000_phase1_structure_wbs_lbs/migration.sql`
  - `d3dafc486aafa3ac5c7cea4b482dc4bc454e6c9e` → `20260713160000_phase1_index_name_correction/migration.sql`
  - `d71e85fdfa754f240beeccbed278834d582c55c0` → `20260713170000_phase1_optional_wbs_lbs_context/migration.sql`
- Nội dung ba blob là SQL PostgreSQL hoàn chỉnh, không chứa secret. SHA-256 được tính lại từ file khôi phục khớp chính xác ledger ở cả Development/QA: `4b661…3254`, `7ecc…c314`, `0f83…31c5` tương ứng.
- Đã quét 1.551/1.754 unreachable blob nhỏ hơn 100 KB bằng `git cat-file --batch` và SHA-256 cho ba checksum đích còn lại. Không có checksum nào khớp Phase 2 (`734950…5c42`), Phase 3 (`657b57…94c78`) hay Remove Structure (`f638ad…4deae`). Không có archive/backup/CI artifact/deployment package/source copy có thể đọc an toàn trong repository hoặc cấu hình CI hiện có chứa ba file đó.

Vì vậy, không có cơ sở để coi SQL suy ra từ schema/database là migration gốc. Ba file còn thiếu không được tạo lại.

## Kiểm tra sau phục hồi

| Lệnh thực tế | Kết quả |
|---|---|
| `npx prisma validate` | PASS (exit 0) |
| `npx prisma generate` | PASS (exit 0), Prisma Client 7.8.0 được sinh cục bộ |
| `npx tsx scripts/qa-safety-guard.ts` | PASS; QA fingerprint là PostgreSQL `127.0.0.1:5432/construction_erp_v2_qa` |
| Prisma `migrate status` với `DATABASE_URL` được truyền từ `QA_DATABASE_URL` | BLOCKED, exit 1/P3015: không tìm thấy `migration.sql`. Không chạy deploy. |

## Bổ sung điều tra sâu (2026-07-14)

Script read-only `npx tsx scripts/qa/find-migration-blobs-by-checksum.ts` đã quét toàn bộ Git object database, không giới hạn kích thước: 4.306/4.306 blob, 0 lỗi đọc, 523.080.689 byte. Không có object nào khớp checksum thành công của Phase 2, Phase 3 hoặc Remove Structure. `git ls-remote` xác minh remote server chỉ có branch `main`, không có tag; `git fetch --all --prune --tags` không làm xuất hiện source artifact. Timeline ledger, local-history và mounted-copy evidence được ghi ở `WORK_MANAGEMENT_MIGRATION_DEEP_INVESTIGATION.md`.

## Điều cần làm cho ba artifact còn thiếu

Không tự thực hiện phương án nào dưới đây.

1. **Khôi phục source artifact (ưu tiên):** lấy đúng file từ repository gốc, máy người tạo migration, CI artifact, deployment package, backup source hoặc commit chưa push; sau đó đối chiếu checksum ledger trước khi đưa về worktree.
2. **Baseline mới trên môi trường hoàn toàn mới:** chỉ sau phê duyệt, có QA/clone mới và backup; thực hiện census table/column/enum/index/FK/unique/check/view/function/trigger/extension, SQL baseline được review, có cutover và rollback. Không sửa migration đã apply trong Development/QA/Production hiện hữu.
