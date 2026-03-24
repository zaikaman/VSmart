'use client';

import { useMemo, useState } from 'react';
import { addDays, endOfWeek, format, startOfWeek } from 'date-fns';
import { Bricolage_Grotesque, JetBrains_Mono } from 'next/font/google';
import { CalendarDays, Flame, Keyboard, Layers3, Radar, Route, Users } from 'lucide-react';
import { toast } from 'sonner';
import { RebalancePanel } from '@/components/ai/rebalance-panel';
import { SavedViewBar } from '@/components/governance/saved-view-bar';
import { ShortcutDialog } from '@/components/governance/shortcut-dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarView } from '@/components/planning/calendar-view';
import { TimelineView } from '@/components/planning/timeline-view';
import { WorkloadHeatmap } from '@/components/planning/workload-heatmap';
import { useHotkeys } from '@/lib/hooks/use-hotkeys';
import { useProjects } from '@/lib/hooks/use-projects';
import { useSavedViews } from '@/lib/hooks/use-saved-views';
import { usePlanningCalendar, usePlanningWorkload, useRescheduleTask, type PlanningTaskItem } from '@/lib/hooks/use-planning';

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['400', '600', '800'] });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '700'] });

type PlanningTab = 'calendar' | 'timeline' | 'workload';

function getInitialWeek() {
  const now = new Date();
  return {
    start: startOfWeek(now, { weekStartsOn: 1 }),
    end: endOfWeek(now, { weekStartsOn: 1 }),
  };
}

