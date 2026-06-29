# FIELD_PROGRESS_PHASE3_DB_HARDENING_AUDIT_REPORT

## Tóm tắt kết quả

**Database Status:** ⚠️ Không chạy - Không thể thực hiện audit dữ liệu trực tiếp trên DB.
**Audit Scope:** Phân tích Code + Schema Prisma

### Các phát hiện chính:

| Chỉ số | Kết quả | Trạng thái |
|--------|---------|-----------|
| Duplicate entries | Không xác định (DB offline) | ⚠️ Cần kiểm tra khi DB online |
| Timezone mismatches | Không xác định (DB offline) | ⚠️ Cần kiểm tra khi DB online |
| Orphan entries | Không xác định (DB offline) | ⚠️ Cần kiểm tra khi DB online |
| Volume exceeding | Không xác định (DB offline) | ⚠️ Cần kiểm tra khi DB online |
| Code có vấn đề | ✅ Có 1 vấn đề quan trọng | 🔴 Yêu cầu fix |

---

## 1. Phân tích kết quả audit

### 1.1 Có duplicate FieldProgressEntry không?
**Trạng thái:** ⚠️ Không xác định (DB offline)
- Cần chạy audit script khi DB online
- Audit script tạo: `scripts/qa-field-progress-db-audit.ts`

### 1.2 Có dữ liệu lệch timezone cũ không?
**Trạng thái:** ⚠️ Không xác định (DB offline)
- Theo code, `entryDate` luôn được set bằng `start` từ `getWorkDateRange()`
- `getWorkDateRange()` trả về UTC midnight (00:00:00.000Z)
- Code sinh mới từ Phase 1 đã fix timezone, nên **dữ liệu mới không có vấn đề**
- Dữ liệu cũ trước Phase 1 có thể còn lệch

### 1.3 Có orphan entry không?
**Trạng thái:** ⚠️ Không xác định (DB offline)
- Cần chạy audit script khi DB online

### 1.4 Có dữ liệu vượt khối lượng không?
**Trạng thái:** ⚠️ Không xác định (DB offline)
- Cần chạy audit script khi DB online

### 1.5 Có nên thêm unique constraint không?
**Trạng thái:** 🔴 **KHÔNG NÊN - CHƯA**
- Lý do: Phát hiện lỗi quan trọng trong code write path (xem phần 3)
- Cần fix code trước

---

## 2. Schema hiện tại

### 2.1 Model FieldProgressEntry

| Field | Type | Required | Relation | Ghi chú |
|-------|------|----------|----------|---------|
| id | String (cuid) | ✅ | Primary Key | ID duy nhất |
| projectId | String | ✅ | FK Project | Liên kết dự án |
| templateId | String | ✅ | FK FieldProgressTemplate | Liên kết template |
| itemId | String | ✅ | FK FieldProgressItem | Liên kết work item |
| entryDate | DateTime | ✅ | - | UTC midnight 00:00:00.000Z |
| quantity | Decimal(19,4) | ✅ | - | Khối lượng nhập |
| issueNote | String? | ❌ | - | Ghi chú vấn đề |
| proposalNote | String? | ❌ | - | Ghi chú đề xuất |
| note | String? | ❌ | - | Ghi chú chung |
| status | FieldProgressEntryStatus | ✅ | Enum | DRAFT/SUBMITTED/APPROVED/REVISION_REQUESTED/CANCELLED |
| createdById | String | ✅ | FK User | Người tạo |
| submittedAt | DateTime? | ❌ | - | Thời gian submit |
| approvedById | String? | ❌ | FK User | Người duyệt |
| approvedAt | DateTime? | ❌ | - | Thời gian duyệt |
| rejectedReason | String? | ❌ | - | Lý do từ chối |
| createdAt | DateTime | ✅ | - | Auto now() |
| updatedAt | DateTime | ✅ | - | Auto @updatedAt |
| deletedAt | DateTime? | ❌ | - | Soft delete |

### 2.2 Các field phân biệt nhiều dòng trong một ngày

**Trực tiếp trên FieldProgressEntry:**
- Không có field nào phân biệt (constructionCrew, crewId, workShift, location không có)

