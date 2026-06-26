# PHÊ DUYỆT (APPROVAL CENTER) - FINAL GO/NO-GO AUDIT REPORT V2

**Ngày kiểm tra:** 26/06/2026  
**Mô đun:** Phê duyệt (Approval Center) `/approvals`  
**Mục tiêu:** Kiểm tra và xác nhận hoàn thành đợt nâng cấp UI/UX toàn diện và nghiệp vụ xóa mềm dựa trên phản hồi của UAT, đảm bảo module đạt tiêu chuẩn chuyên nghiệp, sạch lỗi, không rò rỉ dữ liệu và sẵn sàng GO.

---

## 1. UI/UX & LAYOUT (GO)
- **Giao diện Desktop/Laptop (min-w-800px):**
  - Đã loại bỏ hoàn toàn hiện tượng thanh cuộn ngang (horizontal scroll) cho các màn hình tiêu chuẩn bằng cách gộp các cột thông tin tối ưu (từ 7 cột xuống 5 cột).
  - Cột `Thao tác` được cố định (sticky) sang bên phải một cách tự nhiên, không bị khuất, có đổ bóng nhẹ để dễ nhận biết.
  - Tối ưu hóa độ rộng và cắt gọn nội dung dài (`line-clamp`) đảm bảo bảng dữ liệu không bị vỡ.
- **Giao diện Mobile/Tablet (Card List):**
  - Khi thiết bị thu nhỏ (dưới chuẩn `sm`), bảng (table) sẽ tự động ẩn và hiển thị dạng **Card List** trực quan.
  - Card List được thiết kế gọn gàng, chia lưới (grid) hợp lý, hiển thị đầy đủ thông tin (Code, Trạng thái, Người tạo, Giá trị, Nguồn) và các nút thao tác tương ứng mà không bị tràn viền.
- **Ngôn ngữ & Text:**
  - `SOURCE_TYPE_LABELS` đã được chuẩn hóa (Thanh toán, Yêu cầu vật tư, Báo cáo hiện trường, Hợp đồng, Nghiệm thu khối lượng, Phát sinh...).
  - Không còn bất kỳ text rác, dummy, test hay placeholder trên giao diện.

## 2. NGHIỆP VỤ & TÍCH HỢP LIÊN THÔNG (GO)
- **Liên kết nguồn (Source Integration):**
  - Hỗ trợ đa dạng loại nguồn thông qua biến `ApprovalSourceType`: `PAYMENT_REQUEST`, `MATERIAL_REQUEST`, `SITE_REPORT`, `CONTRACT`, `FIELD_PROGRESS`, `CHANGE_ORDER`, `DOCUMENT`, `PURCHASE_REQUEST`.
  - Nếu yêu cầu là do hệ thống tự sinh qua webhook/trigger từ một phân hệ khác, UI sẽ hiển thị chính xác module nguồn (VD: "Nguồn: Yêu cầu vật tư • UAT-MR-001").
  - Các yêu cầu không có `sourceId` sẽ hiển thị rõ là "Chỉ tham chiếu nội bộ".
- **Workflow & Trạng thái:**
  - Giữ vững nghiệp vụ "PENDING-only action" cho các nút Duyệt/Từ chối.
  - Các trạng thái APPROVED / REJECTED / CANCELLED sẽ chỉ cho phép Xem chi tiết (và Xóa nếu có quyền).

## 3. RBAC, PROJECT SCOPE & SOFT DELETE (GO)
- **Soft Delete Policy:**
  - Bổ sung nút **Xóa** áp dụng cho mọi trạng thái (PENDING, APPROVED, REJECTED, CANCELLED) dựa vào `permissions.canSoftDelete`.
  - Phân quyền xóa mềm đã được chuẩn hóa trong `approval-permissions.ts`:
    - **ADMIN:** Có thể xóa mọi yêu cầu.
    - **PROJECT_MANAGER:** Có thể xóa bất kỳ yêu cầu nào thuộc công trình của mình.
    - **Người tạo (Requester):** Chỉ có thể xóa các yêu cầu do mình tạo VÀ đang ở trạng thái `PENDING`.
- **Database Integrity:**
  - Khi bấm Xóa, hệ thống gọi action `softDeleteApprovalRequest`, chỉ set `deletedAt = NOW()`, dữ liệu không bao giờ bị hard-delete.
  - Hành động xóa được lưu trữ đầy đủ vào `AuditLog`.
  - Ngăn chặn hoàn toàn việc rò rỉ dữ liệu (Project Scope Isolation) – User ngoài công trình tuyệt đối không thể thấy hoặc xóa yêu cầu.

## 4. CHẤT LƯỢNG CODE & QA (GO)
- **TypeScript:** `npx tsc --noEmit` hoàn thành với `Exit code: 0`. Toàn bộ Type và DTO (Decimal/Date serialization) đã an toàn.
- **Build Server:** `npm run build` hoàn thành với `Exit code: 0`. SSR và Server Actions không có cảnh báo nghiêm trọng.
- **Tự động hóa QA (QA Script):**
  - Cập nhật kịch bản test `scripts/qa-approvals.ts` để cover toàn bộ Rule xóa mềm, DTO và Kiểm tra nguồn (Source Integrity).
  - Kết quả: `Approvals QA completed successfully. (PASS 100%)`.
- **Data Seed UAT:**
  - Cập nhật `scripts/seed-approvals-uat.ts` với >15 kịch bản thực tế bao trùm các module (Payment, Material, Report, Contract, Field Progress...) để phục vụ UAT và Demo.

---

## TỔNG KẾT & QUYẾT ĐỊNH
**Trạng thái: GO HOÀN TOÀN**

Màn hình `/approvals` đã đáp ứng 100% các tiêu chí khắt khe về UI/UX (không cuộn ngang, có responsive mobile), nghiệp vụ liên thông ERP (8 loại source types), và bảo mật (Project-scoped Soft Delete an toàn). 
Mã nguồn đã qua kiểm định QA, Build và TS chặt chẽ. Hệ thống sẵn sàng để chuyển sang phát triển hoặc kiểm tra phân hệ tiếp theo.
