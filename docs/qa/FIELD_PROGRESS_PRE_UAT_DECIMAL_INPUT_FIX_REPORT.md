# FIELD PROGRESS PRE-UAT DECIMAL INPUT FIX REPORT

## 1. Files changed
- `src/components/field-progress/daily-entry-table.tsx`
- `scripts/temp-delete.ts` (script phụ tạm thời để clean data test)

## 2. Đã sửa input Daily từ gì sang gì?
- Thay đổi thuộc tính ô nhập khối lượng và ô nhập khối lượng thiết kế từ `<input type="number" step="any" min="0" />` sang `<input type="text" inputMode="decimal" />`. 
- Thao tác này giúp người dùng trên cả iOS và Android dễ dàng gọi bàn phím số (có hỗ trợ dấu phẩy) và gõ các số thập phân như `1,5` hoặc `1.5` một cách tự nhiên mà không bị trình duyệt chặn hay parse lỗi do sai format số mặc định.

## 3. Cách parse dấu phẩy/dấu chấm
- Đã tạo hàm `parseVietnameseDecimalInput` chuyên dụng:
  - Tự động thay thế dấu phẩy `,` thành dấu chấm `.`.
  - Ép kiểu về `Number()`. 
  - Nếu kết quả là `NaN`, `Infinity` hoặc chuỗi rỗng thì trả về `null`.
  - Khối lượng hợp lệ sau khi parse được sử dụng để kiểm tra rule `VolumeGuard` và lưu xuống DB (đã tự động được cast về chuỗi decimal hợp lệ).

## 4. Danh sách case input đã test
| Raw input  | Tình trạng | Kết quả parse | DB lưu |
| ---------- | ---------- | ------------- | ------ |
| `1.5`      | ✅ Hợp lệ   | `1.5`         | `1.5`  |
| `1,5`      | ✅ Hợp lệ   | `1.5`         | `1.5`  |
| `0.25`     | ✅ Hợp lệ   | `0.25`        | `0.25` |
| `0,25`     | ✅ Hợp lệ   | `0.25`        | `0.25` |
| `2.75`     | ✅ Hợp lệ   | `2.75`        | `2.75` |
| `2,75`     | ✅ Hợp lệ   | `2.75`        | `2.75` |
| `abc`      | 🚫 Khóa    | `null` -> `0` | Invalid (block submit) |
| `1,2,3`    | 🚫 Khóa    | `null` -> `0` | Invalid (block submit) |
| `1.2.3`    | 🚫 Khóa    | `null` -> `0` | Invalid (block submit) |
| `-5`       | 🚫 Khóa    | `-5`          | Chặn do `isNegative = true` |

## 5. VolumeGuard có còn hoạt động không?
**Có.** Bất kỳ giá trị nào sau khi parse (ví dụ `999,5`) đều được đưa vào `VolumeGuard` kiểm tra. Nếu vượt định mức, tuỳ chọn nhập `issueNote` sẽ được bật. Trạng thái hoạt động chặt chẽ như thiết kế ban đầu.

## 6. Số 0 và số âm xử lý thế nào?
- Số `0` được tính là không có phát sinh, soft-delete các bản ghi nếu trước đó có dữ liệu.
- Số âm (VD: `-1.5`) kích hoạt cờ `isNegative = true` trong hàm `getItemMath`, qua đó reset quantity ảo về `0` cho mục đích preview và đồng thời block save, hiển thị đỏ lỗi.

## 7. Bản ghi Active approved over design = 1 là test hay dữ liệu thật?
Đây là dữ liệu test do script QA `qa-field-progress-uat-integration.ts` tạo ra (Item: "Cống hộp 2,5x2,5m Nguyễn Trãi", Design = 222, Total = 489.9). Nó có chứa `issueNote` ghi chú "Vượt 1 chút" (phát sinh tự động từ script test UAT case #5).

## 8. Đã xử lý bản ghi đó chưa?
**Đã xử lý.** Tôi đã tạo script tạm `scripts/temp-delete.ts` để `updateMany` -> `deletedAt: new Date()` (soft-delete) một cách an toàn cho các entry thuộc itemId này mà không làm ảnh hưởng đến tính toàn vẹn của các entry hợp lệ khác.

## 9. DB audit trước/sau
- **Trước khi clean:** `Active over-volume items = 1`
- **Sau khi clean:** `Active over-volume items = 0` (Tất cả DB Active đều đạt trạng thái sạch hoàn hảo 0 - 0 - 0 - 0 - 0).

## 10. Test/build result
- Rollup Test: Pass
- Volume Guard Test: Pass
- Work Date Test: Pass
- Direct Save Test: Pass
- UAT Integration Test: Pass
- TSC Check (`npx tsc --noEmit`): Pass
- NextJS Build (`npm run build`): Pass (Exit code 0).

## 11. Có đủ điều kiện commit UAT baseline không?
**CÓ.** Hệ thống đã triệt tiêu hoàn toàn các lỗi cản trở trải nghiệm người dùng mobile và 100% database active sạch sẽ. Đủ điều kiện vàng để snapshot làm UAT Baseline.
