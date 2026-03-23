'use client';

import { ComponentProps, useMemo, useState } from 'react';
import { AlertCircle, Filter, Keyboard, Layers3, PlusCircle, Sparkles, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { CreateTaskModal } from '@/components/kanban/create-task-modal';
import { TaskDetailModal } from '@/components/kanban/task-detail-modal';
import { Task as KanbanTask } from '@/components/kanban/kanban-column';
import { DashboardPageShell, DashboardSection } from '@/components/dashboard/page-shell';
import { SavedViewBar } from '@/components/governance/saved-view-bar';
import { ShortcutDialog } from '@/components/governance/shortcut-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Pagination } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useHotkeys } from '@/lib/hooks/use-hotkeys';
import { useProjectParts, type ProjectPart } from '@/lib/hooks/use-project-parts';
import { useProjects } from '@/lib/hooks/use-projects';
import { useSavedViews } from '@/lib/hooks/use-saved-views';
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
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const savedViews = useSavedViews<{
    projectId: string;
    partId: string;
    riskFilter: RiskFilter;
  }>('kanban');

  const { data: projects, isLoading: projectsLoading } = useProjects({ page: 1, limit: 100 });
  const projectList = projects?.data || [];
  const effectiveProjectId = projectList.some((project) => project.id === selectedProjectId) ? selectedProjectId : (projectList[0]?.id ?? '');

  const { data: parts, isLoading: partsLoading } = useProjectParts(effectiveProjectId);
  const partList = parts || [];
  const effectivePartId = partList.some((part) => part.id === selectedPartId) ? selectedPartId : (partList[0]?.id ?? '');
  const selectedProjectName = projectList.find((project) => project.id === effectiveProjectId)?.ten || 'Chưa chọn dự án';
  const selectedPartName = partList.find((part) => part.id === effectivePartId)?.ten || '';
  const riskFilterLabel =
    {
      all: 'Tất cả mức rủi ro',
      low: 'Rủi ro thấp',
      medium: 'Rủi ro trung bình',
      high: 'Rủi ro cao',
      stale: 'Chậm cập nhật',
    }[riskFilter] || 'Tất cả mức rủi ro';
  const hasCustomFilters = Boolean(selectedProjectId || selectedPartId || riskFilter !== 'all');

  const { data: tasksResponse, isLoading: tasksLoading, error } = useTasks({
    page: currentPage,
    limit: itemsPerPage,
    duAnId: effectiveProjectId || undefined,
    phanDuAnId: effectivePartId || undefined,
    riskLevel: riskFilter === 'low' || riskFilter === 'medium' || riskFilter === 'high' ? riskFilter : undefined,
    isStale: riskFilter === 'stale',
  });

  const currentView = useMemo(
    () => ({
      projectId: selectedProjectId,
      partId: selectedPartId,
      riskFilter,
    }),
    [riskFilter, selectedPartId, selectedProjectId]
  );

  const tasks = tasksResponse?.data || [];
  const pagination = tasksResponse?.pagination;
  const highRiskCount = tasks.filter((task) => task.risk_level === 'high' || (task.risk_score || 0) >= 70).length;
  const inProgressCount = tasks.filter((task) => task.trang_thai === 'in-progress').length;
  const staleCount = tasks.filter((task) => task.is_stale).length;

  useHotkeys([
    {
      key: 'c',
      action: (event) => {
        if (!effectivePartId) return;
        event.preventDefault();
        setInitialStatus('todo');
        setCreateTaskOpen(true);
      },
    },
    {
      key: '?',
      action: (event) => {
        event.preventDefault();
        setShortcutOpen(true);
      },
    },
    {
      key: '1',
      action: () => setRiskFilter('all'),
    },
    {
      key: '2',
      action: () => setRiskFilter('high'),
    },
  ]);

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
    });
  };

  const isLoading = projectsLoading || tasksLoading;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <Skeleton className="h-[220px] rounded-[38px]" />
        <div className="mt-6 space-y-4">
          <Skeleton className="h-[120px] rounded-[30px]" />
          <Skeleton className="h-[440px] rounded-[30px]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="rounded-[28px] border border-[#f0ddd1] bg-[#fff3ed] p-6 text-[#a05735]">
          <h3 className="font-semibold">Không thể tải bảng Kanban</h3>
          <p className="mt-2 text-sm">Vui lòng thử lại sau hoặc chuyển sang một dự án khác.</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardPageShell
      badge={
        <>
          <Sparkles className="h-3.5 w-3.5 text-[#87ac63]" />
          Kanban
        </>
      }
      title="Bảng Kanban"
      description="Theo dõi task theo trạng thái, lọc nhanh theo dự án và mức rủi ro."
      actions={
        <>
          <Button
            className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]"
            onClick={() => {
              if (!effectivePartId) {
                toast.error('Vui lòng chọn phần dự án trước khi tạo task');
                return;
              }
              setInitialStatus('todo');
              setCreateTaskOpen(true);
            }}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Tạo task
          </Button>
          <Button variant="outline" className="border-[#e0e6d7] bg-white text-[#5d6958] hover:bg-[#f6f8f1]" onClick={() => setShortcutOpen(true)}>
            <Keyboard className="mr-2 h-4 w-4" />
            Phím tắt
          </Button>
        </>
      }
      metrics={[
        {
          label: 'Task đang mở',
          value: tasks.length.toString(),
          note: 'Trong bộ lọc hiện tại',
          icon: <Layers3 className="h-4 w-4 text-[#2f6052]" />,
          surfaceClassName: 'bg-[#eef6f0] border-[#d9eadf]',
          valueClassName: 'text-[#2f6052]',
        },
        {
          label: 'Đang triển khai',
          value: inProgressCount.toString(),
          note: 'Task ở giữa guồng chạy',
          icon: <Filter className="h-4 w-4 text-[#39638d]" />,
          surfaceClassName: 'bg-[#edf5ff] border-[#d8e6f7]',
          valueClassName: 'text-[#39638d]',
        },
        {
          label: 'Rủi ro cao',
          value: highRiskCount.toString(),
          note: 'Cần theo dõi kỹ hơn',
          icon: <TriangleAlert className="h-4 w-4 text-[#b66944]" />,
          surfaceClassName: 'bg-[#fff1e8] border-[#f0ddd1]',
          valueClassName: 'text-[#b66944]',
        },
        {
          label: 'Chậm cập nhật',
          value: staleCount.toString(),
          note: 'Task có dấu hiệu bị quên',
          icon: <AlertCircle className="h-4 w-4 text-[#985c21]" />,
          surfaceClassName: 'bg-[#fff6df] border-[#eee1bb]',
          valueClassName: 'text-[#985c21]',
        },
      ]}
    >
      <SavedViewBar
        title="Góc nhìn đã lưu"
        description="Lưu nhanh bộ lọc Kanban hiện tại để quay lại đúng ngữ cảnh đang theo dõi."
        views={savedViews.views}
        onApply={(view) => {
          setSelectedProjectId(view.projectId);
          setSelectedPartId(view.partId);
          setRiskFilter(view.riskFilter);
          setCurrentPage(1);
        }}
        onSave={(name) => savedViews.saveView(name, currentView)}
        onDelete={savedViews.removeView}
        disabled={!savedViews.isReady}
        saving={savedViews.isSaving}
      />

      <DashboardSection
        title="Bộ lọc"
        description="Chọn nhanh ngữ cảnh cần theo dõi rồi lao vào bảng task."
        actions={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full border border-[#dde6d4] bg-[#f8fbf3] px-4 text-[#5c6b57] hover:bg-[#eef4e7]"
            onClick={() => {
              setSelectedProjectId('');
              setSelectedPartId('');
              setRiskFilter('all');
              setCurrentPage(1);
            }}
            disabled={!hasCustomFilters}
          >
            Đưa về mặc định
          </Button>
        }
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.6fr)]">
          <div className="rounded-[24px] border border-[#dde7d4] bg-[linear-gradient(160deg,#f8fbf4_0%,#f3f7ec_58%,#eef4e7_100%)] p-4 text-[#32412f] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#718068]">Ngữ cảnh đang xem</p>
                <p className="mt-2 text-lg font-semibold text-[#22301f]">{selectedProjectName}</p>
                <p className="mt-1 text-sm leading-6 text-[#62705d]">
                  {selectedPartName || 'Tất cả phần việc'} • {riskFilterLabel}
                </p>
              </div>
              <div className="rounded-2xl border border-[#d7e2cd] bg-white/80 p-2 text-[#5f7657]">
                <Filter className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-[#d8e3cf] bg-white/85 px-3 py-1 text-xs text-[#53634f]">
                Dự án: {selectedProjectName}
              </span>
              <span className="rounded-full border border-[#d8e3cf] bg-white/85 px-3 py-1 text-xs text-[#53634f]">
                Phần việc: {selectedPartName || 'Tất cả'}
              </span>
              <span className="rounded-full border border-[#d8e3cf] bg-white/85 px-3 py-1 text-xs text-[#53634f]">
                Ưu tiên xem: {riskFilterLabel}
              </span>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[22px] border border-[#e6ebdf] bg-[#fcfdf9] p-3">
              <Label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d7a66]">Dự án</Label>
              <p className="mb-3 text-sm text-[#687465]">Đổi không gian làm việc trước khi xem task.</p>
              <Select
                value={effectiveProjectId}
                onValueChange={(value) => {
                  setSelectedProjectId(value);
                  setSelectedPartId('');
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-11 w-full rounded-2xl border-[#dfe5d6] bg-white text-[#233021] shadow-none" aria-label="Chọn dự án">
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

            <div className="rounded-[22px] border border-[#e6ebdf] bg-[#fcfdf9] p-3">
              <Label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d7a66]">Phần dự án</Label>
              <p className="mb-3 text-sm text-[#687465]">Thu gọn bảng về đúng nhóm việc cần xử lý.</p>
              <Select
                value={effectivePartId}
                onValueChange={(value) => {
                  setSelectedPartId(value);
                  setCurrentPage(1);
                }}
                disabled={!effectiveProjectId || partsLoading}
              >
                <SelectTrigger className="h-11 w-full rounded-2xl border-[#dfe5d6] bg-white text-[#233021] shadow-none" aria-label="Chọn phần dự án">
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

            <div className="rounded-[22px] border border-[#e6ebdf] bg-[#fcfdf9] p-3">
              <Label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d7a66]">Lọc theo rủi ro</Label>
              <p className="mb-3 text-sm text-[#687465]">Khoanh nhanh các task cần nhìn sớm hơn.</p>
              <Select
                value={riskFilter}
                onValueChange={(value) => {
                  setRiskFilter(value as RiskFilter);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-11 w-full rounded-2xl border-[#dfe5d6] bg-white text-[#233021] shadow-none" aria-label="Lọc theo rủi ro">
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="low">Rủi ro thấp</SelectItem>
                  <SelectItem value="medium">Rủi ro trung bình</SelectItem>
                  <SelectItem value="high">Rủi ro cao</SelectItem>
                  <SelectItem value="stale">Chậm cập nhật</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </DashboardSection>

      {!effectivePartId && effectiveProjectId && partList.length === 0 ? (
        <div className="rounded-[24px] border border-[#efe5bf] bg-[#fff9e8] p-4 text-[#8f7443]">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold">Dự án này chưa có phần việc</h3>
              <p className="mt-1 text-sm">Hãy tạo phần dự án trước để có thể mở bảng Kanban và thêm task mới.</p>
            </div>
          </div>
        </div>
      ) : null}

      <DashboardSection title="Bảng task" description="Kéo thả và mở chi tiết task như bình thường.">
        <KanbanBoard tasks={tasks} onTaskClick={handleTaskClick} onAddTask={handleAddTask} />

        {pagination && pagination.totalPages > 1 ? (
          <div className="mt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              itemsPerPage={pagination.limit}
              onPageChange={setCurrentPage}
            />
          </div>
        ) : null}
      </DashboardSection>

      <CreateTaskModal
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        initialStatus={initialStatus}
        phanDuAnId={effectivePartId}
        phanDuAnName={selectedPartName}
        projectId={effectiveProjectId}
      />

      <TaskDetailModal task={selectedTask} open={!!selectedTask} onOpenChange={(isOpen) => !isOpen && setSelectedTask(null)} />

      <ShortcutDialog
        open={shortcutOpen}
        onOpenChange={setShortcutOpen}
        title="Phím tắt Kanban"
        items={[
          { keyLabel: 'C', description: 'Mở nhanh modal tạo task mới' },
          { keyLabel: '1', description: 'Đặt bộ lọc rủi ro về tất cả' },
          { keyLabel: '2', description: 'Lọc nhanh nhóm task rủi ro cao' },
          { keyLabel: '?', description: 'Mở bảng phím tắt' },
        ]}
      />
    </DashboardPageShell>
  );
}