**Gián tiếp từ FieldProgressItem (qua itemId):**
- `FieldProgressItem.constructionCrew` - Có thể contain tổ dội
- Nhưng **entry không lưu lại** => **entry cùng item/ngày chỉ tính như 1 dòng duy nhất**

### 2.3 Indexes hiện tại

```sql
@@index([projectId])
@@index([templateId])
@@index([itemId])
@@index([entryDate])
```

**Vấn đề:** Không có unique index/constraint

---

## 3. Code ghi dữ liệu hiện tại

### 3.1 File: `src/app/(dashboard)/projects/[id]/field-progress/daily/actions.ts`

#### Luồng lưu dữ liệu: `batchSaveDailyEntries()`

**Bước 1: Parse work date**
```ts
const { start, end } = getWorkDateRange(entryDateStr);
```
- `start` = UTC midnight của ngày (VD: 2026-06-10T00:00:00.000Z)
- `end` = UTC midnight ngày hôm sau (VD: 2026-06-11T00:00:00.000Z)
- Range: [start, end)

**Bước 2: Tìm existing entries cho cùng ngày**
```ts
const existing = await prisma.fieldProgressEntry.findMany({
  where: {
    templateId,
    entryDate: {
      gte: start,
      lt: end,
    },
  },
});
```

**Bước 3: Map itemId -> existing entry ID**
```ts
const existingMap = new Map(existing.map((e) => [e.itemId, e.id]));
```

**🔴 LỖI QUAN TRỌNG:** Map dùng `itemId` làm key, nếu có **nhiều existing entries cùng itemId**, chỉ giữ lại 1 ID cuối cùng

**Bước 4: For each input entry - create hoặc update**
```ts
if (existingId) {
  // UPDATE
  return prisma.fieldProgressEntry.update({...});
} else {
  // CREATE
  return prisma.fieldProgressEntry.create({...});
}
```

**Bước 5: Chạy transaction**
```ts
await prisma.$transaction(operations);
```

#### Các đặc điểm:

| Yếu tố | Giá trị | Ghi chú |
|--------|--------|--------|
| Operation | create/update | Không có upsert |
| Find old entry | itemId only | ❌ Không check constructionCrew/crewId/ca |
| Range | [start, end) | ✅ Chính xác |
| Update field nào | quantity, issueNote, proposalNote, note, status | ❌ Không update entryDate |
| Double submit | ❌ Chưa chặn | ⚠️ Có rủi ro |
| Transaction | ✅ Có | ✅ Tốt |
| Audit log | ✅ Có | ✅ Tốt |
| Status handling | ✅ Phân biệt DRAFT vs SUBMITTED | ✅ Tốt |

---

## 4. Kết quả audit duplicate (Code Analysis)

### 4.1 Phân tích rủi ro duplicate

Theo code, duplicate xảy ra khi:

1. **Nhập lại cùng item + ngày** (User update lại số liệu)
   - ✅ Code xử lý bằng UPDATE

2. **Có TỬA GHI existing entries trước khi nhập mới**
   - ❌ **Code có vấn đề**: Map chỉ giữ ID cuối, nếu có 2+ entries cùng itemId sẽ **mất ID các entry trước**

3. **Direct DB insert bypass code** (migration, API bug cũ)
   - ⚠️ Có thể xảy ra, cần kiểm tra dữ liệu

### 4.2 Scenario rủi ro

```
Lần 1: Create entry (2026-06-10, ITEM-1, qty=10, ID=E1, DRAFT)
Lần 2: Create entry (2026-06-10, ITEM-1, qty=20, ID=E2, DRAFT) <- BUG API cũ
Lần 3: User nhập lại (2026-06-10, ITEM-1, qty=30)
  - findMany trả 2 entries: E1, E2
  - existingMap.set(ITEM-1, E2) <- GHI ĐÈ, chỉ lưu E2
  - UPDATE E2 set qty=30
  - E1 vẫn tồn tại với qty=10 <- DUPLICATE!
```

### 4.3 Báo cáo (cần DB online)

