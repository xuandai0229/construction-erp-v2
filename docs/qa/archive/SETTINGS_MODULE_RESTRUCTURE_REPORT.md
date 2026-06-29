# BÁO CÁO TÁI CẤU TRÚC VÀ AUDIT MODULE SETTINGS

## 1. Kết luận

*   **Settings module**: PASS CÓ ĐIỀU KIỆN
*   **Lý do**:
    *   Hệ thống có nhiều setting đã được định nghĩa trong schema nhưng chưa được xây dựng luồng logic thực sự ở backend/background jobs (như Auto Backup, Email Digest, Push Notification).
    *   Phân quyền đã được tinh chỉnh khắt khe theo từng category thay vì để `canManageUsers` làm cờ update toàn bộ. DIRECTOR chỉ chỉnh sửa thông tin doanh nghiệp, không can thiệp hệ thống.
    *   Thêm `settings-registry.ts` làm metadata, chặn các request "lưu bừa" ở actions.
*   **Có migration mới không?** Không. Migration `20260626090000_approvals_center` vẫn đang failed từ nhánh trước, chờ xử lý riêng.
*   **Build/typecheck pass chưa?** PASS. Hệ thống build thành công.

## 2. File đã sửa / tạo mới

1.  `src/lib/settings/settings-registry.ts` - Bổ sung Registry với metadata (editable, implemented, adminOnly).
2.  `src/app/(dashboard)/settings/actions.ts` - Tách hàm check permission để block các key read-only/unimplemented và phân luồng ADMIN vs DIRECTOR.
3.  `src/components/settings/settings-workspace.tsx` - Tắt editable (disable) các field unimplemented, thêm badge nhắc nhở (Chưa kích hoạt / Chỉ hiển thị).
4.  `scripts/qa-settings-*.ts` - Cập nhật chặt chẽ hơn.

## 3. Information architecture & Implementation Matrix

| Setting / Key | Editable | Implemented | Used by | Decision |
| ------------- | -------: | ----------: | ------- | -------- |
| companyName, taxCode, hotline | Có | Có | UI | Cấp quyền cho DIRECTOR/ADMIN. |
| timezone, currency, fiscalYearStartMonth | Không | Không | Chưa có | ADMIN Only. Chuyển sang category System, đã disable do chưa có runtime đọc. |
| requireProjectCodeBeforeSpending | Không | Không | Chưa có | Đã disable do chưa có runtime. |
| reportLockAfterApproval | Không | Không | Chưa có | Đã disable do chưa có runtime. |
| enforceNamingConvention, autoVersioning | Có | Có | Upload API | ADMIN Only. Đã có runtime đọc. |
| sessionTimeoutMinutes | Không | Không | Chưa có | Đã disable do middleware/auth chưa đọc config này từ DB. |
| contractValueThreshold | Không | Không | Chưa có | Đã disable do Contracts controller chưa check runtime. |
| passwordRotationDays, 2FA | Không | Không | Chưa có | Read-only trên form, cấm update action. |
| allowedIpMode, trustedDeviceReviewDays | Không | Không | Chưa có | Read-only, badge "Chỉ hiển thị". |
| emailDailyDigest, approvalEscalation | Không | Không | Chưa có | Read-only, disable toggle giả. |
| automaticBackup, backupFrequency | Không | Không | Chưa có | Read-only, disable toggle/select. |
| documentRetentionYears | Không | Không | Chưa có | Read-only. |

## 4. RBAC matrix mới nhất

| Role | View settings | Edit company | Edit system | Edit security | Edit workflow/docs | Kết quả |
| ---- | ------------- | ------------ | ----------- | ------------- | ------------------ | ------- |
| ADMIN | Có | Có | Có | Có | Có | PASS |
| DIRECTOR | Có | Có | Không | Không | Không | PASS (via checkUpdatePermission) |
| DEPUTY_DIRECTOR | Có | Không | Không | Không | Không | PASS |
| ACCOUNTANT/OTHERS | Không | Không | Không | Không | Không | PASS |

## 5. Security checklist

| Check | Kết quả |
| -------------------------- | --------- |
| Action reject unknown keys | PASS (so khớp `changedData` qua `SETTINGS_REGISTRY`) |
| Action reject readOnly keys | PASS (báo lỗi "Chỉ đọc hoặc chưa kích hoạt") |
| Action reject via RBAC | PASS (DIRECTOR không sửa được key `category !== "company"`) |
| UI không có toggle giả | PASS (đã thêm `disabled={true}`) |

## 6. Lệnh đã chạy & Trạng thái

| Script | Ý nghĩa | Trạng thái |
| ------ | ------- | ---------- |
| qa-settings-audit.ts | Đọc DB settings (1 record toàn vẹn) | PASS |
| qa-settings-static.ts | Kiểm tra Registry và metadata | PASS |
| qa-settings-rbac.ts | Kiểm tra Server Action RBAC | PASS |
| qa-settings-ui-static.ts | Kiểm tra badge / state disables | PASS |
| npx tsc --noEmit | Typecheck toàn cục | PASS |
| npm run build | Build production | PASS |

## 7. Git status cuối

```bash
 M src/app/(dashboard)/settings/actions.ts
 M src/components/settings/settings-workspace.tsx
?? docs/qa/SETTINGS_MODULE_RESTRUCTURE_REPORT.md
?? scripts/qa-settings-audit.ts
?? scripts/qa-settings-rbac.ts
?? scripts/qa-settings-static.ts
?? scripts/qa-settings-ui-static.ts
?? src/lib/settings/settings-registry.ts
```

*(Các file liên quan đến Dashboard đã được stash ra khỏi working tree)*

## 8. Cam kết

*   Không commit.
*   Không push.
*   Không reset DB.
*   Không xóa dữ liệu thật.
*   Giao diện và backend không còn "nút lưu lừa dối". Dữ liệu không được phép sẽ bị reject ngay từ server.
