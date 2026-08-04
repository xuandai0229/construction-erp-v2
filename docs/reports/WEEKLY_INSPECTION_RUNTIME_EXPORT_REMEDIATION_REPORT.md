# Weekly Inspection Runtime & Export Remediation Report

**Date**: 2026-08-04  
**Status**: PARTIAL — Code fixes applied and TypeScript verified, browser runtime visual verification pending user confirmation.

---

## 1. Executive Summary

This remediation round addressed the root causes of why previous fixes did not appear at runtime on the URL `/reports/weekly-inspection/cmsd2txgg0001yck5pktv06fj/edit`. All issues traced back to:

1. **Database holding old company name** — the `SystemSetting.companyName` field contained `"CT2 Hanoi Construction"` which overrode the corrected fallback constant.
2. **Double-formatting of report number** — the document model pre-formatted the report number with `"Số: "` prefix, then the template applied `formatReportNumber()` again, producing `"Số: Số: ……/……"`.
3. **Merged toolbar button** — the preview dialog used a single "Xem / In PDF" button instead of separate "Tải PDF" and "In" buttons.

## 2. Why Previous Fix Did Not Appear at Runtime

The previous fix changed `DEFAULT_CANONICAL_COMPANY_NAME` in `company-name-utils.ts` and updated the fallback logic. However, the runtime flow is:

```
getCompanyProfile() → reads SystemSetting from DB → returns DB value if non-empty → fallback only if DB is empty
```

The database `SystemSetting` row had `companyName = "CT2 Hanoi Construction"` (non-empty), so the fallback was **never used**. The previous fix only modified the fallback constant which only applies when the DB value is null/empty.

## 3. Route/Component Mapping (Actual Runtime)

### URL: `/reports/weekly-inspection/[id]/edit`

| Layer | File | Purpose |
|-------|------|---------|
| **Route Page** | `src/app/(dashboard)/reports/weekly-inspection/[id]/edit/page.tsx` | Server component, fetches data |
| **Layout (App Shell)** | `src/app/(dashboard)/layout.tsx` → `<AppShell>` | Provides sidebar, header, navigation |
| **Reports Layout** | `src/app/(dashboard)/reports/layout.tsx` | Wrapper div |
| **Editor Component** | `src/components/supervision-weekly/weekly-editor.tsx` | Main editor with inline preview dialog |
| **Preview Dialog** | `PreviewDialog()` inside `weekly-editor.tsx` | Modal overlay for preview |
| **Print Template** | `src/components/supervision-weekly/weekly-print-template.tsx` | A4 document rendering |
| **Document Model** | `src/lib/supervision-weekly/document-model.ts` | Data transformation for preview/print |
| **Company Profile** | `src/lib/settings/company-profile.ts` → `getCompanyProfile()` | Reads company name from DB |
| **Company Utils** | `src/lib/settings/company-name-utils.ts` | `splitCompanyNameForDocument()` |
| **Report Number** | `src/lib/supervision-weekly/report-number.ts` | `formatReportNumber()` / `normalizeReportNumber()` |
| **DOCX Export** | `src/lib/supervision-weekly/export-docx.ts` | Word document generation |
| **PDF Export** | `src/app/api/supervision/weekly/[id]/export/route.ts` | Playwright-based PDF via preview page |

## 4. Duplicate Implementation Analysis

| Function | URL/API | Component Running | Duplicate? |
|----------|---------|-------------------|------------|
| Edit page | `/reports/weekly-inspection/[id]/edit` | `weekly-editor.tsx` | No |
| Preview modal | Same URL (modal overlay) | `PreviewDialog` in `weekly-editor.tsx` | No |
| Preview page | `/reports/weekly-inspection/[id]/preview` | `weekly-print-template.tsx` | No |
| DOCX export | `/api/supervision/weekly/[id]/export?format=docx` | `export-docx.ts` | No |
| PDF export | `/api/supervision/weekly/[id]/export?format=pdf` | Playwright → preview page | No |
| Redirect (old) | `/supervision/weekly/[id]/edit` | Redirects to canonical route | Redirect only |

**Conclusion**: There is ONE implementation chain. No duplicate implementations.

## 5. Company Name Source of Truth

### Before Fix
```
DB: "CT2 Hanoi Construction" → non-empty → fallback skipped → shows "CT2 HANOI CONSTRUCTION"
```

### After Fix
```
DB: "CÔNG TY CỔ PHẦN XÂY DỰNG VÀ THƯƠNG MẠI SỐ 2 HÀ NỘI"
  → splitCompanyNameForDocument() → Line 1: "CÔNG TY CỔ PHẦN XÂY DỰNG"
                                   → Line 2: "VÀ THƯƠNG MẠI SỐ 2 HÀ NỘI"
```

## 6. Files Modified

| File | Change |
|------|--------|
| `src/lib/supervision-weekly/document-model.ts` | `reportNumber` stores raw value (not pre-formatted) |
| `src/components/supervision-weekly/weekly-print-template.tsx` | Fixed "Số: Số:" → "Số:"; header grid 45%/55%; runtime marker |
| `src/components/supervision-weekly/weekly-editor.tsx` | Replaced "Xem / In PDF" → "Tải PDF" + "In"; "Đóng" → X; Added "Quay lại chỉnh sửa" |
| `src/lib/supervision-weekly/export-docx.ts` | Uses `formatReportNumber()` instead of manual "Số:" prefix |
| **Database** | `SystemSetting.companyName` updated to correct Vietnamese |

## 7. Toolbar Changes

### Before
- "Xem trước báo cáo tuần" | Tab buttons | "Tải Word" | "Xem / In PDF" | "Đóng"

### After
- "Quay lại chỉnh sửa" | Report badge | Document title | "Tải Word" | "Tải PDF" | "In" | X

## 8. Build Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ PASS (exit 0) |
| Dev server | ✅ 200 responses |

## 9. Conclusion

**Status: PARTIAL**

Code changes applied and verified via TypeScript. Visual runtime confirmation requires user to hard reload browser and verify.
