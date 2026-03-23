'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  CreateProjectPartInput,
  useCreateProjectPart,
} from '@/lib/hooks/use-project-parts';
import { type PhongBan, usePhongBan } from '@/lib/hooks/use-phong-ban';

interface CreatePartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

interface PartFormData {
  ten: string;
  mo_ta?: string;
  deadline: string;
}

export function CreatePartModal({
  open,
  onOpenChange,
  projectId,
}: CreatePartModalProps) {
  const createPartMutation = useCreateProjectPart(projectId);
  const { data: phongBanList, isLoading: phongBanLoading } = usePhongBan();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PartFormData>({
    defaultValues: {
      deadline: new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000
      ).toISOString().split('T')[0],
    },
  });

  const [selectedPhongBan, setSelectedPhongBan] = useState<string>('');
  const hasDepartments = (phongBanList?.length || 0) > 0;

  const onSubmit = async (data: PartFormData) => {
    try {
      const partInput: CreateProjectPartInput = {
        ten: data.ten,
        mo_ta: data.mo_ta,
        deadline: new Date(data.deadline).toISOString(),
        phong_ban_id: selectedPhongBan,
      };

      await createPartMutation.mutateAsync(partInput);
      reset();
      setSelectedPhongBan('');
      onOpenChange(false);
    } catch (error) {
      console.error('Lỗi tạo phần dự án:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Thêm phần dự án</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="ten">Tên phần dự án *</Label>
            <Input
              id="ten"
              {...register('ten', { required: 'Vui lòng nhập tên phần dự án.' })}
              placeholder="Ví dụ: Triển khai backend, CSKH sau bán, nội dung chiến dịch"
              className="mt-2"
            />
            {errors.ten ? (
              <p className="mt-1 text-sm text-red-600">{errors.ten.message}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="mo_ta">Mô tả</Label>
            <Textarea
              id="mo_ta"
              {...register('mo_ta')}
              className="mt-2 min-h-[96px]"
              placeholder="Ghi ngắn về phạm vi, đầu ra hoặc phần việc chính của hạng mục này."
            />
          </div>

          <div>
            <Label htmlFor="phong_ban_id">Phòng ban phụ trách *</Label>

            {hasDepartments ? (
              <div className="mt-2">
                <Select value={selectedPhongBan} onValueChange={setSelectedPhongBan}>
                  <SelectTrigger id="phong_ban_id" className="bg-white">
                    <SelectValue
                      placeholder={
                        phongBanLoading
                          ? 'Đang tải phòng ban...'
                          : 'Chọn phòng ban phụ trách'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {phongBanList?.map((pb: PhongBan) => (
                      <SelectItem key={pb.id} value={pb.id}>
                        {pb.ten}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="mt-2 rounded-[14px] border border-dashed border-[#d9dde3] bg-white px-4 py-3 text-sm text-[#5f6570]">
                <p>Chưa có phòng ban để chọn.</p>
                <Link
                  href="/dashboard/settings"
                  className="mt-2 inline-flex text-sm font-medium text-[#111111] underline underline-offset-4"
                >
                  Mở cài đặt tổ chức
                </Link>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="deadline">Deadline *</Label>
            <Input
              id="deadline"
              type="date"
              {...register('deadline', { required: 'Vui lòng chọn deadline.' })}
              className="mt-2"
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
              disabled={createPartMutation.isPending || !selectedPhongBan || !hasDepartments}
              className="bg-black text-white hover:bg-gray-800"
            >
              {createPartMutation.isPending ? 'Đang tạo...' : 'Thêm phần dự án'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
