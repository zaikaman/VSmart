# Quickstart Guide: VSmart Task Management

**Feature**: 1-smart-task-management  
**Created**: 2026-01-16  
**Target**: Developers mới setup project lần đầu

## Prerequisites

- **Node.js**: v20.x+ (LTS recommended)
- **npm/yarn/pnpm**: Latest version
- **Git**: For version control
- **OpenAI API Key**: Đăng ký tại https://platform.openai.com
- **Supabase Account**: Đăng ký tại https://supabase.com (free tier)

## Step 1: Clone & Install

```bash
# Clone repository
git clone https://github.com/your-org/vsmart.git
cd vsmart

# Install dependencies
npm install
# hoặc
pnpm install
```

## Step 2: Setup Database (Supabase)

### 2.1 Tạo Project Supabase

1. Đăng nhập https://supabase.com/dashboard
2. Click **New Project**
3. Điền thông tin:
   - **Name**: vsmart-dev
   - **Database Password**: [password mạnh, lưu lại]
   - **Region**: Southeast Asia (Singapore)
4. Đợi ~2 phút để project provisioning

### 2.2 Enable pgvector Extension

1. Vào project → **SQL Editor**
2. Chạy query:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Click **Run**

### 2.3 Lấy Database URL

1. Vào **Settings** → **Database**
2. Copy **Connection String** (URI format)
3. Replace `[YOUR-PASSWORD]` bằng password bạn đã tạo

Example:
```
postgresql://postgres.abcdefgh:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

## Step 3: Setup OpenAI API

### 3.1 Tạo API Key

1. Đăng nhập https://platform.openai.com
2. Vào **API keys** → **Create new secret key**
3. Đặt tên: `vsmart-dev`
4. **Copy key ngay** (chỉ hiển thị 1 lần): `sk-proj-...`

### 3.2 Setup Billing (Bắt buộc)

1. Vào **Settings** → **Billing**
2. Add payment method (credit/debit card)
3. Set **Usage limit**: $5/month (đủ cho development)
4. Enable **Email alerts** khi đạt $1, $3, $5

**Note**: OpenAI yêu cầu payment method dù dùng ít. Chi phí thực tế ~$0.50 cho 12 tuần dev nếu optimize tốt.

## Step 4: Environment Variables

Tạo file `.env.local` ở root project:

```bash
# .env.local (KHÔNG commit vào Git)

# Database (Supabase)
DATABASE_URL="postgresql://postgres.abcdefgh:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

# OpenAI API
OPENAI_API_KEY="sk-proj-..."
OPENAI_ORG_ID=""  # Optional, để trống nếu personal account

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="random-string-32-chars-min"  # Generate: openssl rand -base64 32

# App Config
NODE_ENV="development"
```

**Generate NEXTAUTH_SECRET**:
```bash
openssl rand -base64 32
# hoặc
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Step 5: Database Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations (tạo tables)
npx prisma migrate dev --name init

# Seed initial data (optional)
npx prisma db seed
```

**Expected output**:
```
✔ Generated Prisma Client
✔ Your database is now in sync with your schema
✔ Seed data created: 3 users, 2 projects, 5 tasks
```

## Step 6: Run Development Server

```bash
npm run dev
# hoặc
pnpm dev
```

Open http://localhost:3000

**Default credentials** (từ seed):
- **Admin**: admin@vsmart.vn / password123
- **Manager**: manager@vsmart.vn / password123
- **Member**: member@vsmart.vn / password123

## Step 7: Verify Setup

### 7.1 Test Database Connection

```bash
npx prisma studio
```

Mở http://localhost:5555 → Xem tables và data

### 7.2 Test OpenAI API

Create file `test-openai.js`:

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function test() {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Hello!' }],
    });
    console.log('✅ OpenAI API works!');
    console.log('Response:', completion.choices[0].message.content);
  } catch (error) {
    console.error('❌ OpenAI API error:', error.message);
  }
}

test();
```

Run:
```bash
node test-openai.js
```

### 7.3 Test Embeddings

```javascript
const embedding = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: 'React developer with 5 years experience',
});

console.log('Embedding dimensions:', embedding.data[0].embedding.length); // 1536
console.log('✅ Embeddings work!');
```

## Step 8: Key Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Database
npx prisma studio        # GUI for database
npx prisma migrate dev   # Create new migration
npx prisma db push       # Quick sync without migration
npx prisma db seed       # Run seed script

# Linting & Formatting
npm run lint             # ESLint check
npm run format           # Prettier format

