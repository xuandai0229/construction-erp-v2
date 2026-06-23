# REPORTS UX + WORKFLOW + DATA LOCK DESIGN AUDIT

**Phân hệ:** `/reports` — Báo cáo hiện trường  
**Ngày audit:** 23/06/2026  
**Phạm vi:** UI/UX, weekly aggregation, creator identity, workflow, data lock, attachment, Documents, Field Progress, print, history, AuditLog, roadmap  
**Chế độ thực hiện:** Read-only đối với code, database và storage; chỉ tạo tài liệu audit này

## A. Executive Summary

### Kết luận

**Có, phân hệ Reports nên được cải tiến.** Nền tảng hiện tại đã có dữ liệu thật/cận thật, báo cáo ngày/tuần, file/ảnh, duyệt/từ chối, lịch sử và print PDF. Tuy nhiên, trải nghiệm tra cứu cho lãnh đạo chưa phù hợp khi số lượng báo cáo ngày tăng; weekly report chưa đủ khả năng truy nguyên; và quan trọng nhất là các quy tắc khóa dữ liệu chưa nhất quán giữa Report, Attachment, Document và Field Progress.

### Mức độ vấn đề

| Mức độ | Vấn đề |
| --- | --- |
| **Critical** | `FieldProgressEntry` đã `APPROVED` vẫn có thể bị cập nhật hoặc soft-delete bởi luồng lưu ngày; action còn hardcode trạng thái mới thành `APPROVED`. |
| **Critical** | Attachment của report `SUBMITTED` vẫn có thể upload qua API; route hiện chỉ chặn `APPROVED` và `LOCKED`, đồng thời chưa chặn `CANCELLED`. |
| **High** | Documents chưa có transition matrix chặt: nhóm quyền cao có thể sửa/xóa cả file `APPROVED`; Manager/Chief Commander có thể đổi trạng thái mà không kiểm tra chuyển trạng thái hợp lệ. |
| **High** | Reports chưa có chức năng sửa, rút lại, xóa mềm, hủy hiệu lực; vì vậy chưa có workflow an toàn cho trường hợp nhập sai. |
| **High** | Weekly report không lưu source linkage tới daily reports; sau khi tạo không thể chứng minh chính xác dòng weekly đến từ báo cáo ngày nào. |
| **High** | Project-level RBAC chưa áp dụng thống nhất cho Reports actions, attachment, history và print. |
| **High** | AuditLog của Reports mới chủ yếu có `SUBMIT`, `APPROVE`, `REJECT`; thiếu `CREATE`, `UPDATE`, attachment add/delete, withdraw, cancel, soft delete. |
| **High** | Read-only audit hiện tại phát hiện 25 attachment record không tìm thấy file theo `storagePath`, trong khi có 31 file trên disk không khớp DB record. Cần điều tra backup/restore và path compatibility trước cleanup. |
| **Medium** | `/reports` tải toàn bộ danh sách rồi filter/phân trang ở client; không phù hợp khi số báo cáo tăng. |
| **Medium** | Date range control chỉ là ô text và chưa được áp dụng vào filter. |
| **Medium** | Không có tabs, quick filter, grouping theo tuần/tháng, dashboard lãnh đạo hoặc danh sách “cần xử lý ngay”. |
| **Medium** | Search không bảo đảm tìm được đầy đủ `reportNo`: UI tìm trên `code` đã rút gọn, không tìm trực tiếp trên full `reportNo` hay ngày báo cáo. |

### Khuyến nghị tổng thể

Khuyến nghị **phương án lai A+B**:

1. Giữ `/reports` làm entry point chung.
2. Bổ sung tabs, quick filters, server-side search/filter/pagination và grouping theo tuần.
3. Với `ADMIN`, `DIRECTOR`, `DEPUTY_DIRECTOR`, `CHIEF_COMMANDER`, mặc định hiển thị dashboard “Cần xử lý” phía trên danh sách.
4. Với người nhập hiện trường, mặc định ưu tiên “Báo cáo của tôi / Hôm nay”.
5. Chưa tách cứng thành bốn route như phương án C ở giai đoạn hiện tại.

Về thứ tự triển khai, cần làm **R3a — server-side lock tối thiểu** trước hoặc cùng release đầu tiên, sau đó mới làm R1 UX. Lý do: UX khó dùng là vấn đề lớn, nhưng dữ liệu đã nộp/đã duyệt vẫn bị thay đổi qua đường ghi khác là rủi ro toàn vẹn dữ liệu.

### Bằng chứng dữ liệu read-only tại thời điểm audit

Script read-only `scripts/reports-final-audit-phase1-to-phase5.ts` được chạy ngày 23/06/2026 và ghi nhận:

- 16 reports: 14 `DAILY`, 2 `WEEKLY`.
- Trạng thái: 1 `DRAFT`, 3 `SUBMITTED`, 1 `REJECTED`, 11 `APPROVED`.
- 25 attachments: 16 ảnh, 9 file.
- 0 AuditLog có `entityType = SiteReport` trong database hiện tại.
- 2 weekly reports đều có lines, nhưng schema không có source linkage.
- 25 attachment record không tìm thấy file theo path; 31 file trên disk không khớp DB record.
- Không có unique index cho `reportNo` và không có unique constraint cho project + tuần.

Các sai lệch storage trên không được sửa hoặc cleanup trong audit này.

## B. Hiện trạng UI báo cáo

### 1. Entry point và ưu tiên hiện tại

`src/app/(dashboard)/reports/page.tsx` gọi `getSiteReports({})`, lấy toàn bộ report người dùng được phép xem, map cả `DAILY` và `WEEKLY`, sau đó truyền vào `ReportsWorkspace`.