| Trường hợp | Likelihood | Severity | Action |
|-----------|-----------|----------|--------|
| Duplicate từ API cũ | Cao | 🔴 Critical | Kiểm tra, merge nếu có |
| Duplicate từ manual | Thấp | 🟡 Medium | Accept (user nhập lại) |
| Orphan entries | Chưa biết | 🟡 Medium | Kiểm tra khi DB online |

---

## 5. Kết quả audit timezone cũ

### 5.1 Code mới (Phase 1 fix)

```ts
// work-date.ts
export function parseWorkDate(dateStr: string): Date {
  const { year, month, day } = parseDateParts(dateStr);
  return new Date(Date.UTC(year, month - 1, day)); // UTC midnight
}

// actions.ts
const { start, end } = getWorkDateRange(entryDateStr);
const entryDate: start, // Always UTC midnight
```

**Kết luận:** ✅ Dữ liệu mới từ Phase 1 không có lệch timezone

### 5.2 Dữ liệu cũ (trước Phase 1)

| Thời gian | Timezone | Dấu hiệu |
|-----------|----------|---------|
| 17:00:00Z | +07 local | Nếu có entry bắt đầu từ 17:00 |
| 00:00:00Z | ✅ UTC | Đúng |

---

## 6. Kết quả audit orphan data

### 6.1 Loại orphan cần kiểm tra

| Loại | Nguyên nhân | Rủi ro | Fix |
|------|-----------|--------|-----|
| NO_ITEM | itemId không tồn tại | 🔴 Không xem được work | Delete entry hoặc restore item |
| DELETED_ITEM | Item bị soft delete | 🟡 Display issue | Soft delete entry hoặc restore item |
| NO_TEMPLATE | templateId không tồn tại | 🔴 Không xem được template | Delete entry |
| NO_PROJECT | projectId không tồn tại | 🔴 Không xem được project | Delete entry |

---

## 7. Kết quả audit vượt khối lượng

### 7.1 Loại vượt cần kiểm tra

| Loại | Nguyên nhân | Rủi ro | Fix |
|------|-----------|--------|-----|
| APPROVED > designQuantity | Nhập APPROVED quá số | 🔴 Critical | Review, reject, hoặc tăng designQuantity |
| ALL_STATUS > designQuantity x 1.1 | Quá nhiều DRAFT/SUBMITTED | 🟡 Medium | Cảnh báo, review draft |

---

## 8. Đề xuất constraint

### Phương án A: `@@unique([itemId, entryDate])`

**Ưu điểm:**
- ✅ Chặn duplicate cứng ở DB level
- ✅ Simple, dễ hiểu
- ✅ Phù hợp nếu 1 item/ngày chỉ có 1 dòng

**Rủi ro:**
- ❌ Không match nghiệp vụ (có thể nhập nhiều crew/ca/vị trí cùng ngày)
- ❌ Phải xóa entry cũ rồi tạo mới (không thể UPDATE nếu entryDate khác)
- ❌ Sẽ FAIL nếu có duplicate đang tồn tại

**Khi nào dùng:**
- Nghiệp vụ xác định: **1 item/ngày = 1 dòng nhập duy nhất**
- Không có crew/ca/vị trí khác nhau

---

### Phương án B: `@@unique([itemId, entryDate, constructionCrew])`

**Ưu điểm:**
- ✅ Cho phép nhập nhiều crew cùng ngày
- ✅ Chặn duplicate cứng ở DB level
- ✅ Match nghiệp vụ thi công đa crew

**Rủi ro:**
- ❌ FieldProgressEntry không có field constructionCrew
- ❌ Phải thêm field mới vào model
- ❌ Cần migration
- ❌ Phải map constructionCrew từ FieldProgressItem (gián tiếp)

**Khi nào dùng:**
- Nghiệp vụ xác định: **1 item/ngày/crew = 1 dòng**
- Nếu thêm field constructionCrew hoặc crewId vào Entry

---

### Phương án C: Không thêm unique ở Prisma/DB, hardening API

**Ưu điểm:**
- ✅ Linh hoạt với nghiệp vụ thay đổi
- ✅ Không cần migration
- ✅ Cho phép application logic phức tạp (merge quantity, etc.)
- ✅ Audit duplicate bằng script, không enforce cứng
- ✅ Không thêm constraint ở DB, an toàn hơn trong giai đoạn phát triển

