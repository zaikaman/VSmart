'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { KanbanCard } from './kanban-card';

export interface Task {
  id: string;
  ten: string;
  mo_ta?: string | null;
  deadline?: string | null;
  trang_thai?: string;
  priority: string;
  progress: number;
  progress_mode?: 'manual' | 'checklist';
  requires_review?: boolean;
  phan_du_an_id?: string;
  assignee_id?: string | null;
  risk_score?: number;
  risk_level?: 'low' | 'medium' | 'high';
  is_stale?: boolean;
  review_status?: 'draft' | 'pending_review' | 'approved' | 'changes_requested';
  nguoi_dung?: {
    id: string;
    ten: string;
    email: string;
    avatar_url?: string | null;
  } | null;
  phan_du_an?: {
    id?: string;
    ten: string;
    du_an?: {
      ten: string;
    } | null;
  } | null;
}

interface KanbanColumnProps {
  id: string;
  title: string;
  eyebrow?: string;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onAddTask?: (columnId: string) => void;
  isDroppable?: boolean;
  canAddTask?: boolean;
  emptyMessage?: string;
}

const columnStyles = {
  todo: {
    shell: 'border-[#dfe5da] bg-[linear-gradient(180deg,#fdfdfb_0%,#fafbf8_100%)]',
    badge: 'bg-[#eef1eb] text-[#63705f]',
    accent: 'bg-[#d7ded1]',
  },
  'in-progress': {
    shell: 'border-[#d8edb3] bg-[linear-gradient(180deg,#fbfdf7_0%,#f6fbeb_100%)]',
    badge: 'bg-[#ecf7d6] text-[#62813c]',
    accent: 'bg-[#b9df73]',
  },
  done: {
    shell: 'border-[#d9e2f0] bg-[linear-gradient(180deg,#fcfdff_0%,#f6f8fc_100%)]',
    badge: 'bg-[#edf1f8] text-[#5d6e8f]',
    accent: 'bg-[#ced9ea]',
  },
};

export function KanbanColumn({
  id,
  title,
  eyebrow,
  tasks,
  onTaskClick,
  onAddTask,
  isDroppable = true,
  canAddTask = true,
  emptyMessage = 'Chưa có task nào',
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled: !isDroppable,
  });

  const taskIds = tasks.map((task) => task.id);
  const style = columnStyles[id as keyof typeof columnStyles];

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[520px] flex-col rounded-[28px] border p-4 transition-all duration-200 ${style.shell} ${
        isOver ? 'translate-y-[-2px] border-[#b9d96c] shadow-[0_18px_40px_rgba(117,147,61,0.12)]' : ''
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#76836f]">{eyebrow}</p>
          ) : null}
          <div className="mt-2 flex items-center gap-2">
            <h3 className="text-[28px] font-semibold tracking-[-0.03em] text-[#253124]">{title}</h3>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}>{tasks.length}</span>
          </div>
        </div>
        {onAddTask && canAddTask ? (
          <button
            type="button"
            onClick={() => onAddTask(id)}
            className="rounded-2xl border border-[#dbe4d1] bg-white/90 p-2.5 text-[#5b6857] transition hover:border-[#c9d8bf] hover:bg-white"
            aria-label="Thêm task mới"
          >
            <Plus className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className={`mb-4 h-1 rounded-full ${style.accent}`} />

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-3">
          {tasks.length > 0 ? (
            tasks.map((task) => <KanbanCard key={task.id} task={task} onTaskClick={onTaskClick} />)
          ) : (
            <div className="flex min-h-[280px] flex-1 items-center justify-center rounded-[24px] border border-dashed border-[#dde4d8] bg-white/55 px-6 text-center text-sm leading-6 text-[#91a08d]">
              {emptyMessage}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
