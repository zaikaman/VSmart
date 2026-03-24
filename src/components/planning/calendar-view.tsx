'use client';

import { useState } from 'react';
import { eachDayOfInterval, format, isToday, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PlanningCalendarResponse, PlanningTaskItem } from '@/lib/hooks/use-planning';

interface CalendarViewProps {
  data?: PlanningCalendarResponse;
  onShiftRange: (direction: -1 | 1) => void;
  onToday: () => void;
  onReschedule: (task: PlanningTaskItem, nextDate: Date) => void;
  reschedulingTaskId?: string | null;
}

const priorityAccent: Record<PlanningTaskItem['priority'], string> = {
  low: 'border-l-slate-300',
  medium: 'border-l-sky-400',
  high: 'border-l-amber-400',
  urgent: 'border-l-rose-500',
};

export function CalendarView({
  data,
  onShiftRange,
  onToday,
  onReschedule,
  reschedulingTaskId,
}: CalendarViewProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const days =
    data?.range.dateFrom && data?.range.dateTo
      ? eachDayOfInterval({
          start: parseISO(data.range.dateFrom),
          end: parseISO(data.range.dateTo),
        })
      : [];

  const tasksByDay = new Map<string, PlanningTaskItem[]>();

  for (const task of data?.items || []) {
    const key = format(parseISO(task.deadline), 'yyyy-MM-dd');
    const existing = tasksByDay.get(key) || [];
    existing.push(task);
    tasksByDay.set(key, existing);
  }

  const getTask = (taskId: string) => data?.items.find((item) => item.id === taskId);

  return (
    <section className="rounded-[28px] border border-[#d7dfcf] bg-[#f3f5ed] p-4 shadow-[0_20px_50px_-30px_rgba(25,26,35,0.35)] md:p-6">
      <div className="mb-5 flex flex-col gap-4 border-b border-[#d7dfcf] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#d7dfcf] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#4d5c47]">
            <CalendarDays className="h-3.5 w-3.5" />
            Nhịp tuần
          </div>
          <h2 className="text-2xl font-semibold text-[#191a23]">Lịch deadline theo tuần</h2>
          <p className="mt-1 max-w-2xl text-sm text-[#55624f]">
            Kéo task sang ngày mới để dời lịch. Hệ thống sẽ cảnh báo khi lịch mới chạm cuối tuần
            hoặc dồn tải cho cùng một người.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-auto">
          <Button variant="outline" size="icon" onClick={() => onShiftRange(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={onToday}>
            Tuần hiện tại
          </Button>
          <Button variant="outline" size="icon" onClick={() => onShiftRange(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl bg-white px-4 py-3">
          <div className="text-xs uppercase tracking-[0.18em] text-[#6f7b6a]">Task trong khung</div>
          <div className="mt-2 text-2xl font-semibold text-[#191a23]">
            {data?.summary.totalTasks || 0}
          </div>
        </div>
        <div className="rounded-2xl bg-white px-4 py-3">
          <div className="text-xs uppercase tracking-[0.18em] text-[#6f7b6a]">Đang quá hạn</div>
          <div className="mt-2 text-2xl font-semibold text-[#c25735]">
            {data?.summary.overdueTasks || 0}
          </div>
        </div>
        <div className="rounded-2xl bg-white px-4 py-3">
          <div className="text-xs uppercase tracking-[0.18em] text-[#6f7b6a]">Sắp tới hạn</div>
          <div className="mt-2 text-2xl font-semibold text-[#275d9b]">
            {data?.summary.upcomingTasks || 0}
          </div>
        </div>
        <div className="rounded-2xl bg-white px-4 py-3">
          <div className="text-xs uppercase tracking-[0.18em] text-[#6f7b6a]">Rủi ro cao</div>
          <div className="mt-2 text-2xl font-semibold text-[#8f2a4a]">
            {data?.summary.highRiskTasks || 0}
          </div>
        </div>
      </div>

      <div className="hidden gap-3 lg:grid lg:grid-cols-7">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDay.get(key) || [];

          return (
            <div
              key={key}
              className={cn(
                'min-h-[320px] min-w-0 rounded-[24px] border border-[#d7dfcf] bg-white p-3 transition-colors',
                isToday(day) && 'border-[#b9ff66] shadow-[0_0_0_1px_rgba(185,255,102,0.55)]'
              )}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (!draggedTaskId) {
                  return;
                }

                const task = getTask(draggedTaskId);
                if (!task) {
                  return;
                }

                onReschedule(task, day);
                setDraggedTaskId(null);
              }}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#6f7b6a]">
                    {format(day, 'EEE', { locale: vi })}
                  </div>
                  <div className="text-xl font-semibold text-[#191a23]">
                    {format(day, 'dd/MM')}
                  </div>
                </div>
                {isToday(day) && (
                  <Badge className="shrink-0 border-[#d9efb3] bg-[#effccf] text-[#3d4a36]">
                    Hôm nay
                  </Badge>
                )}
              </div>

              <div className="min-w-0 space-y-3">
                {dayTasks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#d7dfcf] px-3 py-6 text-center text-sm text-[#88947f]">
                    Không có task nào ghim ở ngày này.
                  </div>
                ) : (
                  dayTasks.map((task) => (
                    <article
                      key={task.id}
                      draggable
                      onDragStart={() => setDraggedTaskId(task.id)}
                      onDragEnd={() => setDraggedTaskId(null)}
                      className={cn(
                        'min-w-0 overflow-hidden rounded-2xl border border-[#e5eadf] bg-[#fbfcf8] p-3 transition-transform hover:-translate-y-0.5',
                        'border-l-4',
                        priorityAccent[task.priority],
                        reschedulingTaskId === task.id && 'opacity-60'
                      )}
                    >
                      <div className="mb-2 flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="line-clamp-2 text-sm font-semibold text-[#191a23]">
                            {task.ten}
                          </h3>
                          <p className="mt-1 truncate text-xs text-[#6c7765]">
                            {task.assignee?.ten || 'Chưa phân công'}
                          </p>
                        </div>
                        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-[#a2ad9a]" />
                      </div>

                      <div className="flex min-w-0 flex-wrap gap-2">
                        <Badge
                          variant="outline"
                          className="max-w-full min-w-0 truncate"
                          title={task.part?.ten || 'Chưa rõ phần việc'}
                        >
                          {task.part?.ten || 'Chưa rõ phần việc'}
                        </Badge>
                        {task.risk_score >= 70 && (
                          <Badge className="shrink-0 border-rose-200 bg-rose-50 text-rose-700">
                            Rủi ro cao
                          </Badge>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
