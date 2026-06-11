# FIELD PROGRESS DATA LOGIC CROSS-SCREEN AUDIT REPORT

**Date:** 2026-06-11  
**Phase:** Read-Only Logic Verification  
**Scope:** 3 screens — Bảng khối lượng gốc (Master), Nhập khối lượng theo ngày (Daily), Tổng hợp khối lượng (Summary)

---

## 1. Executive Summary

| Verdict | Detail |
|---------|--------|
| **Logic 3 màn** | ✅ **ĐÃ ĐÚNG** — Dữ liệu liên kết chính xác giữa Master → Daily → Summary |
| **Tính toán** | ✅ **ĐÃ ĐÚNG** — Lũy kế, phát sinh, tỷ lệ hoàn thành tính đúng |
| **Lỗi P0** | ✅ **KHÔNG CÓ** |
| **Lỗi P1** | ⚠️ **2 vấn đề latent** (todayWorkDate timezone risk + guard vs display inconsistency) |
| **DB Active** | ✅ 0 duplicate, 0 timezone, 5 orphan SUBMITTED (đã biết), 0 approved over design |
| **Test/Build** | ✅ **ALL PASS** — 4 test suites + tsc --noEmit + npm run build |

---

## 2. Data Flow Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PROJECT                                        │
│   └── FieldProgressTemplate (1:1 per project, auto-created)           │
│        ├── FieldProgressItem (type: GROUP, parent=null)               │
│        │    └── FieldProgressItem (type: WORK, parent=GROUP.id)       │
│        └── FieldProgressEntry (linked to item + template + date)      │
│                                                                       │
│  MASTER SCREEN                                                        │
│  ┌──────────────────────┐                                             │
│  │ Create/Edit/Delete   │──► Items (GROUP/WORK)                       │
│  │ designQuantity, unit │    deletedAt = null → active                │
│  │ revalidatePath()     │    deletedAt ≠ null → hidden                │
│  └──────────┬───────────┘                                             │
│             │ items query: where { deletedAt: null }                  │
│             ▼                                                         │
│  DAILY SCREEN                                                         │
│  ┌──────────────────────┐                                             │
│  │ Select date          │──► getWorkDateRange(date) → [start, end)   │
│  │ Input quantity/day   │    Query entries: entryDate in [start, end) │
│  │ Save DRAFT/SUBMITTED │    cumulativeBefore: APPROVED entries < start│
│  │ VolumeGuard validate │    Upsert: 0→create, 1→update, 2+→error   │
│  │ revalidatePath(x3)   │                                             │
│  └──────────┬───────────┘                                             │
│             │ entries query: deletedAt null, status filter            │
│             ▼                                                         │
│  SUMMARY SCREEN                                                       │
│  ┌──────────────────────┐                                             │
│  │ fromDate → toDate    │──► entriesInRange: [fromStart, toEnd)      │
│  │ Status filter        │    cumulativeBefore: APPROVED < fromStart   │
│  │ Date mode: ALL/DATA  │    periodTotal = sum(entriesInRange.qty)    │
│  │ buildRollupTree()    │    cumulative = cumulativeBefore + period   │
│  │ GROUP rollup from    │    GROUP = sum(WORK children)               │
│  │ WORK children        │    % = cumulative / designQty x 100        │
│  └──────────────────────┘                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Master Data Logic Audit

| # | Check | Result | Evidence | Risk |
|---|-------|--------|----------|------|
| 3.1a | Tạo item gắn đúng `projectId` | ✅ PASS | `createItem()` L53-69: `data: { templateId, projectId, ...}` | None |
| 3.1b | Tạo item gắn đúng `templateId` | ✅ PASS | `createItem()` L54: `templateId` passed explicitly | None |
| 3.1c | Tạo item gắn đúng `parentId` | ✅ PASS | `createItem()` L57: `parentId: data.parentId \|\| null` | None |
| 3.1d | Tạo item đúng `itemType` | ✅ PASS | GROUP/WORK passed from client, stored as-is | None |
| 3.1e | `sortOrder` auto-increment | ✅ PASS | L46-51: `findFirst(orderBy: desc) + 1` | None |
| 3.1f | Daily thấy WORK mới | ✅ PASS | Daily queries `where: { templateId, deletedAt: null, itemType: "WORK" }` | None |
| 3.1g | Summary thấy WORK mới | ✅ PASS | Summary queries `items: { where: { deletedAt: null } }` from template | None |
| 3.2a | Sửa item → Daily cập nhật | ✅ PASS | `revalidatePath()` invalidates server components, Daily re-renders | None |
| 3.2b | Sửa `designQuantity` → Summary % | ✅ PASS | Summary reads `designQuantity` fresh from DB, rollup recalculates | None |
| 3.2c | Sửa item → lũy kế tính lại | ✅ PASS | Cumulative is calculated from entries, not cached on item | None |
| 3.3a | Soft-delete → Daily ẩn | ✅ PASS | Daily: `where: { deletedAt: null, itemType: "WORK" }` | None |
| 3.3b | Soft-delete → Summary ẩn | ✅ PASS | Summary: `items: { where: { deletedAt: null } }` | None |
| 3.3c | Entry cũ của item bị xóa | ⚠️ INFO | Entries vẫn active (orphan) nhưng không bị hiển thị vì item query filter | P2 — 5 orphan SUBMITTED đã biết |
| 3.3d | Xóa GROUP → cascade WORK con | ✅ PASS | `deleteItem()` L140-143: `updateMany({ parentId: itemId }, deletedAt)` | None |
| 3.3e | Batch update items | ✅ PASS | `batchUpdateItems()` uses `$transaction` for atomic updates | None |

