# Setup Instructions

## Phase 1: Setup ✅ COMPLETED

Tất cả các tasks trong Phase 1 đã hoàn thành:

- ✅ T001: Next.js 16.1.2 project với TypeScript strict mode
- ✅ T002: Dependencies đã cài đặt (React 19.2.3, Tailwind 4.1.18, Prisma 7.2.0, Auth.js v5, Socket.io 4.8.3, OpenAI SDK 6.16.0, Zod 4.3.5)
- ✅ T003: ESLint và Prettier đã được cấu hình
- ✅ T004: Tailwind config với risk colors (xanh/vàng/đỏ)
- ✅ T005: .env.example đã được tạo
- ✅ T006: ⚠️ **ACTION REQUIRED** - Bạn cần tự setup Supabase
- ✅ T007: shadcn/ui components đã cài đặt (button, dialog, dropdown-menu, input, select, badge, skeleton, sonner)

## T006 - Manual Setup Required

### Tạo Supabase Project

1. Truy cập https://supabase.com
2. Đăng nhập hoặc đăng ký tài khoản
3. Tạo new project:
   - Project name: vsmart (hoặc tên bạn muốn)
   - Database Password: Chọn password mạnh
   - Region: Chọn gần nhất với bạn
   - Pricing plan: Free tier (đủ cho development)

4. Đợi project khởi tạo (1-2 phút)

5. Vào **Settings → Database**, copy connection string dạng:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

6. Tạo file `.env` trong thư mục gốc VSmart:
   ```bash
   cp .env.example .env
   ```

7. Paste DATABASE_URL vào `.env`:
   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
   ```

8. Thêm các env variables khác:
   - `OPENAI_API_KEY`: Lấy từ https://platform.openai.com/api-keys
   - `AUTH_SECRET`: Generate bằng `openssl rand -base64 32`

### Verify Setup

Sau khi hoàn thành T006, bạn có thể chạy:

```bash
# Test database connection
npx prisma db pull

# Chạy dev server
npm run dev
```

## Next Steps

Sau khi hoàn thành T006 manual setup, project sẵn sàng cho **Phase 2: Foundational** để implement database schema và core infrastructure.

---

**Status**: Phase 1 Complete - Waiting for T006 manual setup
**Date**: 2026-01-16
