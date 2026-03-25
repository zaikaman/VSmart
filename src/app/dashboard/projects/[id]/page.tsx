'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { CreatePartModal } from '@/components/projects/create-part-modal';
import { EditPartModal } from '@/components/projects/edit-part-modal';
import { ProjectMembersManager } from '@/components/projects/project-members-manager';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectForecast } from '@/lib/hooks/use-planning';
import {
  useDeleteProjectPart,
  useProjectParts,
  type ProjectPart,
} from '@/lib/hooks/use-project-parts';
import { useDeleteProject, useProject } from '@/lib/hooks/use-projects';

const statusColors = {
  todo: 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200',
  'in-progress': 'bg-[#b9ff66] text-black hover:bg-[#a3e659] border-[#b9ff66]',
  done: 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200',
};

const RebalancePanel = dynamic(
  () => import('@/components/ai/rebalance-panel').then((mod) => ({ default: mod.RebalancePanel })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[180px] rounded-[24px]" />,
  }
);

const ActivityFeed = dynamic(
  () => import('@/components/governance/activity-feed').then((mod) => ({ default: mod.ActivityFeed })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[260px] rounded-[24px]" />,
  }
);

const statusLabels = {
  todo: 'Cần làm',
  'in-progress': 'Đang thực hiện',
  done: 'Hoàn thành',
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: parts, isLoading: partsLoading } = useProjectParts(projectId);
  const { data: forecast } = useProjectForecast(projectId);

  const [createPartOpen, setCreatePartOpen] = useState(false);
  const [editPartOpen, setEditPartOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<ProjectPart | null>(null);
  const [deletePartId, setDeletePartId] = useState<string | null>(null);
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);

  const deletePartMutation = useDeleteProjectPart(projectId);
  const deleteProjectMutation = useDeleteProject();

  const isLoading = projectLoading || partsLoading;
  const canManageProject = project?.permissions?.canManageProject ?? false;
  const canDeleteProject = project?.permissions?.canDeleteProject ?? false;
  const canManageMembers = project?.permissions?.canManageMembers ?? false;

  const handleDeletePart = async (partId: string) => {
    try {
      await deletePartMutation.mutateAsync(partId);
      toast.success('Đã xóa phần dự án.');
      setDeletePartId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể xóa phần dự án');
    }
  };

  const handleDeleteProject = async () => {
    try {
      await deleteProjectMutation.mutateAsync(projectId);
      toast.success('Dự án đã được xóa khỏi danh sách.');
      setDeleteProjectOpen(false);
      router.push('/dashboard/projects');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể xóa dự án');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="mb-6 h-8 w-32" />
        <Skeleton className="mb-2 h-10 w-64" />
        <Skeleton className="mb-8 h-5 w-96" />
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto p-6">
        <div className="py-12 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h2 className="mb-2 text-xl font-semibold">Không tìm thấy dự án</h2>
          <p className="mb-4 text-gray-500">
            Dự án này không còn tồn tại hoặc bạn không còn quyền truy cập.
          </p>
          <Button onClick={() => router.push('/dashboard/projects')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại danh sách
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Link
        href="/dashboard/projects"
        className="mb-6 inline-flex items-center text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại danh sách dự án
      </Link>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold">{project.ten}</h1>
            <Badge variant="outline" className={`${statusColors[project.trang_thai]} border`}>
              {statusLabels[project.trang_thai]}
            </Badge>
            {project.current_membership_role ? (
              <Badge variant="secondary">Vai trò: {project.current_membership_role}</Badge>
            ) : null}
          </div>
          {project.mo_ta ? <p className="max-w-2xl text-gray-600">{project.mo_ta}</p> : null}
        </div>

        {canManageProject || canDeleteProject ? (
          <div className="flex flex-wrap items-center justify-end gap-3">
            {canDeleteProject ? (
              <Button
                variant="outline"
                className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                onClick={() => setDeleteProjectOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Xóa dự án
              </Button>
            ) : null}
            {canManageProject ? (
              <Button
                onClick={() => setCreatePartOpen(true)}
                className="bg-black text-white hover:bg-gray-800"
              >
                <Plus className="mr-2 h-4 w-4" /> Thêm phần dự án
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {forecast && forecast.forecastStatus !== 'on-track' ? (
        <div
          className={`mb-8 rounded-2xl border p-5 ${
            forecast.forecastStatus === 'slipping'
              ? 'border-rose-200 bg-rose-50'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
                Forecast dự án
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                {forecast.forecastStatus === 'slipping'
                  ? `Nguy cơ trễ khoảng ${forecast.projectedDelayDays} ngày`
                  : 'Dự án bắt đầu có tín hiệu cần theo dõi'}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Xác suất trượt mốc hiện ở mức {forecast.slipProbability}%. {forecast.reasons[0]}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline">Quá hạn {forecast.summary.overdueTasks}</Badge>
                <Badge variant="outline">Rủi ro cao {forecast.summary.highRiskTasks}</Badge>
                <Badge variant="outline">Quá tải {forecast.summary.overloadedMembers}</Badge>
              </div>
            </div>

            <Link href="/dashboard/planning">
              <Button variant="outline">Mở planning</Button>
            </Link>
          </div>
        </div>
      ) : null}

      <div className="mb-8">
        <RebalancePanel projectId={projectId} title="AI cân lại tải cho dự án này" compact />
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Tiến độ</CardTitle>
            <CheckCircle className="h-4 w-4 text-[#b9ff66]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {project.phan_tram_hoan_thanh?.toFixed(0) || 0}%
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-[#b9ff66]"
                style={{ width: `${project.phan_tram_hoan_thanh || 0}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Deadline</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(project.deadline).toLocaleDateString('vi-VN')}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {Math.ceil(
                (new Date(project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              )}{' '}
              ngày còn lại
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Phần dự án</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{parts?.length || 0}</div>
            <p className="mt-1 text-xs text-slate-500">Được phân công</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h2 className="mb-4 text-xl font-semibold">Các phần dự án</h2>

          {!parts || parts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-slate-50 py-12 text-center">
              <p className="mb-4 text-slate-500">Chưa có phần dự án nào.</p>
              {canManageProject ? (
                <Button onClick={() => setCreatePartOpen(true)} variant="outline">
                  <Plus className="mr-2 h-4 w-4" /> Thêm phần dự án đầu tiên
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {parts.map((part: ProjectPart) => (
                <Card key={part.id} className="group transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg transition-colors group-hover:text-[#8abe4b]">
                          {part.ten}
                        </CardTitle>
                      </div>
                      <Badge
                        variant="outline"
                        className={`${statusColors[part.trang_thai]} border`}
                      >
                        {statusLabels[part.trang_thai]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {part.mo_ta ? (
                      <p className="mb-3 line-clamp-2 text-sm text-gray-600">{part.mo_ta}</p>
                    ) : null}
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-gray-500">
                        Tiến độ:{' '}
                        <span className="font-medium">
                          {part.phan_tram_hoan_thanh?.toFixed(0) || 0}%
                        </span>
                      </span>
                      <span className="text-gray-500">
                        Deadline:{' '}
                        <span className="font-medium">
                          {new Date(part.deadline).toLocaleDateString('vi-VN')}
                        </span>
                      </span>
                    </div>
                    <div className="mb-3 h-1.5 w-full rounded-full bg-gray-100">
                      <div
                        className="h-1.5 rounded-full bg-[#b9ff66]"
                        style={{ width: `${part.phan_tram_hoan_thanh || 0}%` }}
                      />
                    </div>
                    {canManageProject ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setSelectedPart(part);
                            setEditPartOpen(true);
                          }}
                        >
                          <Pencil className="mr-1 h-3 w-3" /> Sửa
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setDeletePartId(part.id)}
                        >
                          <Trash2 className="mr-1 h-3 w-3" /> Xóa
                        </Button>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" /> Quản lý thành viên
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectMembersManager projectId={projectId} canManage={canManageMembers} />
            </CardContent>
          </Card>

          <ActivityFeed projectId={projectId} />
        </div>
      </div>

      <CreatePartModal
        open={createPartOpen}
        onOpenChange={setCreatePartOpen}
        projectId={projectId}
      />

      {selectedPart ? (
        <EditPartModal
          open={editPartOpen}
          onOpenChange={setEditPartOpen}
          projectId={projectId}
          part={selectedPart}
        />
      ) : null}

      <AlertDialog open={Boolean(deletePartId)} onOpenChange={() => setDeletePartId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Phần dự án này sẽ biến mất khỏi màn hình làm việc cùng toàn bộ task định kỳ liên quan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePartMutation.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePartId && handleDeletePart(deletePartId)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deletePartMutation.isPending}
            >
              {deletePartMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang xóa...
                </>
              ) : (
                'Xóa phần này'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteProjectOpen} onOpenChange={setDeleteProjectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa toàn bộ dự án?</AlertDialogTitle>
            <AlertDialogDescription>
              Dự án sẽ bị gỡ khỏi danh sách, các phần dự án và task liên quan cũng bị ẩn, đồng thời
              lịch tạo task định kỳ sẽ được tắt để không phát sinh dữ liệu mới.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProjectMutation.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              className="bg-rose-600 hover:bg-rose-700"
              disabled={deleteProjectMutation.isPending}
            >
              {deleteProjectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang xóa...
                </>
              ) : (
                'Xóa dự án'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
