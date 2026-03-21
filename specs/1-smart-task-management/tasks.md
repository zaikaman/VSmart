# Tasks: Hệ Thống Quản Lý Công Việc Thông Minh

**Input**: Design documents from `/specs/1-smart-task-management/`  
**Prerequisites**: plan.md (✅), spec.md (✅), research.md (✅), data-model.md (✅), contracts/openapi.yaml (✅)

**Tests**: Không bắt buộc theo constitution. Tasks dưới đây tập trung vào implementation.

**Organization**: Tasks được tổ chức theo user story để enable independent implementation và testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Có thể chạy song song (different files, không có dependencies)
- **[Story]**: User story mà task này thuộc về (US1, US2, US3, US4, US5)
- File paths rõ ràng trong descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Khởi tạo project và cấu trúc cơ bản

- [X] T001 Create Next.js 16.1.2 project với TypeScript 5.9.3 strict mode tại d:\VSmart
- [X] T002 Install dependencies: React 19.2.3, Tailwind 4.1.18, Prisma 7.2.0, Auth.js v5, Socket.io 4.8.3, OpenAI SDK 6.16.0, Zod 4.3.5
- [X] T003 [P] Configure ESLint và Prettier theo .eslintrc.json và .prettierrc
- [X] T004 [P] Setup Tailwind config tại tailwind.config.ts với theme (màu risk: xanh/vàng/đỏ)
- [X] T005 [P] Create .env.example với OPENAI_API_KEY, OPENAI_MODEL, OPENAI_BASE_URL, DATABASE_URL
- [X] T006 Setup Supabase PostgreSQL 17+ project và lấy DATABASE_URL
- [X] T007 [P] Install shadcn/ui components: button, dialog, dropdown-menu, input, select, badge, skeleton, toast tại components/ui/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure PHẢI hoàn thành trước khi implement bất kỳ user story nào

**⚠️ CRITICAL**: Không có user story nào có thể bắt đầu cho đến khi phase này hoàn thành

- [x] T008 Create Prisma schema tại prisma/schema.prisma với 9 entities: PhongBan, NguoiDung, KyNangNguoiDung, DuAn, PhanDuAn, Task, GoiYPhanCong, LichSuTask, ThongBao (theo data-model.md)
- [x] T009 Run prisma migrate dev để tạo initial migration tại prisma/migrations/
- [x] T010 [P] Create Prisma client singleton tại lib/db/prisma.ts
- [x] T011 [P] Setup Auth.js v5 config tại lib/auth/auth-config.ts với credentials provider
- [x] T012 [P] Create auth API route tại app/api/auth/[...auth]/route.ts
- [x] T013 [P] Implement getSession helper tại lib/auth/get-session.ts
- [x] T014 [P] Create withAuth HOC tại lib/auth/with-auth.ts cho protected routes
- [x] T015 [P] Setup OpenAI client singleton tại lib/openai/client.ts với env vars (OPENAI_API_KEY, OPENAI_MODEL, OPENAI_BASE_URL)
- [x] T016 [P] Create Zod validation schemas tại lib/validations/project.schema.ts
- [x] T017 [P] Create Zod validation schemas tại lib/validations/task.schema.ts
- [x] T018 [P] Create Zod validation schemas tại lib/validations/user.schema.ts
- [x] T019 [P] Setup Socket.io server tại lib/socket/server.ts
- [x] T020 [P] Create Socket.io client hook tại lib/socket/client.ts
- [x] T021 [P] Define Socket.io event types tại lib/socket/events.ts
- [x] T022 [P] Create API socket handler tại app/api/socket/route.ts
- [x] T023 [P] Create root layout tại app/layout.tsx với Providers (TanStack Query, Zustand, Socket)
- [x] T024 [P] Create dashboard layout tại app/(dashboard)/layout.tsx với sidebar và header
- [x] T025 [P] Create dashboard header component tại components/layouts/dashboard-header.tsx
- [x] T026 [P] Create dashboard sidebar component tại components/layouts/dashboard-sidebar.tsx
- [x] T027 [P] Create loading spinner component tại components/shared/loading-spinner.tsx
- [x] T028 [P] Create error boundary component tại components/shared/error-boundary.tsx
- [x] T029 [P] Create seed script tại prisma/seed.ts với demo data (5 projects, 30 tasks, 10 users)
- [x] T030 Run npm run seed để populate database

**Checkpoint**: Foundation ready - user story implementation có thể bắt đầu song song

---

## Phase 3: User Story 1 - Tạo Dự Án Và Phân Công Cơ Bản (Priority: P1) 🎯 MVP

**Goal**: Quản lý có thể tạo dự án, chia phần dự án cho phòng ban, phân công tasks cho cá nhân. Hiển thị kanban board với drag-drop và realtime updates.

**Independent Test**: Quản lý tạo dự án "Website Redesign", chia phần "Frontend Development" cho phòng Engineering, tạo task "Implement Homepage UI" giao cho developer A. Task xuất hiện trong kanban board của developer A ở cột "todo". Developer A kéo task sang "in-progress", developer B thấy update realtime.

### Implementation for User Story 1

#### Models & Database

- [X] T031 [P] [US1] Verify DuAn model có đầy đủ fields: id, ten, moTa, deadline, trangThai, nguoiTaoId, phanTramHoanThanh trong prisma/schema.prisma
- [X] T032 [P] [US1] Verify PhanDuAn model có fields: id, ten, moTa, deadline, duAnId, phongBanId, trangThai, phanTramHoanThanh
- [X] T033 [P] [US1] Verify Task model có fields: id, ten, moTa, deadline, phanDuAnId, assigneeId, trangThai, priority, progress, riskScore

