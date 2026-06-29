# HANOI_RESET_SEED_INDEPENDENT_VERIFICATION_REPORT

Ngày kiểm chứng độc lập: 2026-06-27

Phạm vi: kiểm chứng lại `docs/qa/HANOI_FULL_PROJECT_RESET_AND_SEED_REPORT.md`, các script `reset-old-project-data.ts`, `seed-hanoi-full-project.ts`, `qa-hanoi-project-data-check.ts`, schema Prisma, các màn/API/action chính liên quan đến project, documents, reports, field progress, materials, contracts, accounting/payments, approvals, users/RBAC.

Không commit, không push, không chạy `npm run dev`, không sửa code trong bước kiểm chứng này.

## 1. Kết luận ngắn

Báo cáo trước nhìn chung đúng ở phần reset/seed/build/QA chính: hiện DB chỉ còn project `HN-TH-2026-001`, dữ liệu nghiệp vụ chính được seed đủ để các màn lớn có dữ liệu, `prisma validate`, `prisma generate`, `tsc`, `build`, QA data và QA upload settings đều pass.

Tuy nhiên báo cáo trước chưa đủ chặt ở vài điểm:

- Seed script chưa idempotent hoàn toàn cho `ChatMessage`: schema không có `projectId`/`roomId`, script tạo thêm 30 message theo tag nội dung và `removeExistingProject()` không xóa message cũ của project code khi re-seed.
- Dữ liệu payment có mismatch nghiệp vụ: 5 `PaymentRequest` đang gắn `supplierId = MINHAN` trong khi contract tương ứng là `THX` hoặc `HOAPHAT`.
- `ChatMessage` không được scope bằng khóa ngoại DB, nên không thể kết luận chat đã an toàn theo project.
- `reports/actions.ts` có server action `getProjectWorkItems(projectId)` đang có TODO chưa check quyền project; `createSiteReport()` cũng chưa thấy guard `canAccessProject` trước khi tạo báo cáo theo `projectId`.
- Build warning Turbopack/NFT được xác nhận lại và có nguồn khả dĩ từ route attachment báo cáo tự dùng `path.join(process.cwd(), ...)`.
- Chưa thể kết luận UI hoạt động hoàn hảo vì chưa test browser/E2E.

## 2. Báo cáo trước đúng/chưa đúng

| Nội dung trong báo cáo trước | Kết quả kiểm chứng |
|---|---|
| Đã reset dữ liệu công trình cũ | Đúng theo DB hiện tại: chỉ còn `HN-TH-2026-001`, các old project code không còn. |
| Giữ user/admin/core và system settings | Đúng. Hiện có 43 users sau seed, 1 `SystemSetting`. |
| Seed đủ dữ liệu chính | Cơ bản đúng: project, members, folders/docs, field progress, reports, materials, contracts, payments, approvals đều có dữ liệu. |
| QA script pass 21/21 | Đúng, chạy lại pass 21/21. |
| Build pass nhưng còn Turbopack warning | Đúng, warning tái hiện y hệt. |
| File/folder đã fix các lỗi HIGH/MEDIUM | Cơ bản đúng cho documents upload/download/folder actions. Còn report attachment route chưa dùng storage provider và gây warning. |
| Chat đã có dữ liệu | Đúng về số lượng 30 message tagged, nhưng chưa đúng nếu hiểu là chat đã project-scoped an toàn. |
| Script seed idempotent theo project code | Chưa đầy đủ: project-scoped tables được dọn, nhưng `ChatMessage` sẽ bị duplicate nếu chạy lại seed. |
| Dữ liệu payments đủ | Đủ để hiển thị màn, nhưng chưa nhất quán supplier-contract ở 5 payment requests. |
| `git status` ban đầu sạch | Không thể kiểm chứng độc lập trạng thái ban đầu. Trạng thái hiện tại có 4 file code modified và 4 file untracked từ task trước. |

## 3. Lệnh đã chạy lại