---

## 4. Daily Input Logic Audit

| # | Check | Result | Evidence | Risk |
|---|-------|--------|----------|------|
| 4.1a | Ngày nhập → UTC midnight | ✅ PASS | `parseWorkDate()` uses `Date.UTC(y, m-1, d)` - always midnight UTC | None |
| 4.1b | Query entry dùng `[start, end)` | ✅ PASS | `batchSaveDailyEntries()` L28-30: `gte: start, lt: end` | None |
| 4.1c | `todayWorkDate()` đúng | ⚠️ RISK | Uses `getUTCFullYear/Month/Date`. VN server UTC+7 = OK hiện tại. Nếu deploy UTC server, sẽ bị lệch ngày 0:00-7:00 VN | P2 latent |
| 4.2a | Tạo entry nếu chưa có | ✅ PASS | L106-121: `existingIds.length === 0` → `create` | None |
| 4.2b | Update entry nếu đã có | ✅ PASS | L94-105: `existingIds.length === 1` → `update where: { id }` | None |
| 4.2c | Chống duplicate (2+ entries) | ✅ PASS | L87-92: `existingIds.length > 1` → `throw Error` | None |
| 4.2d | Reload thấy dữ liệu | ✅ PASS | `revalidatePath()` gọi 3 path. `router.refresh()` trên client | None |
| 4.3a | SUBMITTED → status đúng | ✅ PASS | L19: `status = submit ? "SUBMITTED" : "DRAFT"` | None |
| 4.3b | `submittedAt` set đúng | ✅ PASS | L103, L119: `submittedAt: submit ? new Date() : undefined` | None |
| 4.3c | VolumeGuard chặn submit | ✅ PASS | L81-83: `if (submit && !guard.canSubmit) throw Error` | None |
| 4.3d | Quantity âm bị chặn | ✅ PASS | L65: `if (quantity.lessThan(0)) throw Error` | None |
| 4.3e | NaN/Infinity chặn | ✅ PASS | `Number(e.quantity \|\| 0)` + `new Decimal()` sẽ throw nếu invalid | None |
| 4.4a | Lũy kế = trước ngày + hôm nay | ✅ PASS | Daily page L98-108: `cumulativeBeforeMap` = APPROVED entries < today; todayEntriesMap = entries on selected date | None |
| 4.4b | Không cộng double khi update | ✅ PASS | Upsert pattern: 1 entry → update (replace), not create new | None |
| 4.4c | Không tính entry soft-deleted | ✅ PASS | All queries: `deletedAt: null` | None |
| 4.4d | Không tính item soft-deleted | ✅ PASS | Daily queries items: `deletedAt: null` | None |
| 4.4e | Lũy kế chỉ tính APPROVED | ✅ PASS | Daily page L105: `if (entry.status === "APPROVED")` for cumulativeBefore | None |

---

## 5. Summary Calculation Audit