#### API Endpoints - Projects

- [X] T034 [P] [US1] Implement GET /api/projects endpoint tại app/api/projects/route.ts với pagination (20/page) và filter trangThai
- [X] T035 [P] [US1] Implement POST /api/projects endpoint tại app/api/projects/route.ts với Zod validation
- [X] T036 [P] [US1] Implement GET /api/projects/[id] endpoint tại app/api/projects/[id]/route.ts với include parts
- [X] T037 [P] [US1] Implement PATCH /api/projects/[id] endpoint tại app/api/projects/[id]/route.ts
- [X] T038 [P] [US1] Implement DELETE /api/projects/[id] endpoint (soft delete) tại app/api/projects/[id]/route.ts

#### API Endpoints - Project Parts

- [X] T039 [P] [US1] Implement POST /api/projects/[id]/parts endpoint tại app/api/projects/[id]/parts/route.ts
- [X] T040 [P] [US1] Implement GET /api/project-parts/[id] endpoint tại app/api/project-parts/[id]/route.ts
- [X] T041 [P] [US1] Implement PATCH /api/project-parts/[id] endpoint tại app/api/project-parts/[id]/route.ts
- [X] T042 [P] [US1] Implement DELETE /api/project-parts/[id] endpoint (soft delete) tại app/api/project-parts/[id]/route.ts

#### API Endpoints - Tasks

- [X] T043 [P] [US1] Implement GET /api/tasks endpoint tại app/api/tasks/route.ts với pagination, filters (trangThai, assigneeId, deadline)
- [X] T044 [P] [US1] Implement POST /api/tasks endpoint tại app/api/tasks/route.ts với Zod validation
- [X] T045 [P] [US1] Implement GET /api/tasks/[id] endpoint tại app/api/tasks/[id]/route.ts với include assignee
- [X] T046 [P] [US1] Implement PATCH /api/tasks/[id] endpoint tại app/api/tasks/[id]/route.ts (update trangThai, progress)
- [X] T047 [P] [US1] Implement DELETE /api/tasks/[id] endpoint (soft delete) tại app/api/tasks/[id]/route.ts

#### React Query Hooks

- [X] T048 [P] [US1] Create useProjects hook tại lib/hooks/use-projects.ts với useQuery, useMutation (create, update, delete)
- [X] T049 [P] [US1] Create useTasks hook tại lib/hooks/use-tasks.ts với useQuery, useMutation
- [X] T050 [P] [US1] Create useSocket hook tại lib/hooks/use-socket.ts để listen task updates

#### UI Components - Projects

- [X] T051 [P] [US1] Create project-card component tại components/projects/project-card.tsx
- [X] T052 [P] [US1] Create project-list component tại components/projects/project-list.tsx
- [X] T053 [US1] Create create-project-modal component tại components/projects/create-project-modal.tsx (depends on T051, T052)
- [X] T054 [US1] Create projects page tại app/(dashboard)/projects/page.tsx (depends on T051-T053)

#### UI Components - Kanban Board

- [X] T055 [P] [US1] Install @dnd-kit/core v6.2+ và @dnd-kit/sortable
- [X] T056 [P] [US1] Create kanban-card component tại components/kanban/kanban-card.tsx với draggable
- [X] T057 [P] [US1] Create kanban-column component tại components/kanban/kanban-column.tsx với droppable
- [X] T058 [US1] Create kanban-board component tại components/kanban/kanban-board.tsx với DndContext (depends on T056, T057)
- [X] T059 [US1] Create kanban page tại app/(dashboard)/kanban/page.tsx với useSocket realtime updates (depends on T058)
- [X] T060 [US1] Create create-task-modal component tại components/kanban/create-task-modal.tsx (basic version, no AI yet)
- [X] T061 [US1] Create task-detail-modal component tại components/kanban/task-detail-modal.tsx

#### Socket.io Realtime Integration

- [X] T062 [US1] Implement task status change broadcast trong Socket.io server tại lib/socket/server.ts
- [X] T063 [US1] Implement Socket.io listeners trong kanban-board.tsx để update UI khi nhận event
- [X] T064 [US1] Add optimistic updates cho drag-drop actions trong kanban-board.tsx

#### Progress Calculation

- [X] T065 [P] [US1] Create calculateProgress utility tại lib/utils/calculate-progress.ts
- [X] T066 [US1] Implement auto-update phanTramHoanThanh cho PhanDuAn khi tasks change status
- [X] T067 [US1] Implement auto-update phanTramHoanThanh cho DuAn khi parts change status

**Checkpoint**: User Story 1 hoàn toàn functional. Users có thể tạo projects, parts, tasks, và sử dụng kanban board với realtime updates.

---

## Phase 4: User Story 2 - Gợi Ý Phân Công Tự Động Bằng AI (Priority: P2)

**Goal**: AI gợi ý top 3 người phù hợp nhất khi tạo task mới, dựa trên skills, completion rate, workload.

**Independent Test**: Trưởng phòng tạo task "Optimize Database Queries" với description chứa "SQL" và "Performance Tuning". AI gợi ý developer B (5 năm SQL, 95% on-time), developer C (3 năm, 90%), developer D (2 năm, 88%). Trưởng phòng chọn developer B và task được gán thành công.

### Implementation for User Story 2

#### OpenAI GPT-5-Nano Integration

- [X] T068 [P] [US2] Create system prompts library tại lib/openai/prompts/system-prompts.ts cho assignment matching
- [X] T069 [P] [US2] Implement goiYPhanCong function tại lib/openai/assignment-suggestion.ts với GPT-5-Nano direct analysis
- [X] T070 [US2] Implement POST /api/ai/suggest-assignee endpoint tại app/api/ai/suggest-assignee/route.ts (depends on T069)

