# Nghiên cứu và audit hiện trạng — ATLĐ, PCCC, VSMT

**Ngày**: 2026-07-30
**Phạm vi**: chỉ đọc repository và hai mẫu Word chính thức; không migration, không thay đổi mã nguồn nghiệp vụ.

## Quyết định thiết kế

### 1. Không dùng các bảng `Supervision*` legacy

**Quyết định**: Tạo một tập bảng `Safety*` additive riêng, không đổi nghĩa hoặc ghi vào `Supervision*`.

**Lý do**: `prisma/schema.prisma` gắn chú thích các model giám sát cũ là legacy và không dùng cho triển khai mới. Chúng không biểu diễn checklist cấp mục, vòng đời khắc phục độc lập, bằng chứng hay kiểm tra lại theo yêu cầu an toàn.

**Thay thế đã loại**: Bổ sung cột cho `SupervisionWeeklyDossier` hoặc tái dùng `SupervisionFinding`. Điều đó tạo coupling với module đã bị loại khỏi runtime và rủi ro làm sai dữ liệu/luồng hiện hữu.

### 2. Một nguồn dữ liệu, báo cáo là projection

**Quyết định**: Kế hoạch là nguồn lịch dự kiến; phiên kiểm tra là nguồn thực tế; kết quả checklist/tồn tại/kiểm tra lại là nguồn báo cáo. Báo cáo chỉ lưu snapshot gợi ý và các override có audit, không tạo dữ liệu kiểm tra song song.

**Lý do**: Ngăn planned/actual bị lẫn, dữ liệu trùng và chênh số ở dashboard, danh sách, báo cáo và file xuất.

### 3. Template chuẩn được bất biến theo phiên bản

**Quyết định**: Lưu một bản sao có hash của mỗi mẫu công ty trong `SafetyDocumentTemplate`, chỉ chọn mẫu đang hiệu lực khi xuất. Giữ nguyên câu chữ gốc; bộ lỗi chính tả được quản lý như đề xuất chờ duyệt, không thay thế tự động.

**Lý do**: Yêu cầu kết xuất phải có thể truy nguyên đúng mẫu và không được tự sửa câu chữ.

### 4. Quyền ở server, tệp bằng chứng qua resource guard

**Quyết định**: Mọi truy vấn/mutation cần `projectId`, kiểm tra session và membership/phạm vi trước truy cập; tải bằng chứng đi qua route kiểm tra `SafetyFinding`/`SafetyCorrectiveEvidence` trước khi trả file.

**Lý do**: `src/lib/documents/permissions.ts` hiện có `canViewDocument` trả về `true`; không thể chỉ dựa vào quyền hiển thị của Document chung để đáp ứng điều kiện cấm tải file trái quyền.

### 5. Offline là outbox thiết bị, không phải dữ liệu giả

**Quyết định**: Chỉ draft/command tạo ở thiết bị được xếp hàng cục bộ với mã idempotency và version nguồn; server là nguồn trạng thái cuối cùng và trả xung đột để người dùng chọn xử lý.

**Lý do**: Bảo toàn dữ liệu thực khi mất mạng, không sinh record demo hoặc ghi đè dữ liệu người khác.

## Mẫu Word đã kiểm tra trực quan và cấu trúc

### Nguồn và bằng chứng

| Mẫu | Tệp gốc chỉ đọc | Bản sao phân tích | PDF render | Trang |
|---|---|---|---|---:|
| Kế hoạch | `D:/FileCty/ATLD_Quảng/KẾ HOẠCH KIỂM TRA ATLĐ. PCCC, VSMT CÔNG TRÌNH         .doc` | `artifacts/safety-inspection-template-analysis/ke-hoach-kiem-tra.docx` | `artifacts/safety-inspection-template-analysis/ke-hoach-kiem-tra.pdf` | 5 |
| Báo cáo | `D:/FileCty/ATLD_Quảng/2. BÁO CÁO TỰ ĐÁNH GIÁ KẾT QUẢ KIỂM TRA AT, VSLĐ.doc` | `artifacts/safety-inspection-template-analysis/bao-cao-tu-danh-gia.docx` | `artifacts/safety-inspection-template-analysis/bao-cao-tu-danh-gia.pdf` | 3 |

Đã render và xem đủ 8 ảnh trang. Bản sao được tạo bằng Microsoft Word nền, nguồn `.doc` không bị sửa.

### Hình học chung đã đo bằng Microsoft Word

| Thuộc tính | Giá trị đã xác minh |
|---|---|
| Khổ/hướng | A4 dọc, 595.35 × 842 pt (21 × 29.7 cm) |
| Lề trên/dưới/trái/phải | 56.70 / 42.55 / 85.05 / 56.70 pt = 2.00 / 1.50 / 3.00 / 2.00 cm |
| Khoảng header/footer | 36.00 / 11.50 pt = 1.27 / 0.41 cm |
| Phông chủ đạo | Times New Roman |
| Trang 1 | Không hiển thị số trang ở cả hai mẫu |

