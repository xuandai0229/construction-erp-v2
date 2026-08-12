# MOBILE PHASE 2 — SECURITY & NEGATIVE TESTS MATRIX

| Security Test Dimension | Test Scenario | Expected Outcome | Actual Runtime Outcome | DB Side Effect | Result |
|---|---|---|---|---|---|
| **Anonymous Request** | `GET /projects/{id}/wbs` without Bearer token | `401 Unauthorized` | `401 Unauthorized` | 0 records | **PASS** |
| **Wrong Role Access** | Non-member user posting to `/progress/daily` | `403 Forbidden` | `403 Forbidden` | 0 records | **PASS** |
| **Cross-Project User Access** | User A calling `POST /projects/{Project_B_Id}/progress/daily` | `403 Forbidden` | `403 Forbidden` | 0 records | **PASS** |
| **Cross-Project WBS Spoof** | User A posting `itemId` from Project B to Project A endpoint | Rejected / DB FK Exception | Rejected / DB FK Exception (500/400) | 0 records | **PASS** |
| **Invalid / Non-existent WBS** | Posting random string `non-existent-wbs-id` | Submission fails / Error response | Submission fails (500 FK guard) | 0 records | **PASS** |
| **Actor Spoofing** | Passing payload `{ createdById: "fake_user" }` | Session user used, payload ignored | Session user used (`qa_freeze_admin`) | `createdById = session.user.id` | **PASS** |
| **Negative Quantity** | Entering quantity `-10` | `400 Bad Request` | `400 Bad Request` | 0 records | **PASS** |
| **Malformed Date** | Date string `"invalid-date-format"` | Intercepted by client validator | Intercepted before network transmit | 0 records | **PASS** |
