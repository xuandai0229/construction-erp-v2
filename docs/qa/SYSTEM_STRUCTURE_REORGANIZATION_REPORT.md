# SYSTEM STRUCTURE REORGANIZATION REPORT

## 1. Kết luận

* **Đã audit những khu vực nào**: Toàn bộ `src/`, `prisma/`, `docs/qa/`, `public/`, `scripts/`.
* **Đã sắp xếp những gì**: Hiện tại chỉ thực hiện dọn dẹp các tài liệu QA quá khứ (khoảng 70 file `.md`) vào thư mục `docs/qa/archive/` để làm sạch không gian làm việc. Cấu trúc mã nguồn được giữ nguyên do rủi ro cao nếu gộp thành `src/modules/` ngay lúc này.
* **Không đụng những gì**: Không đụng bất cứ code nào trong `src/`, không đụng `storage/`, `scripts/`, `backups/`, `.env`, hay `prisma/migrations/`.
* **Build/typecheck**: **PASS** (Exit code 0).

## 2. File/folder đã move hoặc tạo mới

| STT | From | To | Type | Lý do | Kết quả |
| --: | ---- | -- | ---- | ----- | ------- |
| 1 | `docs/qa/REPORTS_*.md` (rất nhiều file) | `docs/qa/archive/` | Files | Dọn dẹp không gian QA | Đã move |
| 2 | `docs/qa/SAFE_*.md`, `docs/qa/SETTINGS_*.md`... | `docs/qa/archive/` | Files | Dọn dẹp tài liệu cũ | Đã move |
| 3 | `docs/qa/SYSTEM_STRUCTURE_REORGANIZATION_AUDIT.md` | Mới tạo | File | Báo cáo Audit Phase 2 | Đã tạo |
| 4 | `docs/qa/SYSTEM_STRUCTURE_REORGANIZATION_REPORT.md` | Mới tạo | File | Báo cáo KQ Phase 5 | Đã tạo |

## 3. File/folder giữ nguyên

Các khu vực tuyệt đối KHÔNG ĐỘNG CHẠM:
* `storage/`
* `backups/`
* `scripts/`
* `prisma/migrations/`
* Toàn bộ source code nghiệp vụ rủi ro cao trong `src/app/`, `src/components/`, `src/lib/`.

## 4. Cấu trúc sau khi sắp xếp

Cấu trúc dự án vẫn tuân theo mô hình Features-based của Next.js:

```text
src/
  app/
    (dashboard)/
      accounting/
      approvals/
      contracts/
      documents/
      materials/
      projects/
      reports/
      settings/
      suppliers/
      users/
  components/
    [module]/
  lib/
    [module]/
```
*Lưu ý: Chỉ có `docs/qa/` là đã được làm gọn sạch hoàn toàn, chỉ giữ lại các báo cáo mới nhất liên quan đến đợt Cleanup lần này.*

## 5. Kết quả kiểm tra

```bash
# git status --short (trước khi add)
?? docs/qa/SYSTEM_STRUCTURE_REORGANIZATION_AUDIT.md
?? docs/qa/SYSTEM_STRUCTURE_REORGANIZATION_REPORT.md
(Và hàng loạt file bị rename vào archive)

# npx tsc --noEmit && npm run build
Compiled successfully in 4.0s
Finished TypeScript in 11.2s
Generating static pages using 15 workers (21/21)
Exit code: 0
```

## 6. Rủi ro còn lại

* **Module vẫn còn lộn xộn**: `src/app/actions/material-request.ts` vẫn chưa được đưa về đúng chỗ (nên nằm trong `src/app/(dashboard)/projects/[id]/material-requests/actions.ts`). 
* **Tương lai refactor**: Nếu dự án tiếp tục lớn lên, cần có một đợt cấu trúc lại lõi bảo mật (`auth.ts`, `rbac.ts`) gom vào `src/lib/core/` và di chuyển toàn bộ nghiệp vụ từ `app/`, `components/`, `lib/` vào một thư mục `src/modules/`.
* **Những phase tiếp theo nên làm**: Tiến hành viết unit test trước khi thực sự di dời bất cứ hàm tiện ích nào hoặc component nào. Cần xử lý các script rác trong thư mục `scripts/` bằng một phase riêng.