| Lệnh | Kết quả |
|---|---|
| `git status --short` | PASS, có thay đổi/untracked hiện tại, không commit. |
| `git diff --stat` | PASS, 4 file code modified, 64 insertions, 10 deletions. Lưu ý untracked scripts/report không hiện trong diff stat. |
| `npx prisma validate` | PASS. |
| `npx prisma generate` | PASS, Prisma Client v7.8.0 generated. |
| `npx tsc --noEmit` | PASS. |
| `npm run build` | PASS, còn 1 Turbopack/NFT warning. |
| `npx tsx --env-file=.env scripts/qa-hanoi-project-data-check.ts` | PASS 21/21. |
| `npx tsx scripts/qa-document-upload-settings.ts` | PASS toàn bộ case extension/naming/path traversal. |

Build warning hiện tại:

```text
Turbopack build encountered 1 warnings:
./next.config.ts
Encountered unexpected file in NFT list
Import trace:
  App Route:
    ./next.config.ts
    ./src/app/api/reports/attachments/[attachmentId]/route.ts
```

## 4. DB hiện tại và dữ liệu cũ

Truy vấn read-only độc lập cho kết quả chính:

| Model | Count |
|---|---:|
| User | 43 |
| Project | 1 |
| ProjectMember | 10 |
| Supplier | 8 |
| Contract | 5 |
| DocumentFolder | 35 |
| Document | 12 |
| SiteReport | 20 |
| SiteReportAttachment | 5 |
| SiteReportLine | 20 |
| MaterialRequest | 2 |
| MaterialRequestItem | 4 |
| MaterialItem | 11 |
| MaterialMovement | 22 |
| ProjectMaterialStock | 11 |
| PaymentPlan | 4 |
| PaymentRecord | 2 |
| PaymentRequest | 6 |
| ApprovalRequest | 6 |
| ChatMessage | 30 |
| AuditLog | 111 |
| FieldProgressTemplate | 1 |
| FieldProgressItem | 43 |
| FieldProgressEntry | 41 |
| WBSItem | 18 |
| SystemSetting | 1 |

Old project codes kiểm tra lại: `TH-125`, `QA-TUHIEP-5F-001`, `Ct-124`, `TEST-MATERIALS-RBAC`, `UAT-PAY-CT2-HANOI`, `UAT-PAY-TUHIEP-5F`, `UAT-APR-CT2`, `UAT-APR-TUHIEP` đều không còn trong `Project`.

Không phát hiện orphan/scope mismatch trong các kiểm tra độc lập:

- `Document.folder.projectId !== Document.projectId`: 0.
- `SiteReportLine.projectId` lệch `SiteReport.projectId` hoặc `FieldProgressItem.projectId`: 0.
- `MaterialMovement.projectId` lệch `MaterialItem.projectId`: 0.
- `ProjectMaterialStock.projectId` lệch `MaterialItem.projectId`: 0.
- `PaymentRequest.projectId` lệch `Contract.projectId`: 0.
- Tổng daily field progress vượt design quantity: 0.
- `ChatMessage` tagged `HN-TH-2026-001`: 30.

AuditLog còn 111 bản ghi. Đây là hợp lý với thiết kế giữ non-business/system audit và audit mới của seed/QA, nhưng audit không có relation trực tiếp với `Project`, chỉ có `projectId` plain field nên vẫn nên coi là dữ liệu giữ lại theo chính sách, không phải orphan FK.

## 5. Công trình Hà Nội đã đủ dữ liệu chưa

Đủ để test các màn chính ở mức data/server:

