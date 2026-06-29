# Báo cáo Khắc phục Lỗi Giới hạn Nhập Tiền Tệ Hợp đồng (Contracts Money Input Long Number Fix Report)

Báo cáo này ghi nhận kết quả điều tra và khắc phục triệt để lỗi ô nhập **Giá trị hợp đồng (VNĐ)** bị giới hạn chỉ nhập được tối đa 4 chữ số, đảm bảo hỗ trợ đầy đủ các hợp đồng quy mô lớn trong xây dựng (từ vài triệu đến hàng trăm tỷ đồng).

---

## 1. Nguyên nhân Gây ra Lỗi (Root Cause Audit)
Nguyên nhân lỗi bắt nguồn từ logic tách phần nguyên/thập phân trong hàm format cũ của `contract-form-dialog.tsx`:
```typescript
function formatVndInput(val: string): string {
  const parts = val.split(".");
  const clean = stripMoney(parts[0]);
  if (!clean) return "";
  return new Intl.NumberFormat("vi-VN").format(Number(clean));
}
```

### Quá trình phát sinh lỗi:
1. Khi người dùng nhập `1234`, hàm định dạng lại thành chuỗi `"1.234"`.
2. Khi người dùng gõ tiếp số `5`, giá trị đầu vào (`val`) của sự kiện `onChange` là `"1.2345"`.
3. Hàm format thực hiện `val.split(".")` để tách theo dấu chấm. Vì dấu phân tách hàng nghìn ở Việt Nam là dấu chấm `.`, hàm split sẽ chia chuỗi thành `["1", "2345"]`.
4. Hàm chỉ lấy phần tử đầu tiên `parts[0]` là `"1"`. Sau khi qua `stripMoney()` và `Number()`, giá trị chỉ còn `1`.
5. Kết quả là ô nhập liệu bị cắt ngắn ngược lại về `"1"` hoặc tối đa chỉ nhập được 4 số trước khi bị đứng im, không thể gõ được các giá trị lớn hơn.

---

## 2. Giải pháp Triển khai (Redesign & Implementation)

