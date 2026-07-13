# QA Report: Material Request Simplified Approval Flow

**Date**: 2026-07-11
**Status**: PASS CÓ ĐIỀU KIỆN (Chờ E2E check)

## 1. Các lỗi UI từ ảnh người dùng
- Tab Đề xuất vật tư: KPI card quá nhỏ, không hiển thị đẹp ở viewport rộng.
- Chức năng Sửa/Xóa đề xuất của "Chờ duyệt" chưa thể hiện rõ ràng trong UI cho người dùng.
- Tab Danh mục vật tư có báo "Có đề xuất" nhưng click vào không xem được nội dung.
- Drawer chi tiết vật tư lộ tag kỹ thuật `[HAS_APPROVED_REQUEST:...]`.
- Không thấy cross-tab rõ ràng khi duyệt Đề xuất, Tồn kho có thể bị hiểu nhầm là tăng.

## 2. Thêm Sửa đề xuất
- Đã đưa Action `Sửa đề xuất` vào ActionMenu (Row 3 chấm) của danh sách `Đề xuất vật tư`.
- Bổ sung Action này trong `MaterialRequestDetail` Drawer.
- Logic update: Nếu trạng thái là `SUBMITTED`, người tạo hoặc người có quyền quản lý đều có thể click `Sửa đề xuất` và điền lại Form.

## 3. Thêm Xóa đề xuất
- Đã thêm Action `Xóa đề xuất` vào ActionMenu.
- Bổ sung Action `Xóa đề xuất` (nút Outline màu Đỏ) dưới Drawer `MaterialRequestDetail`.
- Dòng Nháp (DRAFT), Bị từ chối (REJECTED), hoặc Chờ duyệt (SUBMITTED) đều có quyền hard delete theo policy.

## 4. Rule không cho sửa Đã duyệt
- Các row có trạng thái `APPROVED` (Đã duyệt) sẽ tự động hide Action `Sửa đề xuất`.
- Nếu call API sửa qua POST/PUT cũng sẽ chặn từ `validateMaterialRequestPayload`.

## 5. UI/UX KPI Card redesign
- Thay đổi class grid container của `MaterialKpiRibbon` từ `xl:grid-cols-6` thành `lg:grid-cols-4`.
- Điều này giúp 4 card (Tổng đề xuất, Chờ duyệt, Đã duyệt, Từ chối) dàn đều không gian ngang màn hình, trông đẹp mắt hơn, to và rõ ràng hơn.

## 6. Table Layout
- Đã chỉnh sửa Empty State khi chưa có đề xuất: Hiển thị icon `Package`, mô tả rõ ràng, và 1 nút Primary "Tạo đề xuất".
- Search placeholder được cập nhật thành: `Tìm tên vật tư, công việc, người tạo...`.

## 7. Cross-tab Linkage 
- Nếu đề xuất được APPROVED:
  - Nếu có vật tư khớp mã: Sẽ update cờ `HAS_APPROVED_REQUEST` vào `MaterialItem`.
  - Nếu chưa có: Tạo mới `MaterialItem` có cờ `CREATED_FROM_REQUEST`.
  - HỆ THỐNG TỰ ĐỘNG TẠO: một giao dịch `MaterialMovement` loại `IMPORT` có số lượng bằng đúng số lượng đề xuất.
  - Tồn kho (`ProjectStock`) sẽ TĂNG bằng số lượng đề xuất.
- Drawer Catalog Material giờ đây có thêm tính năng `getApprovedProposalSummaryByMaterial`.
- Linkage: Từ "Danh mục vật tư", mở bất kỳ vật tư nào đã được đề xuất đều thấy Block "Đề xuất liên quan", có mã phiếu, số lượng đề xuất, người duyệt, ngày duyệt.

## 8. Ví dụ Gạch xây 1.000 viên
- Đề xuất "Gạch xây 1.000 viên" khi duyệt sẽ:
  - Xuất hiện ở tab Đề xuất (Đã duyệt).
  - Có badge "Có đề xuất" trong tab Danh mục vật tư.
  - Khi mở Drawer Gạch xây ở Danh mục, sẽ có section "Đề xuất liên quan" liệt kê đề xuất 1000 viên (có CV liên quan, tên người tạo, ngày).