| Màn/module | Dữ liệu hiện có | Nhận định |
|---|---|---|
| Dashboard | 1 active project, documents, field entries, contracts | Đủ dữ liệu hiển thị. |
| Projects list/detail | Project `HN-TH-2026-001`, member, folders, counts | Đủ. |
| Documents | 35 folders, 12 documents, physical sample files tồn tại | Đủ để test cây folder/file/download. |
| Field Progress master | 1 template, 6 group, 37 work items, 18 WBS items | Đủ, nhưng WBS seed còn nông, chưa là cây WBS thật. |
| Daily progress | 41 entries Jan-Jun 2026, nhiều status, không vượt design | Đủ. |
| Summary progress | Có dữ liệu groupBy/lũy kế | Đủ. |
| Reports | 20 reports, 20 lines, 5 attachments, nhiều status | Đủ. |
| Materials | 11 material items, 22 movements, 11 stocks, 2 requests | Đủ hiển thị tồn/nhập/xuất/request; chưa có request trạng thái RECEIVED. |
| Contracts | 5 contracts, 8 suppliers | Đủ. |
| Accounting/payments | 6 payment requests, 4 plans, 2 records | Đủ hiển thị, nhưng có mismatch supplier-contract cần sửa. |
| Approvals | 6 approvals, status APPROVED/PENDING/REJECTED/CANCELLED | Đủ. |
| Users/RBAC | 10 project members, seed users reuse admin | Đủ để test phân quyền. |
| Chat | 30 messages tagged bằng content | Có dữ liệu, chưa an toàn về schema/scope. |
| Notifications | Không có model notification nghiệp vụ riêng ngoài settings | Không seed được vì schema/module chưa có. |

Điểm dữ liệu chưa đạt mức "giống thật" tuyệt đối:

- `Project.name` và nhiều label seed dùng ASCII không dấu (`Cong trinh...`) thay vì tiếng Việt có dấu.
- 5 payment request dùng supplier MINHAN dù contract là THX/HOAPHAT.
- Material request chỉ có `APPROVED` và `SUBMITTED`, thiếu ví dụ `RECEIVED` nếu workflow mong muốn.
- WBS items được tạo 18 root item, chưa phản ánh cây WBS nhiều cấp.

## 6. File/folder an toàn chưa

Kết luận: documents module hiện an toàn hơn và đủ để test chính, nhưng còn rủi ro MEDIUM/LOW quanh heuristic permission và report attachment storage.

Điểm đã kiểm chứng:

- Upload document API check session, project tồn tại, `canAccessProject`, folder thuộc cùng `projectId`, folder permission.
- Download direct URL check session, document active, project chưa xóa, `canAccessProject`.
- Folder create check parent cùng project.
- Folder delete soft-delete và chặn nếu còn file/folder con.
- Document rename/delete/metadata/status đều filter `projectId`, `deletedAt`, trạng thái immutable.
- Storage provider mới lưu document `storagePath` dạng relative path dưới `storage`.
- QA data xác nhận document/report attachment paths relative, không có `..`, physical sample files tồn tại.
- Không còn validate dung lượng 10MB/50MB trong documents upload policy. UI documents cũng không còn hiện giới hạn MB nhỏ.

Giới hạn/điểm cần lưu ý:

- Report attachment upload có giới hạn số lượng `MAX_PHOTOS_PER_REPORT = 10` và `MAX_FILES_PER_REPORT = 5`, không phải giới hạn dung lượng MB. Đây là constraint nghiệp vụ khác, không mâu thuẫn với yêu cầu file công trình nặng.
- `src/app/api/reports/attachments/[attachmentId]/route.ts` tự resolve path bằng `path.join(process.cwd(), ...)`, chưa dùng `storageProvider`; đây là nguồn khả dĩ của Turbopack/NFT warning và nên refactor.
- `src/lib/documents/permissions.ts` đang dùng keyword matching theo tên folder. Cách này tương thích cây folder Hà Nội, nhưng vẫn là heuristic; folder custom có từ khóa trùng có thể nhận quyền rộng hơn mong muốn.
- Hai constant cũ `ACCOUNTING_FOLDERS` và `ENGINEERING_FOLDERS` còn tồn tại nhưng không dùng; không gây lỗi runtime, chỉ là code hygiene.

## 7. Phân tích warning Turbopack/NFT

`next.config.ts` gần như rỗng, nên warning không đến từ config logic. Import trace bắt đầu ở `next.config.ts` vì Next build trace route từ cấu hình, nhưng điểm đáng ngờ nằm trong:

- `src/app/api/reports/attachments/[attachmentId]/route.ts:60`: `path.join(process.cwd(), "storage")`.
- `src/app/api/reports/attachments/[attachmentId]/route.ts:72`: `path.join(process.cwd(), attachment.storagePath.startsWith('storage') ? '' : 'storage', attachment.storagePath)`.

Trong khi đó `src/lib/storage/local-storage-provider.ts` đã có `path.join(/*turbopackIgnore: true*/ process.cwd(), 'storage')`, nên document storage ít khả năng là nguồn warning hiện tại.

Nhận định: build vẫn pass, warning là MEDIUM vì có thể làm NFT trace rộng hơn dự kiến khi deploy/build. Chưa sửa trong bước này theo yêu cầu.

## 8. Rủi ro ChatMessage và hướng sửa schema an toàn

Schema hiện tại:

```prisma
model ChatMessage {
  id        String   @id @default(cuid())
  senderId  String
  content   String
  createdAt DateTime @default(now())

  sender User @relation(fields: [senderId], references: [id], onDelete: Cascade)

  @@index([senderId])
  @@index([createdAt])
}
```

Rủi ro:

- Không có `projectId`, `roomId`, `threadId`, hoặc bảng `ChatRoom`.
- Không thể enforce FK/cascade theo project.
- Reset script phải xóa `chatMessage.deleteMany({})` toàn cục nếu muốn sạch chat cũ.
- Seed script không thể idempotent đúng theo project; chạy lại sẽ thêm 30 message tagged trùng.
- Nếu sau này có UI/API chat multi-project, direct access control theo project không thể làm chắc bằng DB hiện tại.

Đề xuất schema migration an toàn:

1. Thêm model `ChatRoom`:

```prisma
model ChatRoom {
  id        String   @id @default(cuid())
  projectId String?
  name      String
  type      String   @default("PROJECT")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  project  Project? @relation(fields: [projectId], references: [id], onDelete: Cascade)
  messages ChatMessage[]

  @@index([projectId])
  @@index([type])
}
```

2. Thêm nullable `roomId` vào `ChatMessage`, không đổi required ngay:

```prisma
roomId String?
room   ChatRoom? @relation(fields: [roomId], references: [id], onDelete: Cascade)
@@index([roomId])
```

3. Migration/backfill:

- Tạo room cho `HN-TH-2026-001`.
- Backfill các message có content tag `[HN-TH-2026-001]` vào room mới.
- Các message không xác định project thì để `roomId = null` hoặc đưa vào room archive/global.

4. Update API/UI chat:

- List/create message bắt buộc chọn room/project.
- Check `canAccessProject(session, room.projectId)` trước khi đọc/ghi.
- Seed script upsert room theo project code, xóa/recreate messages theo `roomId` để idempotent.

5. Sau khi code đã dùng room ổn định:

- Cân nhắc make `roomId` required cho message project chat mới.
- Không xóa message legacy cho đến khi có quyết định nghiệp vụ lưu trữ.

## 9. Lỗi/rủi ro cần sửa tiếp

### CRITICAL

Không phát hiện lỗi CRITICAL đã có bằng chứng trong kiểm chứng này.

### HIGH

1. `reports/actions.ts:getProjectWorkItems(projectId)` chưa check quyền project.
   - Bằng chứng: comment `TODO: Check if user has access to this projectId`.
   - Tác động: user có session có thể gọi server action với `projectId` khác để lấy danh sách work items nếu action exposed qua client.
   - Hướng sửa: dùng `canAccessProject(session, projectId)` hoặc `requireProjectAccess(projectId)` trước khi query.

2. `reports/actions.ts:createSiteReport()` chưa thấy guard `canAccessProject` trước khi tạo báo cáo theo `data.projectId`.
   - Tác động: rủi ro ghi báo cáo vào project không thuộc quyền nếu server action bị gọi trực tiếp.
   - Hướng sửa: validate project tồn tại và `canAccessProject(session, projectId)` trước `createSiteReportWithAudit`.