**Rủi ro:**
- ❌ Không chặn duplicate ở DB level
- ❌ Phụ thuộc vào code, dễ bypass
- ❌ Maintenance phức tạp

**Cách hardening:**
1. **Sửa code write path** để detect duplicate và reject (KHÔNG thêm `@unique` hay `@@unique`)
2. Code kiểm tra trước insert/update
3. Audit duplicate định kỳ bằng script
4. Fix duplicate thủ công theo business logic khi cần

**Khi nào dùng:**
- Nghiệp vụ chưa chốt rõ
- Cần linh hoạt trong giai đoạn phát triển
- **RECOMMENDED cho Phase 3.0B**

---

### 📊 So sánh 3 phương án

| Phương án | Enforce | Linh hoạt | Migration | Risk | Recommend |
|-----------|---------|-----------|-----------|------|-----------|
| A | Cứng (DB) | Thấp | Có | Cao | ❌ Chưa |
| B | Cứng (DB) | Medium | Có | Medium | ❌ Chưa |
| C | Mềm (Code) | Cao | Không | Thấp | ✅ **Hiện tại** |

---

## 9. Migration plan đề xuất

### 9.1 Phase 3.1 - Fix DB (nếu cần)

#### 3.1.1 Nếu phát hiện duplicate

**A. Kiểm tra loại duplicate**

```
SELECT 
  templateId, itemId, entryDate, COUNT(*) as cnt,
  STRING_AGG(id, ',') as ids,
  STRING_AGG(status, ',') as statuses
FROM FieldProgressEntry
WHERE deletedAt IS NULL
GROUP BY templateId, itemId, entryDate
HAVING COUNT(*) > 1;
```

**B. Merge strategy**

Tuỳ vào status:

1. **Cùng status (VD: cả 2 DRAFT)**
   - Merge quantity cộng lại
   - Merge notes (concat)
   - Delete entry cũ, update entry mới

2. **Khác status (VD: E1=DRAFT, E2=APPROVED)**
   - Giữ E2 (APPROVED), transfer quantity nếu cần
   - Delete E1

3. **Có 1 entry APPROVED, các entry khác DRAFT/SUBMITTED**
   - Xóa entry DRAFT/SUBMITTED
   - Giữ APPROVED

---

## 10. Kết luận

### 10.1 Có được phép thêm constraint chưa?

**Trạng thái: 🔴 KHÔNG - CHƯA**

**Lý do:**
1. ❌ Database offline - không thể audit dữ liệu thực tế
2. ❌ Phát hiện lỗi trong code (Map itemId vấn đề)
3. ❌ Chưa xác định nghiệp vụ rõ ràng (1 dòng hay nhiều crew/ca?)

### 10.2 Nếu có thì nên dùng constraint nào?

**Khuyến nghị: 🟡 Phương án C (Mềm, hardening API)**

**Lý do:**
1. ✅ Hiện tại không rõ nghiệp vụ (1 vs nhiều crew/ca)
2. ✅ Code có bug cần fix (Map itemId)
3. ✅ Audit script đã tạo - kiểm tra duplicate định kỳ
4. ✅ Không cần migration, linh hoạt
5. ✅ Test dễ hơn

### 10.3 Có cần backup DB trước Phase 3.1 không?

**Trạng thái: ✅ CÓ - Khi thực hiện update/delete**

### 10.4 Có dữ liệu nào cần xác nhận thủ công không?

**Trạng thái: ⚠️ CÓ - Nếu phát hiện**

### 10.5 Có được phép sang Phase 3.1 migration/fix DB không?

**Trạng thái: 🟡 CHƯA**

**Checklist trước Phase 3.1:**
- [ ] Database online
- [ ] Run audit script
- [ ] Fix code bug (Map itemId)
- [ ] Xác định rõ ràng nghiệp vụ
- [ ] Chọn constraint strategy

---

## 11. Audit script status

**File:** `scripts/qa-field-progress-db-audit.ts`

**Status:** 🟡 Tạo xong, chưa chạy được (DB offline)

---

**Report generated:** 2026-06-10T10:31:06.575+07:00
**Status:** ⚠️ WAITING FOR DB ONLINE + CODE FIX
