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
      { label: 'Task đang mở', value: workloadQuery.data?.summary.totalActiveTasks || 0, accent: 'text-[#b9ff66]', icon: Layers3 },
      { label: 'Điểm nóng quá tải', value: workloadQuery.data?.summary.overloadedMembers || 0, accent: 'text-[#ffab87]', icon: Flame },
      { label: 'Rủi ro cao trong tuần', value: calendarQuery.data?.summary.highRiskTasks || 0, accent: 'text-[#ffcf6c]', icon: Radar },
      { label: 'Thành viên đang theo dõi', value: workloadQuery.data?.summary.totalMembers || 0, accent: 'text-[#8dc9ff]', icon: Users },
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

  return (
    <div className={`min-h-[calc(100vh-4rem)] bg-[#eef1e7] ${bricolage.className}`}>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <section className="relative overflow-hidden rounded-[36px] bg-[#191a23] px-6 py-8 text-white md:px-8 md:py-10">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top,_rgba(185,255,102,0.18),_transparent_58%)]" />
          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-end">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-[#b9ff66]">
                <Route className="h-3.5 w-3.5" />
                Planning room
              </div>
              <h1 className="max-w-3xl text-4xl font-extrabold leading-tight md:text-5xl">
                Cân lịch, dàn tải và nhìn trước điểm nghẽn trước khi task bắt đầu trễ.
              </h1>
              <p className="mt-4 max-w-2xl text-base text-white/68">
                Màn hình này gom ba lớp nhìn quan trọng nhất cho đội triển khai: lịch deadline, timeline theo nhịp tuần và heatmap năng lực của từng người.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {overviewCards.map((card) => (
                <div key={card.label} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between text-white/55">
                    <span className="text-xs uppercase tracking-[0.2em]">{card.label}</span>
                    <card.icon className="h-4 w-4" />
                  </div>
                  <div className={`mt-3 text-3xl font-semibold ${card.accent} ${jetbrains.className}`}>{card.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-6">
          <SavedViewBar
            title="Góc nhìn đã lưu"
            description="Lưu tổ hợp tab và bộ lọc Planning để mở lại đúng nhịp theo dõi chỉ trong một chạm."
            views={savedViews.views}
            onApply={(view) => {
              setSelectedProjectId(view.projectId);
              setSelectedAssigneeId(view.assigneeId);
              setActiveTab(view.activeTab);
            }}
            onSave={(name) => savedViews.saveView(name, {
              projectId: selectedProjectId,
              assigneeId: selectedAssigneeId,
              activeTab,
            })}
            onDelete={savedViews.removeView}
            disabled={!savedViews.isReady}
            saving={savedViews.isSaving}
          />
        </div>

        <section className="mt-6 rounded-[30px] border border-[#d7dfcf] bg-white px-5 py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-3">
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="min-w-[220px]" aria-label="Chọn dự án cho planning">
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
                <SelectTrigger className="min-w-[240px]" aria-label="Chọn thành viên cho planning">
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
              {([
                { key: 'calendar', label: 'Calendar', icon: CalendarDays },
                { key: 'timeline', label: 'Timeline', icon: Route },
                { key: 'workload', label: 'Workload', icon: Users },
              ] as const).map((tab) => (
                <Button
                  key={tab.key}
                  type="button"
                  variant={activeTab === tab.key ? 'default' : 'outline'}
                  className={activeTab === tab.key ? 'bg-[#191a23] text-white hover:bg-[#2a2b35]' : ''}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <tab.icon className="mr-2 h-4 w-4" />
                  {tab.label}
                </Button>
              ))}
              <Button variant="outline" onClick={() => setShortcutOpen(true)}>
                <Keyboard className="mr-2 h-4 w-4" />
                Phím tắt
              </Button>
            </div>
          </div>

          <div className="mt-4 text-sm text-[#62705d]">
            Khung thời gian: <strong>{format(range.start, 'dd/MM/yyyy')}</strong> đến <strong>{format(range.end, 'dd/MM/yyyy')}</strong>
          </div>
        </section>

        <div className="mt-6">
          <RebalancePanel projectId={projectFilter} title={projectFilter ? 'AI cân lại tải cho dự án này' : 'AI cân lại tải cho toàn bộ đội'} compact />
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
            { keyLabel: '1 / 2 / 3', description: 'Chuyển nhanh giữa Calendar, Timeline và Workload' },
            { keyLabel: '[ / ]', description: 'Lùi hoặc tiến thêm một tuần trên lịch planning' },
            { keyLabel: '?', description: 'Mở bảng phím tắt' },
          ]}
        />
      </div>
    </div>
  );
}
