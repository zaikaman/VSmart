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
import { useUpdateTask, UpdateTaskInput } from '@/lib/hooks/use-tasks';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Task {
    id: string;
    ten: string;
    moTa?: string | null;
    deadline?: string | null;
    trangThai: string;
    priority: string;
    progress: number;
}

interface EditTaskModalProps {
    task: Task | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface TaskFormData {
    ten: string;
    mo_ta: string;
    deadline: string;
    priority: string;
    progress: number;
}

export function EditTaskModal({ task, open, onOpenChange }: EditTaskModalProps) {
    const updateTaskMutation = useUpdateTask();
    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<TaskFormData>();

    const [selectedPriority, setSelectedPriority] = useState('medium');

    // Populate form when task changes
    useEffect(() => {
        if (task && open) {
            reset({
                ten: task.ten,
                mo_ta: task.moTa || '',
                deadline: task.deadline ? task.deadline.split('T')[0] : '',
                priority: task.priority,
                progress: task.progress,
            });
            setSelectedPriority(task.priority);
        }
    }, [task, open, reset]);

    const onSubmit = async (data: TaskFormData) => {
        if (!task) return;

        try {
            const updateData: UpdateTaskInput = {
                id: task.id,
                ten: data.ten,
                mo_ta: data.mo_ta || undefined,
                deadline: data.deadline ? new Date(data.deadline).toISOString() : undefined,
                priority: selectedPriority as 'low' | 'medium' | 'high' | 'urgent',
                progress: Number(data.progress),
            };

            await updateTaskMutation.mutateAsync(updateData);
            toast.success('Đã cập nhật task thành công');
            onOpenChange(false);
        } catch (error) {
            console.error('Lỗi cập nhật task:', error);
            toast.error('Không thể cập nhật task');
        }
    };

    if (!task) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Chỉnh Sửa Task</DialogTitle>
                    <DialogDescription>
                        Cập nhật thông tin task
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Tên Task */}
                    <div>
                        <Label htmlFor="ten">Tên Task *</Label>
                        <Input
                            id="ten"
                            {...register('ten', { required: 'Vui lòng nhập tên task' })}
                            placeholder="Tên task"
                        />
                        {errors.ten && <p className="text-sm text-red-600 mt-1">{errors.ten.message}</p>}
                    </div>

                    {/* Mô tả */}
                    <div>
                        <Label htmlFor="mo_ta">Mô Tả</Label>
                        <textarea
                            id="mo_ta"
                            {...register('mo_ta')}
                            className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#b9ff66] focus:border-transparent"
                            placeholder="Mô tả chi tiết task..."
                        />
                    </div>

                    {/* Priority & Deadline */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="priority">Độ Ưu Tiên</Label>
                            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                                <SelectTrigger id="priority">
                                    <SelectValue placeholder="Chọn độ ưu tiên" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Thấp</SelectItem>
                                    <SelectItem value="medium">Trung bình</SelectItem>
                                    <SelectItem value="high">Cao</SelectItem>
                                    <SelectItem value="urgent">Khẩn cấp</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="deadline">Deadline</Label>
                            <Input id="deadline" type="date" {...register('deadline')} />
                        </div>
                    </div>

                    {/* Progress */}
                    <div>
                        <Label htmlFor="progress">Tiến độ (%)</Label>
                        <Input
                            id="progress"
                            type="number"
                            min={0}
                            max={100}
                            {...register('progress', {
                                min: { value: 0, message: 'Tiến độ tối thiểu là 0%' },
                                max: { value: 100, message: 'Tiến độ tối đa là 100%' }
                            })}
                        />
                        {errors.progress && <p className="text-sm text-red-600 mt-1">{errors.progress.message}</p>}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Hủy
                        </Button>
                        <Button type="submit" disabled={updateTaskMutation.isPending}>
                            {updateTaskMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Đang lưu...
                                </>
                            ) : (
                                'Lưu Thay Đổi'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
