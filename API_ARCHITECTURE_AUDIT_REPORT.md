# BÁO CÁO KIỂM TOÁN TỔNG THỂ KIẾN TRÚC API (API ARCHITECTURE AUDIT REPORT)
## DỰ ÁN: `CONSTRUCTION-ERP-V2`

> **Trạng thái Kiểm toán:** 🔍 **READ-ONLY AUDIT COMPLETED**  
> **Thời gian kiểm toán:** 12/08/2026  
> **Phạm vi quẹt:** Toàn bộ repository (`src/app/api`, `src/app`, `src/lib`, `src/components`, `src/proxy.ts`, `prisma/schema.prisma`)  

---

## 1. TỔNG QUAN KIẾN TRÚC VẬN HÀNH DỮ LIỆU HIỆN TẠI

Hệ thống `construction-erp-v2` hiện tại đang vận hành theo mô hình **HYBRID (Mô hình D - Kết hợp nhiều phương thức truy cập dữ liệu)**.

```
                    ┌────────────────────────────────────────────────────────┐
                    │               TRÌNH DUYỆT (BROWSER UI)                 │
                    └──────┬────────────────────┬────────────────────┬───────┘
                           │                    │                    │
          (File Upload / Download / Export)     │            (Tải trang đầu / Navigation)
                           │             (Form Mutations)            │
                           ▼                    ▼                    ▼
                    ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
                    │ HTTP ROUTE   │     │ SERVER       │     │ SERVER       │
                    │ HANDLERS     │     │ ACTIONS      │     │ COMPONENTS   │
                    │ (`/api/**`)  │     │ (`actions.ts`)│     │ (`page.tsx`) │
                    └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
                           │                    │                    │
                           ▼                    ▼                    ▼
                    ┌────────────────────────────────────────────────────────┐
                    │             LỚP NHIỆM VỤ NỘI BỘ (SERVICES & RBAC)       │
                    │ (`permission-resolver`, `hr-auth-guard`, `storage`)    │
                    └───────────────────────────┬────────────────────────────┘
                                                │
                                                ▼
                                    ┌───────────────────────┐
                                    │    PRISMA ORM (PG)    │
                                    └───────────────────────┘
```

---

## 2. DANH SÁCH TOÀN BỘ API HTTP (`/api/**` & HTTP ROUTE HANDLERS)

Hệ thống hiện có **28 HTTP Route Endpoints** thật đang tồn tại trong source code:

| STT | API Endpoint | Method | Chức năng nghiệp vụ | Thành phần gọi (Caller) | Database / Storage | RBAC & Security | Validation | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| 1 | `/api/auth/login` | POST | Xác thực đăng nhập (Email/Username + Pass) | `app/login/page.tsx` | Prisma (`User`) | Pass Hash (bcrypt) + HMAC Cookie | Zod / Basic | **ACTIVE** |
| 2 | `/api/auth/logout` | POST | Xóa phiên đăng nhập (Clear Cookie) | `header.tsx`, `mobile-bottom-nav.tsx` | Session Engine | Authed Session | None | **ACTIVE** |
| 3 | `/api/cron/documents-trash-cleanup` | GET | Tự động xóa vĩnh viễn tài liệu/thư mục rác quá hạn | System Cron / External Worker | Prisma (`Document`, `DocumentFolder`) + Storage | Bearer Token (`CRON_SECRET`) | Query/Header | **ACTIVE** |
| 4 | `/api/documents/[documentId]/download` | GET | Tải xuống hoặc Stream Preview tài liệu công trình | `document-workspace.tsx`, `document-viewer.tsx` | Prisma (`Document`) + Storage Stream | `resolvePermission("documents.download" / "view")` + `canAccessProject` | Param Check | **ACTIVE** |
| 5 | `/api/documents/load-more` | GET | Phân trang / Tìm kiếm tài liệu & thư mục công trình | `document-workspace.tsx` | Prisma (`Document`, `DocumentFolder`) | `resolvePermission("documents.view")` + `canAccessProject` | Query Params | **ACTIVE** |
| 6 | `/api/documents/upload` | POST | Upload tài liệu công trình (Stream + Magic Byte) | `document-workspace.tsx`, `document-manager.tsx` | Prisma (`Document`) + Storage Stream | Magic Byte + Policy + `canAccessProject` + `canUploadToFolder` | Magic-byte + Zod/Policy | **ACTIVE** |
| 7 | `/api/hr/reports/export` | GET | Xuất Báo cáo Nhân sự ra file Excel (`.xlsx`) | `hr-report-export-button.tsx` | Prisma (`User`, `ProjectAssignment`) + ExcelJS | `checkHrPermission("hr:project_assignment:read")` | Query Params | **ACTIVE** |
| 8 | `/api/reports/[reportId]/attachments` | POST | Upload tệp đính kèm cho Báo cáo hiện trường | `reports-workspace.tsx` | Prisma (`SiteReportAttachment`) + Storage | `resolvePermission("reports.update")` + `canAccessProject` | FormData File | **ACTIVE** |
| 9 | `/api/reports/[reportId]/history` | GET | Lấy lịch sử chỉnh sửa / phê duyệt báo cáo | `report-detail-drawer.tsx` | Prisma (`AuditLog`) | `resolvePermission("reports.view")` + `canAccessProject` | Param Check | **ACTIVE** |
| 10 | `/api/reports/attachments/[attachmentId]` | GET | Stream hình ảnh / file đính kèm báo cáo hiện trường | `reports/field/page.tsx`, `print/reports/[reportId]` | Prisma (`SiteReportAttachment`) + Storage Stream | Session + `canAccessProject` | Param Check | **ACTIVE** |
| 11 | `/api/reports/safety/plans` | GET | Danh sách Kế hoạch An toàn lao động | `safety-assessment-form.tsx` | Prisma (`SafetyPlan`) | Session + Project Scope | Query Params | **ACTIVE** |
| 12 | `/api/reports/safety/plans` | POST | Tạo mới Kế hoạch An toàn lao động | `safety-plan-form.tsx` | Prisma (`SafetyPlan`) | Session + Project Scope | Body JSON | **ACTIVE** |
| 13 | `/api/reports/safety/plans/[planId]` | GET | Chi tiết Kế hoạch An toàn lao động | `safety-assessment-form.tsx` | Prisma (`SafetyPlan`) | Session + Project Scope | Param Check | **ACTIVE** |
| 14 | `/api/reports/safety/plans/[planId]` | DELETE | Xóa Kế hoạch An toàn lao động | Client fetch | Prisma (`SafetyPlan`) | Session + Project Scope | Param Check | **ACTIVE** |
| 15 | `/api/reports/safety/plans/[planId]/approve` | POST | Phê duyệt Kế hoạch An toàn lao động | `safety-plan-actions.tsx` | Prisma (`SafetyPlan`) | Session + Executive/Manager Scope | Body JSON | **ACTIVE** |
| 16 | `/api/reports/safety/plans/[planId]/export` | GET | Xuất Kế hoạch An toàn ra Word/PDF | `safety/plans/[planId]/preview/page.tsx` | Prisma (`SafetyPlan`) + docx/pdf | Session + Project Scope | Query Params | **ACTIVE** |
| 17 | `/api/reports/safety/plans/[planId]/submit` | POST | Trình duyệt Kế hoạch An toàn lao động | `safety-plan-form.tsx`, `safety-plan-actions.tsx` | Prisma (`SafetyPlan`) | Session + Project Scope | Body JSON | **ACTIVE** |
| 18 | `/api/reports/safety/self-assessments` | GET | Danh sách Phiếu tự đánh giá An toàn | Client fetch | Prisma (`SafetySelfAssessment`) | Session + Project Scope | Query Params | **ACTIVE** |
| 19 | `/api/reports/safety/self-assessments` | POST | Tạo Phiếu tự đánh giá An toàn | `safety-plan-actions.tsx`, `safety-assessment-form.tsx` | Prisma (`SafetySelfAssessment`) | Session + Project Scope | Body JSON | **ACTIVE** |
| 20 | `/api/reports/safety/self-assessments/[reportId]` | GET | Chi tiết Phiếu tự đánh giá An toàn | Client fetch | Prisma (`SafetySelfAssessment`) | Session + Project Scope | Param Check | **ACTIVE** |
| 21 | `/api/reports/safety/self-assessments/[reportId]` | DELETE | Xóa Phiếu tự đánh giá An toàn | Client fetch | Prisma (`SafetySelfAssessment`) | Session + Project Scope | Param Check | **ACTIVE** |
| 22 | `/api/reports/safety/self-assessments/[reportId]/approve` | POST | Phê duyệt Phiếu tự đánh giá An toàn | `safety-assessment-actions.tsx` | Prisma (`SafetySelfAssessment`) | Session + Executive Scope | Body JSON | **ACTIVE** |
| 23 | `/api/reports/safety/self-assessments/[reportId]/export` | GET | Xuất Phiếu tự đánh giá An toàn ra DOCX/PDF | `safety/self-assessments/[reportId]/preview` | Prisma (`SafetySelfAssessment`) + docx/pdf | Session + Project Scope | Query Params | **ACTIVE** |
| 24 | `/api/reports/safety/self-assessments/[reportId]/submit` | POST | Trình duyệt Phiếu tự đánh giá An toàn | `safety-assessment-form.tsx`, `safety-assessment-actions.tsx` | Prisma (`SafetySelfAssessment`) | Session + Project Scope | Body JSON | **ACTIVE** |
| 25 | `/api/reports/weekly-summary/export` | GET | Xuất Tổng hợp Báo cáo tuần ra Excel | `weekly-summary-print-toolbar.tsx`, `inline-modal` | Prisma (`SiteReport`) + ExcelJS | Session + Project Scope | Query Params | **ACTIVE** |
| 26 | `/api/reports/weekly-summary/export-pdf` | GET | Export PDF Tổng hợp Báo cáo tuần (Playwright) | `weekly-summary-print-toolbar.tsx` | Prisma (`SiteReport`) + Headless PDF | Session + Project Scope | Query Params | **ACTIVE** |
| 27 | `/api/supervision/weekly/[id]/export` | GET | Xuất Hồ sơ Giám sát tuần ra DOCX / PDF | `weekly-list-client.tsx`, `weekly-editor.tsx` | Prisma (`SupervisionWeeklyDossier`) + docx/pdf | Session + Project Scope | Query Params | **ACTIVE** |
| 28 | `/materials/proposals/[id]/export` | GET | Xuất Đề xuất vật tư ra Excel / PDF (Headless) | `materials/proposals/[id]/preview` | Prisma (`MaterialProposal`) + ExcelJS/PDF | Session Check | Query Params | **ACTIVE** |

---

## 3. DANH SÁCH SERVER ACTIONS (`"use server"`)

Tất cả các thao tác tương tác dữ liệu chính (CRUD) từ Giao diện Web Client đều được chuyển qua **19 tập tin Server Actions**:

1. **`src/app/(dashboard)/users/actions.ts`**: Tạo người dùng, khóa/mở khóa tài khoản, đổi vai trò, đổi mật khẩu.
2. **`src/app/(dashboard)/projects/actions.ts`**: Tạo công trình, cập nhật thông tin, thay đổi trạng thái, quản lý thành viên công trình.
3. **`src/app/(dashboard)/projects/[id]/field-progress/actions.ts`**: Tạo & quản lý cây công việc WBS/hạng mục thi công.
4. **`src/app/(dashboard)/projects/[id]/field-progress/daily/actions.ts`**: Ghi nhận nhật ký khối lượng thi công hàng ngày.
5. **`src/app/(dashboard)/materials/actions.ts`**: Quản lý danh mục vật tư, định mức, tồn kho công trình.
6. **`src/lib/material-proposals/actions.ts`**: Tạo đề xuất vật tư, cập nhật, tự động lưu (auto-save), duyệt/từ chối, xóa đề xuất.
7. **`src/app/(dashboard)/documents/actions.ts`**: Tạo thư mục, đổi tên, di chuyển, khôi phục, xóa tài liệu vào thùng rác.
8. **`src/app/(dashboard)/reports/actions.ts`**: Tạo báo cáo hiện trường, cập nhật dòng nhật ký, gửi duyệt, phê duyệt báo cáo.
9. **`src/app/(dashboard)/reports/safety/actions.ts`**: Lưu nháp & cập nhật kế hoạch an toàn / phiếu tự đánh giá.
10. **`src/app/(dashboard)/supervision/weekly/actions.ts`**: Tạo hồ sơ giám sát tuần, cập nhật khối lượng nghiệm thu, chuyển trạng thái quy trình.
11. **`src/app/(dashboard)/approvals/actions.ts`**: Phê duyệt / Từ chối / Yêu cầu chỉnh sửa các hồ sơ trình duyệt.
12. **`src/app/hr/employees/actions/employee-actions.ts`**: Thêm mới hồ sơ nhân sự, sửa thông tin cá nhân, liên kết tài khoản user, lưu trữ/cho nghỉ việc, xem mã định danh PII.
13. **`src/app/hr/organization/actions/organization-actions.ts`**: Quản lý cây phòng ban, chức danh, bổ nhiệm trưởng đơn vị, chuyển công tác.
14. **`src/app/hr/project-assignments/actions/project-assignment-actions.ts`**: Điều động nhân sự đến công trình, gia hạn, kết thúc điều động, điều chuyển vai trò.
15. **`src/app/(dashboard)/settings/actions.ts`**: Cập nhật cài đặt hệ thống (dung lượng upload, thời gian lưu trữ tài liệu).
16. **`src/app/actions/notifications.ts`**: Đánh dấu thông báo đã đọc.
17. **`src/app/actions/global-search.ts`**: Tìm kiếm nhanh toàn hệ thống (Công trình, Báo cáo, Tài liệu, Nhân sự).
18. **`src/app/actions/project-context.ts`**: Lưu ngữ cảnh công trình đang chọn của user.
19. **`src/lib/dashboard/dashboard-detail-actions.ts`**: Lấy dữ liệu chi tiết drill-down cho Executive Dashboard.

---

## 4. AUDIT TỪNG PHÂN HỆ NGHIỆP VỤ (MODULE AUDIT)

| Phân hệ | Phương thức chính | Mức độ API HTTP | Trạng thái bảo mật |
|---|---|---|---|
| **Đăng nhập & Auth** | HTTP Route Handler (`/api/auth/*`) | 100% REST HTTP | ✅ Chặt chẽ (HMAC Session Cookie + Password Hash) |
| **Quản lý Người dùng** | Server Actions (`users/actions.ts`) | 0% REST HTTP | ✅ Chặt chẽ (Kiểm tra vai trò ADMIN ở Server) |
| **Công trình (Projects)** | Server Component + Server Actions | 0% REST HTTP | ✅ Chặt chẽ (RBAC Project Scope enforcement) |
| **Dashboard** | Server Component + Direct Prisma | 0% REST HTTP | ✅ Chặt chẽ (`resolveExecutiveDashboardScope`) |
| **Nhân sự (HR)** | Server Actions + 1 API Export | 5% REST HTTP | ✅ Chặt chẽ (PII Encrypted + Audit Log + RBAC) |
| **Tài liệu (Documents)** | HTTP API (`/api/documents/*`) + Actions | 60% REST HTTP | ✅ Rất tốt (Magic-Byte Check + Storage Stream + Policy) |
| **Báo cáo hiện trường** | Server Actions + HTTP API Upload/Export | 25% REST HTTP | ✅ Chặt chẽ (`resolvePermission` + Project Scope) |
| **An toàn lao động** | HTTP API (`/api/reports/safety/*`) | 90% REST HTTP | ✅ Đã mở sẵn các REST Endpoint chuẩn |
| **Giám sát tuần** | Server Actions + HTTP Export API | 20% REST HTTP | ✅ Chặt chẽ (State machine authorization) |
| **Vật tư (Materials)** | Server Actions + HTTP Export API | 10% REST HTTP | ✅ Chặt chẽ (Project Stock Scope enforcement) |
| **Phê duyệt (Approvals)** | Server Actions (`approvals/actions.ts`) | 0% REST HTTP | ✅ Chặt chẽ (Approver Role Verification) |
| **Cài đặt hệ thống** | Server Actions (`settings/actions.ts`) | 0% REST HTTP | ✅ Chặt chẽ (Strict ADMIN Only) |
| **Notifications** | Server Actions (`notifications.ts`) | 0% REST HTTP | ✅ User specific scoping |

---

## 5. AUDIT BẢO MẬT API & THỦ CÔNG CHI TIẾT (SECURITY AUDIT)

> [!IMPORTANT]
> **Kết quả Kiểm toán Bảo mật Backend:**
> 1. **Server-Side Authentication:** 100% API endpoints và Server Actions đều bắt buộc đăng nhập via `getSession()` hoặc `checkHrPermission()`. Frontend không thể bypass bằng cách ẩn nút bấm UI.
> 2. **RBAC & Project Scope (Chống IDOR):** Mọi API truy cập dữ liệu công trình đều truyền `projectId` qua `resolvePermission()` hoặc `canAccessProject()`. User ở Công trình A **KHÔNG THỂ** lấy hay sửa dữ liệu của Công trình B.
> 3. **Chống Lộ Thông Tin Nhạy Cảm:** Password hash, token, PII số CCCD/CMND không bị expose bừa bãi. PII nhân sự được mã hóa AES-256-GCM (`pii-encryption.ts`) và chỉ mở khóa qua action audit `revealIdentityNumberAction`.
> 4. **Upload File Safe:** `POST /api/documents/upload` có kiểm tra **Magic-Byte** (chữ ký số hex thực tế của tệp), ngăn chặn tấn công đổi đuôi file giả mạo (ví dụ: đổi `.exe` thành `.pdf`).
> 5. **Mass Assignment:** Toàn bộ dữ liệu đầu vào trong Server Actions và Route Handlers đều thông qua kiểm tra kiểu dữ liệu Zod / TypeScript DTO.

---

## 6. ĐÁNH GIÁ KHẢ NĂNG KẾT NỐI MOBILE APP TRONG TƯƠNG LAI

Hiện tại, Frontend Web dùng chủ yếu Server Actions (`"use server"`). Mobile App (React Native / Flutter / iOS / Android) **không thể gọi trực tiếp Server Actions của Next.js qua HTTP REST thông thường** nếu không có REST API Handlers tương ứng.

### Phân loại Nghiệp vụ cho Mobile App:

#### 🟢 A. ĐÃ CÓ THỂ DÙNG NGAY QUA REST API:
1. **Đăng nhập / Đăng xuất**: `POST /api/auth/login`, `POST /api/auth/logout`.
2. **Xem & Tải Tài liệu**: `GET /api/documents/load-more`, `GET /api/documents/[id]/download`.
3. **Upload Tài liệu & Bản vẽ**: `POST /api/documents/upload`.
4. **An toàn Lao động**: Toàn bộ CRUD `/api/reports/safety/*` đã là REST API chuẩn.
5. **Xuất báo cáo PDF / Excel**: `/api/reports/weekly-summary/export-pdf`, `/api/supervision/weekly/[id]/export`.

#### 🟡 B. CẦN SỬA NHẸ ĐỂ DÙNG CHO MOBILE:
1. **API Upload Ảnh Báo cáo hiện trường**: `/api/reports/[reportId]/attachments` hiện đang nhận FormData trực tiếp từ Web, chỉ cần thêm response dạng JSON Mobile-friendly.

#### 🔴 C. CẦN TẠO THÊM HTTP REST API ENDPOINTS MỚI:
*(Hiện tại các nghiệp vụ này đang chạy qua Server Actions hoặc Server Components)*:
1. **Danh sách & Chi tiết Công trình** (Cho Chỉ huy trưởng & Cán bộ hiện trường).
2. **Nhập & Trình duyệt Báo cáo Hiện trường Hàng ngày**.
3. **Nhập & Duyệt Đề xuất Vật tư**.
4. **Trình duyệt & Phê duyệt Hồ sơ (Approvals API)**.
5. **Điểm danh & Danh sách Nhân sự Công trình**.

---

## 7. ĐÁNH GIÁ KHẢ NĂNG TÍCH HỢP AI AGENT

> [!TIP]
> **Sẵn sàng tích hợp AI Agent qua Lớp Service Nội bộ (Internal Service Layer)!**

Hệ thống `construction-erp-v2` có một ưu điểm kiến trúc rất lớn: **Tất cả các truy vấn dữ liệu phức tạp đều đã được đóng gói thành các Service Pure-Functions** nằm trong thư mục `src/lib/`:

- `src/lib/dashboard/executive-action-service.ts` -> Tra cứu rủi ro & cảnh báo công trình.
- `src/lib/hr/reporting-service.ts` -> Tra cứu & thống kê nhân sự.
- `src/lib/material-proposals/actions.ts` -> Tra cứu & tạo đề xuất vật tư.
- `src/lib/documents/metadata-types.ts` -> Tra cứu tài liệu.
- `src/lib/reports/report-update-service.ts` -> Tra cứu & tổng hợp báo cáo.

**Khuyên dùng cho AI Agent:**  
AI Agent **KHÔNG NÊN** truy cập Prisma DB trực tiếp. Thay vào đó, AI Agent chỉ cần bọc (wrap) các hàm service thuần túy trong `src/lib/` thành **AI Agent Tools (Function Calling)**.

---

## 8. TRẢ LỜI 10 CÂU HỎI KIỂM TOÁN (AUDIT QUESTIONS)

1. **App hiện tại CÓ API hay KHÔNG?**  
   👉 **CÓ.** Hệ thống có 28 HTTP API Route Handlers thật và 19 tập tin Server Actions.
2. **Có bao nhiêu API endpoint?**  
   👉 **28 HTTP Route Endpoints** (`/api/**` & Export Routes) + **100+ Server Action Functions**.
3. **API nằm ở đâu?**  
   👉 Nằm tại `src/app/api/**`, `src/app/(dashboard)/materials/proposals/[id]/export/route.ts` và các tập tin `actions.ts`.
4. **Những module nào đang dùng API HTTP?**  
   👉 Module Authentication, Tài liệu (Documents), Báo cáo An toàn Lao động (Safety), Xuất File (Excel/PDF Export), Upload Tệp đính kèm Báo cáo.
5. **Những module nào đang dùng Server Action?**  
   👉 Người dùng (Users), Công trình (Projects), Nhật ký & Khối lượng thi công, Vật tư (Materials), Phê duyệt (Approvals), Nhân sự (HR), Giám sát (Supervision), Cài đặt (Settings).
6. **Những module nào truy cập Prisma trực tiếp?**  
   👉 Các trang Server Components (`page.tsx`) nạp dữ liệu hiển thị giao diện ban đầu (Dashboard, Danh sách công trình, Chi tiết báo cáo).
7. **Có API chết/mock/duplicate không?**  
   👉 **KHÔNG.** Toàn bộ 28 HTTP API và các Server Actions đều là code THẬT kết nối PostgreSQL qua Prisma, không có dữ liệu giả (mock) hay endpoint bỏ trống.
8. **API hiện tại có đủ an toàn về RBAC không?**  
   👉 **CÓ.** 100% kiểm tra quyền và phạm vi dự án (Project Scope) đều nằm ở Server Side, chống được IDOR và bypass UI.
9. **Mobile App sau này có dùng được backend hiện tại không?**  
   👉 **CÓ THỂ DÙNG MỘT PHẦN.** Các tính năng Upload/Download/Auth/An toàn đã sẵn sàng. Các tính năng Báo cáo/Vật tư/Phê duyệt cần tạo thêm REST API wrappers từ lớp Service có sẵn.
10. **Kiến trúc hiện tại đã phù hợp để tích hợp AI Agent chưa?**  
    👉 **RẤT PHÙ HỢP.** Đã có sẵn lớp Service nội bộ trong `src/lib/` cực kỳ sạch sẽ, chỉ cần bọc thành Tool cho AI Agent (Function Calling) mà không cần truy vấn trực tiếp vào DB.

---

## KẾT LUẬN CUỐI CÙNG (FINAL VERDICT)

### **API ARCHITECTURE STATUS:**
## 🟡 `NEEDS IMPROVEMENT` *(Dành riêng cho mục tiêu mở rộng Mobile App)*

> **Tóm tắt hiện trạng:**  
> Hệ thống `construction-erp-v2` vận hành cực kỳ vững chắc, an toàn bảo mật và tối ưu hiệu năng theo mô hình **Next.js App Router chuẩn mực (Server Components + Server Actions + Specialized HTTP APIs)** cho ứng dụng Web.  
>  
> Tuy nhiên, để phục vụ mục tiêu chiến lược phát triển **Mobile App toàn diện** trong tương lai, hệ thống cần được bổ sung thêm một lớp **REST API Route Handlers** (dùng chung lớp `src/lib/services` hiện có) cho các module Báo cáo hiện trường, Đề xuất vật tư, và Phê duyệt hồ sơ.
