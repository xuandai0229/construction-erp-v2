# FIELD PROGRESS PHASE 3.2D — FIX FP-L01 + CHỐT FP-L05 REPORT

**Date:** 2026-06-11  
**Phase:** 3.2D — Fix todayWorkDate timezone + Guard/Display consistency  
**Scope:** 2 issues from Cross-Screen Audit (FP-L01, FP-L05)

---

## 1. Files Changed

| File | Change |
|------|--------|
| `src/lib/date/work-date.ts` | **FP-L01**: `todayWorkDate()` — sử dụng `Intl.DateTimeFormat` với timezone `Asia/Ho_Chi_Minh` |
| `src/app/(dashboard)/projects/[id]/field-progress/daily/actions.ts` | **FP-L05**: Guard `historicalSums` query — thêm `status: "APPROVED"` |
| `scripts/qa-work-date-logic-test.ts` | Thêm 4 timezone test cases + round-trip verification |
| `scripts/qa-field-progress-volume-guard-test.ts` | Thêm 3 FP-L05 consistency test cases |
| `scripts/qa-field-progress-guard-consistency-test.ts` | **NEW** — Test mô phỏng server action logic, 3 scenarios |

---

## 2. FP-L01 Fix — todayWorkDate() timezone Việt Nam

### Trước đây (rủi ro)

```ts
export function todayWorkDate(): string {
  return formatWorkDate(new Date());
}
```

`formatWorkDate()` dùng `getUTCFullYear/Month/Date`. Trên server UTC+7 → đúng. Nhưng **nếu server chạy UTC** (Docker, cloud, VPS), khoảng **0:00–7:00 VN** (= 17:00–24:00 UTC hôm trước), `todayWorkDate()` sẽ **trả về ngày hôm trước**.

### Đã sửa

```ts
export function todayWorkDate(now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(now);
}
```

- `en-CA` locale → output format `YYYY-MM-DD` (ISO format)
- `timeZone: "Asia/Ho_Chi_Minh"` → luôn lấy ngày VN, không phụ thuộc timezone server
- `now` parameter → cho phép test deterministic
- Không ảnh hưởng `parseWorkDate()`, `formatWorkDate()`, `getWorkDateRange()` — tất cả vẫn dùng UTC

### Test cases chứng minh

| Case | UTC Input | VN Time | Expected | Result |
|------|-----------|---------|----------|--------|
| 1 — VN early morning | `2026-06-10T18:30:00Z` | `2026-06-11 01:30` | `2026-06-11` | ✅ PASS |
| 2 — VN daytime | `2026-06-11T02:00:00Z` | `2026-06-11 09:00` | `2026-06-11` | ✅ PASS |
| 3 — VN late night | `2026-06-11T16:59:00Z` | `2026-06-11 23:59` | `2026-06-11` | ✅ PASS |
| 4 — VN next day | `2026-06-11T17:00:00Z` | `2026-06-12 00:00` | `2026-06-12` | ✅ PASS |

Round-trip test: `todayWorkDate()` → `parseWorkDate()` → `formatWorkDate()` → same string ✅

---

## 3. FP-L05 Decision — Guard dùng APPROVED-only

### Quyết định nghiệp vụ

```
Volume Guard cumulativeBefore dùng APPROVED-only
để đồng bộ với Daily display.
```

### Lý do

| Yếu tố | Giải thích |
|---------|------------|
| **Daily display** | Cột "Đã làm" chỉ tính APPROVED |
| **Summary lũy kế trước kỳ** | Chỉ tính APPROVED |
| **Master lũy kế** | Chỉ tính APPROVED |
| **Tránh confuse** | User thấy "Đã làm = 60", nhập thêm 30 → UI hiện 90% OK → nhưng guard cũ tính ALL = 110+30 = 140% → BLOCK → confuse |
| **An toàn** | DRAFT/SUBMITTED chưa được xác nhận → không nên block lần nhập tiếp |

