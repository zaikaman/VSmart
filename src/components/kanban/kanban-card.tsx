'use client';

import type { CSSProperties } from 'react';
import type { DraggableAttributes } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Clock, User, AlertCircle } from 'lucide-react';
import { Task } from './kanban-column';
import { RiskIndicator, RiskProgressBar } from './risk-badge';
import { ReviewStatusBadge } from '@/components/governance/review-status-badge';
import { getEffectiveTaskProgress, getTaskProgressLabel } from '@/lib/utils/task-progress';

interface KanbanCardProps {
  task: Task;
  onTaskClick?: (task: Task) => void;
}

interface KanbanCardFrameProps extends KanbanCardProps {
  dragDisabled: boolean;
  isDragging?: boolean;
  dragAttributes?: DraggableAttributes;
  dragListeners?: SyntheticListenerMap;
  setNodeRef?: (node: HTMLElement | null) => void;
  style?: CSSProperties;
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

function KanbanCardFrame({
  task,
  onTaskClick,
  dragDisabled,
  isDragging = false,
  dragAttributes,
  dragListeners,
  setNodeRef,
  style,
}: KanbanCardFrameProps) {
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
      {...dragAttributes}
      {...dragListeners}
      onClick={() => {
        if (!isDragging) {
          onTaskClick?.(task);
        }
      }}
      className={`rounded-lg border bg-white p-4 shadow-sm transition-shadow cursor-pointer ${
        isHighRisk
          ? 'border-red-300 hover:shadow-md hover:shadow-red-100'
          : isStale
            ? 'border-yellow-300 hover:shadow-md hover:shadow-yellow-100'
            : 'border-gray-200 hover:shadow-md'
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="line-clamp-2 flex-1 text-sm font-semibold">{task.ten}</h4>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {(riskLevel !== 'low' || isStale) && <RiskIndicator riskLevel={riskLevel} riskScore={riskScore} />}
          {isStale ? (
            <span title="Task không có cập nhật">
              <AlertCircle className="h-3.5 w-3.5 text-yellow-600" />
            </span>
          ) : null}
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

      {task.mo_ta ? <p className="mb-3 line-clamp-2 text-xs text-gray-600">{task.mo_ta}</p> : null}

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-1">
          {task.nguoi_dung ? (
            <>
              <User className="h-3 w-3" />
              <span>{task.nguoi_dung.ten}</span>
            </>
          ) : null}
        </div>
        {task.deadline ? (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{new Date(task.deadline).toLocaleDateString('vi-VN')}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-gray-600">
          <span>{task.progress_mode === 'checklist' ? 'Tiến độ' : 'Nhịp xử lý'}</span>
          <span>{task.progress_mode === 'checklist' ? `${effectiveProgress}%` : progressLabel}</span>
        </div>
        {task.progress_mode === 'checklist' ? (
          <RiskProgressBar progress={effectiveProgress} riskLevel={riskLevel} />
        ) : (
          <div className="rounded-full border border-[#e4eadb] bg-[#f6f8f1] px-3 py-2 text-xs text-[#5f6d59]">
            Đi theo trạng thái xử lý và luồng duyệt.
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

export function KanbanCard({ task, onTaskClick }: KanbanCardProps) {
  const dragDisabled = task.progress_mode === 'checklist' || task.review_status === 'pending_review';
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: dragDisabled,
  });

  return (
    <KanbanCardFrame
      task={task}
      onTaskClick={onTaskClick}
      dragDisabled={dragDisabled}
      isDragging={isDragging}
      dragAttributes={attributes}
      dragListeners={listeners}
      setNodeRef={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
    />
  );
}

export function KanbanCardPreview({ task }: { task: Task }) {
  const dragDisabled = task.progress_mode === 'checklist' || task.review_status === 'pending_review';

  return (
    <KanbanCardFrame
      task={task}
      dragDisabled={dragDisabled}
      style={{
        opacity: 0.95,
        boxShadow: '0 18px 40px rgba(15, 23, 42, 0.14)',
      }}
    />
  );
}