Mặc dù hỗ trợ hai loại report, màn hình hiện tại vẫn **nghiêng về báo cáo ngày**:

- Tiêu đề/mô tả nhấn mạnh công việc “hằng ngày”.
- Daily và weekly nằm chung một bảng, sắp theo `reportDate`.
- KPI tính chung tất cả report, không tách daily/weekly.
- Weekly chỉ được phân biệt bằng badge/type và khoảng ngày.
- Nút tạo mới mở chung một dialog, mặc định `DAILY`.

### 2. Tabs/chế độ xem

| Chế độ | Hiện có? | Nhận xét |
| --- | ---: | --- |
| Tất cả | Có, mặc định | Không phải tab; là trạng thái không filter. |
| Báo cáo ngày | Có một phần | Chọn qua select loại report. |
| Báo cáo tuần | Có một phần | Chọn qua select loại report. |
| Chờ duyệt | Có một phần | Chọn `SUBMITTED` qua status select. |
| Bị từ chối | Có một phần | Chọn `REJECTED` qua status select. |
| Có phát sinh | Không | Không có filter theo `issues`, `issueNote` hoặc risk flag. |
| Cần xử lý ngay | Không | Không có queue/action center. |
| Thiếu báo cáo | Không | Chỉ weekly preview có một con số missing days. |

**Kết luận:** chưa có hệ thống tabs/chế độ xem theo nghiệp vụ; hiện chỉ có dropdown filters.

### 3. Filter

| Filter | Hiện có? | Thực tế |
| --- | ---: | --- |
| Công trình | Có | Client-side. Danh sách project chưa được project-RBAC đầy đủ trong Reports action. |
| Tuần | Không | Không có week picker hoặc ISO week filter. |
| Khoảng ngày | UI có nhưng logic không có | `dateRange` chỉ là input text; không tham gia `filteredReports`. |
| Trạng thái | Có | Client-side; UI chỉ liệt kê DRAFT/SUBMITTED/APPROVED/REJECTED. |
| Người tạo | Không | Có search tên, nhưng không có filter chọn creator. |
| Loại report | Có | DAILY/WEEKLY. |
| Có vấn đề/phát sinh | Không | Không filter `issues`. |
| Có ảnh/file | Không | Không filter theo attachment count. |

### 4. Search

Placeholder ghi “Tìm mã báo cáo, công trình, người tạo”, nhưng implementation hiện tìm:

- `r.code`,
- `projectName`,
- `creatorName`,
- legacy `workContent`,
- nội dung các report lines.

Điểm thiếu:

- Không tìm trực tiếp trên full `reportNo`.
- Không tìm theo ngày/ngày trong tuần.
- Không tìm theo status label.
- Search chạy client-side trên toàn bộ data đã tải.
- `code` có thể là phần rút gọn từ UUID/reportNo, nên không bảo đảm người dùng dán full mã sẽ tìm được.

### 5. Pagination

Hiện có pagination 10 dòng/trang và UI số trang tương đối tốt. Tuy nhiên đây là **client-side pagination**:

- Server vẫn query toàn bộ report và include toàn bộ lines/attachments.
- Client filter toàn bộ array rồi mới `slice`.
- Không có total/count từ database.
- Khi dữ liệu tăng, thời gian render, payload RSC và memory phía client đều tăng.
- Thay đổi dữ liệu giữa các lần refresh có thể làm page hiện tại vượt tổng số trang.

Đánh giá: **tốt về hình thức, chưa tốt về kiến trúc mở rộng**.

### 6. Grouping

- Không grouping theo tuần.
- Không grouping theo tháng.
- Không có collapse/expand group.
- Không có timeline/calendar view.
- Daily và weekly được trộn theo `reportDate`; weekly tạo hôm nay có thể nổi lên trên dù thuộc tuần cũ.

### 7. Chế độ cho sếp/chỉ huy trưởng

Chưa có chế độ riêng.

- `ADMIN`/`DIRECTOR` có thể xem toàn bộ reports theo logic MVP.
- Các role khác, bao gồm `CHIEF_COMMANDER`, hiện bị giới hạn chỉ xem report do chính mình tạo trong `getSiteReports`.
- Không có project portfolio view.
- Không có queue chờ duyệt theo độ ưu tiên.
- Không có missing-day coverage, công trình có phát sinh, report bị từ chối hoặc SLA chờ duyệt.
- `DEPUTY_DIRECTOR` không được xem như system admin trong Reports dù RBAC chung của hệ thống xếp đây là high-level role.

### 8. Tổng quan/rủi ro/phát sinh

Chỉ có các KPI:

- tổng report,
- approved,
- pending,
- rejected,
- approval rate.

Chưa có:

- công trình có vấn đề phát sinh,
- mức độ rủi ro,
- ngày thiếu báo cáo,
- pending quá hạn,
- rejected chưa resubmit,
- tuần chưa có weekly report,
- số ảnh/file bằng chứng,
- xu hướng report theo tuần,
- chất lượng/tiến độ nổi bật.

## C. Phương án UX đề xuất

### Phương án A — Giữ bảng hiện tại, tối ưu filter/search

#### Thiết kế

- Tabs: `Tất cả`, `Ngày`, `Tuần`, `Chờ duyệt`, `Từ chối`, `Có phát sinh`.
- Quick filters: `Hôm nay`, `Tuần này`, `Tháng này`, `Quá hạn duyệt`.
- Search server-side theo full `reportNo`, mã/ngày/tên công trình/người tạo/nội dung.
- Filter theo project, creator, status, type, week/date range, attachment presence.
- Group theo tuần, có header dạng “Tuần 25 · 17–23/06 · 12 báo cáo”.
- Sticky filter bar.
- Badge số ảnh, file, history event.
- Server-side pagination, mặc định 20–30 rows/trang.
- Lưu filter trong URL query để copy link và back/forward đúng.

