import type { Metadata } from 'next';
import Link from 'next/link';
import { Bricolage_Grotesque, Newsreader } from 'next/font/google';
import {
  ArrowRight,
  Blocks,
  Bot,
  CalendarRange,
  ChartSpline,
  CheckCircle2,
  Clock3,
  Database,
  GitBranch,
  LayoutPanelTop,
  Layers3,
  Link2,
  Lock,
  Network,
  Rocket,
  Route,
  ServerCog,
  Sparkles,
  Users,
  Workflow,
} from 'lucide-react';
import Footer from '@/components/landing/Footer';
import NavigationBar from '@/components/landing/NavigationBar';

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });
const newsreader = Newsreader({ subsets: ['latin'], weight: ['500', '600', '700'] });

export const metadata: Metadata = {
  title: 'Docs | VSmart',
  description: 'Tài liệu tổng hợp đầy đủ cho VSmart: kiến trúc, module, API, dữ liệu và hướng dẫn triển khai.',
};

const quickStartSteps = [
  {
    title: 'Cài dependencies',
    description: 'Cài đặt toàn bộ package để khởi chạy môi trường phát triển local.',
    command: 'npm install',
  },
  {
    title: 'Thiết lập biến môi trường',
    description: 'Sao chép file mẫu và điền khóa Supabase, OpenAI, Auth.',
    command: 'cp .env.example .env',
  },
  {
    title: 'Chạy migration Supabase',
    description: 'Đồng bộ schema để có đầy đủ bảng cho project, task, AI và governance.',
    command: 'npx supabase db push',
  },
  {
    title: 'Khởi động ứng dụng',
    description: 'Mở website tại localhost và kiểm tra luồng onboarding, dashboard, AI chat.',
    command: 'npm run dev',
  },
];

const appModules = [
  {
    title: 'Landing + Auth',
    icon: LayoutPanelTop,
    description: 'Trang giới thiệu sản phẩm, đăng nhập Google, onboarding hồ sơ ban đầu.',
    routes: ['/', '/login', '/onboarding'],
  },
  {
    title: 'Dashboard Tổng quan',
    icon: Sparkles,
    description: 'Bootstrap dữ liệu, số liệu vận hành, widget AI executive summary, quick onboarding.',
    routes: ['/dashboard'],
  },
  {
    title: 'Projects + Members',
    icon: Layers3,
    description: 'Quản lý dự án, phần dự án, thành viên, lời mời và quyền theo vai trò.',
    routes: ['/dashboard/projects', '/dashboard/projects/[id]'],
  },
  {
    title: 'Kanban + Governance',
    icon: Workflow,
    description: 'Kéo-thả task, lọc rủi ro, review flow, saved views, phím tắt, checklist, bình luận.',
    routes: ['/dashboard/kanban', '/dashboard/reviews'],
  },
  {
    title: 'Planning + Forecast',
    icon: CalendarRange,
    description: 'Lịch tuần, timeline, workload heatmap, rebalance gợi ý và dời lịch task.',
    routes: ['/dashboard/planning'],
  },
  {
    title: 'Analytics + Skills Matrix',
    icon: ChartSpline,
    description: 'Dashboard điều hành cho quản lý, xuất CSV và ma trận kỹ năng theo phòng ban.',
    routes: ['/dashboard/analytics', '/dashboard/admin/skills-matrix'],
  },
  {
    title: 'Settings + Organization',
    icon: Users,
    description: 'Thiết lập cá nhân, tổ chức, phòng ban, lời mời, yêu cầu gia nhập, bảo mật tài khoản.',
    routes: ['/dashboard/settings', '/dashboard/profile'],
  },
];

