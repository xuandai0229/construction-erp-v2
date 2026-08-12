# MOBILE PHASE 2 — FINAL SECURITY & REMEDIATION MATRIX

| Security Dimension | Test Input / Scenario | Expected Outcome | Actual Runtime Outcome | DB Side Effect | Result |
|---|---|---|---|---|---|
| **Anonymous Request** | `GET /projects/{id}/wbs` without Bearer token | `401 Unauthorized` | `401 Unauthorized` | 0 records | **PASS** |
| **Wrong Role Access** | Non-member user posting to `/progress/daily` | `403 Forbidden` | `403 Forbidden` | 0 records | **PASS** |
| **Cross-Project User** | User A calling `POST /projects/{Project_B}/progress/daily` | `403 Forbidden` | `403 Forbidden` | 0 records | **PASS** |
| **Cross-Project WBS Spoof** | Posting `itemId` from Project B to Project A endpoint | `400 Bad Request` | `400 Bad Request` | 0 records | **PASS** |
| **Non-Existent WBS ID** | Posting random string `non-existent-wbs-id-99999` | `400 Bad Request` | `400 Bad Request` (`INVALID_WBS_ITEM`) | 0 records | **PASS** |
| **Parent WBS Entry** | Posting WBS ID of a parent category node | `400 Bad Request` | `400 Bad Request` | 0 records | **PASS** |
| **Actor Spoofing** | Payload includes `{ createdById: "spoofed_user" }` | Session actor used | Session actor used (`qa_freeze_admin`) | `createdById = session.user.id` | **PASS** |
| **Negative Quantity** | Entering `quantity: -10` | `400 Bad Request` | `400 Bad Request` | 0 records | **PASS** |
| **Malformed Date** | `entryDate: "invalid-date-format"` | `400 Bad Request` | `400 Bad Request` | 0 records | **PASS** |
| **Invalid Calendar Date** | `entryDate: "2026-99-99"` | `400 Bad Request` | `400 Bad Request` | 0 records | **PASS** |
