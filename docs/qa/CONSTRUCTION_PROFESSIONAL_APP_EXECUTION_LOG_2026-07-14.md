# Nhật ký thực thi — Construction Professional App

Ngày: 2026-07-14  
Phạm vi: tái cấu trúc module Structure, chuẩn hóa ba màn khối lượng, sau đó triển khai tuần tự các phân hệ điều hành công trường được phê duyệt.  
Quy tắc an toàn: không migrate/seed production, không `prisma db push`, không sửa migration đã áp dụng, không commit/push.

## Block P0-01 — Khởi tạo baseline

- **Mục tiêu:** Ghi nhận trạng thái repository, an toàn database và các kiểm tra kỹ thuật trước mọi thay đổi.
- **Trạng thái trước:** Đang thực hiện.
- **File đã đọc:** `AGENTS.md`, `package.json`, hướng dẫn Next.js App Router về page/layout, server actions và error handling; `scripts/qa-safety-guard.ts`; `scripts/qa/assert-safe-qa-database.ts`.
- **File đã sửa:** Nhật ký này.
- **Thay đổi thực tế:** Chưa thay đổi mã nguồn hoặc schema.
- **Command đã chạy:** Đang ghi nhận ở các mục tiếp theo.
- **Exit code:** Chưa có.
- **Test case / Artifact / Defect / trạng thái sau / phần còn lại:** Sẽ được cập nhật ngay sau từng lệnh baseline.

## Block P0-02 — Worktree ban đầu

- **Mục tiêu:** Bảo toàn thay đổi có sẵn của người dùng.
- **Trạng thái trước:** Repository dirty.
- **File đã đọc:** Git index và working tree.
- **File đã sửa:** Nhật ký này.
- **Thay đổi thực tế:** Phát hiện thay đổi có trước nhiệm vụ tại `scripts/qa-weekly-report-business-logic.ts` và `src/lib/prisma.ts`; không sửa, không ghi đè, không stage.
- **Command đã chạy:** `git status --short`; `git diff --stat`; `git diff --cached --name-only`; `git log --oneline -10`.
- **Exit code:** 0.
- **Test case:** Kiểm tra baseline Git.
- **Artifact:** Output terminal của phiên thực thi.
- **Defect phát hiện:** Không có; warning CRLF chỉ là thông báo Git.
- **Defect đã sửa:** Không áp dụng.
- **Trạng thái sau:** PASS CÓ ĐIỀU KIỆN — các thay đổi có trước được giữ nguyên.
- **Phần còn lại:** Xác thực database QA và chạy baseline kỹ thuật.

## Block P0-03 — Baseline database và kỹ thuật

- **Mục tiêu:** Xác minh môi trường database, Prisma và chất lượng build trước thay đổi.
- **Trạng thái trước:** Chưa xác minh.
- **File đã đọc:** `.gitignore`, `prisma.config.ts`, `prisma/schema.prisma`, `scripts/qa-safety-guard.ts`, `scripts/qa/assert-safe-qa-database.ts`.
- **File đã sửa:** Nhật ký này.
- **Thay đổi thực tế:** Không mutation database.
- **Command đã chạy:** Kiểm tra tên database (không in URL); `npx tsx scripts/qa-safety-guard.ts`; `npx prisma migrate status`; `npx prisma validate`; `npx prisma generate`; `npx tsc --noEmit`; `npm run lint`; `npm run build`.
- **Exit code:** QA safety guard 0; Prisma validate 0; Prisma generate 0; TypeScript 0; global lint 1; build 0. `migrate status` phát hiện P3015 nhưng command chuỗi kết thúc 0 do lệnh generate chạy sau cùng.
- **Test case:** Development `construction_erp_v2`; QA `construction_erp_v2_qa`; QA guard PASS. `.env` bị Git ignore.
- **Artifact:** Output terminal; build production Next.js 16.2.7 pass, có một Turbopack trace warning tại local storage provider.
- **Defect phát hiện:** Sáu thư mục migration Structure rỗng, không được Git theo dõi, làm Prisma báo thiếu `migration.sql`. Global lint có 33 lỗi legacy ở `patch.js` và thư mục `scratch/`, cùng 174 warnings; không phát sinh từ thay đổi nhiệm vụ.
- **Defect đã sửa:** Chưa sửa migration ledger lịch sử theo quy tắc an toàn.
- **Trạng thái sau:** PASS CÓ ĐIỀU KIỆN — code có thể tiếp tục; migration mới/apply QA bị giữ lại cho đến khi ledger lịch sử được khôi phục có kiểm chứng.
- **Phần còn lại:** Census Structure, manifest giữ/xóa, security cleanup.

## Block A2-01 — Manifest Structure và census read-only

- **Mục tiêu:** Chứng minh phạm vi Structure trước mọi cleanup schema.
- **Trạng thái trước:** Sáu thư mục migration rỗng mang tên Structure/phase tồn tại ngoài Git.
- **File đã đọc:** `prisma/schema.prisma`, toàn bộ migration được Git theo dõi, mã `src`, `scripts`; `_prisma_migrations` và `information_schema` ở Development/QA bằng transaction `READ ONLY`.
- **File đã sửa:** Nhật ký này.
- **Thay đổi thực tế:** Không xóa bảng, record hoặc migration.
- **Command đã chạy:** Quét source/schema/permission; census read-only các bảng `ProjectLocationNode`, `FieldProgressItemLocation`, `FieldProgressItemAssignment` và migration ledger.
- **Exit code:** 0.
- **Test case:** Development có ba bảng Structure, mỗi bảng 0 record. QA không còn ba bảng này. Prisma schema/source không còn route `/projects/[id]/structure`, `StructureWorkspace`, model Structure, LBS service, assignment service hay permission `structure.*`.
- **Artifact:** Output terminal census.
- **Manifest:**