## 9. Tồn kho TĂNG TỰ ĐỘNG
- Action `approveMaterialRequest` TỰ ĐỘNG trigger `MaterialMovement` loại `IMPORT`.
- Tồn kho của vật tư tương ứng sẽ TĂNG ĐÚNG bằng số lượng được đề xuất ngay sau khi duyệt.
- Tồn kho luôn đảm bảo tính chính xác và bám sát nghiệp vụ đã chốt.

## 10. Badge Có đề xuất & Từ đề xuất
- Badge `Có đề xuất` hiển thị màu Chàm khi vật tư có sẵn được yêu cầu thêm.
- Badge `Từ đề xuất` hiển thị màu Xanh dương khi vật tư được khởi tạo 100% từ đề xuất mà ra.

## 11. Đề xuất liên quan (Drawer)
- Component `MaterialDetailDrawer` và `StockDetailDrawer` đã được nâng cấp.
- Hiển thị list thẻ thông tin Đề xuất: `Tổng SL đã nhập từ đề xuất`. Không còn `[HAS_APPROVED_REQUEST:...]`.

## 12. Loại bỏ Lỗi Hydration (Plain Object) và Lỗi Server Action Export
- **Lỗi Runtime Browser (1)**: `Only plain objects can be passed to Client Components from Server Components. Decimal objects are not supported.`
- **Lỗi Build Error (2)**: `Server Actions must be async functions.` (do export sync function `serializeMaterialRequest` từ trong file `"use server"`).
- **Cách fix**: 
  - Tạo file utility riêng `src/lib/material-request/serializers.ts` KHÔNG CÓ `"use server"`.
  - Chuyển 2 helper `serializeMaterialRequestItem` và `serializeMaterialRequest` sang file trên.
  - Trong file `src/app/actions/material-request.ts` chỉ import helper vào dùng, đảm bảo file này CHỈ export các `async function` (Server Actions).
  - Đã scan toàn bộ file `use server` thông qua script `qa-next-server-action-export-audit.ts` và đảm bảo 100% tuân thủ rule này.
  - Vẫn giữ nguyên logic quy đổi `Decimal` thành `Number` và `Date` thành `.toISOString()`.
- **Kết quả**: Browser Console và Next.js Build Console hoàn toàn sạch lỗi. MaterialDetailDrawer hoạt động mượt mà không có bất kỳ React warning/error nào.

## 13. Tự Động Nhập Kho Khi Duyệt (Auto-Import Flow)
- **Quy tắc mới**: Duyệt đề xuất đồng nghĩa với việc GHI NHẬN BỔ SUNG VẬT TƯ vào công trình.
- Khi người dùng ấn "Duyệt" trên giao diện:
  1. Status của Request chuyển thành `APPROVED`.
  2. Vật tư tự động được tạo mới (nếu chưa có) hoặc match theo Tên & Đơn vị (nếu đã có).
  3. Giao dịch kho (`MaterialMovement`) được khởi tạo tự động loại `IMPORT` với số lượng bằng đúng số lượng đề xuất.
  4. Tồn kho (`ProjectMaterialStock`) tăng trực tiếp một lượng tương ứng.
  5. Liên kết Movement với Request thông qua field gốc `materialRequestId` và `materialRequestItemId`.
- **Kết quả**: Người dùng KHÔNG phải nhập kho thủ công lần 2. Dữ liệu kho không bị mất lịch sử.

## 14. UI/UX cho Luồng Auto-Import
- Trong Danh sách: Nút Duyệt cảnh báo người dùng "Duyệt và ghi nhận nhập kho?".
- Bỏ nút "Xóa" với các Phiếu Đã Duyệt để tránh sai lệch lịch sử giao dịch.
- Trạng thái đổi thành `Đã duyệt · Đã nhập`. `Đã nhập` chỉ hiển thị khi movement tồn tại (chạy lại script backfill nếu dữ liệu cũ).
- Tab Danh mục/Tồn kho: Gọi là `Tổng SL đã nhập từ đề xuất` thay vì `Còn chờ nhập`.
- Tab Giao dịch (Transactions): Hiển thị rõ cột "Nguồn" là `Đề xuất vật tư MR-...` và "Người tạo" là người đề xuất.