### Mẫu 1 — Kế hoạch kiểm tra ATLĐ, PCCC, VSMT công trình

**Tên mẫu hiển thị**: `KẾ HOẠCH KIỂM TRA ATLĐ, PCCC, VSMT CÔNG TRÌNH … NGÀY… THÁNG… NĂM 2026`.

**Bố cục và định dạng**:

- Trang 1: bảng layout đầu trang 1 hàng × 2 cột, không viền nhìn thấy. Cột trái 198.50 pt (7.00 cm) ghi công ty/số; cột phải 282.95 pt (9.98 cm) ghi quốc hiệu/tiêu ngữ/ngày. Quốc hiệu in đậm 13 pt, tiêu ngữ đậm 14 pt có gạch chân; ngày nghiêng 14 pt. Tên công ty đậm 12 pt. Tiêu đề căn giữa, đậm 15 pt.
- Thân bài 13.5 pt; `Kính gửi` 13.5 pt; hai căn cứ nghiêng 13.5 pt; nội dung và các đề mục căn đều, Times New Roman. Các đề mục I/II/III/4 đậm; mục cấp dưới có dùng đậm hỗn hợp.
- Trang 1–3 chứa mục đích, checklist xây lắp, checklist thoát nước/hạ tầng, chế tài vi phạm và huấn luyện. Trang 3 kết thúc bằng dòng `3. Báo cáo kế hoạch kiểm tra chi tiết`.
- Trang 4: bảng kế hoạch tuần 8 hàng × 4 cột, không có ô gộp (mỗi hàng có 4 ô). Header: `Ngày kiểm tra`, `Công trình kiểm tra`, `Nội dung kiểm tra, huấn luyện`, `Phát sinh thay đổi`. Rộng cột: 104.40 / 126.00 / 121.50 / 108.00 pt (3.68 / 4.45 / 4.29 / 3.81 cm). Header in đậm, căn giữa, nhiều dòng; khung lưới đơn mảnh. Hàng 2–8 lần lượt Thứ 2 đến Chủ nhật, chứa nhãn Sáng/Chiều/Tối; cao tự động theo nội dung (không đặt fixed height).
- Trang 5: hai đoạn kết luận/huấn luyện; bảng chữ ký 1 × 2, không viền nhìn thấy, 308.80 / 144.80 pt (10.89 / 5.11 cm). Trái là `Nơi nhân:`; phải `PHÒNG KỸ THUẬT` và `Người lập`.
- Chân trang không nhất quán: trang 2 `Trang 2`, trang 3 `3`, trang 4 `Trang 4`, trang 5 `5`. Đây là thuộc tính phải giữ nguyên trong phiên bản template hiện tại, không tự chuẩn hóa.

**Nội dung checklist nguyên mẫu cần số hóa**:

- Xây lắp: hồ sơ pháp lý; sổ cấp phát BHLĐ; nhật ký/cam kết/học an toàn; thẻ nhóm 3; khám sức khỏe; bảo hiểm; PPE; biển báo; hệ dây cáp/tủ điện/điện lán trại; giáo ngoài/lưới bụi/lưới vật rơi; vệ sinh công nghiệp; dây đu sơn; máy có yêu cầu nghiêm ngặt, hồ sơ/kiểm định/thợ vận hành; lan can cầu thang/biên; hố kỹ thuật/hố cửa thang máy.
- Thoát nước/hạ tầng: nhóm hồ sơ tương tự; PPE/biển báo; điện; cừ/văng chống thành hố đào; vệ sinh; hố đào/lỗ mở/hố ga; máy móc, kiểm định và thợ vận hành; lan can hố sâu.
- Quy định xử phạt: không dùng BHLĐ; dây điện không treo cao; điện lán trại không an toàn; làm cao/khu ngã cao không đeo dây; không vệ sinh. Huấn luyện: tổ chức riêng khi ít người; phối hợp BCH/chỉ huy trưởng và thời lượng 30 phút khi đông người.

### Mẫu 2 — Báo cáo tự đánh giá kết quả kiểm tra ATLĐ, PCCC, VSMT

**Tên mẫu hiển thị**: `BÁO CÁO TỰ ĐÁNH GIÁ KẾT QUẢ KIỂM TRA ATLĐ, PCCC, VSMT ….. NGÀY … THÁNG .. NĂM 2026`.

**Bố cục và định dạng**:

- Trang 1: bảng layout đầu trang 1 × 2 dùng đúng kích thước của mẫu kế hoạch; tiêu đề căn giữa, đậm 15 pt; phần kính gửi và căn cứ Times New Roman 13 pt (căn cứ nghiêng); đoạn người lập 13 pt; nhãn `Nội dung kiểm tra:` đậm 13 pt.
- Trang 1–2: danh mục 20 mục đánh số, 13 pt, căn đều. Trang 2 bắt đầu mục 15 và đi vào bảng báo cáo.
- Bảng báo cáo gồm 8 hàng × 5 cột, không có ô gộp. Header: `Ngày kiểm tra`, `Công trình/Nội dung kiểm tra`, `Đánh giá công trình`, `Kiến nghị yêu cầu`, `Kết quả thực hiện`. Rộng cột: 99.00 / 95.40 / 108.00 / 81.00 / 66.90 pt (3.49 / 3.37 / 3.81 / 2.86 / 2.36 cm). Có khung lưới đơn mảnh, header đậm/căn giữa; các hàng ngày có chiều cao tự động. Bảng ngắt sau Thứ 6 và tiếp tục Thứ 7/Chủ nhật ở trang 3; header không lặp lại ở trang 3 trong mẫu gốc.
- Trang 3: phần I `Đánh giá kết quả, xử lý tồn tại của tuần trước`, với hai dòng nội dung có chấm dẫn; phần II `Kiến nghị đề xuất ban giám đốc về kết quả tuần`, hai mục chấm dẫn; bảng ký 1 × 2 không viền nhìn thấy, trái `Nơi nhận:`, phải `Người lập báo cáo`.
- Chân trang trang 2/3 là `Trang 2` và `Trang 3`.

**20 mục nguyên mẫu**: phương tiện bảo hộ; bảo hộ làm cao; thang/lối đi; giàn giáo; lưới bao che; hố đào/lỗ mở/hố ga/rào chắn-văng chống; hàn cắt/phát sinh nhiệt; công việc ngày; dụng cụ-máy-thiết bị; lối đi/thoát hiểm; vệ sinh công trình; thiết bị/biển PCCC; biển báo nội quy/cảnh báo; sinh hoạt công nhân; điện thi công; hồ sơ nhân công; huấn luyện; phối hợp nhân sự; chế độ báo cáo; công tác khác.

### Ngắt trang, header/footer, ô gộp và hàng

- Hai mẫu đều không có table cell merge trong ba bảng layout/báo cáo đã đo; mỗi hàng của bảng tuần có đủ số ô theo cột. Cần giữ layout bằng table thay vì dàn bằng khoảng trắng.
- Các hàng lịch/báo cáo để Word tự giãn theo nội dung; không đặt chiều cao chính xác để tránh cắt tiếng Việt hay vỡ bảng.
- Không có logo/ảnh, watermark hoặc bảng biểu phụ trong header/footer; số trang là field/footer nội dung không đồng nhất ở mẫu kế hoạch.
- Khoảng cách đoạn và line-spacing sử dụng định dạng trực tiếp, biến thiên theo khu vực. Golden test phải khóa bằng bản template đã hash và đối chiếu render thay vì áp một quy tắc khoảng cách toàn cục.

## Ma trận đối chiếu mẫu

| Thành phần mẫu | File kế hoạch | File báo cáo | Trường dữ liệu hệ thống | Nguồn dữ liệu | Quy tắc xuất |
|---|---|---|---|---|---|
| Số văn bản | Số kế hoạch | Số báo cáo | `planNumber`, `reportNumber` | Kế hoạch/báo cáo | Điền đúng vị trí `Số:`; không tự tạo chuỗi hiển thị khác mẫu |
| Kỳ tuần | Ngày…tháng…năm | Tuần/từ ngày…đến ngày | `weekStart`, `weekEnd`, `weekExceptionReason` | Kế hoạch nguồn | Mặc định Thứ Hai–Chủ nhật; ngoại lệ kèm giải trình |
| Người lập/đơn vị | Phòng kỹ thuật, người lập | Cán bộ ATLĐ, phòng kỹ thuật | `createdById`, snapshot tên/chức danh/đơn vị | User lúc lập | Snapshot tại thời điểm trình duyệt |
| Căn cứ/mục đích | Có | Có | `legalBases`, `purpose` | Kế hoạch | Giữ nguyên câu mẫu, chỉ thay token được đánh dấu |
| Lịch tuần | 4 cột dự kiến | — | `SafetyInspectionSchedule` | Kế hoạch | Một record/mỗi lịch thực tế; nhiều record trong một buổi được xếp dòng |
| Checklist | Nội dung chi tiết theo loại công trình | 20 mục tổng hợp | Template/section/item/result | Template hiệu lực + phiên kiểm tra | Không mất mục; kết quả lấy actual |
| Bảng tuần | — | 5 cột, ngày/buổi/công trình/kết quả | `SafetyWeeklyReportEntry` | Session, finding, reinspection | Một dòng cho mỗi phiên/công trình thực tế |
| Tồn tại | Phát sinh thay đổi | Đánh giá/kiến nghị/kết quả | `SafetyFinding`, action/evidence/reinspection | Kết quả checklist | Không đếm hoàn thành trước reinspection chấp thuận |
| Tổng hợp tuần trước | — | Mục I | `SafetyWeeklyReportNarrative` | Findings kỳ trước | Lưu bản gợi ý + bản sửa + audit |
| Kiến nghị | Kết luận cuối | Mục II | Narrative/Recommendation | Findings, report | Giữ cấu trúc/mục đánh số mẫu |
| Nơi nhận/chữ ký | Nơi nhân/Phòng kỹ thuật | Nơi nhận/Người lập báo cáo | recipient/signature snapshot | Plan/report snapshot | Giữ nguyên nhãn gốc chờ quyết định chuẩn hóa |
| Template xuất | Bố cục 5 trang | Bố cục 3 trang | `SafetyDocumentTemplate` | Tệp mẫu hash/version | Render Word và PDF, so sánh golden trước PASS |