| Thành phần | Chức năng | Có dữ liệu | Phục vụ module cũ | Quyết định |
|---|---|---:|---:|---|
| Route/UI/permission/backend Structure | Không còn trong source | Không | Có | Giữ nguyên trạng thái đã loại bỏ; không tạo lại |
| `FieldProgressTemplate` / `FieldProgressItem` / `FieldProgressEntry` | Khối lượng thi công | Có nghiệp vụ | Không | Giữ |
| `ProjectLocationNode` | LBS Structure | Dev 0; QA không có bảng | Có | Không migration khi ledger chưa an toàn |
| `FieldProgressItemLocation` | Mapping WBS–LBS | Dev 0; QA không có bảng | Có | Không migration khi ledger chưa an toàn |
| `FieldProgressItemAssignment` | Phân công tĩnh Structure | Dev 0; QA không có bảng | Có | Không migration khi ledger chưa an toàn |
| Sáu thư mục migration Structure rỗng ngoài Git | Ledger lỗi | Không áp dụng | Có | Không tự xóa/sửa lịch sử; cần khôi phục file migration đã apply có kiểm chứng |

- **Defect phát hiện:** Development ledger đánh dấu một số migration Structure hoàn tất nhưng các file migration tương ứng không tồn tại; QA ledger có record completed/failed cho phase 2 trong khi các thư mục local rỗng.
- **Defect đã sửa:** Không áp dụng; khôi phục hay thay đổi migration lịch sử không được phép suy đoán.
- **Trạng thái sau:** PASS CÓ ĐIỀU KIỆN cho UI/source; BLOCKED cho migration Structure do ledger thiếu artifact lịch sử.
- **Phần còn lại:** Chuẩn hóa UI và security cleanup.

## Block A1/B1-B3 — Security cleanup và chuẩn hóa khối lượng

- **Mục tiêu:** Bỏ raw error UI/hard-coded credential và chuẩn hóa ba màn khối lượng mà không đổi route/model/data.
- **Trạng thái trước:** Error boundary render/log error thô; một số QA/restore script có fallback PostgreSQL URL hard-code; nhãn khối lượng cũ chưa thống nhất.
- **File đã đọc:** Error boundaries, trang Project/Field Progress, `ProjectModuleTabs`, script QA/restore có URL literal.
- **File đã sửa:** `src/components/ui/page-error.tsx`; dashboard/projects error boundary; các trang/cards/tabs Field Progress; dashboard query labels; các script QA/restore liệt kê trong `git diff --stat`.
- **Thay đổi thực tế:** Error UI giờ chỉ hiển thị tiếng Việt an toàn, mã tham chiếu và các nút thử lại/quay lại/trang chính. Mọi fallback credential literal đã bỏ; mutation QA chuyển sang `QA_DATABASE_URL` qua safety assertion và isolated Prisma client. Đổi nhãn UI thành `Hạng mục & Công việc`, `Khối lượng thực hiện`, `Tổng hợp khối lượng` nhưng giữ nguyên ba route và model.
- **Command đã chạy:** `npx tsc --noEmit`; scoped `npx eslint ...`; quét literal PostgreSQL, quét nhãn cũ, `git diff --check`.
- **Exit code:** TypeScript 0; scoped ESLint 0 error (36 warning legacy/ignored-script); diff check 0; quét nhãn cũ không có kết quả; literal URL chỉ còn `.env.example` placeholder và script backup đọc URL từ môi trường.
- **Test case:** Error boundary không render `error.message`/raw exception; route Field Progress không đổi; QA scripts fail-closed nếu safety assertion chưa đạt.
- **Artifact:** Output terminal và diff source.
- **Defect phát hiện:** QA safety helper yêu cầu sentinel mutation riêng; các script mutation sẽ dừng an toàn cho đến khi QA có sentinel hợp lệ.
- **Defect đã sửa:** Đã loại fallback credentials và raw error UI.
- **Trạng thái sau:** PASS CÓ ĐIỀU KIỆN.
- **Phần còn lại:** Regression runtime, khôi phục migration ledger trước schema mới, rồi các phân hệ điều hành/quality được phê duyệt.

## Block H-01 — Regression checkpoint sau thay đổi

- **Mục tiêu:** Xác nhận thay đổi source không làm hỏng build production hoặc Prisma client.
- **Trạng thái trước:** Thay đổi security và nhãn đã hoàn tất.
- **File đã đọc:** Diff thay đổi và manifest route do Next build sinh ra.
- **File đã sửa:** Nhật ký này.
- **Thay đổi thực tế:** Không mutation database.
- **Command đã chạy:** `npm run build`; `npx prisma validate`; `npx prisma generate`; `git diff --check`.
- **Exit code:** 0, 0, 0, 0.
- **Test case:** Build xác nhận ba route bất biến: `/projects/[id]/field-progress`, `/daily`, `/summary`; không có route Structure được sinh. Prisma schema/client hợp lệ.
- **Artifact:** Output build production và Prisma generate trong terminal.
- **Defect phát hiện:** Cảnh báo tồn tại từ Turbopack: trace filesystem động qua `src/lib/storage/local-storage-provider.ts`; không phải lỗi compile.
- **Defect đã sửa:** Không áp dụng trong scope này.
- **Trạng thái sau:** PASS CÓ ĐIỀU KIỆN.
- **Phần còn lại:** Không thể tiếp tục additive schema/migration của các phân hệ mới một cách an toàn cho đến khi bộ migration historical đang thiếu được khôi phục, review và `migrate status` sạch trên QA. Không có production migration, seed, commit hoặc push nào được thực hiện.
