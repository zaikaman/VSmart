'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { useDeleteRecurringRule, useRecurringRule, useSaveRecurringRule } from '@/lib/hooks/use-task-execution';
import { buildCronExpression, parseCronExpression, RecurringPattern } from '@/lib/tasks/recurring';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface Task {
  id: string;
  ten: string;
  moTa?: string | null;
  deadline?: string | null;
  trangThai: string;
  priority: string;
  progress: number;
  assigneeId?: string | null;
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
  progress: number;
}

const DAY_OPTIONS = [
  { value: '1', label: 'Thứ Hai' },
  { value: '2', label: 'Thứ Ba' },
  { value: '3', label: 'Thứ Tư' },
  { value: '4', label: 'Thứ Năm' },
  { value: '5', label: 'Thứ Sáu' },
  { value: '6', label: 'Thứ Bảy' },
  { value: '0', label: 'Chủ Nhật' },
];

export function EditTaskModal({ task, open, onOpenChange }: EditTaskModalProps) {
  const updateTaskMutation = useUpdateTask();
  const recurringRuleQuery = useRecurringRule(task?.id, open && !!task?.id);
  const saveRecurringRuleMutation = useSaveRecurringRule(task?.id || '');
  const deleteRecurringRuleMutation = useDeleteRecurringRule(task?.id || '');
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TaskFormData>();

  const [selectedPriority, setSelectedPriority] = useState(task?.priority || 'medium');
  const [enableRecurring, setEnableRecurring] = useState(false);
  const [recurringPattern, setRecurringPattern] = useState<RecurringPattern>('daily');
  const [recurringTime, setRecurringTime] = useState('09:00');
  const [weeklyDay, setWeeklyDay] = useState('1');

  useEffect(() => {
    if (task && open) {
      reset({
        ten: task.ten,
        mo_ta: task.moTa || '',
        deadline: task.deadline ? task.deadline.split('T')[0] : '',
        progress: task.progress,
      });
    }
  }, [task, open, reset]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const recurringRule = recurringRuleQuery.data?.data;

    if (!recurringRule) {
      queueMicrotask(() => {
        setEnableRecurring(false);
        setRecurringPattern('daily');
        setRecurringTime('09:00');
        setWeeklyDay('1');
      });
      return;
    }

    try {
      const parsed = parseCronExpression(recurringRule.cron_expression);
      queueMicrotask(() => {
        setEnableRecurring(Boolean(recurringRule.is_active));
        setRecurringPattern(parsed.pattern);
        setRecurringTime(
          `${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')}`
        );
        setWeeklyDay(String(parsed.dayOfWeek ?? 1));
      });
    } catch (error) {
      console.error('Không parse được recurring rule:', error);
      queueMicrotask(() => {
        setEnableRecurring(Boolean(recurringRule.is_active));
      });
    }
  }, [open, recurringRuleQuery.data]);

  const recurringSummary = useMemo(() => {
    if (!enableRecurring) {
      return 'Task này không tạo lặp lại.';
    }

    if (recurringPattern === 'weekdays') {
      return `Tạo task mỗi ngày làm việc lúc ${recurringTime}`;
    }

    if (recurringPattern === 'weekly') {
      const dayLabel = DAY_OPTIONS.find((item) => item.value === weeklyDay)?.label || 'Thứ Hai';
      return `Tạo task mỗi ${dayLabel} lúc ${recurringTime}`;
    }

    return `Tạo task mỗi ngày lúc ${recurringTime}`;
  }, [enableRecurring, recurringPattern, recurringTime, weeklyDay]);

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
        progress_mode: 'manual',
      };

      await updateTaskMutation.mutateAsync(updateData);

      if (enableRecurring) {
        const [hour, minute] = recurringTime.split(':').map((value) => Number.parseInt(value, 10));
        const cronExpression = buildCronExpression({
          pattern: recurringPattern,
          hour: Number.isFinite(hour) ? hour : 9,
          minute: Number.isFinite(minute) ? minute : 0,
          dayOfWeek: recurringPattern === 'weekly' ? Number.parseInt(weeklyDay, 10) : undefined,
        });

        await saveRecurringRuleMutation.mutateAsync({
          cron_expression: cronExpression,
          title: data.ten,
          description: data.mo_ta || '',
          priority: selectedPriority as 'low' | 'medium' | 'high' | 'urgent',
          is_active: true,
        });
      } else if (recurringRuleQuery.data?.data) {
        await deleteRecurringRuleMutation.mutateAsync();
      }

      toast.success('Đã cập nhật task thành công');
      onOpenChange(false);
    } catch (error) {
      console.error('Lỗi cập nhật task:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật task');
    }
  };

  if (!task) return null;

  const isSubmitting =
    updateTaskMutation.isPending ||
    saveRecurringRuleMutation.isPending ||
    deleteRecurringRuleMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chỉnh Sửa Task</DialogTitle>
          <DialogDescription>
            Cập nhật thông tin task và cấu hình tạo lặp lại nếu cần.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="ten">Tên Task *</Label>
            <Input
              id="ten"
              {...register('ten', { required: 'Vui lòng nhập tên task' })}
              placeholder="Tên task"
            />
            {errors.ten && <p className="text-sm text-red-600 mt-1">{errors.ten.message}</p>}
          </div>

          <div>
            <Label htmlFor="mo_ta">Mô Tả</Label>
            <Textarea
              id="mo_ta"
              {...register('mo_ta')}
              placeholder="Mô tả chi tiết task..."
              className="min-h-[90px]"
            />
          </div>

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

          <div>
            <Label htmlFor="progress">Tiến độ (%)</Label>
            <Input
              id="progress"
              type="number"
              min={0}
              max={100}
              {...register('progress', {
                min: { value: 0, message: 'Tiến độ tối thiểu là 0%' },
                max: { value: 100, message: 'Tiến độ tối đa là 100%' },
              })}
            />
            {errors.progress && <p className="text-sm text-red-600 mt-1">{errors.progress.message}</p>}
          </div>

          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Task định kỳ</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Bật nếu muốn hệ thống tự tạo lại task này theo lịch.
                </p>
              </div>
              <Switch checked={enableRecurring} onCheckedChange={setEnableRecurring} />
            </div>

            {enableRecurring && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Kiểu lặp lại</Label>
                    <Select
                      value={recurringPattern}
                      onValueChange={(value) => setRecurringPattern(value as RecurringPattern)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Mỗi ngày</SelectItem>
                        <SelectItem value="weekdays">Ngày làm việc</SelectItem>
                        <SelectItem value="weekly">Hàng tuần</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Giờ tạo</Label>
                    <Input
                      type="time"
                      value={recurringTime}
                      onChange={(event) => setRecurringTime(event.target.value)}
                    />
                  </div>
                </div>

                {recurringPattern === 'weekly' && (
                  <div>
                    <Label>Ngày lặp lại</Label>
                    <Select value={weeklyDay} onValueChange={setWeeklyDay}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAY_OPTIONS.map((day) => (
                          <SelectItem key={day.value} value={day.value}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
                  {recurringSummary}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
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
