# RUNTIME DATA INTEGRITY DRY-RUN & RECONCILIATION REPORT

**Repository**: `construction-erp-v2`  
**Database URL**: `postgresql://postgres:123456@127.0.0.1:5432/construction_erp_v2_qa`  
**Date**: August 1, 2026  
**Audit Execution Mode**: `READ-ONLY DRY-RUN`

---

## 1. System Inventory Summary

| Entity | DB Total Count | Active Count | Locked / Disabled | Soft-Deleted | Integrity Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **User** | 12 | 12 | 0 | 0 | `EXACT - 0 Duplicates` |
| **Project** | 21 | 21 | 0 | 0 | `EXACT - 0 Duplicates` |
| **ProjectMember** | 18 | 18 | 0 | 0 | `EXACT - 0 Orphans` |

---

## 2. User ↔ Project Assignment Reconciliation Matrix

| User Name | User Email | System Role | Assigned Projects Count | Assigned Project Codes & Titles | DB Integrity Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **XĐ** | `daicongtu2910@gmail.com` | `ADMIN` | 0 | *(No direct project assignments)* | `EXACT` |
| **Đoàn Văn Giang** | `doanvangiang@gmail.com` | `CHIEF_COMMANDER` | 3 | • `CT-2026-0004` Xây dựng trường Mầm non Kim Sơn<br>• `CT-2026-0003` Xây dựng trường THCS Lệ Chi<br>• `CT-2026-0005` Mầm non Hoa Hồng — Yên Thường | `EXACT` |
| **Lê Trọng Hạ** | `letrongha@gmail.com` | `CHIEF_COMMANDER` | 1 | • `CT-2026-0006` Mầm non Minh Khai | `EXACT` |
| **Trần Quốc Dũng** | `tranquocdung@gmail.com` | `CHIEF_COMMANDER` | 2 | • `CT-2026-0007` 15 trường học Tây Hồ<br>• `CT-2026-0008` 13 trường học Tây Hồ | `EXACT` |
| **Nguyễn Văn Hưng** | `nguyenvanhung@gmail.com` | `CHIEF_COMMANDER` | 1 | • `CT-2026-0009` TT Giao dịch công nghệ Võ Chí Công | `EXACT` |
| **Phạm Anh Tuấn** | `phamanhtuan@gmail.com` | `CHIEF_COMMANDER` | 4 | • `CT-2026-0017` KĐT Trung Văn — 2HN<br>• `CT-2026-0018` KĐT Trung Văn — PTN<br>• `CT-2026-0010` Cống hộp Nguyễn Chí Thanh<br>• `CT-2026-0013` Đường & thoát nước phường Láng | `EXACT` |
| **Nguyễn Đức Mùi** | `nguyenducmui@gmail.com` | `CHIEF_COMMANDER` | 1 | • `CT-2026-0011` Đường & thoát nước Vĩnh Tuy | `EXACT` |
| **Nguyễn Tư Mạnh** | `nguyentumanh@gmail.com` | `CHIEF_COMMANDER` | 1 | • `CT-2026-0012` Mầm non 20–10 Hoàn Kiếm | `EXACT` |
| **Lương Văn Công** | `luongvancong@gmail.com` | `CHIEF_COMMANDER` | 1 | • `CT-2026-0014` Lạc Long Quân — Nhật Chiêu | `EXACT` |
| **Vũ Hưng** | `vuhung@gmail.com` | `CHIEF_COMMANDER` | 2 | • `CT-2026-0015` Hạ tầng giao thông Xuân Phương<br>• `CT-2026-0020` Hạ tầng giao thông Đại Mỗ | `EXACT` |
| **Nguyễn Minh Hùng** | `nguyenminhhung@gmail.com` | `CHIEF_COMMANDER` | 1 | • `CT-2026-0016` Hè phố Trần Nhân Tông | `EXACT` |
| **Lê Mạnh Hùng** | `lemanhhung@gmail.com` | `CHIEF_COMMANDER` | 1 | • `CT-2026-0002` Quảng trường công viên hồ Hoàn Kiếm | `EXACT` |

