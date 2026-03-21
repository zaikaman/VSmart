'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Activity, Users, Plus, ArrowUpRight, FolderDot, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectCard } from '@/components/projects/project-card';
import { CreateProjectModal } from '@/components/projects/create-project-modal';
import ProjectInvitations from '@/components/projects/project-invitations';
import { useProjects, Project } from '@/lib/hooks/use-projects';
import { useStats } from '@/lib/hooks/use-stats';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchParams } from 'next/navigation';
import { Bricolage_Grotesque, JetBrains_Mono } from 'next/font/google';

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['400', '600', '800'] });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '700'] });

export default function DashboardPage() {
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const { data: projectsData, isLoading: projectsLoading } = useProjects();
  const { data: stats, isLoading: statsLoading } = useStats();
  const searchParams = useSearchParams();

  const isLoading = projectsLoading || statsLoading;

  const statsItems = [
    {
      title: 'TOTAL PROJECTS',
      value: stats?.totalProjects?.toString() || '0',
      icon: FolderDot,
      change: 'All time record',
    },
    {
      title: 'ACTIVE TASKS',
      value: stats?.inProgressTasks?.toString() || '0',
      icon: Activity,
      change: 'Across all vectors',
    },
    {
      title: 'CREW MEMBERS',
      value: stats?.totalUsers?.toString() || '0',
      icon: Users,
      change: 'Active personnel',
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#050505] text-white p-8">
        <div className="container mx-auto max-w-7xl animate-pulse">
          <div className="h-10 w-1/3 bg-[#111] mb-2 rounded" />
          <div className="h-4 w-1/4 bg-[#111] mb-12 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-[#0a0a0a] border border-[#222] rounded p-6" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-[#0a0a0a] border border-[#222] rounded p-6" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const projects = projectsData?.data || [];

  return (
    <div className={`min-h-[calc(100vh-4rem)] bg-[#050505] text-[#e2e8f0] relative overflow-hidden ${bricolage.className}`}>
      {/* Abstract Tech Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#b9ff66]/5 blur-[150px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[50%] rounded-full bg-[#2a2b35]/20 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(#b9ff66 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="container mx-auto px-6 py-12 max-w-7xl relative z-10 selection:bg-[#b9ff66] selection:text-black">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#111] border border-[#222] rounded-full text-xs font-medium text-[#b9ff66] mb-4 tracking-widest uppercase">
              <Sparkles className="w-3 h-3" /> System Online
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white uppercase">
              Command <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#b9ff66] to-[#60a5fa]">Center</span>
            </h1>
            <p className="text-[#888] mt-3 text-lg font-light">
              Monitor project vectors and team metrics in real-time.
            </p>
          </div>
          <button
            className="group relative inline-flex items-center justify-center px-6 py-3 font-semibold text-black bg-[#b9ff66] overflow-hidden transition-transform active:scale-95"
            onClick={() => setCreateProjectOpen(true)}
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <Plus className="mr-2 h-5 w-5 relative z-10 block group-hover:rotate-90 transition-transform duration-300" />
            <span className="relative z-10 uppercase tracking-wider text-sm">Initialize Project</span>
          </button>
        </div>

        {/* Stats Grid - Brutalist Tech Style */}
        <div className="grid gap-6 md:grid-cols-3 mb-16">
          {statsItems.map((stat, i) => (
            <div
              key={i}
              className="group relative bg-[#0a0a0a] border border-[#222] p-6 hover:border-[#b9ff66]/50 hover:bg-[#111] transition-all duration-300 flex flex-col justify-between h-[160px]"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#b9ff66]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="flex justify-between items-start relative z-10">
                <span className="text-[#777] text-xs font-bold tracking-[0.2em]">{stat.title}</span>
                <stat.icon className="text-[#555] group-hover:text-[#b9ff66] w-5 h-5 transition-colors duration-300" />
              </div>
              <div className="relative z-10">
                <div className={`text-4xl font-bold text-white mb-2 ${jetbrains.className} group-hover:scale-105 origin-left transition-transform duration-300`}>
                  {stat.value}
                </div>
                <div className="text-xs text-[#b9ff66] flex items-center gap-1 font-medium bg-[#b9ff66]/10 w-fit px-2 py-1 rounded">
                  <ArrowUpRight className="w-3 h-3" />
                  {stat.change}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-12 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="border border-[#222] bg-[#0a0a0a] p-6">
            <div className="mb-5 flex items-center justify-between border-b border-[#222] pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#666]">Điểm cần chú ý</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Deadline và tải tuần này</h2>
              </div>
              <div className={`text-sm text-[#b9ff66] ${jetbrains.className}`}>
                {stats?.overdueTasks || 0} quá hạn
              </div>
            </div>

            <div className="space-y-3">
              {(stats?.upcomingDeadlines || []).length === 0 ? (
                <div className="border border-dashed border-[#2a2b35] px-4 py-5 text-sm text-[#667085]">
                  Chưa có deadline nổi bật trong 2 tuần tới.
                </div>
              ) : (
                (stats?.upcomingDeadlines || []).map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 border border-[#1d1f28] bg-[#111] px-4 py-3">
                    <div>
                      <p className="font-semibold text-white">{item.ten}</p>
                      <p className="mt-1 text-sm text-[#7d8491]">
                        {item.projectName} · {item.assigneeName}
                      </p>
                    </div>
                    <div className={`text-xs uppercase tracking-[0.16em] text-[#b9ff66] ${jetbrains.className}`}>
                      {new Date(item.deadline).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border border-[#222] bg-[#0a0a0a] p-6">
            <div className="mb-5 flex items-center justify-between border-b border-[#222] pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#666]">Forecast</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Dự án và thành viên nóng</h2>
              </div>
              <div className={`text-sm text-[#60a5fa] ${jetbrains.className}`}>
                {Math.round((stats?.workloadSummary?.avgLoadRatio || 0) * 100)}% tải TB
              </div>
            </div>

            <div className="space-y-3">
              {(stats?.riskyProjects || []).slice(0, 2).map((project) => (
                <div key={project.id} className="border border-[#1d1f28] bg-[#111] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">{project.ten}</p>
                    <span className="text-sm text-[#ffb28c]">{project.slipProbability}%</span>
                  </div>
                  <p className="mt-1 text-sm text-[#7d8491]">
                    {project.forecastStatus === 'slipping' ? 'Nguy cơ trễ cao' : 'Cần theo dõi sát'}
                  </p>
                </div>
              ))}

              {(stats?.overloadedMembers || []).slice(0, 3).map((member) => (
                <div key={member.userId} className="flex items-center justify-between border border-[#1d1f28] bg-[#111] px-4 py-3">
                  <div>
                    <p className="font-semibold text-white">{member.ten}</p>
                    <p className="mt-1 text-sm text-[#7d8491]">
                      {member.activeTasks} task đang mở
                    </p>
                  </div>
                  <span className="text-sm text-[#b9ff66]">{Math.round(member.loadRatio * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Project Invitations */}
        <div className="mb-12">
          <ProjectInvitations />
        </div>

        {/* Recent Projects Section */}
        <div>
          <div className="flex items-center justify-between border-b border-[#222] pb-4 mb-8">
            <h2 className="text-2xl font-bold text-white uppercase tracking-wide flex items-center gap-3">
              <div className="w-2 h-2 bg-[#b9ff66] animate-pulse" />
              Recent Vectors
            </h2>
            <Link
              href="/dashboard/projects"
              className="group flex items-center text-sm font-semibold text-[#888] hover:text-[#b9ff66] transition-colors uppercase tracking-widest"
            >
              View All
              <ArrowUpRight className="ml-1 w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="relative overflow-hidden border border-dashed border-[#333] p-16 text-center bg-[#0a0a0a] flex flex-col items-center justify-center group hover:border-[#b9ff66]/50 transition-colors">
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.02)_50%,transparent_75%,transparent_100%)] bg-[length:4px_4px]" />
              <div className="w-16 h-16 bg-[#111] rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FolderDot className="w-8 h-8 text-[#555] group-hover:text-[#b9ff66] transition-colors" />
              </div>
              <p className="text-xl font-bold text-white mb-2">No active projects found</p>
              <p className="text-[#666] mb-8 font-light">System is waiting for your first directive.</p>
              <button
                onClick={() => setCreateProjectOpen(true)}
                className="px-6 py-2 border border-[#b9ff66] text-[#b9ff66] hover:bg-[#b9ff66] hover:text-black transition-colors font-bold uppercase tracking-widest text-sm"
              >
                Initialize
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.slice(0, 6).map((project: Project, index: number) => (
                <div
                  key={project.id}
                  className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <ProjectCard project={project} />
                </div>
              ))}
            </div>
          )}
        </div>

        <CreateProjectModal
          open={createProjectOpen}
          onOpenChange={setCreateProjectOpen}
        />
      </div>
    </div>
  );
}