| # | Check | Result | Evidence | Risk |
|---|-------|--------|----------|------|
| 5.1a | Phát sinh kỳ dùng `[fromStart, toEnd)` | ✅ PASS | L60-68: `gte: fromDateRange.start, lt: toDateRange.end` | None |
| 5.1b | Không thiếu ngày cuối kỳ | ✅ PASS | `toDateRange.end` = toDate + 1 day - inclusive of toDate | None |
| 5.1c | Không cộng nhầm ngoài kỳ | ✅ PASS | Range query strictly bounded | None |
| 5.2a | Lũy kế trước kỳ = APPROVED < fromStart | ✅ PASS | L74-85: `status: 'APPROVED', entryDate: { lt: fromDateRange.start }` | None |
| 5.2b | Lũy kế trước kỳ loại soft-deleted | ✅ PASS | L78: `deletedAt: null` | None |
| 5.3a | Lũy kế đến nay = trước kỳ + phát sinh | ✅ PASS | `rollup.ts` L106: `cumulative = cumulativeBefore + periodTotal` | None |
| 5.3b | WORK đúng | ✅ PASS | L93-119: WORK items get direct values from entries | None |
| 5.3c | GROUP roll-up đúng | ✅ PASS | L123-148: `rollup()` sums children designQty, cumBefore, periodTotal, cumulative, dayTotals | None |
| 5.3d | Tổng cha = tổng con | ✅ PASS | GROUP values reset to 0 then sum from children (L125-128, L136-147) | None |
| 5.3e | Tỷ lệ hoàn thành đúng | ✅ PASS | Summary L247: `(cumulative / designQty) * 100` | None |
| 5.3f | Không NaN/Infinity | ✅ PASS | `safeNumber()` in rollup.ts L46-49: returns 0 for NaN/Infinity | None |
| 5.3g | Decimal format đúng | ✅ PASS | `formatQuantity()` uses `Intl.NumberFormat("vi-VN", maxFractionDigits: 4)` | None |
| 5.4a | Dynamic date columns đúng | ✅ PASS | `buildDateColumns()` iterates fromDate to toDate, filters by mode | None |
| 5.4b | Ngày có entry → có số | ✅ PASS | `dayTotals[dateStr]` populated from entries; displayed if > 0 | None |
| 5.4c | Ngày không có → "-" hoặc 0 | ✅ PASS | L297: `dayTotal > 0 ? formatQuantity(dayTotal) : "-"` | None |
| 5.4d | Không lệch timezone | ✅ PASS | `formatWorkDate()` uses UTC consistently | None |

---

## 6. Cross-screen Scenarios

| Scenario | Expected | Actual | Pass/Fail |
|----------|----------|--------|-----------|
| **A — Master → Daily** | Thêm WORK item ở Master → Daily hiển thị | Daily queries `{ deletedAt: null, itemType: "WORK" }` → item mới xuất hiện. `revalidatePath()` triggered | ✅ PASS |
| **B — Master → Summary** | Sửa `designQuantity` → Summary tính lại % | Summary reads designQuantity fresh → rollup recalculates. `revalidatePath()` triggered | ✅ PASS |
| **C — Daily → Summary** | Nhập DRAFT/SUBMITTED → Summary tổng hợp | Summary queries entries by status filter (APPROVED_ONLY or ALL). `revalidatePath()` trên cả 3 path | ✅ PASS |
| **D — Daily update existing** | Cùng item/ngày lần 2 → update, không duplicate | `existingIds.length === 1` → update. `existingIds.length > 1` → throw error | ✅ PASS |
| **E — Delete item** | Soft-delete → Daily/Summary không tính | Tất cả query đều filter `deletedAt: null`. Entries orphan vẫn tồn tại nhưng không hiển thị | ✅ PASS |
| **F — Timezone** | Chọn `2026-06-10` → query đúng [10T00:00Z, 11T00:00Z) | `getWorkDateRange("2026-06-10")` = `{start: 2026-06-10T00:00:00Z, end: 2026-06-11T00:00:00Z}`. Test confirmed | ✅ PASS |
| **G — Volume guard** | >100% no note → SUBMITTED blocked. >110% DRAFT → canSubmit=false. Âm → throw | VolumeGuard test: 10/10 cases pass. Server action enforces `guard.canSubmit` on submit | ✅ PASS |

---

## 7. DB Active Audit

| Nhóm | Count | Status |
|------|------:|--------|
| Active duplicate (itemId + entryDate) | **0** | ✅ Clean |
| Active timezone issues | **0** | ✅ Clean |
| Active orphan entries | **5** | ⚠️ Known — 5 SUBMITTED entries thuộc item đã soft-delete. Không ảnh hưởng hiển thị. Chờ quyết định nghiệp vụ |
| Active over-volume items (>110% all status) | **1** | ⚠️ Info — "Cống hộp 2,5x2m": DRAFT entries tổng 244/120. APPROVED=0 nên không ảnh hưởng lũy kế chính thức |
| Active approved over design | **0** | ✅ Clean |
| Active zero/negative quantity | **3** | ⚠️ Info — 3 entries qty=0. Không ảnh hưởng tính toán (0 cộng vào = 0) |

