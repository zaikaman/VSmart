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
    formState: { errors },
  } = useForm<OrganizationFormData>();

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
        ten: data.ten,
        mo_ta: data.mo_ta,
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
              {...register('ten', { required: 'Vui lòng nhập tên tổ chức' })}
              placeholder="Ví dụ: VSmart Studio"
              className="mt-1.5 border-[#dfe5d6] bg-[#fbfcf8]"
            />
            {errors.ten ? <p className="mt-1 text-sm text-red-600">{errors.ten.message}</p> : null}
          </div>

          <div>
            <Label htmlFor="mo_ta">Mô tả ngắn</Label>
            <Textarea
              id="mo_ta"
              {...register('mo_ta')}
              placeholder="Ví dụ: Team sản phẩm nội bộ hoặc nhóm triển khai khách hàng."
              className="mt-1.5 min-h-[110px] border-[#dfe5d6] bg-[#fbfcf8]"
            />
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
