# HR Phase 0.2.3 — Release Scope & Boundary Matrix

**Trạng thái Document:** RELEASE CANDIDATE — PENDING FINAL GATE

## 1. Phạm Vi Release Baseline (Phase 0 – Phase 3.3)

HR Management Module baseline bao gồm:
- Core Employee Lifecycle & Profile Management (`/hr/employees`)
- Organization Tree & Department Hierarchy (`/hr/organization`)
- Contract & Document Records (`/hr/contracts`)
- PII Protection Layer (`SensitiveFieldPolicy` & Projection)
- Data Scope & RBAC Guards (`hr:organization:manage`, `OWN_ORGANIZATION_UNIT`)
- Test Harness QA Route Guard (`src/app/hr/test-idor` guarded via `ENABLE_QA_ROUTES`)

## 2. Ranh Giới Nghiệp Vụ (Phase 4 Boundary)
- **TỔNG THỂ PHASE 4 (ĐIỀU ĐỘNG CÔNG TRÌNH):** Tuyệt đối KHÔNG triển khai bất kỳ route, action, hoặc schema change nào của Phase 4 trong baseline 0.2.3 này.
