# Research: Hệ Thống Quản Lý Công Việc Thông Minh với OpenAI API

**Feature**: 1-smart-task-management  
**Created**: 2026-01-16  
**Purpose**: Nghiên cứu best practices tích hợp OpenAI API cho assignment suggestions, risk prediction, và AI chat assistant

## Phase 0: Research Findings

### 1. OpenAI API Integration Strategy

#### 1.1 Model Selection & Cost Optimization

**Decision**: Sử dụng GPT-5-Nano làm model chính duy nhất cho tất cả use cases

**Rationale**:
- **GPT-5-Nano**: Model nhẹ nhất trong GPT-5 family
  - Phù hợp cho: Chat assistant, risk analysis prompts, task breakdown suggestions, assignment suggestions
  - Speed: < 1s latency, tối ưu cho realtime
  - Quality: Đủ tốt cho reasoning tasks, context window 128K tokens
  - Cost: Cực kỳ rẻ (nano pricing model)

**Environment Configuration**:
```bash
# .env.local
OPENAI_API_KEY=sk-proj-...       # OpenAI API key
OPENAI_MODEL=gpt-5-nano          # Single model for all AI tasks
OPENAI_BASE_URL=https://api.openai.com/v1  # Optional: custom endpoint
```

**Cost Estimation (12 weeks development + demo)**:
- Development phase: ~500K tokens (prompts testing, debugging) với GPT-5-Nano ≈ **< $0.05**
- Demo phase: 50 users × 20 interactions × 500 tokens avg = 500K tokens ≈ **< $0.10**
- Total: **< $0.20** (cực rẻ, chỉ dùng 1 model)

**Advantages**:
- **Single model**: Không cần logic phức tạp để chọn model, mọi use case dùng GPT-5-Nano
- **Ultra-fast**: Optimized cho latency, phù hợp realtime Kanban
- **Minimal cost**: Giảm 80% cost so với GPT-4o-mini
- **Simple SDK**: Dùng `model` param duy nhất, không cần embeddings API calls

#### 1.2 Architecture Pattern

**Decision**: Hybrid Next.js Fullstack + OpenAI SDK

**Structure**:
```
Next.js App (Vercel deployment)
├── app/
│   ├── api/
│   │   ├── ai/
│   │   │   ├── suggest-assignee/route.ts    # POST /api/ai/suggest-assignee
│   │   │   ├── predict-risk/route.ts        # POST /api/ai/predict-risk
│   │   │   └── chat/route.ts                # POST /api/ai/chat (streaming)
│   │   ├── tasks/route.ts                   # CRUD tasks
│   │   ├── projects/route.ts
│   │   └── socket/route.ts                  # Socket.io handler
│   ├── (dashboard)/                         # Protected routes
│   │   ├── projects/
│   │   ├── kanban/
│   │   └── profile/
│   └── layout.tsx
├── lib/
│   ├── openai/
│   │   ├── client.ts                        # OpenAI client singleton
│   │   ├── embeddings.ts                    # Vector operations
│   │   ├── chat-completion.ts               # Chat helpers
│   │   └── prompts/                         # System prompts library
│   ├── db/
│   │   └── prisma.ts                        # Prisma client
│   └── socket/
│       └── server.ts                        # Socket.io server
└── components/
    ├── ui/                                   # shadcn/ui components
    ├── kanban/
    └── chat/
```

**Rationale**:
- **Next.js API Routes**: Đơn giản, không cần tách backend riêng, Vercel auto-scaling
- **OpenAI Node SDK** (v4.x): Official library, TypeScript support tốt, streaming built-in
- **Server-side only**: API keys an toàn, không expose ra client
- **Environment-driven**: Dùng `process.env` để config model, key, base URL → dễ switch backends
- **GPT-5-Nano optimized**: Single model tối ưu hóa latency, không cần embeddings

### 2. AI Assignment Suggestion (User Story 2)

#### 2.1 Approach: GPT-5-Nano Direct Analysis

**Decision**: Gọi GPT-5-Nano để phân tích skills + workload, không dùng embeddings

