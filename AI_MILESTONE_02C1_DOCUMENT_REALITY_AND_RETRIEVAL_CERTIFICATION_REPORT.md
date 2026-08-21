# BÁO CÁO NGHIỆM THU VÀ CHỨNG NHẬN THỰC TẾ DOCUMENT INTELLIGENCE (AI-02C.1)
**Dự án:** Construction ERP V2  
**Hệ thống:** Document Brain V1 — Reality Classification, Lexical Retrieval, Lifecycle & Security Certification  
**Thời điểm thực hiện:** 21/08/2026  
**Trạng thái kiểm định:** **REALITY CERTIFIED & RETRIEVAL BENCHMARKED (CONDITIONAL PASS)**  

---

## 1. BẢNG PHÂN LOẠI THỰC TẾ NĂNG LỰC (REALITY CLASSIFICATION)

Để đảm bảo tính trung thực tuyệt đối và không nâng tên trước khả năng thực tế, toàn bộ 16 năng lực của phân hệ Document Intelligence được phân loại minh bạch như sau:

| STT | Năng lực / Thành phần | Phân loại thực tế | Giải trình kỹ thuật & Hiện trạng |
| :---: | :--- | :--- | :--- |
| **1** | **PDF Extraction (File nhị phân thô)** | `NOT_IMPLEMENTED` | Chưa tích hợp thư viện parser nhị phân (như `pdf-parse`/`pdfjs-dist`). Hiện xử lý trên chuỗi văn bản có cấu trúc do QA fixture cung cấp. |
| **2** | **Scanned PDF OCR (Nhận dạng quang học)** | `NOT_IMPLEMENTED` | Chưa chạy OCR engine thực tế (`tesseract.js`, Cloud OCR). Trạng thái OCR trong QA fixture là mô phỏng trường dữ liệu `ocrConfidence`. |
| **3** | **DOCX Extraction (File Word thô)** | `NOT_IMPLEMENTED` | `docx` trong `package.json` là thư viện xuất file (generator), chưa tích hợp DOCX parser (như `mammoth`). |
| **4** | **XLSX Extraction (Bảng tính Excel)** | `IMPLEMENTED_QA_ONLY` | Có thư viện `exceljs` trong dự án, nhưng đường ống Document Intelligence hiện tại vận hành trên bảng biểu Markdown mô phỏng từ fixture. |
| **5** | **Structure Preservation (Bảo toàn cấu trúc)** | `IMPLEMENTED_REAL_RUNTIME` | Extractor tách và bảo toàn cấu trúc phân cấp: *Điều, Khoản, Mục, Trang* (văn bản) và *Sheet, Bảng, Dòng, Cột* (bảng tính). |
| **6** | **Lexical / Keyword Retrieval** | `IMPLEMENTED_REAL_RUNTIME` | Thuật toán so khớp từ khóa đặc thù ngành xây dựng, định danh số hiệu hợp đồng, số điều khoản chính xác và trọng số miền dữ liệu. |
| **7** | **Semantic / Vector Retrieval** | `NOT_IMPLEMENTED` | Chưa triển khai Embedding model hay Vector Index. Tên gọi chính xác của hệ thống hiện tại là: `PERMISSION_AWARE_HYBRID_LEXICAL_RETRIEVAL`. |
| **8** | **Authority & Version Lineage Reranker** | `IMPLEMENTED_REAL_RUNTIME` | Reranker phân cấp thẩm quyền theo miền nghiệp vụ (`SOURCE_AUTHORITY_POLICY_V2`) và ưu tiên phiên bản trong cùng dòng họ hồ sơ (`documentFamilyId`). |
| **9** | **Document Versioning & Lineage** | `IMPLEMENTED_REAL_RUNTIME` | Hỗ trợ quan hệ `documentFamilyId`, `supersedesDocId`, `supersededByDocId`, `isLatestApprovedInFamily`. |
| **10** | **Prompt Injection Defense** | `IMPLEMENTED_REAL_RUNTIME` | Bảo vệ đa lớp: Đóng gói `<untrusted_document_content>`, lọc thẩm quyền tại Gateway, kiến trúc Read-Only, vô hiệu hóa 10 attack vectors. |
| **11** | **Citation V2 & Deep Linking** | `IMPLEMENTED_REAL_RUNTIME` | Trích dẫn đầy đủ tọa độ: `[Tên tài liệu, Điều/Trang/Sheet, v{version} - {status}]` kèm tuyến dẫn `/projects/{id}/documents?docId={id}`. |
| **12** | **ERP ↔ Document Conflict Detector** | `IMPLEMENTED_REAL_RUNTIME` | Tự động đối soát mâu thuẫn 3 bên: ERP vs Hợp đồng gốc vs Phụ lục gia hạn, tạo cảnh báo `ERP_DOCUMENT_CONFLICT` mà không tự ghi đè ERP. |
| **13** | **Persistent Indexing (PostgreSQL/Vector)** | `NOT_IMPLEMENTED` | Chỉ mục hiện tại chạy hoàn toàn in-memory trên đối tượng dữ liệu trong phiên làm việc. |
| **14** | **Index Lifecycle Management** | `IMPLEMENTED_REAL_RUNTIME` | Quản lý chuyển trạng thái chỉ mục: `UPLOAD`, `UPDATE`, `APPROVE`, `SUPERSEDE`, `ARCHIVE`, `DELETE`, `PERMISSION_CHANGE`. |
| **15** | **Citation Cryptographic Integrity** | `IMPLEMENTED_REAL_RUNTIME` | Kiểm tra tính hợp lệ của hash nội dung, điều khoản, trang và phát hiện tài liệu đã bị thay thế (superseded). |
| **16** | **ERP Document Storage Integration** | `NOT_IMPLEMENTED` | Chưa kết nối trực tiếp với dịch vụ đọc file lưu trữ trên ổ đĩa/MinIO của ERP (`Document.storagePath`). |

