'use client';

import { History, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useActivityFeed } from '@/lib/hooks/use-governance';

function getActionLabel(action: string) {
  if (action.startsWith('task_created')) return 'Tạo task';
  if (action.startsWith('task_updated')) return 'Cập nhật task';
  if (action === 'task_deleted') return 'Xóa task';
  if (action === 'review_submitted') return 'Gửi duyệt';
  if (action === 'review_approved') return 'Duyệt task';
  if (action === 'review_rejected') return 'Yêu cầu chỉnh sửa';
  if (action === 'comment_created') return 'Thêm bình luận';
  if (action === 'project_created') return 'Tạo dự án';
  if (action === 'project_updated') return 'Cập nhật dự án';
  if (action === 'project_deleted') return 'Xóa dự án';
  if (action === 'project_part_created') return 'Tạo phần dự án';
  if (action === 'project_part_updated') return 'Cập nhật phần dự án';
  if (action === 'project_part_deleted') return 'Xóa phần dự án';
  return action;
}

function getMetadataDescription(metadata: Record<string, unknown>) {
  if (typeof metadata.taskName === 'string') {
    return metadata.taskName;
  }
  if (typeof metadata.partName === 'string') {
    return metadata.partName;
  }
  if (typeof metadata.projectName === 'string') {
    return metadata.projectName;
  }
  return null;
}

export function ActivityFeed({
  taskId,
  projectId,
  limit = 12,
  compact = false,
}: {
  taskId?: string;
  projectId?: string;
  limit?: number;
  compact?: boolean;
}) {
  const { data, isLoading, isFetching } = useActivityFeed({
    taskId,
    projectId,
    limit,
    enabled: Boolean(taskId || projectId),
  });

  return (
    <div className="rounded-2xl border border-[#e7ebdf] bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-slate-500" />
          <h3 className="text-base font-semibold text-slate-900">Lịch sử hoạt động</h3>
        </div>
        {isFetching ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
          Chưa có hoạt động nào để hiển thị.
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((item) => {
            const actorName = item.actor?.ten || 'Hệ thống';
            const description = getMetadataDescription(item.metadata || {});

            return (
              <div
                key={item.id}
                className={`rounded-2xl border border-[#eef1e7] bg-[#fbfbf8] p-3 ${compact ? '' : 'shadow-sm'}`}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-9 w-9 border border-white/70">
                    <AvatarImage src={item.actor?.avatar_url || undefined} />
                    <AvatarFallback>{actorName.slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">{actorName}</p>
                      <Badge variant="outline" className="bg-white">
                        {getActionLabel(item.action)}
                      </Badge>
                    </div>
                    {description ? (
                      <p className="mt-1 text-sm text-slate-600">{description}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(item.created_at).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
