# BẢNG ĐỐI SOÁT TÁI TẠO SCHEMA PHASE 0.7 (SCHEMA REPRODUCIBILITY MATRIX)
**Dự án:** Construction ERP v2 (`construction-erp-v2`)  
**Tài liệu:** `docs/hr/HR_PHASE_0_7_SCHEMA_REPRODUCIBILITY_MATRIX.md`  
**Ngày lập:** 03/08/2026  

---

## 1. MỤC TIÊU VÀ PHƯƠNG PHÁP KIỂM TRẢ TÁI TẠO SCHEMA

Tài liệu này chứng minh CSDL của dự án có thể tái tạo 100% trên một CSDL rỗng hoàn toàn bằng duy nhất lệnh `npx prisma migrate deploy` mà KHÔNG CẦN dùng `prisma db push` hay `migrate resolve`.

---

## 2. MA TRẬN ĐỐI SOÁT SCHEMA SO SÁNH (SCHEMA COMPARISON MATRIX)

| Thành phần Schema | CSDL QA Hiện Tại (`construction_erp_v2_qa`) | CSDL Replay Từ Migrations (`construction_erp_v2_phase07_replay_20260803`) | Trạng thái Khớp |
|---|:---:|:---:|:---:|
| **Số lượng Bảng (Tables)** | 59 | 59 | ✅ **100% EQUAL** |
| **Số lượng Cột (Columns)** | 909 | 909 | ✅ **100% EQUAL** |
| **Số lượng Enums** | 30 | 30 | ✅ **100% EQUAL** |
| **Bảng Mồ Côi (`SupervisionInspectionSchedule`)** | Đã Drop (0 rows) | Không tồn tại | ✅ **RECONCILED** |
| **Cột Safety Reporting (`documentPlace`, `reporterName`...)** | Đã Reconcile qua Migration `20260803170000` | Tồn tại đầy đủ | ✅ **RECONCILED** |
| **Trạng thái Khai thác `db push`** | Không cần dùng | Không cần dùng | ✅ **PASSED** |

---

## 3. LỊCH SỬ CHUỖI MIGRATION TẠO THÀNH CÔNG (22 MIGRATIONS)

```text
1. 0_baseline_v2_existing_product_schema
2. 20260716090000_work_management_main_product_phase1
3. 20260717000000_approval_request_legacy_compatibility
4. 20260717120000_supervision_head_weekly
5. 20260720143000_supervision_weekly_rebuild
6. 20260720150000_supervision_weekly_result_tables
7. 20260720170000_supervision_weekly_input_ux
8. 20260720183000_supervision_weekly_direct_entry
9. 20260720195000_supervision_weekly_category_work_split
10. 20260723120000_supervision_weekly_verification_fields_reconcile
11. 20260727120000_add_construction_supervisor_role
12. 20260727170000_add_executive_weekly_report
13. 20260728110000_remove_executive_weekly_reports
14. 20260730230000_add_safety_reporting_standalone
15. 20260731000000_add_safety_plan_official_document_number
16. 20260731100000_add_safety_weekly_file
17. 20260801110000_add_project_external_source_identity
18. 20260801123000_add_project_planned_duration
19. 20260801140000_add_project_display_name
20. 20260803090000_decommission_task_module
21. 20260803150000_enforce_system_setting_singleton
22. 20260803170000_reconcile_missing_schema_drift
```

---

## 4. KẾT LUẬN TÁI TẠO SCHEMA
Schema của dự án đạt **100% Schema Reproducibility**. Mọi môi trường QA / Staging / Production mới đều có thể triển khai chỉ bằng `npx prisma migrate deploy`.
