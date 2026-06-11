# BÁO CÁO KIỂM TRA UI/UX - DATABASE - TABLE - LOGIC KHỐI LƯỢNG THI CÔNG

## 1. Tóm tắt kết quả
- **Tổng số màn đã kiểm tra**: 3 (Bảng khối lượng gốc, Nhập theo ngày, Tổng hợp)
- **Tổng số API/file đã đọc**: 6 (page.tsx, actions.ts, master-table.tsx, daily-entry-table.tsx, schema.prisma, lib/field-progress.ts)
- **Tổng số bảng/model database đã kiểm tra**: 3 (FieldProgressTemplate, FieldProgressItem, FieldProgressEntry)
- **Tổng số lỗi Critical/High/Medium/Low**: 2 Critical, 1 High, 3 Medium, 2 Low
- **Kết luận nhanh**: Hệ thống CÓ LỖI NGHIÊM TRỌNG về Timezone khiến dữ liệu nhập theo ngày bị mất hoặc lệch ngày. Bảng Tổng hợp chưa làm roll-up theo hạng mục cha. UI 3 bảng đang thiếu đồng bộ hoàn toàn. TUYỆT ĐỐI CHƯA FIX CODE, cần chốt phương án trước.

## 2. Phạm vi kiểm tra
- **Màn hình**: `/projects/[id]/field-progress`, `/projects/[id]/field-progress/daily`, `/projects/[id]/field-progress/summary`
- **Component**: `master-table.tsx`, `daily-entry-table.tsx`
- **Database Model**: `FieldProgressTemplate`, `FieldProgressItem`, `FieldProgressEntry`
- **Library**: `lib/field-progress.ts`

## 3. Kết quả kiểm tra UI/UX

| Màn hình | Vấn đề UI/UX | Mức độ | File nghi ngờ | Đề xuất sửa |
| -------- | ------------ | ------ | ------------- | ----------- |
| Cả 3 màn | 3 màn có 3 style table, width cột, và màu sắc khác nhau hoàn toàn. | Medium | Các component table | Tạo 1 chuẩn chung về width cho các cột dùng chung (STT, Công việc, Mũi, Đơn vị, Khối lượng). |
| Tổng hợp | Chỉ hiển thị công việc (WORK), không hiển thị dòng hạng mục (GROUP), nhìn rất lộn xộn, mất cấu trúc WBS. | High | `summary/page.tsx` | Cần flatten tree có cả GROUP và WORK, làm style row cho GROUP giống Master Table. |
| Nhập theo ngày | Responsive trên mobile dùng card view khá tốt, nhưng desktop lại dùng `%` cho width cột dẫn đến bảng có thể co giãn bất hợp lý trên màn hình lớn. | Low | `daily-entry-table.tsx` | Chuyển width sang `px` hoặc `min-w` cố định cho các cột số lượng. |
| Bảng gốc | Nút "Thêm công việc" nhỏ, chưa nổi bật. Cột Ghi chú để `input` nền trắng có thể gây rối mắt. | Low | `master-table.tsx` | Chỉnh lại padding/style input. |

## 4. Kết quả kiểm tra database

| Model/Bảng | Vai trò | Quan hệ | Vấn đề phát hiện | Rủi ro | Đề xuất |
| ---------- | ------- | ------- | ---------------- | ------ | ------- |
| `FieldProgressEntry` | Lưu dữ liệu nhập từng ngày của từng Item | `itemId`, `templateId` | **Thiếu Unique Constraint** cho `[itemId, entryDate]`. | Có thể bị duplicate bản ghi cùng 1 item trong cùng 1 ngày nếu có race condition. | Thêm `@@unique([itemId, entryDate])` (nhưng cần cẩn thận vì `entryDate` đang dính lỗi timezone). |
| `FieldProgressItem` | WBS/Hạng mục/Công việc | `parentId`, `templateId` | Kiểu dữ liệu `designQuantity` là Decimal (Tốt). Không có vấn đề nghiêm trọng. | Không có rủi ro lớn. | Giữ nguyên. |

## 5. Kết quả kiểm tra table và tỷ lệ bảng