const apiDomains = [
  {
    title: 'AI + Agent',
    icon: Bot,
    colorClass: 'text-[#2f6052]',
    endpoints: [
      '/api/ai/chat',
      '/api/ai/execute-tools',
      '/api/ai/suggest-assignee',
      '/api/ai/predict-risk',
      '/api/ai/rebalance',
      '/api/ai/breakdown-task',
      '/api/ai/meeting-summary',
      '/api/ai/deadline-review',
      '/api/ai/daily-summary',
      '/api/ai/weekly-summary',
      '/api/ai/stats',
      '/api/ai/track-suggestion',
      '/api/ai/insights-feedback',
    ],
  },
  {
    title: 'Tasks + Workflow',
    icon: Route,
    colorClass: 'text-[#39638d]',
    endpoints: [
      '/api/tasks',
      '/api/tasks/[id]',
      '/api/tasks/[id]/checklist',
      '/api/tasks/[id]/comments',
      '/api/tasks/[id]/attachments',
      '/api/tasks/[id]/reschedule',
      '/api/tasks/[id]/recurring',
      '/api/tasks/[id]/submit-review',
      '/api/tasks/[id]/approve',
      '/api/tasks/[id]/reject',
      '/api/task-templates',
      '/api/task-templates/[id]/instantiate',
    ],
  },
  {
    title: 'Projects + Planning',
    icon: GitBranch,
    colorClass: 'text-[#985c21]',
    endpoints: [
      '/api/projects',
      '/api/projects/[id]',
      '/api/projects/[id]/parts',
      '/api/projects/[id]/forecast',
      '/api/project-parts',
      '/api/project-parts/[id]',
      '/api/project-members',
      '/api/project-members/invitations',
      '/api/planning/calendar',
      '/api/planning/workload',
    ],
  },
  {
    title: 'Organization + Membership',
    icon: Users,
    colorClass: 'text-[#5d4c91]',
    endpoints: [
      '/api/organizations',
      '/api/organization-members',
      '/api/organization-members/invitations',
      '/api/organization-members/invitations/manage',
      '/api/organization-join-requests',
      '/api/organization-join-requests/discover',
      '/api/organization-join-requests/manage',
      '/api/phong-ban',
      '/api/phong-ban/[id]',
      '/api/phong-ban/[id]/status',
    ],
  },
  {
    title: 'Governance + Analytics + Notifications',
    icon: ServerCog,
    colorClass: 'text-[#a54f4f]',
    endpoints: [
      '/api/dashboard/bootstrap',
      '/api/activity',
      '/api/analytics/overview',
      '/api/analytics/export',
      '/api/notifications',
      '/api/notifications/read-all',
      '/api/notifications/[id]/read',
      '/api/stats',
      '/api/admin/skills-matrix',
    ],
  },
  {
    title: 'Auth + User + System',
    icon: Lock,
    colorClass: 'text-[#4a5c47]',
    endpoints: [
      '/auth/callback',
      '/api/auth/logout',
      '/api/users',
      '/api/users/me',
      '/api/users/me/settings',
      '/api/users/me/skills',
      '/api/users/me/delete-account',
      '/api/users/me/logout-others',
      '/api/upload/avatar',
      '/api/socket',
      '/api/cron/calculate-risks',
      '/api/cron/generate-recurring-tasks',
      '/api/cron/send-deadline-reminders',
      '/api/cron/send-team-digests',
    ],
  },
];

const databaseTableGroups = [
  {
    title: 'Tổ chức & nhân sự',
    tables: ['to_chuc', 'nguoi_dung', 'phong_ban', 'loi_moi_to_chuc', 'yeu_cau_gia_nhap_to_chuc'],
  },
  {
    title: 'Dự án & cộng tác',
    tables: ['du_an', 'phan_du_an', 'thanh_vien_du_an', 'activity_log', 'thong_bao'],
  },
  {
    title: 'Task execution',
    tables: ['task', 'task_checklist_item', 'task_attachment', 'task_template', 'recurring_task_rule', 'binh_luan', 'lich_su_task'],
  },
  {
    title: 'AI & phân tích',
    tables: ['goi_y_phan_cong', 'ai_insight_event', 'ky_nang_nguoi_dung'],
  },
];

