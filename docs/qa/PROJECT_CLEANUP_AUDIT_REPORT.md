# PROJECT CLEANUP AUDIT REPORT

## 1. Kết luận ngắn

* Tổng số file/folder nghi ngờ có thể dọn: ~30 files và folders (chủ yếu là file debug ở thư mục gốc, folder QA screenshots, và folder upload tạm).
* Tổng dung lượng ước tính có thể giải phóng: ~20 - 25 MB (không tính các thư mục hệ thống như `.next`, `node_modules`).
* Có file nào rủi ro cao không: Có (thư mục `storage/`, thư mục `scripts/` chứa các script seed/test).
* Có sửa/xóa gì không: PHẢI ghi rõ “Không xóa, không sửa, chỉ audit”. Toàn bộ hệ thống hiện trạng vẫn nguyên vẹn.

## 2. Nguyên tắc đã tuân thủ

* Không xóa file.
* Không sửa code.
* Không chạy migration.
* Không seed database.
* Không commit/push.
* Không chạy `npm run dev`.
* Chỉ sử dụng lệnh đọc trạng thái như `git status`, `git diff`, `git ls-files`, `git clean -nd`.

## 3. Nhóm A — Có thể xóa tương đối an toàn

| STT | File/Folder | Loại | Dung lượng | Lý do đề xuất xóa | Bằng chứng không còn dùng | Rủi ro |
| --- | ----------- | ---- | ---------: | ----------------- | ------------------------- | ------ |
| 1 | `check.js`, `debug-login.js`, `qa-field-progress-test.js`, `test.mjs` | Script debug | ~0.1 MB | File nháp thử nghiệm ở root | Không được package.json script hay code import | Thấp |
| 2 | `test-output.html`, `test-output-home.html` | Test output | ~0.1 MB | Output tĩnh từ Playwright/QA test | Không liên quan source code | Thấp |
| 3 | `test-fake.pdf`, `test-real.pdf`, `test-photo-1.png`, `test-photo-2.png`, `after-login.png`, `before-login.png` | Test media | ~2.0 MB | Các file ảnh/tài liệu test rác ở root | Search trong code không thấy, đã bị `.gitignore` chặn (`*.png`) | Thấp |
| 4 | `test_uploads/` folder | Folder test | ~1.5 MB | Dùng cho môi trường thử upload test | Là folder lưu file tạm, không được push lên repo | Thấp |
| 5 | `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg` | Default assets | ~0.1 MB | File icon sinh tự động của Next.js init | Search toàn bộ `src/` không thấy được dùng | Thấp |
| 6 | `src/app/(dashboard)/projects/[id]/monthly-report/` và `src/lib/dashboard/` | Folder | 0 MB | Thư mục rỗng/untracked bị bỏ quên | `git clean -nd` báo là folder có thể dọn | Thấp |

## 4. Nhóm B — Cần review trước khi xóa

| STT | File/Folder | Loại | Dung lượng | Vì sao nghi ngờ thừa | Vì sao chưa dám xóa | Cần ai xác nhận |
| --- | ----------- | ---- | ---------: | -------------------- | ------------------- | --------------- |
| 1 | `storage/` | Document storage | > 10 MB | Có rất nhiều file `test-doc...`, `test-image...`. Là folder bị ignore bởi git. | Có thể chứa các tài liệu upload công trình thật của môi trường dev/UAT. Không rõ file nào là test file nào là thật. | Dev/Admin |
| 2 | `scripts/` (Các file `seed-*.ts`, `test-*.ts`) | QA Scripts | ~0.5 MB | Có rất nhiều script. Không được gắn vào mục `scripts` trong `package.json`. | Có thể còn dùng để seed dữ liệu mẫu hoặc test CI/CD chạy thủ công. | QA/Dev |
| 3 | `backups/` | DB Backups | - | Database backup folder, có mặt trong `.gitignore`. | Có thể là bản sao lưu DB dùng để restore cho môi trường UAT. | Admin |

## 4.5. Nhóm Sinh Tự Động/Cache (Có thể dọn bằng lệnh)
* Thư mục `test-results/` (Test Playwright output).
* Thư mục `.next/` (Build cache).
* Các thư mục này an toàn để xoá nhưng chúng sẽ sinh ra lại, có thể dùng các lệnh clean chuyên dụng của dự án chứ không cần xóa code tĩnh.

## 5. Nhóm C — Nên giữ lại

| STT | File/Folder | Lý do giữ | Bằng chứng đang dùng |
| --- | ----------- | --------- | -------------------- |
| 1 | Toàn bộ source code trong `src/` | Các components và route đang chạy. | Vẫn phục vụ luồng dự án |
| 2 | `docs/qa/REPORTS_...` | Dấu vết kiểm toán, lịch sử thiết kế. | Cần thiết để tham chiếu |
| 3 | Các files trong thư mục `prisma/` | Định nghĩa schema và migration | Cần để ORM làm việc |

## 6. Nhóm D — Đề xuất cập nhật `.gitignore`

Hiện `.gitignore` của dự án đã làm rất tốt. Tuy nhiên có thể bổ sung thêm vài pattern nếu cần thiết (Không sửa):

```gitignore
# Temporary root outputs
*.html
test_uploads/
```

## 7. Nhóm E — Báo cáo / tài liệu cũ nên archive hoặc gộp

Nhiều file trong `docs/qa/` có kích thước lớn và không phải code:
* **Có thể xóa / xóa sau khi xem:**
  - `docs/qa/ui-audit-browser-results.json` (~162 KB)
  - `docs/qa/test-data-cleanup-dry-run-results.json` (~18 KB)
* **Nên Archive (Chuyển vào `docs/qa/archive/`):**
  - Thư mục ảnh báo cáo test QA `docs/qa/screenshots/` (vài MB).
  - Thư mục ảnh `docs/qa/ui-audit-screens/` (vài MB).
  - Tất cả các file `.md` đã qua lâu như các Phase R1, R3. Việc archive sẽ giúp thư mục gốc `docs/qa/` sạch sẽ hơn.

## 8. Dung lượng có thể giải phóng

| Nhóm | Số file/folder | Dung lượng ước tính |
| ---- | -------------: | ------------------: |
| Nhóm A (Rác rễ, file lẻ) | ~20 file | ~4.0 MB |
| Nhóm E (Tài liệu JSON, hình ảnh report QA) | 2 thư mục lớn, 3-4 files json | ~5.0 MB |
| Nhóm B (Storage Upload - tuỳ thuộc giữ hay xoá) | Rất nhiều file `test-doc` | > 10.0 MB |
| **Tổng cộng tối đa** | | **~19.0 - 25.0 MB** |

## 9. Kế hoạch dọn dẹp đề xuất sau khi tôi xác nhận

Đề xuất thứ tự dọn:

1. Dọn file sinh tự động/cache/test output (`test-results`, `.next`).
2. Xoá các file lẻ ở Nhóm A (ảnh test, file debug js/ts/html nằm ở root directory).
3. Chuyển thư mục `docs/qa/screenshots/` và `docs/qa/ui-audit-screens/` vào `docs/qa/archive/`.
4. Dev/Admin kiểm tra và xóa bớt file rác bắt đầu bằng `test-` trong `storage/`.
5. Sau cùng mới xem xét các script `scripts/` nào thật sự không còn chạy.