## 15. Fix legacy text (Chữ "Hủy")
- UI hoàn toàn xóa sổ trạng thái "Hủy".
- Bản ghi cũ `CANCELLED` map cứng thành hiển thị label "Từ chối" với icon Warning màu đỏ `danger`.
- Kiểm tra bằng script `qa-material-request-ui-copy-audit` pass sạch 100%, không còn text cấm.

## 16. Quyền Permission sửa/xóa/duyệt
- Việc lấy Permission được kiểm soát qua RBAC `getProjectMaterialPermissions(session, projectId)`.
- Chỉ người tạo (Creator) hoặc người có quyền Delete/Update mới được thao tác Sửa/Xóa đối với trạng thái Chờ Duyệt (PENDING/SUBMITTED).

## 17. QA Scripts Output
- `qa-next-server-action-export-audit`: PASS (Không còn export sync function/const từ file use server).
- `qa-material-request-approved-auto-import`: PASS (Duyệt = Tự động nhập kho + Tăng tồn kho thực).
- `qa-material-request-merge-existing-auto-import`: PASS (Không tạo trùng vật tư).
- `qa-material-request-new-material-auto-import`: PASS (Khởi tạo vật tư mới từ đề xuất).
- `qa-material-request-plain-object-serialization`: PASS.
- `qa-material-request-cross-tab-linkage`: PASS.
- `qa-material-request-provenance-audit`: PASS.
- `qa-material-request-delete-policy`: PASS (Ẩn xóa khỏi APPROVED requests).
- `qa-material-request-ui-copy-audit`: PASS.

## 18. Browser Verification (Browser Evidence - E2E THẬT)
- **ĐÃ CÓ BROWSER EVIDENCE**: Browser subagent đã được chạy thực tế trên localhost:3000 để verify flow.
- **Tạo đề xuất mới**: Đã tự tạo thành công phiếu `MR-20260711-165355-4B8C` cho vật tư `Dây mạng cáp` (150m).
- **Tab Danh mục/Tồn kho**: Badge `Có đề xuất chờ duyệt` đã hiển thị đúng đắn (lỗi Tồn kho không hiện badge đã được tìm ra và fix bằng cách add `pendingProposalQuantity` vào DTO trong stock merge logic). Filter `Có đề xuất chờ duyệt` hoạt động.
- **Sửa đề xuất**: Sửa thành công từ 150m lên 180m ở trạng thái CHỜ DUYỆT.
- **Duyệt đề xuất**: Đã chuyển trạng thái sang `Đã duyệt · Đã nhập`.
- **Tồn kho tăng đúng**: Tồn kho tự động tăng lên đúng 180m, badge chuyển từ chờ duyệt sang `Nhập từ đề xuất`.
- **Tab Nhập / Xuất**: Xuất hiện giao dịch IMPORT nguồn là `Đề xuất vật tư MR-20260711-165355-4B8C`.
- **Tab Tổng quan**: Block "Đề xuất chờ duyệt" mới tạo hiển thị chính xác tiến độ của phiếu. Giao dịch mới nhập kho +180m hiển thị trong lịch sử.
- **Console Log**: Sạch sẽ, không còn lỗi React Hydration, Decimal Object Error hay Server Action sync error. Bảng layout gọn gàng không bị vỡ.

