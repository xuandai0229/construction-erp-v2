# PROJECT CLEANUP PHASE 2 — EXACT MANIFEST

## 1. Kết luận

* Có xóa file không: **Không**.
* Có move file không: **Không**.
* Có sửa source code không: **Không**.
* Chỉ tạo/cập nhật báo cáo audit (Phase 2).
* Tổng số file/folder trong từng nhóm:
  * **SAFE DELETE CANDIDATE**: 18 files, 3 folders
  * **REVIEW REQUIRED**: 3 folders (với hàng loạt file bên trong)
  * **ARCHIVE CANDIDATE**: 3 files json, 2 folders
  * **KEEP**: Toàn bộ source code dự án (`src/`, `prisma/`, file cấu hình gốc)

## 2. Các điểm cần sửa so với báo cáo Phase 1

Báo cáo Phase 1 có một số điểm mơ hồ và đã được đính chính trong Phase 2 này:
1. **Dùng số ước lượng**: Phase 1 dùng `~20 MB`, `~30 file`. Phase 2 đã lấy exact size bằng bytes qua powershell.
2. **Chưa có trạng thái Git**: Phase 2 đã cung cấp chi tiết (tracked, ignored, untracked) dựa trên kết quả `git ls-files` và `.gitignore`.
3. **Chưa có bằng chứng search đủ mạnh**: Phase 2 đã tiến hành `grep` search toàn bộ repo (tên file, import path) để chứng minh file không còn được refer.
4. **Chưa phân biệt rõ file test với dữ liệu công trình thật**: Phase 2 tuyệt đối khoanh vùng các thư mục nhạy cảm (như `storage/`, `scripts/`) vào vùng `REVIEW REQUIRED` và không xếp chúng vào mục xóa an toàn dù tên có chữ `test`.

## 3. SAFE DELETE CANDIDATE — Chờ tôi duyệt

| STT | Path | File/Folder | Size (Bytes) | Git status | Evidence checked | Why safe | Risk |
| --: | ---- | ----------- | -----------: | ---------- | ---------------- | -------- | ---- |
| 1 | `check.js` | File | 181 | tracked | `grep` search trả về 0 kết quả ở mọi code file. | File debug JS rời rạc, không dùng cho NextJS app. | LOW |
| 2 | `debug-login.js` | File | 3,393 | tracked | `grep` search trả về 0 kết quả ở mọi code file. | File debug JS, nằm ngoài luồng build. | LOW |
| 3 | `qa-field-progress-test.js` | File | 12,192 | tracked | `grep` search trả về 0 kết quả ở mọi code file. | File test Playwright/QA rời rạc. | LOW |
| 4 | `test.mjs` | File | 243 | tracked | `grep` search trả về 0 kết quả ở mọi code file. | File nháp chạy một lần ở root. | LOW |
| 5 | `test-output.html` | File | 24,505 | tracked | Không có trong cấu hình report. | Output tĩnh từ Playwright/QA test cũ. | LOW |
| 6 | `test-output-home.html` | File | 24,505 | tracked | Không có trong cấu hình report. | Output tĩnh từ test cũ. | LOW |
| 7 | `test-fake.pdf` | File | 60 | tracked | Search `test-fake.pdf` ra 0 match trong source. | File fake sinh ra để test upload. | LOW |
| 8 | `test-real.pdf` | File | 328 | tracked | Search `test-real.pdf` ra 0 match. | File debug upload. | LOW |
| 9 | `test-photo-1.png` | File | 1,175,025 | ignored | Bị `.gitignore` chặn, 0 match import. | Ảnh test thừa ở root. | LOW |
| 10 | `test-photo-2.png` | File | 1,093,833 | ignored | Bị `.gitignore` chặn, 0 match import. | Ảnh test thừa ở root. | LOW |
| 11 | `after-login.png` | File | 186,460 | ignored | Bị `.gitignore` chặn, 0 match import. | Screenshot sinh bằng script ở root. | LOW |
| 12 | `before-login.png` | File | 764,700 | ignored | Bị `.gitignore` chặn, 0 match import. | Screenshot sinh bằng script ở root. | LOW |
| 13 | `public/file.svg` | File | 391 | tracked | Không dùng trong bất kỳ `tsx` component nào. | Icon NextJS default thừa. | LOW |
| 14 | `public/globe.svg` | File | 1,035 | tracked | Không dùng trong bất kỳ `tsx` component nào. | Icon NextJS default thừa. | LOW |
| 15 | `public/next.svg` | File | 1,375 | tracked | Không dùng trong bất kỳ `tsx` component nào. | Icon NextJS default thừa. | LOW |
| 16 | `public/vercel.svg` | File | 128 | tracked | Không dùng trong bất kỳ `tsx` component nào. | Icon NextJS default thừa. | LOW |
| 17 | `public/window.svg` | File | 385 | tracked | Không dùng trong bất kỳ `tsx` component nào. | Icon NextJS default thừa. | LOW |
| 18 | `test_uploads/` | Folder | 2,000,106 | ignored | `grep` search `test_uploads` trả về 0 match. | Folder tạm lưu file tải lên mẫu, không ai dùng. | LOW |
| 19 | `src/app/(dashboard)/projects/[id]/monthly-report/` | Folder | 0 | untracked | `git clean -nd` báo folder untracked/trống. | Folder route bị bỏ hoang, chưa commit bao giờ. | LOW |
| 20 | `src/lib/dashboard/` | Folder | 0 | untracked | `git clean -nd` báo folder untracked/trống. | Folder util bị bỏ hoang, chưa có file. | LOW |

