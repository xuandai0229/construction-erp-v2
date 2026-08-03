# Excel ↔ Google Sheet ↔ Manifest ↔ Database Reconciliation

Generated: 2026-08-01T04:41:34.819Z
Conclusion: **SOURCE RECONCILIATION PASS**

## 1. Source inventory

| STT | File | Size | Modified | SHA-256 | Sheets | Target sheet | Header | Relevant |
|---:|---|---:|---|---|---:|---|---|---|
| 1 | D:\ZaloData\CÁC CT CÁC BAN.xlsx | 25829 | 2026-08-01T04:22:17.598Z | `3b6fb90c492f55cd3fd5fa78edf35d9e971362644a6a2cbe4808cef133d890e3` | 2 | 2HN và PTN (3) | YES | YES |
| 2 | D:\ZaloData\7. GPC - Bao cao tuan  1012.xlsx | 458938 | 2026-07-29T09:40:18.349Z | `1c622ec99931d10503e68613c1a20982266cc9a304d4724507d505a35ddcbc9d` | 2 |  | NO | NO |
| 3 | D:\construction-erp-v2\backups\2026-06-22-1715\restore-storage-test\projects\cmqp1gex90000pwwk17oqmjct\documents\doc_1782122050804_d6fi9l.xlsx | 15999 | 2026-06-22T09:54:10.000Z | `d6b6251dc79792f87a83b3862b95d274b920f534a7b31b4c4a8f321990f9fbc8` | 1 |  | NO | NO |
| 4 | D:\construction-erp-v2\backups\2026-06-22-1715\restore-storage-test\projects\cmqp1gex90000pwwk17oqmjct\documents\doc_1782122050811_iiajm.xlsx | 15999 | 2026-06-22T09:54:10.000Z | `d6b6251dc79792f87a83b3862b95d274b920f534a7b31b4c4a8f321990f9fbc8` | 1 |  | NO | NO |

Selected file: **D:\ZaloData\CÁC CT CÁC BAN.xlsx** because it is the only workbook with the approved sheet/header structure. Current SHA-256: `3b6fb90c492f55cd3fd5fa78edf35d9e971362644a6a2cbe4808cef133d890e3`.
Previous hashes checked: `62eaea7de404a62a131e9992444b36a23cf9e3707afaf0a1464d5c65630d6c51`, `b6b1bba3c1859796e98224d8565bf1ac643599219a7c064d5ab5f14af963c2ae`. No file currently present has either previous hash. Canonical data fingerprint: **SAME_DATA_DIFFERENT_BINARY**.

## 2. Structure and counts

| Metric | Value |
|---|---:|
| excelProjects | 21 |
| googleProjects | 21 |
| manifestProjects | 21 |
| databaseSourceProjects | 21 |
| commanders | 11 |
| assignments | 18 |
| projectsWithoutCommander | 3 |
| projectsWithDuration | 17 |
| projectsWithFullDates | 6 |
| projectsMissingDates | 15 |
| projectsWithExecutionUnit | 3 |
| duplicateProjectNames | 1 |

Excel fingerprint: `3241737ab8e4ac3fc7df6428b0b2374c5125a532b8608adfa9c2edd84702df2d`
Database metadata fingerprint: `3241737ab8e4ac3fc7df6428b0b2374c5125a532b8608adfa9c2edd84702df2d`
Google fingerprint: `3241737ab8e4ac3fc7df6428b0b2374c5125a532b8608adfa9c2edd84702df2d`

## 3. Project comparison

