'use client';

import { useEffect } from 'react';
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
import { Label } from '@/components/ui/label';
import {
  useUpdateProjectPart,
  type ProjectPart,
  type UpdateProjectPartInput,
} from '@/lib/hooks/use-project-parts';
import { toast } from 'sonner';

interface EditPartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  part: ProjectPart;
}

interface PartFormData {
  ten: string;
  mo_ta?: string;
  deadline: string;
}

export function EditPartModal({ open, onOpenChange, projectId, part }: EditPartModalProps) {
  const updatePartMutation = useUpdateProjectPart(projectId, part.id);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PartFormData>();

  useEffect(() => {
    if (part) {
      setValue('ten', part.ten);
      setValue('mo_ta', part.mo_ta || '');
      setValue('deadline', part.deadline.split('T')[0]);
    }
  }, [part, setValue]);

  const onSubmit = async (data: PartFormData) => {
    try {
      const partInput: UpdateProjectPartInput = {
        ten: data.ten,
        mo_ta: data.mo_ta,
        deadline: new Date(data.deadline).toISOString(),
      };

      await updatePartMutation.mutateAsync(partInput);
      toast.success('Đã cập nhật phần dự án thành công');
      onOpenChange(false);
    } catch (error) {
      console.error('Lỗi cập nhật phần dự án:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật phần dự án');
    }
  };

  const statusLabels = {
    todo: 'Cần làm',
    'in-progress': 'Đang thực hiện',
    done: 'Hoàn thành',
  } as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa phần dự án</DialogTitle>
          <DialogDescription>Cập nhật thông tin chính. Tiến độ sẽ tự chạy theo các task.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="ten">Tên phần dự án *</Label>
            <Input
              id="ten"
              {...register('ten', { required: 'Vui lòng nhập tên phần dự án' })}
              placeholder="Ví dụ: Frontend Development"
            />
            {errors.ten ? <p className="mt-1 text-sm text-red-600">{errors.ten.message}</p> : null}
          </div>

          <div>
            <Label htmlFor="mo_ta">Mô tả</Label>
            <textarea
              id="mo_ta"
              {...register('mo_ta')}
              className="w-full min-h-[80px] rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#b9ff66]"
              placeholder="Mô tả chi tiết phần dự án..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                Trạng thái hiện tại
              </p>
              <p className="mt-2 text-base font-semibold text-slate-900">
                {statusLabels[part.trang_thai]}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Trạng thái sẽ đổi theo tiến độ task bên trong phần này.
              </p>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                Tiến độ hiện tại
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {part.phan_tram_hoan_thanh?.toFixed(0) || 0}%
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Số này được cập nhật tự động từ các task.
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="deadline">Deadline *</Label>
            <Input
              id="deadline"
              type="date"
              {...register('deadline', { required: 'Vui lòng chọn deadline' })}
            />
            {errors.deadline ? (
              <p className="mt-1 text-sm text-red-600">{errors.deadline.message}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={updatePartMutation.isPending}
              className="bg-black text-white hover:bg-gray-800"
            >
              {updatePartMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