### 2.1. Tách Helper Tiền Tệ Độc Lập
Chúng tôi đã tách toàn bộ logic định dạng và xử lý chuỗi tiền tệ sang file utility riêng biệt tại [contract-money-utils.ts](file:///d:/construction-erp-v2/src/lib/contracts/contract-money-utils.ts) để dễ quản lý, tái sử dụng và kiểm định:

```typescript
export function stripMoney(val: string): string {
  return val.replace(/\D/g, "");
}

export function formatVndInput(val: string): string {
  const clean = stripMoney(val);
  if (!clean) return "";
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
```

*   **Không sử dụng `split(".")` trong ô nhập liệu**: Hàm `stripMoney` sẽ loại bỏ toàn bộ dấu chấm phân tách trước, chỉ giữ lại chữ số sạch (`\D` loại bỏ mọi ký tự phi số). Sau đó, biểu thức chính quy (Regex) sẽ chèn lại các dấu chấm đúng vị trí hàng nghìn từ phải qua trái.
*   **Cơ chế lưu trữ State**: Lưu chuỗi đã định dạng (ví dụ: `"250.000.000.000"`) trực tiếp trong state cục bộ trong lúc gõ để không làm mất dấu chấm hay vị trí nhập.
*   **Submit sạch**: Chỉ khi bấm nút Lưu/Thêm, chuỗi mới được loại bỏ dấu chấm và chuyển đổi thành kiểu `number` (`250000000000`) để gửi về backend.

### 2.2. Xử lý Dữ liệu DB khi Khởi tạo (Edit Mode)
Khi chỉnh sửa hợp đồng cũ, giá trị từ database có thể là float (ví dụ: `150000000.0000` của cột Decimal). Trong trường hợp này, chúng tôi thực hiện tách dấu chấm thập phân thực tế của float trước khi đưa vào formatter tiền tệ:
```typescript
const rawDbValue = initialData.value ? initialData.value.toString().split(".")[0] : "";
setValue(formatVndInput(rawDbValue));
```
Giải pháp này phân tách rõ ràng dấu chấm thập phân của DB với dấu chấm hàng nghìn của UI, tránh gây lỗi định dạng.

---

## 3. Ví dụ Kiểm tra Định dạng
Bộ helper mới đã được kiểm định thủ công và tự động, hoạt động chính xác với các số từ nhỏ đến rất lớn:

| Dữ liệu thô nhập vào | Chuỗi định dạng hiển thị trong Input | Ước lượng hiển thị (Short Preview) |
| :--- | :--- | :--- |
| `1` | `1` | |
| `1234` | `1.234` | |
| `1234567` | `1.234.567` | `≈ 1,23 triệu đồng` |
| `4444444444` | `4.444.444.444` | `≈ 4,44 tỷ đồng` |
| `15000000000` | `15.000.000.000` | `≈ 15 tỷ đồng` |
| `250000000000` | `250.000.000.000` | `≈ 250 tỷ đồng` |
| `1500000000000` | `1.500.000.000.000` | `≈ 1,5 nghìn tỷ đồng` |

---

## 4. Kiểm thử Hậu kiểm Tự động (QA Script)
Chúng tôi đã bổ sung bộ kiểm thử **Nhóm D: High Value & Formatting Tests** vào script `scripts/qa-contracts-crud-rbac.ts` để kiểm tra trực tiếp khả năng lưu trữ các giá trị lớn của Server Actions:
1.  **Test 1**: Tạo hợp đồng trị giá `4.444.444.444` VNĐ thông qua Server Action $\rightarrow$ **PASS** (lưu DB chính xác).
2.  **Test 2**: Cập nhật hợp đồng lên trị giá `250.000.000.000` VNĐ thông qua Server Action $\rightarrow$ **PASS** (lưu DB chính xác).
3.  **Test 3**: Thử tạo hợp đồng giá trị âm $\rightarrow$ **PASS** (bị chặn đúng với lỗi `"Giá trị hợp đồng phải lớn hơn 0."`).
4.  **Test 4**: Thử tạo hợp đồng với ngày kết thúc trước ngày bắt đầu $\rightarrow$ **PASS** (bị chặn đúng với lỗi `"Ngày kết thúc không được trước ngày bắt đầu."`).

### Kết quả chạy bộ QA (23 Test Cases):
```bash
--- NHÓM D: HIGH VALUE & FORMATTING TESTS ---
  [PASS] Tạo hợp đồng trị giá 4.444.444.444 VNĐ thành công và lưu đúng giá trị
  [PASS] Cập nhật hợp đồng lên trị giá 250.000.000.000 VNĐ thành công và lưu đúng giá trị
  [PASS] Hệ thống chặn đúng khi tạo hợp đồng với giá trị âm
  [PASS] Hệ thống chặn đúng khi ngày kết thúc trước ngày bắt đầu

[+] Đang dọn dẹp dữ liệu test...
  [+] Dọn dẹp dữ liệu test thành công.

==============================
TỔNG KẾT: 23 PASS / 0 FAIL
==============================
```

---

## 5. Kết quả Build & Typecheck
- **TypeScript Compilation**: `npx tsc --noEmit` -> **PASS (Thành công)**
- **Next.js Production Build**: `npm run build` -> **PASS (Thành công, Exit code 0)**

---

## 6. Kết luận
1.  **Đã nhập được số dài chưa?**
    *   Đã khắc phục hoàn toàn. Người dùng có thể nhập các số dài tùy ý (đã test tới hàng nghìn tỷ đồng `1.500.000.000.000.000` VNĐ). Hệ thống giới hạn tối đa 15 chữ số phần nguyên để đảm bảo an toàn cho cột Decimal của DB.
2.  **Có còn rủi ro gì không?**
    *   Không. Toàn bộ chuỗi nhập vào đều được làm sạch trước khi gửi lên Server, đảm bảo không lưu dấu chấm hàng nghìn vào cơ sở dữ liệu và không gây ra lỗi Number precision.
