'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { KanbanCardPreview } from './kanban-card';
import { KanbanColumn, Task } from './kanban-column';
import { useUpdateTask } from '@/lib/hooks/use-tasks';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onAddTask?: (columnId: string) => void;
}

type WorkflowColumnId = 'todo' | 'in-progress' | 'pending_review' | 'done';

function getColumnId(task: Task): WorkflowColumnId {
  if (task.review_status === 'pending_review') {
    return 'pending_review';
  }

  if (task.review_status === 'changes_requested') {
    return 'in-progress';
  }

  if (task.trang_thai === 'done') {
    return 'done';
  }

  if (task.trang_thai === 'in-progress') {
    return 'in-progress';
  }

  return 'todo';
}

function getManualProgressFromColumn(columnId: Extract<WorkflowColumnId, 'todo' | 'in-progress' | 'done'>, currentProgress: number) {
  if (columnId === 'todo') return 0;
  if (columnId === 'done') return 100;

  if (currentProgress > 0 && currentProgress < 100) {
    return currentProgress;
  }

  return 50;
}

export function KanbanBoard({ tasks, onTaskClick, onAddTask }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>(tasks);
  const updateTaskMutation = useUpdateTask();
  const queryClient = useQueryClient();

  useEffect(() => {
    setOptimisticTasks(tasks);
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const columns = useMemo(
    () => [
      {
        id: 'todo' as const,
        title: 'Cần Làm',
        tasks: optimisticTasks.filter((task) => getColumnId(task) === 'todo'),
        emptyMessage: 'Chưa có việc nào chờ bắt đầu',
      },
      {
        id: 'in-progress' as const,
        title: 'Đang Làm',
        tasks: optimisticTasks.filter((task) => getColumnId(task) === 'in-progress'),
        emptyMessage: 'Chưa có việc nào đang chạy',
      },
      {
        id: 'pending_review' as const,
        title: 'Chờ Duyệt',
        tasks: optimisticTasks.filter((task) => getColumnId(task) === 'pending_review'),
        emptyMessage: 'Chưa có task nào chờ duyệt',
      },
      {
        id: 'done' as const,
        title: 'Hoàn Thành',
        tasks: optimisticTasks.filter((task) => getColumnId(task) === 'done'),
        emptyMessage: 'Chưa có task nào hoàn thành',
      },
    ],
    [optimisticTasks]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = optimisticTasks.find((item) => item.id === active.id);

    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;
    const task = optimisticTasks.find((item) => item.id === taskId);
    const overTask = optimisticTasks.find((item) => item.id === overId);
    const newColumnId = (columns.find((column) => column.id === overId)?.id || (overTask ? getColumnId(overTask) : null)) as WorkflowColumnId | null;

    if (!task || !newColumnId) return;

    if (task.progress_mode === 'checklist') {
      toast.error('Task đang dùng checklist, hãy cập nhật từng mục để đổi trạng thái.');
      return;
    }

    if (task.review_status === 'pending_review' || newColumnId === 'pending_review') {
      toast.error('Task chờ duyệt cần được xử lý trong luồng duyệt, không kéo thả trực tiếp.');
      return;
    }

    const currentColumnId = getColumnId(task);
    if (currentColumnId === newColumnId) return;

    const nextStatus = newColumnId;
    const nextProgress = getManualProgressFromColumn(newColumnId, task.progress || 0);

    setOptimisticTasks((prev) =>
      prev.map((item) =>
        item.id === taskId
          ? {
              ...item,
              trang_thai: nextStatus,
              progress: nextProgress,
              review_status: nextStatus === 'done' ? item.review_status : 'draft',
            }
          : item
      )
    );

    updateTaskMutation.mutate(
      {
        id: taskId,
        trang_thai: nextStatus,
        progress: nextProgress,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
        onError: (error) => {
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          toast.error(error instanceof Error ? error.message : 'Không thể cập nhật trạng thái task');
        },
      }
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 overflow-x-auto pb-4">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            tasks={column.tasks}
            onTaskClick={onTaskClick}
            onAddTask={onAddTask}
            isDroppable={column.id !== 'pending_review'}
            canAddTask={column.id === 'todo' || column.id === 'in-progress'}
            emptyMessage={column.emptyMessage}
          />
        ))}
      </div>

      <DragOverlay>{activeTask ? <KanbanCardPreview task={activeTask} /> : null}</DragOverlay>
    </DndContext>
  );
}
