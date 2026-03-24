'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateTask, CreateTaskInput } from '@/lib/hooks/use-tasks';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { usePlanningWorkload } from '@/lib/hooks/use-planning';
import { useDeadlineReview, useInsightFeedback } from '@/lib/hooks/use-ai-insights';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sparkles, User, Check, ChevronDown, AlertCircle, Loader2, Wand2, Plus, Trash2, Save } from 'lucide-react';
import { useBreakdownTask, useCreateTaskTemplate, useTaskTemplates } from '@/lib/hooks/use-task-execution';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { getCapacityBadgeConfig } from '@/lib/utils/workload-utils';
import { Switch } from '@/components/ui/switch';

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStatus?: string;
  phanDuAnId: string;
  phanDuAnName?: string;
  projectId?: string;
}

interface TaskFormData {
  ten: string;
  mo_ta?: string;
  deadline?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  trang_thai: string;
  assignee_id?: string;
}

interface SuggestionReason {
  chinh: string;
  ky_nang_phu_hop: string[];
  ty_le_hoan_thanh: string;
  khoi_luong_hien_tai: string;
}

interface AISuggestion {
  nguoi_dung_id: string;
  diem_phu_hop: number;
  ly_do: SuggestionReason;
  user?: {
    id: string;
    ten: string;
    email: string;
    avatar_url?: string;
    skills: Array<{
      ten_ky_nang: string;
      trinh_do: string;
      nam_kinh_nghiem: number;
    }>;
    ty_le_hoan_thanh: number;
    so_task_dang_lam: number;
    load_status?: 'available' | 'balanced' | 'stretched' | 'overloaded';
  };
}

interface Candidate {
  id: string;
  ten: string;
  email: string;
  avatar_url?: string;
  so_task_dang_lam?: number;
  load_status?: 'available' | 'balanced' | 'stretched' | 'overloaded';
  overloaded_warning?: string;
}

interface SuggestAssigneeResponse {
  suggestions: AISuggestion[];
  all_candidates: Candidate[];
  latency_ms: number;
  model: string;
  error?: string;
}

interface DraftChecklistItem {
  id: string;
  title: string;
  is_done?: boolean;
  sort_order?: number;
}

interface ProjectPermissionResponse {
  permissions?: {
    canCreateTasks?: boolean;
    canAssignTasks?: boolean;
  };
}

function createChecklistDraftItem(title = ''): DraftChecklistItem {
  return {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    is_done: false,
  };
}

