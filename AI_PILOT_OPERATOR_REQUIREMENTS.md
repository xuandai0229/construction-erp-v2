# HƯỚNG DẪN QUẢN TRỊ VIÊN: ĐIỀU KIỆN TIÊN QUYẾT CHO AI PILOT
# AI PILOT OPERATOR REQUIREMENTS & ONBOARDING PROCEDURE

**Dự án:** `construction-erp-v2`  
**Ngày ban hành:** 20/08/2026  
**Mục đích:** Quy định các bước cần thiết để Operator đưa nhân sự thật vào hệ thống hoặc lựa chọn phạm vi Pilot trước khi kích hoạt AI Assistant.

---

## 1. HAI LỰA CHỌN QUYẾT ĐỊNH CHO OPERATOR (STRATEGIC OPTIONS)

Hệ thống tuân thủ nghiêm ngặt nguyên tắc **FAIL-CLOSED** và **KHÔNG TỰ TẠO DỮ LIỆU GIẢ**. Operator cần đưa ra 1 trong 2 quyết định sau:

### LỰA CHỌN A (Khuyến nghị nếu muốn thử nghiệm đầy đủ 4 Role):
- **Mục tiêu:** Thử nghiệm AI Pilot với đủ 4 vai trò: `ADMIN`, `CHIEF_COMMANDER`, `ENGINEER`, `CONSTRUCTION_SUPERVISOR`.
- **Hành động Operator cần làm:**
  1. Tuyển dụng hoặc bổ nhiệm nhân viên thực tế có vị trí Kỹ sư công trình và Giám sát thi công.
  2. Thực hiện quy trình cấp tài khoản người dùng theo [Quy trình mục 2](#2-quy-trình-cấp-tài-khoản-và-gán-vai-trò-cho-nhân-sự-thật).
  3. Cung cấp biến môi trường `OPENAI_API_KEY` an toàn tại server.
  4. Chạy script nghiệm thu Live Remote OpenAI Smoke Gate.

### LỰA CHỌN B (Nếu muốn thử nghiệm ngay trên nhân sự hiện có):
- **Mục tiêu:** Thu hẹp phạm vi Pilot giai đoạn đầu chỉ gồm 2 vai trò đang có tài khoản thật trong database: `ADMIN` + `CHIEF_COMMANDER`.
- **Hành động Operator cần làm:**
  1. Ban hành quyết định chính thức thu hẹp Pilot Cohort thành `ADMIN` + `CHIEF_COMMANDER`.
  2. Cung cấp biến môi trường `OPENAI_API_KEY` an toàn tại server.
  3. Chạy script nghiệm thu Live Remote OpenAI Smoke Gate cho 2 role này.

---

## 2. QUY TRÌNH CẤP TÀI KHOẢN VÀ GÁN VAI TRÒ CHO NHÂN SỰ THẬT (ROLE PROVISIONING WORKFLOW)

Khi Operator tạo tài khoản cho Kỹ sư (`ENGINEER`) hoặc Giám sát (`CONSTRUCTION_SUPERVISOR`), bắt buộc phải tuân theo chuỗi xác thực 7 bước sau để đảm bảo an toàn bảo mật cho AI:

```text
[1. Employee Record]      Tạo bản ghi nhân viên thật (Mã NV, Họ tên, Đơn vị phòng ban)
         ↓
[2. HR Position]          Xác nhận vị trí công tác (Kỹ sư công trường / Giám sát thi công)
         ↓
[3. User Account]         Tạo tài khoản đăng nhập qua luồng quản trị User chuẩn
         ↓
[4. Security Role]        Gán đúng User.role = "ENGINEER" hoặc "CONSTRUCTION_SUPERVISOR"
         ↓
[5. Project Assignment]   Gán quyền / phạm vi công trình (ProjectMember / Assignment)
         ↓
[6. Verify Field Policy]  Kiểm tra tài khoản không được thấy trường tài chính (budget = OMITTED)
         ↓
[7. Pilot Enrollment]     Thêm User.id vào danh sách ALLOWED_PILOT_USER_IDS trong mã nguồn
```

---

## 3. HƯỚNG DẪN CẤU HÌNH BIẾN MÔI TRƯỜNG OPENAI AN TOÀN (OPENAI API KEY SECRETS)

> [!CAUTION]
> **Tuyệt đối KHÔNG:**
> - Gửi API key qua prompt chat của AI.
> - Dán API key vào mã nguồn hoặc commit vào Git repository.
> - Cấu hình API key ở frontend hoặc Next.js public variables (`NEXT_PUBLIC_*`).

### Cách cấu hình chuẩn tại Server:
Thêm dòng sau vào file bí mật `.env.local` trên server môi trường chạy:

```bash
# OpenAI Responses API Secret Key (Server-Side Only)
OPENAI_API_KEY="sk-proj-..."

# Tên mô hình OpenAI cho phép (Mặc định: gpt-4o-mini, gpt-4o)
AI_MODEL_NAME="gpt-4o-mini"
```

Sau khi cấu hình, chạy lệnh kiểm tra kết nối độc lập:

```powershell
npx tsx -r dotenv/config scripts/qa/live-openai-smoke.ts dotenv_config_path=.env.local
```