**Implementation Flow**:
```typescript
// lib/openai/client.ts
import OpenAI from 'openai';

export const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

// lib/openai/assignment.ts
async function suggestAssignees(taskDescription: string, departmentId: string) {
  const candidates = await prisma.user.findMany({
    where: { department_id: departmentId },
    include: { 
      skills: true,
      _count: { 
        select: { tasks: { where: { trang_thai: { not: 'done' } } } } 
      }
    },
    take: 10 // Get top 10 candidates để GPT analyze
  });

  const candidatesText = candidates.map(c => 
    `- ${c.ten}: skills=[${c.skills.map(s => s.skill_name).join(', ')}], active_tasks=${c._count.tasks}, completion_rate=${c.completion_rate}%`
  ).join('\n');

  const completion = await openaiClient.chat.completions.create({
    model: process.env.OPENAI_MODEL,
    messages: [
      {
        role: 'system',
        content: `Bạn là AI system gợi ý người phù hợp cho tasks. 
Analyze candidates dựa vào:
1. Skills match với task description
2. Completion rate (người hoàn thành tốt ưu tiên)
3. Workload hiện tại (người ít việc ưu tiên)

Trả về JSON array gồm top 3 candidates với format:
[
  {
    "user_id": "uuid",
    "ten": "Tên người",
    "match_score": 85,
    "reasoning": "Lý do ngắn gọn"
  }
]`
      },
      {
        role: 'user',
        content: `Task description: ${taskDescription}\n\nCandidates:\n${candidatesText}\n\nGợi ý top 3 người phù hợp nhất.`
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const suggestions = JSON.parse(completion.choices[0].message.content!);
  return suggestions.slice(0, 3);
}
```

**Rationale**:
- **No embeddings API**: Giảm API calls, bỏ cần pgvector extension
- **GPT-5-Nano reasoning**: GPT tự hiểu ngữ cảnh từ task description + candidates
- **Simple & flexible**: Dễ thay đổi scoring logic chỉ bằng prompt adjustment
- **Cost-effective**: 1 API call thay vì 2 (embeddings + DB query)

**Alternatives Considered**:
- ~~Embeddings-based matching~~: Thêm complexity (pgvector, embeddings calls), không cần thiết với GPT-5-Nano
- ~~Rule-based matching~~: Rigid, không flexible như LLM reasoning

#### 2.2 Fallback Strategy

**Cold Start Problem**: Khi hệ thống mới, chưa có skills data hoặc historical completion rates

**Solution**:
```typescript
function getFallbackSuggestions(departmentId: string) {
  // Chỉ dựa vào workload (số tasks active)
  return prisma.user.findMany({
    where: { department_id: departmentId },
    include: { 
      _count: { 
        select: { tasks: { where: { trang_thai: { not: 'done' } } } } 
      } 
    },
    orderBy: { tasks: { _count: 'asc' } }, // Ưu tiên người ít việc nhất
    take: 3
  });
}
```

### 3. AI Risk Prediction (User Story 3)

#### 3.1 Approach: GPT-5-Nano Prompt Engineering

**Decision**: Dùng GPT-5-Nano với structured prompts để dự báo rủi ro

**Implementation Flow**:
```typescript
async function predictTaskRisk(taskId: string): Promise<RiskPrediction> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: { include: { taskHistory: { take: 10, orderBy: { timestamp: 'desc' } } } },
      projectPart: { include: { project: true } }
    }
  });
  
  // Tính toán metrics
  const daysUntilDeadline = differenceInDays(task.deadline, new Date());
  const daysInProgress = task.trang_thai === 'in-progress' 
    ? differenceInDays(new Date(), task.ngay_cap_nhat_cuoi) 
    : 0;
  const progressRate = task.progress / Math.max(daysInProgress, 1);
  const assigneeAvgCompletionTime = calculateAvgCompletionTime(task.assignee.taskHistory);
  
  // Gọi GPT-5-Nano với structured prompt
  const completion = await openaiClient.chat.completions.create({
    model: process.env.OPENAI_MODEL,
    messages: [
      {
        role: 'system',
        content: `Bạn là hệ thống dự báo rủi ro dự án. Phân tích task và trả về JSON với format:
{
  "risk_score": <0-100>,
  "risk_level": "low" | "medium" | "high",
  "reasoning": "Lý do ngắn gọn",
  "recommendations": ["Gợi ý 1", "Gợi ý 2"]
}`
      },
      {
        role: 'user',
        content: `Phân tích task sau:
- Tên: ${task.ten}
- Tiến độ hiện tại: ${task.progress}%
- Ngày deadline: ${format(task.deadline, 'yyyy-MM-dd')} (còn ${daysUntilDeadline} ngày)
- Đã in-progress: ${daysInProgress} ngày
- Tốc độ tiến độ: ${progressRate.toFixed(2)}% mỗi ngày
- Assignee trung bình hoàn thành tasks tương tự trong: ${assigneeAvgCompletionTime} ngày
- Số tasks active khác của assignee: ${task.assignee._count.tasks}

