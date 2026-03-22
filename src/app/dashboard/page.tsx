'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { CheckCircle2, LayoutDashboard, Plus, Settings2, Sparkles, TrendingUp, Users } from 'lucide-react';
import { toast } from 'sonner';
import { ExecutiveSummaryWidget } from '@/components/ai/executive-summary-widget';
import { DashboardPageShell, DashboardSection } from '@/components/dashboard/page-shell';
import { Button } from '@/components/ui/button';
import { CreateProjectModal } from '@/components/projects/create-project-modal';
import { ProjectCard } from '@/components/projects/project-card';
import ProjectInvitations from '@/components/projects/project-invitations';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjects, type Project } from '@/lib/hooks/use-projects';
import { useStats } from '@/lib/hooks/use-stats';
import { useSearchParams } from 'next/navigation';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const { data: projectsData, isLoading: projectsLoading } = useProjects();
  const { data: stats, isLoading: statsLoading } = useStats();
  const searchParams = useSearchParams();
  const digestReference = searchParams.get('digest');
  const { data: currentUser } = useQuery({
    queryKey: ['dashboard-current-user'],
    queryFn: async () => {
      const response = await fetch('/api/users/me');
      if (!response.ok) throw new Error('Không thể tải thông tin người dùng');
      return response.json() as Promise<{ vai_tro?: string; onboarding_completed?: boolean; ten?: string }>;
    },
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarding_completed: true }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || 'Không thể cập nhật trạng thái bắt đầu nhanh');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-current-user'] });
      toast.success('Đã ẩn phần bắt đầu nhanh');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const isLoading = projectsLoading || statsLoading;
  const shouldShowExecutiveSummary = currentUser?.vai_tro === 'admin' || currentUser?.vai_tro === 'manager';
  const projects = projectsData?.data || [];
  const onboardingSteps = [
    {
      title: 'Tạo dự án đầu tiên',
      description: 'Dựng khung công việc, deadline và thành viên cốt lõi để team bắt đầu chạy thật.',
      completed: projects.length > 0,
      href: null as string | null,
      cta: 'Tạo dự án ngay',
    },
    {
      title: 'Đưa task vào guồng chạy',
      description: 'Thêm task, checklist hoặc template để bảng Kanban có dữ liệu thật thay vì chỉ là khung trống.',
      completed: (stats?.inProgressTasks || 0) > 0,
      href: '/dashboard/kanban',
      cta: 'Mở Kanban',
    },
    {
      title: 'Chốt nhịp review và thông báo',
      description: 'Thiết lập kênh nhắc việc, digest và hàng chờ duyệt để người quản lý bám sát tiến độ mỗi ngày.',
      completed: !!currentUser?.onboarding_completed,
      href: '/dashboard/settings',
      cta: 'Mở cài đặt',
    },
  ];
  const completedOnboardingSteps = onboardingSteps.filter((step) => step.completed).length;

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
      description="Theo dõi tiến độ chung, deadline sắp tới và các điểm cần chú ý."
      actions={
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
      }
      metrics={[
        {
          label: 'Tổng số dự án',
          value: stats?.totalProjects?.toString() || '0',
          note: 'Toàn bộ không gian làm việc',
          icon: <LayoutDashboard className="h-4 w-4 text-[#2f6052]" />,
          surfaceClassName: 'bg-[#eef6f0] border-[#d9eadf]',
          valueClassName: 'text-[#2f6052]',
        },
        {
          label: 'Nhiệm vụ đang chạy',
          value: stats?.inProgressTasks?.toString() || '0',
          note: 'Các task đang triển khai',
          icon: <TrendingUp className="h-4 w-4 text-[#b66944]" />,
          surfaceClassName: 'bg-[#fff1e8] border-[#f0ddd1]',
          valueClassName: 'text-[#b66944]',
        },
        {
          label: 'Thành viên hoạt động',
          value: stats?.totalUsers?.toString() || '0',
          note: 'Người dùng đang tham gia',
          icon: <Users className="h-4 w-4 text-[#39638d]" />,
          surfaceClassName: 'bg-[#edf5ff] border-[#d8e6f7]',
          valueClassName: 'text-[#39638d]',
        },
        {
          label: 'Quá hạn mở',
          value: stats?.overdueTasks?.toString() || '0',
          note: 'Điểm cần giữ sát hôm nay',
          icon: <CheckCircle2 className="h-4 w-4 text-[#985c21]" />,
          surfaceClassName: 'bg-[#fff6df] border-[#eee1bb]',
          valueClassName: 'text-[#985c21]',
        },
      ]}
    >
      {!currentUser?.onboarding_completed ? (
        <DashboardSection title="Bắt đầu nhanh" description="Hoàn thành vài bước cơ bản để bắt đầu làm việc thuận hơn.">
          <div className="mb-4 inline-flex rounded-full border border-[#d7e1cb] bg-[#f7fbef] px-3 py-1 text-sm font-medium text-[#50614f]">
            {completedOnboardingSteps}/3 đã xong
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {onboardingSteps.map((step) => (
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

                {step.title === 'Chốt nhịp review và thông báo' ? (
                  <Link href="/dashboard/reviews" className="mt-2 flex items-center gap-2 text-sm text-[#6a7762] transition-colors hover:text-[#223021]">
                    <Settings2 className="h-4 w-4" />
                    Mở hàng chờ duyệt
                  </Link>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]" onClick={() => setCreateProjectOpen(true)}>
              Tạo dự án ngay
            </Button>
            <Link href="/dashboard/settings">
              <Button variant="outline" className="border-[#e0e6d7] bg-white text-[#5d6958] hover:bg-[#f6f8f1]">
                Mở cài đặt thông báo
              </Button>
            </Link>
            <Button variant="ghost" className="text-[#5f6b58] hover:bg-[#f6f8f1]" disabled={completeOnboardingMutation.isPending} onClick={() => completeOnboardingMutation.mutate()}>
              {completeOnboardingMutation.isPending ? 'Đang cập nhật...' : 'Đánh dấu đã sẵn sàng'}
            </Button>
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
            {(stats?.upcomingDeadlines || []).length === 0 ? (
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
          <Link href="/dashboard/projects">
            <Button variant="outline" className="border-[#e0e6d7] bg-white text-[#5d6958] hover:bg-[#f6f8f1]">
              Xem tất cả
            </Button>
          </Link>
        }
      >
        {projects.length === 0 ? (
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
