'use client';

import { useState, useEffect } from 'react';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { CreateTaskModal } from '@/components/kanban/create-task-modal';
import { TaskDetailModal } from '@/components/kanban/task-detail-modal';
import { useTasks } from '@/lib/hooks/use-tasks';
import { useProjects } from '@/lib/hooks/use-projects';
import { useProjectParts, ProjectPart } from '@/lib/hooks/use-project-parts';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

export default function KanbanPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [selectedPartName, setSelectedPartName] = useState<string>('');

  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: parts, isLoading: partsLoading } = useProjectParts(selectedProjectId);
  const { data: tasks, isLoading: tasksLoading, error } = useTasks();

  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [initialStatus, setInitialStatus] = useState('todo');

  // Tự động chọn project đầu tiên
  useEffect(() => {
    if (projects?.data && projects.data.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects.data[0].id);
    }
  }, [projects, selectedProjectId]);

  // Tự động chọn part đầu tiên khi project thay đổi
  useEffect(() => {
    if (parts && parts.length > 0 && !selectedPartId) {
      setSelectedPartId(parts[0].id);
      setSelectedPartName(parts[0].ten);
    }
  }, [parts, selectedPartId]);

  // Reset part khi project thay đổi
  useEffect(() => {
    setSelectedPartId('');
    setSelectedPartName('');
  }, [selectedProjectId]);

  const handleAddTask = (columnId: string) => {
    if (!selectedPartId) {
      alert('Vui lòng chọn phần dự án trước khi tạo task');
      return;
    }
    setInitialStatus(columnId);
    setCreateTaskOpen(true);
  };

  // Filter tasks theo selected part
  const filteredTasks = tasks?.filter((task: any) =>
    selectedPartId ? task.phan_du_an_id === selectedPartId : true
  ) || [];

  const isLoading = projectsLoading || tasksLoading;

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

  const projectList = projects?.data || [];
  const partList = parts || [];

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Bảng Kanban</h1>
        <p className="text-gray-600">Quản lý tasks theo từng trạng thái</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="min-w-[250px]">
          <Label className="text-sm text-gray-600 mb-1 block">Dự án</Label>
          <Select
            value={selectedProjectId}
            onValueChange={(value) => {
              setSelectedProjectId(value);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn dự án" />
            </SelectTrigger>
            <SelectContent>
              {projectList.map((project: any) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.ten}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[250px]">
          <Label className="text-sm text-gray-600 mb-1 block">Phần dự án</Label>
          <Select
            value={selectedPartId}
            onValueChange={(value) => {
              setSelectedPartId(value);
              const part = partList.find((p: ProjectPart) => p.id === value);
              setSelectedPartName(part?.ten || '');
            }}
            disabled={!selectedProjectId || partsLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={
                !selectedProjectId
                  ? "Chọn dự án trước"
                  : partsLoading
                    ? "Đang tải..."
                    : partList.length === 0
                      ? "Chưa có phần dự án"
                      : "Chọn phần dự án"
              } />
            </SelectTrigger>
            <SelectContent>
              {partList.map((part: ProjectPart) => (
                <SelectItem key={part.id} value={part.id}>
                  {part.ten}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Warning if no part selected */}
      {!selectedPartId && selectedProjectId && partList.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800 mb-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold">Chưa có phần dự án</h3>
            <p className="text-sm mt-1">
              Dự án này chưa có phần dự án nào. Vui lòng tạo phần dự án trước để có thể thêm tasks.
            </p>
          </div>
        </div>
      )}

      <KanbanBoard
        tasks={filteredTasks}
        onTaskClick={(task) => setSelectedTask(task)}
        onAddTask={handleAddTask}
      />

      <CreateTaskModal
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        initialStatus={initialStatus}
        phanDuAnId={selectedPartId}
        phanDuAnName={selectedPartName}
      />

      <TaskDetailModal
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
      />
    </div>
  );
}