# Type checking
npm run type-check       # TypeScript check
```

## Project Structure

```
vsmart/
├── app/                          # Next.js 15 App Router
│   ├── (auth)/                   # Auth routes group
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/              # Protected dashboard routes
│   │   ├── projects/
│   │   ├── kanban/
│   │   ├── profile/
│   │   └── layout.tsx
│   ├── api/                      # API Routes
│   │   ├── auth/
│   │   ├── projects/
│   │   ├── tasks/
│   │   ├── ai/
│   │   │   ├── suggest-assignee/
│   │   │   ├── predict-risk/
│   │   │   └── chat/
│   │   └── socket/               # Socket.io handler
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── kanban/
│   ├── chat/
│   └── layouts/
├── lib/
│   ├── openai/
│   │   ├── client.ts             # OpenAI singleton
│   │   ├── embeddings.ts
│   │   ├── chat.ts
│   │   └── prompts/
│   ├── db/
│   │   └── prisma.ts
│   ├── auth/
│   │   └── auth-options.ts       # NextAuth config
│   ├── socket/
│   │   └── server.ts
│   └── utils.ts
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/
├── .env.local                    # Environment variables (not committed)
├── .env.example                  # Template for env vars
├── package.json
├── tsconfig.json
└── next.config.js
```

## Common Issues & Fixes

### Issue 1: Prisma Client Generation Fails

**Error**: `@prisma/client did not initialize yet`

**Fix**:
```bash
npx prisma generate
```

### Issue 2: OpenAI API 401 Unauthorized

**Error**: `401 Incorrect API key provided`

**Fix**:
- Check API key trong `.env.local` đúng format `sk-proj-...`
- Verify API key còn active tại https://platform.openai.com/api-keys
- Restart dev server sau khi update `.env.local`

### Issue 3: pgvector Extension Not Found

**Error**: `extension "vector" does not exist`

**Fix**:
```sql
-- Chạy trong Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS vector;
```

### Issue 4: Database Connection Failed

**Error**: `Can't reach database server`

**Fix**:
- Check DATABASE_URL syntax chính xác
- Verify Supabase project đang active (không paused)
- Test connection: `npx prisma db pull`

### Issue 5: Port 3000 Already in Use

**Fix**:
```bash
# Kill process on port 3000
npx kill-port 3000

# Hoặc chạy trên port khác
PORT=3001 npm run dev
```

## Development Workflow

### 1. Tạo Feature Branch

```bash
git checkout -b feature/ten-feature
```

### 2. Make Changes

```typescript
// Ví dụ: Thêm field mới vào schema
// prisma/schema.prisma

model Task {
  // ...existing fields
  estimatedHours Int? // New field
}
```

### 3. Create Migration

```bash
npx prisma migrate dev --name add_estimated_hours
```

### 4. Update Types

```bash
npx prisma generate
```

### 5. Test Locally

```bash
npm run dev
# Test thủ công hoặc viết tests
```

### 6. Commit & Push

```bash
git add .
git commit -m "feat: thêm estimated hours cho tasks"
git push origin feature/ten-feature
```

## Testing OpenAI Features

### Test Assignment Suggestions

```bash
# POST /api/ai/suggest-assignee
curl -X POST http://localhost:3000/api/ai/suggest-assignee \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "moTaTask": "Build responsive UI with React and Tailwind CSS",
    "phongBanId": "uuid-phong-ban"
  }'
```

**Expected Response**:
```json
{
  "suggestions": [
    {
      "nguoiDungId": "uuid-1",
      "ten": "Nguyễn Văn A",
      "diemPhuHop": 85.5,
      "lyDo": {
        "skillsMatch": 90,
        "completionRate": 95,
        "availability": "Available"
      }
    },
    // ... 2 more suggestions
  ]
}
```

### Test Risk Prediction

```bash
# POST /api/ai/predict-risk
curl -X POST http://localhost:3000/api/ai/predict-risk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"taskId": "uuid-task"}'
```

### Test Chat Assistant

```bash
# POST /api/ai/chat (streaming)
curl -N -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"message": "Task X có nguy cơ trễ không?"}'
```

## Monitoring & Debugging

### OpenAI Usage Dashboard

1. Vào https://platform.openai.com/usage
2. View cost breakdown by model
3. Set alerts nếu vượt ngưỡng

### Prisma Query Logging

Enable trong `.env.local`:
```
# Log all queries
DATABASE_URL="...?connection_limit=10&pool_timeout=20&statement_cache_size=100&pgbouncer=true&connect_timeout=10&log_statements=all"
```

Hoặc trong code:
```typescript
// lib/db/prisma.ts
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

### Socket.io Debugging

```typescript
// lib/socket/server.ts
const io = new Server(httpServer, {
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);
  // ...
});
```

## Deployment Preparation

### 1. Vercel Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### 2. Environment Variables (Vercel Dashboard)

Add in Vercel project settings:
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `NEXTAUTH_URL` (https://your-app.vercel.app)
- `NEXTAUTH_SECRET`

### 3. Build Check

```bash
npm run build
# Should complete without errors
```

## Resources

### Documentation
- **Next.js 15**: https://nextjs.org/docs
- **Prisma**: https://www.prisma.io/docs
- **OpenAI API**: https://platform.openai.com/docs
- **Supabase**: https://supabase.com/docs
- **Socket.io**: https://socket.io/docs/v4

### Community
- **Next.js Discord**: https://nextjs.org/discord
- **Prisma Discord**: https://pris.ly/discord
- **Stack Overflow**: Tag `next.js`, `prisma`, `openai-api`

### Tools
- **Prisma Studio**: Database GUI
- **Postman**: API testing (import `contracts/openapi.yaml`)
- **React DevTools**: Debug React components
- **Vercel Analytics**: Production monitoring

## Next Steps

1. ✅ Complete setup above
2. 📖 Read `research.md` để hiểu OpenAI integration strategy
3. 📊 Review `data-model.md` để hiểu database schema
4. 🔌 Check `contracts/openapi.yaml` để hiểu API endpoints
5. 🚀 Start implementing Phase 1 tasks (see `tasks.md` when available)

## Getting Help

**Issues?** Check:
1. This quickstart guide
2. `research.md` (technical deep-dive)
3. Console logs (`npm run dev`)
4. GitHub Issues (if public repo)

**Still stuck?** Ask team lead hoặc create issue với:
- Error message đầy đủ
- Steps to reproduce
- Environment info (`node -v`, OS)