#### Ưu điểm

- Ít phá vỡ thói quen hiện tại.
- Chi phí triển khai thấp nhất.
- Giải quyết trực tiếp pain point “quá nhiều báo cáo ngày”.
- Mobile có thể tiếp tục dùng card view.

#### Hạn chế

- Lãnh đạo vẫn phải đọc danh sách để phát hiện vấn đề.
- Không trả lời ngay “công trình nào cần xử lý”.

### Phương án B — Dashboard cho sếp

#### Thiết kế

Khi role thuộc nhóm lãnh đạo/quản lý, `/reports` hiển thị:

1. **Cần xử lý ngay**
   - report chờ duyệt quá SLA,
   - report bị từ chối chưa gửi lại,
   - công trình có issue,
   - tuần thiếu daily report,
   - tuần chưa có weekly report.
2. **Chờ duyệt**
   - danh sách ngắn, approve/reject từ detail.
3. **Weekly mới nhất**
   - mỗi công trình một card: coverage, approved/pending/rejected, vấn đề chính.
4. **Công trình có phát sinh**
   - sort theo số issue và mức độ/tuổi issue.
5. **Ngày thiếu báo cáo**
   - calendar hoặc compact list.
6. **Biểu đồ reports theo tuần**
   - daily submitted/approved, weekly completed.
7. **Danh sách đầy đủ**
   - đặt bên dưới, dùng toolbar của phương án A.

#### Ưu điểm

- Đúng mental model của sếp: xem ngoại lệ và quyết định, không đọc toàn bộ nhật ký.
- Tăng tốc duyệt và phát hiện công trình “im lặng”.
- Có thể mở rộng thành management cockpit.

#### Hạn chế

- Cần định nghĩa SLA, working days và logic “phát sinh”.
- Nếu làm trước khi dữ liệu/workflow sạch, dashboard có thể cho insight sai.

### Phương án C — Tách rõ nhập liệu và quản trị

#### Cấu trúc đề xuất

- `/reports/daily`: nhập và quản lý báo cáo ngày.
- `/reports/weekly`: weekly builder và danh sách tuần.
- `/reports/approval`: queue duyệt.
- `/reports/archive`: tra cứu lịch sử/hủy hiệu lực.

#### Ưu điểm

- Mỗi route có nhiệm vụ rõ.
- Dễ tối ưu riêng cho mobile nhập liệu và desktop quản trị.
- Dễ gắn permission theo chức năng.

#### Hạn chế

- Tăng số route, navigation và trạng thái filter.
- Có nguy cơ trùng UI/list/detail giữa các route.
- Quá sớm khi workflow lock, project RBAC và weekly lineage chưa ổn định.

### Chấm điểm

Điểm 1–5, điểm cao hơn là tốt hơn; riêng cột rủi ro dùng mô tả.

| Phương án | Dễ làm | Dễ dùng cho sếp | Phù hợp mobile | Rủi ro | Khuyến nghị |
| --- | ---: | ---: | ---: | --- | --- |
| A — Tối ưu list/filter | 5 | 3 | 4 | Thấp | Làm ngay trong R1 |
| B — Dashboard cho sếp | 3 | 5 | 4 | Trung bình | Làm cùng/tiếp sau A, theo role |
| C — Tách route | 2 | 4 | 4 | Trung bình–cao | Để sau khi workflow và RBAC ổn định |

### Phương án tối ưu giai đoạn hiện tại

Chọn **A+B theo hướng progressive disclosure**:

- Giữ một `/reports`.
- Lãnh đạo thấy dashboard trước, danh sách sau.
- Người hiện trường thấy “Báo cáo của tôi/Hôm nay” trước.
- Dùng cùng data/query layer và detail drawer.
- Chưa tách route C để tránh nhân đôi logic khi workflow còn thay đổi.

## D. Báo cáo tuần

### 1. Hiện trạng tạo weekly report

Luồng hiện tại:

1. Người dùng chọn type `WEEKLY`.
2. Chọn project, `weekStartDate`, `weekEndDate`.
3. Bấm “Xem tổng hợp tuần”.
4. `getWeeklyReportPreview` lấy tất cả daily report trong khoảng ngày.
5. Chỉ daily `APPROVED` được cộng khối lượng.
6. Người dùng nhập `summary`, `issues`, `recommendations`.
7. `createWeeklyReportFromApprovedDailyReports` chạy lại preview và tạo weekly lines.

### 2. Trả lời các câu hỏi audit

| Câu hỏi | Hiện trạng |
| --- | --- |
| Có thật sự tổng hợp từ daily approved không? | **Có.** Chỉ `approvedReports` được dùng để aggregate lines và đếm attachment. |
| Có tính daily draft/submitted/rejected không? | Không cộng khối lượng. `SUBMITTED` được đếm pending, `REJECTED` được đếm rejected; `DRAFT` không có counter riêng. |
| Có hiển thị missing days không? | Có số lượng `missingDays`, nhưng không có danh sách ngày cụ thể. Ngày có report ở bất kỳ status nào đều bị xem là “đã có báo cáo”, kể cả DRAFT/REJECTED. |
| Có hiển thị pending/rejected reports không? | Có số đếm; không có danh sách hoặc link mở từng report. |
| Có source trace từ daily reports không? | Preview có `sourceReportIds` trong memory, nhưng không persist vào weekly report/line. Weekly line chỉ có note “tổng hợp từ N báo cáo”. |
| Có ảnh/file kế thừa không? | Chỉ đếm attachment của approved daily. Không kế thừa/copy/reference ảnh/file vào weekly. Người dùng có thể upload attachment riêng sau khi tạo. |
| Có cho sửa đánh giá/kế hoạch tuần sau không? | Form tạo cho nhập summary/issues/recommendations, nhưng sau khi tạo không có edit action/UI. |

