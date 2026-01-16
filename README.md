# VSmart - Hệ Thống Quản Lý Công Việc Thông Minh

Hệ thống quản lý công việc với AI, giúp tự động gợi ý phân công, dự báo rủi ro trễ hạn, và hỗ trợ chat với AI assistant.

## Tech Stack

- **Framework**: Next.js 16.1.2 với App Router
- **Language**: TypeScript 5.9.3 (strict mode)
- **UI**: React 19.2.3, Tailwind CSS 4.1.18, shadcn/ui
- **Database**: PostgreSQL (Supabase) với Supabase Client
- **Authentication**: Auth.js v5
- **Realtime**: Socket.io 4.8.3
- **AI**: OpenAI SDK 6.16.0 (GPT-4o-mini)
- **State Management**: TanStack Query 5.62.12, Zustand 5.0.3
- **Validation**: Zod 4.3.5

## Getting Started

### Prerequisites

1. Node.js 18+ và npm
2. Supabase account
3. OpenAI API key

### Setup

1. Clone repository:
```bash
git clone https://github.com/zaikaman/VSmart.git
cd VSmart
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Tạo file `.env` từ `.env.example`:
```bash
cp .env.example .env
```

4. Setup Supabase:
   - Tạo project trên https://supabase.com
   - Copy Project URL và API keys vào `.env`
   - Chạy migration files trong `supabase/migrations/` trên SQL Editor

5. Cập nhật các environment variables trong `.env`:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`: API key từ OpenAI
   - `AUTH_SECRET`: Generate bằng `openssl rand -base64 32`

6. Chạy development server:
```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) để xem ứng dụng.

**Xem chi tiết**: [SETUP.md](SETUP.md)

## Scripts

- `npm run dev` - Chạy development server
- `npm run build` - Build production
- `npm run start` - Chạy production server
- `npm run lint` - Chạy ESLint
- `npm run format` - Format code với Prettier
- `npm run format:check` - Kiểm tra formatting

## Project Structure

```
VSmart/
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/       # React components
│   │   └── ui/          # shadcn/ui components
│   └── lib/             # Utilities, hooks, configs
│       └── supabase/    # Supabase client & types
├── supabase/
│   └── migrations/      # SQL migration files
├── specs/               # Design documents
│   └── 1-smart-task-management/
│       ├── spec.md      # Feature specification
│       ├── plan.md      # Implementation plan
│       ├── tasks.md     # Task breakdown
│       ├── data-model.md
│       └── contracts/
└── public/              # Static assets
```

## Features (Planned)

- ✅ **Phase 1: Setup** - Project initialization
- 🚧 **Phase 2: Foundation** - Core infrastructure
- 📋 **User Story 1** (P1 - MVP): Quản lý dự án và kanban board với realtime updates
- 🤖 **User Story 2** (P2): AI gợi ý phân công tự động
- ⚠️ **User Story 3** (P3): Dự báo rủi ro trễ hạn
- 💬 **User Story 4** (P4): Chat với AI assistant
- 👥 **User Story 5** (P5): Quản lý kỹ năng người dùng

## Documentation

Xem thêm tài liệu trong thư mục `specs/1-smart-task-management/`:
- [spec.md](specs/1-smart-task-management/spec.md) - Feature specification
- [plan.md](specs/1-smart-task-management/plan.md) - Technical plan
- [tasks.md](specs/1-smart-task-management/tasks.md) - Implementation tasks
- [data-model.md](specs/1-smart-task-management/data-model.md) - Database design

## License

Private project - All rights reserved

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
