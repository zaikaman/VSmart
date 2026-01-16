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

5. Vào **Settings → API**, copy:
   - `Project URL`: https://xxxxx.supabase.co
   - `anon public key`: eyJhbG...
   - `service_role key`: eyJhbG... (click "Reveal" để xem)

6. Tạo file `.env` trong thư mục gốc VSmart:
   ```bash
   cp .env.example .env
   ```

7. Cập nhật `.env`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
   
   OPENAI_API_KEY=your-key
   OPENAI_MODEL=gpt-4o-mini
   OPENAI_BASE_URL=https://api.openai.com/v1
   
   AUTH_SECRET=<generate với: openssl rand -base64 32>
   AUTH_URL=http://localhost:3000
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

### Setup Database Schema

1. Vào Supabase Dashboard → **SQL Editor**

2. Chạy migration file `supabase/migrations/001_initial_schema.sql`:
   - Copy toàn bộ nội dung file
   - Paste vào SQL Editor
   - Click "Run"

3. Chạy seed data `supabase/migrations/002_seed_data.sql`:
   - Copy toàn bộ nội dung file
   - Paste vào SQL Editor
   - Click "Run"

4. Verify: Vào **Table Editor**, bạn sẽ thấy 9 tables:
   - phong_ban, nguoi_dung, ky_nang_nguoi_dung
   - du_an, phan_du_an, task
   - goi_y_phan_cong, lich_su_task, thong_bao

### Verify Setup

Sau khi hoàn thành setup, test connection:

```bash
# Chạy dev server
npm run dev
```

**Demo Accounts** (password: `password123`):
- Admin: admin@vsmart.vn
- Manager: manager@vsmart.vn
- Dev: dev1@vsmart.vn, dev2@vsmart.vn
- Designer: designer1@vsmart.vn, designer2@vsmart.vn

## Next Steps

Sau khi hoàn thành T006 manual setup, project sẵn sàng cho **Phase 2: Foundational** để implement database schema và core infrastructure.

---

**Status**: Phase 1 Complete - Waiting for T006 manual setup
**Date**: 2026-01-16
