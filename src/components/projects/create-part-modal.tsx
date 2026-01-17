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
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateProjectPart, CreateProjectPartInput } from '@/lib/hooks/use-project-parts';
import { usePhongBan } from '@/lib/hooks/use-phong-ban';

interface CreatePartModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
}

interface PartFormData {
    ten: string;
    mo_ta?: string;
    deadline: string;
    phong_ban_id: string;
}

export function CreatePartModal({ open, onOpenChange, projectId }: CreatePartModalProps) {
    const createPartMutation = useCreateProjectPart(projectId);
    const { data: phongBanList, isLoading: phongBanLoading } = usePhongBan();
    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<PartFormData>({
        defaultValues: {
            deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 ngày sau
        },
    });

    const [selectedPhongBan, setSelectedPhongBan] = useState<string>('');

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
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Thêm Phần Dự Án</DialogTitle>
                    <DialogDescription>
                        Chia nhỏ dự án thành các phần và phân công cho phòng ban phụ trách.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <Label htmlFor="ten">Tên Phần Dự Án *</Label>
                        <Input
                            id="ten"
                            {...register('ten', { required: 'Vui lòng nhập tên phần dự án' })}
                            placeholder="Ví dụ: Frontend Development"
                        />
                        {errors.ten && <p className="text-sm text-red-600 mt-1">{errors.ten.message}</p>}
                    </div>

                    <div>
                        <Label htmlFor="mo_ta">Mô Tả</Label>
                        <textarea
                            id="mo_ta"
                            {...register('mo_ta')}
                            className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#b9ff66]"
                            placeholder="Mô tả chi tiết phần dự án..."
                        />
                    </div>

                    <div>
                        <Label htmlFor="phong_ban_id">Phòng Ban Phụ Trách *</Label>
                        <Select
                            value={selectedPhongBan}
                            onValueChange={setSelectedPhongBan}
                        >
                            <SelectTrigger id="phong_ban_id">
                                <SelectValue placeholder={phongBanLoading ? "Đang tải..." : "Chọn phòng ban"} />
                            </SelectTrigger>
                            <SelectContent>
                                {phongBanList?.map((pb) => (
                                    <SelectItem key={pb.id} value={pb.id}>
                                        {pb.ten}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {!selectedPhongBan && (
                            <p className="text-sm text-gray-500 mt-1">Vui lòng chọn phòng ban phụ trách</p>
                        )}
                    </div>

                    <div>
                        <Label htmlFor="deadline">Deadline *</Label>
                        <Input
                            id="deadline"
                            type="date"
                            {...register('deadline', { required: 'Vui lòng chọn deadline' })}
                        />
                        {errors.deadline && <p className="text-sm text-red-600 mt-1">{errors.deadline.message}</p>}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            disabled={createPartMutation.isPending || !selectedPhongBan}
                            className="bg-black hover:bg-gray-800 text-white"
                        >
                            {createPartMutation.isPending ? 'Đang tạo...' : 'Thêm Phần Dự Án'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
