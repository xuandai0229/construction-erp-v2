# Global UI/UX Controlled Professional Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuẩn hóa và polish UI toàn ERP mà không thay đổi logic nghiệp vụ hoặc dữ liệu.

**Architecture:** Dùng semantic tokens và primitive UI làm nền, sau đó sửa markup/class theo module. Giữ nguyên server actions, query, state transitions và permissions.

**Tech Stack:** Next.js 16.2.7 App Router, React 19, Tailwind CSS 4, TypeScript, Lucide.

---

### Task 1: Static UI contract

**Files:**
- Create: `scripts/qa-global-ui-ux-static.ts`

- [ ] Viết assertions cho light theme, page container, focus ring, dialog semantics, action labels và việc Reports không dùng `window.confirm`.
- [ ] Chạy script và xác nhận FAIL trước khi sửa.

### Task 2: Global foundation

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/layout/app-shell.tsx`
- Modify: `src/components/layout/header.tsx`
- Modify: `src/components/layout/sidebar.module.css`
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/card.tsx`
- Modify: `src/components/ui/status-badge.tsx`
- Modify: `src/components/ui/empty-state.tsx`
- Modify: `src/components/ui/confirm-dialog.tsx`

- [ ] Cố định light enterprise surface và focus-visible.
- [ ] Chuẩn hóa page container, header, primitive sizing/shadow.
- [ ] Bổ sung CTA linh hoạt cho EmptyState và dialog mobile-safe.

### Task 3: Reports and Projects

**Files:**
- Modify: `src/components/reports/reports-workspace.tsx`
- Modify: `src/components/reports/reports-table.tsx`
- Modify: `src/components/reports/reports-mobile-cards.tsx`
- Modify: `src/components/reports/report-detail-drawer.tsx`
- Modify: `src/components/reports/create-report-dialog.tsx`
- Modify: `src/components/reports/print-report-toolbar.tsx`
- Modify: `src/app/(dashboard)/projects/page.tsx`
- Modify: `src/app/(dashboard)/projects/[id]/page.tsx`
- Modify: `src/components/projects/project-form.tsx`

- [ ] Thay native confirm bằng ConfirmDialog nhưng giữ nguyên soft-delete handler.
- [ ] Chuẩn hóa action icon, badge, table/card và mobile spacing.
- [ ] Giảm shadow/border quá mạnh ở project detail.

### Task 4: Documents and Users

**Files:**
- Modify: `src/app/(dashboard)/documents/page.tsx`
- Modify: `src/app/(dashboard)/documents/[projectId]/page.tsx`
- Modify: `src/components/documents/document-workspace.tsx`
- Modify: `src/components/documents/document-viewer.tsx`
- Modify: `src/app/(dashboard)/users/page.tsx`
- Modify: `src/components/users/user-management-client.tsx`

- [ ] Làm toolbar/card Documents rõ hơn, action luôn discoverable trên touch.
- [ ] Chuẩn hóa Users table/card, modal shell, form responsive và action buttons.
- [ ] Bổ sung role/dialog/aria semantics còn thiếu.

### Task 5: Placeholder modules and verification

**Files:**
- Modify: các page Materials, Suppliers, Contracts, Accounting, Approvals, Audit, Settings.
- Create: `docs/qa/GLOBAL_UI_UX_REWORK_IMPLEMENTATION_REPORT.md`

- [ ] Chuẩn hóa page header và empty-state pattern.
- [ ] Chạy static contract, Prisma, TypeScript, ESLint, build.
- [ ] UAT browser 1440/1366/768/390 nếu credential sẵn có.
- [ ] Ghi kết quả thật, rủi ro còn lại và Production NO-GO.

> Ghi chú: kế hoạch này cố ý không có bước commit vì người dùng cấm commit/push.
