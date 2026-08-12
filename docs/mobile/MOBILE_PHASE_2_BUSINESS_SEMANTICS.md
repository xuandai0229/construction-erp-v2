# MOBILE PHASE 2 — BUSINESS SEMANTICS AUDIT REPORT

---

## 1. QUANTITY SEMANTICS
- **Definition**: `quantity` in `POST /api/v1/projects/{projectId}/progress/daily` represents **Khối lượng thực hiện RIÊNG trong ngày (Daily Incremental Volume)**.
- **Aggregation**: Web ERP accumulates all daily entry quantities (`sum(quantity)`) to render total completed work against `designQuantity`.
- **UI Label**: Mobile UI explicitly titles the input field: **"Khối lượng thi công trong ngày"**.

---

## 2. WBS ITEM ASSIGNMENT RULE
- **Leaf-Only Restriction**: Daily progress entries are recorded on specific activity items mapped to **LEAF WBS nodes**.
- **Parent Nodes**: Aggregate nodes serve as organizational grouping headers and compute progress percentage dynamically from child items.

---

## 3. MULTIPLE ENTRIES & SAME-DAY SEMANTICS
- **Rule**: Multiple daily progress entries for the same WBS item on the same date are **permitted**.
- **Use Case**: Allows logging separate morning and afternoon shifts, or recording progress entries by different site engineers.

---

## 4. BOUNDARY & EDGE CASE RULES
- **Zero Quantity (`0`)**: Permitted by API/DB schema to allow recording site activity notes or weather delay logs when zero physical quantity was placed.
- **Future Dates**: Allowed up to present timestamp.
- **Over-Planned Quantity**: Permitted. If completed quantity exceeds `designQuantity`, `progressPercent` scales above 100% (reflecting design variations or field overrun).

---

## 5. IDEMPOTENCY & ACTOR BINDING
- **Server Idempotency**: `SERVER IDEMPOTENCY = NOT IMPLEMENTED` on POST `/progress/daily` endpoint.
- **Client Protection**: `CLIENT DOUBLE-TAP PROTECTION = IMPLEMENTED` in Mobile UI via button disabling and state locking.
- **Actor Binding**: `createdById` is **derived strictly from session token** (`user.id`). Payload-level actor spoofing is ignored.
