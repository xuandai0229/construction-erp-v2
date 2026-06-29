    # Báo cáo: Summary Desktop/Laptop Responsive Polish

    ## 1. Lỗi phát hiện từ ảnh UAT cũ

    | # | Lỗi | Mức độ |
    |---|------|--------|
    | 1 | Bảng Desktop quá rộng (>1400px), mỗi ngày phát sinh tạo 1 cột riêng → phá vỡ layout 1366px | **Nghiêm trọng** |
    | 2 | Header bảng 2 tầng (rowSpan=2) với icon Info chen vào chữ "Lũy kế trước kỳ" gây rối | Trung bình |
    | 3 | Sticky column (STT + Hạng mục) sai offset, số liệu dính vào tên công việc | **Nghiêm trọng** |
    | 4 | Header "Tổng khối lượng thiết kế" bị cắt thành "hiết kế" do thiếu không gian | Trung bình |
    | 5 | Page-level horizontal scroll (toàn trang bị trượt ngang) | Trung bình |
    | 6 | Thiếu tính năng Search/Filter nhanh trên Desktop | Nhẹ |
    | 7 | Thiếu nút Chi tiết từng công việc trên Desktop | Nhẹ |

    ## 2. Files đã thay đổi

    | File | Loại thay đổi |
    |------|--------------|
    | `src/app/(dashboard)/projects/[id]/field-progress/summary/page.tsx` | Xóa bỏ toàn bộ bảng inline cũ, thay bằng `SummaryDesktopView` + `SummaryMobileView`. Thêm `overflow-x-hidden` vào page wrapper. |
    | `src/components/field-progress/summary-desktop-view.tsx` | **MỚI** — Client Component chứa bảng Desktop gọn, search/filter, toggle ngày, detail modal. |
    | `scripts/take-screenshots-summary-desktop.ts` | **MỚI** — Playwright script chụp ảnh 1366/1440/1536/1920 + 390 mobile regression. |

    ## 3. Giải pháp Table Layout mới

    ### 3.1 Bảng gọn mặc định (Compact Mode)
    Bảng chính chỉ hiển thị **11 cột cố định** (không có cột ngày riêng lẻ):

    | STT | Hạng mục / Công việc | Mũi thi công | ĐVT | Tổng thiết kế | Trước kỳ | Trong kỳ | Lũy kế | Tỷ lệ | Ngày phát sinh | Chi tiết |
    |-----|----------------------|---------------|-----|---------------|---------|---------|--------|-------|---------------|---------|

    - Cột "Ngày phát sinh" hiển thị dạng chip: `06/06 · 2.222`, `09/06 · 432`, `+2`
    - Tối đa 3 chip, sau đó hiện `+X` cho các ngày còn lại
    - Header đơn tầng (`<thead>` chỉ 1 `<tr>`), không còn rowSpan/colSpan phức tạp
    - Không còn icon Info chen vào header
    - Column widths cố định bằng `<colgroup>` + `table-layout: fixed`
    - `minWidth: 1100px` để bảng fit hầu hết laptop

    ### 3.2 Chế độ chi tiết theo ngày (Toggle)
    Nút toggle **"Xem chi tiết theo ngày"** xuất hiện ở thanh toolbar:
    - Khi bật: các cột `09/06`, `13/06`... xuất hiện thay cho cột "Ngày phát sinh"
    - Bảng tự mở rộng `minWidth = 1100 + N * 100px` 
    - Scroll ngang chỉ diễn ra bên trong `<div className="overflow-x-auto">`, không ảnh hưởng page

    ### 3.3 Xử lý Sticky Columns
    **Quyết định: Loại bỏ hoàn toàn Sticky Columns.** Lý do:
    - Sticky position trên bảng `table-layout: fixed` gây ra bug chồng chữ rất khó debug
    - Bảng compact mode fit được 1366px mà không cần scroll, nên sticky không cần thiết
    - Ưu tiên Data Readability 100% hơn hiệu ứng Sticky

    ## 4. Search/Filter Desktop
    Đã bổ sung thanh công cụ Desktop:
    - **Search bar**: `Tìm công việc, hạng mục, mũi thi công...` (có `id`, `name`, `label.sr-only`, `aria-label`)
    - **5 Chip filters**: `Tất cả | Có phát sinh | Chưa phát sinh | Đã hoàn thành | Vượt khối lượng`
    - Lọc Client-side tức thời, không cần reload page

    ## 5. Detail Modal Desktop
    - Nút `> Xem` ở mỗi dòng công việc (có `aria-label` đầy đủ)
    - Click mở Modal giữa màn hình (`max-w-xl`, `backdrop-blur`)
    - Hiển thị đầy đủ: Tên, Hạng mục, Mũi, ĐVT, Tổng TK, Trước kỳ, Trong kỳ, Lũy kế, Tỷ lệ, Danh sách ngày phát sinh
    - Nút đóng `X` góc phải (có `aria-label="Đóng chi tiết"`)

    ## 6. Accessibility
    - Tất cả `input`, `select` trong form filter đều có `id`, `name`, `label[htmlFor]`
    - Search input Desktop có `label.sr-only` + `aria-label`
    - Nút Back, Lọc, Toggle ngày, Chi tiết, Đóng modal đều có `aria-label`
    - **A11y Audit kết quả**: 2 lỗi phát hiện thuộc về form Login (`#email`, `#password`) — KHÔNG thuộc màn Summary. Màn Summary: **0 lỗi**

    ## 7. Nút đỏ "N Issues"
    Nút đỏ `2 Issues` / `N Issues` hiện ở góc dưới trái là **Next.js Turbopack Dev Overlay**. Chỉ xuất hiện khi chạy `npm run dev`. Khi build Production (`npm run build`), nút này hoàn toàn biến mất. Đây KHÔNG phải component của ứng dụng.

    ## 8. Kết quả Screenshot

    | Viewport | File | Trạng thái |
    |----------|------|-----------|
    | 1366×768 | `summary-desktop-top-1366.png` | ✅ Headers rõ, bảng fit, chip ngày readable |
    | 1366×768 | `summary-desktop-table-1366.png` | ✅ Bảng body hiển thị đầy đủ dữ liệu |
    | 1440×900 | `summary-desktop-table-1440.png` | ✅ Không lỗi layout |
    | 1536×864 | `summary-desktop-table-1536.png` | ✅ Không lỗi layout |
    | 1920×1080 | `summary-desktop-table-1920.png` | ✅ Không lỗi layout |
    | 390×844 | `summary-mobile-regression-390.png` | ✅ Mobile Accordion vẫn hoạt động, không regression |

    Detail Modal đã được xác nhận hoạt động qua Browser Subagent (manual verification) tại 1366×768.

    ## 9. Kết quả Build & Test

    | Test | Kết quả |
    |------|---------|
    | `npx tsc --noEmit` | ✅ Exit code 0 |
    | `npm run build` | ✅ Exit code 0, Compiled successfully |
    | `qa-field-progress-db-audit.ts` | ✅ 0 Active issues |
    | `qa-field-progress-rollup-test.ts` | ✅ All passed |
    | `qa-field-progress-volume-guard-test.ts` | ✅ All passed |
    | `qa-field-progress-uat-integration.ts` | ✅ All 8 cases passed |

    ## 10. Xác nhận không ảnh hưởng Mobile
    - `SummaryMobileView` hoàn toàn tách biệt, sử dụng `md:hidden`
    - `SummaryDesktopView` sử dụng `hidden md:block`
    - Ảnh `summary-mobile-regression-390.png` xác nhận: Accordion hạng mục, Search/Filter chips, Bottom Sheet chi tiết vẫn hoạt động bình thường
