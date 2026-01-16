'use client';

import { useState } from 'react';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { CreateTaskModal } from '@/components/kanban/create-task-modal';
import { TaskDetailModal } from '@/components/kanban/task-detail-modal';
import { useTasks } from '@/lib/hooks/use-tasks';
import { Skeleton } from '@/components/ui/skeleton';

export default function KanbanPage() {
  const { data: tasks, isLoading, error } = useTasks();
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [initialStatus, setInitialStatus] = useState('todo');

  const handleAddTask = (columnId: string) => {
    setInitialStatus(columnId);
    setCreateTaskOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="min-w-[320px]">
              <Skeleton className="h-12 mb-4" />
              <Skeleton className="h-40 mb-3" />
              <Skeleton className="h-40 mb-3" />
              <Skeleton className="h-40" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <h3 className="font-semibold">Lỗi tải tasks</h3>
          <p className="text-sm mt-1">Vui lòng thử lại sau</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Kanban Board</h1>
        <p className="text-gray-600">Quản lý tasks theo từng trạng thái</p>
      </div>

      <KanbanBoard
        tasks={tasks || []}
        onTaskClick={(task) => setSelectedTask(task)}
        onAddTask={handleAddTask}
      />

      <CreateTaskModal
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        initialStatus={initialStatus}
      />

      <TaskDetailModal
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
      />
    </div>
  );
}
