# Ma trận checklist operational V2

V1 gồm 55 dòng kế hoạch và 20 mục báo cáo được giữ bất biến. V2 tạo 38 mục nhập operational có nhãn duy nhất; 20 mục báo cáo chỉ là category tổng hợp nhiều-nhiều. Mã nguồn trong bảng truy ngược tới câu chữ V1 đã khóa.

| Operational item | Nguồn kế hoạch | Nhóm báo cáo | Nhãn UI | Có bắt buộc | Ghi chú |
|---|---|---|---|---:|---|
| OP-DOC-001 — Hồ sơ pháp lý của công nhân | PL-BLD-DOC-001, PL-INF-DOC-001 | RP-016 | Hồ sơ pháp lý của công nhân | Có | Hợp nhất nguồn kế hoạch |
| OP-DOC-002 — Hồ sơ công tác an toàn lao động | PL-BLD-DOC-002, PL-INF-DOC-002 | RP-016 | Hồ sơ công tác an toàn lao động | Có | Hợp nhất nguồn kế hoạch |
| OP-DOC-003 — Sổ theo dõi cấp phát bảo hộ lao động | PL-BLD-DOC-003, PL-INF-DOC-003 | RP-016 | Sổ theo dõi cấp phát bảo hộ lao động | Có | Hợp nhất nguồn kế hoạch |
| OP-DOC-004 — Nhật ký an toàn | PL-BLD-DOC-004, PL-INF-DOC-004 | RP-019 | Nhật ký an toàn | Có | Hợp nhất nguồn kế hoạch |
| OP-DOC-005 — Cam kết an toàn | PL-BLD-DOC-005, PL-INF-DOC-005 | RP-016 | Cam kết an toàn | Có | Hợp nhất nguồn kế hoạch |
| OP-DOC-006 — Cam kết đã học an toàn | PL-BLD-DOC-006, PL-INF-DOC-006 | RP-016, RP-017 | Cam kết đã học an toàn | Có | Hợp nhất nguồn kế hoạch |
| OP-DOC-007 — Huấn luyện và cấp thẻ an toàn nhóm 3 | PL-BLD-DOC-007, PL-INF-DOC-008 | RP-017 | Huấn luyện và cấp thẻ an toàn nhóm 3 | Có | Hợp nhất nguồn kế hoạch |
| OP-DOC-008 — Khám sức khỏe cho công nhân | PL-BLD-DOC-008, PL-INF-DOC-007 | RP-016 | Khám sức khỏe cho công nhân | Có | Hợp nhất nguồn kế hoạch |
| OP-DOC-009 — Bảo hiểm tai nạn của cán bộ, công nhân | PL-BLD-DOC-009, PL-INF-DOC-009 | RP-016 | Bảo hiểm tai nạn của cán bộ, công nhân | Có | Hợp nhất nguồn kế hoạch |
| OP-PPE-001 — Sử dụng phương tiện bảo hộ cá nhân đã cấp phát | PL-BLD-SITE-001, PL-INF-SITE-001, PL-SAN-001 | RP-001 | Sử dụng phương tiện bảo hộ cá nhân đã cấp phát | Có | Hợp nhất cả dòng yêu cầu và chế tài |
| OP-HEIGHT-001 — Dây an toàn, mũ, lưới và điểm neo khi làm việc trên cao | PL-SAN-004 | RP-002 | Dây an toàn, mũ, lưới và điểm neo khi làm việc trên cao | Có | Một lần đánh giá |
| OP-HEIGHT-002 — Hệ thống giàn giáo | PL-BLD-SITE-007 | RP-004 | Hệ thống giàn giáo | Có | Tách đúng khái niệm trong dòng nguồn ghép |
| OP-HEIGHT-003 — Lưới bao che, chống bụi và chống vật rơi | PL-BLD-SITE-007 | RP-005 | Lưới bao che, chống bụi và chống vật rơi | Có | Tách đúng khái niệm trong dòng nguồn ghép |
| OP-HEIGHT-004 — Dây đu sơn ngoài nhà | PL-BLD-SITE-009 | RP-002 | Dây đu sơn ngoài nhà | Có | Hợp nhất nguồn kế hoạch |
| OP-HEIGHT-005 — Lan can cầu thang, biên công trình và hố sâu | PL-BLD-SITE-014, PL-INF-SITE-015 | RP-002, RP-006 | Lan can cầu thang, biên công trình và hố sâu | Có | Theo loại công trình |
| OP-HEIGHT-006 — Hố kỹ thuật, lỗ mở, hố ga và hố cửa thang máy | PL-BLD-SITE-015, PL-INF-SITE-010 | RP-006 | Hố kỹ thuật, lỗ mở, hố ga và hố cửa thang máy | Có | Theo loại công trình |
| OP-ACCESS-001 — Thang, lối lên xuống và lối đi lại | — | RP-003 | Thang, lối lên xuống và lối đi lại | Có | Bổ sung operational từ mẫu báo cáo |
| OP-ACCESS-002 — Lối đi lại và lối thoát hiểm thông thoáng | — | RP-010 | Lối đi lại và lối thoát hiểm thông thoáng | Có | Khác yêu cầu kiểm tra thang |
| OP-EXC-001 — Cừ và văng chống thành hố đào | PL-INF-SITE-007 | RP-006 | Cừ và văng chống thành hố đào | Có | Hạ tầng/loại khác |
| OP-EXC-002 — An toàn thành hố đào | PL-INF-SITE-009 | RP-006 | An toàn thành hố đào | Có | Hạ tầng/loại khác |
| OP-SIGN-001 — Biển báo nội quy, cảnh báo, đèn tín hiệu và phản quang | PL-BLD-SITE-002, PL-INF-SITE-002 | RP-013 | Biển báo nội quy, cảnh báo, đèn tín hiệu và phản quang | Có | Một lần đánh giá |
| OP-ELEC-001 — An toàn hệ thống điện thi công | PL-BLD-SITE-003, PL-INF-SITE-003 | RP-015 | An toàn hệ thống điện thi công | Có | Hợp nhất nguồn kế hoạch |
| OP-ELEC-002 — Hệ thống dây cáp và dây điện thi công | PL-BLD-SITE-004, PL-INF-SITE-004, PL-SAN-002 | RP-015 | Hệ thống dây cáp và dây điện thi công | Có | Hợp nhất cả dòng chế tài |
| OP-ELEC-003 — Hệ thống tủ điện thi công | PL-BLD-SITE-005, PL-INF-SITE-005 | RP-015 | Hệ thống tủ điện thi công | Có | Hợp nhất nguồn kế hoạch |
| OP-ELEC-004 — Điện sinh hoạt trong lán trại công nhân | PL-BLD-SITE-006, PL-INF-SITE-006, PL-SAN-003 | RP-014, RP-015 | Điện sinh hoạt trong lán trại công nhân | Có | Một lần đánh giá, hai category nhận dữ liệu |
| OP-ELEC-005 — Ổ cắm và dây nguồn của thiết bị cầm tay | — | RP-015 | Ổ cắm và dây nguồn của thiết bị cầm tay | Có | Bổ sung operational từ mẫu báo cáo |
| OP-MACH-001 — Máy, thiết bị có yêu cầu nghiêm ngặt về ATLĐ | PL-BLD-SITE-010, PL-INF-SITE-011 | RP-009 | Máy, thiết bị có yêu cầu nghiêm ngặt về ATLĐ | Có | Hợp nhất nguồn kế hoạch |
| OP-MACH-002 — Hồ sơ máy móc thực tế trên công trường | PL-BLD-SITE-011, PL-INF-SITE-012 | RP-009 | Hồ sơ máy móc thực tế trên công trường | Có | Hợp nhất nguồn kế hoạch |
| OP-MACH-003 — Kiểm định máy còn hiệu lực | PL-BLD-SITE-012, PL-INF-SITE-013 | RP-009 | Kiểm định máy còn hiệu lực | Có | Hợp nhất nguồn kế hoạch |
| OP-MACH-004 — Hồ sơ thợ vận hành máy | PL-BLD-SITE-013, PL-INF-SITE-014 | RP-009 | Hồ sơ thợ vận hành máy | Có | Hợp nhất nguồn kế hoạch |
| OP-FIRE-001 — Hàn, cắt và công việc phát sinh nhiệt | — | RP-007 | Hàn, cắt và công việc phát sinh nhiệt | Có | Bổ sung operational từ mẫu báo cáo |
| OP-FIRE-002 — Thiết bị và biển báo PCCC | — | RP-012 | Thiết bị và biển báo PCCC | Có | Bổ sung operational từ mẫu báo cáo |
| OP-ENV-001 — Vệ sinh công nghiệp trên công trường | PL-BLD-SITE-008, PL-INF-SITE-008, PL-SAN-005 | RP-011 | Vệ sinh công nghiệp trên công trường | Có | Hợp nhất cả dòng chế tài |
| OP-ENV-002 — An toàn và vệ sinh khu ăn ở, lưu trú công nhân | — | RP-014 | An toàn và vệ sinh khu ăn ở, lưu trú công nhân | Có | Bổ sung operational từ mẫu báo cáo |
| OP-MGMT-001 — Tổ chức huấn luyện ATLĐ, VSMT và PCCC | PL-TRN-001 | RP-017 | Tổ chức huấn luyện ATLĐ, VSMT và PCCC | Có | Hợp nhất nguồn kế hoạch |
| OP-MGMT-002 — Phối hợp Ban chỉ huy trong công tác an toàn | PL-TRN-002 | RP-018 | Phối hợp Ban chỉ huy trong công tác an toàn | Có | Hợp nhất nguồn kế hoạch |
| OP-MGMT-003 — Thực hiện chế độ báo cáo định kỳ | — | RP-019 | Thực hiện chế độ báo cáo định kỳ | Có | Bổ sung operational từ mẫu báo cáo |
| OP-OTHER-001 — Các công tác kiểm tra khác | — | RP-020 | Các công tác kiểm tra khác | Không | Không ép hoàn tất phiên |

`RP-008 — 8. Công việc ngày` không tạo operational item: giữ nguyên `sourceText`, `requiresBusinessClarification=true`, `isScored=false`, `blocksCompletion=false` và mapping rỗng.
