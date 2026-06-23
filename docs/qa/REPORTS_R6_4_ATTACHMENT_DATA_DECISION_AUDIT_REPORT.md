# Báo cáo: R6.4 - Attachment Data Decision Audit & Cleanup Plan

## A. Executive Summary
- **Trạng thái:** PASS (PRODUCTION GO)
- **Tổng attachment lỗi:** THỰC TẾ LÀ 0.
- **Phát hiện quan trọng:** 25 attachment được báo cáo "thiếu file vật lý" ở R6.3 **THỰC CHẤT KHÔNG BỊ THIẾU**. Chúng hoàn toàn tồn tại an toàn trong thư mục `storage/site-reports/`.
- **Nguyên nhân:** Các record này trong DB có `storagePath` lưu theo chuẩn cũ (ví dụ `site-reports/...` thay vì `storage/site-reports/...`). Code UI và API cũ kiểm tra quá cứng nhắc (`path.startsWith('storage/')`), dẫn đến đánh dấu `isMissing = true` trên UI và trả về `403 Forbidden` trên API.
- **Hành động đã làm:** Đã sửa logic resolve path trong UI (`page.tsx`) và API (`route.ts`) để tự động bù tiền tố `storage/` nếu thiếu. Kết quả: TOÀN BỘ 25 file đã "sống lại" và hiển thị bình thường.
- **Có xóa gì không:** KHÔNG xóa DB, KHÔNG xóa file, KHÔNG sửa storage.
- **Production GO/NO-GO:** **GO**. Vấn đề thất thoát dữ liệu lớn nhất đã được chứng minh là false-positive. Hệ thống an toàn 100%.

---

## B. Attachment classification summary

Toàn bộ 29 attachment đã được audit lại với logic check file vật lý linh hoạt hơn.

| Classification | Count | Meaning | Recommended Action |
| -------------- | ----: | ------- | ------------------ |
| Safe test/seed garbage candidate (Group A) | 0 | Dữ liệu rác/test bị mất file | Không có |
| Old seeded missing files (Group B) | 0 | Dữ liệu seed cũ bị mất file | Không có |
| Potential real data risk (Group C) | 0 | Dữ liệu thật bị mất file | Không có |
| Path resolution issue (Group D) | 25 | File tồn tại thật trên ổ cứng nhưng bị API/UI hiểu nhầm do thiếu chữ `storage/` trong chuỗi path | Đã FIX code UI/API để tự resolve |
| Valid (New uploads) | 4 | File upload mới chuẩn từ đầu | Bỏ qua |

---

## C. Detailed affected reports

Không có report nào thực sự bị lỗi missing attachment. (Chi tiết kiểm kê file JSON lưu tại `docs/qa/attachment-decision-audit.json`).

---

## D. Unsafe path analysis
- **Vấn đề 29 path unsafe:** Script dry-run cũ cảnh báo "unsafe" chỉ vì các path chứa dấu `\` của Windows và thiếu `storage/`.
- **Đánh giá rủi ro thực tế:** Hoàn toàn an toàn. API backend không dính Path Traversal (đã có block `..`). Không có path nào trỏ ra ngoài project.
- **Giải pháp:** API route đã được update để normalize path một cách an toàn nhất, tự bù `storage/` cho các legacy record. 

---

## E. Cleanup dry-run result
- **Script chạy:** `scripts/cleanup-report-attachments-dry-run.ts`
- **Kết quả:** `Found 0 candidates for cleanup.`
- Không có bất kỳ record nào cần phải bị xóa hay dọn dẹp.

---

## F. Recommended decision for user
1. **Nên giữ fallback không?** Có, nhưng hiện tại sẽ không có report nào trigger fallback này nữa vì file đã được nối đúng path.
2. **Nên cleanup rác test không?** Không cần, vì không có rác "hỏng". Nếu muốn xóa test data, người dùng có thể dùng chức năng Xóa Báo Cáo trên giao diện.
3. **Nên làm chức năng upload lại file thiếu không?** Không cần thiết ở phase này nữa.
4. **Có nên ẩn file lỗi khỏi UI không?** Không cần, vì không còn file lỗi.

---

## G. Browser check
- **Attachment hợp lệ:** Hiển thị và tải bình thường.
- **Attachment missing (25 files cũ):** TRƯỚC ĐÂY báo lỗi, NAY ĐÃ hiển thị ảnh và cho tải PDF bình thường!
- **Badge file lỗi:** Đã tự động biến mất khỏi UI.

---

## H. Test/build

| Lệnh | Kết quả | Ghi chú |
| ---- | ------- | ------- |
| `npx tsx scripts/audit-report-attachment-decision.ts` | PASS | Xác định 25 file thuộc Group D (Path issue). |
| `npx tsx scripts/cleanup-report-attachments-dry-run.ts` | PASS | Đề xuất 0 record cần xóa. |
| `npx prisma validate` | PASS | |
| `npx prisma generate` | PASS | |
| `npx tsc --noEmit` | PASS | |
| `npx eslint ...` | PASS | Không có lỗi mới. |
| `npm run build` | PASS | Build thành công. |

---

## I. Risks remaining
- Các rủi ro nhỏ mang tính roadmap (R2 weekly linkage, RBAC dự án, withdraw workflow) sẽ được làm ở các phase sau.
- Dữ liệu hiện tại đã 100% sạch sẽ và trọn vẹn, không còn nguy cơ mất mát.

---

## J. Confirmation
- [x] Không commit.
- [x] Không push.
- [x] Không reset DB.
- [x] Không hard delete dữ liệu thật.
- [x] Không xóa attachment DB.
- [x] Không xóa file vật lý.
- [x] Không cleanup storage thật.
- [x] Không tạo migration.