const deepDiveDocs = [
  {
    title: 'AI Agent README',
    description: 'Tổng quan khả năng hành động thật của AI Agent trong VSmart.',
    href: 'https://github.com/zaikaman/VSmart/blob/main/docs/AI-AGENT-README.md',
  },
  {
    title: 'AI Agent Quickstart',
    description: 'Kịch bản test nhanh theo từng bước với expected behavior.',
    href: 'https://github.com/zaikaman/VSmart/blob/main/docs/AI-AGENT-QUICKSTART.md',
  },
  {
    title: 'AI Agent Technical',
    description: 'Kiến trúc function-calling, flow thực thi tools và bảo mật.',
    href: 'https://github.com/zaikaman/VSmart/blob/main/docs/ai-agent-technical.md',
  },
  {
    title: 'Performance Optimizations',
    description: 'Lịch sử tối ưu query, caching, code-splitting và pagination.',
    href: 'https://github.com/zaikaman/VSmart/blob/main/docs/performance-optimizations.md',
  },
  {
    title: 'Setup',
    description: 'Hướng dẫn cài đặt môi trường local và Supabase từ đầu.',
    href: 'https://github.com/zaikaman/VSmart/blob/main/SETUP.md',
  },
  {
    title: 'Product Specification',
    description: 'Đặc tả chức năng, kịch bản người dùng và tiêu chí thành công.',
    href: 'https://github.com/zaikaman/VSmart/blob/main/specs/1-smart-task-management/spec.md',
  },
];

const totalEndpointCount = apiDomains.reduce((count, domain) => count + domain.endpoints.length, 0);
const totalTables = databaseTableGroups.reduce((count, group) => count + group.tables.length, 0);
const revealBase =
  'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-700 motion-safe:ease-out';
const revealDelays = ['motion-safe:delay-75', 'motion-safe:delay-150', 'motion-safe:delay-200', 'motion-safe:delay-300'] as const;

function withReveal(index = 0) {
  return `${revealBase} ${revealDelays[index % revealDelays.length]}`;
}