#### Database & Models

- [X] T071 [P] [US2] Verify GoiYPhanCong model có fields: taskId, suggestedUserId, matchScore, reasoning (JSON), accepted
- [X] T072 [P] [US2] Create helper để lưu AI suggestions vào GoiYPhanCong table

#### UI Components

- [X] T073 [US2] Update create-task-modal.tsx để gọi AI suggestions khi nhập task title và description
- [X] T074 [US2] Add AI suggestions list UI trong create-task-modal.tsx với top 3 users, match scores, reasoning
- [X] T075 [US2] Add "Chọn thủ công" option trong create-task-modal.tsx với dropdown toàn bộ members
- [X] T076 [US2] Add loading spinner và "Không có gợi ý phù hợp" fallback message

#### Tracking & Analytics

- [X] T077 [P] [US2] Log AI suggestion acceptance rate (track accepted=true/false trong GoiYPhanCong)
- [X] T078 [P] [US2] Add metric logging cho AI call latency và cost estimation

**Checkpoint**: AI assignment suggestions hoạt động. Users thấy top 3 gợi ý với reasoning và có thể chấp nhận hoặc chọn thủ công.

---

## Phase 5: User Story 3 - Dự Báo Rủi Ro Trễ Hạn (Priority: P3)

**Goal**: Hệ thống tự động phân tích tiến độ tasks và dự báo rủi ro trễ hạn. Tasks có risk cao đánh dấu đỏ, users nhận notifications.

**Independent Test**: Task "API Integration" có deadline 2026-02-01, đã in-progress 10 ngày nhưng progress 0%. Hệ thống đánh dấu đỏ với "High Risk - 85%". Quản lý nhận notification "Task X has 85% delay risk - Review needed".

### Implementation for User Story 3

#### OpenAI GPT-5-Nano Risk Analysis

- [X] T079 [P] [US3] Create risk analysis prompts tại lib/openai/prompts/system-prompts.ts
- [X] T080 [P] [US3] Implement duBaoRuiRo function tại lib/openai/risk-prediction.ts với GPT-5-Nano
- [X] T081 [US3] Implement POST /api/ai/predict-risk endpoint tại app/api/ai/predict-risk/route.ts (depends on T080)

#### Background Risk Calculation

- [X] T082 [P] [US3] Create risk-utils.ts tại lib/utils/risk-utils.ts với calculateRiskLevel function (0-40: low, 40-70: medium, >70: high)
- [X] T083 [P] [US3] Implement cron job endpoint cho cron-job.org tại app/api/cron/calculate-risks/route.ts
- [X] T084 [US3] Update Task.riskScore trong database khi risk analysis complete

#### UI Components

- [X] T085 [P] [US3] Create risk-badge component tại components/kanban/risk-badge.tsx với màu sắc (xanh/vàng/đỏ)
- [X] T086 [US3] Add risk-badge vào kanban-card.tsx để hiển thị risk level
- [X] T087 [US3] Add risk filtering trong kanban page (filter by risk level)

#### Notifications

- [X] T088 [P] [US3] Verify ThongBao model có fields: userId, type (risk_alert/stale_task/assignment), message, relatedTaskId, read
- [X] T089 [P] [US3] Implement POST /api/notifications endpoint để tạo notification khi risk >70%
- [X] T090 [P] [US3] Implement GET /api/notifications endpoint tại app/api/notifications/route.ts
- [X] T091 [P] [US3] Implement PATCH /api/notifications/[id]/read endpoint tại app/api/notifications/[id]/read/route.ts
- [X] T092 [P] [US3] Create notification-bell component tại components/notifications/notification-bell.tsx
- [X] T093 [P] [US3] Create notification-item component tại components/notifications/notification-item.tsx
- [X] T094 [US3] Create useNotifications hook tại lib/hooks/use-notifications.ts
- [X] T095 [US3] Add notification-bell vào Sidebar.tsx

#### Stale Task Detection

- [X] T096 [P] [US3] Implement stale task detection (in-progress >7 ngày không update) trong cron job
- [X] T097 [US3] Send notification khi task bị stale cho assignee và manager

**Checkpoint**: Risk prediction hoạt động realtime hoặc background. Tasks có risk badges, users nhận notifications cho high-risk và stale tasks.

---

## Phase 6: User Story 4 - Chat Với AI Assistant (Priority: P4)

**Goal**: Users có thể mở chat sidebar và hỏi AI về projects, tasks, gợi ý phân công, breakdown tasks.

**Independent Test**: Quản lý mở chat, gõ "Task 'API Integration' có nguy cơ trễ không?". AI trả lời "Task 'API Integration' có 85% nguy cơ trễ hạn vì in-progress 10 ngày với 0% progress. Gợi ý: reassign hoặc break down thành smaller tasks."

### Implementation for User Story 4

#### OpenAI Streaming Chat

- [X] T098 [P] [US4] Create chat prompts tại lib/openai/prompts/chat-prompts.ts với system prompt cho RAG context
- [X] T099 [P] [US4] Implement chat completion với streaming tại lib/openai/chat-completion.ts
- [X] T100 [US4] Implement POST /api/ai/chat endpoint với Server-Sent Events streaming tại app/api/ai/chat/route.ts (depends on T099)

#### RAG Context Injection

- [X] T101 [US4] Implement context fetching: user's active tasks, recent projects, team members trong chat endpoint
- [X] T102 [US4] Format context thành structured prompt cho GPT-5-Nano

#### UI Components

