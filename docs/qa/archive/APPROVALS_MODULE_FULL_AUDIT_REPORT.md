# BÁO CÁO KIỂM TRA (AUDIT) TOÀN DIỆN MÔ-ĐUN APPROVALS (TRUNG TÂM PHÊ DUYỆT)

---

## 1. Kết luận

* **Approvals module**: **FAIL / CẦN FIX GẤP TRƯỚC KHI DÙNG THỰC TẾ**
* **Có sẵn sàng cho giám đốc/kế toán/chỉ huy trưởng dùng thật chưa?**: **CHƯA**. 
* **Rủi ro lớn nhất là gì?**: Phê duyệt (Approve/Reject) ở Trung tâm phê duyệt **hoàn toàn KHÔNG ĐỒNG BỘ (sync) trạng thái** về các module gốc (PaymentRequest, Contract, MaterialRequest, v.v.). Người dùng có thể duyệt ở đây nhưng phiếu bên Kế toán vẫn giữ nguyên trạng thái cũ (Pending), dẫn đến rối loạn dữ liệu trầm trọng và phải thao tác 2 lần bằng tay (double work). Hơn nữa, có Approval mồ côi trỏ đến PaymentRequest đã bị xóa.
* **Migration status có vấn đề không?**: **CÓ VẤN ĐỀ**. Migration `20260626090000_approvals_center` đang ở trạng thái **FAILED**.

---

## 2. Phạm vi đã kiểm tra

* **Routes**: `/approvals`.
* **Components**: `approval-center-client.tsx`.
* **API/actions**: `src/app/(dashboard)/approvals/actions.ts`.
* **Prisma models**: `ApprovalRequest`.
* **Migration status**: Migration failed chưa được resolve.
* **RBAC**: `approval-permissions.ts`.
* **Workflow/status**: Trạng thái `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`.
* **Sync module gốc**: Không có code đồng bộ (detached module).
* **History/audit**: Ghi nhận cơ bản vào bảng `AuditLog` nhưng chưa hoàn thiện UI hiển thị (chỉ có placeholder).
* **Concurrency/double approve**: Dùng `updateMany` với check `status: "PENDING"`, khá an toàn.
* **UI/UX**: Responsive tốt, có cảnh báo việc không sync dữ liệu.
* **Performance**: Chưa có phân trang server-side, load toàn bộ.
* **Security**: Dùng server-side verification và RBAC.
* **Build/typecheck**: Pass TypeScript compiler.

---

## 3. Sơ đồ luồng

* **Approval list flow**: Lọc ApprovalRequest theo projectId (qua `projectMembers`). Các sếp / Admin thấy toàn bộ.
* **Submit flow**: Tạo bằng tay hoặc từ module khác gọi vào (thiếu webhook tự động hóa rõ ràng). Trạng thái khởi điểm là `PENDING`.
* **Approve/reject flow**: Gọi API kiểm tra `status === PENDING` -> Update thành `APPROVED/REJECTED` -> Ghi log.
* **Sync module flow**: **BỊ ĐỨT GÃY**. Không có bất kỳ dòng code nào update ngược lại `PaymentRequest` hay `Contract`.
* **History flow**: Ghi lịch sử đơn giản vào `AuditLog`.
* **Permission flow**: Phân quyền dựa trên cấp bậc (Admin/Manager được duyệt) và vai trò trong Project.

---

## 4. Dữ liệu hiện tại

| Metric | Count / Kết quả |
| ------ | --------------: |
| Tổng số approval requests | 6 |
| Số pending (DRAFT/SUBMITTED) | 2 |
| Số approved | 2 |
| Số rejected | 1 |
| Số cancelled | 1 |
| Theo module (PAYMENT) | 2 |
| Theo module (CONTRACT) | 1 |
| Theo module (MATERIAL) | 1 |
| Theo module (REPORT) | 1 |
| Approval mồ côi trỏ PaymentRequest không tồn tại | 2 |
| Dữ liệu rác (prefix QA_) | 0 |
| Approved thiếu approvedAt | 0 |
| Rejected thiếu rejectedAt | 0 |

