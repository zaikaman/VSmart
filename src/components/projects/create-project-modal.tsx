'use client';

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
import { useCreateProject, CreateProjectInput } from '@/lib/hooks/use-projects';

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
    const { register, handleSubmit, reset, formState: { errors } } = useForm<ProjectFormData>({
        defaultValues: {
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 ngày sau
        },
    });

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
        } catch (error) {
            console.error('Lỗi tạo dự án:', error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Tạo Dự Án Mới</DialogTitle>
                    <DialogDescription>
                        Điền thông tin dự án. Sau khi tạo, bạn có thể thêm các phần dự án và phân công cho phòng ban.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <Label htmlFor="ten">Tên Dự Án *</Label>
                        <Input
                            id="ten"
                            {...register('ten', { required: 'Vui lòng nhập tên dự án' })}
                            placeholder="Ví dụ: Website Redesign"
                        />
                        {errors.ten && <p className="text-sm text-red-600 mt-1">{errors.ten.message}</p>}
                    </div>

                    <div>
                        <Label htmlFor="mo_ta">Mô Tả</Label>
                        <textarea
                            id="mo_ta"
                            {...register('mo_ta')}
                            className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Mô tả chi tiết dự án..."
                        />
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
                        <Button type="submit" disabled={createProjectMutation.isPending}>
                            {createProjectMutation.isPending ? 'Đang tạo...' : 'Tạo Dự Án'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
