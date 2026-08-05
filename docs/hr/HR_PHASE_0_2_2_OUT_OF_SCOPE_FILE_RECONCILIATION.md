# HR Phase 0.2.2 Out-Of-Scope File Reconciliation

Tài liệu này xác nhận toàn bộ các tệp không nằm trong phạm vi (out-of-scope) của HR Phase 0.2.2 đã được đối soát và xử lý để đưa repository về trạng thái sạch (clean baseline).

## Danh sách đối soát

1. **Test Scripts Không An Toàn**
   - `hr-browser-idor-denial.spec.ts`: Đã refactor thành script an toàn, sử dụng Test Harness thay vì UI giả mạo hoặc gọi trực tiếp API không xác thực.
   - Các file script trong `scripts/qa`: Đã xoá bỏ mật khẩu rò rỉ (plaintext) và sử dụng biến môi trường.

2. **Routes Tạm / Test Routes**
   - `src/app/hr/test-idor/page.tsx` và `test-idor-client.tsx`: Đã được cô lập bằng biến môi trường (`ENABLE_QA_ROUTES`). Nếu không bật cờ này trên Production, route sẽ trả về 404.

3. **Cấu hình DB QA**
   - Không xuất hiện bất kỳ connection string nào của Production DB.
   - Toàn bộ kết nối sử dụng E2E DB chuyên biệt (`construction_erp_v2_settings_e2e_20260803`).

## Kết luận
Tất cả các tệp tạm và file ngoài phạm vi (được sinh ra do thử nghiệm trong Phase 0–3) đã bị loại bỏ hoặc vô hiệu hóa. Baseline repository hoàn toàn phù hợp để thực thi Phase 4.
