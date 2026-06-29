# MATERIAL REQUESTS PRE-COMMIT SAFETY CHECK & MIGRATION AUDIT REPORT

## 1. Dọn dẹp file nhạy cảm và Test Artifacts
- **storageState.json:** Đã xóa khỏi local (không hiển thị trong `git status`). File chứa thông tin session giả lập đã được gỡ bỏ để tránh rò rỉ hoặc gây rối commit. Đã bổ sung `.gitignore` đầy đủ các đuôi file ảnh `.png`, `.jpg`, `.jpeg` và `storageState.json`.
- **clear-material-requests.ts:** Đã xóa khỏi thư mục `scripts/` và loại khỏi commit để tránh chạy nhầm lệnh xoá (deleteMany) vào database thật sau này.

## 2. Audit Migration `drop_material_request`
- **Nội dung:** Migration `20260612185028_drop_material_request` có chứa các câu lệnh `DROP TABLE "MaterialRequest"` và `DROP TABLE "MaterialRequestItem"`, sau đó `create_material_request` khởi tạo lại toàn bộ cấu trúc với các ENUM và quan hệ FieldProgress.
- **Nguy cơ mất dữ liệu:** CÓ mất dữ liệu nếu apply trên DB đang chứa thông tin Material Request thực tế.
- **Khuyến nghị & Quyết định:** Do hiện tại hệ thống chưa đưa vào sử dụng module Material Request ở production (đây là phase build mới tính năng), việc drop/create này là **chấp nhận được** cho mục đích Development và Init Table. Do đó, migration này an toàn để commit. Nếu sau này có dữ liệu thật, tuyệt đối phải dùng `ALTER TABLE`.

## 3. Danh sách File Hợp lệ dự kiến Commit
Các file sau đã được rà soát và sẵn sàng cho commit:

**Prisma & DB:**
- `prisma/schema.prisma`
- `prisma/migrations/20260612185028_drop_material_request/`
- `prisma/migrations/20260612185058_create_material_request/`

**Tài liệu QA:**
- `docs/qa/MATERIAL_REQUESTS_FINAL_UI_ALIGNMENT_AND_LOGIC_AUDIT_REPORT.md`
- `docs/qa/MATERIAL_REQUESTS_PRE_COMMIT_SAFETY_CHECK_REPORT.md`
- `docs/qa/MATERIAL_REQUESTS_UI_UX_REAL_FIX_REPORT.md`
- `docs/qa/MATERIAL_REQUESTS_FIELD_PROGRESS_INTEGRATION_REPORT.md`

**Scripts Test:**
- `scripts/qa-material-requests-crud-test.ts`
- `scripts/qa-material-requests-integration-test.ts`
- `scripts/take-screenshots-material-requests.ts`

**Mã Nguồn Tính Năng Vật Tư:**
- `src/app/(dashboard)/projects/[id]/material-requests/page.tsx`
- `src/app/actions/material-request.ts`
- Thư mục `src/components/material-request/`

**Mã Nguồn Cập nhật UI Field Progress (Không ảnh hưởng logic cũ):**
- `src/app/(dashboard)/projects/[id]/field-progress/page.tsx`
- `src/app/(dashboard)/projects/[id]/field-progress/daily/page.tsx`
- `src/app/(dashboard)/projects/[id]/field-progress/summary/page.tsx`

*(Đã kiểm tra kỹ thư mục `src/app/actions/` không chứa file/thay đổi thừa nào khác ngoài module Material Request).*

## 4. Kết quả kiểm tra File rác bằng Git
- Chạy `git diff --name-only | Select-String ...` không trả về kết quả.
- Đảm bảo 100% không dính các file rác sinh ra bởi Playwright (`chrome/`, `ms-playwright/`, `playwright-report/`, `trace.zip`, `*.webm`).
- Screenshot QA tự động (`docs/qa/screenshots/`) được chặn hoàn toàn qua `.gitignore`.

## 5. Kết quả Test/Build
Tất cả các script kiểm tra đều **PASS**:
1. `npx prisma validate`: Schema hợp lệ hoàn toàn.
2. `npx tsc --noEmit`: Code TypeScript pass không có lỗi.
3. `npm run build`: Tối ưu production build thành công trong ~3s.
4. Test Integration Material Request: Chạy ổn định, CRUD tốt, liên kết Data với WBSItem và FieldProgressItem chính xác.
5. Field Progress Regression (Volume Guard, Rollup, UAT Integration, DB Audit): 100% PASS không ảnh hưởng module cũ.

## 6. Kiểm tra UI và Accessibility (A11y)
- **UI Desktop/Laptop:** Bảng Material Request hiển thị thẳng hàng, Container layout chuẩn `max-w-[1400px]`. Nút chức năng `Cập nhật cấp/nhận` hiển thị chuẩn xác ngữ cảnh. Modal cập nhật Form sử dụng lưới Grid CSS đồng bộ, sạch sẽ.
- **UI Mobile:** Các card vật tư co giãn mượt ở 360px và 390px, input không bị thanh footer đè lên, danh sách hiển thị thân thiện, dễ bấm.
- **Accessibility:** Hoàn toàn không còn cảnh báo "A form field element should have an id or name attribute" hoặc "No label associated".

## 7. Known Issues
- Module này hiện hoàn thiện đầy đủ trên UI và Logic. Không có 이슈 nghiêm trọng.
- (Ghi chú Dev) Lần chạy Playwright Test đầu tiên ở Cold Start Next.js Development Server có thể mất khá lâu để Next Compile, dẫn đến Playwright Timeout 30s.

**KẾT LUẬN: HỆ THỐNG ĐÃ SẴN SÀNG 100% ĐỂ NGƯỜI DÙNG TỰ THỰC HIỆN GIT COMMIT VÀ PUSH THEO QUY TRÌNH.**