3. ChatMessage chưa project-scoped.
   - Nếu chat module được bật/hiển thị, đây là rủi ro HIGH cho cross-project privacy.
   - Nếu chưa có UI/API chat, có thể hạ xuống MEDIUM nhưng vẫn cần sửa schema trước khi mở module.

### MEDIUM

1. Seed payment supplier mismatch.
   - 5 payment requests đang có supplier MINHAN trong khi contract supplier là THX/HOAPHAT.
   - Hướng sửa: trong seed, set `supplierId` theo `contract.supplierId` hoặc supplier code tương ứng.

2. Seed script chưa idempotent cho chat.
   - Hướng sửa tạm thời trước migration: xóa message theo content tag `[HN-TH-2026-001]` khi re-seed. Hướng tốt hơn: thêm room/project scope.

3. Turbopack/NFT warning route attachment.
   - Hướng sửa: refactor route attachment dùng storage provider hoặc static-scope `process.cwd()` với `/*turbopackIgnore: true*/`, đồng thời chuẩn hóa relative path.

4. Permission folder documents dựa keyword.
   - Hướng sửa dài hạn: thêm folder category/permission metadata thay vì suy luận bằng tên.

### LOW

1. Xóa constants cũ không dùng trong `src/lib/documents/permissions.ts`.
2. Chuẩn hóa tiếng Việt có dấu trong seed/report nếu muốn dữ liệu demo đẹp hơn.
3. WBS seed nên tạo hierarchy đúng thay vì 18 root items.
4. Bổ sung material request status `RECEIVED` nếu workflow cần test trạng thái đã nhận đủ.

## 10. Chưa thể kết luận vì chưa test browser

Chưa thể kết luận các điểm sau vì không chạy `npm run dev` và không test bằng browser:

- UI documents thực sự upload file lớn qua browser/proxy có bị giới hạn bởi Next/server/proxy hay không.
- Text dài/tên file dài có vỡ layout không.
- Loading/error state upload có hiển thị đúng mọi case.
- Download/preview file binary hoạt động thực tế trên trình duyệt.
- Permission UI có ẩn/hiện nút đúng với từng tài khoản seed.
- Các màn reports/materials/accounting/approvals hiển thị đẹp và không lỗi hydration khi thao tác.

## 11. Đề xuất thứ tự fix tiếp theo

1. HIGH: thêm guard `canAccessProject` cho `getProjectWorkItems()` và `createSiteReport()` trong reports actions.
2. HIGH/MEDIUM: thiết kế migration `ChatRoom`/`roomId` cho `ChatMessage`, sau đó update seed/reset/QA chat.
3. MEDIUM: sửa seed payment supplier mismatch và chạy lại seed/QA data.
4. MEDIUM: xử lý Turbopack/NFT warning ở route report attachment bằng storage provider hoặc `turbopackIgnore` có scope.
5. MEDIUM: thay keyword folder permission bằng metadata/category nếu muốn RBAC tài liệu bền hơn.
6. LOW: dọn constants cũ, làm đẹp seed tiếng Việt có dấu/WBS hierarchy/material received status.

## 12. Trạng thái hoàn tất kiểm chứng

- Đã kiểm chứng độc lập report trước: có đúng phần lớn, nhưng có các điểm chưa đầy đủ nêu trên.
- Dữ liệu cũ: sạch ở project/business tables theo DB hiện tại; không thấy old project/orphan quan trọng trong kiểm tra đã chạy.
- Công trình Hà Nội: tồn tại và đủ dữ liệu cho các màn chính ở mức data/server.
- File/folder: documents module an toàn hơn và QA pass; report attachment route còn warning build/storage refactor risk.
- Build/test: toàn bộ lệnh bắt buộc đã chạy lại và pass, trừ build còn warning Turbopack/NFT đã phân tích.
- Chưa sửa code sau kiểm chứng, đúng yêu cầu "chỉ sau khi báo cáo kiểm chứng xong mới đề xuất fix".