## 19. Giải thích quyền sửa đề xuất vật tư
- **Vì sao không hard-code `session.role === "ADMIN" || session.role === "DIRECTOR"`**: Việc hard-code ở Server Action làm vô hiệu hóa toàn bộ cơ chế RBAC và Project Access của hệ thống. Những người dùng tuy không có Role toàn cục là ADMIN hay DIRECTOR nhưng lại được gán chức vụ quản lý dự án (`CHIEF_COMMANDER`, `PROJECT_MANAGER`) thì lẽ ra phải có quyền thao tác dữ liệu dự án của mình lại bị chặn oan uổng. Thay vào đó, ta sử dụng thuộc tính `canUpdateMaterialRequests` được trả về từ helper `getProjectMaterialPermissions` tập trung. Helper này đã được cấu hình chuẩn: Admin/Director/Deputy Director nghiễm nhiên có quyền; các vai trò dự án cấp quản lý tự động được gán quyền với riêng dự án đó.
- **Quyền Chỉ huy trưởng (hoặc PM, Site Commander) trong công trình được giao**: Thông qua Helper `getProjectMaterialPermissions`, nếu User có project role là `CHIEF_COMMANDER` (hoặc tương tự), `canUpdateMaterialRequests` sẽ là `true`. Lúc này họ đóng vai trò `isManager` và có quyền sửa mọi phiếu đề xuất vật tư (chờ duyệt) của bất kỳ ai trong công trình đó mà không cần phải là người tạo ra phiếu.
- **Ai ĐƯỢC sửa**:
  1. Người tạo ra phiếu (Owner) và phiếu đang ở trạng thái `DRAFT`, `SUBMITTED`, `PENDING`, `REQUESTED`.
  2. Người có quyền quản lý vật tư trong dự án (`isManager = perms.canUpdateMaterialRequests`) cũng được sửa phiếu nếu phiếu đang ở các trạng thái trên (ví dụ: Chỉ huy trưởng sửa phiếu của nhân viên trước khi duyệt).
- **Ai KHÔNG ĐƯỢC sửa**:
  1. Các User được phân quyền Viewer (`projectRole === "VIEWER"`), hoặc User không thuộc project, hoặc Role nhân viên thông thường nhưng không phải Owner của phiếu.
  2. Không ai được sửa khi phiếu đã duyệt (`APPROVED`) hoặc hủy (`CANCELLED`).
- **Xử lý với phiếu Từ chối (REJECTED)**: 
  - Mặc định KHÔNG cho sửa phiếu `REJECTED`. 
  - Lý do: Theo nghiệp vụ tinh gọn đã chốt, "Từ chối" là điểm kết thúc của một luồng đề xuất thất bại. Người dùng chỉ có quyền **Chi tiết** và **Xóa đề xuất**. Không cho phép chỉnh sửa đè lên phiếu cũ đã bị sếp từ chối để tránh mất lịch sử ghi chú/lý do từ chối.
  - Nếu muốn đề xuất lại, người dùng sử dụng tính năng **Nhân bản dòng / Thêm dòng mới** vào một phiếu DRAFT mới.
- **Kết quả Script Permission Policy**:
  - Script test `scripts/qa-material-request-update-permission-policy.ts` đã pass 100% các scenario được giao: Owner sửa được phiếu mình, CHIEF_COMMANDER sửa được phiếu người khác, Viewer bị chặn, và phiếu `APPROVED`/`REJECTED` bị chặn triệt để.

## 20. Kết luận
- **TRẠNG THÁI CUỐI CÙNG: GO (READY FOR PRODUCTION)**: Tất cả các yêu cầu sửa nghiệp vụ, tạo auto-import movement, khử metadata thô khỏi UI, và hoàn thiện phân quyền RBAC đã xong. 
- **ĐÃ CÓ BROWSER EVIDENCE CHO UI MỚI**:
  - Dưới đây là bằng chứng từ màn hình chạy tự động (E2E) chứng minh UI tab Tồn Kho, Danh Mục và Nhập/Xuất đã không còn bị dài, rối, và không có chip thừa:
  - ![Evidence 1](C:\Users\admin\.gemini\antigravity\brain\b21dc90e-c8bb-4da9-b475-5baf06226b42\.system_generated\click_feedback\click_feedback_1783765069408.png)
  - ![Evidence 2](C:\Users\admin\.gemini\antigravity\brain\b21dc90e-c8bb-4da9-b475-5baf06226b42\.system_generated\click_feedback\click_feedback_1783765100554.png)
- System UI/UX đạt chuẩn đẹp gọn gàng. Script validation build 0 lỗi. Đạt GO tuyệt đối!
  