---

## 5. Migration/schema status

* `npx prisma migrate status` kết quả: Phát hiện 14 migrations, trong đó migration `20260626090000_approvals_center` đã **FAILED**.
* Prisma schema validate/generate **PASS** (schema hợp lệ với DB hiện tại, nhưng migration state bị lỗi track).
* Chưa tự ý fix theo đúng nguyên tắc vòng này.

---

## 6. RBAC matrix

| Role/User | View Queue | View Project | Approve | Reject | Cancel | View History | Direct API | Kết quả |
| --------- | ---------- | ------------ | ------- | ------ | ------ | ------------ | ---------- | ------- |
| ADMIN/DIRECTOR | Có | Có | Có | Có | Có | Có (DB) | Chặn quyền hợp lệ | An toàn |
| MANAGER (PM) | Có | Thuộc dự án | Có | Có | Thuộc dự án | Có (DB) | Chặn quyền hợp lệ | An toàn |
| ACCOUNTANT | Có | Payment | Không | Không | Không | Có (DB) | Chặn quyền hợp lệ | An toàn |
| STAFF/ENGINEER | Có | Thuộc dự án | Không | Không | Nếu là creator | Có (DB) | Chặn quyền hợp lệ | An toàn |

---

## 7. Workflow matrix

| Case | Kết quả hiện tại | Severity | Ghi chú |
| ---- | ---------------- | -------- | ------- |
| Reject khi không phải PENDING | Bị chặn | NONE | API check `status: "PENDING"` bằng `updateMany` |
| Approve khi không phải PENDING | Bị chặn | NONE | API check `status: "PENDING"` bằng `updateMany` |
| Tự Approve phiếu của mình | Bị chặn | NONE | API chặn nếu `requesterId === session.id` (trừ Admin) |
| Double approve | Chặn | NONE | `updateMany` count |

---

## 8. Sync module matrix

| Module | Submit Sync | Approve Sync | Reject Sync | Severity | Ghi chú |
| ------ | ----------- | ------------ | ----------- | -------- | ------- |
| Payment | Lệch | KHÔNG | KHÔNG | CRITICAL | Module bị cô lập. UI có hiện cảnh báo nhưng về business logic là sai trầm trọng. |
| Contract | Lệch | KHÔNG | KHÔNG | CRITICAL | Như trên. |
| Material | Lệch | KHÔNG | KHÔNG | CRITICAL | Như trên. |
| Report | Lệch | KHÔNG | KHÔNG | CRITICAL | Như trên. |

---

## 9. History/audit matrix

| Case | Kết quả hiện tại | Severity | Ghi chú |
| ---- | ---------------- | -------- | ------- |
| Ghi Log | Có vào `AuditLog` | NONE | |
| UI hiển thị | KHÔNG (Chỉ có placeholder) | HIGH | Người duyệt không xem được vết. |

---

## 10. UI/UX matrix

| Khu vực | Vấn đề | Viewport | Severity | Ghi chú |
| ------- | ------ | -------- | -------- | ------- |
| Detail Drawer | Không hiển thị file đính kèm/chi tiết phiếu thanh toán | Desktop & Mobile | HIGH | Thiếu thông tin để quyết định (duyệt mù). |
| Data Warning | Hiện cảnh báo rủi ro Sync data | Desktop & Mobile | NONE | Hữu ích trong giai đoạn hệ thống chưa hoàn thiện. |

---

## 11. Danh sách lỗi phát hiện