export default function PlanningPage() {
  const [activeTab, setActiveTab] = useState<PlanningTab>('calendar');
  const [range, setRange] = useState(getInitialWeek);
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('all');
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const savedViews = useSavedViews<{
    projectId: string;
    assigneeId: string;
    activeTab: PlanningTab;
  }>('planning');

  const { data: projectsResponse, isLoading: projectsLoading } = useProjects({ page: 1, limit: 100 });
  const rescheduleTask = useRescheduleTask();
  const projects = projectsResponse?.data || [];
  const projectFilter = selectedProjectId === 'all' ? undefined : selectedProjectId;

  const workloadQuery = usePlanningWorkload({ projectId: projectFilter });
  const members = workloadQuery.data?.members || [];
  const effectiveAssigneeId =
    selectedAssigneeId !== 'all' && members.some((member) => member.userId === selectedAssigneeId)
      ? selectedAssigneeId
      : 'all';

  const calendarQuery = usePlanningCalendar({
    projectId: projectFilter,
    assigneeId: effectiveAssigneeId === 'all' ? undefined : effectiveAssigneeId,
    dateFrom: range.start.toISOString(),
    dateTo: range.end.toISOString(),
  });

  useHotkeys([
    { key: '1', action: () => setActiveTab('calendar') },
    { key: '2', action: () => setActiveTab('timeline') },
    { key: '3', action: () => setActiveTab('workload') },
    { key: '[', action: () => setRange((current) => ({ start: addDays(current.start, -7), end: addDays(current.end, -7) })) },
    { key: ']', action: () => setRange((current) => ({ start: addDays(current.start, 7), end: addDays(current.end, 7) })) },
    {
      key: '?',
      action: (event) => {
        event.preventDefault();
        setShortcutOpen(true);
      },
    },
  ]);

  const overviewCards = useMemo(
    () => [
      {
        label: 'Task đang mở',
        value: workloadQuery.data?.summary.totalActiveTasks || 0,
        note: 'Trong khung hiện tại',
        icon: Layers3,
        accentClass: 'text-[#2f6052]',
        surfaceClass: 'bg-[#eef6f0] border-[#d9eadf]',
      },
      {
        label: 'Thành viên quá tải',
        value: workloadQuery.data?.summary.overloadedMembers || 0,
        note: 'Cần cân lại sớm',
        icon: Flame,
        accentClass: 'text-[#b66944]',
        surfaceClass: 'bg-[#fff1e8] border-[#f0ddd1]',
      },
      {
        label: 'Task rủi ro cao',
        value: calendarQuery.data?.summary.highRiskTasks || 0,
        note: 'Nên theo dõi kỹ',
        icon: Radar,
        accentClass: 'text-[#985c21]',
        surfaceClass: 'bg-[#fff6df] border-[#eee1bb]',
      },
      {
        label: 'Thành viên trong bộ lọc',
        value: workloadQuery.data?.summary.totalMembers || 0,
        note: 'Nguồn lực đang xem',
        icon: Users,
        accentClass: 'text-[#39638d]',
        surfaceClass: 'bg-[#edf5ff] border-[#d8e6f7]',
      },
    ],
    [calendarQuery.data?.summary.highRiskTasks, workloadQuery.data?.summary]
  );

  const handleReschedule = async (task: PlanningTaskItem, nextDate: Date) => {
    try {
      const result = await rescheduleTask.mutateAsync({ taskId: task.id, deadline: nextDate.toISOString() });
      if (result.warnings?.length) {
        toast.warning(result.warnings[0]);
      } else {
        toast.success(result.message || 'Đã cập nhật deadline');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể dời lịch task');
    }
  };

  const isLoading = projectsLoading || workloadQuery.isLoading || calendarQuery.isLoading;
  const tabOptions = [
    { key: 'calendar', label: 'Lịch tuần', icon: CalendarDays },
    { key: 'timeline', label: 'Timeline', icon: Route },
    { key: 'workload', label: 'Tải công việc', icon: Users },
  ] as const;

  return (
    <div className={`min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,#fbfaf4_0%,#f4f6ef_44%,#edf2ea_100%)] ${bricolage.className}`}>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#7a8774]">Planning</div>
            <h1 className="text-[clamp(2rem,3.5vw,3rem)] font-bold leading-tight text-[#1f2b1f]">Xem lịch, timeline và tải công việc trong một chỗ.</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#61705f]">
              Chọn dự án, lọc theo người phụ trách rồi dời deadline trực tiếp khi cần.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-[#dbe4cf] bg-white px-3 py-1.5 text-sm text-[#5e6b58]">
              {format(range.start, 'dd/MM/yyyy')} đến {format(range.end, 'dd/MM/yyyy')}
            </div>
            <Button variant="outline" className="border-[#e2e7da] bg-white text-[#5d6958] hover:bg-[#f6f8f1]" onClick={() => setShortcutOpen(true)}>
              <Keyboard className="mr-2 h-4 w-4" />
              Phím tắt
            </Button>
          </div>
        </header>

        <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((card) => (
            <article key={card.label} className={`rounded-[24px] border p-4 shadow-[0_16px_35px_-32px_rgba(100,116,93,0.3)] ${card.surfaceClass}`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6a7762]">{card.label}</span>
                <card.icon className={`h-4 w-4 ${card.accentClass}`} />
              </div>
              <div className={`mt-3 text-3xl font-semibold ${card.accentClass} ${jetbrains.className}`}>{card.value}</div>
              <p className="mt-1.5 text-sm text-[#697564]">{card.note}</p>
            </article>
          ))}
        </div>

        <SavedViewBar
          title="Góc nhìn đã lưu"
          description="Lưu lại bộ lọc đang dùng để mở nhanh lần sau."
          views={savedViews.views}
          onApply={(view) => {
            setSelectedProjectId(view.projectId);
            setSelectedAssigneeId(view.assigneeId);
            setActiveTab(view.activeTab);
          }}
          onSave={(name) =>
            savedViews.saveView(name, {
              projectId: selectedProjectId,
              assigneeId: selectedAssigneeId,
              activeTab,
            })
          }
          onDelete={savedViews.removeView}
          disabled={!savedViews.isReady}
          saving={savedViews.isSaving}
        />

        <section className="mt-6 rounded-[30px] border border-[#dfe5d6] bg-white/90 px-5 py-5 shadow-[0_22px_65px_-48px_rgba(89,109,84,0.35)] backdrop-blur-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-3">
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="min-w-[220px] border-[#dfe5d6] bg-[#fbfcf8]" aria-label="Chọn dự án cho planning">
                  <SelectValue placeholder="Chọn dự án" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả dự án</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.ten}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={effectiveAssigneeId} onValueChange={setSelectedAssigneeId}>
                <SelectTrigger className="min-w-[240px] border-[#dfe5d6] bg-[#fbfcf8]" aria-label="Chọn thành viên cho planning">
                  <SelectValue placeholder="Tất cả thành viên" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả thành viên</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      {member.ten}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {tabOptions.map((tab) => (
                <Button
                  key={tab.key}
                  type="button"
                  variant="outline"
                  className={
                    activeTab === tab.key
                      ? 'border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e5f0d6]'
                      : 'border-[#e2e7da] bg-white text-[#5d6958] hover:bg-[#f6f8f1]'
                  }
                  onClick={() => setActiveTab(tab.key)}
                >
                  <tab.icon className="mr-2 h-4 w-4" />
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-6">
          <RebalancePanel projectId={projectFilter} title={projectFilter ? 'Gợi ý tái cân bằng dự án này' : 'Gợi ý tái cân bằng cho toàn đội'} compact />
        </div>

        <div className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-[180px] rounded-[30px]" />
              <Skeleton className="h-[420px] rounded-[30px]" />
            </div>
          ) : activeTab === 'calendar' ? (
            <CalendarView
              data={calendarQuery.data}
              onShiftRange={(direction) => setRange((current) => ({ start: addDays(current.start, direction * 7), end: addDays(current.end, direction * 7) }))}
              onToday={() => setRange(getInitialWeek())}
              onReschedule={handleReschedule}
              reschedulingTaskId={rescheduleTask.variables?.taskId || null}
            />
          ) : activeTab === 'timeline' ? (
            <TimelineView
              data={calendarQuery.data}
              onShiftRange={(direction) => setRange((current) => ({ start: addDays(current.start, direction * 7), end: addDays(current.end, direction * 7) }))}
              onReschedule={handleReschedule}
              reschedulingTaskId={rescheduleTask.variables?.taskId || null}
            />
          ) : (
            <WorkloadHeatmap data={workloadQuery.data} />
          )}
        </div>

        <ShortcutDialog
          open={shortcutOpen}
          onOpenChange={setShortcutOpen}
          title="Phím tắt Planning"
          items={[
            { keyLabel: '1 / 2 / 3', description: 'Chuyển nhanh giữa Lịch tuần, Timeline và Tải công việc' },
            { keyLabel: '[ / ]', description: 'Lùi hoặc tiến thêm một tuần' },
            { keyLabel: '?', description: 'Mở bảng phím tắt' },
          ]}
        />
      </div>
    </div>
  );
}
