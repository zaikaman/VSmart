import {
  BarChart3,
  Bot,
  Boxes,
  Database,
  Gauge,
  GitBranch,
  LayoutDashboard,
  Layers3,
  Rocket,
  Route,
  Shield,
  Sparkles,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

export interface DocsNavItem {
  title: string;
  href: string;
  description: string;
}

export interface DocsNavGroup {
  title: string;
  items: DocsNavItem[];
}

export const docsNav: DocsNavGroup[] = [
  {
    title: 'Nền tảng',
    items: [
      {
        title: 'Tổng quan',
        href: '/docs',
        description: 'Toàn cảnh tài liệu và luồng đọc đề xuất.',
      },
      {
        title: 'Khởi động nhanh',
        href: '/docs/getting-started',
        description: 'Setup local, env và chạy ứng dụng.',
      },
      {
        title: 'Kiến trúc hệ thống',
        href: '/docs/architecture',
        description: 'UI, API, service, data, realtime, auth.',
      },
      {
        title: 'Bề mặt sản phẩm',
        href: '/docs/modules',
        description: 'Bản đồ module và route vận hành.',
      },
    ],
  },
  {
    title: 'Backend & dữ liệu',
    items: [
      {
        title: 'API map',
        href: '/docs/api',
        description: 'Endpoint theo domain nghiệp vụ.',
      },
      {
        title: 'Database schema',
        href: '/docs/database',
        description: 'Nhóm bảng và vai trò dữ liệu.',
      },
      {
        title: 'Tối ưu hiệu năng',
        href: '/docs/performance',
        description: 'Caching, pagination, code-splitting.',
      },
    ],
  },
  {
    title: 'AI Agent',
    items: [
      {
        title: 'Tổng quan AI Agent',
        href: '/docs/ai-agent',
        description: 'Khả năng, luồng dùng và giới hạn.',
      },
      {
        title: 'Hướng dẫn sử dụng',
        href: '/docs/ai-agent/guide',
        description: 'Lệnh mẫu và best practices.',
      },
      {
        title: 'Quickstart kiểm thử',
        href: '/docs/ai-agent/quickstart',
        description: 'Checklist test nhanh theo bước.',
      },
      {
        title: 'Tài liệu kỹ thuật',
        href: '/docs/ai-agent/technical',
        description: 'Function-calling, tool executor, bảo mật.',
      },
      {
        title: 'Changelog',
        href: '/docs/ai-agent/changelog',
        description: 'Lịch sử thay đổi AI Agent.',
      },
    ],
  },
  {
    title: 'Đặc tả',
    items: [
      {
        title: 'Feature specification',
        href: '/docs/specification',
        description: 'User stories, requirements, success criteria.',
      },
    ],
  },
];

export interface QuickStartStep {
  title: string;
  description: string;
  command: string;
}

export const quickStartSteps: QuickStartStep[] = [
  {
    title: 'Cài dependencies',
    description: 'Cài toàn bộ package để chạy local.',
    command: 'npm install',
  },
  {
    title: 'Tạo file env',
    description: 'Sao chép file mẫu và bổ sung khóa thật.',
    command: 'cp .env.example .env',
  },
  {
    title: 'Đồng bộ database',
    description: 'Chạy migration Supabase để tạo schema mới nhất.',
    command: 'npx supabase db push',
  },
  {
    title: 'Chạy ứng dụng',
    description: 'Mở app và kiểm tra login, onboarding, dashboard.',
    command: 'npm run dev',
  },
];

export const environmentKeys = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
  'OPENAI_MODEL',
  'OPENAI_BASE_URL',
  'AUTH_SECRET',
  'AUTH_URL',
  'NEXT_PUBLIC_APP_URL',
];

export interface DocsModule {
  title: string;
  description: string;
  icon: LucideIcon;
  routes: string[];
}

export const productModules: DocsModule[] = [
  {
    title: 'Landing + Auth',
    description: 'Trang giới thiệu, đăng nhập Google và onboarding hồ sơ.',
    icon: LayoutDashboard,
    routes: ['/', '/login', '/onboarding'],
  },
  {
    title: 'Dashboard tổng quan',
    description: 'Bootstrap dữ liệu, thống kê nhanh, executive summary và quick actions.',
    icon: Sparkles,
    routes: ['/dashboard'],
  },
  {
    title: 'Projects + Members',
    description: 'CRUD dự án, phần dự án, lời mời thành viên và quyền thao tác theo vai trò.',
    icon: GitBranch,
    routes: ['/dashboard/projects', '/dashboard/projects/[id]'],
  },
  {
    title: 'Kanban + Governance',
    description: 'Kéo thả task, review queue, saved views, checklist, comments.',
    icon: Workflow,
    routes: ['/dashboard/kanban', '/dashboard/reviews'],
  },
  {
    title: 'Planning + Forecast',
    description: 'Lịch tuần, timeline, workload heatmap, đề xuất cân tải và dời lịch.',
    icon: Route,
    routes: ['/dashboard/planning'],
  },
  {
    title: 'Analytics + Skills Matrix',
    description: 'Bảng điều hành cho manager, xuất CSV, xem năng lực đội.',
    icon: BarChart3,
    routes: ['/dashboard/analytics', '/dashboard/admin/skills-matrix'],
  },
  {
    title: 'Settings + Organization',
    description: 'Cài đặt cá nhân, cấu hình tổ chức, phòng ban, thành viên, bảo mật.',
    icon: Users,
    routes: ['/dashboard/settings', '/dashboard/profile'],
  },
];

