'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { KanbanColumn, Task } from './kanban-column';
import { KanbanCard } from './kanban-card';
import { useUpdateTask } from '@/lib/hooks/use-tasks';
import { useQueryClient } from '@tanstack/react-query';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onAddTask?: (columnId: string) => void;
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

  // Nhóm tasks theo trạng thái
  const tasksByStatus = {
    todo: optimisticTasks.filter((task) => task.trang_thai === 'todo'),
    'in-progress': optimisticTasks.filter((task) => task.trang_thai === 'in-progress'),
    done: optimisticTasks.filter((task) => task.trang_thai === 'done'),
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = optimisticTasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;

    const task = optimisticTasks.find((t) => t.id === taskId);
    if (!task || task.trang_thai === newStatus) return;

    // Optimistic update: Cập nhật state local ngay lập tức
    setOptimisticTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, trang_thai: newStatus } : t
      )
    );

    // Call API update
    updateTaskMutation.mutate(
      {
        id: taskId,
        trang_thai: newStatus as 'todo' | 'in-progress' | 'done',
      },
      {
        onSuccess: () => {
          // Invalidate to ensure sync with server
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
        onError: () => {
          // On error, revert local state (sẽ được override khi fetch lại từ server nếu invalidate)
          // Hoặc force revert thủ công nếu cần
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
      }
    );
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-6 overflow-x-auto pb-4">
        <KanbanColumn
          id="todo"
          title="Cần Làm"
          tasks={tasksByStatus.todo}
          onTaskClick={onTaskClick}
          onAddTask={onAddTask}
        />
        <KanbanColumn
          id="in-progress"
          title="Đang Làm"
          tasks={tasksByStatus['in-progress']}
          onTaskClick={onTaskClick}
          onAddTask={onAddTask}
        />
        <KanbanColumn
          id="done"
          title="Hoàn Thành"
          tasks={tasksByStatus.done}
          onTaskClick={onTaskClick}
          onAddTask={onAddTask}
        />
      </div>

      <DragOverlay>
        {activeTask ? <KanbanCard task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
