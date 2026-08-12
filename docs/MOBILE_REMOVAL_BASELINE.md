# MOBILE REMOVAL BASELINE REPORT

## System Baseline Summary
- **Timestamp**: 2026-08-12T16:10:00+07:00
- **Current Git Branch**: `main`
- **Current Git Commit**: `5269c3e` (`pate_don54`)
- **Database Target**: PostgreSQL `construction_erp_v2_dev` (`localhost:5432`)
- **Total Database Projects**: 22
- **Real Business Projects**: 21 (`CT-2026-0001` through `CT-2026-0021`)
- **QA Mobile Sandbox Projects**: 1 (`QA-MOBILE-001` - ID `cmsps3w180000ukk58ulp77w6`)

## Working-Tree Uncommitted Status (PRESERVED)
Per safety guidelines, uncommitted work in the working tree is strictly preserved and not discarded:
- `next.config.ts` (retained API V1 CORS headers)
- `mobile/**` (staged for surgical removal)
- `docs/mobile/**` (staged for classification & surgical removal)
- `scratch/` (staged for QA script classification)

## Real Business Projects Baseline (21 Protected Projects)
1. `CT-2026-0001` | `cms9tyddq0000n4k5mvu9wdrt` | Kế hoạch lựa chọn nhà thầu...
2. `CT-2026-0002` | `cms9tyde50001n4k53e221ea6` | Dự án: Đầu tư xây dựng phân kỳ 1...
3. `CT-2026-0003` | `cms9tydgm0004n4k5luf4qn5n` | Xây dựng trường THCS Lệ Chi
4. `CT-2026-0004` | `cms9tydia0007n4k563f6j0g7` | Xây dựng trường mầm non Kim Sơn...
5. `CT-2026-0005` | `cms9tydic0009n4k57z419qjm` | Xây dựng trường MN Hoa Hồng
6. `CT-2026-0006` | `cms9tydif000bn4k56ypfqjxw` | Hoàn thiện và đầu tư trang thiết bị trường Mầm non Minh Khai
7. `CT-2026-0007` | `cms9tydk2000en4k56itvgc7a` | Cải tạo, sửa chữa và mua sắm trang thiết bị... 15 trường
8. `CT-2026-0008` | `cms9tydlp000hn4k5s8402dhe` | Cải tạo, sửa chữa và mua sắm trang thiết bị... 13 trường
9. `CT-2026-0009` | `cms9tydlu000jn4k5itd0vzcd` | Dự án: Trung tâm giao dịch công nghệ...
10. `CT-2026-0010` | `cms9tydnk000mn4k5azfl2w64` | Sửa chữa, cải tạo tấm đan cống hộp...
11. `CT-2026-0011` | `cms9tydp8000pn4k5tuwqq9ga` | Cải tạo sửa chữa ĐNN phường Vĩnh Tuy...
12. `CT-2026-0012` | `cms9tydqx000sn4k5sz6q6wfj` | Xây dựng, cải tạo trường Mầm non 20 -10...
13. `CT-2026-0013` | `cms9tydsm000vn4k5t0z7fhsx` | Cải tạo đường và hệ thống thoát nước...
14. `CT-2026-0014` | `cms9tydsp000xn4k5286p44ty` | Xây dựng tuyến đường đoạn từ nút giao ngõ 612...
15. `CT-2026-0015` | `cms9tydud0010n4k5w2hmqjmh` | Bảo trì, kết cấu hạ tầng giao thông...
16. `CT-2026-0016` | `cms9tydw00013n4k5sjjtouul` | Cải tạo, chỉnh trang hạ tầng kỹ thuật...
17. `CT-2026-0017` | `cms9tydxt0016n4k5rx9hikdj` | Cải tạo,chỉnh trang hè, đường...
18. `CT-2026-0018` | `cms9tydxx0018n4k5xsmxehmz` | Cải tạo,chỉnh trang hè, đường...
19. `CT-2026-0019` | `cms9tydy1001an4k52iepe45t` | Quản lý, duy tu, duy trì vận hành hệ thống...
20. `CT-2026-0020` | `cms9tydy2001bn4k58evaixfi` | Quản lý duy tu duy trì hạ tầng giao thông...
21. `CT-2026-0021` | `cms9tydy4001dn4k58iib1ob9` | Duy tu hè tuyến phố Dương Văn Bé...

## QA Mobile Sandbox Project Baseline (1 Target for Cleanup)
- `QA-MOBILE-001` | ID: `cmsps3w180000ukk58ulp77w6`
- **Owned Dependent Records**:
  - `wbsItems`: 2
  - `projectMembers`: 1
  - `fieldProgressItems`: 1
  - `fieldProgressEntries`: 4
  - `fieldProgressTemplates`: 1
  - `siteReports`: 0
  - `documents`: 0
  - `materialProposals`: 0

## CT-2026-0003 Integrity Check Baseline
- `CT-2026-0003` (`cms9tydgm0004n4k5luf4qn5n`)
- **QA/MOBILE Residue Count**: 0

## Primary Target Inventory for Decommissioning
1. `mobile/` native Expo application directory.
2. `docs/mobile/` native mobile design/parity reports.
3. Native mobile QA scripts in `scratch/`.
4. Dedicated sandbox project `QA-MOBILE-001` & exclusive dependent records in PostgreSQL DB.
5. Mobile package references / scripts / vscode configs (if present).
