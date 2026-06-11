# FIELD PROGRESS PHASE 1 - TIMEZONE/CACHE FIX REPORT

## 1. File đã sửa

| File | Nội dung sửa |
| --- | --- |
| `src/lib/date/work-date.ts` | Tạo helper chung cho ngày thi công: `parseWorkDate`, `formatWorkDate`, `getWorkDateRange`, `addWorkDays`, `todayWorkDate`. |
| `src/app/(dashboard)/projects/[id]/field-progress/daily/actions.ts` | Lưu và tìm entry theo helper ngày thi công; query theo range `[start, end)`; revalidate thêm màn gốc, daily, summary và layout field-progress. |
| `src/app/(dashboard)/projects/[id]/field-progress/daily/page.tsx` | Đổi ngày mặc định, calendar range, query entry theo ngày, map trạng thái ngày và map entry hôm nay sang helper chung. |
| `src/app/(dashboard)/projects/[id]/field-progress/summary/page.tsx` | Đổi filter `from/to`, lũy kế đến ngày, lũy kế kỳ trước, danh sách ngày có dữ liệu và cột ngày động sang helper chung. |
| `src/lib/field-progress.ts` | Đổi `buildDateColumns` và `groupEntriesByItemAndDate` sang helper chung, bỏ format ngày bằng `toISOString().split("T")[0]`. |
| `scripts/qa-work-date-logic-test.ts` | Thêm script test logic ngày thi công cho 09/06, 10/06, 11/06 và range `[start, end)`. |

## 2. Nguyên nhân lỗi Timezone

Lỗi xảy ra vì code cũ parse input `YYYY-MM-DD` bằng local time:

```ts
new Date(entryDateStr + "T00:00:00")
```

Khi server chạy timezone `+07:00`, giá trị lưu xuống DB/API trở thành UTC của ngày hôm trước, ví dụ `2026-06-10 00:00 +07:00` thành `2026-06-09T17:00:00.000Z`.

Sau đó màn daily/summary lại đọc bằng:

```ts
toISOString().split("T")[0]
```

Vì `toISOString()` luôn là UTC, ngày nghiệp vụ bị lùi sang hôm trước.

## 3. Cách sửa

Quy ước Phase 1:

- UI input vẫn là chuỗi `YYYY-MM-DD`.
- Helper `parseWorkDate("YYYY-MM-DD")` tạo `Date` tại UTC midnight: `YYYY-MM-DDT00:00:00.000Z`.
- Helper `formatWorkDate(date)` đọc bằng UTC getters, không phụ thuộc timezone runtime.
- Query theo ngày luôn dùng range `[start, end)`.
- Summary không dùng `lte: new Date(toDate)` nữa; dùng `entryDate < endOfToDate`.
- Các màn daily/summary và helper field-progress dùng cùng `src/lib/date/work-date.ts`.
- Cache sau khi lưu daily revalidate:
  - `/projects/[projectId]/field-progress`
  - `/projects/[projectId]/field-progress/daily`
  - `/projects/[projectId]/field-progress/summary`
  - `/projects/[projectId]/field-progress` với `type = "layout"`

## 4. Kết quả test

Đã chạy:

```bash
npx tsx scripts/qa-work-date-logic-test.ts
```

Không ghi dữ liệu thật vì Phase 1 không seed lại, không xóa dữ liệu, không thêm migration và server action phụ thuộc session đăng nhập. Test logic xác nhận quy ước DB/API mới và cách daily/summary format lại ngày.

| Ngày test | Nhập ngày | DB/API | Reload daily | Summary | Kết quả |
| --------- | --------- | ------ | ------------ | ------- | ------- |
| `2026-06-09` | `2026-06-09` | `2026-06-09T00:00:00.000Z` đến `< 2026-06-10T00:00:00.000Z` | `2026-06-09` | `2026-06-09` | PASS |
| `2026-06-10` | `2026-06-10` | `2026-06-10T00:00:00.000Z` đến `< 2026-06-11T00:00:00.000Z` | `2026-06-10` | `2026-06-10` | PASS |
| `2026-06-11` | `2026-06-11` | `2026-06-11T00:00:00.000Z` đến `< 2026-06-12T00:00:00.000Z` | `2026-06-11` | `2026-06-11` | PASS |

Kiểm tra bổ sung:

- `git diff --check`: PASS.
- `npm run build`: Turbopack compile app thành công, nhưng bước type-check dừng ở `scripts/qa-field-progress-sync-test.ts` do lỗi có sẵn ngoài phạm vi Phase 1 (`estimatedEndDate` không còn trong Prisma type, thiếu `projectId/createdById` khi create FieldProgressItem).
- `npm run lint`: FAIL do nợ lint có sẵn trong nhiều file/scripts (`no-explicit-any`, `require()` style import, React lint), không sửa trong Phase 1 để tránh lan phạm vi.

## 5. Những việc chưa sửa trong Phase 1

Chưa sửa theo đúng giới hạn Phase 1:

- Roll-up WBS màn Tổng hợp.
- Đồng bộ UI table.
- Unique constraint DB.
- Migration dữ liệu ngày cũ đã lưu theo local midnight.
- Seed lại dữ liệu hoặc xóa dữ liệu.

## 6. Kết luận

- Lỗi lệch ngày cho dữ liệu nhập mới theo quy ước Phase 1: đã hết ở tầng parse, lưu, query và format.
- Nhập khối lượng theo ngày sẽ kéo đúng về Tổng hợp khi entry được lưu theo helper mới và summary dùng cùng `formatWorkDate`.
- Người dùng không cần F5 thủ công sau khi lưu daily vì action đã revalidate các route liên quan và layout field-progress.
- Sẵn sàng sang Phase 2 fix Roll-up WBS sau khi chốt Phase 1.
