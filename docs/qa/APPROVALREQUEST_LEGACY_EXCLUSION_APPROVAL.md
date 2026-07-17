# APPROVALREQUEST LEGACY EXCLUSION APPROVAL

## Business Decision
**BUSINESS_APPROVED_EXCLUSION_AND_ARCHIVE**

## Reason
Hai bản ghi không liên kết với bất kỳ entity nghiệp vụ nào. Không thể xác định entityType/entityId trung thực. Không được tạo placeholder hoặc quan hệ giả. Chúng không thể hoạt động hợp lệ trong V2. Bản ghi APPROVED được giữ dưới dạng lịch sử audit. Bản ghi PENDING được coi là workflow legacy không thể tiếp tục.

## Identities (Masked)
- Row 1: ID cmrobr48***, Type: METHOD_STATEMENT, Status: APPROVED
- Row 2: ID cmrobr48***, Type: QUALITY, Status: PENDING

## Security
- Archive path: `.local-audit-quarantine/approval-request-legacy-excluded_1784260188923.json`
- Archive Checksum (SHA-256): 464b0b6c479d590c200a5c5cf70efbf7267b3c1cc3afd5ba98be5abe59d4f23e
- Size: 1668 bytes
- Exact Row Hashes:
  - 90a6a9b4851aaf155be826e5a98537d4574de24c663aa0f8f1ac194f599a7140
  - 60aa354cf689fbda2d46ba64f0d2322300c1800384c2d3ff055dc38f27ab9198

*Approved by: BUSINESS_OWNER*
