# HR Phase 1 — Test Evidence Report

## Test Summary
- **Total HR Test Files**: 6 files in `src/lib/hr/__tests__/`
- **Total HR Tests**: 26 unit & concurrency tests
- **HR Pass Rate**: 100% (26 / 26 PASSED)
- **Full System Tests**: 57 test files / 380 tests PASSED
- **Next.js Production Build**: Compiled successfully in 5.3s (Exit code: 0)

## Verified Test Specifications
1. `pii-encryption.test.ts`:
   - AES-256-GCM encryption & decryption roundtrip.
   - Deterministic HMAC-SHA256 blind index generation.
   - PII masking (`••••8899`).
2. `employee-code-generator.test.ts`:
   - Vietnam year extraction (`Asia/Ho_Chi_Minh`).
   - Format `NV-YYYY-NNNN`.
   - 20 concurrent requests without duplicate codes.
3. `employee-service.test.ts`:
   - Employee creation with atomic code & encrypted CCCD.
   - Blind index duplicate check rejection.
   - Identity lookup via blind index.
   - Profile update with audit history (`EmployeeChangeHistory`).
   - Employment status transitions.
4. `organization-service.test.ts`:
   - Self-referencing parentId rejection.
   - Circular hierarchy detection (`A -> B -> A`).
   - Single active primary organization assignment rule.
5. `project-assignment-service.test.ts`:
   - Project role assignment & release workflow.
   - Active duplicate assignment rejection without override.
6. `permission-service.test.ts`:
   - 9 canonical HR permission seeding.
   - ADMIN fallback role permission.
   - Explicit DENY grant override over ALLOW.
   - Validity period window filtering.
