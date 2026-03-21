'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { LayoutDashboard, TrendingUp, Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExecutiveSummaryWidget } from '@/components/ai/executive-summary-widget';
import { ProjectCard } from '@/components/projects/project-card';
import { CreateProjectModal } from '@/components/projects/create-project-modal';
import ProjectInvitations from '@/components/projects/project-invitations';
import { useProjects, Project } from '@/lib/hooks/use-projects';
import { useStats } from '@/lib/hooks/use-stats';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchParams } from 'next/navigation';

export default function DashboardPage() {
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const { data: projectsData, isLoading: projectsLoading } = useProjects();
  const { data: stats, isLoading: statsLoading } = useStats();
  const searchParams = useSearchParams();
  const digestReference = searchParams.get('digest');
  const { data: currentUser } = useQuery({
    queryKey: ['dashboard-current-user'],
    queryFn: async () => {
      const response = await fetch('/api/users/me');
      if (!response.ok) {
        throw new Error('Không thể tải thông tin người dùng');
      }
      return response.json() as Promise<{ vai_tro?: string }>;
    },
  });

  const isLoading = projectsLoading || statsLoading;
  const shouldShowExecutiveSummary = currentUser?.vai_tro === 'admin' || currentUser?.vai_tro === 'manager';

  const statsItems = [
    {
      title: 'Tổng số dự án',
      value: stats?.totalProjects?.toString() || '0',
      icon: LayoutDashboard,
      change: 'Tất cả thời gian',
    },
    {
      title: 'Nhiệm vụ đang chạy',
      value: stats?.inProgressTasks?.toString() || '0',
      icon: TrendingUp,
      change: 'Trên tất cả dự án',
    },
    {
      title: 'Thành viên nhóm',
      value: stats?.totalUsers?.toString() || '0',
      icon: Users,
      change: 'Người dùng hoạt động',
    },
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

  const projects = projectsData?.data || [];

  return (
    <div className="container mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Chào mừng trở lại</h1>
          <p className="mt-1 text-slate-500">
            Dưới đây là nhịp vận hành hiện tại của đội và những gì cần giữ sát trong hôm nay.
          </p>
        </div>
        <Button
          className="bg-[#191a23] text-white hover:bg-[#2a2b35]"
          onClick={() => setCreateProjectOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" /> Dự án mới
        </Button>
      </div>

      {shouldShowExecutiveSummary ? (
        <div className="mb-8">
          <ExecutiveSummaryWidget />
          {digestReference ? (
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">
              Đang mở digest: {digestReference}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {statsItems.map((stat, i) => (
          <Card key={i} className="transition-shadow hover:shadow-md">
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
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Điểm cần chú ý
                </p>
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
              <div className="text-sm font-medium text-blue-500">
                {Math.round((stats?.workloadSummary?.avgLoadRatio || 0) * 100)}% tải TB
              </div>
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
                  <p className="text-sm text-slate-500">
                    {project.forecastStatus === 'slipping' ? 'Nguy cơ trễ cao' : 'Cần theo dõi sát'}
                  </p>
                </div>
              ))}

              {(stats?.overloadedMembers || []).slice(0, 3).map((member) => (
                <div key={member.userId} className="flex items-center justify-between rounded-lg border bg-slate-50 p-3">
                  <div>
                    <p className="font-medium text-slate-900">{member.ten}</p>
                    <p className="mt-1 text-sm text-slate-500">{member.activeTasks} task đang mở</p>
                  </div>
                  <span className="text-sm font-semibold text-destructive">
                    {Math.round(member.loadRatio * 100)}%
                  </span>
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
          <Link
            href="/dashboard/projects"
            className="text-sm text-slate-500 transition-colors hover:text-slate-900"
          >
            Xem tất cả →
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-slate-50 py-12 text-center">
            <p className="mb-4 text-slate-500">Chưa có dự án nào.</p>
            <Button onClick={() => setCreateProjectOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Tạo dự án đầu tiên
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
