'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LayoutDashboard, TrendingUp, Users, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const showInvitations = searchParams.get('tab') === 'invitations';

  const isLoading = projectsLoading || statsLoading;

  // Stats với dữ liệu thực
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
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Stats Skeleton */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Projects Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const projects = projectsData?.data || [];

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Chào mừng trở lại!
          </h1>
          <p className="text-slate-500 mt-1">
            Dưới đây là những gì đang diễn ra với các dự án của bạn.
          </p>
        </div>
        <Button
          className="bg-[#191a23] hover:bg-[#2a2b35] text-white"
          onClick={() => setCreateProjectOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" /> Dự án mới
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        {statsItems.map((stat, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <p className="text-xs text-slate-500 mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Project Invitations - Hiển thị khi có query param hoặc luôn hiển thị */}
      <div className="mb-8">
        <ProjectInvitations />
      </div>

      {/* Recent Projects */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900">Dự án gần đây</h2>
          <Link
            href="/dashboard/projects"
            className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            Xem tất cả →
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg">
            <p className="text-slate-500 mb-4">Chưa có dự án nào.</p>
            <Button onClick={() => setCreateProjectOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Tạo dự án đầu tiên
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {projects.slice(0, 6).map((project: Project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
      />
    </div>
  );
}
