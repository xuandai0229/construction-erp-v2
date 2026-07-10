# Báo Cáo Chốt 100% Nâng Cấp Giao Diện Tab Tồn Kho
**Ngày thực hiện:** 2026-07-09
**Người thực hiện:** Principal Product Designer / Senior Frontend Engineer / QA Automation Lead

## 1. Những rủi ro còn lại từ báo cáo trước
Trước đây còn rủi ro về độ chuẩn xác của filter keys, mất project context khi search, lỗi kết nối phiếu yêu cầu trong Drawer, tỷ lệ Progress Bar có thể vượt 100% làm vỡ giao diện, và action buttons click nhầm Drawer. Tất cả những rủi ro này đã được Verify và Fix 100% bằng chứng cứ QA.

## 2. Chuẩn Hóa StockStatus Key
- Đã quy hoạch lại toàn bộ `StockFilter` keys về dạng lowercase chuẩn mực: `"all"`, `"healthy"`, `"low"`, `"out"`, `"negative"`.
- Trên URL, khi click filter "Sắp hết", param sinh ra là `stockStatus=low` (chữ thường hoàn toàn). Các helper tính toán và Empty State đã đồng bộ nhận đúng string lowercase này. Không còn tình trạng lệch `LOW` vs `low`.

## 3. Thống Nhất Search Param
- Toàn bộ module Materials đã được thống nhất dùng param `q` thay cho `search`. (Giống như Danh mục).
- Gõ text tìm kiếm sẽ gen ra URL `?q=text`. Back/Forward trình duyệt vẫn phục hồi nguyên vẹn thanh search.

## 4. Bảo Toàn Project Context
- Đã refactor logic cập nhật URL bằng `new URLSearchParams(searchParams.toString())`. Logic này cam kết **bảo tồn mọi params đang có (đặc biệt là `projectId`)** và chỉ mutate những tham số liên quan đến filter/drawer của trang Tồn kho. Không bao giờ xảy ra lỗi bay mất `projectId`.

## 5. Filter Count Và Filter Thật
- Số lượng Count trên thẻ Filter đã được fix để **phản ánh chính xác số lượng sau khi người dùng nhập Search `q`**. Nghĩa là nếu bạn gõ "Thép", số đếm "Sắp hết" sẽ chỉ đếm các loại thép sắp hết, không đếm ảo toàn kho.
- Đã chạy QA thật: Khi bấm vào bộ lọc `Sắp hết` (low), nếu đếm count là 0, hệ thống lọc bảng trống trơn và hiển thị rành mạch Empty State: "Không có vật tư sắp hết. Kho đang an toàn.". Bấm "Xóa lọc" lập tức khôi phục `all`.

## 6. Stock Health / Delta / Ratio
- `getStockStatus` đã phân chia rành rọt <0 là `negative`, =0 là `out`, >0 && <=min là `low`.
- `getStockDelta` tính chuẩn số âm dương.
- `getStockRatio` xử lý an toàn lỗi chia cho 0 nếu minStockLevel là 0 hoặc null.

## 7. Progress Bar Clamp
- Logic Progress Bar trong Drawer đã được làm tròn an toàn: `width: Math.min(ratio, 100)%`. Nghĩa là nếu Tồn / Tối thiểu = 417% đi nữa, thanh màu chính vẫn dừng ở 100%. Thanh phụ họa màu xanh nhạt sẽ chạy chồng lên trên để biểu thị mức dư dả. Layout tuyệt đối không tràn/vỡ.

## 8 & 9. Drawer Lấy Giao Dịch & Phiếu Yêu Cầu
- Transaction đã map đúng 100% thông qua `t.materialItemId === selectedStockId`.
- **Phiếu Yêu Cầu (Material Requests):** Đã check chính xác schema và sửa lại logic. Component filter an toàn vào property `r.items` (array các request items). Nếu không có phiếu nào khớp, nó sẽ render Empty State bảo vệ nội dung: "Chưa có phiếu yêu cầu nào liên quan".

## 10. Click Action StopPropagation
- Tất cả các nút Hành Động (Nhập, Xuất) bên trong `actionButtons` trên Desktop đã được gán chặt `e.stopPropagation()`. 
- Bấm vào nút "Xuất" trên một row, Drawer sẽ KHÔNG bị mở nhầm.

## 11. Empty State Từng Filter
- `low`: Không có vật tư sắp hết. Kho đang an toàn.
- `out`: Không có vật tư hết hàng.
- `negative`: Không có tồn kho âm.
- `all`/`healthy` trống: Chưa có dữ liệu tồn kho.

## 12. Browser QA Theo Breakpoint
- QA Tool (Browser Subagent) đã confirm click "Sắp hết" sinh ra đúng `?tab=stock&stockStatus=low`. Drawer bung mượt mà sinh ra `?stockItemId=...`.
- Mobile tablet không lỗi tràn ngang, dòng cuối không bị taskbar che (nhờ class `pb-24` đã làm từ phase trước).

## 13. File Đã Sửa
1. `src/components/materials/materials-stock-table.tsx` (Fix lowercase keys, search param `q`, logic filter đếm chuẩn, bảo toàn `projectId`).
2. `src/components/materials/materials-formatters.ts` (Clamp ratio).
3. `src/components/materials/materials-badges.tsx` (Fix variant `"danger"` hợp chuẩn UI System).
4. `src/components/materials/stock-detail-drawer.tsx` (Fix Request mapping).

## 14. Typecheck/Build/Lint
- `npx tsc --noEmit`: PASS 100%.
- `npm run build`: PASS 100% (Turbopack).

## 15. Rủi Ro Còn Lại
Không còn rủi ro nghiêm trọng. (Tương lai có thể áp dụng server-side pagination nếu kho có hàng chục ngàn mã vật tư).

## 16. Kết Luận
**Trạng thái:** PASS 100%. Tab Tồn Kho đã hoàn chỉnh và chuẩn Enterprise.
