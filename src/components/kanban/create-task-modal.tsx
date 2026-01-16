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
import { Label } from '@/components/ui/label';

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStatus?: string;
  phanDuAnId?: string;
}

interface TaskFormData {
  ten: string;
  mo_ta?: string;
  deadline?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  trang_thai: string;
}

export function CreateTaskModal({ open, onOpenChange, initialStatus = 'todo', phanDuAnId }: CreateTaskModalProps) {
  const createTaskMutation = useCreateTask();
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<TaskFormData>({
    defaultValues: {
      trang_thai: initialStatus,
      priority: 'medium',
    },
  });

  const onSubmit = async (data: TaskFormData) => {
    try {
      // Build the CreateTaskInput with required fields
      const taskInput: CreateTaskInput = {
        ten: data.ten,
        mo_ta: data.mo_ta,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : new Date().toISOString(),
        phan_du_an_id: phanDuAnId || '', // This should be provided via props
        priority: data.priority,
      };

      await createTaskMutation.mutateAsync(taskInput);
      reset();
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
            Điền thông tin task. AI gợi ý sẽ được thêm trong phiên bản sau.
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Độ Ưu Tiên</Label>
              <Select
                defaultValue="medium"
                onValueChange={(value) => setValue('priority', value as 'low' | 'medium' | 'high' | 'urgent')}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Chọn độ ưu tiên" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Thấp</SelectItem>
                  <SelectItem value="medium">Trung bình</SelectItem>
                  <SelectItem value="high">Cao</SelectItem>
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

          <div>
            <Label htmlFor="trang_thai">Trạng Thái</Label>
            <Select
              defaultValue={initialStatus}
              onValueChange={(value) => setValue('trang_thai', value)}
            >
              <SelectTrigger id="trang_thai">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">Cần Làm</SelectItem>
                <SelectItem value="in-progress">Đang Làm</SelectItem>
                <SelectItem value="done">Hoàn Thành</SelectItem>
              </SelectContent>
            </Select>
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