| Code | Name | Conclusion | Field diff | Excel | Google | Manifest | Database |
|---|---|---|---|---|---|---|---|
| CT-2026-0012 | Xây dựng, cải tạo trường Mầm non 20 -10, quận Hoàn Kiếm | **EXACT_MATCH** |  | present | present | CT-2026-0012 / UNCHANGED | CT-2026-0012 / cms9tydqx000sn4k5sz6q6wfj |
| CT-2026-0015 | Bảo trì, kết cấu hạ tầng giao thông đường bộ trên địa bàn phường Xuân Phương theo phân cấp 2026-2028 | **EXACT_MATCH** |  | present | present | CT-2026-0015 / UNCHANGED | CT-2026-0015 / cms9tydud0010n4k5w2hmqjmh |
| CT-2026-0010 | Sửa chữa, cải tạo tấm đan cống hộp thoát nước đường Nguyễn Chí Thanh ( đoạn từ Học viện Phụ nữ đến chân cầu vượt Nguyễn Chí Thanh | **EXACT_MATCH** |  | present | present | CT-2026-0010 / UNCHANGED | CT-2026-0010 / cms9tydnk000mn4k5azfl2w64 |
| CT-2026-0014 | Xây dựng tuyến đường đoạn từ nút giao ngõ 612 Lạc Long Quân- phố Vũ Tuấn Chiêu đến phố Nhật Chiêu, lắp đặt tuyến ống bổ cập nước Hồ Tây | **EXACT_MATCH** |  | present | present | CT-2026-0014 / UNCHANGED | CT-2026-0014 / cms9tydsp000xn4k5286p44ty |
| CT-2026-0007 | Cải tạo, sửa chữa và mua sắm trang thiết bị tại một số trường học trên địa bàn phường Tây Hồ- 15 trường | **EXACT_MATCH** |  | present | present | CT-2026-0007 / UNCHANGED | CT-2026-0007 / cms9tydk2000en4k56itvgc7a |
| CT-2026-0005 | Xây dựng trường MN Hoa Hồng | **EXACT_MATCH** |  | present | present | CT-2026-0005 / UNCHANGED | CT-2026-0005 / cms9tydic0009n4k57z419qjm |
| CT-2026-0019 | Quản lý, duy tu, duy trì vận hành hệ thống công viên hồ Phùng Khoang theo phân cấp trên địa bàn phường Đại Mỗ giai đoạn 2026-2028 | **EXACT_MATCH** |  | present | present | CT-2026-0019 / UNCHANGED | CT-2026-0019 / cms9tydy1001an4k52iepe45t |
| CT-2026-0004 | Xây dựng trường mầm non Kim Sơn, huyện Gia Lâm | **EXACT_MATCH** |  | present | present | CT-2026-0004 / UNCHANGED | CT-2026-0004 / cms9tydia0007n4k563f6j0g7 |
| CT-2026-0002 | Dự án: Đầu tư xây dựng phân kỳ 1 (giai đoạn 1) Quảng trường – công viên phía Đông hồ Hoàn Kiếm | **EXACT_MATCH** |  | present | present | CT-2026-0002 / UNCHANGED | CT-2026-0002 / cms9tyde50001n4k53e221ea6 |
| CT-2026-0021 | Duy tu hè tuyến phố Dương Văn Bé đọan lối vào ao cá bác Hồ | **EXACT_MATCH** |  | present | present | CT-2026-0021 / UNCHANGED | CT-2026-0021 / cms9tydy4001dn4k58iib1ob9 |
| CT-2026-0017 | Cải tạo,chỉnh trang hè, đường, hạ tầng kỹ thuật và vườn hoa thuộc khu đô thị mới Trung Văn, phường Đại Mỗ, TP Hà Nội | **EXACT_MATCH** |  | present | present | CT-2026-0017 / UNCHANGED | CT-2026-0017 / cms9tydxt0016n4k5rx9hikdj |
| CT-2026-0003 | Xây dựng trường THCS Lệ Chi | **EXACT_MATCH** |  | present | present | CT-2026-0003 / UNCHANGED | CT-2026-0003 / cms9tydgm0004n4k5luf4qn5n |
| CT-2026-0013 | Cải tạo đường và hệ thống thoát nước ngõ 718,1008 đường Láng, ngách 1150/1 đường Láng, ngõ 1194, ngách 1194/19, 1194/63,1194/67,1194/73,1194/91 đường Láng, ngõ 67 phố chùa Láng, ngõ 10 pháo đài Láng, ngách 45/25,14/31 Pháo Đài Láng, ngõ 74,100, ngách 76/3 Nguyễn Chí Thanh | **EXACT_MATCH** |  | present | present | CT-2026-0013 / UNCHANGED | CT-2026-0013 / cms9tydsm000vn4k5t0z7fhsx |
| CT-2026-0006 | Hoàn thiện và đầu tư trang thiết bị trường Mầm non Minh Khai | **EXACT_MATCH** |  | present | present | CT-2026-0006 / UNCHANGED | CT-2026-0006 / cms9tydif000bn4k56ypfqjxw |
| CT-2026-0018 | Cải tạo,chỉnh trang hè, đường, hạ tầng kỹ thuật và vườn hoa thuộc khu đô thị mới Trung Văn, phường Đại Mỗ, TP Hà Nội | **EXACT_MATCH** |  | present | present | CT-2026-0018 / UNCHANGED | CT-2026-0018 / cms9tydxx0018n4k5xsmxehmz |
| CT-2026-0001 | Kế hoạch lựa chọn nhà thầu thực hiện nhiệm vụ quản lý bảo trì kết cấu hạ tầng giao thông đường bộ giai đoạn 2026-2030 trên địa bàn phường Thanh Xuân | **EXACT_MATCH** |  | present | present | CT-2026-0001 / UNCHANGED | CT-2026-0001 / cms9tyddq0000n4k5mvu9wdrt |
| CT-2026-0009 | Dự án: Trung tâm giao dịch công nghệ thường xuyên Hà Nội - Khu liên cơ Võ Chí Công (điều chỉnh) | **EXACT_MATCH** |  | present | present | CT-2026-0009 / UNCHANGED | CT-2026-0009 / cms9tydlu000jn4k5itd0vzcd |
| CT-2026-0011 | Cải tạo sửa chữa ĐNN phường Vĩnh Tuy năm 2026, các ngõ 477,487,325 Kim Ngưu, ngách 325/135, 121/48, 121/95, hẻm ngách 121/3 Kim Ngưu | **EXACT_MATCH** |  | present | present | CT-2026-0011 / UNCHANGED | CT-2026-0011 / cms9tydp8000pn4k5tuwqq9ga |
| CT-2026-0016 | Cải tạo, chỉnh trang hạ tầng kỹ thuật khu vực hè phố Trần Nhân Tông và cổng công viên Thống Nhất | **EXACT_MATCH** |  | present | present | CT-2026-0016 / UNCHANGED | CT-2026-0016 / cms9tydw00013n4k5sjjtouul |
| CT-2026-0008 | Cải tạo, sửa chữa và mua sắm trang thiết bị tại một số trường học trên địa bàn phường Tây Hồ- 13 trường | **EXACT_MATCH** |  | present | present | CT-2026-0008 / UNCHANGED | CT-2026-0008 / cms9tydlp000hn4k5s8402dhe |
| CT-2026-0020 | Quản lý duy tu duy trì hạ tầng giao thông( bao gồm lắp biển chỉ dẫn đường, sơn kẻ vạch) theo phân cấp trên địa bàn phường Đại Mỗ năm 2026 | **EXACT_MATCH** |  | present | present | CT-2026-0020 / UNCHANGED | CT-2026-0020 / cms9tydy2001bn4k58evaixfi |

## 4. Đại Mỗ validation

- CT-2026-0017: projectId=cms9tydxt0016n4k5rx9hikdj; externalSourceKey=686545a2367431d5579f4e72bc83f0043ddb87eab031dc6cb8d7a28b56dc3685; budget=10525277000; unit=cty 2HN; conclusion=EXACT_MATCH
- CT-2026-0018: projectId=cms9tydxx0018n4k5xsmxehmz; externalSourceKey=8b5aca03fd274b6e8059b6960b714c83fb026d479291c4f61699f79eb5ddd1f7; budget=3879333000; unit=PTN; conclusion=EXACT_MATCH

## 5. Commanders and assignments

Commander names in Excel: 11; database assignment rows: 18.
- Lê Mạnh Hùng: lemanhhung@gmail.com
- Đoàn Văn Giang: doanvangiang@gmail.com
- Lê Trọng Hạ: letrongha@gmail.com
- Trần Quốc Dũng: tranquocdung@gmail.com
- Nguyễn Văn Hưng: nguyenvanhung@gmail.com
- Phạm Anh Tuấn: phamanhtuan@gmail.com
- Nguyễn Đức Mùi: nguyenducmui@gmail.com
- Nguyễn Tư Mạnh: nguyentumanh@gmail.com
- Lương Văn Công: luongvancong@gmail.com
- Vũ Hưng: vuhung@gmail.com
- Nguyễn Minh Hùng: nguyenminhhung@gmail.com

## 6. Database mutation decision

All four sources reconcile; no database mutation was executed.

Google status: **VERIFIED**.

Machine-readable detail: `docs/qa/excel-google-database-diff.json`.