function SectionHeader({ badge, title, description }: { badge: string; title: string; description: string }) {
  return (
    <div className="max-w-3xl">
      <p className="inline-flex items-center gap-2 rounded-full border border-[#d5e1c7] bg-[#eef6df] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#587041]">
        <Sparkles className="h-3.5 w-3.5" />
        {badge}
      </p>
      <h2 className={`mt-4 text-[clamp(1.85rem,3vw,2.6rem)] font-semibold leading-tight text-[#1f2b1f] ${newsreader.className}`}>
        {title}
      </h2>
      <p className="mt-3 text-sm leading-7 text-[#5f6e5a]">{description}</p>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className={`relative overflow-x-hidden bg-[radial-gradient(circle_at_18%_0%,#f5faeb_0%,#fbfaf4_30%,#eef4ea_100%)] text-[#223021] ${bricolage.className}`}>
      <NavigationBar />

      <main className="mx-auto w-full max-w-[1440px] px-[100px] pb-24 pt-14 max-xl:px-[60px] max-sm:px-[24px]">
        <section
          className={`${withReveal(0)} relative overflow-hidden rounded-[42px] border border-[#dbe5cf] bg-[linear-gradient(128deg,#1e2a1f_0%,#304433_42%,#55724f_100%)] px-7 py-9 text-[#f5f8ef] shadow-[0_42px_90px_-58px_rgba(30,42,31,0.85)] max-sm:rounded-[30px] max-sm:px-5`}
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#d2f49d]/30 blur-[4px]" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-28 w-full bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(14,22,15,0.26)_100%)]" />

          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/82">
                <Database className="h-3.5 w-3.5" />
                VSmart Product Docs
              </p>
              <h1 className={`mt-5 text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[1.06] tracking-tight text-white ${newsreader.className}`}>
                Tài liệu kỹ thuật và vận hành đầy đủ cho toàn bộ hệ thống.
              </h1>
              <p className="mt-4 max-w-2xl text-[15px] leading-7 text-white/78">
                Trang này tổng hợp trực tiếp từ kiến trúc hiện tại: route, module dashboard, API domain, schema dữ liệu,
                AI Agent, governance flow và checklist triển khai môi trường.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full border border-[#e6f8c9] bg-[#d4f59f] px-5 py-2 text-sm font-semibold text-[#1c2b1b] transition hover:translate-y-[-1px] hover:bg-[#c4ea8f]"
                >
                  Mở ứng dụng
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="https://github.com/zaikaman/VSmart"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/28 bg-white/10 px-5 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/16"
                >
                  Xem source code
                  <Link2 className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                ['Module chính', `${appModules.length}+`, 'Dashboard, planning, governance, AI'],
                ['API endpoint', `${totalEndpointCount}+`, 'Phân nhóm theo domain nghiệp vụ'],
                ['Bảng dữ liệu', `${totalTables}+`, 'Schema hiện tại từ Supabase'],
              ].map(([label, value, note], index) => (
                <article
                  key={label}
                  className={`${withReveal(index + 1)} rounded-[24px] border border-white/16 bg-white/[0.07] p-4 backdrop-blur-sm`}
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-white/68">{label}</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
                  <p className="mt-1 text-sm text-white/72">{note}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`${withReveal(2)} mt-10 grid gap-4 lg:grid-cols-4`}>
          {[
            {
              icon: Rocket,
              title: 'Quick Start',
              text: 'Từ clone repo đến chạy dashboard chỉ với 4 bước.',
            },
            {
              icon: Network,
              title: 'System Architecture',
              text: 'App Router + Supabase + OpenAI + Realtime orchestration.',
            },
            {
              icon: Blocks,
              title: 'Product Surfaces',
              text: 'Bản đồ route và hành trình người dùng theo module.',
            },
            {
              icon: ServerCog,
              title: 'API + Schema',
              text: 'Danh sách endpoint và bảng dữ liệu đang chạy production.',
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-[24px] border border-[#dde7d4] bg-white/88 p-5 shadow-[0_22px_55px_-46px_rgba(93,112,84,0.42)]"
            >
              <div className="inline-flex rounded-2xl border border-[#d8e4cd] bg-[#f4faea] p-2 text-[#678257]">
                <item.icon className="h-4 w-4" />
              </div>
              <h3 className="mt-3 text-base font-semibold text-[#1f2b1f]">{item.title}</h3>
              <p className="mt-1 text-sm leading-6 text-[#64715f]">{item.text}</p>
            </article>
          ))}
        </section>

        <section className="mt-16">
          <SectionHeader
            badge="01. Khởi động nhanh"
            title="Setup trong 10 phút"
            description="Dành cho developer mới vào dự án, theo thứ tự từ môi trường đến chạy ứng dụng local."
          />

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {quickStartSteps.map((step, index) => (
              <article
                key={step.title}
                className={`${withReveal(index + 1)} rounded-[24px] border border-[#dfe7d8] bg-white p-4 shadow-[0_18px_40px_-36px_rgba(96,114,88,0.4)]`}
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-[#d8e3cb] bg-[#f3f9e8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.17em] text-[#63745a]">
                  <Clock3 className="h-3.5 w-3.5" />
                  Bước {index + 1}
                </div>
                <h3 className="mt-3 text-lg font-semibold text-[#1f2c1f]">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#65715f]">{step.description}</p>
                <div className="mt-4 rounded-2xl border border-[#dbe5cf] bg-[#f8fbf2] px-3 py-2 font-mono text-sm text-[#334730]">
                  {step.command}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-6 rounded-[26px] border border-[#dbe5cf] bg-[linear-gradient(130deg,#f7fbf1_0%,#eff6e7_100%)] p-5">
            <p className="text-sm leading-7 text-[#4f624d]">
              Biến môi trường bắt buộc: <strong>NEXT_PUBLIC_SUPABASE_URL</strong>, <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY</strong>,{' '}
              <strong>SUPABASE_SERVICE_ROLE_KEY</strong>, <strong>OPENAI_API_KEY</strong>, <strong>AUTH_SECRET</strong>,{' '}
              <strong>NEXT_PUBLIC_APP_URL</strong>.
            </p>
          </div>
        </section>

        <section className="mt-16">
          <SectionHeader
            badge="02. Kiến trúc"
            title="Cách hệ thống vận hành từ UI tới dữ liệu"
            description="VSmart dùng Next.js App Router, Supabase RLS, React Query, Socket realtime và lớp OpenAI tools cho tác vụ AI Agent."
          />

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-[28px] border border-[#dfe7d8] bg-white p-5">
              <h3 className="text-xl font-semibold text-[#1f2c1f]">Luồng request tiêu chuẩn</h3>
              <div className="mt-4 space-y-3">
                {[
                  ['01', 'UI Layer', 'Dashboard pages và components gọi hooks React Query.'],
                  ['02', 'API Layer', 'Route handlers trong src/app/api xử lý validation + quyền truy cập.'],
                  ['03', 'Service Layer', 'Lib hooks, planning services, analytics services, OpenAI executors.'],
                  ['04', 'Data Layer', 'Supabase PostgreSQL với schema chuẩn hoá và RLS policy.'],
                ].map(([order, title, text]) => (
                  <div key={order} className="grid grid-cols-[auto_1fr] gap-3 rounded-2xl border border-[#e4eadf] bg-[#fbfcf8] p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d6e2c9] bg-[#eff7e2] text-xs font-semibold text-[#5f7752]">
                      {order}
                    </div>
                    <div>
                      <p className="font-medium text-[#223021]">{title}</p>
                      <p className="mt-1 text-sm leading-6 text-[#63715f]">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[28px] border border-[#dfe7d8] bg-[linear-gradient(160deg,#223123_0%,#314532_42%,#4e6947_100%)] p-5 text-[#f3f7ee]">
              <h3 className="text-xl font-semibold">AI Agent Flow</h3>
              <p className="mt-2 text-sm leading-7 text-white/78">
                Chat sidebar bật Agent mode sẽ chuyển từ phản hồi tư vấn sang thực thi hành động thật qua function-calling.
              </p>

              <div className="mt-5 space-y-2 text-sm text-white/84">
                {[
                  'User message -> /api/ai/chat (streaming)',
                  'OpenAI trả về tool_calls khi cần hành động',
                  'Frontend gọi /api/ai/execute-tools',
                  'AgentToolExecutor kiểm tra quyền và chạy CRUD',
                  'Kết quả đẩy ngược về AI để tổng hợp câu trả lời',
                ].map((line) => (
                  <div key={line} className="rounded-xl border border-white/14 bg-white/8 px-3 py-2">
                    {line}
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="mt-16">
          <SectionHeader
            badge="03. Module sản phẩm"
            title="Bản đồ route và chức năng chính"
            description="Mỗi block tương ứng một nhóm trải nghiệm trong ứng dụng, giúp team mới nắm nhanh bức tranh đầy đủ."
          />

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {appModules.map((module, index) => (
              <article
                key={module.title}
                className={`${withReveal(index)} rounded-[26px] border border-[#dde6d6] bg-white p-5 shadow-[0_20px_46px_-40px_rgba(93,112,84,0.42)]`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-semibold text-[#1f2c1f]">{module.title}</h3>
                  <div className="rounded-2xl border border-[#d8e3cb] bg-[#f3f9e8] p-2 text-[#5f7752]">
                    <module.icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-3 text-sm leading-7 text-[#64715f]">{module.description}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {module.routes.map((route) => (
                    <span key={route} className="rounded-full border border-[#dae4ce] bg-[#f8fbf2] px-3 py-1 text-xs text-[#4f624d]">
                      {route}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <SectionHeader
            badge="04. API map"
            title="Danh sách endpoint theo domain nghiệp vụ"
            description="Danh sách này phản ánh các route handlers đang có trong src/app/api và auth callback của App Router."
          />

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {apiDomains.map((domain, index) => (
              <article
                key={domain.title}
                className={`${withReveal(index)} rounded-[24px] border border-[#dfe7d8] bg-white p-4`}
              >
                <div className="mb-3 flex items-center gap-2">
                  <domain.icon className={`h-4 w-4 ${domain.colorClass}`} />
                  <h3 className="font-semibold text-[#1f2c1f]">{domain.title}</h3>
                </div>

                <div className="max-h-[240px] space-y-1.5 overflow-y-auto pr-1">
                  {domain.endpoints.map((endpoint) => (
                    <div key={endpoint} className="rounded-xl border border-[#e5eadf] bg-[#fbfcf8] px-3 py-1.5 font-mono text-xs text-[#4f624d]">
                      {endpoint}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <SectionHeader
            badge="05. Database"
            title="Schema dữ liệu hiện tại"
            description="Danh sách bảng trích từ supabase/current_schema.sql, bám đúng trạng thái cơ sở dữ liệu đang dùng."
          />

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {databaseTableGroups.map((group, index) => (
              <article
                key={group.title}
                className={`${withReveal(index)} rounded-[26px] border border-[#dfe7d8] bg-white p-5`}
              >
                <h3 className="text-xl font-semibold text-[#1f2c1f]">{group.title}</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {group.tables.map((table) => (
                    <span key={table} className="rounded-full border border-[#d8e3cb] bg-[#f4f9ea] px-3 py-1 text-xs font-medium text-[#4f624d]">
                      {table}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <SectionHeader
            badge="06. Tài liệu chuyên sâu"
            title="Đi sâu theo từng mảng"
            description="Các tài liệu này nằm trong thư mục docs và specs, phù hợp cho onboarding dev mới hoặc review kỹ thuật."
          />

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {deepDiveDocs.map((doc, index) => (
              <a
                key={doc.title}
                href={doc.href}
                target="_blank"
                rel="noreferrer"
                className={`${withReveal(index)} group rounded-[24px] border border-[#dde7d4] bg-white p-5 transition hover:translate-y-[-2px] hover:border-[#c9d8ba] hover:shadow-[0_24px_50px_-40px_rgba(91,114,82,0.45)]`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-lg font-semibold text-[#1f2c1f]">{doc.title}</p>
                  <ArrowRight className="h-4 w-4 text-[#7b8f70] transition group-hover:translate-x-0.5" />
                </div>
                <p className="mt-3 text-sm leading-7 text-[#64715f]">{doc.description}</p>
              </a>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-[30px] border border-[#dce6d2] bg-[linear-gradient(150deg,#f5faeb_0%,#eef6e4_45%,#e8f1df_100%)] p-6">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[#d0debf] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#587041]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Trạng thái tài liệu
              </p>
              <h2 className={`mt-4 text-[clamp(1.8rem,2.8vw,2.5rem)] font-semibold leading-tight text-[#1f2b1f] ${newsreader.className}`}>
                Trang docs này dùng như cổng tra cứu trung tâm cho toàn bộ VSmart.
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#566953]">
                Bao gồm luồng kỹ thuật chính, bề mặt sản phẩm, endpoint map, schema dữ liệu và link tài liệu nền. Có thể dùng trực tiếp
                cho onboarding dev, bàn giao nội bộ và chuẩn bị release.
              </p>
            </div>

            <div className="rounded-[24px] border border-[#d3e0c3] bg-white/86 p-4">
              <p className="text-sm font-semibold text-[#2a3b28]">Snapshot codebase</p>
              <div className="mt-3 space-y-2 text-sm text-[#5c6f57]">
                <p>- Framework: Next.js 16 + React 19 + TypeScript</p>
                <p>- Data: Supabase PostgreSQL + RLS</p>
                <p>- Query layer: TanStack Query + custom hooks</p>
                <p>- AI layer: OpenAI tools + agent executor</p>
                <p>- Updated: 27/03/2026</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}