- [X] T103 [P] [US4] Create chat-message component tại components/chat/chat-message.tsx với user/assistant bubbles
- [X] T104 [P] [US4] Create chat-input component tại components/chat/chat-input.tsx với loading state
- [X] T105 [US4] Create chat-sidebar component tại components/chat/chat-sidebar.tsx với message history và streaming typewriter effect (depends on T103, T104)
- [X] T106 [US4] Add chat icon button vào dashboard layout để toggle sidebar
- [X] T107 [US4] Implement chat history persistence (localStorage hoặc database)

#### Natural Language Understanding

- [X] T108 [US4] Test AI với các câu hỏi phổ biến: "Ai phù hợp làm task X?", "Task Y có risk không?", "Gợi ý chia nhỏ task Z"
- [X] T109 [US4] Add fallback message cho unclear questions: "Bạn muốn hỏi về task nào? Vui lòng cung cấp task ID hoặc tên."

**Checkpoint**: Chat sidebar hoạt động với streaming responses. AI trả lời dựa trên dữ liệu thực của hệ thống.

---

## Phase 7: User Story 5 - Quản Lý Kỹ Năng Người Dùng (Priority: P5)

**Goal**: Users hoặc admin có thể cập nhật skills profile. Skills này improve AI matching accuracy (US2).

**Independent Test**: Developer A vào profile, thêm skill "React" (expert), "Node.js" (advanced), "SQL" (intermediate). Khi tạo task yêu cầu React, developer A xuất hiện top 1 trong AI suggestions. Admin xem skills matrix thấy 5 người biết React.

### Implementation for User Story 5

#### Database & Models

- [X] T110 [P] [US5] Verify KyNangNguoiDung model có fields: userId, tenKyNang, trinhDo (enum: beginner/intermediate/advanced/expert), namKinhNghiem

#### API Endpoints

- [X] T111 [P] [US5] Implement GET /api/users/me endpoint tại app/api/users/me/route.ts
- [X] T112 [P] [US5] Implement GET /api/users/me/skills endpoint tại app/api/users/me/skills/route.ts
- [X] T113 [P] [US5] Implement POST /api/users/me/skills endpoint để add skill
- [X] T114 [P] [US5] Implement PATCH /api/users/me/skills/[id] endpoint để update proficiency level
- [X] T115 [P] [US5] Implement DELETE /api/users/me/skills/[id] endpoint
- [X] T116 [P] [US5] Implement GET /api/admin/skills-matrix endpoint tại app/api/admin/skills-matrix/route.ts (aggregate skills data)

#### UI Components - User Profile

- [X] T117 [P] [US5] Create skills-input component tại components/skills/skills-input.tsx với autocomplete common skills
- [X] T118 [P] [US5] Create skills-list component tại components/skills/skills-list.tsx
- [X] T119 [US5] Update profile page tại app/dashboard/profile/page.tsx với user info và skills management (depends on T117, T118)

#### UI Components - Admin Skills Matrix

- [X] T120 [P] [US5] Create skills-matrix component tại components/skills/skills-matrix.tsx (table: skills × proficiency levels)
- [X] T121 [US5] Create admin skills matrix page tại app/dashboard/admin/skills-matrix/page.tsx (depends on T120)

#### AI Integration Enhancement

- [X] T122 [US5] Update goiYPhanCong function trong lib/openai/assignment-suggestion.ts để include skills data trong matching algorithm
- [X] T123 [US5] Cải thiện matching accuracy với synonyms, fuzzy matching và điều chỉnh trọng số skills

**Checkpoint**: Skills management hoàn chỉnh. AI suggestions có độ chính xác cao hơn nhờ skills data.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Bug fixes, performance optimization, demo preparation

### Performance & Optimization

- [x] T124 [P] Optimize database queries: verify no N+1, add indexes cho common filters (assigneeId + trangThai, deadline, riskScore)
- [x] T125 [P] Implement pagination cho all list views (projects, tasks, notifications)
- [x] T126 [P] Add React Query caching strategies với staleTime và cacheTime optimization
- [x] T127 [P] Code-split AI chat feature với dynamic import để giảm initial bundle
- [x] T128 [P] Lazy load non-critical components (profile page, admin pages)
- [x] T129 [P] Optimize images với next/image và WebP format
- [ ] T130 Run Lighthouse audit, target score >90 (performance, accessibility, SEO)

### Error Handling & Logging

- [ ] T131 [P] Add comprehensive error handling cho OpenAI API calls (rate limit, timeout, network errors)
- [ ] T132 [P] Add error handling cho Socket.io connection failures với retry logic
- [ ] T133 [P] Create logger utility tại lib/logger.ts với structured JSON logging
- [ ] T134 [P] Log all API calls với duration, status, endpoint
- [ ] T135 [P] Log all OpenAI calls với model, tokens, cost estimation

### Security

- [ ] T136 [P] Add rate limiting cho API routes (10 req/min per user)
- [ ] T137 [P] Add rate limiting cho AI endpoints (5 req/min per user)
- [ ] T138 [P] Validate all user inputs với Zod schemas
- [ ] T139 [P] Add CSRF protection cho forms
- [ ] T140 Run npm audit và fix vulnerabilities

### Testing & Quality Assurance

- [ ] T141 Manual test User Story 1: Tạo project → part → task → kanban drag-drop → realtime updates
- [ ] T142 Manual test User Story 2: Tạo task → AI suggestions → chấp nhận hoặc manual → verify accuracy
- [ ] T143 Manual test User Story 3: Task với risk → verify badge màu đúng → notification → stale detection
- [ ] T144 Manual test User Story 4: Chat AI → hỏi về task → risk → breakdown → verify streaming
- [ ] T145 Manual test User Story 5: Add skills → verify profile → admin matrix → verify AI matching improvement
- [ ] T146 Cross-browser testing: Chrome, Firefox, Safari, Edge
- [ ] T147 Mobile responsive testing: iOS Safari, Android Chrome
- [ ] T148 Load testing: 50 concurrent users với realistic scenarios
- [ ] T149 Fix all critical và high-priority bugs discovered