Dự báo nguy cơ trễ hạn.`
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });
  
  const prediction = JSON.parse(completion.choices[0].message.content!);
  
  // Lưu vào DB
  await prisma.task.update({
    where: { id: taskId },
    data: { 
      risk_score: prediction.risk_score,
      risk_level: prediction.risk_level,
      risk_updated_at: new Date()
    }
  });
  
  return prediction;
}
```

**Rationale**:
- **Context-aware**: GPT-5-Nano hiểu nhiều factors cùng lúc (progress rate, assignee history, workload)
- **Natural language reasoning**: Giải thích lý do bằng tiếng Việt dễ hiểu cho users
- **JSON mode**: Structured output, dễ parse và validate
- **No embeddings**: GPT-5-Nano xử lý trực tiếp, không cần vector operations
- **Cached**: Chỉ re-calculate mỗi 6h hoặc khi task update (giảm API calls)

**Alternatives Considered**:
- ~~Rule-based formula~~: `risk_score = f(daysLeft, progress, avgTime)` - đơn giản nhưng không linh hoạt, không có reasoning
- ~~ML model (scikit-learn)~~: Cần training data lớn, deployment phức tạp, overkill cho đồ án

#### 3.2 Batch Processing Strategy

**Problem**: 100 tasks active → 100 API calls tốn tiền

**Solution**: Batch API (beta feature của OpenAI)
```typescript
// Tạo batch file
const requests = tasks.map(task => ({
  custom_id: task.id,
  method: 'POST',
  url: '/v1/chat/completions',
  body: { /* prompt cho task */ }
}));

const batch = await openai.batches.create({
  input_file_id: uploadedFileId,
  endpoint: '/v1/chat/completions',
  completion_window: '24h'
});

// Giảm 50% cost cho batch requests, nhưng chậm hơn (1-24h)
// Chỉ dùng cho background re-calculation, không dùng cho realtime
```

### 4. AI Chat Assistant (User Story 4)

#### 4.1 Approach: Streaming Chat with Context

**Decision**: Chat Completions API với streaming + RAG pattern, dùng GPT-5-Nano

**Implementation Flow**:
```typescript
// app/api/ai/chat/route.ts
export async function POST(req: Request) {
  const { message, userId } = await req.json();
  
  // 1. Retrieve relevant context từ DB (RAG pattern)
  const userContext = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      tasks: { where: { trang_thai: { not: 'done' } }, take: 5 },
      department: { include: { projects: { take: 3 } } }
    }
  });
  
  // 2. Build context string
  const contextStr = `
User: ${userContext.ten} (${userContext.role})
Active tasks: ${userContext.tasks.map(t => `${t.ten} (${t.trang_thai}, risk: ${t.risk_score}%)`).join(', ')}
Recent projects: ${userContext.department.projects.map(p => p.ten).join(', ')}
`;
  
  // 3. Stream response
  const stream = await openaiClient.chat.completions.create({
    model: process.env.OPENAI_MODEL,
    messages: [
      {
        role: 'system',
        content: `Bạn là AI assistant của hệ thống quản lý dự án VSmart. Hỗ trợ users về:
- Gợi ý phân công tasks (dựa vào skills, workload)
- Dự báo rủi ro trễ hạn
- Chia nhỏ tasks thành subtasks
- Trả lời bằng tiếng Việt, ngắn gọn, actionable.

Context hiện tại của user:
${contextStr}`
      },
      {
        role: 'user',
        content: message
      }
    ],
    stream: true, // Enable streaming
    temperature: 0.7,
  });
  
  // 4. Return SSE stream
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
      }
      controller.close();
    }
  });
  
  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
  });
}
```

**Rationale**:
- **Streaming**: Trả response từng chunk (typewriter effect), UX tốt hơn, perceived latency thấp
- **RAG (Retrieval-Augmented Generation)**: Inject real-time data từ DB vào prompt → answers chính xác, grounded
- **GPT-5-Nano**: Fast enough cho streaming, cost minimal
- **Stateless**: Mỗi request độc lập, không cần manage conversation history phức tạp (có thể thêm sau nếu cần)

**Alternatives Considered**:
- ~~OpenAI Assistants API~~: Beta, phức tạp hơn, overkill cho use case đơn giản
- ~~LangChain~~: Thêm dependency lớn, không cần thiết khi chỉ dùng OpenAI

