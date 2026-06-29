# Phase 4.2 Manual Browser UAT Confirmation Report

**Document Version:** 1.0
**Module:** `/reports` (Báo cáo hiện trường)
**Phase:** 4.2 - Manual Browser UAT
**Status:** PASS 🟢

## 1. Mục tiêu
Sau khi tự động hóa gặp rủi ro crash trên môi trường giả lập (Phase 4.1), đích thân QA Lead (người dùng thật) đã tiến hành Verify thủ công từng bước nghiệp vụ Approval Workflow trên trình duyệt thật (Chrome/Edge).

## 2. Kết quả Manual Browser UAT
Dưới đây là kết quả UAT do người thật test tay trên `http://localhost:3000/reports`:

1. **Tạo báo cáo nháp:** `[PASS]` — Giao diện hiển thị Status "Nháp" như thiết kế.
2. **F5 vẫn còn báo cáo nháp:** `[PASS]` — State bảo toàn, đọc đúng từ Prisma DB.
3. **Gửi duyệt từ UI:** `[PASS]` — Chuyển trạng thái "Chờ duyệt" chuẩn xác.
4. **Từ chối bắt buộc nhập lý do:** `[PASS]` — Nút gửi bị vô hiệu nếu input rỗng, server cũng đã lock. Drawer history ghi nhận lý do rõ ràng.
5. **Gửi lại sau khi bị từ chối:** `[PASS]` — Luồng hoạt động tốt, quay lại trạng thái chờ duyệt.
6. **Duyệt báo cáo:** `[PASS]` — Báo cáo đã đạt chuẩn "APPROVED".
7. **F5 vẫn giữ status/lịch sử duyệt:** `[PASS]` — History Component hoạt động tốt khi map từ AuditLog qua.
8. **Báo cáo đã duyệt có khóa upload/sửa:** `[PASS]` — Không có nút nào cho phép sửa hay upload tiếp.

## 3. Kiểm tra mã nguồn & Infrastructure Check
Sau khi xác thực tay thành công, bộ QA cũng chạy lại công cụ build/test để đảm bảo không gãy đổ:
- `npx prisma validate` - **PASS**
- `npx prisma generate` - **PASS**
- `npx tsc --noEmit` - **PASS**
- `npx eslint` - **PASS**
- `npm run build` - **PASS**

## H. Kết luận
Nhờ có sự Verify thủ công trên UI người dùng, rủi ro UAT ở Phase 4.1 đã bị xóa sổ.
- **Manual Browser UAT:** `PASS`
- **Phase 4.2:** `PASS`
- **UAT nội bộ:** `GO`
- **Production:** `NO-GO` (Chờ làm nốt phần Backup / Xóa file / RBAC cấp công trình cho hoàn mỹ).
- **Chuyển sang Phase 5:** HOÀN TOÀN ĐƯỢC PHÉP.
- Xác nhận không reset database, không commit/push mã nguồn, không làm mất bất kỳ dữ liệu nào.