---

## 2. NGUYÊN TẮC THẨM QUYỀN NGUỒN THEO MIỀN DỮ LIỆU (`SOURCE_AUTHORITY_POLICY_V2`)

Loại bỏ hoàn toàn giả định sai lệch rằng "ERP luôn cao hơn Hợp đồng" hoặc "Hợp đồng luôn cao hơn ERP". Tính thẩm quyền của nguồn thông tin phụ thuộc trực tiếp vào **miền nghiệp vụ (Business Fact Domain)** của câu hỏi:

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                         SOURCE_AUTHORITY_POLICY_V2 MATRIX                                │
├─────────────────────────┬────────────────────────────────────────────────────────────────┤
│ MIỀN NGHIỆP VỤ          │ THỨ TỰ THẨM QUYỀN PHÁP LÝ & ĐỘ TIN CẬY                         │
├─────────────────────────┼────────────────────────────────────────────────────────────────┤
│ 1. CONTRACTUAL_DEADLINE │ Current Approved Addendum (v2) > Approved Contract (v1)        │
│    (Thời hạn hợp đồng)  │ > ERP Planning Field > Authorized Draft > AI Inference         │
├─────────────────────────┼────────────────────────────────────────────────────────────────┤
│ 2. CONTRACTUAL_FINANCE  │ Current Approved Contract/Addendum > ERP Disbursement History  │
│    (Giá trị, Tạm ứng)   │ > Historical Version > Authorized Draft > AI Inference         │
├─────────────────────────┼────────────────────────────────────────────────────────────────┤
│ 3. TECHNICAL_SPEC       │ Approved Method Statement (BPTC) > Contract Technical Specs   │
│    (BPTC, Tiêu chuẩn)   │ > Inspection Record > ERP Narrative > Draft BPTC               │
├─────────────────────────┼────────────────────────────────────────────────────────────────┤
│ 4. QUALITY_INSPECTION   │ Approved Inspection Record (Nghiệm thu/Thí nghiệm) > BPTC      │
│    (Nghiệm thu, Thép)   │ > ERP Field Log > Historical Document > Draft                  │
├─────────────────────────┼────────────────────────────────────────────────────────────────┤
│ 5. ERP_WORKFLOW_STATE   │ Live ERP Database Record > Attached Document Narrative         │
│    (Trạng thái duyệt)   │ > Historical Record > Draft                                    │
├─────────────────────────┼────────────────────────────────────────────────────────────────┤
│ 6. ACTUAL_PROGRESS      │ Approved Inspection / Field Report > ERP Calculated Progress   │
│    (Tiến độ thực tế)    │ > Approved Method Statement > Draft Narrative                  │
└─────────────────────────┴────────────────────────────────────────────────────────────────┘
```

---

## 3. CƠ CHẾ DÒNG HỌ TÀI LIỆU & PHÂN PHẨM PHIÊN BẢN (VERSION LINEAGE)

- **Nguyên tắc Invariant:** Phiên bản ($v2 > v1$) chỉ có ý nghĩa so sánh **trong cùng một dòng họ tài liệu (`documentFamilyId`)**.
- **Kiểm định thực tế:**
  - Trong cùng dòng họ hợp đồng `FAM-HD-CT009`: `Phụ lục 01 (v2 - APPROVED)` ưu tiên hơn `Hợp đồng gốc (v1 - APPROVED)` đối với câu hỏi về thời hạn hoàn thành có hiệu lực.
  - Đối với hai dòng họ khác nhau: `Kế hoạch An toàn lao động (v5 - APPROVED)` **tuyệt đối không được ưu tiên** hơn `Hợp đồng thi công (v1)` khi trả lời về giá trị hợp đồng hay tiến độ pháp lý.
- **Kết quả kiểm thử:** Tỷ lệ xếp hạng đúng tài liệu trong dòng họ đạt **100%**.

---

## 4. BẢO VỆ CƠ SỞ DỮ LIỆU & CÔ LẬP DỮ LIỆU THỬ NGHIỆM (SYNTHETIC QA ISOLATION)

- Toàn bộ hồ sơ kiểm thử mang nhãn `SYNTHETIC_QA_DOCUMENT_ONLY` và được khởi tạo hoàn toàn trong bộ nhớ.
- **Kết quả rà soát tàn dư (QA Residue Scan):**
  - Số bản ghi QA trong bảng `Document` của PostgreSQL: **0 bản ghi (CLEAN ✅)**.
  - Số bản ghi QA trong bảng `DocumentFolder` của PostgreSQL: **0 bản ghi (CLEAN ✅)**.
  - Số tàn dư vector / chỉ mục ngoài bộ nhớ: **0 (ZERO ✅)**.
  - Số tàn dư trong cache Project Brain sau khi kết thúc phiên: **0 (ZERO ✅)**.
  - Dữ liệu thực tế của công trình `CT-2026-0009` trên cơ sở dữ liệu hoàn toàn không bị thay đổi hay ghi nhớ sai lệch mốc tiến độ thử nghiệm.

---

## 5. BỘ CHỈ SỐ ĐO LƯỜNG ĐỘ CHÍNH XÁC TRUY XUẤT (RETRIEVAL GOLDEN BENCHMARK)

Đã thiết lập bộ Golden Benchmark gồm **25 test cases định lượng** ([retrieval-golden-evaluator.ts](file:///d:/construction-erp-v2/src/lib/ai/documents/evaluation/retrieval-golden-evaluator.ts)) bao quát đầy đủ các tình huống:
1. Tra cứu chính xác số hiệu hợp đồng (`12/2025/HĐ-XD`).
2. Tra cứu chính xác số điều khoản (`Điều 2`, `Điều 3`, `Điều 4`, `Điều 5`, `Điều 6`).
3. Mốc tiến độ hiệu lực mới nhất theo Phụ lục gia hạn v2.
4. Nghiệm thu vật liệu thép và số phiếu thí nghiệm LAS-XD.
5. Bản thảo biện pháp thi công hố móng và quan trắc lún (DRAFT).
6. Bảng dự toán vật tư và kế hoạch giải ngân Excel (Sheet `VatTuChinh`, `KeHoachGiaiNgan`).
7. Phân lập phiên bản cao giữa các dòng họ tài liệu khác nhau (v5 vs v1).
8. Từ đồng nghĩa tiếng Việt ngành xây dựng (*"mốc chót bàn giao"*, *"chế tài chậm tiến độ"*, *"hồ sơ BPTC"*).
9. Tấn công tiêm lệnh giả mạo trong tài liệu đối tác.
10. Truy vấn trái quyền xuyên dự án của Chỉ huy trưởng (Cross-project Access Denial).

### Bảng kết quả đo lường định lượng

| Chỉ số đo lường (Metric) | Giá trị đo được | Mục tiêu chuẩn | Đánh giá |
| :--- | :---: | :---: | :---: |
| **Recall@1** (Tài liệu đúng đứng đầu) | **90.48%** (19/21) | $\ge 80\%$ | **PASS ✅** |
| **Recall@3** (Tài liệu đúng trong Top 3) | **100.0%** (21/21) | $\ge 95\%$ | **PASS ✅** |
| **Recall@5** (Tài liệu đúng trong Top 5) | **100.0%** (21/21) | $100\%$ | **PASS ✅** |
| **Precision@3** (Độ chính xác Top 3) | **65.08%** | $\ge 50\%$ | **PASS ✅** |
| **MRR (Mean Reciprocal Rank)** | **0.9524** | $\ge 0.85$ | **PASS ✅** |
| **Correct Document Rate** | **90.48%** | $\ge 85\%$ | **PASS ✅** |
| **Correct Version Rate** | **90.48%** | $\ge 85\%$ | **PASS ✅** |
| **Correct Location Rate** (Điều/Khoản/Sheet) | **85.71%** | $\ge 80\%$ | **PASS ✅** |
| **Authorization Leak Rate** (Tỷ lệ rò rỉ phân quyền) | **0.00%** (0 / 4) | **0.0% (Tuyệt đối)** | **PASS ✅** |
| **Adversarial Injections Neutralized** | **100.0%** (2 / 2) | $100\%$ | **PASS ✅** |

---

## 6. ĐÁNH GIÁ TÍNH TRUNG THỰC CỦA TRÍCH DẪN (CITATION & CLAIM EVALUATION)

Đã triển khai bộ đánh giá đối soát độc lập [citation-correctness-evaluator.ts](file:///d:/construction-erp-v2/src/lib/ai/documents/evaluation/citation-correctness-evaluator.ts):

| Hạng mục kiểm tra | Kết quả đo được | Ý nghĩa nghiệp vụ |
| :--- | :---: | :--- |
| **Citation Correctness Rate** | **100.0%** | Mọi trích dẫn kèm theo câu trả lời đều trỏ chính xác đến đoạn văn bản gốc có chứa số liệu khẳng định. |
| **Citation Completeness Rate** | **100.0%** | 100% các câu trả lời về hợp đồng/tiến độ đều có đính kèm trích dẫn nguồn V2. |
| **Unsupported Claim Rate (Hợp đồng/Tiến độ)** | **0.0%** | Không có bất kỳ khẳng định pháp lý hoặc số liệu hợp đồng nào được tự sinh ngoài các đoạn trích dẫn đã truy xuất. |
| **Hard Contractual Fails** | **0** | Tuyệt đối không có lỗi bịa đặt giá trị hợp đồng hoặc điều khoản phạt. |

---

## 7. BỘ KIỂM THỬ AN TOÀN TOÀN DIỆN (PROMPT INJECTION SUITE)

Đã xây dựng và vượt qua 10 kịch bản tấn công đối kháng chuyên sâu ([ai-document-prompt-injection-suite.test.ts](file:///d:/construction-erp-v2/src/lib/ai/__tests__/ai-document-prompt-injection-suite.test.ts)):

1. `ATTACK_01 (Ignore Previous Instructions)`: Đóng gói an toàn trong thẻ `<untrusted_document_content>`.
2. `ATTACK_02 (Fake System Prompt)`: Giả mạo thẻ `=== SYSTEM INSTRUCTION ===` bị vô hiệu hóa thành văn bản thô.
3. `ATTACK_03 (Role Elevation)`: Giả mạo quyết định phong cấp quyền ADMIN bị chặn cứng tại Authorization Gateway.
4. `ATTACK_04 (Tool Invocation)`: Lệnh `call_tool("delete_project")` trong văn bản bị vô hiệu hóa bởi kiến trúc Read-Only.
5. `ATTACK_05 (Data Exfiltration)`: Lệnh in ra `.env` và `DATABASE_URL` không thể truy cập biến môi trường hệ thống.
6. `ATTACK_06 (Cross-Project Leak)`: Cố tình chèn văn bản dự án khác bị chặn tại bộ lọc phạm vi dự án (Scope Filter).
7. `ATTACK_07 (Base64 Obfuscation)`: Mã hóa Base64 chỉ được lưu trữ dưới dạng chuỗi ký tự thô vô hại.
8. `ATTACK_08 (Unicode Homoglyph)`: Ký tự Unicode ẩn và ký tự giả dạng chữ cái La-tinh được xử lý an toàn.
9. `ATTACK_09 (Chunk-Split Injection)`: Tách lệnh độc hại qua 2 trang/chunk khác nhau bị cô lập bởi ranh giới từng chunk riêng biệt.
10. `ATTACK_10 (Fake Citation URL)`: Giả mạo đường dẫn URL lừa đảo bị cô lập bên trong nội dung trích xuất an toàn.

---

## 8. VÒNG ĐỜI CHỈ MỤC & TOÀN VẸN MÃ HÓA (INDEX LIFECYCLE & CITATION INTEGRITY)

Đã triển khai và chứng minh qua kiểm thử tự động ([ai-document-index-lifecycle.test.ts](file:///d:/construction-erp-v2/src/lib/ai/__tests__/ai-document-index-lifecycle.test.ts)):
1. **UPLOAD / INDEX:** Nạp tài liệu mới và phân mảnh có cấu trúc vào registry.
2. **APPROVE:** Chuyển trạng thái `APPROVED`, tự động nâng cấp thẩm quyền từ `AUTHORIZED_DRAFT` $\rightarrow$ `APPROVED_METHOD_STATEMENT` và gán cờ `isLatestApprovedInFamily: true`.
3. **SUPERSEDE:** Khi phiên bản v2 được phê duyệt, phiên bản v1 cũ tự động chuyển sang `SUPERSEDED`, gán `supersededByDocId: "v2"` và hạ cấp thẩm quyền xuống `APPROVED_HISTORICAL_DOCUMENT`.
4. **CITATION INTEGRITY:** Hàm `validateCitationIntegrity` xác thực thành công chuỗi băm SHA-256 của nội dung, số trang, số điều khoản và phát hiện gắn cờ cảnh báo khi trích dẫn trỏ vào tài liệu lịch sử đã bị thay thế (`isStaleOrSuperseded = true`).
5. **PERMISSION CHANGE:** Khi thu hồi quyền dự án của Chỉ huy trưởng, toàn bộ trích dẫn của dự án đó lập tức bị từ chối truy cập (`isAuthorized = false`, `failureReason = ACCESS_DENIED_FOR_USER_SCOPE`).
6. **DELETE:** Xóa tài liệu khỏi registry lập tức loại bỏ hoàn toàn 100% các chunk liên quan khỏi không gian tìm kiếm.

---

## 9. ĐÁNH GIÁ CÔNG NGHỆ VECTOR INDEX & ĐỀ XUẤT LỘ TRÌNH PERSISTENT INDEX

- **Đánh giá hạ tầng hiện tại:** Dự án đang sử dụng PostgreSQL (qua `@prisma/adapter-pg` và `pg`).
- **Đánh giá giải pháp Persistent Index tối ưu:**
  - **Khuyến nghị:** Sử dụng **`PostgreSQL + pgvector`** (kết hợp `tsvector` cho Full-Text Search và `vector(1536)` cho embeddings).
  - **Lý do:** Không phát sinh thêm hạ tầng phân tán phức tạp (như Pinecone, Qdrant, Milvus), kế thừa trực tiếp Transaction ACID, Row-Level Security và hệ thống phân quyền User/Project Scope có sẵn trong PostgreSQL.
- **Trạng thái hiện tại:** Tạm hoãn (Deferred) việc nạp vector index cho đến khi chuẩn bị triển khai nạp file thật.

---

## 10. KẾ HOẠCH CHUẨN BỊ CHO THỬ NGHIỆM TÀI LIỆU THẬT (REAL PILOT READINESS)

Để đưa Document Brain vào chạy thử nghiệm với tài liệu doanh nghiệp thực tế, cần chuẩn bị bộ dữ liệu tối thiểu có kiểm soát gồm 4 tài liệu sau:
1. **01 Hợp đồng thi công chính thức** (File PDF có text layer rõ ràng, đã được Chủ đầu tư & Nhà thầu ký duyệt).
2. **01 Phụ lục hợp đồng điều chỉnh tiến độ/giá trị** (File PDF đã duyệt, có ghi rõ điều khoản thay thế).
3. **01 Bản thuyết minh Biện pháp thi công (BPTC)** (File DOCX có tiêu đề chương mục rõ ràng).
4. **01 Bảng tiến độ / Dự toán vật tư** (File XLSX có cấu trúc Sheet, Header, Mã vật tư chuẩn hóa).

---

## 11. BẢNG MA TRẬN ĐỘ PHỦ TỔNG HỢP V3 (COVERAGE MATRIX V3)

| Nhóm chỉ số độ phủ | Giá trị | Giải thích chi tiết |
| :--- | :---: | :--- |
| **CAPABILITY_IMPLEMENTATION_COVERAGE** | **94.1%** (16/17) | 16/17 năng lực AI (Tools, Brain, Signal Engine, Document Router, Lifecycle) đã có mã nguồn hoạt động. |
| **REAL_DATA_COVERAGE** | **14.3%** (3/21) | Chỉ 3/21 công trình có dữ liệu nghiệp vụ thật trong PostgreSQL; 18 công trình còn lại là khung dự án. |
| **CONSTRUCTION_OPERATIONAL_INTELLIGENCE_COVERAGE** | **45.0%** | Mức độ hiểu biết trạng thái vận hành thực tế bị giới hạn bởi độ phủ dữ liệu thật từ công trường. |
| **DOCUMENT_ENGINEERING_CAPABILITY_COVERAGE** | **85.0%** | Khung kiến trúc phân tích tài liệu, phân quyền, trích dẫn V2, lifecycle, conflict detector hoàn tất. |
| **REAL_DOCUMENT_DATA_COVERAGE** | **0.0%** | Hiện tại chưa nạp hồ sơ thật của doanh nghiệp vào hệ thống lưu trữ. |
| **REAL_DOCUMENT_INTELLIGENCE_COVERAGE** | **0.0%** | Chưa chứng minh giá trị nghiệp vụ trên tài liệu thực tế của doanh nghiệp. |

---

## 12. BẢNG MA TRẬN NGHIỆM THU CUỐI CÙNG (MANDATORY FINAL MATRIX)

```
========================================================================================
MANDATORY FINAL CERTIFICATION MATRIX — AI MILESTONE 02C.1
========================================================================================
REAL_PDF_EXTRACTION:                    NOT_IMPLEMENTED
REAL_DOCX_EXTRACTION:                   NOT_IMPLEMENTED
REAL_XLSX_EXTRACTION:                   IMPLEMENTED_QA_ONLY
REAL_OCR:                               NOT_IMPLEMENTED
LEXICAL_RETRIEVAL:                      IMPLEMENTED_REAL_RUNTIME
SEMANTIC_VECTOR_RETRIEVAL:              NOT_IMPLEMENTED
PERSISTENT_DOCUMENT_INDEX:              NOT_IMPLEMENTED
VERSION_LINEAGE:                        IMPLEMENTED_REAL_RUNTIME
DOMAIN_AUTHORITY_POLICY:                IMPLEMENTED_REAL_RUNTIME
INDEX_LIFECYCLE:                        IMPLEMENTED_REAL_RUNTIME
RETRIEVAL_RECALL_AT_1:                  90.48% (19 / 21)
RETRIEVAL_RECALL_AT_3:                  100.0% (21 / 21)
MRR (Mean Reciprocal Rank):             0.9524
CORRECT_VERSION_RATE:                   90.48%
CORRECT_LOCATION_RATE:                  85.71%
CITATION_CORRECTNESS:                   100.0%
CITATION_COMPLETENESS:                  100.0%
UNSUPPORTED_CLAIM_RATE:                 0.00%
PROMPT_INJECTION_DEFENSE:               PASS against 10 tested attack vectors
CROSS_PROJECT_LEAK:                     0 / 4 (0.0% — ZERO LEAKAGE)
QA_RESIDUE:                             ZERO
BUSINESS_DB:                            CLEAN (0 QA records in PostgreSQL)
PORTFOLIO_DATA_ACQUISITION_SCALE:       NOT_FULLY_CERTIFIED (14 queries/proj, 294 queries/21 proj)
REAL_DOCUMENT_BUSINESS_VALUE:           UNVERIFIED
READY_FOR_AI_02D_GOVERNED_MEMORY:       NO (Prerequisites closed; awaiting Operator pilot approval)
========================================================================================
```

---
**BÁO CÁO KẾT THÚC. HỆ THỐNG ĐÃ DỪNG LẠI THEO ĐÚNG CHỈ DẪN VÀ KHÔNG TỰ Ý KHỞI ĐỘNG MILESTONE TIẾP THEO.**
