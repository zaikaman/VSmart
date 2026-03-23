'use client';

import { useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreateProjectInput, useCreateProject } from '@/lib/hooks/use-projects';

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProjectFormData {
  ten: string;
  mo_ta?: string;
  deadline: string;
}

export function CreateProjectModal({ open, onOpenChange }: CreateProjectModalProps) {
  const createProjectMutation = useCreateProject();
  const wasOpenRef = useRef(open);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectFormData>({
    defaultValues: {
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    if (wasOpenRef.current && !open) {
      reset();
      createProjectMutation.reset();
    }

    wasOpenRef.current = open;
  }, [open, reset, createProjectMutation]);

  const onSubmit = async (data: ProjectFormData) => {
    try {
      const projectInput: CreateProjectInput = {
        ten: data.ten,
        mo_ta: data.mo_ta,
        deadline: new Date(data.deadline).toISOString(),
      };

      await createProjectMutation.mutateAsync(projectInput);
      reset();
      onOpenChange(false);
      toast.success('Đã tạo dự án mới.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể tạo dự án.';
      toast.error(message);
      console.error('Lỗi tạo dự án:', error);
    }
  };

  const submitError = createProjectMutation.error instanceof Error ? createProjectMutation.error.message : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Tạo dự án mới</DialogTitle>
          <DialogDescription>
            Điền thông tin cơ bản để mở dự án và bắt đầu phân chia đầu việc cho nhóm.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {submitError ? (
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{submitError}</p>
            </div>
          ) : null}

          <div>
            <Label htmlFor="ten">Tên dự án *</Label>
            <Input
              id="ten"
              {...register('ten', { required: 'Vui lòng nhập tên dự án.' })}
              placeholder="Ví dụ: Nâng cấp website tuyển dụng"
            />
            {errors.ten ? <p className="mt-1 text-sm text-red-600">{errors.ten.message}</p> : null}
          </div>

          <div>
            <Label htmlFor="mo_ta">Mô tả</Label>
            <textarea
              id="mo_ta"
              {...register('mo_ta')}
              className="min-h-[96px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-blue-500"
              placeholder="Mô tả ngắn về mục tiêu, phạm vi hoặc kết quả cần đạt."
            />
          </div>

          <div>
            <Label htmlFor="deadline">Deadline *</Label>
            <Input
              id="deadline"
              type="date"
              {...register('deadline', { required: 'Vui lòng chọn deadline.' })}
            />
            {errors.deadline ? <p className="mt-1 text-sm text-red-600">{errors.deadline.message}</p> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={createProjectMutation.isPending}>
              {createProjectMutation.isPending ? 'Đang tạo...' : 'Tạo dự án'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
