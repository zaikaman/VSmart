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
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onAddTask?: (columnId: string) => void;
  isDroppable?: boolean;
  canAddTask?: boolean;
  emptyMessage?: string;
}

const columnStyles = {
  todo: 'bg-gray-50/50 border-gray-200',
  'in-progress': 'bg-[#b9ff66]/5 border-[#b9ff66]/30',
  pending_review: 'bg-[#fff7e8] border-[#f2d89a]',
  done: 'bg-gray-50/50 border-gray-200',
};

export function KanbanColumn({
  id,
  title,
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

  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-[320px] max-w-[380px] flex-col rounded-xl border-2 p-4 transition-colors ${columnStyles[id as keyof typeof columnStyles]} ${isOver ? 'border-[#b9ff66] ring-2 ring-[#b9ff66] ring-offset-2' : ''}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium">{tasks.length}</span>
        </div>
        {onAddTask && canAddTask ? (
          <button
            onClick={() => onAddTask(id)}
            className="rounded p-1 transition-colors hover:bg-gray-200"
            aria-label="Thêm task mới"
          >
            <Plus className="h-5 w-5 text-gray-600" />
          </button>
        ) : null}
      </div>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="min-h-[200px] flex-1 space-y-3 overflow-y-auto">
          {tasks.map((task) => (
            <KanbanCard key={task.id} task={task} onTaskClick={onTaskClick} />
          ))}
          {tasks.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">{emptyMessage}</div>
          ) : null}
        </div>
      </SortableContext>
    </div>
  );
}
