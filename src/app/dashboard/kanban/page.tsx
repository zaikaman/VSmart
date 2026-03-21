'use client';

import { ComponentProps, useState } from 'react';
import { AlertCircle, Filter } from 'lucide-react';
import { Task as KanbanTask } from '@/components/kanban/kanban-column';
import { toast } from 'sonner';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { CreateTaskModal } from '@/components/kanban/create-task-modal';
import { TaskDetailModal } from '@/components/kanban/task-detail-modal';
import { Label } from '@/components/ui/label';
import { Pagination } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectParts, ProjectPart } from '@/lib/hooks/use-project-parts';
import { useProjects } from '@/lib/hooks/use-projects';
import { useUserSettings } from '@/lib/hooks/use-settings';
import { useTasks } from '@/lib/hooks/use-tasks';

type RiskFilter = 'all' | 'low' | 'medium' | 'high' | 'stale';
type TaskDetailData = ComponentProps<typeof TaskDetailModal>['task'];

export default function KanbanPage() {
  const { data: settingsResponse } = useUserSettings();
  const itemsPerPage = settingsResponse?.data?.dashboard?.itemsPerPage || 10;

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedPartId, setSelectedPartId] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTask, setSelectedTask] = useState<TaskDetailData>(null);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [initialStatus, setInitialStatus] = useState('todo');

  const { data: projects, isLoading: projectsLoading } = useProjects({ page: 1, limit: 100 });
  const projectList = projects?.data || [];
  const effectiveProjectId = projectList.some((project) => project.id === selectedProjectId)
    ? selectedProjectId
    : (projectList[0]?.id ?? '');

  const { data: parts, isLoading: partsLoading } = useProjectParts(effectiveProjectId);
  const partList = parts || [];
  const effectivePartId = partList.some((part) => part.id === selectedPartId)
    ? selectedPartId
    : (partList[0]?.id ?? '');
  const selectedPartName = partList.find((part) => part.id === effectivePartId)?.ten || '';

  const { data: tasksResponse, isLoading: tasksLoading, error } = useTasks({
    page: currentPage,
    limit: itemsPerPage,
    duAnId: effectiveProjectId || undefined,
    phanDuAnId: effectivePartId || undefined,
    riskLevel:
      riskFilter === 'low' || riskFilter === 'medium' || riskFilter === 'high'
        ? riskFilter
        : undefined,
    isStale: riskFilter === 'stale',
  });

  const handleProjectChange = (value: string) => {
    setSelectedProjectId(value);
    setSelectedPartId('');
    setCurrentPage(1);
  };

  const handlePartChange = (value: string) => {
    setSelectedPartId(value);
    setCurrentPage(1);
  };

  const handleRiskFilterChange = (value: string) => {
    setRiskFilter(value as RiskFilter);
    setCurrentPage(1);
  };

  const handleAddTask = (columnId: string) => {
    if (!effectivePartId) {
      toast.error('Vui lòng chọn phần dự án trước khi tạo task');
      return;
    }

    setInitialStatus(columnId);
    setCreateTaskOpen(true);
  };

  const handleTaskClick = (task: KanbanTask) => {
    setSelectedTask({
      id: task.id,
      ten: task.ten,
      moTa: task.mo_ta,
      deadline: task.deadline || null,
      trangThai: task.trang_thai || 'todo',
      priority: task.priority,
      progress: task.progress,
      riskScore: task.risk_score,
      nguoi_dung: task.nguoi_dung
        ? {
            hoTen: task.nguoi_dung.ten,
            email: task.nguoi_dung.email,
          }
        : null,
      phan_du_an: task.phan_du_an
        ? {
            ten: task.phan_du_an.ten,
            du_an: {
              ten: task.phan_du_an.du_an?.ten || '',
            },
          }
        : null,
      taoLuc: undefined,
      capNhatCuoi: undefined,
    });
  };

  const isLoading = projectsLoading || tasksLoading;
  const tasks = tasksResponse?.data || [];
  const pagination = tasksResponse?.pagination;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex gap-6">
          {[1, 2, 3].map((item) => (
            <div key={item} className="min-w-[320px]">
              <Skeleton className="mb-4 h-12" />
              <Skeleton className="mb-3 h-40" />
              <Skeleton className="mb-3 h-40" />
              <Skeleton className="h-40" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <h3 className="font-semibold">Lỗi tải tasks</h3>
          <p className="mt-1 text-sm">Vui lòng thử lại sau</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold">Bảng Kanban</h1>
        <p className="text-gray-600">Quản lý tasks theo từng trạng thái</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-4">
        <div className="min-w-[250px]">
          <Label className="mb-1 block text-sm text-gray-600">Dự án</Label>
          <Select value={effectiveProjectId} onValueChange={handleProjectChange}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn dự án" />
            </SelectTrigger>
            <SelectContent>
              {projectList.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.ten}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[250px]">
          <Label className="mb-1 block text-sm text-gray-600">Phần dự án</Label>
          <Select
            value={effectivePartId}
            onValueChange={handlePartChange}
            disabled={!effectiveProjectId || partsLoading}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  !effectiveProjectId
                    ? 'Chọn dự án trước'
                    : partsLoading
                      ? 'Đang tải...'
                      : partList.length === 0
                        ? 'Chưa có phần dự án'
                        : 'Chọn phần dự án'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {partList.map((part: ProjectPart) => (
                <SelectItem key={part.id} value={part.id}>
                  {part.ten}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[200px]">
          <Label className="mb-1 block text-sm text-gray-600">Lọc theo rủi ro</Label>
          <Select value={riskFilter} onValueChange={handleRiskFilterChange}>
            <SelectTrigger>
              <SelectValue placeholder="Tất cả" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <span>Tất cả</span>
                </div>
              </SelectItem>
              <SelectItem value="low">Rủi ro thấp</SelectItem>
              <SelectItem value="medium">Rủi ro trung bình</SelectItem>
              <SelectItem value="high">Rủi ro cao</SelectItem>
              <SelectItem value="stale">Không cập nhật</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!effectivePartId && effectiveProjectId && partList.length === 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold">Chưa có phần dự án</h3>
            <p className="mt-1 text-sm">
              Dự án này chưa có phần dự án nào. Vui lòng tạo phần dự án trước để có thể thêm tasks.
            </p>
          </div>
        </div>
      )}

      <KanbanBoard tasks={tasks} onTaskClick={handleTaskClick} onAddTask={handleAddTask} />

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            itemsPerPage={pagination.limit}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      <CreateTaskModal
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        initialStatus={initialStatus}
        phanDuAnId={effectivePartId}
        phanDuAnName={selectedPartName}
        projectId={effectiveProjectId}
      />

      <TaskDetailModal
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
      />
    </div>
  );
}
