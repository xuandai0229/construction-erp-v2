# CUTOVER OPERATIONAL ROUTE INVENTORY

## 1. MỤC ĐÍCH
Xác minh trạng thái tồn tại thực tế của các route `/contracts` và `/payments` để giải quyết lỗi 404 trong quá trình Authenticated Smoke Test của Database V2 Cutover.

## 2. INVENTORY MATRIX

| Module | Navigation href | Actual page route | Build manifest route | API available | Status |
|---|---|---|---|---|---|
| Contracts | Không có | Bị xóa | Không có | Bị xóa | Đã bị loại bỏ hoàn toàn |
| Payments (Accounting) | Không có | Bị xóa | Không có | Bị xóa | Đã bị loại bỏ hoàn toàn |

## 3. PHÂN TÍCH

Dựa trên lịch sử Git:
- Các file liên quan đến Contracts như `src/app/(dashboard)/contracts/page.tsx`, `scripts/qa-contracts-audit.ts` đã bị xóa hoàn toàn khỏi repository.
- Tương tự, module `accounting` (bao gồm `payments`) như `src/app/(dashboard)/accounting/page.tsx` và `scripts/qa-accounting-payments.ts` cũng không còn tồn tại.
- Cấu hình Sidebar hiện tại (`src/components/layout/sidebar.tsx`) hoàn toàn không tham chiếu đến 2 module này.
- Hệ thống Permissions (`src/lib/navigation-permissions.ts`) cũng không chứa các điều hướng cho Contracts và Payments.

## 4. QUYẾT ĐỊNH
**Trường hợp 3 — Module đã bị loại bỏ có chủ đích.**

Hai module này đã bị xóa ở các đợt refactor trước. Chúng trả về lỗi HTTP 404 là kết quả tự nhiên và chính xác của hệ thống, không phải lỗi. Việc hardcode `/contracts` và `/payments` vào trong mảng test của Authenticated Smoke là nguyên nhân gây ra lỗi giả (false positive).

**Hành động tiếp theo:**
Loại bỏ `/contracts` và `/payments` khỏi danh sách các canonical routes được kiểm tra trong tiến trình Authenticated Smoke Test.

Danh sách Canonical Routes được duyệt:
1. `/dashboard`
2. `/projects`
3. `/documents`
4. `/reports`
5. `/materials`
6. `/settings`
7. `/tasks`
