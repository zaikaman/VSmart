'use client';

import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ArrowLeftRight, CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PlanningCalendarResponse, PlanningTaskItem } from '@/lib/hooks/use-planning';

interface TimelineViewProps {
  data?: PlanningCalendarResponse;
  onShiftRange: (direction: -1 | 1) => void;
  onReschedule: (task: PlanningTaskItem, nextDate: Date) => void;
  reschedulingTaskId?: string | null;
}

function getTimelineTone(task: PlanningTaskItem) {
  if (task.risk_score >= 70) {
    return 'from-rose-400 to-rose-500';
  }

  if (task.priority === 'urgent') {
    return 'from-amber-400 to-orange-500';
  }

  if (task.priority === 'high') {
    return 'from-sky-400 to-sky-500';
  }

  return 'from-[#b9ff66] to-[#8fd843]';
}

export function TimelineView({
  data,
  onShiftRange,
  onReschedule,
  reschedulingTaskId,
}: TimelineViewProps) {
  const rangeStart = data?.range.dateFrom ? parseISO(data.range.dateFrom) : new Date();
  const rangeEnd = data?.range.dateTo ? parseISO(data.range.dateTo) : addDays(new Date(), 6);
  const span = Math.max(1, differenceInCalendarDays(rangeEnd, rangeStart) + 1);
  const tasks = [...(data?.items || [])].sort(
    (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  );

  return (
    <section className="rounded-[28px] border border-[#d7dfcf] bg-white p-4 shadow-[0_20px_50px_-30px_rgba(25,26,35,0.35)] md:p-6">
      <div className="mb-6 flex flex-col gap-4 border-b border-[#edf0e7] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#edf0e7] bg-[#f7f9f2] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#52604b]">
            <CalendarRange className="h-3.5 w-3.5" />
            Timeline
          </div>
          <h2 className="text-2xl font-semibold text-[#191a23]">Dòng chảy deadline</h2>
          <p className="mt-1 max-w-2xl text-sm text-[#5f6c58]">
            Xem task nào đang chạm mốc sớm nhất và dời nhanh từng ngày để cân tải trong tuần.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => onShiftRange(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => onShiftRange(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-7 gap-2 rounded-[22px] bg-[#f7f9f2] p-3 text-center text-xs uppercase tracking-[0.16em] text-[#70806a]">
        {Array.from({ length: span }).map((_, index) => {
          const day = addDays(rangeStart, index);
          return (
            <div key={index}>
              <div>{format(day, 'EEE', { locale: vi })}</div>
              <div className="mt-1 text-sm font-semibold text-[#191a23]">{format(day, 'dd/MM')}</div>
            </div>
          );
        })}
      </div>

      <div className="space-y-4">
        {tasks.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-[#d7dfcf] px-4 py-10 text-center text-sm text-[#71806b]">
            Không có task nào trong khung thời gian hiện tại.
          </div>
        ) : (
          tasks.map((task) => {
            const deadline = parseISO(task.deadline);
            const offset = Math.max(0, differenceInCalendarDays(deadline, rangeStart));
            const width = `${Math.max(12, ((offset + 1) / span) * 100)}%`;

            return (
              <article
                key={task.id}
                className={cn(
                  'rounded-[24px] border border-[#edf0e7] bg-[#fcfdf9] p-4',
                  reschedulingTaskId === task.id && 'opacity-60'
                )}
              >
                <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-[#191a23]">{task.ten}</h3>
                      {task.risk_score >= 70 && (
                        <Badge className="border-rose-200 bg-rose-50 text-rose-700">Rủi ro cao</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-[#62705d]">
                      {task.project?.ten || 'Chưa rõ dự án'} · {task.assignee?.ten || 'Chưa phân công'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onReschedule(task, addDays(deadline, -1))}
                    >
                      <ArrowLeftRight className="mr-2 h-4 w-4" />
                      Lùi 1 ngày
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onReschedule(task, addDays(deadline, 1))}
                    >
                      <ArrowLeftRight className="mr-2 h-4 w-4" />
                      Dời 1 ngày
                    </Button>
                  </div>
                </div>

                <div className="rounded-[22px] bg-[#f1f4eb] p-3">
                  <div className="relative h-4 overflow-hidden rounded-full bg-white">
                    <div
                      className={cn(
                        'h-full rounded-full bg-gradient-to-r shadow-[0_8px_24px_-12px_rgba(25,26,35,0.45)]',
                        getTimelineTone(task)
                      )}
                      style={{ width }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-[#62705d]">
                    <span>
                      Đích đến: <strong>{format(deadline, 'EEEE, dd/MM', { locale: vi })}</strong>
                    </span>
                    <span>Tiến độ {task.progress}%</span>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
