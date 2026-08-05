# HR Data Migration Plan — Kế Hoạch Chuyển Đổi Dữ Liệu An Toàn

**Phiên bản:** 1.0.0  
**Tác giả:** Kỹ Sư CSDL & Quản Trị Hệ Thống  
**Trạng thái:** Chính thức  

---

## I. NGUYÊN TẮC MIGRATION AN TOÀN (ADDITIVE MIGRATION)

1. **Additive Only:** Mọi thay đổi Prisma schema ở các Phase đều tuân thủ nguyên tắc Additive (Chỉ thêm bảng, thêm cột optional hoặc nullable, thêm index).
2. **Không Drop Cột/Bảng Trực Tiếp:** Tuyệt đối không `DROP COLUMN` hoặc `DROP TABLE` trong lần đầu chuyển đổi.
3. **Quản Lý Bằng Prisma Migration File:** Mọi thay đổi phải nằm trong `prisma/migrations` có đánh mã checksum rõ ràng.

---

## II. CHI TIẾT QUY TRÌNH MIGRATION 5 BƯỚC

```
[1. Schema Migration (Additive)] ──► [2. Data Backfill Script] ──► [3. Dual-Read / Verification] ──► [4. Production Cutover] ──► [5. Legacy Cleanup (Post-Release)]
```

### Bước 1: Áp Dụng Schema Migration
Chạy `npx prisma migrate deploy` để bổ sung các bảng và cột mới vào PostgreSQL.

### Bước 2: Chạy Script Backfill Dữ Liệu
Đối với các bản ghi cũ chưa có thông tin mới (ví dụ: tạo mã nhân viên cho dữ liệu lịch sử hoặc mã hóa số CCCD thô), thực thi script backfill có cơ chế Idempotent (chạy lại nhiều lần không sinh lỗi).

### Bước 3: Đánh Giá & Đối Soát (Verification)
So sánh số lượng bản ghi trước và sau khi backfill bằng script đối soát độc lập.

### Bước 4: Chuyển Đổi Hệ Thống (Cutover)
Bật các tính năng mới trên giao diện UI và Server Actions.

### Bước 5: Kế Hoạch Hoàn Tác (Rollback Protocol)
Nếu phát hiện sự cố nghiêm trọng trong vòng 24h sau Cutover:
- Restore từ bản Snapshot Database tạo ngay trước bước 1.
- Chuyển ứng dụng về phiên bản Git commit trước đó.
