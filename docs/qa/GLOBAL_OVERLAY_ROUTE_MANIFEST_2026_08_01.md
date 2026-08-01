# BẢNG TẬP HỢP TẤT CẢ ROUTE THỰC TẾ (GLOBAL OVERLAY ROUTE MANIFEST 2026-08-01)

**Ngày khởi tạo:** 01/08/2026  
**Dự án:** `construction-erp-v2`  
**Tổng số route phát hiện:** 44

---

## MA TRẬN PHÂN LOẠI ROUTE VÀ THÀNH PHẦN NỔI

| Route | Module | Vai trò truy cập | Overlay tìm thấy | Số lượng | Static audit | Runtime desktop | Runtime mobile | Console | Kết quả |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `/approvals` | Approvals & Requests | `ADMIN, DIRECTOR, PROJECT_MANAGER, CHIEF_ENGINEER` | N/A | 0 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT APPLICABLE — NO OVERLAY` |
| `/audit` | General | `ALL_ROLES` | N/A | 0 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT APPLICABLE — NO OVERLAY` |
| `/dashboard/actions` | Dashboard & Analytics | `ALL_ROLES` | N/A | 0 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT APPLICABLE — NO OVERLAY` |
| `/dashboard/projects-status` | Dashboard & Analytics | `ALL_ROLES` | N/A | 0 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT APPLICABLE — NO OVERLAY` |
| `/dashboard` | Dashboard & Analytics | `ALL_ROLES` | Popover / Dropdown, Combobox / Select, Date Picker, Modal / Dialog, Drawer / Sheet | 73 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT TESTED` |
| `/documents/[projectId]` | Document Management | `ALL_ROLES` | N/A | 0 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT APPLICABLE — NO OVERLAY` |
| `/documents` | Document Management | `ALL_ROLES` | N/A | 0 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT APPLICABLE — NO OVERLAY` |
| `/materials` | Materials & Stock | `ALL_ROLES` | Popover / Dropdown, Drawer / Sheet, Modal / Dialog, Combobox / Select, Date Picker | 70 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT TESTED` |
| `/projects/new` | Project Management | `ALL_ROLES` | Modal / Dialog, Popover / Dropdown, Combobox / Select | 3 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT TESTED` |
| `/projects/[id]/edit` | Project Management | `ALL_ROLES` | Modal / Dialog, Popover / Dropdown, Combobox / Select | 3 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT TESTED` |
| `/projects/[id]/field-progress/daily` | Project Management | `ALL_ROLES` | Modal / Dialog, Popover / Dropdown, Combobox / Select | 3 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT TESTED` |
| `/projects/[id]/field-progress/summary` | Project Management | `ALL_ROLES` | Modal / Dialog, Popover / Dropdown, Combobox / Select | 3 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT TESTED` |
| `/projects/[id]/field-progress` | Project Management | `ALL_ROLES` | Date Picker, Popover / Dropdown, Combobox / Select, Modal / Dialog | 25 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT TESTED` |
| `/projects/[id]/material-requests` | Project Management | `ALL_ROLES` | Modal / Dialog, Popover / Dropdown, Combobox / Select | 3 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT TESTED` |
| `/projects/[id]` | Project Management | `ALL_ROLES` | Modal / Dialog, Popover / Dropdown, Combobox / Select | 3 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT TESTED` |
| `/projects` | Project Management | `ALL_ROLES` | Modal / Dialog, Popover / Dropdown, Combobox / Select | 3 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT TESTED` |
| `/reports/field/weekly-summary` | Reports & Safety | `ALL_ROLES` | Combobox / Select, Date Picker, Popover / Dropdown, Drawer / Sheet, Modal / Dialog | 77 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT TESTED` |
| `/reports/field` | Reports & Safety | `ALL_ROLES` | Combobox / Select, Date Picker, Popover / Dropdown, Drawer / Sheet, Modal / Dialog | 77 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT TESTED` |
| `/reports/safety/plans/new` | Reports & Safety | `ADMIN, DIRECTOR, SAFETY_OFFICER, SITE_ENGINEER` | Combobox / Select, Date Picker, Popover / Dropdown, Drawer / Sheet, Modal / Dialog, Action Menu | 124 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT TESTED` |
| `/reports/safety/plans/[planId]/preview` | Reports & Safety | `ADMIN, DIRECTOR, SAFETY_OFFICER, SITE_ENGINEER` | Combobox / Select, Date Picker, Popover / Dropdown, Drawer / Sheet, Modal / Dialog, Action Menu | 124 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT TESTED` |
| `/reports/safety/plans/[planId]` | Reports & Safety | `ADMIN, DIRECTOR, SAFETY_OFFICER, SITE_ENGINEER` | Combobox / Select, Date Picker, Popover / Dropdown, Drawer / Sheet, Modal / Dialog, Action Menu | 124 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT TESTED` |
| `/reports/safety/plans` | Reports & Safety | `ADMIN, DIRECTOR, SAFETY_OFFICER, SITE_ENGINEER` | Combobox / Select, Date Picker, Popover / Dropdown, Drawer / Sheet, Modal / Dialog, Action Menu | 124 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT TESTED` |
| `/reports/safety/self-assessments/new` | Reports & Safety | `ADMIN, DIRECTOR, SAFETY_OFFICER, SITE_ENGINEER` | Combobox / Select, Date Picker, Popover / Dropdown, Drawer / Sheet, Modal / Dialog, Action Menu | 124 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT TESTED` |
| `/reports/safety/self-assessments/[reportId]/preview` | Reports & Safety | `ADMIN, DIRECTOR, SAFETY_OFFICER, SITE_ENGINEER` | Combobox / Select, Date Picker, Popover / Dropdown, Drawer / Sheet, Modal / Dialog, Action Menu | 124 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT TESTED` |
| `/reports/safety/self-assessments/[reportId]` | Reports & Safety | `ADMIN, DIRECTOR, SAFETY_OFFICER, SITE_ENGINEER` | Combobox / Select, Date Picker, Popover / Dropdown, Drawer / Sheet, Modal / Dialog, Action Menu | 124 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT TESTED` |
| `/reports/safety/self-assessments` | Reports & Safety | `ADMIN, DIRECTOR, SAFETY_OFFICER, SITE_ENGINEER` | Combobox / Select, Date Picker, Popover / Dropdown, Drawer / Sheet, Modal / Dialog, Action Menu | 124 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT TESTED` |
| `/reports/safety/weekly-files/[weeklyFileId]` | Reports & Safety | `ADMIN, DIRECTOR, SAFETY_OFFICER, SITE_ENGINEER` | Combobox / Select, Date Picker, Popover / Dropdown, Drawer / Sheet, Modal / Dialog, Action Menu | 124 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT TESTED` |
| `/reports/safety` | Reports & Safety | `ADMIN, DIRECTOR, SAFETY_OFFICER, SITE_ENGINEER` | Combobox / Select, Date Picker, Popover / Dropdown, Drawer / Sheet, Modal / Dialog, Action Menu | 124 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT TESTED` |
| `/reports/weekly-inspection/[id]/edit` | Reports & Safety | `ADMIN, DIRECTOR, SUPERVISOR, SITE_ENGINEER` | Combobox / Select, Date Picker, Popover / Dropdown, Drawer / Sheet, Modal / Dialog, Action Menu | 109 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT TESTED` |
| `/reports/weekly-inspection/[id]/preview` | Reports & Safety | `ADMIN, DIRECTOR, SUPERVISOR, SITE_ENGINEER` | Combobox / Select, Date Picker, Popover / Dropdown, Drawer / Sheet, Modal / Dialog, Action Menu | 109 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT TESTED` |
| `/reports/weekly-inspection` | Reports & Safety | `ADMIN, DIRECTOR, SUPERVISOR, SITE_ENGINEER` | Combobox / Select, Date Picker, Popover / Dropdown, Drawer / Sheet, Modal / Dialog, Action Menu | 109 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT TESTED` |
| `/reports` | Reports & Safety | `ALL_ROLES` | Combobox / Select, Date Picker, Popover / Dropdown, Drawer / Sheet, Modal / Dialog | 77 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT TESTED` |
| `/settings` | System Settings | `ADMIN, DIRECTOR` | Combobox / Select | 5 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT TESTED` |
| `/supervision/weekly/[id]/edit` | General | `ALL_ROLES` | N/A | 0 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT APPLICABLE — NO OVERLAY` |
| `/supervision/weekly/[id]/preview` | General | `ALL_ROLES` | N/A | 0 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT APPLICABLE — NO OVERLAY` |
| `/supervision/weekly/[id]` | General | `ALL_ROLES` | N/A | 0 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT APPLICABLE — NO OVERLAY` |
| `/supervision/weekly` | General | `ALL_ROLES` | N/A | 0 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT APPLICABLE — NO OVERLAY` |
| `/tasks` | Tasks & Assignments | `ALL_ROLES` | N/A | 0 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT APPLICABLE — NO OVERLAY` |
| `/users` | User & Role Management | `ADMIN, DIRECTOR` | Popover / Dropdown, Combobox / Select, Modal / Dialog | 25 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT TESTED` |
| `/login` | Authentication | `ALL_ROLES` | N/A | 0 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT APPLICABLE — NO OVERLAY` |
| `/print/reports/field/weekly-summary` | General | `ALL_ROLES` | N/A | 0 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT APPLICABLE — NO OVERLAY` |
| `/print/reports/[reportId]` | General | `ALL_ROLES` | N/A | 0 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT APPLICABLE — NO OVERLAY` |
| `/supervision-export/[id]` | General | `ALL_ROLES` | N/A | 0 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT APPLICABLE — NO OVERLAY` |
| `/` | General | `ALL_ROLES` | Popover / Dropdown, Combobox / Select, Modal / Dialog, Date Picker | 139 | AUDITED | NOT TESTED | NOT TESTED | UNCHECKED | `NOT TESTED` |