| Màn hình | Table component/file | Column width hiện tại | Vấn đề | Có đồng bộ không | Đề xuất chuẩn hóa |
| -------- | -------------------- | --------------------- | ------ | ---------------- | ----------------- |
| Bảng gốc | `master-table.tsx` | Fixed width (`w-12`, `min-w-[180px]`, `w-[80px]`, ...) | Dùng fixed width tốt, dễ kiểm soát. | **Không** | Dùng width này làm chuẩn. |
| Nhập ngày| `daily-entry-table.tsx` | Percentage width (`w-[9%]`, `w-[13%]`, ...) | Dễ vỡ layout khi màn hình thay đổi. | **Không** | Chuyển sang fixed width/min-w. |
| Tổng hợp | `summary/page.tsx` | Implicit/max-width (`max-w-[250px]`) | Không đồng đều, không thẳng cột với 2 bảng kia. | **Không** | Áp dụng fixed width. |

**Đề xuất chuẩn table thống nhất:**
- STT: `w-[50px]`, căn giữa.
- Nội dung: `min-w-[250px]`, căn trái.
- Mũi thi công: `w-[120px]`, căn giữa.
- Đơn vị: `w-[80px]`, căn giữa.
- Các cột khối lượng (Thiết kế, Lũy kế, Ngày): `w-[120px]`, căn phải, số format `maxFractionDigits: 4`.
- % TH: `w-[80px]`, căn phải/giữa.

## 6. Kết quả kiểm tra logic liên kết dữ liệu

**Luồng dữ liệu thực tế đang chạy đúng logic:**
`Project` → `Template` → `Items (Bảng gốc)` → `Entries (Nhập theo ngày)` → `Summary / Master (Tổng hợp / Lũy kế)`.

| Luồng nghiệp vụ | Kết quả mong đợi | Kết quả thực tế | Đúng/Sai | File/API liên quan | Ghi chú |
| --------------- | ---------------- | --------------- | -------- | ------------------ | ------- |
| Lấy lũy kế Bảng gốc | Chỉ tính APPROVED | Chỉ tính APPROVED | **Đúng** | `lib/field-progress.ts` | |
| Lấy dữ liệu Tổng hợp| Group từ Entries | Truy vấn trực tiếp từ `FieldProgressEntry` | **Đúng** | `summary/page.tsx` | Dữ liệu kéo về trực tiếp, không qua cache trung gian. |
| Cache/Invalidate | Cập nhật ngay | Chỉ invalidate `daily` khi nhập ngày | **Thiếu sót**| `actions.ts` | Cần `revalidatePath('/projects/[id]/field-progress', 'layout')` để update toàn bộ. |

## 7. Kết quả kiểm tra logic tính toán

1. **Khối lượng lũy kế**: Tính bằng tổng `quantity` các dòng `FieldProgressEntry`. **ĐÚNG**.
2. **Khối lượng còn lại**: UI không hiển thị số tuyệt đối, chỉ cảnh báo "Vượt KL" nếu Lũy kế > Thiết kế. **CHẤP NHẬN ĐƯỢC**.
3. **Tỷ lệ %**: Tính đúng công thức `(cum / dq) * 100`.
4. **Không cho nhập âm**: Frontend có check báo đỏ, API có ném lỗi `Khối lượng không được âm`. **ĐÚNG**.
5. **Tổng theo hạng mục cha**: Bảng gốc **CÓ** roll-up. Bảng Tổng hợp **KHÔNG CÓ** roll-up (lỗi High).

## 8. Kết quả kiểm tra màn Nhập khối lượng theo ngày

**Dữ liệu được nhập ở màn Nhập khối lượng theo ngày có được kéo về màn Tổng hợp khối lượng thi công không?**
- **CÓ**. Kéo về trực tiếp bằng lệnh `prisma.fieldProgressEntry.findMany` và `groupBy`.
- **LỖI NGHIÊM TRỌNG (CRITICAL - TIMEZONE)**:
  - Khi lưu, `actions.ts` dùng `new Date(entryDateStr + "T00:00:00")`. Lệnh này tạo Date theo Local Time (ví dụ +07:00). Lưu xuống DB thành `YYYY-MM-DDT17:00:00Z` của ngày hôm trước.
  - Khi đọc lên, `daily/page.tsx` và `summary/page.tsx` lại cắt chuỗi `.toISOString().split('T')[0]` từ chuỗi UTC `17:00:00Z`, dẫn đến ngày bị lùi 1 ngày so với giao diện người dùng.
  - **Hệ quả**: Nhập hôm nay, load lại bị mất (chuyển sang ngày hôm qua). Hoặc Tổng hợp hiển thị sai cột ngày.

