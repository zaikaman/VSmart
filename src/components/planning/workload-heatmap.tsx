'use client';

import { Gauge } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getCapacityBadgeConfig } from '@/lib/utils/workload-utils';
import type { PlanningWorkloadResponse } from '@/lib/hooks/use-planning';

interface WorkloadHeatmapProps {
  data?: PlanningWorkloadResponse;
}

export function WorkloadHeatmap({ data }: WorkloadHeatmapProps) {
  const members = data?.members || [];

  return (
    <section className="rounded-[28px] border border-[#dde4d5] bg-[linear-gradient(180deg,#fffdf8_0%,#f7f9f3_100%)] p-4 shadow-[0_24px_60px_-42px_rgba(96,113,91,0.3)] md:p-6">
      <div className="mb-6 flex flex-col gap-4 border-b border-[#e5eadf] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#dce5d2] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#61705f]">
            <Gauge className="h-3.5 w-3.5 text-[#88b063]" />
            Capacity scan
          </div>
          <h2 className="text-2xl font-semibold text-[#1d271c]">Heatmap tải công việc</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#61705f]">
            Nhìn nhanh ai đang quá tải, ai còn dư năng lực và nhóm task nào nên được chuyển sớm để tránh trễ dây chuyền.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-[#dce5d2] bg-white px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-[#7a8774]">Thành viên</div>
            <div className="mt-2 text-2xl font-semibold text-[#1d271c]">{data?.summary.totalMembers || 0}</div>
          </div>
          <div className="rounded-2xl border border-[#f0ddd1] bg-[#fff3ed] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-[#97684d]">Quá tải</div>
            <div className="mt-2 text-2xl font-semibold text-[#bb6a46]">{data?.summary.overloadedMembers || 0}</div>
          </div>
          <div className="rounded-2xl border border-[#efe5bf] bg-[#fff9e8] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-[#8f7443]">Sát tải</div>
            <div className="mt-2 text-2xl font-semibold text-[#a67b1f]">{data?.summary.stretchedMembers || 0}</div>
          </div>
          <div className="rounded-2xl border border-[#d9eadf] bg-[#eef6f0] px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-[#55725e]">Tải trung bình</div>
            <div className="mt-2 text-2xl font-semibold text-[#2f6052]">{Math.round((data?.summary.avgLoadRatio || 0) * 100)}%</div>
          </div>
        </div>
      </div>

      {members.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-[#dce4d3] px-4 py-10 text-center text-sm text-[#72806c]">
          Chưa có dữ liệu workload cho bộ lọc hiện tại.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {members.map((member) => {
            const capacityBadge = getCapacityBadgeConfig(member.loadStatus);
            const ratio = Math.min(100, Math.round(member.loadRatio * 100));

            return (
              <article key={member.userId} className="rounded-[24px] border border-[#e4e9de] bg-white p-4 shadow-[0_20px_40px_-38px_rgba(87,106,82,0.28)]">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-[#1d271c]">{member.ten}</h3>
                      <Badge className={cn('border', capacityBadge.className)}>{capacityBadge.label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-[#65725f]">
                      {member.departmentName || 'Chưa gắn phòng ban'} · {member.projectRole}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#e4e9de] bg-[#fbfcf8] px-3 py-2 text-right">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#7b8775]">Load</div>
                    <div className="mt-1 text-xl font-semibold text-[#1d271c]">{ratio}%</div>
                  </div>
                </div>

                <div className="mb-3 rounded-full bg-[#eef2e7]">
                  <div
                    className={cn(
                      'h-3 rounded-full transition-all',
                      member.loadStatus === 'overloaded'
                        ? 'bg-gradient-to-r from-[#f1b292] to-[#d9785b]'
                        : member.loadStatus === 'stretched'
                          ? 'bg-gradient-to-r from-[#eedb81] to-[#c9a63d]'
                          : member.loadStatus === 'balanced'
                            ? 'bg-gradient-to-r from-[#9dd0ea] to-[#5b97c5]'
                            : 'bg-gradient-to-r from-[#b9d88b] to-[#6ea35e]'
                    )}
                    style={{ width: `${Math.max(8, ratio)}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                  <div className="rounded-2xl bg-[#f7f9f4] px-3 py-3">
                    <div className="text-[#7b8775]">Đang mở</div>
                    <div className="mt-1 text-lg font-semibold text-[#1d271c]">{member.activeTasks}</div>
                  </div>
                  <div className="rounded-2xl bg-[#fff4ee] px-3 py-3">
                    <div className="text-[#97684d]">Quá hạn</div>
                    <div className="mt-1 text-lg font-semibold text-[#b16442]">{member.overdueTasks}</div>
                  </div>
                  <div className="rounded-2xl bg-[#fff8e8] px-3 py-3">
                    <div className="text-[#8f7443]">Sắp hạn</div>
                    <div className="mt-1 text-lg font-semibold text-[#a67b1f]">{member.dueSoonTasks}</div>
                  </div>
                  <div className="rounded-2xl bg-[#f4f1fb] px-3 py-3">
                    <div className="text-[#78678e]">Rủi ro cao</div>
                    <div className="mt-1 text-lg font-semibold text-[#6e5d85]">{member.highRiskTasks}</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {member.tasks.slice(0, 4).map((task) => (
                    <div key={task.id} className="rounded-full border border-[#e4e9de] bg-[#fbfcf8] px-3 py-1 text-xs text-[#65725f]">
                      {task.ten}
                    </div>
                  ))}
                  {member.tasks.length > 4 && (
                    <div className="rounded-full border border-[#e4e9de] bg-[#fbfcf8] px-3 py-1 text-xs text-[#65725f]">
                      +{member.tasks.length - 4} task khác
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
