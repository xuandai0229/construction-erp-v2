# HR Master Architecture — Kiến Trúc Tổng Thể Phân Hệ Quản Lý Nhân Sự

**Phiên bản:** 1.1.0  
**Tác giả:** Kiến Trúc Sư Phần Mềm ERP  
**Trạng thái Kiểm toán:** PARTIALLY VERIFIED  

---

## I. TỔNG QUAN KIẾN TRÚC VÀ NGUYÊN TẮC THIẾT KẾ

Phân hệ HR Construct-ERP được thiết kế theo mô hình **Domain-Driven Design (DDD)** kết hợp **Layered Architecture** bảo mật 3 lớp. Kiến trúc đảm bảo tính tách biệt giữa tài khoản xác thực hệ thống (`User`) và thông tin con người ngoài đời thực (`Employee`).

### Các Nguyên Tắc Kiến Trúc Cốt Lõi:
1. **Độc Lập User – Employee:** User quản lý quyền đăng nhập; Employee quản lý lịch sử lao động. Vô hiệu hóa User không làm mất Employee.
2. **Ủy Quyền 3 Lớp (3-Tier Authorization):**
   - **Layer 1:** System Role (`ADMIN`, `DIRECTOR`, `ENGINEER`, `STAFF`...)
   - **Layer 2:** Permission Code (`hr:employee:read`, `hr:organization:manage`...)
   - **Layer 3:** Data Scope (`ALL_EMPLOYEES`, `OWN_ORGANIZATION_UNIT`, `OWN_PROJECTS`, `SELF_ONLY`, `NONE`)
3. **Bảo Vệ Target Scope Ở Server Side:** Tất cả Server Actions của HR bắt buộc phải kiểm tra Target Scope trước khi mutation.
4. **Bảo Mật PII (Encryption & Masking):** CCCD/CMND mã hóa bằng AES-256-GCM + HMAC Blind Index. Không truyền Ciphertext hay Key xuống Client Component.
5. **Không Hard Delete Lịch Sử:** Mọi dữ liệu biến động đều dùng Soft Delete hoặc Effective-Date `[startDate, endDate)`.

---

## II. SƠ ĐỒ PHÂN HỆ VÀ WORKSPACE

```mermaid
graph TD
    A[Quản Lý Nhân Sự Workspace] --> B[Tổng Quan & Dashboard]
    A --> C[Hồ Sơ Nhân Viên - Verified]
    A --> D[Cơ Cấu Tổ Chức & Phòng Ban - Verified]
    A --> E[Điều Động Nhân Sự Công Trình - Partial]
    A --> F[Hợp Đồng Lao Động - Proposed]
    A --> G[Chứng Chỉ & Bằng Cấp - Proposed]
    A --> H[Chấm Công & Nghỉ Phép - Proposed]
    A --> I[Lương & Phụ Cấp - Deferred]
    A --> J[Tuyển Dụng & Đào Tạo - Proposed]
    A --> K[Đánh Giá & Khen Thưởng - Proposed]
    A --> L[Nghỉ Việc - Verified]
    A --> M[Phân Quyền HR - Verified]
```

---

## III. SƠ ĐỒ LUỒNG DỮ LIỆU BẢO MẬT & AUTHORIZATION

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client Component (Browser)
    participant SA as Server Action / Route
    participant Guard as HR Auth Guard & Target Scope
    participant SVC as HR Domain Service
    participant DB as Postgres DB (Prisma)
    participant Audit as Audit Sanitizer

    Client->>SA: Invoke Action (e.g. updateOrgUnitAction)
    SA->>Guard: Verify Session & Permission (hr:organization:manage)
    Guard->>Guard: Resolve User Data Scope & Target Scope Check
    alt Scope Invalid / Denied
        Guard-->>SA: Throw AccessDeniedError / Return error
        SA-->>Client: Return { success: false, error: "Access Denied" }
    else Scope Valid
        Guard->>SVC: Execute Domain Business Invariants
        SVC->>DB: Prisma Transaction [startDate, endDate)
        DB-->>SVC: Transaction Result
        SVC->>Audit: Record Audit Log (Masked PII)
        SVC-->>SA: Domain Result DTO
        SA-->>Client: Return Sanitized Response
    end
```

---

## IV. SƠ ĐỒ QUAN HỆ CỐT LÕI (USER – EMPLOYEE – ORG – PROJECT)

```mermaid
erDiagram
    User ||--o| Employee : "linked 1-1 (optional)"
    Employee ||--o{ EmployeeOrganizationAssignment : "has history"
    OrganizationUnit ||--o{ EmployeeOrganizationAssignment : "assigned to"
    Position ||--o{ EmployeeOrganizationAssignment : "holds position"
    OrganizationUnit ||--o{ OrganizationUnitManagerAssignment : "managed by"
    Employee ||--o{ OrganizationUnitManagerAssignment : "manages"
    Employee ||--o{ EmployeeProjectAssignment : "dispatched to"
    ProjectPersonnelRole ||--o{ EmployeeProjectAssignment : "has site role"
    User ||--o{ UserAccessGrant : "granted permissions"
```

---

## V. CẤU TRÚC THƯ MỤC NGUỒN VÀ TÍCH HỢP HỆ THỐNG

- `src/app/hr/`: Chứa các route Next.js của HR workspace.
- `src/components/hr/`: Component UI chuẩn hóa light-theme.
- `src/lib/hr/`: Domain logic, services, auth guards, PII encryption, effective date helpers.
- `scripts/qa/`: Test scripts Playwright & E2E mutation validation trên isolated QA DB.
- `docs/hr/`: Bộ tài liệu master kiến trúc và báo cáo kiểm toán.
