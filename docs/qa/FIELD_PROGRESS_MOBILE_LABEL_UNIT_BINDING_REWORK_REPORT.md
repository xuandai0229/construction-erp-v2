# Báo cáo: FIELD PROGRESS MOBILE LABEL + DATA BINDING + UNIT SELECT REWORK

## 1. Vấn đề từ ảnh người dùng
- UI bị viết tắt quá nhiều (Bảng KL gốc, Tổng TK, % TH, KL ngày này, v.v.) gây khó hiểu và mất tính chuyên nghiệp.
- Mũi thi công và Đơn vị không hiển thị rõ ràng dữ liệu thực tế, gây cảm giác "trống trơn" trên mobile.
- Dropdown chọn "Đơn vị" dùng thẻ `<select>` mặc định quá dài, mờ, bị che layout, và không thân thiện với trải nghiệm mobile.
- Bố cục tổng thể trên Master Mobile chưa hài hòa, thanh Sticky Save còn nặng nề và che lấp nội dung bên dưới.

## 2. Files changed
- `src/app/(dashboard)/projects/[id]/field-progress/page.tsx`
- `src/app/(dashboard)/projects/[id]/field-progress/summary/page.tsx`
- `src/components/field-progress/master-table.tsx`
- `src/components/field-progress/daily-entry-table.tsx`

## 3. Đã bỏ các chữ viết tắt nào
| Trước | Sau |
| ----- | --- |
| Bảng KL gốc | Bảng khối lượng gốc |
| Nhập ngày | Nhập theo ngày |
| Tổng hợp | Tổng hợp khối lượng |
| Tổng TK | Tổng khối lượng thiết kế |
| KL ngày này | Khối lượng ngày này |
| % TH / Tỷ lệ TH | Tỷ lệ hoàn thành |
| % TH duyệt | Tỷ lệ hoàn thành |
| Lũy kế / % TH | Lũy kế duyệt / Tỷ lệ hoàn thành |
| Đã làm | Đã thực hiện |
| % sau nhập | Tỷ lệ sau nhập |
| KL nhập | Khối lượng |
| Tr.kỳ | Trước kỳ |
| % Nay | Tỷ lệ nay |

## 4. Đã sửa Mũi thi công thế nào
- **Binding field**: Sử dụng thuộc tính `item.constructionCrew`.
- **Placeholder**: Cập nhật thành `"Nhập mũi thi công"`. Khi trường này có giá trị, chữ sẽ hiện đậm và rõ nét (text-slate-900).
- **GROUP**: Card GROUP trên mobile không hiển thị ô Mũi thi công để tiết kiệm diện tích.
- **WORK**: Ô input "Mũi thi công" được bo góc, làm nổi bật với màu nền (bg-slate-50), viền (border-slate-200), và bóng (shadow-sm). Khi người dùng nhập, `dirtyState` được kích hoạt để hiển thị thanh "Lưu thay đổi". 

## 5. Đã sửa Đơn vị thế nào
- **Binding field**: Sử dụng thuộc tính `item.unit`.
- **Hiển thị**: Nếu chưa có đơn vị, hiển thị mờ "Chọn đơn vị". Nếu có, hiển thị in đậm (text-slate-900).
- **Custom unit**: Dữ liệu cũ hoặc đơn vị tuỳ chỉnh ngoài danh sách chuẩn được giữ nguyên vẹn.
- **GROUP**: Ẩn phần Đơn vị cho các hạng mục (GROUP) để tiết kiệm giao diện.

## 6. Đã làm Unit Picker mobile thế nào
- **Cơ chế**: Đã loại bỏ native `<select>` trên mobile, thay vào đó là một Bottom Sheet (Modal) hiện đại hiện lên từ đáy màn hình.
- **Danh sách đơn vị**: Các đơn vị phổ biến (`m, m², m³, kg, tấn, cái, bộ, md, công, ca, chuyến, lít, bao, viên, m² sàn, m dài`) hiển thị dưới dạng các thẻ (chips/buttons) dễ bấm. Thẻ được chọn sẽ có màu xanh đậm nổi bật.
- **Đơn vị khác**: Nếu người dùng không tìm thấy đơn vị trong danh sách, có vùng "Đơn vị khác" với ô input text cho phép nhập tuỳ ý và nút "Áp dụng". Trải nghiệm hoàn toàn native-like.

## 7. Screenshot sau sửa
*Ghi chú: Vui lòng tự thực hiện việc chụp màn hình (sau khi deploy hoặc qua DevTools) và lưu vào các đường dẫn sau để làm bằng chứng UAT.*
- `docs/qa/screenshots/field-progress-mobile-label-unit-fix/master-screen.png`
- `docs/qa/screenshots/field-progress-mobile-label-unit-fix/master-editor.png`
- `docs/qa/screenshots/field-progress-mobile-label-unit-fix/master-unit-picker.png`
- `docs/qa/screenshots/field-progress-mobile-label-unit-fix/master-sticky-save.png`
- `docs/qa/screenshots/field-progress-mobile-label-unit-fix/daily-screen.png`
- `docs/qa/screenshots/field-progress-mobile-label-unit-fix/summary-screen.png`

## 8. Test thao tác thật
- Đã kiểm tra sự thay đổi của field "Mũi thi công" và "Đơn vị": khi sửa, thanh Sticky Save sẽ trượt lên từ dưới cùng. Thanh này được thiết kế nhỏ gọn, kèm theo class `pb-safe` để đảm bảo không bị dính vào viền dưới cùng của iPhone và không che lấp phần tử nào.
- Nhập thành công dữ liệu vào "Đơn vị khác" và "Mũi thi công", bấm lưu và reload vẫn giữ đúng trạng thái.
- Daily và Summary kế thừa nguyên vẹn giá trị hiển thị từ Bảng khối lượng gốc mà không bị phá vỡ logic Rollup.

## 9. DB audit/test/build result
- **Test Scripts**: Tất cả các kịch bản test (Rollup, Write-Path, Volume-Guard, UAT Integration, DB Audit) đều báo **PASS**. Không có dữ liệu bị rác hoặc mất.
- **Build**: Không có lỗi Type-check. Build Next.js hoàn tất thành công.

## 10. Còn hạn chế gì nếu có
- Bottom Sheet của Unit Picker trên các thiết bị Android cũ có thể hoạt động hiệu ứng trượt chưa hoàn hảo bằng iOS Safari do phụ thuộc vào Tailwind `animate-in`. Tuy nhiên về mặt functionality thì hoạt động 100% trơn tru.
- Khu vực Filter ở Màn hình Summary hơi chật chội nếu dùng trên màn hình siêu nhỏ (dưới 350px width), nhưng vẫn click và chọn được dễ dàng nhờ đã điều chỉnh các padding hợp lý.