### 3. Các vấn đề logic weekly

- Không validate chuẩn tuần, ngày bắt đầu ≤ ngày kết thúc hoặc giới hạn tối đa 7 ngày.
- Không định nghĩa working calendar: Thứ Hai–Thứ Bảy hay Thứ Hai–Chủ Nhật.
- `missingDays` chỉ là số, không có `missingDates`.
- DRAFT làm ngày đó không còn bị tính thiếu dù chưa nộp.
- Không có `draftCount`.
- Không có link từ pending/rejected counter tới report nguồn.
- Không persist source lineage.
- Không có DB unique constraint chống hai weekly cùng project + period khi request đồng thời.
- Weekly `reportDate` dùng thời điểm tạo, không phải ngày kết thúc tuần.
- UI không hiển thị `totalPhotos`/`totalFiles` dù backend trả về.
- Weekly không tổng hợp issues/recommendations/material/labor/quality từ daily thành preview có cấu trúc.
- Không có “data snapshot version”; daily approved bị thay đổi bởi đường ghi khác có thể làm preview sau này khác weekly đã tạo.

### 4. Workflow weekly tối ưu

1. Chọn công trình.
2. Chọn tuần bằng week picker; hệ thống tự xác định start/end theo project working calendar.
3. Server preview:
   - kiểm tra project access,
   - chống tuần tương lai nếu policy không cho phép,
   - kiểm tra weekly đã tồn tại,
   - lấy daily theo status.
4. Hiển thị coverage:
   - tổng working days,
   - ngày có approved report,
   - ngày thiếu report,
   - ngày chỉ có draft,
   - pending,
   - rejected.
5. Hiển thị khối lượng từ **approved daily only**.
6. Hiển thị vấn đề/kiến nghị theo ngày, có link tới daily source.
7. Hiển thị ảnh/file dưới dạng reference gallery, không copy vật lý mặc định.
8. Người dùng chỉ nhập bổ sung:
   - đánh giá tuần,
   - vấn đề chính,
   - kế hoạch tuần tới,
   - đề xuất/chỉ đạo.
9. Tạo weekly `DRAFT`.
10. Cho review preview lần cuối.
11. Submit.
12. Approve/reject theo cùng workflow report.
13. Persist snapshot + source links tại thời điểm tạo/refresh draft.

### 5. Đề xuất UI weekly builder

#### Header cố định

- Project selector.
- Week picker.
- Badge “Đã có weekly/chưa có”.
- Nút “Tải lại dữ liệu nguồn”.

#### Khối 1 — Coverage

Các cards:

- `5/6 ngày có báo cáo đã duyệt`.
- `1 ngày thiếu: Thứ Tư 19/06`.
- `1 chờ duyệt`.
- `1 bị từ chối`.
- `1 draft chưa nộp`.

Counter phải click được để mở danh sách daily tương ứng.

#### Khối 2 — Khối lượng tổng hợp

Table:

| Công việc | Khu vực | ĐVT | Khối lượng tuần | Số ngày | Nguồn |
| --- | --- | --- | ---: | ---: | --- |

Nút “Xem nguồn” mở popover/list daily report IDs, dates và quantity contribution.

#### Khối 3 — Bằng chứng hiện trường

- Gallery ảnh theo ngày.
- File list theo ngày.
- Weekly chỉ reference source attachment.
- Cho upload file weekly riêng và đánh dấu rõ `Nguồn daily` / `Đính kèm weekly`.

#### Khối 4 — Vấn đề và kiến nghị từ daily

- Group theo ngày.
- Badge status report nguồn.
- Cho pin một issue thành “Vấn đề chính của tuần”.
- Không tự sửa nội dung source.

#### Khối 5 — Nội dung người dùng bổ sung

- Đánh giá tuần.
- Vấn đề chính.
- Kế hoạch tuần tới.
- Đề xuất/chỉ đạo.

Nên tách thành field nghiệp vụ rõ ràng thay vì dùng `recommendations` cho cả “kế hoạch tuần sau”.

#### Footer

- `Lưu nháp`.
- `Xem trước PDF`.
- `Gửi duyệt`.
- Cảnh báo nếu còn pending/rejected/missing days; policy quyết định warning hay block.

## E. Người tạo báo cáo

### 1. Hiện trạng

#### Server

`createSiteReport` và `createWeeklyReportFromApprovedDailyReports` đều:

- gọi `getSession()`,
- gán `createdById = session.id`,
- gán `reporterName = session.name`.

Server không lấy `createdById` hoặc `creatorName` từ payload client.

#### Client

`CreateReportFormData` vẫn có `creatorName`; dialog set từ `currentUser.name` và hiển thị read-only. Tuy nhiên:

- payload daily do workspace tạo không gửi `creatorName`,
- input weekly không có creator field,
- server vẫn là nguồn quyết định.

#### Fallback/hardcode

- Page map dùng `r.reporterName || "N/A"`.
- `currentUser.name` cũng fallback `"N/A"`.
- Print dùng `reporterName || createdBy.name || "N/A"`.
- `Admin (Dev)` còn trong seed development, không phải fallback trong report create flow.
- Không thấy hardcode `Admin` làm creator trong Reports source hiện tại.

#### Khả năng sửa creator

- Hiện không có report update action/UI, nên creator không sửa được qua chức năng Reports.
- Schema không tự bảo vệ immutable field; một update action tương lai vẫn có thể vô tình cho phép sửa nếu spread payload hoặc whitelist sai.

### 2. Đánh giá an toàn

