# REALISTIC PROJECT SEED EXECUTION VERIFICATION REPORT

## 1. Du lieu da tao thuc te

Bo du lieu QA da duoc seed cho project:

- Project code: `QA-TUHIEP-5F-001`
- Seed script: `scripts/seed-realistic-tu-hiep-project.ts`
- Verify script: `scripts/verify-realistic-tu-hiep-project.ts`
- Rollback script: `scripts/rollback-realistic-tu-hiep-project.ts`
- Storage folder: `storage/qa-realistic-tu-hiep`
- QA users: `qa.*@example.test`

Seed script co `--dry-run` va `--execute`, mac dinh dry-run neu khong truyen `--execute`.
Script khong reset database, khong delete rong, va chi upsert du lieu theo prefix/pham vi QA.

## 2. Count theo model

Ket qua tu `npx tsx scripts/verify-realistic-tu-hiep-project.ts`:

| Nhom | Count |
| --- | ---: |
| Project | 1 |
| Users QA | 7 |
| ProjectMember | 4 |
| FieldProgressTemplate | 1 |
| FieldProgressItem | 34 |
| FieldProgressEntry | 34 |
| SiteReport | 12 |
| SiteReportLine | 62 |
| SiteReportAttachment | 5 |
| DocumentFolder | 10 |
| Document | 12 |
| MaterialRequest | 4 |
| MaterialRequestItem | 7 |
| AuditLog QA scope | 32 |
| Physical files in storage QA | 17 |

## 3. Verify tung nhom

| Nhom verify | Ket qua | Ghi chu |
| --- | --- | --- |
| Project ton tai dung 1 record | PASS | `QA-TUHIEP-5F-001`, status `ACTIVE`. |
| Users | PASS | Co dung 7 user QA, email dung `qa.*@example.test`. |
| Password | PASS | Tat ca password la bcrypt hash, khong luu plaintext; bcrypt compare voi password test thanh cong. |
| Project members | PASS | Co dung 4 member; outsider khong co ProjectMember. |
| Field progress template | PASS | Co dung 1 template. |
| Field progress items | PASS | 34 items, GROUP/WORK parent hop le, khong trung code trong template. |
| WORK designQuantity | PASS | Tat ca WORK item co designQuantity > 0. |
| Field progress entries | PASS | 34 entries, co `DRAFT`, `SUBMITTED`, `APPROVED`. |
| Empty days | PASS | Khong co entry ngay `2026-07-05` va `2026-07-14`. |
| Individual quantity guard | PASS | Khong entry nao vuot designQuantity. |
| Cumulative quantity guard | PASS | Luy ke tung item khong vuot designQuantity. |
| Completion cases | PASS | Co day du 0%, 20-50%, 90-95%, 100%. |
| Reports | PASS | 12 reports, co DAILY va WEEKLY. |
| Report statuses | PASS | Co `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`. |
| reportNo uniqueness | PASS | Khong trung `reportNo` trong project QA. |
| Report creators | PASS | Tat ca `createdById` la QA user. |
| Report lines | PASS | Line thuoc project QA va link FieldProgressItem hop le hoac co workContent hop le. |
| Attachments | PASS | 5 attachments, co file vat ly, path nam trong `storage/qa-realistic-tu-hiep`, MIME/extension hop ly. |
| Document folders | PASS | 10 folders. |
| Documents | PASS | 12 documents, folder/project hop le, file vat ly ton tai, path nam trong QA storage. |
| Material requests | PASS | 4 requests, moi request co item, thuoc project QA, nguoi tao la QA user. |
| Audit logs | PASS | Audit logs trong scope project/user/report/document QA; khong thay log sai project. |
| Orphan records | PASS | Child records duoc sample qua relation hop le; required relation trong schema chan orphan truc tiep. |

Tong ket verify: `PASS (41/41 checks passed)`.

## 4. Idempotency

Da chay lai seed execute truoc do va count khong nhan doi:

```text
users: 7
members: 4
folders: 10
fieldItems: 34
entries: 34
reports: 12
reportAttachments: 5
documents: 12
materialRequests: 4
Quantity guard: OK
```

Da chay lai:

```powershell
npx tsx scripts\seed-realistic-tu-hiep-project.ts --dry-run
```

Ket qua dry-run sau seed:

```text
Project exists: yes
Existing @example.test users: 7
Existing counts for this project:
projectMembers: 4
folders: 10
fieldItems: 34
entries: 34
reports: 12
documents: 12
materialRequests: 4
No data will be written unless you pass --execute.
```

## 5. Physical storage

Storage QA:

```text
storage/qa-realistic-tu-hiep
```

Ket qua:

- 17 physical files.
- 12 document files.
- 5 report attachment files.
- Tat ca document/attachment storage path deu chua `qa-realistic-tu-hiep`.
- Khong co path `..`.
- Khong co document/attachment tro ra ngoai folder QA.

## 6. Khoi luong thiet ke

Verify script da kiem tra:

- Entry quantity tung dong <= designQuantity.
- Luy ke theo item <= designQuantity.
- Cac case quan trong ton tai:
  - 0%: cac work item chua co entry.
  - 20-50%: nhieu item dang thi cong.
  - 90-95%: cac item near-limit nhu `PRE-002`, `FND-004`, `FND-005`.
  - 100%: cac item hoan thanh dung designQuantity.

Ket qua: PASS.

## 7. Orphan records

Da kiem tra:

- Report attachment thuoc report QA.
- Report line thuoc report QA/project QA.
- Document thuoc folder QA/project QA.
- MaterialRequestItem thuoc MaterialRequest QA.
- Audit log khong tro sai project.

