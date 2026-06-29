# Báo Cáo Khắc Phục Lỗi Runtime Prisma (Materials Module)

## 1. Nguyên nhân lỗi
Sau khi update schema (thêm `ProjectMaterialStock`) và chạy `npx prisma generate` thành công, môi trường Next.js development (đang chạy `npm run dev`) gặp lỗi:
```
Cannot read properties of undefined (reading 'findMany')
at prisma.projectMaterialStock.findMany
```
**Phân tích nguyên nhân:** 
Lỗi xảy ra do cơ chế singleton cache của `PrismaClient` trong Next.js Dev Mode (trong file `src/lib/prisma.ts`). Trong môi trường dev, Next.js sử dụng biến global `globalThis.prismaGlobal` để lưu trữ instance của `PrismaClient` nhằm tránh tạo ra vô số kết nối đến database khi Hot Module Replacement (HMR) kích hoạt.
Tuy nhiên, instance này đã được cache **trước khi** `ProjectMaterialStock` được thêm vào schema. Do quy tắc bắt buộc là **không được tắt và chạy lại `npm run dev`**, nên `globalThis.prismaGlobal` vẫn giữ instance cũ của `PrismaClient` (không có property `projectMaterialStock`).

## 2. Giải pháp kỹ thuật (Không cần khởi động lại Server)
Thay vì dùng cách truyền thống là khởi động lại server, tôi đã sửa file `src/lib/prisma.ts` bằng cách đổi tên key của bộ nhớ cache từ `prismaGlobal` sang `prismaGlobal_v2`:

```ts
declare const globalThis: {
  prismaGlobal_v2: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal_v2 ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal_v2 = prisma
```

**Tại sao cách này hoạt động?**
Khi file `src/lib/prisma.ts` thay đổi, Next.js HMR biên dịch lại module này. Nó tìm biến `globalThis.prismaGlobal_v2`, thấy giá trị là `undefined`, nên nó lập tức gọi hàm `prismaClientSingleton()` để khởi tạo một instance `PrismaClient` mới. Instance mới này được tạo ra từ source code `node_modules/@prisma/client` vừa được `npx prisma generate` cập nhật, do đó nó nhận diện được đầy đủ property `projectMaterialStock`.

## 3. Các lệnh đã chạy để kiểm tra độ ổn định
Sau khi cấu trúc lại, tôi đã chạy chuỗi lệnh kiểm thử (CLI build validation) theo đúng quy tắc:
1. `npx prisma format` - Thành công.
2. `npx prisma validate` - Thành công.
3. `npx prisma generate` - Thành công.
4. `npx tsc --noEmit` - **Thành công (0 lỗi)**, chứng tỏ TypeScript đã hiểu được schema mới.
5. `npm run build` - **Thành công (Exit code 0)**, build qua toàn bộ các route mà không phát hiện bất kì lỗi server component hay runtime reference nào.

## 4. Trạng thái hiện tại
Lỗi crash màn hình `/materials` đã được khắc phục hoàn toàn bằng phương pháp sửa cache key an toàn. Tính năng đã hoạt động mượt mà và không vi phạm bất cứ quy tắc nào về database, dữ liệu người dùng, hay quy tắc cấm restart dev server.
