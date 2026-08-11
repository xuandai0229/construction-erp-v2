# QA RUNTIME BASELINE INVENTORY

Ngày: 2026-08-11. Đây là baseline Phase A trước khi đánh giá recovery.

## Git baseline

- Repository: `D:\construction-erp-v2`
- Branch/HEAD: ghi trong final recovery report; source/schema/migration dirty state đã tồn tại trước Phase A.
- Pre-existing tracked modifications: 17 files, gồm `src/**` và `prisma/**`.
- Pre-existing untracked artifacts: các report/material-proposal artifacts và migration/source artifacts đã tồn tại từ trước.
- Phase A không reset/clean/checkout/restore hàng loạt.

## Runtime process baseline

Ban đầu không có server usable ở port 3000/3001. Sau đó đã khởi động đúng repository bằng `npm run dev`, Next.js 16.2.7, CWD `D:\construction-erp-v2`, phục vụ `http://127.0.0.1:3000`.

Process chain đã quan sát: `cmd.exe /c npm run dev` → Next CLI → `D:\construction-erp-v2\node_modules\next\dist\bin\next`. Không test server CWD khác.

## Environment inventory

| File | Key presence | Kết luận |
|---|---|---|
| `.env.local` | `DATABASE_URL`, `QA_DATABASE_URL`, `AUTH_SECRET`, seed password keys | local/dev + schema-aligned QA DB available |
| `.env.hr-qa.local` | `DATABASE_URL`, `QA_DATABASE_URL`, QA admin keys | HR-QA DB reachable nhưng schema drift |
| `.env.e2e.local` | QA/primary DB and E2E keys | authentication failure `28P01` |

Không ghi secret value vào report.

## Database baseline

- PostgreSQL `127.0.0.1:5432`: reachable.
- `construction_erp_v2_dev`: reachable, 72 public tables, `ProjectMember.canApproveMaterialProposalTechnical` present.
- `construction_erp_v2_qa`: reachable, 72 public tables, required column present; dùng làm active authenticated runtime Phase A.
- `construction_erp_v2_hr_qa`: reachable, 72 public tables, required column missing; không dùng cho active runtime.
- `.env.e2e.local` credentials: PostgreSQL `28P01 password authentication failed`.

## Known side effects and safety

`scripts/qa/bootstrap-ui-ux-qa.ts` được chạy theo cơ chế supported. Trên HR-QA DB, script đã upsert admin/project trước khi dừng ở schema drift (`P2022`, thiếu column). Không migration/reset/db push được thực hiện. Trên schema-aligned QA DB, safety guard từ chối mutation vì DB role elevated; không seed mutation tại DB đó. Generated credential artifact được xóa sau kiểm tra vì chứa plaintext test secret.

