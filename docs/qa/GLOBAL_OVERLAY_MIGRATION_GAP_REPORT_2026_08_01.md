# BÁO CÁO KHOẢNG CÁCH MIGRATION THÀNH PHẦN NỔI (GLOBAL OVERLAY MIGRATION GAP REPORT 2026-08-01)

**Ngày khởi tạo:** 01/08/2026  
**Dự án:** `construction-erp-v2`  

---

## 1. THỐNG KÊ TỔNG QUAN KHOẢNG CÁCH

- **Tổng overlay instance phát hiện:** 533
- **Số instance đã đạt chuẩn:** 89
- **Số instance chưa đạt chuẩn / chưa migrate:** 444
- **Tỷ lệ hoàn thành thực tế:** **16.70%** (89/533)

> [!CAUTION]
> **KẾT LUẬN HIỆN TẠI:** **NO-GO — CHƯA KIỂM CHỨNG TOÀN HỆ THỐNG**  
> Tỷ lệ hoàn thành chưa đạt 100% và các suite Playwright E2E theo từng module chưa được thực thi runtime đầy đủ trên toàn bộ 44 route.

---

## 2. PHÂN TÍCH CHI TIẾT CÁC LỖI TƯƠNG TÁC CÒN TỒN TẠI

1. **Tổng số instance dùng `document.addEventListener` riêng biệt:** 42
2. **Số instance gọi `stopPropagation()` có nguy cơ nuốt event 2-click:** 18
3. **Số instance sử dụng z-index tùy tiện ngoài token (`z-[999]`, `z-[9999]`):** 24
4. **Số modal / drawer chưa có focus management:** 31
5. **Số form drawer / modal chưa có dirty guard:** 15
6. **Số confirm dialog phá hủy có nguy cơ đóng bằng backdrop:** 8
7. **Số overlay chưa tự động đóng khi chuyển route:** 38
8. **Số overlay chưa hỗ trợ phím Escape:** 29
9. **Số overlay chưa hỗ trợ single-click switch:** 444

---

## 3. KẾ HOẠCH HÀNH ĐỘNG MIGRATION

1. Refactor tất cả các components trong `src/components/` (Material Request, Materials, Reports, Safety, Supervision, User Management, Field Progress, Projects) sang `UnifiedActionMenu`, `AppDrawer`, `ConfirmDialog`, `EditableCombobox` và `GlobalOverlayProvider`.
2. Loại bỏ các lệnh `stopPropagation()` gây lỗi 2-click.
3. Chuẩn hóa tất cả z-index về layer tokens (`z-[10]`, `z-[100]`, `z-[200]`, `z-[300]`).
4. Thực thi runtime E2E test suites trên Playwright cho toàn bộ 44 routes và 9 vai trò người dùng.
