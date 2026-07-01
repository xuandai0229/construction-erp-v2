# Báo Cáo Audit Đồng Bộ Hóa UI & Phạm Vi Dự Án (Project Scope) Toàn Hệ Thống

**Ngày báo cáo:** 01/07/2026
**Người thực hiện:** Senior Product Engineer + Senior UX System Designer

---

## 1. Mục tiêu Audit
- **Đồng bộ Project Scope:** Đảm bảo tất cả các phân hệ đều kế thừa chính xác từ `Global Project Switcher` và không xảy ra rò rỉ hoặc lưu trữ (stale) dữ liệu giữa các công trình.
- **Chuẩn hóa Trạng thái:** Loại bỏ các nhãn hardcode, thống nhất trạng thái công trình (Status/Stage) trên toàn ứng dụng.
- **Đồng bộ Trải nghiệm UI/UX:** Củng cố các luồng xử lý tương tác lỗi (Error State), tải dữ liệu (Loading/Skeleton), Layout bảng/card, và hành vi đóng/mở Drawer/Modal.
- **Verification & UAT:** Xác thực thông qua type-check, build và Bot UAT chạy trực tiếp trên trình duyệt.

## 2. Kết quả Audit & Đồng bộ từng Màn hình

| Màn Hình | Selected Project Sync | Loading State | Empty State | Error State | Detail Behavior | Responsive | Phân Quyền |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Dashboard** | ĐỒNG BỘ TỐT (URL > Cookie > Global Context) | Đã chuẩn hóa bằng Skeleton | Có | Đã bổ sung ErrorBoundary | Mượt mà | Tốt | Tốt (RBAC Role) |
| **Phê duyệt** | ĐỒNG BỘ TỐT | Đã bổ sung Skeleton | Tốt | Đã bổ sung ErrorBoundary | Mở Drawer bằng Query Param chuẩn xác | Scroll table, Card layout | Check RBAC an toàn |
| **Báo cáo** | ĐỒNG BỘ TỐT | Đã bổ sung Skeleton | Tốt | Đã bổ sung ErrorBoundary | Chi tiết & Lịch sử chuẩn xác | Tốt | Tốt |
| **Tài liệu** | ĐỒNG BỘ TỐT | Đã bổ sung Skeleton | Tốt | Đã bổ sung ErrorBoundary | Mở file/folder trong Drawer | Tốt | Tốt |
| **Vật tư** | ĐỒNG BỘ TỐT | Đã bổ sung Skeleton | Cần cải thiện (Có warning) | Đã bổ sung ErrorBoundary | Tốt | Tốt | Tốt |
| **Thanh toán** | ĐỒNG BỘ TỐT | Đã bổ sung Skeleton | Tốt | Đã bổ sung ErrorBoundary | Tốt | Tốt | Tốt |

## 3. Các hạng mục cốt lõi đã Chuẩn hóa
- **Helper Trạng thái (`src/lib/project-status.ts`):** 
  - Toàn hệ thống đang áp dụng chung helper `getProjectStatusMeta`. Các trạng thái (`PLANNING`, `ACTIVE`, `ON_HOLD`, `COMPLETED`, `CANCELLED`) được định nghĩa chung một bảng màu, nhãn và icon chuẩn (`neutral`, `success`, `warning`, `danger`). Không tồn tại việc hardcode trạng thái công trình lẻ tẻ.
  - Sức khỏe dự án (`Project Health`) được đồng bộ thông qua các nhãn chuẩn: `Đúng kế hoạch` (ON_TRACK), `Cần chú ý` (AT_RISK), `Đang chậm trễ` (DELAYED).
- **Global Project Context:**
  - Logic xác định scope được thống nhất: Dữ liệu tải từ `getGlobalProjectContext` (ưu tiên `?projectId` trên URL trước, sau đó fallback về cookie `selectedProjectId`). 
  - Khi user chuyển đổi trạng thái "Toàn hệ thống", các phân hệ đặc thù như Vật tư, Tài liệu sẽ render Empty State an toàn thay vì crash hoặc hiện danh sách lộn xộn.
- **Hệ thống Loading / Error:**
  - Đã đóng gói và đồng bộ `PageSkeleton` (hiệu ứng shimmer) và `PageError` (Boundary catch lỗi chung) cho tất cả các folder routes chính (`approvals`, `materials`, `reports`, `documents`, `contracts`...). Hết tình trạng "Trắng màn" hay "Kẹt UI".

## 4. Các Lỗi CRITICAL/HIGH (Đã Khắc Phục Ở Phase Trước)
- **[HIGH] Trắng màn khi fetch data chậm:** Đã bổ sung hàng loạt `loading.tsx` với skeleton đồng nhất.
- **[CRITICAL] Rò rỉ scope hoặc kẹt data (Stale data):** Các component hiện tại bọc bằng `useMemo` và query dependencies bám sát vào `globalContext.selectedProjectId`. UAT Runtime xác nhận: Chuyển công trình từ "Dự án Tây Hồ" sang "Trần Quang Hiếu", giao diện render lại dữ liệu mới trong nháy mắt mà không bị dính data cũ.
- **[CRITICAL] Phân quyền:** Các action nhạy cảm (như nút "Duyệt") đã được ẩn an toàn và server validations đều check `RBAC` role & project access permissions.

## 5. Kết quả Verification
- **Prisma Validate:** PASS 🚀
- **TypeScript Check (`tsc`):** PASS 
- **Build Server (`npm run build`):** PASS (Đã optimize)
- **Browser UAT Runtime:** PASS 
  - *(Ghi nhận quá trình Bot test click context switcher trên Dashboard, sang Vật tư, thử chọn Toàn hệ thống, rồi chọn lại Tây Hồ, sau đó đi qua Tài liệu. Scope hoàn toàn nhất quán. Screenshot lưu trữ tại `.system_generated`)*.

## 6. Đánh giá Rủi ro & Kết luận
**Kết luận:** Hệ thống quản trị công trình xây dựng (Các màn chính) đã được ĐỒNG BỘ HÓA CAO ĐỘ về logic Scope (Phạm vi dữ liệu) và Trải nghiệm người dùng (UX State). 
Khách hàng hoàn toàn có thể test quy trình toàn vẹn mà không gặp các lỗi rời rạc hay thao tác khó hiểu.

**Rủi ro còn lại (Cần lưu ý trong tương lai):**
- **Mobile Responsiveness cực đoan:** Table của phần Thanh toán hoặc Khối lượng nếu có trên 15 cột sẽ bị tràn ngang trên màn hình iPhone SE, cần bổ sung giải pháp "Horizontal Scroll Hint" hoặc "Card View cho Mobile".
- **Pagination Sync:** Một số danh sách dài hiện tại đang dùng load all / take 100, cần đồng bộ chuẩn pagination (Phân trang) khi dữ liệu công trình phình to ra.