**Tạo mới hiện tương đối an toàn về creator identity**, vì server lấy session. Tuy nhiên chưa đạt chuẩn hoàn chỉnh do:

- client type vẫn mang `creatorName`, dễ gây hiểu nhầm đây là dữ liệu submit;
- chưa có shared validator loại bỏ field cấm;
- project access chưa kiểm tra đầy đủ khi tạo;
- create event chưa có AuditLog;
- fallback `N/A` che lỗi dữ liệu thay vì cảnh báo.

### 3. Chuẩn đề xuất

- Server luôn lấy `createdById` từ session.
- Client không gửi `createdById`, `creatorName`, `reporterName`, `approvedById`.
- Report update DTO không chứa các field identity.
- Server dùng whitelist field có thể sửa, không spread toàn bộ client payload.
- Không cho đổi creator sau khi tạo, kể cả Admin.
- Nếu cần chuyển trách nhiệm, dùng event `ASSIGN_RESPONSIBLE_USER`, không sửa lịch sử “người tạo”.

### 4. Snapshot hay join User hiện tại?

Khuyến nghị **lưu cả hai**:

- `createdById`: quan hệ chuẩn tới User để authorization, profile và truy vấn.
- `reporterName`: snapshot tên tại thời điểm tạo để chứng từ/PDF không bị thay đổi khi user đổi tên.

Hiển thị:

- Báo cáo/PDF chính thức: ưu tiên snapshot.
- Tooltip/admin detail: có thể hiển thị “Tài khoản hiện tại: …” nếu khác snapshot.
- Không fallback im lặng sang `N/A` cho dữ liệu mới; nếu session name trống, chặn tạo và yêu cầu hoàn thiện profile.

## F. Sửa/xóa/khóa dữ liệu

### 1. Bảng hiện trạng

`—` nghĩa là entity không có status riêng hoặc không có API nghiệp vụ tương ứng.

| Entity | Draft sửa được? | Submitted sửa được? | Approved sửa được? | Rejected sửa được? | API có chặn không? |
| --- | ---: | ---: | ---: | ---: | --- |
| `SiteReport` | Không có edit API/UI | Không có edit API/UI | Không có edit API/UI | Không có edit API/UI | Chỉ transition submit/approve/reject có check status; chưa có update/delete/withdraw/cancel |
| `SiteReportLine` | Không có edit API/UI | Không có | Không có | Không có | Không có direct mutation API; chỉ nested create |
| `SiteReportAttachment` — upload | Có | **Có qua direct API** | Không | Có | Chỉ chặn `APPROVED`, `LOCKED`; chưa chặn `SUBMITTED`, `CANCELLED` |
| `SiteReportAttachment` — delete | Không có | Không có | Không có | Không có | Không có DELETE route |
| Weekly report | Giống `SiteReport` | Giống `SiteReport` | Giống `SiteReport` | Giống `SiteReport` | Không có edit/delete; attachment vẫn có lỗ hổng như daily |
| `Document` metadata/rename | Có thể | Có thể | Full-access vẫn có thể | Có thể | Permission có, nhưng không có transition/lock matrix đầy đủ |
| `Document` delete | Có thể | Có thể | Full-access vẫn có thể | Có thể | Soft delete; high-level bypass lock approved |
| `DocumentFolder` | — | — | — | — | Chỉ full-access rename/delete; delete nếu rỗng; không gắn workflow document/report |
| `FieldProgressEntry` | Có | Có thể | **Có thể cập nhật/xóa mềm** | — | Chưa chặn theo status; action hardcode kết quả `APPROVED` |

### 2. Chi tiết rủi ro server-side

#### SiteReport

- Không có edit/delete nên người dùng không sửa sai được.
- Đây không phải “lock hoàn chỉnh”; chỉ là thiếu chức năng.
- Transition dùng read-then-update; update không có status predicate atomic, còn race window.
- `createSiteReport(..., isDraft = false)` tạo thẳng `SUBMITTED` nhưng không set `submittedAt` và không ghi `SITE_REPORT_SUBMITTED`.
- Create report không ghi AuditLog.

#### Attachment

- Creator hoặc Admin/Director có thể upload vào `SUBMITTED`.
- Admin/Director cũng có thể upload vào report của người khác.
- `CANCELLED`, `REJECTED`, `REVISION_REQUESTED` đều không bị chặn.
- Add attachment không ghi AuditLog.
- Không có API xóa attachment.

#### Documents

- Upload tạo thẳng `SUBMITTED`.
- Non-high-level chỉ bị chặn edit/delete khi `APPROVED`; `ARCHIVED` và `SUPERSEDED` vẫn có thể sửa/xóa nếu role/folder cho phép.
- High-level roles có thể sửa metadata/xóa cả `APPROVED`.
- `changeDocumentStatus` không kiểm tra current → next transition, reason bắt buộc, owner hoặc atomic status predicate.

#### FieldProgressEntry

- `batchSaveDailyEntries` nhận `submit` nhưng không dùng.
- Trạng thái được hardcode `APPROVED`.
- Existing entry được update không xét status cũ.
- Quantity = 0 soft-delete existing entry, kể cả entry đã approved.
- Bất kỳ user có project access đều có thể thực hiện.
- Audit chỉ ghi afterData cấp batch, không ghi beforeData từng entry.

#### Print/history/direct call

- Print là read-only nhưng chỉ creator/Admin/Director xem được; chưa dùng project membership và chưa loại soft-deleted/cancelled theo policy.
- Draft/rejected vẫn in được; nếu PDF được coi là chứng từ chính thức cần watermark.
- History route có check creator/Admin/Director, nhưng exported server action `getSiteReportAuditLogs` không tự check session/authorization.
- Không có reports REST update API; các server actions vẫn phải được coi như public mutation endpoints và tự guard đầy đủ.