## 9. Kết quả kiểm tra Bảng khối lượng gốc

- **Vai trò**: Là nguồn dữ liệu (WBS) lưu trong `FieldProgressItem`.
- Bảng này là NGUỒN DUY NHẤT để 2 màn còn lại mapping ID.
- Nếu thêm item gốc: Màn nhập ngày sẽ hiện.
- Nếu sửa item gốc: Các màn sẽ cập nhật ngay vì query trực tiếp.
- Nếu xóa item gốc: Code đang dùng **Soft Delete** (`deletedAt`). Các query ở màn nhập ngày và tổng hợp đều có `deletedAt: null`, nên xóa ở gốc sẽ làm mất luôn ở 2 màn kia. **Rủi ro**: Mất dữ liệu nhập ngày nếu lỡ tay xóa. API có cảnh báo JS nhưng chưa chặn cứng backend.

## 10. Danh sách lỗi cần fix

| STT | Nhóm lỗi | Mức độ | Mô tả | File/API nghi ngờ | Cách fix đề xuất | Rủi ro |
| --- | -------- | ------ | ----- | ----------------- | ---------------- | ------ |
| 1 | Logic/Data | **Critical** | Lỗi Timezone lùi 1 ngày khi lưu/hiển thị. | `daily/actions.ts`, `daily/page.tsx`, `summary/page.tsx` | Chuẩn hóa dùng `yyyy-mm-dd` string hoặc parse UTC midnight đồng nhất toàn app. | Có thể làm sai số liệu cũ nếu đã có. |
| 2 | Logic/UI | **High** | Bảng Tổng hợp không hiển thị Hạng mục cha (GROUP) và không có roll-up tổng. | `summary/page.tsx` | Áp dụng hàm `flattenTreeForTable` và `calculateParentRollup` như bên Master Table. | Dễ vỡ giao diện bảng Tổng hợp vì đang có nhiều cột động. |
| 3 | Cache | **Medium** | Revalidate cache chưa cover hết các màn. | `daily/actions.ts` | Đổi sang revalidate layout `field-progress`. | Không |
| 4 | Database | **Medium** | Thiếu ràng buộc Unique chặn nhập đúp cùng ngày. | `schema.prisma` | Thêm `@@unique([itemId, entryDate])` nếu nghiệp vụ 1 ngày chỉ 1 bản ghi. | Cần clear dữ liệu rác trước khi push DB. |
| 5 | UI/UX | **Medium** | 3 bảng 3 tỷ lệ cột khác nhau hoàn toàn. | `master-table`, `daily-entry-table`, `summary` | Tạo file chuẩn hóa width hoặc áp dụng CSS classes thống nhất. | Không |

## 11. Đề xuất thứ tự fix

- **Bước 1**: Fix lỗi Timezone Critical ngay lập tức. Đây là lỗi phá hủy luồng dữ liệu. Sửa cách parse Date ở API và cách format hiển thị ở frontend.
- **Bước 2**: Fix bảng Tổng hợp (thêm dòng Hạng mục cha và roll-up).
- **Bước 3**: Chuẩn hóa Table Column Widths cho cả 3 màn.
- **Bước 4**: Thêm Unique Constraint DB & revalidate cache.

## 12. Kết luận
Hệ thống có nền tảng model đúng, relations đúng, query rollup cơ bản đã chạy đúng. Tuy nhiên vướng lỗi Timezone kinh điển của JS và thiếu sót trong hiển thị Tree/WBS ở màn Tổng hợp. Cần fix ngay Bước 1 và 2 trước khi user nhập liệu thực tế. KHÔNG CẦN BACKUP DB NẾU CHƯA CÓ DATA THỰC. Đã sẵn sàng chuyển sang giai đoạn FIX.