Ket qua: PASS.

## 8. Rollback script

Da tao:

```text
scripts/rollback-realistic-tu-hiep-project.ts
```

Tinh nang:

- Mac dinh dry-run.
- Chi xoa khi co `--execute`.
- Scope theo:
  - project code `QA-TUHIEP-5F-001`
  - user email trong danh sach `qa.*@example.test`
  - storage path co `qa-realistic-tu-hiep`
- Khong dung deleteMany rong khong co where hep.
- User QA se bi skip neu co lien ket ngoai project QA.
- Co guard production: can `ALLOW_QA_REALISTIC_ROLLBACK_PRODUCTION=true` neu `NODE_ENV=production`.
- Co verify sau rollback execute.

Thu tu xoa trong execute:

1. SiteReportAttachment, SiteReportPhoto, SiteReportLine.
2. SiteReport.
3. Document, DocumentFolder.
4. MaterialRequestItem, MaterialRequest.
5. FieldMaterialRequestItem, FieldMaterialRequest.
6. FieldProgressEntry, FieldProgressItem, FieldProgressTemplate.
7. ProjectMember.
8. AuditLog QA scope.
9. Project QA.
10. QA users neu khong co external links.
11. Storage folder `storage/qa-realistic-tu-hiep`.

## 9. Rollback dry-run

Lenh:

```powershell
npx tsx scripts\rollback-realistic-tu-hiep-project.ts --dry-run
```

Ket qua:

| Scope | Count |
| --- | ---: |
| SiteReportAttachment | 5 |
| SiteReportPhoto | 0 |
| SiteReportLine | 62 |
| SiteReport | 12 |
| Document | 12 |
| DocumentFolder | 10 |
| MaterialRequestItem | 7 |
| MaterialRequest | 4 |
| FieldMaterialRequestItem | 0 |
| FieldMaterialRequest | 0 |
| FieldProgressEntry | 34 |
| FieldProgressItem | 34 |
| FieldProgressTemplate | 1 |
| ProjectMember | 4 |
| AuditLog | 32 |
| Project | 1 |
| QA users to delete | 7 |
| QA users skipped | 0 |

Storage dry-run:

```text
D:\construction-erp-v2\storage\qa-realistic-tu-hiep (exists)
```

Khong co du lieu nao bi xoa trong dry-run.

## 10. Lenh da chay va ket qua

| Lenh | Ket qua |
| --- | --- |
| `npx tsx scripts\verify-realistic-tu-hiep-project.ts` | PASS, 41/41 checks passed. |
| `npx tsx scripts\rollback-realistic-tu-hiep-project.ts --dry-run` | PASS, in count rollback; khong xoa du lieu. |
| `npx tsx scripts\seed-realistic-tu-hiep-project.ts --dry-run` | PASS, count idempotent. |
| `npx prisma validate` | PASS, schema valid. |
| `npx prisma generate` | PASS, Prisma Client v7.8.0 generated. |
| `npx tsc --noEmit --pretty false` | PASS sau khi cleanup generated `.next/dev/types`. |
| `npm run build` | PASS sau khi cleanup generated `.next/dev/types`; con 1 warning NFT tracing khong chan build. |

Luu y ve build/typecheck:

- Lan dau `npx tsc --noEmit` va `npm run build` fail do generated artifact `.next/dev/types/routes.d.ts` bi corrupt.
- File do co comment `This file is generated automatically by Next.js`.
- Da xoa rieng generated folder `.next/dev/types`, khong xoa source code, khong xoa DB, khong xoa storage QA.
- Chay lai `npx tsc --noEmit --pretty false` PASS.
- Chay lai `npm run build` PASS.

Build warning con lai:

```text
Turbopack build encountered 1 warnings:
./next.config.ts
Encountered unexpected file in NFT list
Import trace:
  App Route:
    ./next.config.ts
    ./src/app/api/reports/attachments/[attachmentId]/route.ts
```

Warning nay khong chan build.

Khong chay:

- `npm run dev`
- Prisma reset
- Git commit
- Git push
- Rollback execute

## 11. Git status hien tai

```text
?? .gemini-git-files.txt
?? docs/qa/REALISTIC_PROJECT_SEED_PLAN_REPORT.md
?? scripts/rollback-realistic-tu-hiep-project.ts
?? scripts/seed-realistic-tu-hiep-project.ts
?? scripts/verify-realistic-tu-hiep-project.ts
```

Sau khi tao report nay, se co them:

```text
?? docs/qa/REALISTIC_PROJECT_SEED_EXECUTION_VERIFICATION_REPORT.md
```

## 12. Ket luan

Du lieu mau da san sang cho UAT.

Khong can rollback luc nay neu muc tieu la test UI/workflow voi project `QA-TUHIEP-5F-001`. Rollback script da san sang de chay khi can:

```powershell
npx tsx scripts\rollback-realistic-tu-hiep-project.ts --execute
```

Nen commit cac file:

- `docs/qa/REALISTIC_PROJECT_SEED_PLAN_REPORT.md`
- `docs/qa/REALISTIC_PROJECT_SEED_EXECUTION_VERIFICATION_REPORT.md`
- `scripts/seed-realistic-tu-hiep-project.ts`
- `scripts/verify-realistic-tu-hiep-project.ts`
- `scripts/rollback-realistic-tu-hiep-project.ts`

Khong nen commit:

- `storage/qa-realistic-tu-hiep`
- `.next`
- `.gemini-git-files.txt` neu day la file local/tooling khong chu dinh dua vao repo.

