'use client';

import { useMemo, useState } from 'react';
import { addDays, endOfWeek, format, startOfWeek } from 'date-fns';
import { Bricolage_Grotesque, JetBrains_Mono } from 'next/font/google';
import { CalendarDays, Flame, Keyboard, Layers3, Radar, Route, Sparkles, Users } from 'lucide-react';
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
        note: 'Khối việc đang chạy',
        icon: Layers3,
        accentClass: 'text-[#2f6052]',
        surfaceClass: 'bg-[#eef6f0] border-[#d9eadf]',
      },
      {
        label: 'Điểm nóng quá tải',
        value: workloadQuery.data?.summary.overloadedMembers || 0,
        note: 'Người cần giảm tải',
        icon: Flame,
        accentClass: 'text-[#b66944]',
        surfaceClass: 'bg-[#fff1e8] border-[#f0ddd1]',
      },
      {
        label: 'Rủi ro cao trong tuần',
        value: calendarQuery.data?.summary.highRiskTasks || 0,
        note: 'Task cần giữ sát',
        icon: Radar,
        accentClass: 'text-[#985c21]',
        surfaceClass: 'bg-[#fff6df] border-[#eee1bb]',
      },
      {
        label: 'Thành viên đang theo dõi',
        value: workloadQuery.data?.summary.totalMembers || 0,
        note: 'Nhịp phối hợp hiện tại',
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
        <section className="relative overflow-hidden rounded-[38px] border border-[#e3e7d8] bg-[linear-gradient(135deg,#fffdf7_0%,#f5f8ef_55%,#f0f5ee_100%)] px-6 py-7 shadow-[0_28px_80px_-48px_rgba(94,114,88,0.28)] md:px-8 md:py-8">
          <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,_rgba(210,227,189,0.6),_transparent_60%)]" />
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,_rgba(250,229,213,0.72),_transparent_68%)]" />

          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.25fr_0.95fr] lg:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#dde6cf] bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#61705f]">
                <Sparkles className="h-3.5 w-3.5 text-[#87ac63]" />
                Planning studio
              </div>

              <h1 className="mt-5 max-w-3xl text-[clamp(2.5rem,4vw,4rem)] font-extrabold leading-[1.02] text-[#1f2b1f]">
                Dàn lịch, cân tải và chốt điểm nghẽn trước khi deadline bắt đầu chồng lớp.
              </h1>

              <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#61705f]">
                Một không gian planning sáng, gọn và đủ sâu để team nhìn cùng lúc ba lớp quan trọng nhất:
                deadline theo tuần, chuyển động timeline và sức chứa thực tế của từng người.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-[#5e6b58]">
                <div className="rounded-full border border-[#dbe4cf] bg-white/80 px-3 py-1.5">
                  Khung thời gian <span className={`${jetbrains.className} font-semibold text-[#223021]`}>{format(range.start, 'dd/MM')}</span> đến{' '}
                  <span className={`${jetbrains.className} font-semibold text-[#223021]`}>{format(range.end, 'dd/MM')}</span>
                </div>
                <div className="rounded-full border border-[#eadfce] bg-[#fff7ef] px-3 py-1.5 text-[#8f684b]">
                  Kéo thả task để dời lịch ngay trên màn
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {overviewCards.map((card) => (
                <article key={card.label} className={`rounded-[24px] border p-4 shadow-[0_18px_40px_-32px_rgba(100,116,93,0.35)] ${card.surfaceClass}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6a7762]">{card.label}</span>
                    <card.icon className={`h-4 w-4 ${card.accentClass}`} />
                  </div>
                  <div className={`mt-4 text-3xl font-semibold ${card.accentClass} ${jetbrains.className}`}>{card.value}</div>
                  <p className="mt-2 text-sm text-[#697564]">{card.note}</p>
                </article>
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
        </div>

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

              <Button variant="outline" className="border-[#e2e7da] bg-white text-[#5d6958] hover:bg-[#f6f8f1]" onClick={() => setShortcutOpen(true)}>
                <Keyboard className="mr-2 h-4 w-4" />
                Phím tắt
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#62705d]">
            <div className="rounded-full bg-[#f5f7f1] px-3 py-1.5">Khung thời gian hiện tại</div>
            <div>
              <strong>{format(range.start, 'dd/MM/yyyy')}</strong> đến <strong>{format(range.end, 'dd/MM/yyyy')}</strong>
            </div>
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
            { keyLabel: '1 / 2 / 3', description: 'Chuyển nhanh giữa Lịch tuần, Timeline và Tải công việc' },
            { keyLabel: '[ / ]', description: 'Lùi hoặc tiến thêm một tuần trên lịch planning' },
            { keyLabel: '?', description: 'Mở bảng phím tắt' },
          ]}
        />
      </div>
    </div>
  );
}