### Demo Preparation

- [ ] T150 [P] Update seed script với realistic demo data: 5 projects, 30 tasks (mix of todo/in-progress/done), 10 users với skills
- [ ] T151 [P] Create demo credentials document (admin@vsmart.vn, manager@vsmart.vn, dev@vsmart.vn với passwords)
- [ ] T152 [P] Create demo script (15-phút flow): login → show projects → create task → AI suggestions → kanban → chat AI → risk alerts
- [ ] T153 [P] Record backup video demo (fallback cho live demo failures)
- [ ] T154 Deploy to Vercel production với domain vsmart.vercel.app
- [ ] T155 Verify production deployment: test all user stories end-to-end
- [ ] T156 Setup monitoring: Vercel Analytics, OpenAI usage dashboard, Sentry error tracking

### Documentation

- [ ] T157 [P] Update README.md với setup instructions, demo credentials, features overview
- [ ] T158 [P] Document API endpoints với example requests/responses
- [ ] T159 [P] Create architecture diagram (Next.js → Prisma → PostgreSQL → OpenAI → Socket.io)
- [ ] T160 [P] Document OpenAI cost optimization strategies
- [ ] T161 [P] Prepare presentation slides (20-25 slides): problem, solution, architecture, demo, results
- [ ] T162 Write báo cáo đồ án draft: introduction, methodology, implementation, results, conclusion

---

## Phase 9: User Story 6 - Subtasks, Templates & Rich Task Execution (Priority: P6)

**Goal**: Làm task đủ “sâu” để dùng thật: checklist/subtasks, attachments, task templates, recurring tasks và AI breakdown cho task lớn.

**Independent Test**: Quản lý tạo task "Build Authentication System", AI gợi ý 6 checklist items, người dùng chỉnh sửa checklist, đính kèm tài liệu yêu cầu, lưu task thành template và dùng lại template đó cho sprint sau. Hệ thống tự sinh recurring task "Daily report" mỗi ngày làm việc.

### Implementation for User Story 6

#### Database & Models

- [ ] T163 [P] [US6] Create TaskChecklistItem model với fields: id, taskId, title, isDone, sortOrder, createdAt
- [ ] T164 [P] [US6] Create TaskAttachment model với fields: id, taskId, fileName, fileUrl, mimeType, size, uploadedBy, createdAt
- [ ] T165 [P] [US6] Create TaskTemplate model với fields: id, ten, moTa, defaultPriority, checklistTemplate, createdBy, isShared
- [ ] T166 [P] [US6] Create RecurringTaskRule model với fields: id, title, description, priority, cronExpression, phanDuAnId, assigneeId, nextRunAt, isActive

#### API Endpoints

- [ ] T167 [P] [US6] Implement GET/POST /api/tasks/[id]/checklist endpoint tại app/api/tasks/[id]/checklist/route.ts
- [ ] T168 [P] [US6] Implement PATCH/DELETE /api/tasks/[id]/checklist/[checklistId] endpoint để update trạng thái, reorder và xóa checklist item
- [ ] T169 [P] [US6] Implement POST /api/tasks/[id]/attachments endpoint tại app/api/tasks/[id]/attachments/route.ts với upload validation
- [ ] T170 [P] [US6] Implement GET/DELETE /api/tasks/[id]/attachments/[attachmentId] endpoint
- [ ] T171 [P] [US6] Implement GET/POST /api/task-templates endpoint để lưu và lấy templates
- [ ] T172 [P] [US6] Implement POST /api/task-templates/[id]/instantiate endpoint để tạo task mới từ template
- [ ] T173 [US6] Implement POST /api/cron/generate-recurring-tasks endpoint để tự tạo recurring tasks theo rule

#### UI Components

- [ ] T174 [P] [US6] Add checklist section vào task-detail-modal.tsx với add/edit/check/reorder items
- [ ] T175 [P] [US6] Add attachment uploader và file list vào task-detail-modal.tsx
- [ ] T176 [US6] Update create-task-modal.tsx để chọn template khi tạo task mới
- [ ] T177 [US6] Update edit-task-modal.tsx để cấu hình recurring rule cho task định kỳ

#### AI Enhancements

- [ ] T178 [P] [US6] Create AI breakdown prompt + function tại lib/openai/task-breakdown.ts để sinh subtasks/checklist từ title + description
- [ ] T179 [US6] Add "Tạo checklist bằng AI" action trong create-task-modal.tsx và chat-sidebar.tsx

#### Progress & Validation

- [ ] T180 [P] [US6] Implement auto-rollup progress từ checklist completion sang task.progress với override thủ công khi cần
- [ ] T181 [US6] Manual test User Story 6: AI breakdown → checklist → attachments → template reuse → recurring generation

**Checkpoint**: Tasks không còn phẳng; người dùng có thể triển khai công việc chi tiết, tái sử dụng template và quản lý tài liệu ngay trong task.

---

## Phase 10: User Story 7 - Planning, Timeline & Workload Intelligence (Priority: P7)

**Goal**: Bổ sung góc nhìn planning ngoài kanban: calendar/timeline, capacity theo người và dự báo trễ tiến độ ở cấp dự án.

