# HR Phase 2 — Bằng chứng kiểm thử

## Quality gate

| Lệnh | Kết quả |
|---|---|
| `npx prisma validate` | PASS — schema hợp lệ |
| `npx prisma migrate status` | PASS — database schema up to date, 23 migrations |
| `npx prisma generate` | PASS — Prisma Client v7.8.0 |
| `npx tsc --noEmit` | PASS |
| `npx vitest run --fileParallelism=false` | PASS — 58 files, 383 tests |
| `npm run build` | PASS — Next.js production build |
| `npx playwright test scripts/qa/hr-phase2-runtime.spec.ts` | PASS — 11 tests |

## Test coverage đã có

- PII encryption/decryption, blind index và masking.
- Atomic employee code và concurrency.
- Employee service, duplicate CCCD, status, organization và project assignment.
- Permission registry, DENY override và validity window.
- Projection BASIC/CONTACT/detail không lộ ciphertext hoặc blind index.
- Runtime route smoke và responsive overflow.

## Chưa chạy trong evidence này

E2E mutation đầy đủ tạo/sửa/archive/link User với fixture riêng chưa được chạy; không đánh dấu đây là bằng chứng PASS. Cần chạy trên database QA cô lập, tạo fixture giả và cleanup sau test.
