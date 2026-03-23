'use client';

import Link from 'next/link';
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
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CreateProjectPartInput, useCreateProjectPart } from '@/lib/hooks/use-project-parts';
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

export function CreatePartModal({ open, onOpenChange, projectId }: CreatePartModalProps) {
  const createPartMutation = useCreateProjectPart(projectId);
  const { data: phongBanList, isLoading: phongBanLoading } = usePhongBan();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PartFormData>({
    defaultValues: {
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
          <DialogDescription>
            Chia dự án thành từng đầu việc lớn và giao đúng phòng ban phụ trách để theo dõi rõ ràng hơn.
          </DialogDescription>
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
            {errors.ten ? <p className="mt-1 text-sm text-red-600">{errors.ten.message}</p> : null}
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

          <div className="rounded-[22px] border border-[#dfe8d8] bg-[linear-gradient(135deg,#f8fbf4_0%,#f2f8ef_100%)] px-4 py-4">
            <Label htmlFor="phong_ban_id" className="text-base text-[#223021]">
              Phòng ban phụ trách *
            </Label>
            <p className="mt-1 text-sm leading-6 text-[#62705c]">
              Danh sách này lấy theo phòng ban đang có trong tổ chức, không dùng danh sách cố định.
            </p>

            {hasDepartments ? (
              <>
                <Select value={selectedPhongBan} onValueChange={setSelectedPhongBan}>
                  <SelectTrigger id="phong_ban_id" className="mt-3 border-[#dfe5d6] bg-white">
                    <SelectValue
                      placeholder={phongBanLoading ? 'Đang tải phòng ban...' : 'Chọn phòng ban phụ trách'}
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

                {!selectedPhongBan ? (
                  <p className="mt-2 text-sm text-[#6a7664]">Chọn một phòng ban để phần dự án có đúng đầu mối phụ trách.</p>
                ) : null}
              </>
            ) : (
              <div className="mt-3 rounded-[18px] border border-dashed border-[#d4dfc7] bg-white/80 px-4 py-4 text-sm text-[#596855]">
                <p className="font-medium text-[#223021]">Tổ chức này chưa có phòng ban nào để chọn.</p>
                <p className="mt-1 leading-6">
                  Hãy tạo danh sách phòng ban trước trong phần cài đặt tổ chức, sau đó quay lại để chia dự án theo đúng đầu mối.
                </p>
                <Link
                  href="/dashboard/settings"
                  className="mt-3 inline-flex text-sm font-medium text-[#4f6c38] underline-offset-4 hover:underline"
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
