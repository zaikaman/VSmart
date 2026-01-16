'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Clock, User } from 'lucide-react';
import { Task } from './kanban-column';

interface KanbanCardProps {
  task: Task;
  onTaskClick?: (task: Task) => void;
}

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

const priorityLabels = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
};

export function KanbanCard({ task, onTaskClick }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onTaskClick?.(task)}
      className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-sm line-clamp-2">{task.ten}</h4>
        <Badge className={priorityColors[task.priority as keyof typeof priorityColors]}>
          {priorityLabels[task.priority as keyof typeof priorityLabels]}
        </Badge>
      </div>

      {task.moTa && (
        <p className="text-xs text-gray-600 line-clamp-2 mb-3">{task.moTa}</p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-1">
          {task.nguoi_dung && (
            <>
              <User className="w-3 h-3" />
              <span>{task.nguoi_dung.hoTen}</span>
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
          <span>Tiến độ</span>
          <span>{task.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-blue-600 h-1.5 rounded-full transition-all"
            style={{ width: `${task.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
