# System-Wide Print Pipeline Inventory & Migration Strategy

> **System**: construction-erp-v2  
> **Target Standard**: Clean PDF Stream (No Browser Metadata - URLs, timestamps, titles, page numbers)  
> **Date**: 2026-08-03

---

## 1. System Inventory Matrix

| Module | Route / Context | Component | Current Print Method | Browser Metadata Injected? | Status | Migration Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Báo cáo Giám sát** | `/reports/weekly-inspection` | `WeeklyListClient` | API PDF Stream (`disposition=inline` / `attachment`) | **NO** | **MIGRATED** | Clean PDF stream loaded in browser tab or downloaded. |
| **Báo cáo Giám sát** | `/reports/weekly-inspection/[id]/preview` | `WeeklyPrintTemplate` | Clean PDF Service (`view_pdf` / `download_pdf` / `print`) | **NO** | **MIGRATED** | Uses API PDF generator stream for printing. |
| **Báo cáo Giám sát** | `WeeklyEditor` modal | `PreviewDialog` | Hidden `iframe` to `/supervision-export/[id]` with HTML `window.print()` | **YES** | **NEEDS MIGRATION** | Replace iframe HTML print with API Clean PDF stream. |
| **Báo cáo Giám sát** | Header button | `WeeklyPrintButton` | Direct HTML `window.print()` | **YES** | **NEEDS MIGRATION** | Route to Clean PDF Stream API. |
| **ATLĐ - Kế hoạch** | `/reports/safety/plans/[planId]` | `SafetyPrintButton` | Fetches `/api/reports/safety/plans/[planId]/export?format=pdf&disposition=inline` to hidden `iframe` | **NO** | **PASS** | Clean PDF binary stream loaded in print iframe. |
| **ATLĐ - Đánh giá** | `/reports/safety/self-assessments/[reportId]` | `SafetyPrintButton` | Fetches `/api/reports/safety/self-assessments/[reportId]/export?format=pdf&disposition=inline` to hidden `iframe` | **NO** | **PASS** | Clean PDF binary stream loaded in print iframe. |
| **Báo cáo Ngày (Chỉ huy trưởng)** | `/reports/field` preview dialog | `ReportPrintPreviewDialog` | Direct HTML `window.print()` on app modal | **YES** | **NEEDS MIGRATION** | Migrate print action to clean PDF route/service. |
| **Báo cáo Tuần hiện trường** | `/reports/field/weekly-summary` | `WeeklySummaryPrintToolbar` | Direct HTML `window.print()` on `/reports/field/weekly-summary` page | **YES** | **NEEDS MIGRATION** | Connect to `/api/reports/weekly-summary/export-pdf`. |
| **Báo cáo Hiện trường** | Direct print toolbar | `PrintReportToolbar` | Direct HTML `window.print()` | **YES** | **NEEDS MIGRATION** | Connect to clean PDF route/service. |

---

## 2. Standardized Architecture

### Clean PDF Print Pipeline
```
[User Action: In / Preview / Tải PDF]
       │
       ▼
[Client Component (WeeklyPrintTemplate / SafetyPrintButton)]
       │
       ▼
[Next.js API Route: /api/.../export?format=pdf&disposition=inline]
       │
       ▼
[Playwright Headless Chrome (format: A4, displayHeaderFooter: false)]
       │
       ▼
[Clean Binary PDF Stream] ──> [Browser PDF Viewer / Print Preview]
```

### Mandatory Rules
1. **Never call `window.print()` directly on application routes** (`/edit`, `/preview`, `/dashboard`, etc.).
2. **Never rely on CSS `@page { margin: 0; }`** to suppress Chrome default headers/footers.
3. **Always serve clean binary PDF streams** with `Content-Type: application/pdf` and `displayHeaderFooter: false`.