#### 4.2 Function Calling (Advanced)

**Optional Enhancement**: Cho phép AI gọi functions để thực hiện actions

```typescript
const tools = [
  {
    type: 'function',
    function: {
      name: 'assign_task',
      description: 'Gán task cho user cụ thể',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string' },
          assignee_id: { type: 'string' }
        }
      }
    }
  }
];

// User: "Gán task X cho developer A"
// GPT-5-Nano trả về function call → Backend execute → Confirm lại cho user
```

**Note**: Implement trong phase 3 nếu còn thời gian.

### 5. Technology Stack Details

#### 5.1 OpenAI Configuration

**Environment Setup**:
```bash
# .env.local (not committed)
OPENAI_API_KEY=sk-proj-...                            # OpenAI API key
OPENAI_MODEL=gpt-5-nano                               # Single model for all AI tasks
OPENAI_BASE_URL=https://api.openai.com/v1             # Optional: custom endpoint for local testing
```

**Client Implementation (OpenAI SDK v6.16.0)**:
```typescript
// lib/openai/client.ts
import OpenAI from 'openai';

export const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || undefined, // Falls back to default if not set
});

export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-nano';
```

**Usage Pattern**:
```typescript
// Any AI operation uses the same model
const completion = await openaiClient.chat.completions.create({
  model: OPENAI_MODEL,
  messages: [...],
  temperature: 0.3,
});
```

**Rationale**:
- **Centralized config**: Dễ thay đổi model hoặc endpoint mà không cần sửa code
- **Single model approach**: Tất cả AI features dùng GPT-5-Nano → cost optimization, simpler logic
- **Flexibility**: `OPENAI_BASE_URL` hỗ trợ switch sang Ollama/local models nếu cần offline
- **Latest SDK**: OpenAI SDK v6.16.0 với Responses API support, streaming improvements, WebSocket realtime API

#### 5.2 Frontend Stack

**Decision**:
- **Next.js 16.1.2** (App Router): SSR, RSC, API routes built-in
- **React 19.2.3**: Latest React with use directive support
- **TypeScript 5.9.3**: Type safety with latest language features
- **Tailwind CSS 4.1.18**: Utility-first styling, rapid development
- **shadcn/ui**: Pre-built accessible components (button, dialog, dropdown)
- **@dnd-kit/core**: Drag & drop cho kanban (lightweight, accessibility-first)
- **socket.io-client**: WebSocket cho realtime updates
- **TanStack Query (React Query)**: Data fetching, caching, optimistic updates
- **Zustand**: Lightweight state management (alternative: Jotai)

**Rationale**:
- **Next.js App Router**: Modern React patterns, streaming SSR, server components giảm bundle size
- **shadcn/ui**: Copy-paste components, không thêm library overhead, tuỳ biến dễ
- **TanStack Query**: Automatic refetching, cache invalidation, optimistic updates cho realtime UX

#### 5.3 Backend Stack

**Decision**:
- **Next.js API Routes 16.1.2+**: Fullstack trong một repo, App Router
- **Prisma 7.2.0**: ORM với TypeScript, migrations tự động, better performance
- **PostgreSQL 17+**: Relational DB (không cần pgvector extension nữa)
- **Socket.io 4.8.3**: Bidirectional realtime (fallback polling nếu WebSocket blocked)
- **Auth.js v5**: Authentication, support credentials + OAuth (successor to NextAuth.js v5)
- **Zod 4.3.5**: Runtime validation cho API inputs, 0 dependencies

**Rationale**:
- **Prisma 7.2.0**: Improved performance, reduced bundle size, better type inference
- **PostgreSQL 17+**: Latest version với JSON improvements, performance optimizations
- **Auth.js v5**: Active maintenance, better Next.js integration
- **All AI via GPT-5-Nano**: No vector operations, simpler DB schema

#### 5.4 Infrastructure

**Decision**:
- **Hosting**: Vercel (frontend + API routes)
  - Free tier: 100GB bandwidth/month, auto-scaling, global CDN
  - Serverless functions: 100 hours/month free (đủ cho development + demo)
  - Support Node.js 22.x LTS (latest LTS)
  - Full support for Next.js 16.1.2 App Router, streaming SSR
