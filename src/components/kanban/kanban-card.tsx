'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Clock, User, AlertCircle } from 'lucide-react';
import { Task } from './kanban-column';
import { RiskBadge, RiskIndicator, RiskProgressBar } from './risk-badge';
import { ReviewStatusBadge } from '@/components/governance/review-status-badge';
import { getEffectiveTaskProgress, getTaskProgressLabel } from '@/lib/utils/task-progress';

interface KanbanCardProps {
  task: Task;
  onTaskClick?: (task: Task) => void;
}

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

const priorityLabels = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  urgent: 'Khẩn cấp',
};

export function KanbanCard({ task, onTaskClick }: KanbanCardProps) {
  const dragDisabled = task.progress_mode === 'checklist' || task.review_status === 'pending_review';
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: dragDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Xác định risk level từ task (mặc định là 'low')
  const riskLevel = (task.risk_level as 'low' | 'medium' | 'high') || 'low';
  const riskScore = task.risk_score || 0;
  const isHighRisk = riskLevel === 'high';
  const isStale = task.is_stale || false;
  const effectiveProgress = getEffectiveTaskProgress({
    progress: task.progress,
    progressMode: task.progress_mode,
    status: task.trang_thai,
    reviewStatus: task.review_status,
  });
  const progressLabel = getTaskProgressLabel({
    progressMode: task.progress_mode,
    status: task.trang_thai,
    reviewStatus: task.review_status,
  });

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onTaskClick?.(task)}
      className={`bg-white p-4 rounded-lg shadow-sm border transition-shadow cursor-pointer ${
        isHighRisk
          ? 'border-red-300 hover:shadow-red-100 hover:shadow-md'
          : isStale
          ? 'border-yellow-300 hover:shadow-yellow-100 hover:shadow-md'
          : 'border-gray-200 hover:shadow-md'
      }`}
    >
      <div className="flex justify-between items-start mb-2 gap-2">
        <h4 className="font-semibold text-sm line-clamp-2 flex-1">{task.ten}</h4>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Risk badge - chỉ hiển thị khi có risk đáng kể hoặc stale */}
          {(riskLevel !== 'low' || isStale) && (
            <RiskIndicator riskLevel={riskLevel} riskScore={riskScore} />
          )}
          {isStale && (
            <span title="Task không có cập nhật">
              <AlertCircle className="w-3.5 h-3.5 text-yellow-600" />
            </span>
          )}
          <Badge className={priorityColors[task.priority as keyof typeof priorityColors] || priorityColors.medium}>
            {priorityLabels[task.priority as keyof typeof priorityLabels] || priorityLabels.medium}
          </Badge>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {task.review_status && task.review_status !== 'draft' ? <ReviewStatusBadge status={task.review_status} /> : null}
        {task.progress_mode === 'checklist' ? (
          <Badge variant="outline" className="border-[#d8e3cf] bg-[#f8fbf3] text-[#556451]">
            Theo checklist
          </Badge>
        ) : null}
      </div>

      {task.mo_ta && (
        <p className="text-xs text-gray-600 line-clamp-2 mb-3">{task.mo_ta}</p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-1">
          {task.nguoi_dung && (
            <>
              <User className="w-3 h-3" />
              <span>{task.nguoi_dung.ten}</span>
            </>
          )}
        </div>
        {task.deadline && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{new Date(task.deadline).toLocaleDateString('vi-VN')}</span>
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>{task.progress_mode === 'checklist' ? 'Tiến độ' : 'Nhịp xử lý'}</span>
          <div className="flex items-center gap-2">
            {riskLevel !== 'low' && (
              <RiskBadge riskLevel={riskLevel} riskScore={riskScore} showScore size="sm" />
            )}
            <span>{task.progress_mode === 'checklist' ? `${effectiveProgress}%` : progressLabel}</span>
          </div>
        </div>
        {task.progress_mode === 'checklist' ? (
          <RiskProgressBar progress={effectiveProgress} riskLevel={riskLevel} />
        ) : (
          <div className="rounded-full border border-[#e4eadb] bg-[#f6f8f1] px-3 py-2 text-xs text-[#5f6d59]">
            Tiến độ của task này được suy ra tự động từ trạng thái xử lý và luồng duyệt.
          </div>
        )}
      </div>

      {dragDisabled ? (
        <p className="mt-2 text-[11px] text-[#7a846f]">
          {task.review_status === 'pending_review'
            ? 'Task đang chờ duyệt nên không thể kéo thả.'
            : 'Task dùng checklist, hãy cập nhật từng mục để đổi trạng thái.'}
        </p>
      ) : null}
    </div>
  );
}