**Independent Test**: Quản lý mở timeline của dự án, thấy toàn bộ tasks theo ngày, kéo deadline một task sang ngày khác, hệ thống cảnh báo xung đột tài nguyên. Màn hình workload cho thấy developer A đang quá tải 7 tasks còn developer B chỉ có 2 tasks nên AI ưu tiên B ở lần suggest tiếp theo.

### Implementation for User Story 7

#### Planning Queries & Aggregations

- [ ] T182 [P] [US7] Create workload aggregation helper tại lib/utils/workload-utils.ts để tính active tasks, estimated capacity, overdue load
- [ ] T183 [P] [US7] Create planning query service tại lib/planning/planning-service.ts để gom tasks theo date range, assignee và project
- [ ] T184 [P] [US7] Extend stats API để trả về upcoming deadlines, overdue tasks, workload summary, risk trends

#### API Endpoints

- [ ] T185 [P] [US7] Implement GET /api/planning/calendar endpoint với filters: projectId, assigneeId, dateFrom, dateTo
- [ ] T186 [P] [US7] Implement GET /api/planning/workload endpoint để trả về workload theo user/department/project
- [ ] T187 [P] [US7] Implement PATCH /api/tasks/[id]/reschedule endpoint với validation conflict, holiday/weekend warnings
- [ ] T188 [P] [US7] Implement GET /api/projects/[id]/forecast endpoint để dự báo khả năng chậm deadline của toàn dự án

#### UI Components - Planning Views

- [ ] T189 [P] [US7] Create calendar-view component tại components/planning/calendar-view.tsx
- [ ] T190 [P] [US7] Create timeline-view component tại components/planning/timeline-view.tsx (gantt-lite, không cần full dependency engine)
- [ ] T191 [P] [US7] Create workload-heatmap component tại components/planning/workload-heatmap.tsx
- [ ] T192 [US7] Create planning page tại app/dashboard/planning/page.tsx với tab Calendar, Timeline, Workload
- [ ] T193 [US7] Add drag-to-reschedule interaction từ calendar/timeline và optimistic updates

#### UX & Decision Support

- [ ] T194 [P] [US7] Add capacity badges cho users trong create-task-modal.tsx và project-members-manager.tsx
- [ ] T195 [P] [US7] Add overload warning rules (>5 in-progress hoặc >X estimated hours) vào assignment suggestion pipeline
- [ ] T196 [US7] Surface project forecast banner ở project detail page khi nguy cơ slip cao
- [ ] T197 [US7] Add dashboard widgets: deadline tuần này, người quá tải, project có nguy cơ trễ

#### Performance & Validation

- [ ] T198 [P] [US7] Optimize planning views với date-range pagination hoặc virtualization cho datasets lớn
- [ ] T199 [P] [US7] Add caching strategy riêng cho planning endpoints và background prefetch cho view switch
- [ ] T200 [US7] Manual test User Story 7: calendar/timeline/workload → reschedule → overload warnings → forecast

**Checkpoint**: Hệ thống có khả năng planning thực thụ, không chỉ theo dõi trạng thái.

---

## Phase 11: User Story 8 - AI Summaries, Rebalancing & Proactive Suggestions (Priority: P8)

**Goal**: Chuyển AI từ dạng “hỏi gì trả lời nấy” sang dạng chủ động: tóm tắt, cảnh báo, đề xuất rebalance và giải thích rủi ro.

**Independent Test**: Trưởng nhóm mở dashboard vào sáng thứ Hai và thấy AI summary "3 task rủi ro cao nhất", "2 thành viên quá tải", "1 dự án có nguy cơ trễ 68%". Khi tạo task với deadline quá ngắn, hệ thống cảnh báo ngay. Người dùng bấm "AI rebalance" và nhận gợi ý chuyển 2 task từ developer A sang B/C.

### Implementation for User Story 8

#### AI Prompting & Services

- [ ] T201 [P] [US8] Create summary prompts cho daily digest, weekly digest, blocker analysis, executive brief tại lib/openai/prompts/summary-prompts.ts
- [ ] T202 [P] [US8] Implement aiDailySummary service tại lib/openai/daily-summary.ts
- [ ] T203 [P] [US8] Implement aiWeeklySummary service tại lib/openai/weekly-summary.ts
- [ ] T204 [P] [US8] Implement aiRebalanceSuggestions service tại lib/openai/rebalance-suggestions.ts
- [ ] T205 [P] [US8] Implement deadline reasonability checker tại lib/openai/deadline-review.ts
- [ ] T206 [P] [US8] Implement standup/meeting summary parser tại lib/openai/meeting-summary.ts

#### API Endpoints & Automation

- [ ] T207 [P] [US8] Implement POST /api/ai/daily-summary endpoint
- [ ] T208 [P] [US8] Implement POST /api/ai/weekly-summary endpoint
- [ ] T209 [P] [US8] Implement POST /api/ai/rebalance endpoint
- [ ] T210 [P] [US8] Implement POST /api/ai/meeting-summary endpoint để paste notes hoặc transcript ngắn
- [ ] T211 [US8] Implement POST /api/cron/send-team-digests endpoint để gửi digest theo lịch

#### UI Integrations

- [ ] T212 [P] [US8] Add executive-summary widget vào dashboard/page.tsx cho manager/admin
- [ ] T213 [P] [US8] Add "Vì sao task này rủi ro?" explanation drawer ở task-detail-modal.tsx
- [ ] T214 [US8] Add "AI rebalance workload" action vào project detail page và planning page
- [ ] T215 [US8] Add deadline warning + suggested deadline trong create-task-modal.tsx và edit-task-modal.tsx
- [ ] T216 [US8] Add meeting summary mini-tool trong chat-sidebar.tsx

#### Tracking & Resilience

