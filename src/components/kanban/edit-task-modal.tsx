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
  { value: '1', label: 'Thá»© Hai' },
  { value: '2', label: 'Thá»© Ba' },
  { value: '3', label: 'Thá»© TÆ°' },
  { value: '4', label: 'Thá»© NÄƒm' },
  { value: '5', label: 'Thá»© SÃ¡u' },
  { value: '6', label: 'Thá»© Báº£y' },
  { value: '0', label: 'Chá»§ Nháº­t' },
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
      console.error('KhÃ´ng parse Ä‘Æ°á»£c recurring rule:', error);
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
      return 'Task nÃ y khÃ´ng táº¡o láº·p láº¡i.';
    }

    if (recurringPattern === 'weekdays') {
      return `Táº¡o task má»—i ngÃ y lÃ m viá»‡c lÃºc ${recurringTime}`;
    }

    if (recurringPattern === 'weekly') {
      const dayLabel = DAY_OPTIONS.find((item) => item.value === weeklyDay)?.label || 'Thá»© Hai';
      return `Táº¡o task má»—i ${dayLabel} lÃºc ${recurringTime}`;
    }

    return `Táº¡o task má»—i ngÃ y lÃºc ${recurringTime}`;
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

      toast.success('ÄÃ£ cáº­p nháº­t task thÃ nh cÃ´ng');
      onOpenChange(false);
    } catch (error) {
      console.error('Lá»—i cáº­p nháº­t task:', error);
      toast.error(error instanceof Error ? error.message : 'KhÃ´ng thá»ƒ cáº­p nháº­t task');
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
          <DialogTitle>Chá»‰nh Sá»­a Task</DialogTitle>
          <DialogDescription>
            Cáº­p nháº­t thÃ´ng tin task vÃ  cáº¥u hÃ¬nh táº¡o láº·p láº¡i náº¿u cáº§n.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="ten">TÃªn Task *</Label>
            <Input
              id="ten"
              {...register('ten', { required: 'Vui lÃ²ng nháº­p tÃªn task' })}
              placeholder="TÃªn task"
            />
            {errors.ten && <p className="text-sm text-red-600 mt-1">{errors.ten.message}</p>}
          </div>

          <div>
            <Label htmlFor="mo_ta">MÃ´ Táº£</Label>
            <Textarea
              id="mo_ta"
              {...register('mo_ta')}
              placeholder="MÃ´ táº£ chi tiáº¿t task..."
              className="min-h-[90px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Äá»™ Æ¯u TiÃªn</Label>
              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Chá»n Ä‘á»™ Æ°u tiÃªn" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Tháº¥p</SelectItem>
                  <SelectItem value="medium">Trung bÃ¬nh</SelectItem>
                  <SelectItem value="high">Cao</SelectItem>
                  <SelectItem value="urgent">Kháº©n cáº¥p</SelectItem>
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
              <Label htmlFor="assignee">NgÆ°á»i thá»±c hiá»‡n</Label>
              <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                <SelectTrigger id="assignee">
                  <SelectValue placeholder="Chá»n ngÆ°á»i thá»±c hiá»‡n" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">ChÆ°a phÃ¢n cÃ´ng</SelectItem>
                  {assigneeCandidates.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.ten}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!canAssignTasks ? (
                <p className="mt-1 text-xs text-slate-500">Báº¡n chá»‰ cÃ³ thá»ƒ tá»± nháº­n task hoáº·c Ä‘á»ƒ trá»‘ng.</p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="status">Tráº¡ng thÃ¡i xá»­ lÃ½</Label>
              <Select
                value={selectedStatus}
                onValueChange={(value) => setSelectedStatus(value as 'todo' | 'in-progress' | 'done')}
                disabled={(task.progressMode || 'manual') === 'checklist'}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Chá»n tráº¡ng thÃ¡i" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">Cáº§n lÃ m</SelectItem>
                  <SelectItem value="in-progress">Äang lÃ m</SelectItem>
                  <SelectItem value="done">HoÃ n thÃ nh</SelectItem>
                </SelectContent>
              </Select>
              {(task.progressMode || 'manual') === 'checklist' ? (
                <p className="mt-1 text-xs text-slate-500">Task checklist Ä‘á»•i tráº¡ng thÃ¡i theo checklist vÃ  luá»“ng duyá»‡t.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border border-[#e7ebdf] bg-[#fbfbf8] px-4 py-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label className="text-sm font-semibold text-[#253124]">Cáº§n duyá»‡t trÆ°á»›c khi hoÃ n thÃ nh</Label>
                <p className="mt-1 text-sm text-slate-600">
                  Khi báº­t, task sáº½ Ä‘i vÃ o chá» duyá»‡t thay vÃ¬ chá»‘t tháº³ng hoÃ n thÃ nh.
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
                    <p className="text-sm font-semibold text-[#191a23]">Má»‘c nÃ y hÆ¡i sÃ¡t so vá»›i nhá»‹p triá»ƒn khai</p>
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
                    DÃ¹ng má»‘c gá»£i Ã½
                  </Button>
                ) : null}
              </div>
              {deadlineReviewMutation.data.result.suggested_deadline ? (
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#7b846f]">
                  Gá»£i Ã½ má»›i: {new Date(deadlineReviewMutation.data.result.suggested_deadline).toLocaleDateString('vi-VN')}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-lg border border-[#e7ebdf] bg-[#fbfbf8] px-4 py-3 text-sm text-slate-600">
            {(task.progressMode || 'manual') === 'checklist'
              ? 'Task nÃ y dÃ¹ng checklist Ä‘á»ƒ tá»± Ä‘á»“ng bá»™ tiáº¿n Ä‘á»™.'
              : 'Task manual sáº½ tá»± suy ra tiáº¿n Ä‘á»™ tá»« tráº¡ng thÃ¡i xá»­ lÃ½ vÃ  luá»“ng duyá»‡t, khÃ´ng cáº§n nháº­p % thá»§ cÃ´ng.'}
          </div>

          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Task Ä‘á»‹nh ká»³</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Báº­t náº¿u muá»‘n há»‡ thá»‘ng tá»± táº¡o láº¡i task nÃ y theo lá»‹ch.
                </p>
              </div>
              <Switch checked={enableRecurring} onCheckedChange={setEnableRecurring} />
            </div>

            {enableRecurring && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Kiá»ƒu láº·p láº¡i</Label>
                    <Select
                      value={recurringPattern}
                      onValueChange={(value) => setRecurringPattern(value as RecurringPattern)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Má»—i ngÃ y</SelectItem>
                        <SelectItem value="weekdays">NgÃ y lÃ m viá»‡c</SelectItem>
                        <SelectItem value="weekly">HÃ ng tuáº§n</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Giá» táº¡o</Label>
                    <Input
                      type="time"
                      value={recurringTime}
                      onChange={(event) => setRecurringTime(event.target.value)}
                    />
                  </div>
                </div>

                {recurringPattern === 'weekly' && (
                  <div>
                    <Label>NgÃ y láº·p láº¡i</Label>
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
              Há»§y
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Äang lÆ°u...
                </>
              ) : (
                'LÆ°u Thay Äá»•i'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}




