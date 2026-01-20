'use client';

import { useState, useEffect } from 'react';
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
import { useUpdateProjectPart, UpdateProjectPartInput, ProjectPart } from '@/lib/hooks/use-project-parts';
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
    trang_thai: 'todo' | 'in-progress' | 'done';
    phan_tram_hoan_thanh: number;
}

export function EditPartModal({ open, onOpenChange, projectId, part }: EditPartModalProps) {
    const updatePartMutation = useUpdateProjectPart(projectId, part.id);
    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<PartFormData>();
    const [selectedStatus, setSelectedStatus] = useState<'todo' | 'in-progress' | 'done'>(part.trang_thai);

    // Load dữ liệu ban đầu
    useEffect(() => {
        if (part) {
            setValue('ten', part.ten);
            setValue('mo_ta', part.mo_ta || '');
            setValue('deadline', part.deadline.split('T')[0]);
            setValue('trang_thai', part.trang_thai);
            setValue('phan_tram_hoan_thanh', part.phan_tram_hoan_thanh || 0);
            setSelectedStatus(part.trang_thai);
        }
    }, [part, setValue]);

    const onSubmit = async (data: PartFormData) => {
        try {
            const partInput: UpdateProjectPartInput = {
                ten: data.ten,
                mo_ta: data.mo_ta,
                deadline: new Date(data.deadline).toISOString(),
                trang_thai: selectedStatus,
                phan_tram_hoan_thanh: Number(data.phan_tram_hoan_thanh),
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
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Chỉnh Sửa Phần Dự Án</DialogTitle>
                    <DialogDescription>
                        Cập nhật thông tin phần dự án
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

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="trang_thai">Trạng Thái *</Label>
                            <Select
                                value={selectedStatus}
                                onValueChange={(value) => setSelectedStatus(value as 'todo' | 'in-progress' | 'done')}
                            >
                                <SelectTrigger id="trang_thai">
                                    <SelectValue placeholder="Chọn trạng thái" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todo">{statusLabels.todo}</SelectItem>
                                    <SelectItem value="in-progress">{statusLabels['in-progress']}</SelectItem>
                                    <SelectItem value="done">{statusLabels.done}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="phan_tram_hoan_thanh">Tiến Độ (%)</Label>
                            <Input
                                id="phan_tram_hoan_thanh"
                                type="number"
                                min="0"
                                max="100"
                                {...register('phan_tram_hoan_thanh', { 
                                    required: 'Vui lòng nhập tiến độ',
                                    min: { value: 0, message: 'Tiến độ tối thiểu là 0%' },
                                    max: { value: 100, message: 'Tiến độ tối đa là 100%' }
                                })}
                            />
                            {errors.phan_tram_hoan_thanh && (
                                <p className="text-sm text-red-600 mt-1">{errors.phan_tram_hoan_thanh.message}</p>
                            )}
                        </div>
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
                            disabled={updatePartMutation.isPending}
                            className="bg-black hover:bg-gray-800 text-white"
                        >
                            {updatePartMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
