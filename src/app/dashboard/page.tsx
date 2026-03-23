'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  LayoutDashboard,
  Plus,
  Settings2,
  Sparkles,
  TrendingUp,
  Users,
  UsersRound,
} from 'lucide-react';
import { ExecutiveSummaryWidget } from '@/components/ai/executive-summary-widget';
import { DashboardPageShell, DashboardSection } from '@/components/dashboard/page-shell';
import { Button } from '@/components/ui/button';
import { CreateProjectModal } from '@/components/projects/create-project-modal';
import { ProjectCard } from '@/components/projects/project-card';
import ProjectInvitations from '@/components/projects/project-invitations';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjects, type Project } from '@/lib/hooks/use-projects';
import { useStats } from '@/lib/hooks/use-stats';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';

interface CurrentUser {
  vai_tro?: string;
  onboarding_completed?: boolean;
  ten?: string;
  to_chuc?: {
    id: string;
    ten: string;
  } | null;
}

export default function DashboardPage() {
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const { data: projectsData, isLoading: projectsLoading } = useProjects();
  const { data: stats, isLoading: statsLoading } = useStats();
  const searchParams = useSearchParams();
  const digestReference = searchParams.get('digest');
  const { data: currentUser } = useQuery<CurrentUser>({
    queryKey: ['dashboard-current-user'],
    queryFn: async () => {
      const response = await fetch('/api/users/me');
      if (!response.ok) throw new Error('Không thể tải thông tin người dùng');
      return response.json();
    },
  });

  const isLoading = projectsLoading || statsLoading;
  const shouldShowExecutiveSummary =
    !!currentUser?.to_chuc?.id &&
    (currentUser?.vai_tro === 'admin' || currentUser?.vai_tro === 'manager');
  const projects = projectsData?.data || [];
  const hasWorkspace = !!currentUser?.to_chuc?.id;
  const hasTasksInProgress = (stats?.inProgressTasks || 0) > 0;
  const hasScheduledWork = (stats?.upcomingDeadlines?.length || 0) > 0;
  const shouldShowQuickStart = hasWorkspace && (!projects.length || !hasTasksInProgress || !hasScheduledWork);

  const quickStartSteps = [
    {
      title: 'Tạo dự án đầu tiên',
      description: 'Mở khung làm việc cho team, chốt deadline và bắt đầu gom đầu việc vào cùng một nhịp.',
      completed: projects.length > 0,
      href: null as string | null,
      cta: 'Tạo dự án',
    },
    {
      title: 'Đưa task vào Kanban',
      description: 'Có task thật thì bảng theo dõi, nhắc việc và dự báo rủi ro mới bắt đầu phát huy tác dụng.',
      completed: hasTasksInProgress,
      href: '/dashboard/kanban',
      cta: 'Mở Kanban',
    },
    {
      title: 'Khóa các mốc cần theo dõi',
      description: 'Đặt deadline và nhịp planning để dashboard bắt được việc sắp đến hạn và nơi đang dồn tải.',
      completed: hasScheduledWork,
      href: '/dashboard/planning',
      cta: 'Mở Planning',
    },
  ];

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Skeleton className="h-[220px] rounded-[38px]" />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[140px] rounded-[28px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <DashboardPageShell
      badge={
        <>
          <Sparkles className="h-3.5 w-3.5 text-[#87ac63]" />
          Tổng quan
        </>
      }
      title={currentUser?.ten ? `Chào ${currentUser.ten}` : 'Tổng quan'}
      description={
        hasWorkspace
          ? 'Theo dõi tiến độ chung, deadline sắp tới và các điểm cần chú ý.'
          : 'Bạn đã vào hệ thống. Bước tiếp theo là tạo workspace hoặc tham gia team để bắt đầu chạy việc.'
      }
      actions={
        hasWorkspace ? (
          <>
            <Button className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]" onClick={() => setCreateProjectOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Dự án mới
            </Button>
            <Link href="/dashboard/projects">
              <Button variant="outline" className="border-[#e0e6d7] bg-white text-[#5d6958] hover:bg-[#f6f8f1]">
                Xem toàn bộ dự án
              </Button>
            </Link>
          </>
        ) : (
          <>
            <Link href="/onboarding?mode=workspace">
              <Button className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]">
                <Building2 className="mr-2 h-4 w-4" />
                Tạo workspace
              </Button>
            </Link>
            <Link href="/dashboard/profile">
              <Button variant="outline" className="border-[#e0e6d7] bg-white text-[#5d6958] hover:bg-[#f6f8f1]">
                Cập nhật hồ sơ
              </Button>
            </Link>
          </>
        )
      }
      metrics={[
        {
          label: 'Tổng số dự án',
          value: stats?.totalProjects?.toString() || '0',
          note: hasWorkspace ? 'Toàn bộ không gian làm việc' : 'Sẽ xuất hiện sau khi bạn có workspace',
          icon: <LayoutDashboard className="h-4 w-4 text-[#2f6052]" />,
          surfaceClassName: 'bg-[#eef6f0] border-[#d9eadf]',
          valueClassName: 'text-[#2f6052]',
        },
        {
          label: 'Nhiệm vụ đang chạy',
          value: stats?.inProgressTasks?.toString() || '0',
          note: hasWorkspace ? 'Các task đang triển khai' : 'Tạo dự án và task để bắt đầu theo dõi',
          icon: <TrendingUp className="h-4 w-4 text-[#b66944]" />,
          surfaceClassName: 'bg-[#fff1e8] border-[#f0ddd1]',
          valueClassName: 'text-[#b66944]',
        },
        {
          label: 'Thành viên hoạt động',
          value: stats?.totalUsers?.toString() || '0',
          note: hasWorkspace ? 'Người dùng đang tham gia' : 'Mời thêm người sau khi workspace sẵn sàng',
          icon: <Users className="h-4 w-4 text-[#39638d]" />,
          surfaceClassName: 'bg-[#edf5ff] border-[#d8e6f7]',
          valueClassName: 'text-[#39638d]',
        },
        {
          label: 'Quá hạn mở',
          value: stats?.overdueTasks?.toString() || '0',
          note: hasWorkspace ? 'Điểm cần giữ sát hôm nay' : 'Chưa có dữ liệu deadline để theo dõi',
          icon: <CheckCircle2 className="h-4 w-4 text-[#985c21]" />,
          surfaceClassName: 'bg-[#fff6df] border-[#eee1bb]',
          valueClassName: 'text-[#985c21]',
        },
      ]}
    >
      {!hasWorkspace ? (
        <DashboardSection
          title="Thiết lập không gian làm việc"
          description="VSmart đã sẵn sàng. Chỉ cần có workspace hoặc một lời mời là bạn có thể bắt đầu chạy việc cùng team."
        >
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[30px] border border-[#d7e5ca] bg-[linear-gradient(135deg,#f7fbef_0%,#eef6e6_100%)] p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-[#6f7d69]">Bước nên làm tiếp</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#223021]">
                    Tạo workspace để gom dự án, thành viên và lịch theo dõi vào cùng một chỗ.
                  </h3>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-[#5f6d59]">
                    Nếu bạn đang chờ lời mời, cứ giữ trạng thái hiện tại. Khi được thêm vào team, dữ liệu sẽ tự hiện trong dashboard.
                  </p>
                </div>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] bg-[#dff0c8] text-[#223021]">
                  <Building2 className="h-6 w-6" />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/onboarding?mode=workspace">
                  <Button className="border border-[#96bf62] bg-[#b7e07c] text-[#1d2a18] hover:bg-[#add66f]">
                    Tạo workspace ngay
                  </Button>
                </Link>
                <Link href="/dashboard/profile">
                  <Button variant="outline" className="border-[#d7dfcf] bg-white text-[#556451] hover:bg-[#f6f8f1]">
                    Hoàn thiện hồ sơ
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-[30px] border border-[#e4e9de] bg-[#fbfcf8] p-6">
              <p className="text-sm uppercase tracking-[0.18em] text-[#7b8775]">Khi đã có team</p>
              <div className="mt-4 space-y-4">
                {[
                  'Tạo workspace mới cho nhóm đang vận hành riêng.',
                  'Hoặc chờ lời mời rồi tham gia team hiện có.',
                  'Sau đó tạo dự án đầu tiên để kích hoạt bảng theo dõi.',
                ].map((item, index) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef3e8] text-sm font-semibold text-[#42533d]">
                      {index + 1}
                    </div>
                    <p className="pt-1 text-sm leading-6 text-[#66745f]">{item}</p>
                  </div>
                ))}
              </div>

              <Link href="/onboarding?mode=workspace" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#42533d] transition-colors hover:text-[#223021]">
                Mở thiết lập workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </DashboardSection>
      ) : null}

      {shouldShowQuickStart ? (
        <DashboardSection title="Bắt đầu với workspace mới" description="Hoàn thành vài bước ngắn để dashboard có đủ dữ liệu theo dõi tiến độ và cảnh báo sớm.">
          <div className="mb-4 inline-flex rounded-full border border-[#d7e1cb] bg-[#f7fbef] px-3 py-1 text-sm font-medium text-[#50614f]">
            {quickStartSteps.filter((step) => step.completed).length}/{quickStartSteps.length} đã xong
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {quickStartSteps.map((step) => (
              <div key={step.title} className="rounded-[24px] border border-[#e6ebde] bg-[#fbfcf8] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-[#223021]">{step.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[#65725f]">{step.description}</p>
                  </div>
                  <CheckCircle2 className={`h-5 w-5 flex-shrink-0 ${step.completed ? 'text-emerald-600' : 'text-slate-300'}`} />
                </div>

                {step.href ? (
                  <Link href={step.href} className="mt-4 inline-flex text-sm font-medium text-[#4f614b] transition-colors hover:text-[#223021]">
                    {step.cta}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCreateProjectOpen(true)}
                    className="mt-4 inline-flex text-sm font-medium text-[#4f614b] transition-colors hover:text-[#223021]"
                  >
                    {step.cta}
                  </button>
                )}

                {step.title === 'Khóa các mốc cần theo dõi' ? (
                  <Link href="/dashboard/settings" className="mt-2 flex items-center gap-2 text-sm text-[#6a7762] transition-colors hover:text-[#223021]">
                    <Settings2 className="h-4 w-4" />
                    Mở cài đặt thông báo
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        </DashboardSection>
      ) : null}

      {shouldShowExecutiveSummary ? (
        <DashboardSection title="Tóm tắt hôm nay" description="Những điểm chính cần xem trước khi bắt đầu làm việc.">
          <ExecutiveSummaryWidget />
          {digestReference ? <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#7c8776]">Đang mở digest: {digestReference}</p> : null}
        </DashboardSection>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <DashboardSection title="Deadline và tải tuần này" description="Các mốc gần nhất và nơi có dấu hiệu dồn việc.">
          <div className="space-y-3">
            {!hasWorkspace ? (
              <div className="rounded-[22px] border border-dashed border-[#dce4d3] bg-[#f8faf4] py-8 text-center text-sm text-[#72806c]">
                Tạo workspace để bắt đầu theo dõi deadline, tải việc và cảnh báo sớm.
              </div>
            ) : (stats?.upcomingDeadlines || []).length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-[#dce4d3] bg-[#f8faf4] py-8 text-center text-sm text-[#72806c]">
                Chưa có deadline nổi bật trong 2 tuần tới.
              </div>
            ) : (
              (stats?.upcomingDeadlines || []).map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 rounded-[22px] border border-[#e4e9de] bg-[#fbfcf8] p-4">
                  <div>
                    <p className="font-medium text-[#223021]">{item.ten}</p>
                    <p className="mt-1 text-sm text-[#65725f]">
                      {item.projectName} · {item.assigneeName}
                    </p>
                  </div>
                  <div className="rounded-full border border-[#e0e6d7] bg-white px-3 py-1 text-xs font-medium text-[#5f6b58]">
                    {new Date(item.deadline).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              ))
            )}
          </div>
        </DashboardSection>

        <DashboardSection title="Dự án và thành viên cần chú ý" description="Những chỗ nên xem lại sớm để tránh trễ việc.">
          <div className="space-y-3">
            {!hasWorkspace ? (
              <div className="rounded-[22px] border border-dashed border-[#dce4d3] bg-[#f8faf4] py-8 text-center text-sm text-[#72806c]">
                Khi team bắt đầu chạy việc, phần này sẽ gợi ý nơi có nguy cơ chậm hoặc quá tải.
              </div>
            ) : (
              <>
                {(stats?.riskyProjects || []).slice(0, 2).map((project) => (
                  <div key={project.id} className="rounded-[22px] border border-[#e4e9de] bg-[#fbfcf8] p-4">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <p className="font-medium text-[#223021]">{project.ten}</p>
                      <span className="text-sm font-semibold text-[#b66944]">{project.slipProbability}%</span>
                    </div>
                    <p className="text-sm text-[#65725f]">{project.forecastStatus === 'slipping' ? 'Nguy cơ trễ cao' : 'Cần theo dõi sát'}</p>
                  </div>
                ))}

                {(stats?.overloadedMembers || []).slice(0, 3).map((member) => (
                  <div key={member.userId} className="flex items-center justify-between rounded-[22px] border border-[#e4e9de] bg-[#fbfcf8] p-4">
                    <div>
                      <p className="font-medium text-[#223021]">{member.ten}</p>
                      <p className="mt-1 text-sm text-[#65725f]">{member.activeTasks} task đang mở</p>
                    </div>
                    <span className="text-sm font-semibold text-[#b16442]">{Math.round(member.loadRatio * 100)}%</span>
                  </div>
                ))}

                {(stats?.riskyProjects || []).length === 0 && (stats?.overloadedMembers || []).length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-[#dce4d3] bg-[#f8faf4] py-8 text-center text-sm text-[#72806c]">
                    Chưa có điểm nóng nào nổi bật. Khi dữ liệu tăng lên, phần này sẽ hiển thị các cảnh báo đáng chú ý.
                  </div>
                ) : null}
              </>
            )}
          </div>
        </DashboardSection>
      </div>

      <DashboardSection title="Lời mời dự án" description="Các lời mời đang chờ bạn xác nhận.">
        <ProjectInvitations />
      </DashboardSection>

      <DashboardSection
        title="Dự án gần đây"
        description="Các dự án bạn vừa làm việc hoặc mới được cập nhật."
        actions={
          hasWorkspace ? (
            <Link href="/dashboard/projects">
              <Button variant="outline" className="border-[#e0e6d7] bg-white text-[#5d6958] hover:bg-[#f6f8f1]">
                Xem tất cả
              </Button>
            </Link>
          ) : null
        }
      >
        {!hasWorkspace ? (
          <div className="rounded-[24px] border border-dashed border-[#dce4d3] bg-[#f8faf4] py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#eef4e7] text-[#4d5f48]">
              <UsersRound className="h-6 w-6" />
            </div>
            <p className="mt-4 text-[#5d6b58]">Chưa có workspace để hiển thị dự án.</p>
            <p className="mt-2 text-sm text-[#72806c]">Tạo workspace mới hoặc tham gia team hiện có để bắt đầu làm việc cùng mọi người.</p>
            <Link href="/onboarding?mode=workspace" className="mt-5 inline-flex">
              <Button className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]">
                <Building2 className="mr-2 h-4 w-4" />
                Tạo workspace
              </Button>
            </Link>
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[#dce4d3] bg-[#f8faf4] py-12 text-center">
            <p className="mb-4 text-[#72806c]">Chưa có dự án nào.</p>
            <Button className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]" onClick={() => setCreateProjectOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Tạo dự án đầu tiên
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {projects.slice(0, 6).map((project: Project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </DashboardSection>

      <CreateProjectModal open={createProjectOpen} onOpenChange={setCreateProjectOpen} />
    </DashboardPageShell>
  );
}