### Phase sau có thể bổ sung

> Phase sau có thể thêm chế độ hiển thị "Bao gồm nháp/gửi chờ duyệt" để guard và UI cùng một hệ quy chiếu. Không triển khai trong phase này.

---

## 4. Server Action Change

### Trước

```ts
// Fetch cumulative before today (deletedAt: null)
const historicalSums = await prisma.fieldProgressEntry.groupBy({
  by: ["itemId"],
  where: {
    itemId: { in: itemIds },
    deletedAt: null,
    entryDate: { lt: start }
  },
  _sum: { quantity: true }
});
```

→ Tính ALL active entries (DRAFT + SUBMITTED + APPROVED) trước ngày

### Sau

```ts
// Fetch cumulative before today (APPROVED only — matches Daily display)
const historicalSums = await prisma.fieldProgressEntry.groupBy({
  by: ["itemId"],
  where: {
    itemId: { in: itemIds },
    deletedAt: null,
    status: "APPROVED",
    entryDate: { lt: start }
  },
  _sum: { quantity: true }
});
```

→ Chỉ tính APPROVED entries trước ngày — giống cột "Đã làm" trên Daily

### Không đổi

- DRAFT/SUBMITTED status logic → giữ nguyên
- Upsert pattern (0→create, 1→update, 2+→error) → giữ nguyên
- Rollup helper → giữ nguyên
- Volume Guard helper function → giữ nguyên
- DB schema → giữ nguyên
- Prisma schema → giữ nguyên

---

## 5. Test Results

| Test | Result | Note |
|------|--------|------|
| `qa-work-date-logic-test.ts` | ✅ PASS | 3 date range + 4 boundary + 4 timezone + 1 round-trip |
| `qa-field-progress-volume-guard-test.ts` | ✅ PASS | 10 original + 3 FP-L05 consistency = 13 cases |
| `qa-field-progress-guard-consistency-test.ts` | ✅ PASS | 3 scenarios (APPROVED-only, soft-delete, display match) |
| `qa-field-progress-db-audit.ts` | ✅ PASS | 0 dup, 0 tz, 5 orphan (known), 0 approved over design |
| `qa-field-progress-write-path-test.ts` | ✅ PASS | 5/5 cases |
| `qa-field-progress-rollup-test.ts` | ✅ PASS | All rollup assertions pass |
| `tsc --noEmit` | ✅ PASS | 0 errors |
| `npm run build` | ✅ PASS | Exit code 0, all 24 routes generated |

---

## 6. Not Done

Chỉ xử lý FP-L01 và FP-L05. Không làm:

- ❌ Chưa xử lý 5 orphan SUBMITTED (chờ quyết định nghiệp vụ)
- ❌ Chưa cleanup 3 entries qty=0
- ❌ Chưa thêm unique constraint
- ❌ Chưa migration DB
- ❌ Chưa UI/UX polish
- ❌ Chưa responsive/mobile
- ❌ Chưa performance optimization
- ❌ Chưa sửa schema Prisma
- ❌ Chưa thêm manager approval flow

---

## 7. Final Decision

### FP-L01 đã hết rủi ro lệch ngày chưa?

> ✅ **ĐÃ HẾT** — `todayWorkDate()` luôn trả đúng ngày Việt Nam dù server chạy UTC, UTC+7, hay bất kỳ timezone nào. Đã chứng minh bằng 4 test cases bao phủ ranh giới ngày VN.

### FP-L05 còn gây hiểu nhầm guard/display không?

> ✅ **KHÔNG CÒN** — Guard và Daily display cùng dùng APPROVED-only cumulative. User thấy "Đã làm = X" trên UI → guard cũng dùng X → threshold nhất quán.

### Có được cho người dùng test nội bộ 3 màn chưa?

> ✅ **CÓ** — Tất cả logic dữ liệu đã ổn, không còn inconsistency giữa UI và server validation. Test/build pass toàn bộ. Sẵn sàng cho user testing.
