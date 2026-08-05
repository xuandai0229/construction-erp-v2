# HR Release Gate Policy & Enforcement Standard

**Trạng thái Document:** RELEASE CANDIDATE — PENDING FINAL GATE

## 1. Quy Trình Release Gate Hợp Lệ (30 Điều Kiện GO)

1. Một `FINAL_SHA` duy nhất chứa toàn bộ thay đổi.
2. Working tree sạch trước và sau khi thực hiện Quality Gate.
3. Không sửa file tracked hoặc amend sau khi chốt `FINAL_SHA`.
4. Không lặp lại hoặc rò rỉ credential cũ/mới trong log console hoặc tài liệu.
5. QA database role phải tuân thủ least-privilege (`rolsuper = false`).
6. QA database hoàn toàn độc lập với database chính/dev.
7. Prisma validate thành công.
8. Prisma generate thành công.
9. Migration status đạt "up to date" trên QA DB.
10. `npx tsc --noEmit` đạt 0 lỗi.
11. Full Vitest suite (411/411 tests) PASS.
12. Next.js Production Build (`npm run build`) thành công 100%.
13. Production Server chạy trực tiếp trên build từ `FINAL_SHA`.
14. Full Playwright regression suite PASS 100%.
15. Browser IDOR test bị chặn khi truy cập target ngoài scope.
16. Browser IDOR test thành công khi truy cập target trong scope.
17. Browser/Network PII leak scan bằng 0.
18. Security Audit log không chứa PII dạng plaintext hay crypto parameters.
19. Zero HTTP 5xx errors trong quá trình test runtime.
20. Zero uncaught browser console errors.
21. Fixture cleanup đạt Zero-orphan (delta = 0).
22. QA test route trả 404 khi cờ `ENABLE_QA_ROUTES` bị tắt.
23. Toàn bộ file ngoài phạm vi HR được đối soát và kiểm tra cú pháp thành công.
24. Zero Critical / High defects mở.
25. Zero thay đổi thuộc phạm vi Phase 4.
26. Không đưa ra bất kỳ tuyên bố chủ quan nào vượt quá chứng minh thực tế.
27. Biến môi trường `.env.e2e.local` nằm trong `.gitignore`.
28. Session state và storage state được tạo mới hoàn toàn.
29. Toàn bộ bằng chứng được lưu tại thư mục un-tracked `artifacts/release-evidence/<FINAL_SHA>/`.
30. Quyết định GO/NO-GO được lập dựa trên kết quả đồng thời của cả 29 điều kiện trên.
