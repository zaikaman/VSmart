'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  closestCorners,
  DndContext,
  DragCancelEvent,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  Modifier,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { CheckCheck, GitPullRequest } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { KanbanCard, KanbanCardPreview } from './kanban-card';
import { KanbanColumn, Task } from './kanban-column';
import { useUpdateTask } from '@/lib/hooks/use-tasks';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onAddTask?: (columnId: string) => void;
}

type WorkflowColumnId = 'todo' | 'in-progress' | 'pending_review' | 'done';

function isPointerLikeEvent(event: Event): event is MouseEvent | PointerEvent {
  return 'clientX' in event && 'clientY' in event;
}

function isTouchLikeEvent(event: Event): event is TouchEvent {
  return 'touches' in event;
}

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

function getManualProgressFromColumn(
  columnId: Extract<WorkflowColumnId, 'todo' | 'in-progress' | 'done'>,
  currentProgress: number
) {
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
  const [dragPointerOffset, setDragPointerOffset] = useState<{ x: number; y: number } | null>(null);
  const updateTaskMutation = useUpdateTask();
  const queryClient = useQueryClient();

  useEffect(() => {
    setOptimisticTasks(tasks);
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    })
  );

  const reviewQueueTasks = useMemo(
    () => optimisticTasks.filter((task) => getColumnId(task) === 'pending_review'),
    [optimisticTasks]
  );

  const columns = useMemo(
    () => [
      {
        id: 'todo' as const,
        title: 'Cần Làm',
        eyebrow: 'Bắt đầu',
        tasks: optimisticTasks.filter((task) => getColumnId(task) === 'todo'),
        emptyMessage: 'Chưa có việc nào chờ bắt đầu',
      },
      {
        id: 'in-progress' as const,
        title: 'Đang Làm',
        eyebrow: 'Đang chạy',
        tasks: optimisticTasks.filter((task) => getColumnId(task) === 'in-progress'),
        emptyMessage: 'Chưa có việc nào đang chạy',
      },
      {
        id: 'done' as const,
        title: 'Hoàn Thành',
        eyebrow: 'Đã chốt',
        tasks: optimisticTasks.filter((task) => getColumnId(task) === 'done'),
        emptyMessage: 'Chưa có task nào hoàn thành',
      },
    ],
    [optimisticTasks]
  );

  const dragOverlayModifiers = useMemo<Modifier[]>(
    () => [
      ({ transform }) => {
        if (!dragPointerOffset) {
          return transform;
        }

        return {
          ...transform,
          x: transform.x - dragPointerOffset.x,
          y: transform.y - dragPointerOffset.y,
        };
      },
    ],
    [dragPointerOffset]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = optimisticTasks.find((item) => item.id === event.active.id);
    if (task) {
      setActiveTask(task);
    }

    const initialRect = event.active.rect.current.initial;
    const activatorEvent = event.activatorEvent;

    if (!initialRect || !activatorEvent) {
      setDragPointerOffset(null);
      return;
    }

    if (isPointerLikeEvent(activatorEvent)) {
      setDragPointerOffset({
        x: activatorEvent.clientX - initialRect.left,
        y: activatorEvent.clientY - initialRect.top,
      });
      return;
    }

    if (isTouchLikeEvent(activatorEvent) && activatorEvent.touches.length > 0) {
      const touch = activatorEvent.touches[0];
      setDragPointerOffset({
        x: touch.clientX - initialRect.left,
        y: touch.clientY - initialRect.top,
      });
      return;
    }

    setDragPointerOffset(null);
  };

  const handleDragCancel = (_event: DragCancelEvent) => {
    setActiveTask(null);
    setDragPointerOffset(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setDragPointerOffset(null);

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;
    const task = optimisticTasks.find((item) => item.id === taskId);
    const overTask = optimisticTasks.find((item) => item.id === overId);
    const newColumnId = (columns.find((column) => column.id === overId)?.id ||
      (overTask ? getColumnId(overTask) : null)) as Exclude<WorkflowColumnId, 'pending_review'> | null;

    if (!task || !newColumnId) return;

    if (task.permissions?.canUpdateExecution === false) {
      toast.error('Bạn không có quyền đổi trạng thái task này.');
      return;
    }

    if (task.progress_mode === 'checklist') {
      toast.error('Task dùng checklist, hãy cập nhật từng mục để đổi trạng thái.');
      return;
    }

    if (task.review_status === 'pending_review') {
      toast.error('Task chờ duyệt cần xử lý trong luồng duyệt, không kéo thả trực tiếp.');
      return;
    }

    const currentColumnId = getColumnId(task);
    if (currentColumnId === newColumnId) return;

    const nextProgress = getManualProgressFromColumn(newColumnId, task.progress || 0);
    const shouldRouteToReview = task.requires_review && newColumnId === 'done';

    setOptimisticTasks((prev) =>
      prev.map((item) =>
        item.id === taskId
          ? {
              ...item,
              trang_thai: newColumnId,
              progress: shouldRouteToReview ? 90 : nextProgress,
              review_status:
                shouldRouteToReview ? 'pending_review' : newColumnId === 'done' ? item.review_status : 'draft',
            }
          : item
      )
    );

    updateTaskMutation.mutate(
      {
        id: taskId,
        trang_thai: newColumnId,
        progress: nextProgress,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          if (shouldRouteToReview) {
            toast.success('Task đã được chuyển sang chờ duyệt');
          }
        },
        onError: (error) => {
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          toast.error(error instanceof Error ? error.message : 'Không thể cập nhật trạng thái task');
        },
      }
    );
  };

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-[#e8eddc] bg-[linear-gradient(135deg,#f9fbf6_0%,#f4f7ef_100%)] px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dde6d3] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#687861]">
              <GitPullRequest className="h-3.5 w-3.5" />
              Hàng chờ duyệt
            </div>
            <p className="mt-3 max-w-2xl text-sm text-[#66745f]">
              Tách riêng phần reviewer cần xem để bảng kéo thả chính vẫn thoáng và tập trung vào luồng làm việc.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ead9b7] bg-[#fff7e7] px-4 py-2 text-sm font-medium text-[#89642b]">
            <CheckCheck className="h-4 w-4" />
            {reviewQueueTasks.length} task đang chờ duyệt
          </div>
        </div>

        <SortableContext items={reviewQueueTasks.map((task) => task.id)} strategy={rectSortingStrategy}>
          {reviewQueueTasks.length > 0 ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {reviewQueueTasks.map((task) => (
                <KanbanCard key={task.id} task={task} onTaskClick={onTaskClick} />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-[#e8dcc1] bg-white/70 px-4 py-6 text-sm text-[#8a7650]">
              Chưa có task nào chờ duyệt.
            </div>
          )}
        </SortableContext>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              eyebrow={column.eyebrow}
              tasks={column.tasks}
              onTaskClick={onTaskClick}
              onAddTask={onAddTask}
              canAddTask={column.id === 'todo' || column.id === 'in-progress'}
              emptyMessage={column.emptyMessage}
            />
          ))}
        </div>

        <DragOverlay modifiers={dragOverlayModifiers}>
          {activeTask ? <KanbanCardPreview task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