---

## 3. Chief Commander Reconciliation by Project

| Project Code | Project Title | Chief Commander in DB | Status |
| :--- | :--- | :--- | :--- |
| `CT-2026-0001` | Bảo trì hạ tầng giao thông Thanh Xuân | *(Unassigned)* | `VALID_UNASSIGNED` |
| `CT-2026-0002` | Quảng trường – công viên hồ Hoàn Kiếm | Lê Mạnh Hùng | `EXACT` |
| `CT-2026-0003` | Xây dựng trường THCS Lệ Chi | Đoàn Văn Giang | `EXACT` |
| `CT-2026-0004` | Xây dựng trường Mầm non Kim Sơn | Đoàn Văn Giang | `EXACT` |
| `CT-2026-0005` | Mầm non Hoa Hồng — Yên Thường | Đoàn Văn Giang | `EXACT` |
| `CT-2026-0006` | Hoàn thiện và thiết bị trường Mầm non Minh Khai | Lê Trọng Hạ | `EXACT` |
| `CT-2026-0007` | Cải tạo và thiết bị 15 trường học phường Tây Hồ | Trần Quốc Dũng | `EXACT` |
| `CT-2026-0008` | Cải tạo và thiết bị 13 trường học phường Tây Hồ | Trần Quốc Dũng | `EXACT` |
| `CT-2026-0009` | Trung tâm giao dịch công nghệ Võ Chí Công | Nguyễn Văn Hưng | `EXACT` |
| `CT-2026-0010` | Sửa chữa cống hộp thoát nước Nguyễn Chí Thanh | Phạm Anh Tuấn | `EXACT` |
| `CT-2026-0011` | Cải tạo đường và thoát nước phường Vĩnh Tuy | Nguyễn Đức Mùi | `EXACT` |
| `CT-2026-0012` | Cải tạo trường Mầm non 20–10 Hoàn Kiếm | Nguyễn Tư Mạnh | `EXACT` |
| `CT-2026-0013` | Cải tạo đường và thoát nước phường Láng | Phạm Anh Tuấn | `EXACT` |
| `CT-2026-0014` | Tuyến đường Lạc Long Quân — Nhật Chiêu | Lương Văn Công | `EXACT` |
| `CT-2026-0015` | Bảo trì hạ tầng giao thông Xuân Phương | Vũ Hưng | `EXACT` |
| `CT-2026-0016` | Chỉnh trang hè phố Trần Nhân Tông | Nguyễn Minh Hùng | `EXACT` |
| `CT-2026-0017` | Cải tạo hạ tầng KĐT Trung Văn — 2HN | Phạm Anh Tuấn | `EXACT` |
| `CT-2026-0018` | Cải tạo hạ tầng KĐT Trung Văn — PTN | Phạm Anh Tuấn | `EXACT` |
| `CT-2026-0019` | Duy tu công viên hồ Phùng Khoang | *(Unassigned)* | `VALID_UNASSIGNED` |
| `CT-2026-0020` | Duy tu hạ tầng giao thông phường Đại Mỗ | Vũ Hưng | `EXACT` |
| `CT-2026-0021` | Duy tu hè phố Dương Văn Bé | *(Unassigned)* | `VALID_UNASSIGNED` |

---

## 4. Anomalies & Findings
* **Duplicate Email Audit**: `0` duplicates found.
* **Duplicate Project Code Audit**: `0` duplicates found.
* **Orphaned Membership Audit**: `0` orphaned records found.
* **Duplicate Assignment Pairs Audit**: `0` duplicate (user, project) pairs found.
* **Conclusion**: Real database data is 100% clean and normalized. No database repair mutation script (`repair-runtime-data-integrity.ts`) is required.