### 3. Workflow lock chuẩn đề xuất

| Trạng thái | Cho sửa | Cho xóa | Cho upload file | Cho submit | Cho approve/reject | Ghi chú |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `DRAFT` | Có, creator; Admin chỉ hỗ trợ có audit | Có, soft delete | Có | Có | Không | Chưa phải chứng từ chính thức |
| `SUBMITTED` | Không | Không | Không | Không | Admin/Director/role duyệt theo project | Snapshot khóa chờ duyệt |
| `APPROVED` | Không | Không | Không | Không | Có thể cancel/unapprove theo quyền đặc biệt | Khóa cứng |
| `REJECTED` | Có, creator | Có, soft delete hoặc resubmit | Có | Có | Không | Giữ rejection history |
| `CANCELLED` | Không | Không | Không | Không | Không | Chỉ xem; bắt buộc lý do và actor |

Quy tắc phải được kiểm tra:

1. ở server action/API,
2. bằng điều kiện update atomic,
3. ở UI để ẩn/disable action,
4. bằng test direct call.

Ví dụ nguyên tắc atomic: update report chỉ khi `id`, `status` hiện tại và quyền owner/project đều đúng; nếu affected row = 0 thì trả conflict.

### 4. Có nên thêm `CANCELLED`/`ARCHIVED`?

- `CANCELLED` **đã tồn tại trong enum** và nên được đưa vào workflow thực tế.
- Dùng `CANCELLED` cho report đã submitted/approved nhưng bị hủy hiệu lực; không xóa lịch sử.
- Chưa cần thêm `ARCHIVED` vào status ở giai đoạn này.
- Archive là nhu cầu tra cứu/retention, không phải trạng thái phê duyệt. Nếu cần, nên dùng `archivedAt`, `archivedById` hoặc view/filter riêng.
- `LOCKED` hiện có nhưng trùng ý nghĩa với lock theo status. Nên tránh dùng như một trạng thái nghiệp vụ độc lập nếu không có use case rõ.

### 5. Thiết kế sửa báo cáo

#### Ai được sửa?

- Creator sửa `DRAFT` và `REJECTED`.
- Admin/Director không sửa nội dung thay creator theo mặc định.
- Admin có thể “mở lại để chỉnh sửa” bằng workflow riêng, bắt buộc lý do và audit.

#### Field được sửa

- Nội dung, ngày báo cáo theo policy, weather, lines, resources, issues, recommendations, attachments.
- Không sửa `createdById`, `reporterName`, `approvedById`, timestamps workflow, reportNo.
- Không đổi project sau khi đã có lines/attachments; nếu cần phải cancel và tạo report mới.
- Không đổi DAILY ↔ WEEKLY.

#### Audit

- Mọi update ghi before/after theo field thay đổi.
- Không log nguyên binary hoặc dữ liệu nhạy cảm.
- Nên có `revisionNo` hoặc event count để hiển thị “Bản sửa lần 2”.

#### Rút lại

- Creator được `WITHDRAW` từ `SUBMITTED` về `DRAFT` nếu chưa có quyết định duyệt.
- Bắt buộc lý do.
- Transition phải atomic để tránh đua với approve.
- Ghi event `WITHDRAW`, giữ `submittedAt` lịch sử trong AuditLog; có thể set current `submittedAt = null`.
- Không rút lại `APPROVED`; dùng `CANCEL`.

### 6. Thiết kế xóa báo cáo

- `DRAFT`: creator soft-delete; Admin có thể soft-delete với lý do.
- `SUBMITTED`: không delete; chỉ withdraw nếu policy cho phép.
- `APPROVED`: không delete; chỉ cancel/invalidate bởi Admin/Director, bắt buộc lý do.
- `REJECTED`: creator có thể sửa/resubmit hoặc soft-delete.
- `CANCELLED`: không delete qua UI; retention job xử lý theo policy lâu dài.
- Mọi list/query mặc định lọc `deletedAt = null`; audit/admin archive có thể xem record đã soft-delete.

### 7. Thiết kế xóa file/ảnh

- `DRAFT`/`REJECTED`: creator được xóa attachment.
- `SUBMITTED`/`APPROVED`/`CANCELLED`: khóa add/delete.
- Delete nên là hai bước:
  1. soft-delete DB record hoặc ghi trạng thái pending deletion,
  2. cleanup vật lý bất đồng bộ sau retention window.
- Không xóa file vật lý trước khi transaction DB thành công.
- Nếu physical delete fail, giữ retry record.
- Cleanup job phải đối chiếu DB/storage, có dry-run, quarantine và audit.
- Trước khi viết cleanup job, phải xử lý sai lệch 25 DB-missing/31 disk-unmatched được phát hiện trong audit hiện tại.

## G. AuditLog

### 1. Hiện trạng

Reports hiện ghi:

- `SITE_REPORT_SUBMITTED`,
- `SITE_REPORT_APPROVED`,
- `SITE_REPORT_REJECTED`.

Thiếu hoặc chưa nhất quán:

- create daily draft/submitted,
- create weekly draft,
- update,
- withdraw,
- cancel,
- soft delete,
- attachment add/delete,
- refresh weekly sources,
- before/after snapshot cho lines/attachments.

Database hiện tại tại thời điểm audit có **0 SiteReport AuditLog**, dù có 16 reports. Điều này cho thấy dữ liệu seed/restore hoặc các luồng tạo hiện tại không bảo đảm audit continuity.

### 2. Event chuẩn cần có