### APP-BUG-001 — Không đồng bộ trạng thái về Module gốc (Detached Approval)
* **Severity**: CRITICAL
* **Khu vực**: API/Workflow
* **File liên quan**: `src/app/(dashboard)/approvals/actions.ts`
* **Cách tái hiện**: Approve 1 yêu cầu loại `PAYMENT` trong Approval Center.
* **Kết quả hiện tại**: Approval request thành `APPROVED`, nhưng `PaymentRequest` bên phân hệ Kế toán vẫn giữ trạng thái cũ.
* **Hậu quả thực tế**: Sếp duyệt xong nhưng kế toán không thấy phiếu được duyệt để chi tiền. User phải chỉnh tay 2 nơi.
* **Phương án fix đề xuất**: `approveApprovalRequest` và `rejectApprovalRequest` phải gọi cập nhật chéo sang các module tương ứng (`PaymentRequest`, `Contract`, v.v.) qua event hoặc call trực tiếp. Cần transaction tổng.

### APP-BUG-002 — Approval mồ côi (Orphan) do không bắt sự kiện Delete
* **Severity**: MEDIUM
* **Khu vực**: DB/API
* **File liên quan**: `src/app/(dashboard)/accounting/actions.ts`
* **Cách tái hiện**: Chạy file audit phát hiện 2 approval trỏ về PaymentRequest đã không còn tồn tại.
* **Kết quả hiện tại**: Khi module gốc (Kế toán) bị xóa cứng hoặc xóa mềm, ApprovalRequest không cập nhật theo.
* **Hậu quả thực tế**: Approval Center hiển thị lỗi dữ liệu.

### APP-BUG-003 — UI duyệt thiếu thông tin chứng từ
* **Severity**: HIGH
* **Khu vực**: UI
* **File liên quan**: `approval-center-client.tsx`
* **Kết quả hiện tại**: Detail Drawer chỉ hiện tiêu đề, số tiền, loại và tên dự án. KHÔNG chứa nội dung bảng vật tư, điều khoản hợp đồng hay Invoices đính kèm.
* **Hậu quả thực tế**: Người có thẩm quyền phải mở song song 2 tab (Approval và Phân hệ gốc) để soi chứng từ trước khi click duyệt, giảm hiệu suất trải nghiệm.

### APP-BUG-004 — Migration `20260626090000_approvals_center` FAILED
* **Severity**: CRITICAL
* **Khu vực**: DB/Prisma
* **Hậu quả thực tế**: Đe dọa khả năng deploy và bảo trì database. Cần resolve (`prisma migrate resolve --applied ...`) gấp theo tình trạng thực tế.

---

## 12. P0/P1/P2 plan

### P0 — Bắt buộc fix ngay
* Gắn hook/trigger để Approve/Reject sync trạng thái thẳng xuống module PaymentRequest, Contract, MaterialRequest.
* Sửa lỗi Migration Failed để dọn sạch repo DB.
* Xóa/ẩn các Orphan Approvals.

### P1 — Fix trước UAT
* Hiển thị nội dung File đính kèm / Chi tiết vật tư / Bảng tính toán ngay trong Drawer Approval (tránh duyệt mù).
* Bổ sung hiển thị `AuditLog` vào Drawer.

### P2 — Tối ưu sau
* Phân trang (Pagination) server-side để tránh phình to RAM khi có hàng nghìn Approval.

---

## 13. Lệnh đã chạy

| Lệnh | Kết quả | Ghi chú |
| ---- | ------- | ------- |
| `git status --short` | PASS | Code hiện tại hoàn toàn sạch. |
| `npx prisma migrate status` | FAIL | Migration 20260626090000_approvals_center failed. |
| `npx tsx scripts/qa-approvals-audit.ts` | PASS | In thành công các metrics. |

---

## 14. Git status cuối

```bash
?? docs/qa/APPROVALS_MODULE_FULL_AUDIT_REPORT.md
?? scripts/qa-approvals-audit.ts
```

## 15. Cam kết

* Chưa fix code.
* Chưa commit.
* Chưa push.
* Không reset DB.
* Không chạy migration/resolve migration.
* Không xóa/sửa dữ liệu thật.
* Không tạo approval thật nếu chưa được duyệt.
