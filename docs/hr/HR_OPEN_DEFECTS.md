# HR Open Defects — Sổ Ghi Nhận Lỗi Phân Hệ Nhân Sự

**Phiên bản:** 1.1.0  
**Tác giả:** Ban Kiểm Định Chất Lượng Phần Mềm  
**Trạng thái Kiểm toán:** PARTIALLY VERIFIED  
**Cập nhật gần nhất:** 04/08/2026  

---

## I. TỔNG QUAN NGUYÊN TẮC QUẢN LÝ LỖI (DEFECT POLICY)

- **Lỗi Critical (Nghiêm trọng):** Rò rỉ PII, bypass authorization, IDOR, hỏng dữ liệu DB, crash hệ thống. -> **BẮT BUỘC SỬA NGAY. GIỮ STATUS NO-GO.**
- **Lỗi High (Cao):** Xung đột nghiệp vụ, trôi mã quyền, lỗi biên dịch TypeScript, lỗi UI ngăn cản thao tác chính. -> **BẮT BUỘC SỬA TRƯỚC KHI RELEASE PHASE.**
- **Lỗi Medium / Low (Trung bình / Thấp):** Cải tiến giao diện nhỏ, tooltip chưa tối ưu. -> Xắp xếp sửa trong đợt Hardening tiếp theo.

---

## II. BẢNG THEO DÕI LỖI HIỆN TẠI

| Defect ID | Phân Hệ | Mức Độ | Mô Tả Lỗi | Trạng Thái | Bằng Chứng / Điều Kiện Đóng |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **DEF-01** | HR Org | High | Permission code drift giữa `hr:org_unit:manage` và `hr:organization:manage` | **VERIFIED CLOSED** | Đã chuẩn hóa canonical `hr:organization:manage` và alias mapping trong `permission-service.ts`. Unit test PASS. |
| **DEF-02** | HR Org | High | Bỏ qua invariant check trong action `deactivatePositionAction` | **VERIFIED CLOSED** | Đã tích hợp `validatePositionDeactivation` trong `organization-actions.ts`. Test `hr-phase3-mutation.spec.ts` PASS. |
| **DEF-03** | HR Org | Critical | Lỗ hổng Target Scope IDOR trên Server Actions | **VERIFIED CLOSED** | Đã bổ sung `validateTargetScope` cho 9 actions trong `organization-actions.ts`. Test `hr-phase3-scope.spec.ts` PASS. |
| **DEF-04** | HR Build | **HIGH** | Error TS2322 / TS2339 khi chạy `npx tsc --noEmit` & `npm run build` | **OPEN** | Lỗi gán kiểu `linkedUser.email` (`string | null` vs `string`) và thiếu thuộc tính `roleId`, `effectiveDate` trong DTO `employee-detail-view.tsx`. Lệnh `npm run build` thất bại với exit code 1. |

---

## III. KẾT LUẬN HIỆN TRẠNG LỖI

* **Tồn đọng hiện tại:** 0 Lỗi Critical / **1 Lỗi High (DEF-04)**.
* **Nguyên nhân nghẽn Release Gate:** Lỗi biên dịch TypeScript (DEF-04) ngăn cản quá trình build production (`npm run build`). Hệ thống ở trạng thái **NO-GO — PHASE 4 BLOCKED**.
