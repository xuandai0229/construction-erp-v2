# DOCUMENTS PHASE A FOLDER RULES EVIDENCE REPORT

## 1. File đã sửa
* `src/lib/document-rules.ts`: Mở rộng interface `DocumentFolderRule`, thêm các trường phục vụ hiển thị thân thiện như `friendlyAllowedTypes`, `namingExample`, và `emptyStateText`. Điền dữ liệu thân thiện tương ứng cho 8 thư mục mặc định và 1 thư mục custom.
* `src/components/documents/document-manager.tsx`: Cập nhật cấu trúc hiển thị UI của Module Documents. Cập nhật Empty State thay đổi linh hoạt theo từng Folder, làm nổi bật `friendlyAllowedTypes` thay cho danh sách đuôi file cứng ngắc, thêm gợi ý `namingExample` rõ ràng, và chèn nút Upload ngay giữa Empty State.
* `src/app/api/documents/upload/route.ts`: Bổ sung backend validation kiểm tra extension file theo folder rule, trả lỗi tiếng Việt nếu sai định dạng.
* `src/app/(dashboard)/documents/page.tsx`: Sửa type `any` sang `Prisma.ProjectWhereInput`.

## 2. UX Polish đã làm
* **Hiển thị định dạng:** Đã chuyển đổi cách hiển thị từ `.PDF, .DOC, .DOCX, .XLS, .XLSX` sang `Loại file nhận: PDF, Word, Excel`. Người dùng có thể trỏ chuột (hover) vào thẻ định dạng để xem danh sách đuôi file chi tiết.
* **Gợi ý đặt tên (Naming Example):** Bổ sung một mẫu tên thực tế giúp người dùng dễ hình dung bên cạnh Rule. (Ví dụ: `Ví dụ: HD_12-2026_19062026.pdf`).
* **Empty State Theo Context:** Từng thư mục giờ đây sẽ có câu nhắc nhở trống dữ liệu riêng biệt.
   - Hợp đồng: `Chưa có hợp đồng nào trong thư mục này`
   - Bản vẽ: `Chưa có bản vẽ nào trong thư mục này`
   - Hóa đơn: `Chưa có hóa đơn nào`
   - Hình ảnh hiện trường: `Chưa có ảnh hiện trường nào`
   - Báo cáo ngày: `Chưa có báo cáo nào`
* **CTA Button:** Tại trạng thái Empty State, hệ thống tự động chèn một nút bấm "Tải lên" to, rõ ràng và có ngữ cảnh ở giữa trang để kích thích thao tác người dùng.

## 3. Test upload đúng/sai loại đã chạy
Một Test Suite tạm (sử dụng session token nội bộ qua API route tạm `/api/qa-test-upload`) đã được dựng lên nhằm gửi các file dummy giả lập lên API endpoint `/api/documents/upload`:
1. **[PASS]** Upload `QA_TEST_DOCUMENTS_RULES_contract.pdf` vào `01_Hợp đồng`.
2. **[PASS]** Upload `QA_TEST_DOCUMENTS_RULES_invoice_wrong.dwg` vào `05_Hóa đơn` (Kỳ vọng bị chặn).
3. **[PASS]** Upload `QA_TEST_DOCUMENTS_RULES_image.jpg` vào `07_Hình ảnh hiện trường`.
4. **[PASS]** Upload `QA_TEST_DOCUMENTS_RULES_budget.xlsx` vào `03_Dự toán`.

## 4. Kết quả Backend Validation
Server Response cho test case Upload `.dwg` vào thư mục "Hóa đơn":
```
✅ SUCCESS: QA_TEST_DOCUMENTS_RULES_invoice_wrong.dwg upload blocked.
Server: File này không phù hợp với thư mục Hóa đơn. Chỉ cho phép: .PDF, .JPG, .JPEG, .PNG, .XML.
```
Hệ thống đã chặn đúng và trả lỗi tiếng Việt chính xác.

## 5. Cleanup QA File/DB
* Script test đã bao gồm logic Cleanup tự động: xóa DB record (`prisma.document.delete`) và gỡ file local (`fs.unlink`).
* Không có file thật hay DB rác nào bị lưu lại trên hệ thống sau test.

## 6. Safety Cleanup Trước Commit (20/06/2026)

> [!IMPORTANT]
> Toàn bộ route test và script QA đã được xóa khỏi source trước khi commit.

* **`src/app/api/qa-test-upload/route.ts`**: Đã **XÓA HOÀN TOÀN**. Route này từng được dùng để test backend validation từ bên trong Next.js context. Nó đã hoàn thành nhiệm vụ và bị loại bỏ ngay lập tức để tránh rủi ro bảo mật khi deploy.
* **`src/app/api/qa-test-upload/` (thư mục)**: Đã xóa sạch.
* **`scripts/qa-document-rules-test.ts`**: Đã **XÓA**. Script chứa hàm `generateToken()` với fallback secret hardcoded — không phù hợp để giữ trong source.
* **`qa-temp.log`**: Đã xóa.
* **Kết quả quét toàn bộ `src/` và `scripts/`**: Không còn bất kỳ tham chiếu nào đến `qa-test-upload`, `QA_TEST_DOCUMENTS_RULES`, hay `generateToken` với secret hardcoded.
* **Không còn public QA endpoint** nào tồn tại trong `src/app/api/`.
* Test evidence đã được ghi nhận đầy đủ trong báo cáo này (Mục 3 và 4) và không cần giữ route/script tạm trong production source.

## 7. Mobile Check
* Màn hình 390x844 (Mobile) đã được kiểm chứng:
   * Panel mô tả Folder hiển thị flex-column, không vỡ layout, không tràn viền ngang.
   * Gợi ý Naming Example rớt dòng tự động gọn gàng.
   * Nút upload được mở rộng `w-full` để dễ bấm hơn trên điện thoại.
   * Empty State nằm giữa màn, có CTA Button kích thước thân thiện.
   * Danh sách Sidebar Folder vẫn đóng mở bình thường.

## 8. Build Result
* `npx tsc --noEmit`: **Exit Code: 0** — Không có lỗi TypeScript.
* `npm run build`: **Exit Code: 0** — 21 Route đã compiled thành công.

## 9. Kết luận
* **Phase A UAT:** **PASS**. Module Documents đã sở hữu UX sạch sẽ, quy tắc upload rõ ràng theo từng thư mục, validation cả frontend lẫn backend. Sẵn sàng 100% cho UAT nội bộ.
* **Production:** Vẫn ở mức **PARTIAL** do file lưu trữ trên Local Filesystem.
* **Không còn route/script QA test** nào trong source. An toàn để commit local.
* **Phase B đề xuất:** Ngay sau UAT, ưu tiên triển khai MetaData JSON vào Schema, bổ sung trạng thái luồng Ký/Duyệt, và tích hợp Object Storage (S3/MinIO).