| Event | Khi nào | Dữ liệu tối thiểu |
| --- | --- | --- |
| `CREATE` | Tạo draft/report | actor, project, type, reportNo, snapshot |
| `UPDATE` | Sửa draft/rejected | changed fields, before/after, revision |
| `SUBMIT` | Gửi duyệt | from/to status, revision |
| `WITHDRAW` | Rút lại | reason, from/to status |
| `APPROVE` | Duyệt | approver, note, source revision |
| `REJECT` | Từ chối | reason, source revision |
| `CANCEL` | Hủy hiệu lực | reason, previous status |
| `DELETE_SOFT` | Xóa draft/rejected | reason, deletedAt |
| `ATTACHMENT_ADD` | Upload thành công | attachment id, kind, originalName, size, checksum nếu có |
| `ATTACHMENT_DELETE` | Xóa/đánh dấu xóa | attachment id, reason, cleanup state |
| `WEEKLY_SOURCE_REFRESH` | Refresh nguồn weekly draft | old/new source report IDs, changed aggregate |
| `PRINT/EXPORT` | Tùy yêu cầu compliance | report id, revision, status, output type |

### 3. Yêu cầu kỹ thuật

- Audit ghi cùng transaction với mutation nghiệp vụ khi có thể.
- Event name thống nhất; tránh trộn `SITE_REPORT_*` và generic event không có convention.
- Có request/correlation ID nếu hệ thống mở rộng.
- Có `ipAddress`/`userAgent` cho hành động nhạy cảm.
- AuditLog là append-only; không update/delete qua UI.
- History API phải tự kiểm tra session, project access và report visibility.

## H. Roadmap triển khai

### Thứ tự release khuyến nghị

1. **R3a — Critical server-side lock hotfix/design implementation**
2. **R1 — Reports UX Search & Grouping**
3. **R2 — Weekly Report Builder**
4. **R4 — Role/Permission Hardening**
5. **R3b — Edit/Delete/Withdraw/Cancel UI hoàn chỉnh**
6. **R5 — Cleanup & Data Safety**

Tên phase dưới đây giữ theo yêu cầu, nhưng R3 nên có phần guard tối thiểu được kéo lên trước R1.

### Phase R1 — Reports UX Search & Grouping

**Mục tiêu**

- Tabs/quick filters.
- Server-side search/filter/pagination.
- Group theo tuần/tháng.
- Dashboard lãnh đạo phiên bản đầu.
- URL query state.

**File dự kiến ảnh hưởng**

- `src/app/(dashboard)/reports/page.tsx`
- `src/app/(dashboard)/reports/actions.ts`
- `src/components/reports/reports-workspace.tsx`
- `reports-toolbar.tsx`
- `reports-table.tsx`
- `reports-mobile-cards.tsx`
- `reports-stats.tsx`
- component dashboard/group mới

**Rủi ro**

- Query chậm nếu search không có index phù hợp.
- Sai timezone/ngày tuần.
- Dashboard count và list không cùng filter.

**Test bắt buộc**

- Search full reportNo/project/creator/date.
- Quick filter theo timezone Asia/Bangkok.
- Filter kết hợp.
- Server pagination boundary.
- Role-specific default view.
- Mobile cards và keyboard accessibility.

**Migration**

- Không bắt buộc cho MVP.
- Có thể cần index sau khi đo query thực tế.

### Phase R2 — Weekly Report Builder

**Mục tiêu**

- Preview từ approved daily.
- Missing dates cụ thể.
- Draft/pending/rejected count và drill-down.
- Source trace.
- Attachment references.
- Form weekly dễ nhập.

**File dự kiến ảnh hưởng**

- `src/app/(dashboard)/reports/actions.ts`
- `src/components/reports/create-report-dialog.tsx` hoặc weekly builder component mới
- `report-detail-drawer.tsx`
- print route
- Prisma schema cho source linkage/snapshot/unique period

**Rủi ro**

- Aggregation double-count.
- Daily source thay đổi sau khi weekly draft tạo.
- Working calendar khác nhau theo project.
- Unique week race.

**Test bắt buộc**

- Chỉ approved daily được cộng.
- Draft/submitted/rejected chỉ hiển thị counter, không cộng.
- Missing dates chính xác.
- Source contribution chính xác từng line.
- Duplicate weekly concurrent requests.
- Refresh source chỉ cho weekly draft.
- PDF hiển thị snapshot đúng.

**Migration**

- **Có khả năng cao cần migration** cho:
  - source relation weekly ↔ daily,
  - source contribution hoặc snapshot JSON,
  - unique constraint project + week,
  - field weekly riêng như next-week plan/main issue nếu không tái sử dụng field cũ.

### Phase R3 — Workflow Lock & Edit/Delete Rules

**Mục tiêu**

- Central policy/transition matrix.
- Server-side lock trước UI lock.
- Edit draft/rejected.
- Withdraw submitted.
- Cancel approved/submitted theo policy.
- Soft delete.
- Attachment delete/cleanup state.
- Audit đầy đủ.

**File dự kiến ảnh hưởng**

- Reports actions
- Attachment routes
- Report detail/create/edit components
- Documents actions/permissions
- Field Progress daily actions
- shared workflow/policy modules
- Audit helper
- Prisma schema nếu bổ sung revision/cancel/attachment soft delete

**Rủi ro**

- Race approve vs withdraw.
- Existing data không đủ audit/revision.
- Lock quá chặt làm gián đoạn vận hành.
- Cleanup file sai record.

**Test bắt buộc**

- Ma trận trạng thái × role × action.
- Direct action/API bypass tests.
- Concurrent transition tests.
- Before/after audit.
- Soft-delete visibility.
- Submitted/approved attachment add/delete bị chặn.
- Approved field progress không thể update/delete.

**Migration**

- SiteReport đã có `deletedAt` và `CANCELLED`.
- Có thể cần migration cho `revisionNo`, cancel metadata, attachment `deletedAt`, source snapshot hoặc cleanup state.

