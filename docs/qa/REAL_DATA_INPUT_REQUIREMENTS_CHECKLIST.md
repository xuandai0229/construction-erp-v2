# REAL DATA INPUT REQUIREMENTS CHECKLIST

Để đảm bảo hệ thống bắt đầu nhập liệu thật với độ chính xác cao nhất và cấu trúc đúng đắn, bạn cần cung cấp đầy đủ các thông tin nghiệp vụ thực tế của công trình đầu tiên. 

Vui lòng điền thông tin vào mẫu dưới đây và gửi lại cho tôi:

## 1. THÔNG TIN CHUNG CỦA CÔNG TRÌNH (Bắt buộc)
```json
{
  "projectName": "Tên công trình thật (Ví dụ: Thi công xây dựng toà nhà văn phòng XYZ)",
  "projectCode": "Mã công trình thật (Ví dụ: XYZ-2026)",
  "investor": "Tên chủ đầu tư thật",
  "location": "Địa điểm thi công thật",
  "startDate": "Ngày khởi công (YYYY-MM-DD)",
  "expectedEndDate": "Ngày dự kiến hoàn thành (YYYY-MM-DD)",
  "commanderNameOrUserId": "Tên hoặc email của Chỉ huy trưởng",
  "description": "Mô tả ngắn gọn quy mô công trình (nếu có)"
}
```

## 2. CẤU TRÚC PHÂN VIỆC / BẢNG TIẾN ĐỘ WBS (Bắt buộc)
Cần ít nhất 1 nhóm công việc và 1 công việc chi tiết.
```json
[
  {
    "groupName": "Tên hạng mục lớn (Ví dụ: PHẦN NGẦM / PHẦN KẾT CẤU)",
    "items": [
      {
        "workName": "Tên công việc thật (Ví dụ: Bê tông đài móng M1)",
        "unit": "Đơn vị tính (Ví dụ: m3, m2, md)",
        "designQuantity": 100, // Khối lượng thiết kế thật (số)
        "area": "Khu vực thi công (nếu có)",
        "note": "Ghi chú thêm (nếu có)"
      }
    ]
  }
]
```

## 3. TÀI LIỆU KHỞI TẠO (Tuỳ chọn)
Nếu bạn có sẵn các file tài liệu khởi tạo (Hợp đồng, Bản vẽ, Dự toán...), xin hãy đưa đường dẫn vật lý (absolute path) trên máy tính của bạn để tôi import vào thư mục.
```json
[
  {
    "folderName": "01_Hợp đồng", // Chọn 1 trong 8 thư mục mặc định
    "filePath": "C:\\path\\to\\your\\real-file.pdf",
    "documentName": "Tên tài liệu lưu trên hệ thống"
  }
]
```

## 4. BÁO CÁO HIỆN TRƯỜNG ĐẦU TIÊN (Tuỳ chọn)
Nếu bạn muốn tôi khởi tạo kèm luôn một báo cáo ngày có sẵn hình ảnh thật.
```json
[
  {
    "date": "2026-06-23",
    "summary": "Nội dung tóm tắt công việc ngày...",
    "weatherCondition": "SUNNY", // SUNNY, CLOUDY, LIGHT_RAIN, HEAVY_RAIN...
    "weatherTemperature": 32,
    "workLines": [
      {
        "workName": "Bê tông đài móng M1",
        "quantityToday": 15,
        "unit": "m3"
      }
    ],
    "photoPaths": [
      "C:\\path\\to\\your\\real-photo.jpg"
    ]
  }
]
```

---
**Quy tắc:**
- Tuyệt đối không cung cấp dữ liệu giả (Lorem Ipsum, test1234...).
- Khối lượng thiết kế (`designQuantity`) phải là số hợp lệ `> 0`.
- Nếu chưa có tài liệu/báo cáo, bạn có thể bỏ qua phần 3 và phần 4. Chúng ta có thể nhập tay sau qua giao diện hệ thống.