- [ ] T217 [P] [US8] Track digest open rate, rebalance acceptance rate và usefulness feedback cho AI summaries
- [ ] T218 [US8] Manual test User Story 8: summary → rebalance → deadline warning → meeting recap

**Checkpoint**: AI trở thành lớp điều phối thông minh, giúp demo khác biệt rõ so với task manager thông thường.

---

## Phase 12: User Story 9 - Governance, Approval Flow, Activity Log & Analytics (Priority: P9)

**Goal**: Làm hệ thống đủ “chất doanh nghiệp/đồ án chuyên ngành”: có duyệt task, phân quyền rõ, activity log, analytics dashboard, export dữ liệu và onboarding tốt hơn.

**Independent Test**: Member hoàn thành task và submit for review, manager duyệt task trong review queue, toàn bộ thay đổi xuất hiện trong activity log. Admin mở analytics dashboard thấy completion rate, overdue trend, risk distribution và export CSV cho báo cáo.

### Implementation for User Story 9

#### Roles, Permissions & Workflow

- [ ] T219 [P] [US9] Define permission matrix chi tiết cho admin/manager/member tại docs hoặc lib/auth/permissions.ts
- [ ] T220 [P] [US9] Enforce RBAC cho project/task/comment/admin APIs theo permission matrix
- [ ] T221 [P] [US9] Add UI guards để ẩn/disable actions không có quyền (create, delete, approve, manage members)
- [ ] T222 [P] [US9] Extend Task model với reviewStatus, submittedForReviewAt, reviewedBy, reviewedAt, reviewComment
- [ ] T223 [P] [US9] Implement POST /api/tasks/[id]/submit-review endpoint
- [ ] T224 [P] [US9] Implement POST /api/tasks/[id]/approve endpoint và POST /api/tasks/[id]/reject endpoint
- [ ] T225 [US9] Create review queue page tại app/dashboard/reviews/page.tsx cho managers
- [ ] T226 [US9] Add approval/rejection actions vào task-detail-modal.tsx

#### Activity Log & Audit Trail

- [ ] T227 [P] [US9] Create ActivityLog model với fields: entityType, entityId, action, actorId, metadata, createdAt
- [ ] T228 [P] [US9] Log create/update/delete/assign/status/comment/review actions cho projects, parts, tasks
- [ ] T229 [P] [US9] Implement GET /api/activity endpoint với filters theo entity, actor, action, date
- [ ] T230 [US9] Add activity feed UI vào task-detail-modal.tsx và project detail page

#### Analytics & Reporting

- [ ] T231 [P] [US9] Create analytics service để tính completion rate, overdue trend, lead time, team workload balance, risk distribution
- [ ] T232 [P] [US9] Implement GET /api/analytics/overview endpoint
- [ ] T233 [P] [US9] Implement GET /api/analytics/export endpoint cho CSV export
- [ ] T234 [US9] Create analytics dashboard page tại app/dashboard/analytics/page.tsx
- [ ] T235 [US9] Add chart components cho completion trend, overdue trend, risk breakdown, top overloaded members

#### Adoption & Delivery Readiness

- [ ] T236 [P] [US9] Implement saved views/filters cho kanban, planning và analytics
- [ ] T237 [P] [US9] Expand settings page với notification types cho digests, review requests, approvals
- [ ] T238 [P] [US9] Add first-project / first-task onboarding walkthrough và contextual empty states
- [ ] T239 [P] [US9] Add keyboard shortcuts + accessibility polish cho kanban/planning/review flows
- [ ] T240 [US9] Final manual integration test: approval flow → activity log → analytics export → onboarding walkthrough

**Checkpoint**: Sản phẩm có quy trình, auditability và số liệu đủ tốt để thuyết phục trong buổi bảo vệ đồ án.

---

## Dependencies & Execution Order

### Critical Path (Must Complete Sequentially)

1. **Phase 1: Setup** (T001-T007) → Must complete before Phase 2
2. **Phase 2: Foundational** (T008-T030) → Blocking for ALL user stories
3. **Phase 3: User Story 1** (T031-T067) → **MVP Baseline** - Must complete before P2-P5
4. **Phase 4: User Story 2** (T068-T078) → Depends on US1 tasks data
5. **Phase 5: User Story 3** (T079-T097) → Depends on US1 tasks data
6. **Phase 6: User Story 4** (T098-T109) → Depends on US1, US2, US3 (needs context data)
7. **Phase 7: User Story 5** (T110-T123) → Can enhance US2 but not blocking
8. **Phase 8: Polish** (T124-T162) → Hardening, demo prep, documentation
9. **Phase 9: User Story 6** (T163-T181) → Depends on US1 and improves execution depth for all later phases
10. **Phase 10: User Story 7** (T182-T200) → Depends on US1, US3, US5 for planning, workload and forecast context
11. **Phase 11: User Story 8** (T201-T218) → Depends on US2, US3, US4, US5, US7 for proactive AI suggestions
12. **Phase 12: User Story 9** (T219-T240) → Cross-cutting governance/reporting layer after core collaboration flows are stable

### Parallel Execution Opportunities

**Within Phase 2 (Foundational)**: 
- T010-T030 can run in parallel (different concerns: auth, OpenAI, socket, UI base, schemas)

**Within User Story 1**:
- T031-T033 (models), T034-T047 (API endpoints), T048-T050 (hooks), T051-T061 (UI) can run in parallel
- T062-T064 (Socket integration) depends on kanban components
- T065-T067 (progress calculation) can start after models verified

**Within User Story 2**:
- T068-T069 (OpenAI logic), T071-T072 (database), T077-T078 (tracking) can run in parallel
- T073-T076 (UI updates) depends on T070 (API endpoint)