export function CreateTaskModal({
  open,
  onOpenChange,
  initialStatus = 'todo',
  phanDuAnId,
  phanDuAnName,
  projectId,
}: CreateTaskModalProps) {
  const createTaskMutation = useCreateTask();
  const breakdownMutation = useBreakdownTask();
  const createTemplateMutation = useCreateTaskTemplate();
  const deadlineReviewMutation = useDeadlineReview();
  const insightFeedbackMutation = useInsightFeedback();
  const { data: templatesResponse } = useTaskTemplates(open);
  const { data: workloadResponse } = usePlanningWorkload({
    projectId,
    enabled: open && !!projectId,
  });
  const { data: currentUser } = useCurrentUser(open);
  const { data: projectPermissionData, isLoading: projectPermissionsLoading } = useQuery<ProjectPermissionResponse>({
    queryKey: ['project-permissions', projectId],
    queryFn: async () => {
      if (!projectId) {
        return {};
      }

      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) {
        throw new Error('Không thể tải quyền dự án');
      }
      return response.json() as Promise<ProjectPermissionResponse>;
    },
    enabled: open && !!projectId,
    staleTime: 30 * 1000,
  });
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<TaskFormData>({
    defaultValues: {
      trang_thai: initialStatus,
      priority: 'medium',
    },
  });

  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [suggestionModel, setSuggestionModel] = useState<string>('');

  const [selectedAssignee, setSelectedAssignee] = useState<string>('unassigned');
  const [selectedPriority, setSelectedPriority] = useState<string>('medium');
  const [showManualSelect, setShowManualSelect] = useState(false);
  const [selectedFromAI, setSelectedFromAI] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('no-template');
  const [checklistItems, setChecklistItems] = useState<DraftChecklistItem[]>([]);
  const [requiresReview, setRequiresReview] = useState(false);

  const taskName = watch('ten');
  const taskDescription = watch('mo_ta');
  const taskDeadline = watch('deadline');
  const templates = useMemo(() => templatesResponse?.data || [], [templatesResponse?.data]);
  const workloadCandidates = useMemo(
    () =>
      (workloadResponse?.members || []).map((member) => ({
        id: member.userId,
        ten: member.ten,
        email: member.email,
        avatar_url: member.avatarUrl || undefined,
        so_task_dang_lam: member.activeTasks,
        load_status: member.loadStatus,
        overloaded_warning:
          member.loadStatus === 'overloaded'
            ? 'Đang quá tải'
            : member.loadStatus === 'stretched'
              ? 'Đang sát tải'
              : undefined,
      })),
    [workloadResponse?.members]
  );
  const manualCandidates = useMemo(
    () => (allCandidates.length > 0 ? allCandidates : workloadCandidates),
    [allCandidates, workloadCandidates]
  );
  const selfCandidate = useMemo(
    () =>
      currentUser
        ? {
            id: currentUser.id,
            ten: currentUser.ten,
            email: currentUser.email,
          }
        : null,
    [currentUser]
  );
  const canAssignTasks = projectPermissionData?.permissions?.canAssignTasks ?? false;
  const canCreateTasks = projectPermissionData?.permissions?.canCreateTasks ?? false;
  const selfAssignCandidates = useMemo(
    () => (selfCandidate ? [selfCandidate] : []),
    [selfCandidate]
  );

  const deadlineReviewTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSuggestions = useCallback(async () => {
    if (!canAssignTasks || !taskName || taskName.length < 3 || !phanDuAnId) {
      setSuggestions([]);
      return;
    }

    setIsLoadingSuggestions(true);
    setSuggestionsError(null);

    try {
      const payload = {
        ten: taskName,
        mo_ta: taskDescription || '',
        priority: selectedPriority,
        deadline: taskDeadline
          ? new Date(taskDeadline).toISOString()
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        phan_du_an_id: phanDuAnId,
      };

      console.log('[AI Suggest Assignee][Client] Request', payload);

      const response = await fetch('/api/ai/suggest-assignee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('[AI Suggest Assignee][Client] Response status', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
      });

      if (!response.ok) {
        throw new Error('Không thể lấy gợi ý từ AI');
      }

      const data: SuggestAssigneeResponse = await response.json();
      console.log('[AI Suggest Assignee][Client] Response payload', data);
      setSuggestions(data.suggestions || []);
      setAllCandidates(data.all_candidates || []);
      setSuggestionModel(data.model);

      if (data.error) {
        setSuggestionsError(data.error);
      }
    } catch (error) {
      console.error('Lỗi fetch suggestions:', error);
      setSuggestionsError('Không thể kết nối AI. Vui lòng chọn thủ công.');
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [canAssignTasks, taskName, taskDescription, selectedPriority, taskDeadline, phanDuAnId]);

  useEffect(() => {
    if (!open) {
      setSuggestions([]);
      setAllCandidates([]);
      setSuggestionsError(null);
      setSelectedAssignee('unassigned');
      setSelectedFromAI(null);
      setShowManualSelect(false);
      setSelectedPriority('medium');
      setSelectedTemplateId('no-template');
      setChecklistItems([]);
      setRequiresReview(false);
      deadlineReviewMutation.reset();
      reset({
        ten: '',
        mo_ta: '',
        deadline: '',
        priority: 'medium',
        trang_thai: initialStatus,
      });
    }
  }, [open, initialStatus, reset]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!canAssignTasks) {
      setSuggestions([]);
      setAllCandidates([]);
      setSuggestionsError(null);
      setSelectedFromAI(null);

      if (selectedAssignee !== 'unassigned' && selectedAssignee !== currentUser?.id) {
        setSelectedAssignee('unassigned');
      }
    }
  }, [open, canAssignTasks, currentUser?.id, selectedAssignee]);

  useEffect(() => {
    if (!open || !canAssignTasks) {
      return;
    }

    setSuggestions([]);
    setSuggestionsError(null);
    setSuggestionModel('');
    setSelectedFromAI(null);
  }, [open, canAssignTasks, taskName, taskDescription, selectedPriority, taskDeadline, phanDuAnId]);

  useEffect(() => {
    if (deadlineReviewTimerRef.current) {
      clearTimeout(deadlineReviewTimerRef.current);
    }

    if (!open || !taskName?.trim() || taskName.trim().length < 3 || !taskDeadline) {
      return;
    }

    const timer = setTimeout(() => {
      deadlineReviewMutation.mutate({
        ten: taskName.trim(),
        mo_ta: taskDescription?.trim() || undefined,
        priority: selectedPriority as 'low' | 'medium' | 'high' | 'urgent',
        deadline: new Date(taskDeadline).toISOString(),
        projectId,
      });
    }, 700);

    deadlineReviewTimerRef.current = timer;

    return () => clearTimeout(timer);
  }, [
    open,
    projectId,
    selectedPriority,
    taskDeadline,
    taskDescription,
    taskName,
  ]);

  useEffect(() => {
    if (selectedTemplateId === 'no-template') {
      return;
    }

    const template = templates.find((item) => item.id === selectedTemplateId);
    if (!template) {
      return;
    }

    if (!taskName?.trim()) {
      setValue('ten', template.ten);
    }

    if (!taskDescription?.trim() && template.mo_ta) {
      setValue('mo_ta', template.mo_ta);
    }

    setSelectedPriority(template.default_priority);
    setChecklistItems(
      (template.checklist_template || []).map((item, index) =>
        createChecklistDraftItem(item.title || `Bước ${index + 1}`)
      )
    );
  }, [selectedTemplateId, templates, taskName, taskDescription, setValue]);

  const handleSelectSuggestion = (userId: string) => {
    setSelectedAssignee(userId);
    setSelectedFromAI(userId);
    setShowManualSelect(false);
  };

  const handleAddChecklistItem = () => {
    setChecklistItems((prev) => [...prev, createChecklistDraftItem('')]);
  };

  const handleChecklistChange = (id: string, title: string) => {
    setChecklistItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, title } : item))
    );
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklistItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleGenerateChecklist = async () => {
    if (!taskName?.trim()) {
      toast.error('Nhập tên task trước khi tạo checklist bằng AI');
      return;
    }

    try {
      const result = await breakdownMutation.mutateAsync({
        ten: taskName,
        mo_ta: taskDescription,
        priority: selectedPriority as 'low' | 'medium' | 'high' | 'urgent',
      });

      setChecklistItems(
        (result.checklist || []).map((item) => createChecklistDraftItem(item.title))
      );

      if (result.error) {
        toast.message('AI đã tạo checklist bằng phương án fallback');
      } else {
        toast.success('Đã tạo checklist bằng AI');
      }
    } catch (error) {
      console.error('Lỗi tạo checklist bằng AI:', error);
      toast.error('Không thể tạo checklist bằng AI');
    }
  };

  const handleSaveTemplate = async () => {
    const cleanedChecklist = checklistItems
      .map((item, index) => ({
        title: item.title.trim(),
        is_done: false,
        sort_order: index,
      }))
      .filter((item) => item.title.length > 0);

    if (!taskName?.trim()) {
      toast.error('Nhập tên task trước khi lưu template');
      return;
    }

    try {
      await createTemplateMutation.mutateAsync({
        ten: taskName.trim(),
        mo_ta: taskDescription || '',
        default_priority: selectedPriority as 'low' | 'medium' | 'high' | 'urgent',
        checklist_template: cleanedChecklist,
      });
      toast.success('Đã lưu template');
    } catch (error) {
      console.error('Lỗi lưu template:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể lưu template');
    }
  };

  const onSubmit = async (data: TaskFormData) => {
    try {
      if (!canCreateTasks) {
        toast.error('Bạn không có quyền tạo task trong dự án này');
        return;
      }

      if (!phanDuAnId || phanDuAnId.trim() === '') {
        toast.error('Chưa chọn phần dự án');
        return;
      }

      const normalizedChecklist = checklistItems
        .map((item, index) => ({
          title: item.title.trim(),
          is_done: false,
          sort_order: index,
        }))
        .filter((item) => item.title.length > 0);

      const taskInput: CreateTaskInput = {
        ten: data.ten,
        mo_ta: data.mo_ta,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : new Date().toISOString(),
        phan_du_an_id: phanDuAnId,
        trang_thai: initialStatus === 'in-progress' || initialStatus === 'done' ? initialStatus : 'todo',
        priority: selectedPriority as 'low' | 'medium' | 'high' | 'urgent',
        template_id: selectedTemplateId !== 'no-template' ? selectedTemplateId : null,
        checklist_items: normalizedChecklist,
        progress_mode: normalizedChecklist.length > 0 ? 'checklist' : 'manual',
        requires_review: requiresReview,
      };

      if (selectedAssignee !== 'unassigned') {
        taskInput.assignee_id = selectedAssignee;
      }

      const createdTask = await createTaskMutation.mutateAsync(taskInput);

      if (suggestions.length > 0 && createdTask?.id) {
        try {
          const suggestionsToTrack = suggestions.map((s) => ({
            nguoi_dung_id: s.nguoi_dung_id,
            diem_phu_hop: s.diem_phu_hop,
            ly_do: s.ly_do || { chinh: 'Gợi ý từ AI' },
            da_chap_nhan: s.nguoi_dung_id === selectedFromAI,
          }));

          await fetch('/api/ai/track-suggestion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              task_id: createdTask.id,
              suggestions: suggestionsToTrack,
            }),
          });
        } catch (trackError) {
          console.warn('Lỗi track AI suggestion:', trackError);
        }
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Lỗi tạo task:', error);
      toast.error(error instanceof Error ? error.message : 'Không thể tạo task');
    }
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getCapacityBadge = (status?: Candidate['load_status']) => {
    if (!status) {
      return null;
    }

    return getCapacityBadgeConfig(status);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Tạo Task Mới
            <Sparkles className="w-4 h-4 text-[#b9ff66]" />
          </DialogTitle>
          <DialogDescription>
            {phanDuAnName ? (
              <>Tạo task cho phần dự án: <strong>{phanDuAnName}</strong></>
            ) : (
              'Điền thông tin task. AI sẽ gợi ý người phù hợp nhất.'
            )}
          </DialogDescription>
        </DialogHeader>

        {projectPermissionsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-10 w-24 rounded-xl" />
          </div>
        ) : !canCreateTasks ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Chỉ quản lý hoặc admin của dự án mới có thể tạo task chính thức. Nếu cần đầu việc mới, hãy trao đổi để người phụ trách tạo giúp.
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Đóng
              </Button>
            </DialogFooter>
          </div>
        ) : (

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-template">Không dùng template</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.ten}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleGenerateChecklist}
                disabled={breakdownMutation.isPending}
              >
                {breakdownMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Wand2 className="w-4 h-4 mr-2" />
                )}
                Tạo checklist bằng AI
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveTemplate}
                disabled={createTemplateMutation.isPending}
              >
                {createTemplateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="ten">Tên Task *</Label>
            <Input
              id="ten"
              {...register('ten', { required: 'Vui lòng nhập tên task' })}
              placeholder="Ví dụ: Implement login API"
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

          <div className="rounded-lg border border-[#e7ebdf] bg-[#fbfbf8] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label className="text-sm font-semibold text-[#253124]">Cần duyệt trước khi hoàn thành</Label>
                <p className="mt-1 text-sm text-[#64705f]">
                  Bật cho những task có đầu ra cần kiểm tra lại trước khi chốt hẳn.
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
                    <p className="text-sm font-semibold text-[#191a23]">Deadline này có vẻ hơi gắt</p>
                    <p className="mt-1 text-sm text-[#5f6b59]">
                      {deadlineReviewMutation.data.result.ly_do}
                    </p>
                    {deadlineReviewMutation.data.result.goi_y.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        {deadlineReviewMutation.data.result.goi_y.map((item) => (
                          <p key={item} className="text-xs text-[#61705f]">
                            {item}
                          </p>
                        ))}
                      </div>
                    ) : null}
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
                          source: 'create_task_modal',
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

          <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-semibold">Checklist thực thi</Label>
                <p className="text-xs text-gray-500 mt-1">
                  Checklist sẽ tự đồng bộ tiến độ task khi được tạo.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddChecklistItem}>
                <Plus className="w-4 h-4 mr-1" />
                Thêm mục
              </Button>
            </div>

            {checklistItems.length === 0 ? (
              <div className="text-sm text-gray-500 border border-dashed rounded-lg py-4 text-center">
                Chưa có checklist. Dùng template hoặc AI để tạo nhanh.
              </div>
            ) : (
              <div className="space-y-2">
                {checklistItems.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-5">{index + 1}.</span>
                    <Input
                      value={item.title}
                      onChange={(event) => handleChecklistChange(item.id, event.target.value)}
                      placeholder={`Bước ${index + 1}`}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveChecklistItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {canAssignTasks ? (
            <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#b9ff66]" />
                <Label className="text-sm font-semibold">Gợi ý phân công từ AI</Label>
                {suggestionModel && suggestionModel !== 'fallback' && (
                  <Badge variant="outline" className="text-xs">
                    AI
                  </Badge>
                )}
                {suggestionModel === 'fallback' && (
                  <Badge variant="outline" className="text-xs">
                    Auto
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isLoadingSuggestions && (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={fetchSuggestions}
                  disabled={!phanDuAnId || !taskName || taskName.trim().length < 3 || isLoadingSuggestions}
                  className="border-[#d8dfcb] bg-white text-[#253124] hover:bg-[#f5f8ef]"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5 text-[#7aa53a]" />
                  {suggestions.length > 0 || suggestionModel ? 'Tạo lại gợi ý' : 'Tạo gợi ý'}
                </Button>
              </div>
            </div>

            {isLoadingSuggestions && (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-lg">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-[60%]" />
                      <Skeleton className="h-3 w-[80%]" />
                    </div>
                    <Skeleton className="h-6 w-12" />
                  </div>
                ))}
              </div>
            )}

            {suggestionsError && !isLoadingSuggestions && (
              <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span>{suggestionsError}</span>
              </div>
            )}

            {!isLoadingSuggestions && !suggestionsError && suggestions.length === 0 && taskName && taskName.length >= 3 && (
              <div className="text-sm text-gray-500 text-center py-4">
                Không có gợi ý phù hợp. Vui lòng chọn thủ công.
              </div>
            )}

            {(!taskName || taskName.length < 3) && !isLoadingSuggestions && (
              <div className="text-sm text-gray-500 text-center py-4">
                Nhập tên task (ít nhất 3 ký tự) để nhận gợi ý AI.
              </div>
            )}

            {!isLoadingSuggestions && suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] text-gray-500">
                  Điểm bên phải là mức độ phù hợp của từng người với task này, không phải tỷ lệ chia 100%.
                </p>
                {suggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.nguoi_dung_id}
                    onClick={() => handleSelectSuggestion(suggestion.nguoi_dung_id)}
                    className={`flex items-start gap-3 p-3 bg-white rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                      selectedFromAI === suggestion.nguoi_dung_id
                        ? 'border-[#b9ff66] bg-[#b9ff66]/5'
                        : 'border-transparent hover:border-gray-200'
                    }`}
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>

                    <Avatar className="w-10 h-10">
                      <AvatarImage src={suggestion.user?.avatar_url || ''} />
                      <AvatarFallback>
                        {getInitials(suggestion.user?.ten || 'U')}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {suggestion.user?.ten || 'Unknown'}
                        </span>
                        {getCapacityBadge(suggestion.user?.load_status) && (
                          <Badge className={getCapacityBadge(suggestion.user?.load_status)?.className}>
                            {getCapacityBadge(suggestion.user?.load_status)?.label}
                          </Badge>
                        )}
                        {selectedFromAI === suggestion.nguoi_dung_id && (
                          <Check className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                        {suggestion.ly_do?.chinh || 'Phù hợp với task'}
                      </p>
                      {suggestion.user?.so_task_dang_lam !== undefined && (
                        <p className="mt-1 text-[11px] text-gray-500">
                          Đang mở {suggestion.user.so_task_dang_lam} task
                        </p>
                      )}
                      {suggestion.ly_do?.ky_nang_phu_hop?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {suggestion.ly_do.ky_nang_phu_hop.slice(0, 3).map((skill) => (
                            <Badge
                              key={skill}
                              variant="outline"
                              className="text-xs px-1.5 py-0"
                            >
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <Badge
                      className={`flex-shrink-0 whitespace-nowrap ${getScoreColor(suggestion.diem_phu_hop)}`}
                    >
                      {Math.round(suggestion.diem_phu_hop)} điểm
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowManualSelect(!showManualSelect)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <User className="w-4 h-4" />
                <span>Chọn thủ công</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showManualSelect ? 'rotate-180' : ''}`}
                />
              </button>

              {showManualSelect && (
                <div className="mt-2">
                  <Select
                    value={selectedAssignee}
                    onValueChange={(value) => {
                      setSelectedAssignee(value);
                      setSelectedFromAI(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn người thực hiện" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Chưa phân công</SelectItem>
                      {manualCandidates.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.ten}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedAssignee !== 'unassigned' && (() => {
                    const selectedCandidate = manualCandidates.find((candidate) => candidate.id === selectedAssignee);
                    const capacity = getCapacityBadge(selectedCandidate?.load_status);

                    if (!selectedCandidate || !capacity) {
                      return null;
                    }

                    return (
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                        <Badge className={capacity.className}>{capacity.label}</Badge>
                        <span>{selectedCandidate.so_task_dang_lam || 0} task đang mở</span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            </div>
          ) : (
            <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
              <div>
                <Label className="text-sm font-semibold">Người thực hiện</Label>
                <p className="mt-1 text-xs text-gray-500">
                  Bạn có thể tự nhận task này hoặc để trống để xử lý sau.
                </p>
              </div>

              <Select
                value={selectedAssignee}
                onValueChange={(value) => {
                  setSelectedAssignee(value);
                  setSelectedFromAI(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn người thực hiện" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Chưa phân công</SelectItem>
                  {selfAssignCandidates.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.ten}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedAssignee !== 'unassigned' && (
            <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700">
                Đã chọn:{' '}
                <strong>
                  {suggestions.find((s) => s.nguoi_dung_id === selectedAssignee)?.user?.ten ||
                    selfAssignCandidates.find((c) => c.id === selectedAssignee)?.ten ||
                    manualCandidates.find((c) => c.id === selectedAssignee)?.ten ||
                    'Unknown'}
                </strong>
                {selectedFromAI && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    Gợi ý AI
                  </Badge>
                )}
              </span>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={createTaskMutation.isPending}>
              {createTaskMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Đang tạo...
                </>
              ) : (
                'Tạo Task'
              )}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}




