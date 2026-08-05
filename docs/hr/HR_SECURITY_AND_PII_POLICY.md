# HR Security & PII Policy — Chính Sách An Ninh & Bảo Vệ Dữ Liệu Nhạy Cảm Cá Nhân

**Phiên bản:** 1.1.0  
**Tác giả:** Chuyên Gia Bảo Mật Dữ Liệu Nhân Sự  
**Trạng thái Kiểm toán:** VERIFIED CURRENT  

---

## I. MỤC TIÊU BẢO VỆ NGUYÊN TẮC AN NINH HỆ THỐNG HR

Dữ liệu nhân sự chứa thông tin cá nhân nhạy cảm (PII - Personally Identifiable Information). Việc lộ rò rỉ dữ liệu PII vi phạm nghiêm trọng các quy định pháp luật và an toàn thông tin doanh nghiệp.

### Các Nguyên Tắc An Ninh Bắt Buộc:
1. **Mã Hóa Khi Lưu Trữ (Encryption at Rest):** CCCD/CMND bắt buộc phải mã hóa bằng thuật toán AES-256-GCM trước khi lưu DB.
2. **Blind Index Tra Cứu Trùng Lập:** Sử dụng HMAC-SHA256 để tìm kiếm chính xác mà không cần giải mã toàn bộ dữ liệu.
3. **Che Dấu Trên Giao Diện (UI Masking):** Trên Client UI mặc định chỉ hiển thị 4 số cuối dạng `********1234`.
4. **Không Truyền Plaintext Hay Key Xuống Client:** Client Component chỉ nhận `maskedIdentityNumber` hoặc `identityNumberLastDigits`.
5. **Ghi Log Kiểm Toán Khi Giải Mã (Reveal Audit Log):** Mọi hành động giải mã xem chi tiết CCCD bắt buộc phải ghi log `VIEW_SENSITIVE_IDENTITY_NUMBER`.

---

## II. CHI TIẾT KỸ THUẬT MÃ HÓA PII (`pii-encryption.ts`)

- **Thuật toán mã hóa:** `AES-256-GCM`
- **Khóa mã hóa:** 256 bits (32 bytes derived SHA-256 từ `HR_PII_ENCRYPTION_KEY`).
- **Vector khởi tạo (IV):** 12 bytes ngẫu nhiên cho mỗi lần mã hóa (`crypto.randomBytes(12)`).
- **Authentication Tag:** 16 bytes được lưu cùng envelope để chống chỉnh sửa dữ liệu.
- **Blind Index:** HMAC-SHA256 với khóa `HR_PII_BLIND_INDEX_KEY` dùng chuẩn hóa chuỗi chữ số.
- **Phiên bản khóa (`encryptionKeyVersion`):** `DEFAULT_KEY_VERSION = 1`.
- **Quy trình xoay khóa (Key Rotation):** **[PROPOSED / CHƯA TRIỂN KHAI CODE]**.

---

## III. CHÍNH SÁCH SANITIZE NHẬT KÝ KIỂM TOÁN (`audit-sanitizer.ts`)

Khi ghi log kiểm toán (`AuditLog`), bộ lọc `AuditSanitizer` tự động làm sạch các trường dữ liệu:
- Mọi giá trị CCCD/CMND plaintext được thay thế bằng `[REDACTED]`.
- Envelope ciphertext được thu gọn thành `{ keyVersion, iv, authTag }`.
- Ngăn chặn tuyệt đối rò rỉ PII vào database log hoặc stdout/stderr console.