**Within User Story 3**:
- T079-T080 (OpenAI), T082 (utils), T085 (UI component), T088 (model), T089-T091 (API), T092-T093 (components) can run in parallel
- Integration tasks (T086, T087, T095, T096-T097) depend on their respective components

**Within User Story 4**:
- T098-T099 (OpenAI streaming), T103-T104 (chat UI components) can run in parallel
- T105-T107 (chat sidebar integration) depends on components and API

**Within User Story 5**:
- T111-T116 (API endpoints), T117-T118 (components), T120 (skills matrix component) can run in parallel
- Integration tasks (T119, T121, T122-T123) depend on their components/endpoints

**Within Phase 8 (Polish)**:
- T124-T130 (performance), T131-T135 (error handling), T136-T140 (security), T150-T156 (demo prep), T157-T162 (docs) can run in parallel
- Testing tasks (T141-T149) should run sequentially after fixes

**Within User Story 6**:
- T163-T166 (models), T167-T173 (API), T178 (AI breakdown), T180 (progress rollup) can run in parallel
- T174-T177 (UI integration) depend on their respective endpoints/models

**Within User Story 7**:
- T182-T188 (aggregations + API), T189-T191 (planning UI components), T194-T195 (capacity rules) can run in parallel
- T192-T193 (planning page + reschedule interactions) depend on base components/endpoints
- T196-T200 can proceed after forecast/workload data is stable

**Within User Story 8**:
- T201-T206 (AI services) and T207-T210 (API endpoints) can run in parallel in small batches
- T212-T216 (dashboard/chat/create-task integrations) depend on AI endpoints
- T217-T218 follow after summary/rebalance flows are usable end-to-end

**Within User Story 9**:
- T219-T224 (RBAC + approval workflow), T227-T229 (activity log), T231-T233 (analytics services) can run in parallel
- T225-T226, T230, T234-T235 depend on those backend capabilities
- T236-T240 are final adoption/polish tasks after governance flows are stable

### Example Parallel Batches Per User Story

**User Story 1 Batch 1** (after foundation complete):
```
Parallel: T034-T047 (all API endpoints), T048-T050 (hooks), T051-T053 (project UI), T056-T057 (kanban components)
Sequential after: T058-T061 (kanban board assembly), T062-T064 (realtime), T065-T067 (progress)
```

**User Story 2 Batch 1**:
```
Parallel: T068-T069 (OpenAI), T071-T072 (DB), T077-T078 (tracking)
Then: T070 (API), then T073-T076 (UI integration)
```

**User Story 3 Batch 1**:
```
Parallel: T079-T080 (OpenAI), T082 (utils), T085 (badge), T088 (model), T089-T093 (notifications API + components)
Then: T086-T087 (UI integration), T096-T097 (stale detection)
```

**User Story 6 Batch 1**:
```
Parallel: T163-T166 (new models), T167-T173 (checklist/template/attachment APIs), T178 (AI breakdown)
Then: T174-T177 (task detail + create/edit task integrations), T180-T181 (progress rollup + testing)
```

**User Story 7 Batch 1**:
```
Parallel: T182-T188 (planning services + APIs), T189-T191 (calendar/timeline/workload components), T194-T195 (capacity rules)
Then: T192-T193 (planning page + drag reschedule), T196-T200 (forecast widgets, optimization, testing)
```

**User Story 8 Batch 1**:
```
Parallel: T201-T206 (AI summary/rebalance services), T207-T210 (AI endpoints)
Then: T212-T216 (dashboard/task/chat modal integrations), T217-T218 (tracking + testing)
```

---

## Summary

**Total Tasks**: 240 tasks
- **Phase 1 Setup**: 7 tasks
- **Phase 2 Foundational**: 23 tasks (blocking)
- **Phase 3 User Story 1 (P1)**: 37 tasks 🎯 **MVP**
- **Phase 4 User Story 2 (P2)**: 11 tasks
- **Phase 5 User Story 3 (P3)**: 19 tasks
- **Phase 6 User Story 4 (P4)**: 12 tasks
- **Phase 7 User Story 5 (P5)**: 14 tasks
- **Phase 8 Polish**: 39 tasks
- **Phase 9 User Story 6 (P6)**: 19 tasks
- **Phase 10 User Story 7 (P7)**: 19 tasks
- **Phase 11 User Story 8 (P8)**: 18 tasks
- **Phase 12 User Story 9 (P9)**: 22 tasks

**MVP Scope** (Phase 1-3 = 67 tasks):
- Setup + Foundational + User Story 1
- Deliverable: Fully functional project/task management với kanban board, realtime updates, CRUD operations
- Time estimate: 4-5 weeks

**Expanded Feature Set** (All 240 tasks):
- MVP + AI suggestions + Risk prediction + AI chat + Skills management + Polish + Subtasks/Templates + Planning/Workload + Proactive AI + Governance/Analytics
- Time estimate: 16-18 weeks nếu làm full scope; 12 tuần nếu cắt ở Phase 10 hoặc chọn subset cho demo

**Parallel Opportunities**: ~60% của tasks có thể chạy song song (marked với [P]) trong cùng phase, đặc biệt khi có team >1 người.

**Independent Testing**: Mỗi user story có independent test criteria rõ ràng, có thể test và demo riêng lẻ mà không cần các stories khác.

---

**Status**: Scope Expanded ✅  
**Next Action**: Complete remaining Phase 8 hardening tasks, sau đó ưu tiên Phase 9 hoặc Phase 10 tùy mục tiêu demo  
**Version**: 1.1.0  
**Last Updated**: 2026-03-21
