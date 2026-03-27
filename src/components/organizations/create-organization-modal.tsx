'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Building2, ShieldCheck } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { useCreateOrganization } from '@/lib/hooks/use-organizations';

interface CreateOrganizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

interface OrganizationFormData {
  ten: string;
  mo_ta?: string;
}

const ORGANIZATION_NAME_MAX_LENGTH = 120;
const ORGANIZATION_DESCRIPTION_MAX_LENGTH = 500;

export function CreateOrganizationModal({
  open,
  onOpenChange,
  onCreated,
}: CreateOrganizationModalProps) {
  const createOrganizationMutation = useCreateOrganization();
  const wasOpenRef = useRef(open);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<OrganizationFormData>();

  const orgName = watch('ten') || '';
  const orgDescription = watch('mo_ta') || '';

  useEffect(() => {
    if (wasOpenRef.current && !open) {
      reset();
      createOrganizationMutation.reset();
    }

    wasOpenRef.current = open;
  }, [createOrganizationMutation, open, reset]);

  const onSubmit = async (data: OrganizationFormData) => {
    try {
      await createOrganizationMutation.mutateAsync({
        ten: data.ten.trim(),
        mo_ta: data.mo_ta?.trim() || undefined,
      });

      toast.success('Đã tạo tổ chức');
      onOpenChange(false);
      onCreated?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tạo tổ chức');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#7f9d5b]" />
            Tạo không gian làm việc
          </DialogTitle>
          <DialogDescription>Tạo nơi làm việc chung cho team để bắt đầu dự án và mời mọi người vào làm việc.</DialogDescription>
        </DialogHeader>

        <div className="rounded-[22px] border border-[#dfe8d8] bg-[linear-gradient(135deg,#f8fbf4_0%,#f2f8ef_100%)] px-4 py-4 text-sm text-[#52614f]">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-[#6d8d49]" />
            <p>
              Người tạo đầu tiên sẽ là <strong>owner</strong> của tổ chức này và có thể quản lý cài đặt chung cho team.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="ten">Tên tổ chức</Label>
            <Input
              id="ten"
              maxLength={ORGANIZATION_NAME_MAX_LENGTH}
              {...register('ten', {
                required: 'Vui lòng nhập tên tổ chức',
                validate: (value) =>
                  value.trim().length > 0 || 'Tên tổ chức không được chỉ chứa khoảng trắng',
              })}
              placeholder="Ví dụ: VSmart Studio"
              className="mt-1.5 border-[#dfe5d6] bg-[#fbfcf8]"
            />
            <div className="mt-1 flex items-center justify-between text-xs text-[#6f7b6b]">
              <span>Hiển thị tên team dùng chung trên toàn bộ không gian làm việc.</span>
              <span>{orgName.trim().length}/{ORGANIZATION_NAME_MAX_LENGTH}</span>
            </div>
            {errors.ten ? <p className="mt-1 text-sm text-red-600">{errors.ten.message}</p> : null}
          </div>

          <div>
            <Label htmlFor="mo_ta">Mô tả ngắn</Label>
            <Textarea
              id="mo_ta"
              maxLength={ORGANIZATION_DESCRIPTION_MAX_LENGTH}
              {...register('mo_ta', {
                validate: (value) =>
                  !value || value.trim().length <= ORGANIZATION_DESCRIPTION_MAX_LENGTH || 'Mô tả quá dài',
              })}
              placeholder="Ví dụ: Team sản phẩm nội bộ hoặc nhóm triển khai khách hàng."
              className="mt-1.5 min-h-[110px] border-[#dfe5d6] bg-[#fbfcf8]"
            />
            <div className="mt-1 flex items-center justify-between text-xs text-[#6f7b6b]">
              <span>Mô tả ngắn giúp thành viên mới hiểu mục tiêu tổ chức.</span>
              <span>{orgDescription.trim().length}/{ORGANIZATION_DESCRIPTION_MAX_LENGTH}</span>
            </div>
            {errors.mo_ta ? <p className="mt-1 text-sm text-red-600">{errors.mo_ta.message}</p> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Để sau
            </Button>
            <Button
              type="submit"
              className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]"
              disabled={createOrganizationMutation.isPending}
            >
              {createOrganizationMutation.isPending ? 'Đang tạo...' : 'Tạo tổ chức'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
