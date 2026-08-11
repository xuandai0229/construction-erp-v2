# FULL SYSTEM LAYOUT WIDTH INVENTORY
**System**: `construction-erp-v2`  
**Phase**: System-Wide Layout Width Standardization  
**Timestamp**: 2026-08-11T07:06:00Z  

---

## 1. Executive Summary
This document registers the initial audit and inventory of all layout container width primitives, artificial `max-width` constraints, and horizontal padding configurations across the system's 29 operational modules. 

The audit identified arbitrary page container limitations (such as `max-w-7xl` squeezing `/reports/safety`, `max-w-[1400px]` in `/materials`, `/settings`, `/approvals`, and `max-w-[1600px]` in `/projects` and `/dashboard`) that prevented modern wide-screen displays (1920px, 2048px+) from utilizing available desktop screen real estate efficiently.

---

## 2. System-Wide Layout Width Inventory Table

| Module / Route | Source File | Initial Container Primitive | Identified Width Constraint | Remediated Status |
| :--- | :--- | :--- | :--- | :--- |
| **Global App Shell** | `src/app/globals.css` | `.app-page-container`, `.app-page` | `max-width: 1600px` | Standardized to `max-width: 1760px` |
| **Global Shell Padding** | `src/components/layout/app-shell.tsx` | `div[data-app-content]` | `p-3 sm:p-5 lg:p-6` | Upgraded to `p-3 sm:p-5 lg:p-6 xl:p-7` |
| **Safety List (`/reports/safety`)** | `src/components/safety/safety-list-client.tsx` | Main Wrapper `div` | `max-w-7xl mx-auto` | **Removed** (`w-full max-w-full`) |
| **Safety Weekly File** | `src/components/safety/safety-weekly-file-workspace.tsx` | Workspace Shell `div` | `max-w-7xl mx-auto` | **Removed** (`w-full max-w-full`) |
| **Weekly Inspection List (`/reports/weekly-inspection`)** | `src/components/supervision-weekly/weekly-list-client.tsx` | Main Container `div` | `min-w-0 max-w-full` | **Standard Baseline** |
| **Weekly Company Summary** | `src/components/reports/weekly-summary-client-view.tsx` | Header & Grid Shell | `max-w-7xl mx-auto` | **Removed** (`w-full max-w-full`) |
| **Field Weekly Summary** | `src/app/(dashboard)/reports/field/weekly-summary/page.tsx` | Page Container | `max-w-7xl mx-auto` | **Removed** (`w-full max-w-full`) |
| **Materials Workspace (`/materials`)** | `src/components/materials/materials-workspace.tsx` | Root Page Shell | `max-w-[1400px] mx-auto` | **Removed** (`w-full max-w-full`) |
| **Material Proposal Form** | `src/components/materials/material-proposal-form.tsx` | Form `main` Shell | `max-w-[1600px] mx-auto` | **Removed** (`w-full max-w-full`) |
| **Material Proposal Detail** | `src/app/(dashboard)/materials/proposals/[id]/page.tsx` | Detail `main` Shell | `max-w-[1500px] mx-auto` | **Removed** (`w-full max-w-full`) |
| **System Settings (`/settings`)** | `src/components/settings/settings-workspace.tsx` | Root Page Shell | `max-w-[1400px] mx-auto` | **Removed** (`w-full max-w-full`) |
| **Approval Center (`/approvals`)** | `src/app/(dashboard)/approvals/components/approval-center-client.tsx` | Root Page Shell | `max-w-[1400px] mx-auto` | **Removed** (`w-full max-w-full`) |
| **Executive Dashboard (`/dashboard`)** | `src/components/dashboard/executive/executive-dashboard.tsx` | Shell Container | `max-w-[1600px] mx-auto` | **Removed** (`w-full max-w-full`) |
| **Operational Dashboard** | `src/components/dashboard/operational-dashboard.tsx` | Shell Container | `max-w-[1600px] mx-auto` | **Removed** (`w-full max-w-full`) |
| **Dashboard Projects Status** | `src/app/(dashboard)/dashboard/projects-status/page.tsx` | Page Container | `max-w-7xl mx-auto` | **Removed** (`w-full max-w-full`) |
| **Dashboard Actions** | `src/app/(dashboard)/dashboard/actions/page.tsx` | Page Container | `max-w-7xl mx-auto` | **Removed** (`w-full max-w-full`) |
| **Projects Overview (`/projects`)** | `src/app/(dashboard)/projects/[id]/page.tsx` | Root Page Shell | `max-w-[1600px] mx-auto` | **Removed** (`w-full max-w-full`) |
| **Project Field Progress** | `src/app/(dashboard)/projects/[id]/field-progress/page.tsx` | Page Container | `max-w-[1600px] mx-auto` | **Removed** (`w-full max-w-full`) |
| **Project Daily Progress** | `src/app/(dashboard)/projects/[id]/field-progress/daily/page.tsx` | Page Container | `max-w-[1600px] mx-auto` | **Removed** (`w-full max-w-full`) |
| **Project Progress Summary** | `src/app/(dashboard)/projects/[id]/field-progress/summary/page.tsx` | Page Container | `max-w-[1600px] mx-auto` | **Removed** (`w-full max-w-full`) |
| **Global Page Skeleton** | `src/components/ui/skeleton/page-skeleton.tsx` | Skeleton Shell | `max-w-[1400px]` | **Removed** (`w-full max-w-full`) |
| **User Management (`/users`)** | `src/components/users/user-management-client.tsx` | Outer Container | `space-y-4` | **Standard Baseline** |
| **Document Explorer (`/documents`)** | `src/app/(dashboard)/documents/page.tsx` | Root Shell | `app-page space-y-6` | **Standard Baseline** |
| **HR Employee Edit** | `src/components/hr/employee-edit-form.tsx` | Form Shell | `max-w-4xl` | **Removed** (`w-full max-w-full`) |
| **A4 Document Preview** | `src/components/safety/safety-document-preview-shell.tsx` | Document Canvas | `max-w-[297mm]` | **Preserved (Document Spec)** |

---

## 3. Preserved Context Exceptions
As specified by business domain requirements (Section XVIII):
1. **Dialogs & Drawers**: Modals, slide-over panels, and action drawers retain their specific viewport constraints (`max-w-md`, `max-w-xl`, `max-w-4xl`) for readable text density and UX focus.
2. **A4 & Printable Previews**: Official document canvases (`max-w-[210mm]`, `max-w-[297mm]`) maintain exact print ratio specifications while centering within the standardized workspace shell.
