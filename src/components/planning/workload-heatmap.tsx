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
    <section className="rounded-[28px] border border-[#d7dfcf] bg-[#191a23] p-4 text-white shadow-[0_20px_50px_-30px_rgba(25,26,35,0.55)] md:p-6">
      <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#b9ff66]">
            <Gauge className="h-3.5 w-3.5" />
            Capacity scan
          </div>
          <h2 className="text-2xl font-semibold">Heatmap tải công việc</h2>
          <p className="mt-1 max-w-2xl text-sm text-white/65">
            Nhìn nhanh ai đang quá tải, ai còn dư năng lực để cân lại assignment trước khi task bắt
            đầu trễ dây chuyền.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">Thành viên</div>
            <div className="mt-2 text-2xl font-semibold">{data?.summary.totalMembers || 0}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">Quá tải</div>
            <div className="mt-2 text-2xl font-semibold text-[#ffb39f]">
              {data?.summary.overloadedMembers || 0}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">Sát tải</div>
            <div className="mt-2 text-2xl font-semibold text-[#ffd66b]">
              {data?.summary.stretchedMembers || 0}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">Tải trung bình</div>
            <div className="mt-2 text-2xl font-semibold text-[#b9ff66]">
              {Math.round((data?.summary.avgLoadRatio || 0) * 100)}%
            </div>
          </div>
        </div>
      </div>

      {members.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-white/15 px-4 py-10 text-center text-sm text-white/60">
          Chưa có dữ liệu workload cho bộ lọc hiện tại.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {members.map((member) => {
            const capacityBadge = getCapacityBadgeConfig(member.loadStatus);
            const ratio = Math.min(100, Math.round(member.loadRatio * 100));

            return (
              <article
                key={member.userId}
                className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{member.ten}</h3>
                      <Badge className={cn('border', capacityBadge.className)}>
                        {capacityBadge.label}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-white/60">
                      {member.departmentName || 'Chưa gắn phòng ban'} · {member.projectRole}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-right">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/45">Load</div>
                    <div className="mt-1 text-xl font-semibold">{ratio}%</div>
                  </div>
                </div>

                <div className="mb-3 rounded-full bg-white/10">
                  <div
                    className={cn(
                      'h-3 rounded-full transition-all',
                      member.loadStatus === 'overloaded'
                        ? 'bg-gradient-to-r from-[#ff9b7f] to-[#ff5b5b]'
                        : member.loadStatus === 'stretched'
                          ? 'bg-gradient-to-r from-[#f7d04b] to-[#ffb02e]'
                          : member.loadStatus === 'balanced'
                            ? 'bg-gradient-to-r from-[#74c5ff] to-[#398ff3]'
                            : 'bg-gradient-to-r from-[#b9ff66] to-[#79d13d]'
                    )}
                    style={{ width: `${Math.max(8, ratio)}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                  <div className="rounded-2xl bg-white/5 px-3 py-3">
                    <div className="text-white/45">Đang mở</div>
                    <div className="mt-1 text-lg font-semibold">{member.activeTasks}</div>
                  </div>
                  <div className="rounded-2xl bg-white/5 px-3 py-3">
                    <div className="text-white/45">Quá hạn</div>
                    <div className="mt-1 text-lg font-semibold">{member.overdueTasks}</div>
                  </div>
                  <div className="rounded-2xl bg-white/5 px-3 py-3">
                    <div className="text-white/45">Sắp hạn</div>
                    <div className="mt-1 text-lg font-semibold">{member.dueSoonTasks}</div>
                  </div>
                  <div className="rounded-2xl bg-white/5 px-3 py-3">
                    <div className="text-white/45">Rủi ro cao</div>
                    <div className="mt-1 text-lg font-semibold">{member.highRiskTasks}</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {member.tasks.slice(0, 4).map((task) => (
                    <div
                      key={task.id}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/75"
                    >
                      {task.ten}
                    </div>
                  ))}
                  {member.tasks.length > 4 && (
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/75">
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
