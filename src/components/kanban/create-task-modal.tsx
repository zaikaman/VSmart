'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateTask, CreateTaskInput } from '@/lib/hooks/use-tasks';
import { useUsers } from '@/lib/hooks/use-users';
import { Label } from '@/components/ui/label';

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStatus?: string;
  phanDuAnId: string;
  phanDuAnName?: string;
}

interface TaskFormData {
  ten: string;
  mo_ta?: string;
  deadline?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  trang_thai: string;
  assignee_id?: string;
}

export function CreateTaskModal({
  open,
  onOpenChange,
  initialStatus = 'todo',
  phanDuAnId,
  phanDuAnName
}: CreateTaskModalProps) {
  const createTaskMutation = useCreateTask();
  const { data: users, isLoading: usersLoading } = useUsers();
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<TaskFormData>({
    defaultValues: {
      trang_thai: initialStatus,
      priority: 'medium',
    },
  });

  const [selectedAssignee, setSelectedAssignee] = useState<string>('unassigned');
  const [selectedPriority, setSelectedPriority] = useState<string>('medium');

  const onSubmit = async (data: TaskFormData) => {
    try {
      // Validate phanDuAnId
      if (!phanDuAnId || phanDuAnId.trim() === '') {
        console.error('Lỗi: Chưa chọn phần dự án');
        return;
      }

      const taskInput: CreateTaskInput = {
        ten: data.ten,
        mo_ta: data.mo_ta,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : new Date().toISOString(),
        phan_du_an_id: phanDuAnId,
        priority: selectedPriority as 'low' | 'medium' | 'high' | 'urgent',
      };

      // Chỉ thêm assignee_id nếu đã chọn người thực hiện
      if (selectedAssignee !== 'unassigned') {
        taskInput.assignee_id = selectedAssignee;
      }

      await createTaskMutation.mutateAsync(taskInput);
      reset();
      setSelectedAssignee('unassigned');
      setSelectedPriority('medium');
      onOpenChange(false);
    } catch (error) {
      console.error('Lỗi tạo task:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Tạo Task Mới</DialogTitle>
          <DialogDescription>
            {phanDuAnName ? (
              <>Tạo task cho phần dự án: <strong>{phanDuAnName}</strong></>
            ) : (
              'Điền thông tin task. AI gợi ý sẽ được thêm trong phiên bản sau.'
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="ten">Tên Task *</Label>
            <Input
              id="ten"
              {...register('ten', { required: 'Vui lòng nhập tên task' })}
              placeholder="Ví dụ: Implement login API"
            />
            {errors.ten && <p className="text-sm text-red-600 mt-1">{errors.ten.message}</p>}
          </div>

          <div>
            <Label htmlFor="mo_ta">Mô Tả</Label>
            <textarea
              id="mo_ta"
              {...register('mo_ta')}
              className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mô tả chi tiết task..."
            />
          </div>

          <div>
            <Label htmlFor="assignee_id">Người Thực Hiện</Label>
            <Select
              value={selectedAssignee}
              onValueChange={setSelectedAssignee}
            >
              <SelectTrigger id="assignee_id">
                <SelectValue placeholder={usersLoading ? "Đang tải..." : "Chọn người thực hiện (tùy chọn)"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Chưa phân công</SelectItem>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.ten} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Độ Ưu Tiên</Label>
              <Select
                value={selectedPriority}
                onValueChange={setSelectedPriority}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Chọn độ ưu tiên" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Thấp</SelectItem>
                  <SelectItem value="medium">Trung bình</SelectItem>
                  <SelectItem value="high">Cao</SelectItem>
                  <SelectItem value="urgent">Khẩn cấp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="date"
                {...register('deadline')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={createTaskMutation.isPending}>
              {createTaskMutation.isPending ? 'Đang tạo...' : 'Tạo Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
