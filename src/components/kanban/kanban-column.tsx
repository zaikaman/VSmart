'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './kanban-card';
import { Plus } from 'lucide-react';

export interface Task {
  id: string;
  ten: string;
  moTa?: string | null;
  deadline?: string | null;
  trangThai?: string;
  priority: string;
  progress: number;
  nguoi_dung?: {
    hoTen: string;
  } | null;
}

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onAddTask?: (columnId: string) => void;
}

const columnStyles = {
  todo: 'bg-gray-100 border-gray-300',
  'in-progress': 'bg-blue-50 border-blue-300',
  done: 'bg-green-50 border-green-300',
};

const columnTitles = {
  todo: 'Cần Làm',
  'in-progress': 'Đang Làm',
  done: 'Hoàn Thành',
};

export function KanbanColumn({ id, title, tasks, onTaskClick, onAddTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  const taskIds = tasks.map((task) => task.id);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[320px] max-w-[380px] rounded-lg border-2 p-4 transition-colors ${columnStyles[id as keyof typeof columnStyles]
        } ${isOver ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-800">{columnTitles[id as keyof typeof columnTitles]}</h3>
          <span className="px-2 py-0.5 rounded-full bg-gray-200 text-xs font-medium">{tasks.length}</span>
        </div>
        {onAddTask && (
          <button
            onClick={() => onAddTask(id)}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            aria-label="Thêm task mới"
          >
            <Plus className="w-5 h-5 text-gray-600" />
          </button>
        )}
      </div>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 flex-1 overflow-y-auto min-h-[200px]">
          {tasks.map((task) => (
            <KanbanCard key={task.id} task={task} onTaskClick={onTaskClick} />
          ))}
          {tasks.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-8">
              Chưa có task nào
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
