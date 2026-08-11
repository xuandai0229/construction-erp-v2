# Full System Action Menu Coverage Ledger & Standardization Matrix

## Executive Summary
This document provides a comprehensive, module-by-module coverage audit and standardization ledger for all record-level action menus across the `construction-erp-v2` platform.

As part of the system-wide UI/UX reconciliation initiative, all legacy record-level action UI patterns (including dual-action button arrays like `[Xem] [Sửa] [⋯]`, detached absolute dropdowns, and un-anchored floating menus) have been fully audited, refactored, and standardized to the canonical **`UnifiedActionMenu`** pattern.

---

## Standardization Rules & UX Contracts
Every record-level action menu across the ERP system strictly adheres to the following core design contracts:

1. **Single ⋯ Trigger Pattern**:
   - Every table row or card utilizes a single `MoreHorizontal` (`⋯`) trigger button.
   - Dual-action patterns (inline buttons alongside a dropdown) are strictly prohibited for table rows.
   
2. **Active Row Context Highlighting**:
   - When a row's action menu is active (`open === true`), the parent table row automatically highlights with a light blue background (`bg-blue-50/70`) and a bold left accent border (`border-l-2 border-l-blue-600 font-medium`).
   - Clicking outside or closing the menu immediately restores normal row hover states.

3. **Viewport Portal & Dynamic Pointer Anchoring**:
   - Menus render via React `createPortal` at the document root to bypass `overflow: hidden` or sticky header clipping.
   - Fixed viewport coordinate calculations (`getBoundingClientRect`) drive absolute positioning.
   - An indicator arrow (`showPointer={true}`) points dynamically at the exact horizontal center of the `⋯` trigger.

4. **Hierarchical Action Menu Item Order**:
   - **Primary Action** (e.g., `Xem chi tiết` / `Soạn / Sửa`) placed first.
   - **Secondary Operational Actions** (e.g., `Tải Excel`, `Tải PDF`, `Gán công trình`, `Đặt lại mật khẩu`) placed in middle sections with subtle dividers.
   - **Destructive Actions** (e.g., `Xóa đề xuất`, `Ngừng sử dụng`, `Xóa hồ sơ`) placed at the very bottom with `variant: "destructive"` red text and icons.

5. **RBAC & Security Guard Encapsulation**:
   - Permission guards (`canManage`, `canDelete`, `currentUserHasCompanyScope`) are evaluated dynamically before populating menu items.
   - Actions with restricted privileges are omitted cleanly without breaking layout dimensions.

---

## System-Wide Coverage Ledger

| Module / Route | File Location | Legacy Pattern | Standardized Pattern | Pointer Anchored | Active Row Highlight | Status |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **Material Proposals** (`/materials?tab=requests`) | `src/components/materials/material-request-list-client.tsx` | Split action buttons + custom popover | `UnifiedActionMenu` with `⋯` trigger | YES | YES | **PASS** |
| **User Management** (`/users`) | `src/components/users/user-management-client.tsx` | `[Xem] [Sửa] [⋯]` dual buttons + relative div | `UnifiedActionMenu` with `⋯` trigger | YES | YES | **PASS** |
| **Safety Management** (`/safety`) | `src/components/safety/safety-row-action-menu.tsx` | Custom floating dropdown | `UnifiedActionMenu` wrapper | YES | YES | **PASS** |
| **Project Assignments** (`/hr/project-assignments`) | `src/components/hr/project-assignments/project-assignment-table.tsx` | Absolute position div + inset backdrop | `UnifiedActionMenu` with `⋯` trigger | YES | YES | **PASS** |
| **Project List** (`/projects`) | `src/components/projects/project-list-client.tsx` | Inline `[Xem]` `[Sửa]` link buttons | `UnifiedActionMenu` with `⋯` trigger | YES | YES | **PASS** |
| **Reports Table** (`/reports`) | `src/components/reports/reports-table.tsx` | Multi-icon button array | `UnifiedActionMenu` with `⋯` trigger | YES | YES | **PASS** |
| **Weekly Inspection** (`/reports/weekly-inspection`) | `src/components/supervision-weekly/weekly-list-client.tsx` | `[Soạn/Sửa]` button + `[⋮]` custom popover | `UnifiedActionMenu` with `⋯` trigger & context header | YES | YES | **PASS** |

---

## Technical Audit Details by Module

### 1. User Management (`/users`)
- **File**: `src/components/users/user-management-client.tsx`
- **Changes**: Replaced legacy inline `[Xem]` and `[Sửa]` buttons and relative floating popover with a clean `UnifiedActionMenu` trigger (`⋯`).
- **Encapsulated Items**: `Xem chi tiết`, `Sửa thông tin`, `Gán công trình`, `Đặt lại mật khẩu`, `Khóa tài khoản / Mở khóa tài khoản`, `Ngừng sử dụng` (destructive), `Khôi phục tài khoản`.
- **Row Highlight**: `openActionMenuId === user.id` applies `bg-blue-50/70 border-l-2 border-l-blue-600 font-medium`.

### 2. Material Proposals (`/materials?tab=requests`)
- **File**: `src/components/materials/material-request-list-client.tsx`
- **Changes**: Standardized 3-dot trigger menu across proposal list items.
- **Encapsulated Items**: `Xem chi tiết`, `Chỉnh sửa đề xuất`, `Tải Excel`, `Tải PDF`, `In đề xuất`, `Xóa đề xuất` (destructive).
- **Row Highlight**: Active row state reflects open popover ID.

### 3. Project Assignments (`/hr/project-assignments`)
- **File**: `src/components/hr/project-assignments/project-assignment-table.tsx`
- **Changes**: Eliminated manual absolute dropdown overlay div and backdrop element; integrated `UnifiedActionMenu`.
- **Encapsulated Items**: `Xem chi tiết & Lịch sử`, `Thay đổi vai trò hoặc tỷ lệ`, `Gia hạn điều động`, `Rút nhân sự`, `Hủy điều động` (destructive).
- **Row Highlight**: `activeMenuId === item.id` applies `bg-blue-50/70 border-l-2 border-l-blue-600 font-medium`.

### 4. Projects List (`/projects`)
- **File**: `src/components/projects/project-list-client.tsx`
- **Changes**: Replaced inline `Link` buttons with `UnifiedActionMenu`. Reduced table action column width from `165px` to `100px` to save layout space.
- **Encapsulated Items**: `Xem chi tiết`, `Sửa công trình`.
- **Row Highlight**: `activeProjectId === project.id` applies `bg-blue-50/70 border-l-2 border-l-blue-600 font-medium`.

### 5. Field & Weekly Reports (`/reports` & `/reports/weekly-inspection`)
- **Files**: `src/components/reports/reports-table.tsx` & `src/components/supervision-weekly/weekly-list-client.tsx`
- **Changes**: Consolidated multi-button inline toolbars into standard `UnifiedActionMenu` instances with pointer indicators and context header summaries.
- **Encapsulated Items**: `Soạn / Sửa hồ sơ`, `Xem trước HTML`, `Xem PDF (In sạch)`, `Tải PDF`, `Tải DOCX`, `Xóa hồ sơ` (destructive).
- **Row Highlight**: Preserved active row highlighting across desktop and mobile card layouts.

---

## Conclusion & Verification
All ERP record-level action menus have achieved 100% compliance with the standardized `UnifiedActionMenu` architecture. TypeScript compilation (`npx tsc --noEmit`) passes with zero errors, and browser crawl tests confirm exact pointer alignment and robust scrolling behavior.
