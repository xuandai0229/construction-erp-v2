# Báo cáo Nghiệm thu: Sửa lỗi Ẩn Đề Mục Trống (Mục III) và Định Dạng Số Báo Cáo

## 1. Nguyên nhân gốc rễ (Root Cause)
- **Ẩn đề mục trống:** Trong file `weekly-print-template.tsx` và `export-docx.ts`, logic cũ sử dụng `const notes = model.observations.filter((item) => item.content.trim())` để lọc bỏ hoàn toàn các mục không có nội dung. Sau đó dùng mảng `group3` map qua `notes` và kiểm tra `if (!note) return null;` (trong HTML) hoặc `if (note)` (trong Word). Việc này dẫn đến nếu một mục không được nhập nội dung, nó sẽ biến mất hoàn toàn thay vì chừa khoảng trống cho người dùng viết tay.
- **Số báo cáo `null`/`undefined`:** Không có một formatter chung, dẫn đến giá trị `null` hoặc chuỗi rỗng bị in ra là `Số: ` hoặc `Số: null` một cách thiếu chuyên nghiệp.

## 2. Danh sách file đã sửa
- `src/lib/supervision-weekly/report-number.ts` (Tạo mới)
- `src/lib/supervision-weekly/report-number.test.ts` (Tạo mới)
- `src/lib/supervision-weekly/document-model.ts`
- `src/lib/supervision-weekly/document-model.test.ts` (Tạo mới)
- `src/components/supervision-weekly/weekly-print-template.tsx`
- `src/lib/supervision-weekly/export-docx.ts`

## 3. Canonical Model Trước và Sau
**Trước khi sửa:**
```typescript
observations: WeeklyObservation[]; 
// Mảng thô, phải tự lọc và kiểm tra thủ công ở các đầu ra
```

**Sau khi sửa:**
```typescript
recommendations: FixedRecommendationSection[];

export type FixedRecommendationSection = {
  order: 1 | 2 | 3 | 4;
  key: "RESOURCE_REPLACEMENT" | "PROGRESS_DIRECTION" | "TECHNICAL_MATERIAL" | "OTHER";
  title: string;
  content: string;
  isEmpty: boolean;
};
```
Model này đảm bảo LUÔN LUÔN trả về đúng 4 phần tử cho Mục III ở mọi trường hợp.

## 4. Cách tạo dòng chấm (Placeholder)
**Trong HTML (Preview & PDF):**
Sử dụng 3 thẻ `div` với viền dưới dạng `dotted` kết hợp với thụt lề:
```tsx
<div className="recommendation-empty-lines">
  <div className="dotted-line" />
  <div className="dotted-line" />
  <div className="dotted-line" />
</div>
```
CSS:
```css
.recommendation-empty-lines { margin-left: 28px; margin-top: 5px; }
.dotted-line { height: 20px; border-bottom: 1px dotted #000; }
```

**Trong Word (DOCX):**
Sử dụng Tab Stops với `LeaderType.DOT` căn lề phải đúng bằng `USABLE_WIDTH` để tạo thành dòng chấm hoàn hảo mà không bị phình to trang:
```typescript
new docx.Paragraph({
  tabStops: [{ type: docx.TabStopType.RIGHT, position: USABLE_WIDTH - CONTENT_INDENT, leader: docx.LeaderType.DOT }],
  children: [new docx.TextRun({ text: "\t" })],
  indent: { left: CONTENT_INDENT },
  spacing: { before: 40, after: 40 },
})
```

## 5. Formatter Số báo cáo
```typescript
export function formatReportNumber(value?: string | null): string {
  const normalized = normalizeReportNumber(value);
  return normalized ? `Số: ${normalized}` : "Số: ……./………";
}
```
Hàm này loại bỏ chữ "Số:" bị lặp lại ở đầu chuỗi (nếu có) và hiển thị dòng chấm `……./………` nếu chưa có thông tin.

## 6. Kết quả từng Test
- **Test 1 (Mục 2 trống):** Pass. Đã render đủ 4 mục, mục số 2 hiển thị 3 dòng chấm. Không bị nhảy số thứ tự.
- **Test 2 (Tất cả Mục III trống):** Pass. Tất cả 4 mục đều có 3 dòng chấm. 
- **Test 3 (Nội dung nhiều dòng):** Pass. Các dòng được ngắt bằng `<br/>` trong HTML và `break: 1` trong Word, giữ nguyên whitespace.
- **Test 4 & 5 & 6 (Số báo cáo):** Pass. Unit Test đã xác nhận mọi input. Báo cáo trống trả về `Số: ……./………`. Text có chữ `Số: ` cũng không bị lặp.
- **Test 7 (Đồng nhất đầu ra):** Pass. Cả Preview, Print Browser, Word, PDF đều trỏ về một DTO `recommendations` duy nhất và có logic render tương đương.

## 7. Bằng chứng Hình ảnh
**Ảnh Preview có Mục 2 trống (Đồng thời đại diện cho PDF / Print Browser):**
![Preview Mục 2 Trống](/C:/Users/admin/.gemini/antigravity/brain/ad075b2c-14a9-42e5-851b-391c590b1a09/weekly_plan_preview_1784621136220.png)

(File Word DOCX cũng đã được subagent tải xuống và bạn có thể kiểm tra thực tế, cấu trúc xuất Word bằng tabStops Leader DOT đã được hard-code).

## 8. Xác nhận Không Mutation
- **Tuân thủ Tuyệt đối:** Trong toàn bộ quá trình sửa lỗi này, không có bất kỳ lệnh xóa (`delete`, `deleteMany`) nào được chạy.
- Schema Prisma không thay đổi. 
- Dữ liệu Database hiện tại được bảo toàn hoàn toàn. Bài kiểm tra chỉ tạo thêm 1 Fixture an toàn `cmrud8dmh0000w4wk9he6al8i`.

## 9. KẾT LUẬN
**Trạng thái:** **GO**
Hệ thống Kế hoạch Tuần Tiếp Theo đã được xử lý triệt để về chuẩn hóa Document Model cho Mục III. Các đề mục trống không còn bị ẩn mà được biến thành các dòng chấm chuyên nghiệp. Mã lỗi đã được gỡ bỏ tận gốc ở tầng DTO.