- **Database**: Supabase PostgreSQL 17+
  - Free tier: 500MB storage, 2GB bandwidth, unlimited API requests
  - Built-in auth, realtime subscriptions (alternative to Socket.io for DB changes)
  - Standard PostgreSQL (no pgvector needed)
  - Latest version with JSON enhancements
- **File Storage** (nếu cần avatars): Supabase Storage (1GB free)
- **Monitoring**: Vercel Analytics (free, Web Vitals tracking), Sentry v7.100+ (error tracking, improved TypeScript support, free tier 10K events/month)

**Rationale**:
- **Zero ops**: Không cần setup servers, databases, scaling tự động
- **Cost**: Toàn bộ free tier trong 12 tuần development, chỉ trả OpenAI API (< $0.20)
- **Demo-ready**: Deploy lên production URL ngay, không cần config DNS/SSL
- **Latest Stack**: All components are latest LTS or recent versions for security & performance

### 6. Development Workflow (12 Weeks)

#### Phase 1: Foundation (Weeks 1-3)

**Goals**: Setup project, auth, basic CRUD, database schema

**Tasks**:
- Week 1: Project setup (Next.js 16.1.2, Prisma 7.2.0, Supabase), auth (Auth.js v5), basic UI layout
- Week 2: Database schema (users, departments, projects, project_parts, tasks), migrations
- Week 3: CRUD APIs cho projects/tasks, basic kanban board (no drag-drop yet)

**Deliverables**: Users có thể login, tạo projects/tasks, xem list view

#### Phase 2: Realtime & Basic AI (Weeks 4-6)

**Goals**: Socket.io realtime, drag-drop kanban, GPT-5-Nano integration cơ bản

**Tasks**:
- Week 4: Socket.io setup, realtime task status updates, notifications component
- Week 5: Drag-drop kanban với @dnd-kit, optimistic updates
- Week 6: GPT-5-Nano API integration cho assignment suggestions (P2)

**Deliverables**: Realtime kanban board hoạt động, AI gợi ý assignee hoạt động

#### Phase 3: Advanced AI & Polish (Weeks 7-10)

**Goals**: Risk prediction, chat assistant, UI/UX polish

**Tasks**:
- Week 7-8: Risk prediction với GPT-5-Nano, risk badges trên kanban, notifications
- Week 9: AI chat sidebar với streaming, RAG context, dùng GPT-5-Nano
- Week 10: Skills management UI, skills matrix cho admin

**Deliverables**: Full AI features hoạt động, UI responsive đẹp

#### Phase 4: Testing & Demo Prep (Weeks 11-12)

**Goals**: Bug fixes, performance optimization, demo script

**Tasks**:
- Week 11: Manual testing toàn bộ flows, fix bugs, optimize queries (N+1 check)
- Week 12: Prepare demo data (seed DB với sample projects/tasks), viết báo cáo, slides

**Deliverables**: Hệ thống ổn định, demo mượt mà cho hội đồng

### 7. Performance Optimization Strategies

#### 7.1 Bundle Size Optimization

**Target**: < 200KB gzipped initial bundle

**Techniques**:
- **Code splitting**: Lazy load AI chat sidebar
  ```tsx
  const ChatSidebar = dynamic(() => import('@/components/chat/sidebar'), {
    loading: () => <Skeleton />,
    ssr: false // Client-side only
  });
  ```
- **Tree shaking**: Import specific components `import { Button } from '@/components/ui/button'`
- **Remove unused deps**: Audit với `npx depcheck`
- **Use Server Components**: Giảm client JS, render trên server

#### 7.2 Database Query Optimization

**Target**: < 100ms query time, no N+1 queries

**Techniques**:
- **Eager loading**: Prisma include/select
  ```tsx
  const tasks = await prisma.task.findMany({
    include: { 
      assignee: { select: { id: true, ten: true, avatar: true } },
      projectPart: { select: { ten: true } }
    }
  });
  ```
- **Pagination**: 20 items per page
- **Indexing**: Index trên `assignee_id`, `trang_thai`, `deadline`, `department_id`
- **pgvector index**: HNSW index cho skills_vector
  ```sql
  CREATE INDEX ON users USING hnsw (skills_vector vector_cosine_ops);
  ```

#### 7.3 API Response Time

**Target**: < 200ms (p95) cho CRUD, < 1s cho AI endpoints

**Techniques**:
- **Caching**: TanStack Query cache 5 phút cho tasks list
- **Debouncing**: Search/filter inputs debounce 300ms
- **Optimistic updates**: Update UI ngay, rollback nếu API fails
- **Edge functions**: Deploy API routes lên Vercel Edge (nếu compatible)