export interface ApiDomain {
  title: string;
  icon: LucideIcon;
  tone: string;
  endpoints: string[];
}

export const apiDomains: ApiDomain[] = [
  {
    title: 'AI + Agent',
    icon: Bot,
    tone: 'text-[#2f6052]',
    endpoints: [
      '/api/ai/chat',
      '/api/ai/execute-tools',
      '/api/ai/suggest-assignee',
      '/api/ai/predict-risk',
      '/api/ai/rebalance',
      '/api/ai/breakdown-task',
      '/api/ai/deadline-review',
      '/api/ai/meeting-summary',
      '/api/ai/daily-summary',
      '/api/ai/weekly-summary',
      '/api/ai/stats',
      '/api/ai/track-suggestion',
      '/api/ai/insights-feedback',
    ],
  },
  {
    title: 'Tasks + Workflow',
    icon: Workflow,
    tone: 'text-[#39638d]',
    endpoints: [
      '/api/tasks',
      '/api/tasks/[id]',
      '/api/tasks/[id]/checklist',
      '/api/tasks/[id]/comments',
      '/api/tasks/[id]/attachments',
      '/api/tasks/[id]/submit-review',
      '/api/tasks/[id]/approve',
      '/api/tasks/[id]/reject',
      '/api/tasks/[id]/reschedule',
      '/api/tasks/[id]/recurring',
      '/api/task-templates',
      '/api/task-templates/[id]/instantiate',
    ],
  },
  {
    title: 'Projects + Planning',
    icon: Layers3,
    tone: 'text-[#985c21]',
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
    tone: 'text-[#7c4f92]',
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
    title: 'Governance + Analytics',
    icon: Gauge,
    tone: 'text-[#a54f4f]',
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
    title: 'Auth + System',
    icon: Shield,
    tone: 'text-[#4a5c47]',
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

export interface TableGroup {
  title: string;
  description: string;
  tables: string[];
}

export const databaseGroups: TableGroup[] = [
  {
    title: 'Tổ chức & nhân sự',
    description: 'Thông tin tổ chức, user, phòng ban, lời mời và yêu cầu gia nhập.',
    tables: ['to_chuc', 'nguoi_dung', 'phong_ban', 'loi_moi_to_chuc', 'yeu_cau_gia_nhap_to_chuc'],
  },
  {
    title: 'Dự án & cộng tác',
    description: 'Lõi vận hành dự án và hành vi cộng tác trong workspace.',
    tables: ['du_an', 'phan_du_an', 'thanh_vien_du_an', 'activity_log', 'thong_bao'],
  },
  {
    title: 'Task execution',
    description: 'Vòng đời thực thi task, checklist, file đính kèm, comment, lịch sử.',
    tables: ['task', 'task_checklist_item', 'task_attachment', 'task_template', 'recurring_task_rule', 'binh_luan', 'lich_su_task'],
  },
  {
    title: 'AI & phân tích',
    description: 'Nguồn dữ liệu cho suggest assignee, insight và học hành vi.',
    tables: ['goi_y_phan_cong', 'ai_insight_event', 'ky_nang_nguoi_dung'],
  },
];

export const aiAgentTools = [
  'tao_du_an',
  'moi_thanh_vien_du_an',
  'tao_phan_du_an',
  'tao_task',
  'cap_nhat_task',
  'xoa_task',
  'lay_danh_sach_thanh_vien',
  'lay_danh_sach_du_an',
  'lay_danh_sach_phan_du_an',
  'lay_chi_tiet_task',
  'cap_nhat_du_an',
  'xoa_thanh_vien_du_an',
  'tim_kiem_tasks',
];

export const docsHighlights = [
  {
    title: 'Khởi động nhanh',
    description: 'Bắt đầu local, setup Supabase và chạy app trong 10 phút.',
    href: '/docs/getting-started',
    icon: Rocket,
  },
  {
    title: 'Kiến trúc',
    description: 'Nắm luồng xử lý từ UI đến dữ liệu và lớp bảo mật.',
    href: '/docs/architecture',
    icon: Boxes,
  },
  {
    title: 'API map',
    description: 'Tra endpoint theo domain thay vì đọc rời từng route.',
    href: '/docs/api',
    icon: Route,
  },
  {
    title: 'Database',
    description: 'Xem nhóm bảng và vai trò dữ liệu hiện hành.',
    href: '/docs/database',
    icon: Database,
  },
  {
    title: 'AI Agent',
    description: 'Từ hướng dẫn dùng đến kỹ thuật implement tools.',
    href: '/docs/ai-agent',
    icon: Bot,
  },
  {
    title: 'Đặc tả tính năng',
    description: 'User stories, FR, UX, performance và success criteria.',
    href: '/docs/specification',
    icon: Sparkles,
  },
];
