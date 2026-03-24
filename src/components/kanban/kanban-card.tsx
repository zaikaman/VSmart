'use client';

import type { CSSProperties, MouseEvent } from 'react';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertCircle, Clock, GripVertical, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ReviewStatusBadge } from '@/components/governance/review-status-badge';
import { Task } from './kanban-column';
import { RiskIndicator, RiskProgressBar } from './risk-badge';
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
  const cannotExecute = task.permissions?.canUpdateExecution === false;
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

  const handleCardClick = () => {
    if (!isDragging) {
      onTaskClick?.(task);
    }
  };

  const stopHandleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      onClick={handleCardClick}
      className={`rounded-[24px] border bg-white/92 p-4 shadow-[0_10px_26px_rgba(98,115,80,0.08)] transition-all ${
        isDragging ? 'scale-[1.01] shadow-[0_18px_40px_rgba(42,56,31,0.14)]' : ''
      } ${
        isHighRisk
          ? 'border-red-200'
          : isStale
            ? 'border-yellow-200'
            : 'border-[#e2e8da]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-2">
            <h4 className="min-w-0 flex-1 text-[15px] font-semibold leading-6 text-[#253124]">{task.ten}</h4>
            {(riskLevel !== 'low' || isStale) && <RiskIndicator riskLevel={riskLevel} riskScore={riskScore} />}
            <Badge className={priorityColors[task.priority as keyof typeof priorityColors] || priorityColors.medium}>
              {priorityLabels[task.priority as keyof typeof priorityLabels] || priorityLabels.medium}
            </Badge>
          </div>

          {task.mo_ta ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#6a7568]">{task.mo_ta}</p> : null}
        </div>

        <button
          type="button"
          {...(!dragDisabled ? dragAttributes : {})}
          {...(!dragDisabled ? dragListeners : {})}
          onClick={stopHandleClick}
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border transition ${
            dragDisabled
              ? 'cursor-not-allowed border-[#e5eadf] bg-[#f6f8f2] text-[#a0aa9a]'
              : 'cursor-grab border-[#dfe6d8] bg-[#f8fbf4] text-[#5d6958] hover:border-[#cad6c1] active:cursor-grabbing'
          }`}
          style={!dragDisabled ? { touchAction: 'none' } : undefined}
          aria-label={dragDisabled ? 'Task này không thể kéo thả' : 'Kéo task sang cột khác'}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {task.review_status && task.review_status !== 'draft' ? <ReviewStatusBadge status={task.review_status} /> : null}
        {task.progress_mode === 'checklist' ? (
          <Badge variant="outline" className="border-[#d8e3cf] bg-[#f8fbf3] text-[#556451]">
            Theo checklist
          </Badge>
        ) : null}
        {task.requires_review ? (
          <Badge variant="outline" className="border-[#e8d6b5] bg-[#fff8ea] text-[#8c6b2f]">
            Cần duyệt
          </Badge>
        ) : null}
        {isStale ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-[#f2df9d] bg-[#fff8dd] px-2.5 py-1 text-[11px] font-medium text-[#8a6b1a]">
            <AlertCircle className="h-3.5 w-3.5" />
            Chậm cập nhật
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-[#788375]">
        <div className="flex min-w-0 items-center gap-1.5">
          {task.nguoi_dung ? (
            <>
              <User className="h-3.5 w-3.5" />
              <span className="truncate">{task.nguoi_dung.ten}</span>
            </>
          ) : (
            <span>Chưa phân công</span>
          )}
        </div>
        {task.deadline ? (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>{new Date(task.deadline).toLocaleDateString('vi-VN')}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-4 border-t border-[#eef2ea] pt-3">
        <div className="mb-1.5 flex justify-between text-xs text-[#64705f]">
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
        <p className="mt-3 text-[11px] leading-5 text-[#7a846f]">
          {cannotExecute
            ? 'Task này đang ở chế độ chỉ xem với vai trò hiện tại.'
            : task.review_status === 'pending_review'
              ? 'Đang nằm trong hàng chờ duyệt nên xử lý ở luồng review.'
              : 'Task checklist đổi trạng thái theo các mục công việc.'}
        </p>
      ) : null}
    </article>
  );
}

export function KanbanCard({ task, onTaskClick }: KanbanCardProps) {
  const dragDisabled =
    task.progress_mode === 'checklist' ||
    task.review_status === 'pending_review' ||
    task.permissions?.canUpdateExecution === false;
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
        opacity: isDragging ? 0.48 : 1,
      }}
    />
  );
}

export function KanbanCardPreview({ task }: { task: Task }) {
  const dragDisabled =
    task.progress_mode === 'checklist' ||
    task.review_status === 'pending_review' ||
    task.permissions?.canUpdateExecution === false;

  return (
    <KanbanCardFrame
      task={task}
      dragDisabled={dragDisabled}
      style={{
        opacity: 0.96,
        transform: 'rotate(1deg)',
      }}
    />
  );
}
