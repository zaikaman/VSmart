'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useUpdateTask, UpdateTaskInput } from '@/lib/hooks/use-tasks';
import { useProjectMembers } from '@/lib/hooks/use-project-members';
import { useDeleteRecurringRule, useRecurringRule, useSaveRecurringRule } from '@/lib/hooks/use-task-execution';
import { useDeadlineReview, useInsightFeedback } from '@/lib/hooks/use-ai-insights';
import { buildCronExpression, parseCronExpression, RecurringPattern } from '@/lib/tasks/recurring';
import { toast } from 'sonner';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface Task {
  id: string;
  ten: string;
  moTa?: string | null;
  deadline?: string | null;
  trangThai: string;
  priority: string;
  progressMode?: 'manual' | 'checklist';
  assigneeId?: string | null;
  projectId?: string;
  canAssign?: boolean;
  requiresReview?: boolean;
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
  const deadlineReviewMutation = useDeadlineReview();
  const insightFeedbackMutation = useInsightFeedback();
  const recurringRuleQuery = useRecurringRule(task?.id, open && !!task?.id);
  const saveRecurringRuleMutation = useSaveRecurringRule(task?.id || '');
  const deleteRecurringRuleMutation = useDeleteRecurringRule(task?.id || '');
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<TaskFormData>();
  const { data: projectMembers } = useProjectMembers(task?.projectId || '');
  const { data: currentUser } = useCurrentUser(open);

  const [selectedPriority, setSelectedPriority] = useState(task?.priority || 'medium');
  const [selectedStatus, setSelectedStatus] = useState<'todo' | 'in-progress' | 'done'>('todo');
  const [selectedAssignee, setSelectedAssignee] = useState('unassigned');
  const [requiresReview, setRequiresReview] = useState(false);
  const [enableRecurring, setEnableRecurring] = useState(false);
  const [recurringPattern, setRecurringPattern] = useState<RecurringPattern>('daily');
  const [recurringTime, setRecurringTime] = useState('09:00');
  const [weeklyDay, setWeeklyDay] = useState('1');
  const deadlineReviewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const watchedName = watch('ten');
  const watchedDescription = watch('mo_ta');
  const watchedDeadline = watch('deadline');

  useEffect(() => {
    if (task && open) {
      reset({
        ten: task.ten,
        mo_ta: task.moTa || '',
        deadline: task.deadline ? task.deadline.split('T')[0] : '',
      });
      setSelectedPriority(task.priority || 'medium');
      setSelectedStatus((task.trangThai as 'todo' | 'in-progress' | 'done') || 'todo');
      setSelectedAssignee(task.assigneeId || 'unassigned');
      setRequiresReview(Boolean(task.requiresReview));
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

  useEffect(() => {
    if (deadlineReviewTimerRef.current) {
      clearTimeout(deadlineReviewTimerRef.current);
    }

    if (!open || !task?.id || !watchedName?.trim() || watchedName.trim().length < 3 || !watchedDeadline) {
      return;
    }

    const timer = setTimeout(() => {
      deadlineReviewMutation.mutate({
        ten: watchedName.trim(),
        mo_ta: watchedDescription?.trim() || undefined,
        priority: selectedPriority as 'low' | 'medium' | 'high' | 'urgent',
        deadline: new Date(watchedDeadline).toISOString(),
      });
    }, 700);

    deadlineReviewTimerRef.current = timer;

    return () => clearTimeout(timer);
  }, [open, selectedPriority, task?.id, watchedDeadline, watchedDescription, watchedName]);

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

  const canAssignTasks = task?.canAssign ?? false;
  const memberCandidates = useMemo(
    () =>
      (projectMembers || [])
        .filter((member) => member.trang_thai === 'active' && member.nguoi_dung?.id)
        .map((member) => ({
          id: member.nguoi_dung!.id,
          ten: member.nguoi_dung!.ten,
          email: member.nguoi_dung!.email,
        })),
    [projectMembers]
  );
  const assigneeCandidates = useMemo(() => {
    if (canAssignTasks) {
      return memberCandidates;
    }

    return currentUser ? [{ id: currentUser.id, ten: currentUser.ten, email: currentUser.email }] : [];
  }, [canAssignTasks, currentUser, memberCandidates]);

  useEffect(() => {
    if (!open || canAssignTasks) {
      return;
    }

    if (selectedAssignee === 'unassigned' || selectedAssignee === currentUser?.id) {
      return;
    }

    setSelectedAssignee('unassigned');
  }, [canAssignTasks, currentUser?.id, open, selectedAssignee]);

  const onSubmit = async (data: TaskFormData) => {
    if (!task) return;

    try {
      const updateData: UpdateTaskInput = {
        id: task.id,
        ten: data.ten,
        mo_ta: data.mo_ta || undefined,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : undefined,
        priority: selectedPriority as 'low' | 'medium' | 'high' | 'urgent',
        assignee_id: selectedAssignee === 'unassigned' ? null : selectedAssignee,
        requires_review: requiresReview,
      };

      if ((task.progressMode || 'manual') === 'manual') {
        updateData.trang_thai = selectedStatus;
      }

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
          <DialogTitle>Chỉnh sửa Task</DialogTitle>
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
            <Label htmlFor="mo_ta">Mô tả</Label>
            <Textarea
              id="mo_ta"
              {...register('mo_ta')}
              placeholder="Mô tả chi tiết task..."
              className="min-h-[90px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Độ ưu tiên</Label>
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="assignee">Người thực hiện</Label>
              <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                <SelectTrigger id="assignee">
                  <SelectValue placeholder="Chọn người thực hiện" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Chưa phân công</SelectItem>
                  {assigneeCandidates.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.ten}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!canAssignTasks ? (
                <p className="mt-1 text-xs text-slate-500">Bạn chỉ có thể tự nhận task hoặc để trống.</p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="status">Trạng thái xử lý</Label>
              <Select
                value={selectedStatus}
                onValueChange={(value) => setSelectedStatus(value as 'todo' | 'in-progress' | 'done')}
                disabled={(task.progressMode || 'manual') === 'checklist'}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">Cần làm</SelectItem>
                  <SelectItem value="in-progress">Đang làm</SelectItem>
                  <SelectItem value="done">Hoàn thành</SelectItem>
                </SelectContent>
              </Select>
              {(task.progressMode || 'manual') === 'checklist' ? (
                <p className="mt-1 text-xs text-slate-500">Task checklist đổi trạng thái theo checklist và luồng duyệt.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border border-[#e7ebdf] bg-[#fbfbf8] px-4 py-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label className="text-sm font-semibold text-[#253124]">Cần duyệt trước khi hoàn thành</Label>
                <p className="mt-1 text-sm text-slate-600">
                  Khi bật, task sẽ đi vào chờ duyệt thay vì chốt thẳng hoàn thành.
                </p>
              </div>
              <Switch checked={requiresReview} onCheckedChange={setRequiresReview} />
            </div>
          </div>

          {deadlineReviewMutation.data?.result.warning_level && deadlineReviewMutation.data.result.warning_level !== 'none' ? (
            <div
              className={`rounded-xl border p-4 ${
                deadlineReviewMutation.data.result.warning_level === 'high'
                  ? 'border-rose-200 bg-rose-50'
                  : 'border-amber-200 bg-amber-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <AlertCircle
                    className={`mt-0.5 h-4 w-4 ${
                      deadlineReviewMutation.data.result.warning_level === 'high'
                        ? 'text-rose-600'
                        : 'text-amber-600'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-semibold text-[#191a23]">Mốc này hơi sát so với nhịp triển khai</p>
                    <p className="mt-1 text-sm text-[#5f6b59]">
                      {deadlineReviewMutation.data.result.ly_do}
                    </p>
                  </div>
                </div>

                {deadlineReviewMutation.data.result.suggested_deadline ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const value = deadlineReviewMutation.data?.result.suggested_deadline?.slice(0, 10);
                      if (!value) return;
                      setValue('deadline', value);
                      insightFeedbackMutation.mutate({
                        insight_type: 'deadline_review',
                        event_type: 'accepted',
                        metadata: {
                          source: 'edit_task_modal',
                          taskId: task?.id,
                        },
                      });
                    }}
                  >
                    Dùng mốc gợi ý
                  </Button>
                ) : null}
              </div>
              {deadlineReviewMutation.data.result.suggested_deadline ? (
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#7b846f]">
                  Gợi ý mới: {new Date(deadlineReviewMutation.data.result.suggested_deadline).toLocaleDateString('vi-VN')}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-lg border border-[#e7ebdf] bg-[#fbfbf8] px-4 py-3 text-sm text-slate-600">
            {(task.progressMode || 'manual') === 'checklist'
              ? 'Task này dùng checklist để tự đồng bộ tiến độ.'
              : 'Task manual sẽ tự suy ra tiến độ từ trạng thái xử lý và luồng duyệt, không cần nhập % thủ công.'}
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
                'Lưu thay đổi'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}