## Lỗi/chỗ bất thường — không tự sửa

| Tệp | Nội dung gốc | Đề nghị chuẩn hóa | Ảnh hưởng | Trạng thái |
|---|---|---|---|---|
| Kế hoạch | `Căn chứ Quyết định giao nhiện vụ...` | `Căn cứ Quyết định giao nhiệm vụ...` | Lỗi chính tả câu căn cứ | Chờ chủ hệ thống phê duyệt |
| Kế hoạch | `Sổ theo dõi cấp phát bảo hộ lao động động` | Bỏ một từ `động` lặp | Lỗi lặp từ | Chờ chủ hệ thống phê duyệt |
| Kế hoạch | `Sử dung trang thiết bị...` | `Sử dụng...` | Lỗi dấu | Chờ chủ hệ thống phê duyệt |
| Kế hoạch | `Nơi nhân:` / `Như kinh gửi` | `Nơi nhận:` / `Như kính gửi` | Lỗi chính tả khu vực chữ ký | Chờ chủ hệ thống phê duyệt |
| Kế hoạch | Số trang `Trang 2`, `3`, `Trang 4`, `5` | Một quy ước thống nhất | Không nhất quán hiển thị | Chờ chủ hệ thống phê duyệt |
| Báo cáo | `Phương tiện bảo vệ bảo hộ cá nhân` | Cần chủ hệ thống xác nhận giữ nguyên hay `Phương tiện bảo hộ cá nhân` | Cụm từ dư nghĩa | Chờ chủ hệ thống phê duyệt |
| Báo cáo | `Công việc ngày` | Cần xác định ý nghĩa nghiệp vụ | Không đủ ngữ cảnh cho checklist | Chờ chủ hệ thống phê duyệt |

## Audit repository và gap analysis

| Hạng mục | Hiện trạng đã xác minh | Quyết định/gap |
|---|---|---|
| Stack | Next.js 16.2.7, React 19, TypeScript, Prisma 7/PostgreSQL, Tailwind, Zod, Vitest, Playwright, `docx` | Có nền phù hợp; trước code phải đọc đúng hướng dẫn Next 16 trong `node_modules/next/dist/docs/` |
| Project/RBAC | `User`, `Project`, `ProjectMember`, `getProjectAccessScope`, `rbac.ts` | Tái dùng resolver, thêm policy ATLĐ riêng và assert ở mọi route/action |
| Tài liệu | `Document`, upload/download routes và document folder | Tái dùng storage metadata; bổ sung ownership guard cho bằng chứng ATLĐ |
| Duyệt | `ApprovalRequest`, type `SAFETY`, approval policy/permission | Có thể tái dùng envelope duyệt, cần policy trạng thái nghiệp vụ riêng |
| Thông báo | `Notification`, notification routing | Mở rộng target types/deep link ATLĐ |
| Báo cáo | Site reports và supervision weekly | Không tái dùng entity legacy; chỉ tham khảo cách serialize/print nếu không kéo coupling |
| Offline/ghi âm/GPS | Chưa thấy module chuyên biệt | Gap triển khai mới, cần security/privacy/retention review trước code |
| Xuất tài liệu chuẩn | Có thư viện `docx`, chưa có template fidelity module | Gap lớn: cần template engine, Word/PDF golden test và xác thực Word/WPS |

## Kết luận discovery

**NO-GO cho triển khai ngay**: chưa có migration, policy cụ thể, UI, runtime, golden dataset hay xuất tài liệu từ dữ liệu thực. Discovery **PASS**: nguồn mẫu đã được kiểm tra trực quan/cấu trúc; phạm vi additive, tài sản tái sử dụng và các gap đã được xác định.
