# BÁO CÁO HOÀN TẤT PHASE 2 - ROLL-UP WBS VÀ CHUẨN HÓA TABLE

## 1. File đã sửa
- **Tạo mới**: `src/app/(dashboard)/projects/[id]/field-progress/_components/table-styles.ts` (Lưu trữ các class và thông số width dùng chung cho cả 3 bảng).
- **Cập nhật**: `src/app/(dashboard)/projects/[id]/field-progress/summary/page.tsx` (Viết lại logic tính toán roll-up WBS và map lại giao diện bảng Tổng hợp).
- **Cập nhật**: `src/components/field-progress/master-table.tsx` (Gộp cột Hạng mục/Công việc, áp dụng CSS width dùng chung).
- **Cập nhật**: `src/components/field-progress/daily-entry-table.tsx` (Thêm cột Đơn vị, áp dụng CSS width dùng chung).

## 2. Roll-up WBS đã sửa thế nào?
- **Trước đây**: Màn hình Tổng hợp chỉ fetch `itemType: "WORK"` và dùng vòng lặp một chiều.
- **Hiện tại**: 
  1. Fetch toàn bộ `items` kể cả `GROUP`.
  2. Tạo `itemDataMap` để tính `periodTotal`, `cumulativeBefore` và `cumulative` cho tất cả các nút `WORK`.
  3. Dùng hàm `buildTreeItems` để dựng cây WBS nguyên bản.
  4. Duyệt đệ quy cây WBS (`calculateTreeRollup`) để cuộn (roll-up) tổng từ các nút `WORK` lên các nút `GROUP` cha cho các tham số: `designQty`, `cumulativeBefore`, `periodTotal`, `cumulative`, và `dayTotals` (tổng cho từng ngày động).
  5. Dùng `flattenTreeForTable` để trải phẳng mảng và render ra UI với thụt lề (indent) chuẩn.

## 3. Table đã chuẩn hóa thế nào?
- Tạo hằng số `sharedTableStyles` quy định chặt chẽ width của 12 loại cột phổ biến (STT, Content, Crew, Unit, DesignQty, DayQty, Cumulative, Remaining, Percent, Notes, Action).
- Loại bỏ các thông số mix tạp như `w-[9%]`, `max-w-[250px]`, `w-12`. Thay bằng các thông số fixed như `min-w-[280px]`, `w-[130px]`.
- Ở màn hình **Bảng khối lượng gốc (Master)**: Đã gộp 2 cột "Nội dung hạng mục" và "Nội dung công việc" thành 1 cột "Nội dung công việc / Hạng mục" tương tự như màn Tổng hợp và Nhập ngày, nhưng vẫn giữ nguyên form nhập liệu linh hoạt khi thao tác.
- Ở màn hình **Nhập khối lượng theo ngày (Daily)**: Bổ sung thêm cột `Đơn vị` trên giao diện Desktop (trước đây bị ẩn đi).
- Căn chỉnh text: Số luôn căn phải (`text-right`), Text căn trái (`text-left`), Mũi và Trạng thái căn giữa (`text-center`). Số thập phân được giữ tối đa 4 chữ số (thông qua `formatQuantity`).

## 4. Kết quả test

| Test | Kết quả | Ghi chú |
| ---- | ------- | ------- |
| Test 1: Roll-up GROUP | **PASS** | `designQty`, `cumulative` và tổng ngày phát sinh của hạng mục cha đã tính tự động bằng tổng các công việc con. Không xuất hiện lỗi NaN hay Infinity khi thiết kế = 0. |
| Test 2: Tree/WBS display | **PASS** | Các dòng GROUP đã xuất hiện, có in đậm và background xám nhẹ `bg-slate-50`. Công việc con thụt lề chuẩn xác theo level. |
| Test 3: Đồng bộ table | **PASS** | Header 3 bảng có chung class xám `bg-slate-50`, cùng style hover, cột số thẳng hàng dọc. Cùng tỉ lệ width, không bị giật lag layout giữa các màn. |
| Test 4: Không phá Phase 1 | **PASS** | Màn Tổng hợp vẫn giữ nguyên các hàm xử lý Timezone và hiển thị ngày an toàn từ thư viện `lib/date/work-date.ts`. Khớp 100% logic Phase 1. |

## 5. Những việc chưa sửa
- **Unique constraint DB**: Vẫn chưa đụng vào `schema.prisma`. Sẽ làm ở Phase 3 nếu được yêu cầu.
- **Migration dữ liệu ngày cũ**: Chưa chạy script dọn dẹp dữ liệu cũ bị lệch.
- **Lỗi Lint ngoài phạm vi**: Có lỗi lint tại file `scripts/qa-field-progress-sync-test.ts` (không liên quan mã nguồn ứng dụng trực tiếp) chưa được dọn dẹp.
- **Các module kế toán**: Giữ nguyên không đụng chạm.

## 6. Kết luận
- **Màn Tổng hợp đã có WBS cha-con chưa?**: **ĐÃ CÓ**. Hiển thị cực kỳ rõ ràng, giống hệt form Excel báo cáo thực tế.
- **GROUP đã roll-up đúng chưa?**: **ĐÚNG**. Thuật toán đệ quy tính chính xác từng ngày và số lũy kế.
- **3 bảng đã đồng bộ tỉ lệ/cột/style chưa?**: **ĐÃ ĐỒNG BỘ**. Dùng chung 1 file style `table-styles.ts`.
- **Phase 1 timezone có bị phá không?**: **KHÔNG**. Không hề chỉnh sửa các block khai báo Date/Time.
- **Sẵn sàng sang Phase 3 chưa?**: **SẴN SÀNG**. Nền tảng UI/Logic hiển thị đã vững chắc để áp dụng các constraint khắt khe nhất của database.
