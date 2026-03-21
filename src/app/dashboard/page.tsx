'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { CheckCircle2, LayoutDashboard, Plus, Settings2, TrendingUp, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ExecutiveSummaryWidget } from '@/components/ai/executive-summary-widget';
import { CreateProjectModal } from '@/components/projects/create-project-modal';
import { ProjectCard } from '@/components/projects/project-card';
import ProjectInvitations from '@/components/projects/project-invitations';
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

  const statsItems = [
    { title: 'Tổng số dự án', value: stats?.totalProjects?.toString() || '0', icon: LayoutDashboard, change: 'Toàn bộ không gian làm việc' },
    { title: 'Nhiệm vụ đang chạy', value: stats?.inProgressTasks?.toString() || '0', icon: TrendingUp, change: 'Các task đang triển khai' },
    { title: 'Thành viên hoạt động', value: stats?.totalUsers?.toString() || '0', icon: Users, change: 'Người dùng đang tham gia' },
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Skeleton className="mb-2 h-9 w-64" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="mb-1 h-8 w-12" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {currentUser?.ten ? `Chào ${currentUser.ten}` : 'Chào mừng trở lại'}
          </h1>
          <p className="mt-1 text-slate-500">
            Dưới đây là nhịp vận hành hiện tại của đội và những gì cần giữ sát trong hôm nay.
          </p>
        </div>
        <Button className="bg-[#191a23] text-white hover:bg-[#2a2b35]" onClick={() => setCreateProjectOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Dự án mới
        </Button>
      </div>

      {!currentUser?.onboarding_completed ? (
        <div className="mb-8 rounded-[28px] border border-[#dfe6d3] bg-[#f5f8ef] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#61705f]">Bắt đầu nhanh</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-900">Để team chạy mượt hơn trong lần đầu, hãy hoàn thiện 3 bước này.</h2>
            <div className="rounded-full border border-[#d7e1cb] bg-white/80 px-3 py-1 text-sm font-medium text-[#50614f]">
              {completedOnboardingSteps}/3 đã xong
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {onboardingSteps.map((step) => (
              <div key={step.title} className="rounded-2xl border border-white/70 bg-white/80 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{step.title}</p>
                    <p className="mt-2 text-sm text-slate-500">{step.description}</p>
                  </div>
                  <CheckCircle2 className={`h-5 w-5 flex-shrink-0 ${step.completed ? 'text-emerald-600' : 'text-slate-300'}`} />
                </div>

                {step.href ? (
                  <Link href={step.href} className="mt-4 inline-flex text-sm font-medium text-slate-700 transition-colors hover:text-slate-900">
                    {step.cta}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCreateProjectOpen(true)}
                    className="mt-4 inline-flex text-sm font-medium text-slate-700 transition-colors hover:text-slate-900"
                  >
                    {step.cta}
                  </button>
                )}

                {step.title === 'Chốt nhịp review và thông báo' ? (
                  <Link href="/dashboard/reviews" className="mt-2 flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-800">
                    <Settings2 className="h-4 w-4" />
                    Mở hàng chờ duyệt
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => setCreateProjectOpen(true)}>Tạo dự án ngay</Button>
            <Link href="/dashboard/settings">
              <Button variant="outline">Mở cài đặt thông báo</Button>
            </Link>
            <Button
              variant="ghost"
              className="text-slate-700"
              disabled={completeOnboardingMutation.isPending}
              onClick={() => completeOnboardingMutation.mutate()}
            >
              {completeOnboardingMutation.isPending ? 'Đang cập nhật...' : 'Đánh dấu đã sẵn sàng'}
            </Button>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Khi team đã có dự án, task đang chạy và nhịp review ưu tiên, bạn có thể ẩn khối này để dashboard gọn hơn.
          </p>
        </div>
      ) : null}

      {shouldShowExecutiveSummary ? (
        <div className="mb-8">
          <ExecutiveSummaryWidget />
          {digestReference ? <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">Đang mở digest: {digestReference}</p> : null}
        </div>
      ) : null}

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {statsItems.map((stat) => (
          <Card key={stat.title} className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <p className="mt-1 text-xs text-slate-500">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Điểm cần chú ý</p>
                <CardTitle className="text-xl">Deadline và tải tuần này</CardTitle>
              </div>
              <div className="text-sm font-medium text-destructive">{stats?.overdueTasks || 0} quá hạn</div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {(stats?.upcomingDeadlines || []).length === 0 ? (
                <div className="rounded-lg border border-dashed bg-slate-50 py-6 text-center text-sm text-slate-500">
                  Chưa có deadline nổi bật trong 2 tuần tới.
                </div>
              ) : (
                (stats?.upcomingDeadlines || []).map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border bg-slate-50 p-3">
                    <div>
                      <p className="font-medium text-slate-900">{item.ten}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.projectName} · {item.assigneeName}
                      </p>
                    </div>
                    <div className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700">
                      {new Date(item.deadline).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Forecast</p>
                <CardTitle className="text-xl">Dự án và thành viên nóng</CardTitle>
              </div>
              <div className="text-sm font-medium text-blue-500">{Math.round((stats?.workloadSummary?.avgLoadRatio || 0) * 100)}% tải TB</div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {(stats?.riskyProjects || []).slice(0, 2).map((project) => (
                <div key={project.id} className="rounded-lg border bg-slate-50 p-3">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-900">{project.ten}</p>
                    <span className="text-sm font-semibold text-orange-500">{project.slipProbability}%</span>
                  </div>
                  <p className="text-sm text-slate-500">{project.forecastStatus === 'slipping' ? 'Nguy cơ trễ cao' : 'Cần theo dõi sát'}</p>
                </div>
              ))}

              {(stats?.overloadedMembers || []).slice(0, 3).map((member) => (
                <div key={member.userId} className="flex items-center justify-between rounded-lg border bg-slate-50 p-3">
                  <div>
                    <p className="font-medium text-slate-900">{member.ten}</p>
                    <p className="mt-1 text-sm text-slate-500">{member.activeTasks} task đang mở</p>
                  </div>
                  <span className="text-sm font-semibold text-destructive">{Math.round(member.loadRatio * 100)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <ProjectInvitations />
      </div>

      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Dự án gần đây</h2>
          <Link href="/dashboard/projects" className="text-sm text-slate-500 transition-colors hover:text-slate-900">
            Xem tất cả →
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-slate-50 py-12 text-center">
            <p className="mb-4 text-slate-500">Chưa có dự án nào.</p>
            <Button onClick={() => setCreateProjectOpen(true)}>
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
      </div>

      <CreateProjectModal open={createProjectOpen} onOpenChange={setCreateProjectOpen} />
    </div>
  );
}
