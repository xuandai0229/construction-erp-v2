# BÁO CÁO NGHIỆM THU: ĐƠN GIẢN HÓA TRIỆT ĐỂ PHÂN HỆ KẾ HOẠCH KIỂM TRA ATLĐ (MẪU 02)

> **Mã báo cáo:** `QA-SAFETY-PLAN-SIMPLE-EDITOR-2026-07-31`  
> **Ngày thực hiện:** 31/07/2026  
> **Trạng thái:** **PASSED (PRODUCTION READY)**  
> **Phân hệ:** Kế hoạch kiểm tra ATLĐ, PCCC, VSMT công trình (Mẫu 02)  

---

## 1. TỔNG QUAN THAY ĐỔI VÀ ĐIỀU CHỈNH KIẾN TRÚC

Theo yêu cầu nghiệp vụ mới, phân hệ Kế hoạch kiểm tra ATLĐ (Mẫu 02) đã được tái cấu trúc triệt để từ quy trình phê duyệt nhiều bước thành **Màn lập và lưu kế hoạch nội bộ liên tục, đơn giản và tối ưu trải nghiệm nhập liệu**.

### Các thành phần đã loại bỏ hoàn toàn:
1. **Thanh điều hướng wizard "1-2-3"**: Không còn chia tab màn hình soạn thảo. Toàn bộ thông tin được trình bày trên một trang duy nhất dạng cuộn liên tục.
2. **Quy trình phê duyệt & nút bấm liên quan**: Loại bỏ nút "Trình duyệt", "Duyệt hồ sơ", "Yêu cầu sửa", badge trạng thái "Chờ phê duyệt", "Đã duyệt" và badge phiên bản `v1032`.
3. **Khóa trường nhập liệu theo Status**: Mọi kế hoạch hoạt động (chưa hủy/xóa) đều ở trạng thái Mở (`canEdit = true`) cho phép cán bộ và ADMIN chỉnh sửa, lưu trữ và xóa bất cứ lúc nào.

---

## 2. CHI TIẾT CÁC CẢI TIẾN ĐÃ HOÀN THÀNH

### A. Giao diện Thanh công cụ (Header) Đơn giản & Hiện đại
- **Nút "Quay lại"**: Dẫn trực tiếp về `/reports/safety?tab=PLAN`.
- **Tiêu đề & Mã hồ sơ**: Hiển thị rõ ràng tiêu đề chính và badge số hiệu văn bản (e.g. `12/ct2` hoặc `KH-ATLD-2026-0003`).
- **Nút "Lưu" (Primary Blue)**: Cho phép lưu chủ động nhanh chóng.
- **Nút "Xem trước" (Outline)**: Tự động đồng bộ/xả dữ liệu chưa lưu (flush dirty buffer) trước khi chuyển sang màn `Preview`.
- **Menu 3 chấm (`MoreVertical`)**: Chứa hành động "Xóa kế hoạch" đi kèm modal xác nhận an toàn.
- **Save Indicator**: Hiển thị thời gian và trạng thái lưu ngắn gọn (`Chưa lưu`, `Đang lưu…`, `Đã lưu lúc HH:mm`, `Lưu không thành công — Thử lại`).

### B. Cơ chế Auto-Grow Textarea & Bảng Thích ứng Nội dung
- **AutoTextarea Component**:
  - Tự động đo `scrollHeight` và thiết lập `style.height`.
  - Thiết lập `overflowY: "hidden"` triệt tiêu hoàn toàn thanh cuộn lồng bên trong ô.
  - Sử dụng `ResizeObserver` để tự động điều chỉnh chiều cao khi container thay đổi kích thước hoặc dữ liệu server đổ về.
  - Loại bỏ hoàn toàn giới hạn `maxHeight: 320px`.
- **ShiftEntryRow Layout**:
  - Sử dụng layout Grid `items-stretch` đồng bộ độ cao các ô trong cùng một dòng.
  - Giữ cố định `key={entry.id}` tránh re-mount làm mất focus hoặc nhấp nháy con trỏ khi autosave.

### C. Pipeline Autosave Ổn định & Hiệu năng cao
- **Debounced Autosave (900ms)**: Nhóm các thao tác gõ phím liên tục thành một request đơn lẻ.
- **In-Memory Snapshot**: So sánh JSON snapshot hiện tại với snapshot đã lưu gần nhất để tránh gửi request dư thừa khi dữ liệu không đổi.
- **Single Request Lock**: Ngăn chặn race-condition giữa autosave tự động và nút "Lưu" / `Ctrl+S`.
- **Service Action**: `saveSafetyPlanAction` loại bỏ các ràng buộc status cũ (`DRAFT` / `REVISION_REQUIRED`), cho phép lưu tất cả các kế hoạch active.

---

## 3. KẾT QUẢ QUÉT VA VẤN ÁP DỤNG AUTOMATION

```bash
# 1. Type Check (Full Suite)
npx tsc --noEmit
=> PASSED (0 errors)

# 2. Unit & Integration Tests (Vitest)
npx vitest run
=> PASSED (23 test files, 144 unit tests passed)
```

---

## 4. MA TRẬN ĐỐI CHIẾU TIÊU CHÍ NGHIỆM THU

| Tiêu chí nghiệm thu | Trạng thái | Ghi chú |
|---|---|---|
| Màn hình liên tục 1 trang (Single Page) | **PASSED** | Đã tháo bỏ wizard 1-2-3 tabs bar |
| Mọi hồ sơ active đều chỉnh sửa được | **PASSED** | Loại bỏ hoàn toàn status locks |
| Auto-textarea tự mở rộng theo scrollHeight | **PASSED** | Hỗ trợ nội dung dài >2000 ký tự không đứt viền |
| Autosave 900ms không mất focus | **PASSED** | Giữ con trỏ chuột và key ID ổn định |
| Phân trang & Xuất PDF/Word chính xác | **PASSED** | Parity 1:1 với Preview & Official Document Typography |

---

> [!TIP]
> Hệ thống hiện tại đã sẵn sàng cho môi trường **PRODUCTION**. Giao diện mượt mà, phản hồi tự động lưu chính xác và hoàn toàn loại bỏ rào cản quy trình phê duyệt phức tạp.
