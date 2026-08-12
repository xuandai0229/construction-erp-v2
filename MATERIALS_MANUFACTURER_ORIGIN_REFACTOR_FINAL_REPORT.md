# Materials manufacturer/origin refactor report

Ngày: 11/08/2026  
Trạng thái: **PARTIAL / RUNTIME UNVERIFIED**

## 1. Baseline

- Commit baseline: `c68347a318ed122c9301cdfcda6c5069c9a5f629`.
- Worktree đã có thay đổi Materials chưa commit từ các phase trước; không reset, clean, seed hay xóa dữ liệu.
- Pre-migration read-only audit: 12 MaterialItem, 12 stock rows, 17 movements, 19 proposals, 22 proposal items.

## 2. Group dependency inventory

Ma trận đầy đủ: `MATERIAL_GROUP_REMOVAL_IMPACT_MATRIX.md`.

`MaterialItem.group` là metadata nullable project-scoped, không có foreign key/unique/index riêng. Consumer gồm DTO, create/edit, project catalog/stock/transaction, portfolio catalog/stock/transaction, detail drawer, search/filter, QA fixture và scripts. `MaterialProposalItem.manufacturerOrigin` đã là snapshot độc lập cho tài liệu, không phải dữ liệu migrate từ `group`.

## 3. Existing data preservation proof

Read-only audit trước migration thấy mọi MaterialItem hiện có đều mang category cũ:

| Giá trị legacy | Số MaterialItem |
|---|---:|
| Vật liệu thô | 7 |
| Vật tư cốp pha | 2 |
| Thép xây dựng | 2 |
| Vật liệu hoàn thiện | 1 |

Không giá trị nào trong bảng trên được copy vào `manufacturer` hoặc `origin`. Không stock/movement/proposal/proposal item nào bị mutate.

## 4. Database schema and migration

Schema `MaterialItem` được chuẩn bị thêm hai field nullable:

```prisma
manufacturer String?
origin       String?
```

Migration additive: `prisma/migrations/20260811200000_add_material_manufacturer_origin/migration.sql` chỉ dùng hai câu `ADD COLUMN`. `group` legacy vẫn ở schema/database để bảo toàn dữ liệu và phục vụ rollback compatibility. Không `db push`, không reset, không drop column.

### Migration execution and post-migration proof

Ngày 11/08/2026, migration đã được áp dụng bằng `prisma migrate deploy` vào datasource phát triển mà ứng dụng đang dùng. Prisma xác nhận migration `20260811200000_add_material_manufacturer_origin` được apply thành công. Đây là migration additive: chỉ thêm hai cột nullable, không backfill, không `db push`, không reset và không drop column.

Read-only audit ngay sau migration xác nhận số liệu được bảo toàn: 12 MaterialItem, 12 stock rows, 17 movements, 19 proposals và 22 proposal items. Cả 12 MaterialItem hiện hữu có `manufacturer = null` và `origin = null`; không giá trị legacy `group` nào bị copy sang hai trường mới.

## 5. Application changes

- `MaterialItemDto`, stock DTO và portfolio DTO chuyển từ `group` sang `manufacturer`/`origin`.
- Create/edit server action chuẩn hóa hai field optional; stock initial vẫn đi qua `applyMaterialMovement` trong transaction.
- Project và portfolio catalog/stock tìm theo mã, tên, hãng sản xuất, xuất xứ; UI hiển thị cột **Hãng sản xuất / xuất xứ** với fallback `—` hoặc `Chưa cập nhật`.
- Portfolio aggregate coi identity là presentation-only, giữ material/project breakdown; không tạo global material master và không dùng manufacturer/origin làm identity domain.
- Transaction selector, detail drawer và transaction list dùng metadata mới.
- Proposal form prefill snapshot `manufacturerOrigin` từ `MaterialItem.manufacturer/origin` khi chọn vật tư, nhưng snapshot đề xuất cũ vẫn không bị sửa hay đồng bộ ngược.
- Form create/edit được thay bằng một form shared có sections: Thông tin vật tư, Nguồn gốc, Quản lý tồn kho và Ghi chú. Manufacturer/origin optional; tồn đầu kỳ ẩn sau checkbox và submit qua ledger.
- QA fixtures mới dùng dữ liệu hãng/xuất xứ có cấu trúc. Chúng không được seed trong phase này.
- Script audit metadata read-only và QA update metadata được thêm; obsolete group QA scripts được thay/xóa.

## 6. Proposal, preview, PDF, Excel and print

`MaterialProposalItem.manufacturerOrigin` được giữ nguyên như snapshot document. Preview/Excel/PDF/print tiếp tục dùng snapshot đó. Runtime export chưa kiểm thử vì browser chưa có authenticated session.

## 7. Search, validation and accessibility

- Search catalog/stock/portfolio chứa code, name, manufacturer, origin.
- Name/unit required, manufacturer/origin optional, threshold non-negative, opening stock positive when enabled; error messages Việt hóa.
- Dialog có `role=dialog`, `aria-modal`, ESC, click outside theo convention hiện có và restore focus; runtime focus-trap/mobile keyboard cần test thật.

## 8. Static checks

| Check | Result |
|---|---|
| Prisma client generate | PASS |
| `npx tsc --noEmit` | PASS |
| Targeted Materials ESLint | 0 errors, 31 existing warnings |
| `npm run build` | PASS |
| `git diff --check` | PASS, chỉ cảnh báo CRLF của Git |
| `npx prisma validate` | PASS |

## 9. Runtime/database reconciliation

Post-migration database preservation audit and Prisma schema validation PASS. Browser Materials remains authentication-blocked from the prior phase. Therefore create/edit, search, stock display, portfolio, proposal prefill, preview, Excel/PDF/print, responsive and console evidence are all **UNVERIFIED**.

## 10. Required next actions

1. Log in to a QA browser session and execute runtime create/edit/search/portfolio/proposal/export/responsive tests.
2. Run approved QA fixture reseed only if desired, then verify fixture manufacturer/origin values and ledger reconciliation.
3. Only after all consumer searches and runtime evidence are clean should a separately approved destructive migration remove `MaterialItem.group`.

## 11. Final verdict

**PARTIAL / RUNTIME UNVERIFIED / NOT READY FOR GROUP COLUMN REMOVAL.**

The additive schema/data migration is applied and its data-preservation audit passes. Browser runtime evidence is still missing, and the legacy `group` column remains intentionally retained. No claim of full runtime PASS, production readiness or completed legacy-column removal is made.