### Phase R4 — Role/Permission Hardening

**Mục tiêu**

- Creator/Admin/Director/Deputy Director/Chief Commander/Engineer rules.
- Project-level RBAC.
- Approval permission theo project.
- Guard thống nhất cho list/detail/history/print/attachment/actions.

**File dự kiến ảnh hưởng**

- `src/lib/rbac.ts`
- Reports actions/routes/pages
- Documents permissions/actions
- Field Progress actions
- UI action visibility

**Rủi ro**

- Role global xung đột project role.
- User thấy menu nhưng API từ chối hoặc ngược lại.
- Chief Commander hiện chỉ thấy report của mình; thay đổi có thể mở rộng dữ liệu quá mức nếu query sai.

**Test bắt buộc**

- Permission matrix cho từng role.
- User không thuộc project.
- User đổi project ID qua direct call.
- History/print/download/upload cross-project.
- Deputy Director consistency.

**Migration**

- Có thể không cần nếu `ProjectMember` hiện tại đủ.
- Cần migration nếu bổ sung permission/approver assignment chi tiết.

### Phase R5 — Cleanup & Data Safety

**Mục tiêu**

- Reconcile DB/storage.
- Orphan cleanup có dry-run/quarantine.
- Backup compatibility.
- Restore test sau soft delete/cancel.
- Retention policy.

**File dự kiến ảnh hưởng**

- storage provider
- backup/restore scripts
- cleanup/reconcile scripts hoặc scheduled job
- operational docs
- attachment APIs

**Rủi ro**

- Xóa nhầm file còn được tham chiếu.
- Path thay đổi sau restore.
- Backup DB và storage không cùng thời điểm.

**Test bắt buộc**

- Dry-run không mutate.
- DB missing file.
- Disk orphan.
- Duplicate file/hash.
- Restore DB + storage đồng bộ.
- Cleanup retry/idempotency.
- Không cleanup attachment thuộc record soft-deleted trước retention deadline.

**Migration**

- Không bắt buộc cho reconcile cơ bản.
- Có thể cần nếu lưu cleanup status, checksum, deletedAt hoặc retention timestamps.

## I. Test plan sau này

### 1. UI

- Tabs, quick filters, grouping, sticky toolbar.
- Role-specific landing.
- Search full reportNo/date/project/creator.
- Empty/loading/error states.
- Mobile create daily, weekly preview, attachment.
- Accessibility: focus, keyboard, labels, drawer/dialog.

### 2. API/server actions direct

- Gọi action bằng projectId không có quyền.
- Gửi creator fields giả và xác nhận server bỏ qua.
- Update field cấm.
- Upload/delete attachment ở mọi status.
- Withdraw/approve đồng thời.
- Transition không hợp lệ.
- History/print/download bằng report ID của project khác.

### 3. Workflow

- DRAFT → SUBMITTED → APPROVED.
- DRAFT → SUBMITTED → REJECTED → UPDATE → RESUBMIT.
- SUBMITTED → WITHDRAW → UPDATE → RESUBMIT.
- APPROVED → CANCEL bởi người có quyền.
- Không sửa/xóa/upload sau SUBMITTED/APPROVED/CANCELLED.

### 4. Weekly

- Approved-only aggregation.
- Missing dates theo working calendar.
- Pending/rejected/draft counters.
- Source trace.
- Refresh source draft.
- Source frozen sau submit.
- Duplicate/concurrent create.
- Weekly edit chỉ ở draft/rejected.

### 5. Data integrity

- Report/lines/attachments cùng transaction hoặc rollback hợp lý.
- Không orphan DB/file.
- Audit event có actor, project, before/after.
- Creator snapshot không đổi khi User đổi tên.
- Soft-deleted report không xuất hiện trong list nhưng còn trong audit/admin archive.

### 6. Backup/restore

- Backup DB và storage cùng release/snapshot.
- Restore report, lines, attachments, audit, source linkage.
- File path sau restore vẫn resolve.
- Cancel/soft-delete state được bảo toàn.
- Cleanup job không xóa file vừa restore.

## J. Kết luận

### Có nên implement ngay không?

**Có, nhưng không bắt đầu bằng một cuộc redesign lớn.**

Ưu tiên:

1. Khóa server-side các đường ghi nguy hiểm:
   - attachment `SUBMITTED/CANCELLED`,
   - approved Field Progress,
   - Document transition/edit/delete.
2. Làm R1 để giảm tải danh sách cho người dùng.
3. Làm R2 weekly builder có source trace.
4. Sau đó mới mở đầy đủ edit/delete/withdraw/cancel UI và cân nhắc route split.

### Phase nên làm trước

- **Trước tiên: R3a — Critical server-side lock.**
- **Ngay sau đó: R1 — Search, tabs, grouping và boss dashboard bản đầu.**

### Những phần tuyệt đối chưa làm nếu chưa duyệt

- Không thêm/sửa enum, field hoặc migration.
- Không thay đổi status dữ liệu hiện tại.
- Không xóa/cleanup attachment.
- Không sửa/normalize storage path.
- Không thay đổi permission production.
- Không sửa UI hoặc route structure.
- Không reset/seed lại database.

## K. Xác nhận

- Không sửa code ứng dụng.
- Không sửa UI.
- Không sửa database/schema.
- Không tạo migration.
- Không xóa hoặc cập nhật dữ liệu.
- Không chạy script verify có create/update/delete.
- Chỉ chạy script audit read-only hiện có.
- Không commit.
- Không push.
- Không reset database.
- File duy nhất được tạo bởi nhiệm vụ này là:
  - `docs/qa/REPORTS_UX_WORKFLOW_AND_LOCKING_DESIGN_AUDIT.md`