---

## 8. Test/Build Result

| Command | Result | Note |
|---------|--------|------|
| `npx tsx scripts/qa-field-progress-db-audit.ts` | ✅ PASS | 0 duplicate, 0 timezone, 5 orphan (known), 0 approved over design |
| `npx tsx scripts/qa-field-progress-write-path-test.ts` | ✅ PASS | 5/5 cases pass |
| `npx tsx scripts/qa-field-progress-rollup-test.ts` | ✅ PASS | GROUP roll-up, nested groups, empty items — all correct |
| `npx tsx scripts/qa-work-date-logic-test.ts` | ✅ PASS | 3 dates + 4 boundary checks pass |
| `npx tsx scripts/qa-field-progress-volume-guard-test.ts` | ✅ PASS | 10/10 guard cases pass |
| `npx tsc --noEmit` | ✅ PASS | 0 errors |
| `npm run build` | ✅ PASS | All 24 routes generated, exit code 0 |

---

## 9. Issues Found

| ID | Severity | Screen/Flow | Issue | Risk | Recommended Fix |
|----|----------|-------------|-------|------|-----------------|
| FP-L01 | P2 | Daily | `todayWorkDate()` dùng `getUTCDate()`. Nếu server deploy ở timezone khác VN (e.g., UTC), khoảng 0:00-7:00 VN sẽ trả về ngày hôm trước. Hiện server chạy UTC+7 nên chưa ảnh hưởng | Latent — sẽ bị nếu deploy cloud UTC | Sửa `todayWorkDate()` dùng timezone VN cố định |
| FP-L02 | P3 | DB | 3 entries quantity=0 tồn tại trong DB active. Không ảnh hưởng tính toán nhưng là dữ liệu vô nghĩa | None | Phase sau: thêm validation chặn save qty=0, cleanup 3 entries hiện có |
| FP-L03 | P3 | DB | 5 orphan SUBMITTED entries thuộc item đã soft-delete. Không hiển thị nhưng chiếm DB | None — đã filter by `deletedAt: null` trên item query | Phase sau: quyết định nghiệp vụ (soft-delete entries hoặc giữ lại audit trail) |
| FP-L04 | P3 | DB | 1 item "Cống hộp 2,5x2m" có DRAFT entries tổng 244/120 (>110%). APPROVED=0 nên không ảnh hưởng lũy kế | None — Volume Guard sẽ chặn khi SUBMIT | Đây là dữ liệu test. Cleanup nếu muốn |
| FP-L05 | P2 | Daily | `cumulativeBefore` trong Daily page chỉ tính APPROVED. Nhưng Volume Guard trong `batchSaveDailyEntries` tính `historicalSums` không filter theo status → guard tính cumulative = ALL status. Tạo khác biệt giữa "Đã làm" hiển thị vs guard calculation | Inconsistency — guard conservative hơn display | Cần quyết định nghiệp vụ: guard nên tính ALL status hay chỉ APPROVED? Hiện tại guard tính ALL → conservative hơn → an toàn hơn |

---

## 10. Final Decision

### Có được coi logic dữ liệu 3 màn đã ổn chưa?

> ✅ **CÓ** — Logic dữ liệu giữa 3 màn **đã ổn** cho mục đích test người dùng.

- Tất cả luồng CRUD (Create/Read/Update/Delete) hoạt động đúng
- Dữ liệu liên kết chính xác giữa Master ↔ Daily ↔ Summary
- Tính toán lũy kế, phát sinh, tỷ lệ hoàn thành đều đúng
- Timezone đã xử lý đúng bằng UTC-only date handling
- Duplicate protection hoạt động đúng
- Volume Guard chặn đúng các case vượt KL
- Soft-delete filter đúng ở tất cả query

### Có cần fix logic trước khi cho người dùng test không?

> ⚠️ **KHÔNG BẮT BUỘC** nhưng nên xem xét FP-L05 (guard vs display inconsistency)
>
> FP-L05 không gây lỗi nhưng có thể gây confuse khi user thấy "Đã làm" khác với threshold mà guard kiểm tra. Đây là design decision, không phải bug.

### Những gì để Phase sau?

1. **FP-L01**: Fix `todayWorkDate()` cho deployment UTC (P2, cần fix trước production)
2. **FP-L02**: Cleanup 3 entries qty=0 + thêm validation
3. **FP-L03**: Quyết định nghiệp vụ xử lý 5 orphan SUBMITTED
4. **FP-L04**: Cleanup dữ liệu test
5. **FP-L05**: Quyết định guard tính ALL vs APPROVED-only cho cumulative