### 8. Security & Best Practices

#### 8.1 API Key Management

**CRITICAL**: Không commit OpenAI API key vào Git

**Setup**:
```bash
# .env.local (not committed)
OPENAI_API_KEY=sk-proj-...
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

**Vercel deployment**: Add env vars qua dashboard UI

#### 8.2 Rate Limiting

**Problem**: Users spam AI endpoints → tốn tiền

**Solution**:
```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests/minute
});

// app/api/ai/chat/route.ts
const { success } = await ratelimit.limit(userId);
if (!success) {
  return new Response('Rate limit exceeded', { status: 429 });
}
```

**Note**: Upstash Redis có free tier 10K requests/day

#### 8.3 Input Validation

**Use Zod** cho all API inputs:
```typescript
const createTaskSchema = z.object({
  ten: z.string().min(3).max(200),
  mo_ta: z.string().optional(),
  deadline: z.string().datetime(),
  assignee_id: z.string().uuid()
});

// Validate
const body = createTaskSchema.parse(await req.json());
```

### 9. Monitoring & Debugging

#### 9.1 OpenAI Usage Tracking

**Dashboard**: https://platform.openai.com/usage

**Log locally**:
```typescript
const completion = await openaiClient.chat.completions.create({...});
console.log('OpenAI usage:', {
  model: OPENAI_MODEL,
  prompt_tokens: completion.usage!.prompt_tokens,
  completion_tokens: completion.usage!.completion_tokens,
  // GPT-5-Nano pricing: TBD, typically lower than GPT-4o-mini
  total_tokens: completion.usage!.total_tokens
});
```

#### 9.2 Performance Monitoring

**Vercel Analytics**: Built-in Web Vitals (FCP, LCP, TBT)

**Custom logging**:
```typescript
// lib/logger.ts
export function logApiTiming(endpoint: string, duration: number) {
  if (duration > 200) {
    console.warn(`Slow API: ${endpoint} took ${duration}ms`);
  }
}
```

### 10. Documentation Standards

**Tất cả functions PHẢI có JSDoc**:
```typescript
/**
 * Gợi ý top 3 người phù hợp nhất cho task
 * @param moTaTask - Mô tả task (dùng để GPT-5-Nano matching)
 * @param phongBanId - ID phòng ban để filter candidates
 * @returns Promise<DanhSachGoiY[]> - Danh sách gợi ý với match score
 */
async function goiYNguoiPhuTrach(
  moTaTask: string, 
  phongBanId: string
): Promise<DanhSachGoiY[]> {
  // Implementation
}
```

**Naming convention** (tuân theo Constitution I):
- Variables/Functions: tiếng Việt không dấu, camelCase: `nguoiDung`, `taoTask()`
- Types/Interfaces: PascalCase: `NguoiDung`, `DuAn`
- Constants: UPPER_SNAKE_CASE: `MAX_TASKS_PER_USER`

## Summary of Key Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **AI Model** | GPT-5-Nano only | Unified approach, ultra-fast, minimal cost < $0.20 |
| **Assignment Logic** | GPT-5-Nano direct analysis | No embeddings needed, simpler logic, semantic reasoning |
| **Risk Prediction** | GPT-5-Nano prompting | Context-aware, natural reasoning, no training needed |
| **Chat** | Streaming + RAG with GPT-5-Nano | Real-time UX, grounded answers với DB context |
| **Stack** | Next.js fullstack | Monorepo đơn giản, Vercel deploy dễ |
| **Database** | Supabase PostgreSQL (standard) | Free tier, no pgvector extension needed |
| **Realtime** | Socket.io | Bidirectional, fallback polling |
| **Auth** | NextAuth.js | Popular, flexible |
| **Deployment** | Vercel + Supabase | Zero ops, free tiers, production-ready |
| **Total Cost** | < $0.20 for 12 weeks | GPT-5-Nano pricing, free infrastructure |
| **Environment Config** | OPENAI_API_KEY, OPENAI_MODEL, OPENAI_BASE_URL | Flexible endpoint switching |

## Next Steps

1. ✅ Proceed to Phase 1: Create `data-model.md` với Prisma schema chi tiết (bỏ pgvector)
2. ✅ Create `contracts/` với OpenAPI specs cho REST endpoints
3. ✅ Create `quickstart.md` với setup instructions
4. ⏭️ Validate Constitution Check trong `plan.md`