## 4. REVIEW REQUIRED — Không được xóa

| STT | Path | File/Folder | Size (Bytes) | Git status | Why suspicious | Why not safe to delete | Who should confirm |
| --: | ---- | ----------- | -----------: | ---------- | -------------- | ---------------------- | ------------------ |
| 1 | `storage/` | Folder | 20,381,348 | ignored | Có hàng trăm file bắt đầu bằng tên `test-doc` và `test-image`. | Đây là thư mục lưu file upload thực của hệ thống (local UAT). Xóa nhầm sẽ mất tài liệu công trình. | Admin / Dev |
| 2 | `backups/` | Folder | N/A | ignored | Là thư mục sinh ra khi sao lưu, có thể đã cũ. | Có thể chứa các bản db dumps cuối cùng cho việc restore hoặc debug. | Admin / DB Manager |
| 3 | `scripts/` | Folder | 1,132,858 | tracked | Có đến 30+ script seed, test, nhưng không khai báo trong mục "scripts" của `package.json`. | Nhiều file vẫn được dùng khi setup môi trường UAT (ex: `seed-uat-demo-project`). Cần check từng file. | QA / Dev |

## 5. ARCHIVE CANDIDATE — Chỉ đề xuất, chưa move

| STT | Path | Size (Bytes) | Reason to archive | Risk |
| --: | ---- | -----------: | ----------------- | ---- |
| 1 | `docs/qa/ui-audit-browser-results.json` | 162,205 | Dữ liệu output log của tool QA đã cũ. | LOW |
| 2 | `docs/qa/test-data-cleanup-dry-run-results.json` | 18,555 | Kết quả lưu log của dry-run, không mang tính lâu dài. | LOW |
| 3 | `docs/qa/ui-audit-report-modal-scenarios.json` | 18,481 | Kết quả lưu log QA, không phải là docs spec thiết yếu. | LOW |
| 4 | `docs/qa/ui-audit-screens/` | 563,385 | Folder chứa các screenshot bằng chứng pass audit cũ. Làm nặng thư mục docs. | LOW |
| 5 | `docs/qa/screenshots/` | 1,073,031 | Thư mục hình ảnh test cũ (documents-phase-a1, go-no-go). Đã lỗi thời so với UI hiện tại. | LOW |

## 6. KEEP

| STT | Path | Reason to keep | Evidence |
| --: | ---- | -------------- | -------- |
| 1 | `src/` (trừ 2 folder rỗng liệt kê trên) | Source code hiện hành chạy ứng dụng Next.js ERP. | Là code core của dự án. |
| 2 | `prisma/` | Lưu schema cấu trúc Database. | Required để build và query db. |
| 3 | Mọi file `REPORTS_*.md` ở `docs/qa/` | Dấu vết kiểm toán QA quan trọng theo yêu cầu. | Có tính tham chiếu cao. |
| 4 | `package.json`, `.gitignore`, `tsconfig.json` | File cấu hình base không thể thiếu. | Hệ thống dựa vào đây để chạy build. |

## 7. Dung lượng chính xác theo từng nhóm

| Nhóm | Số file/folder | Tổng dung lượng |
| ---- | -------------: | --------------: |
| SAFE DELETE CANDIDATE | 20 items (18 files, 2 folder, 1 test folder) | 5,288,845 Bytes (~5.29 MB) |
| ARCHIVE CANDIDATE | 5 items | 1,835,657 Bytes (~1.84 MB) |
| REVIEW REQUIRED | 3 folders | > 21,514,206 Bytes (~21.5 MB) |

## 8. Lệnh dọn dẹp đề xuất cho lần sau

```bash
# DO NOT RUN YET - pending user approval
# Remove only approved LOW risk files
rm check.js debug-login.js qa-field-progress-test.js test.mjs test-output.html test-output-home.html test-fake.pdf test-real.pdf test-photo-1.png test-photo-2.png after-login.png before-login.png
rm public/file.svg public/globe.svg public/next.svg public/vercel.svg public/window.svg
rm -r test_uploads/
# dọn untracked dirs theo đường dẫn chính xác (cần git clean hoặc rmdir cụ thể)
```
