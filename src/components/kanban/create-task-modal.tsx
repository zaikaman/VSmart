'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sparkles, User, Check, ChevronDown, AlertCircle, Loader2 } from 'lucide-react';

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
  };
}

interface Candidate {
  id: string;
  ten: string;
  email: string;
  avatar_url?: string;
}

interface SuggestAssigneeResponse {
  suggestions: AISuggestion[];
  all_candidates: Candidate[];
  latency_ms: number;
  model: string;
  error?: string;
}

export function CreateTaskModal({
  open,
  onOpenChange,
  initialStatus = 'todo',
  phanDuAnId,
  phanDuAnName,
  projectId
}: CreateTaskModalProps) {
  const createTaskMutation = useCreateTask();
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<TaskFormData>({
    defaultValues: {
      trang_thai: initialStatus,
      priority: 'medium',
    },
  });

  // AI Suggestions state
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [suggestionModel, setSuggestionModel] = useState<string>('');

  // Selection state
  const [selectedAssignee, setSelectedAssignee] = useState<string>('unassigned');
  const [selectedPriority, setSelectedPriority] = useState<string>('medium');
  const [showManualSelect, setShowManualSelect] = useState(false);
  const [selectedFromAI, setSelectedFromAI] = useState<string | null>(null);

  // Watch form values for AI suggestions
  const taskName = watch('ten');
  const taskDescription = watch('mo_ta');
  const taskDeadline = watch('deadline');

  // Debounce timeout ref
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Fetch AI suggestions
  const fetchSuggestions = useCallback(async () => {
    if (!taskName || taskName.length < 3 || !phanDuAnId) {
      setSuggestions([]);
      return;
    }

    setIsLoadingSuggestions(true);
    setSuggestionsError(null);

    try {
      const response = await fetch('/api/ai/suggest-assignee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ten: taskName,
          mo_ta: taskDescription || '',
          priority: selectedPriority,
          deadline: taskDeadline 
            ? new Date(taskDeadline).toISOString()
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          phan_du_an_id: phanDuAnId,
        }),
      });

      if (!response.ok) {
        throw new Error('Không thể lấy gợi ý từ AI');
      }

      const data: SuggestAssigneeResponse = await response.json();
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
  }, [taskName, taskDescription, selectedPriority, taskDeadline, phanDuAnId]);

  // Debounced fetch suggestions
  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    if (taskName && taskName.length >= 3 && phanDuAnId) {
      const timer = setTimeout(() => {
        fetchSuggestions();
      }, 800);
      setDebounceTimer(timer);
    }

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskName, taskDescription, selectedPriority, taskDeadline, phanDuAnId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSuggestions([]);
      setAllCandidates([]);
      setSuggestionsError(null);
      setSelectedAssignee('unassigned');
      setSelectedFromAI(null);
      setShowManualSelect(false);
      setSelectedPriority('medium');
    }
  }, [open]);

  // Handle AI suggestion selection
  const handleSelectSuggestion = (userId: string) => {
    setSelectedAssignee(userId);
    setSelectedFromAI(userId);
    setShowManualSelect(false);
  };

  // Handle submit
  const onSubmit = async (data: TaskFormData) => {
    try {
      if (!phanDuAnId || phanDuAnId.trim() === '') {
        console.error('Lỗi: Chưa chọn phần dự án');
        return;
      }

      const taskInput: CreateTaskInput = {
        ten: data.ten,
        mo_ta: data.mo_ta,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : new Date().toISOString(),
        phan_du_an_id: phanDuAnId,
        priority: selectedPriority as 'low' | 'medium' | 'high' | 'urgent',
      };

      if (selectedAssignee !== 'unassigned') {
        taskInput.assignee_id = selectedAssignee;
      }

      const createdTask = await createTaskMutation.mutateAsync(taskInput);

      // Track AI suggestions nếu có
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

          console.log('[AI Tracking] Đã lưu suggestions cho task:', createdTask.id);
        } catch (trackError) {
          // Không block việc tạo task nếu tracking lỗi
          console.warn('Lỗi track AI suggestion:', trackError);
        }
      }

      reset();
      setSelectedAssignee('unassigned');
      setSelectedFromAI(null);
      setSelectedPriority('medium');
      onOpenChange(false);
    } catch (error) {
      console.error('Lỗi tạo task:', error);
    }
  };

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Tên Task */}
          <div>
            <Label htmlFor="ten">Tên Task *</Label>
            <Input
              id="ten"
              {...register('ten', { required: 'Vui lòng nhập tên task' })}
              placeholder="Ví dụ: Implement login API"
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

          {/* AI Suggestions Section */}
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
              {isLoadingSuggestions && (
                <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
              )}
            </div>

            {/* Loading State */}
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

            {/* Error State */}
            {suggestionsError && !isLoadingSuggestions && (
              <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span>{suggestionsError}</span>
              </div>
            )}

            {/* Empty State */}
            {!isLoadingSuggestions && !suggestionsError && suggestions.length === 0 && taskName && taskName.length >= 3 && (
              <div className="text-sm text-gray-500 text-center py-4">
                Không có gợi ý phù hợp. Vui lòng chọn thủ công.
              </div>
            )}

            {/* Hint when task name is too short */}
            {(!taskName || taskName.length < 3) && !isLoadingSuggestions && (
              <div className="text-sm text-gray-500 text-center py-4">
                Nhập tên task (ít nhất 3 ký tự) để nhận gợi ý AI.
              </div>
            )}

            {/* Suggestions List */}
            {!isLoadingSuggestions && suggestions.length > 0 && (
              <div className="space-y-2">
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
                    {/* Rank Badge */}
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>

                    {/* Avatar */}
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={suggestion.user?.avatar_url || ''} />
                      <AvatarFallback>
                        {getInitials(suggestion.user?.ten || 'U')}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {suggestion.user?.ten || 'Unknown'}
                        </span>
                        {selectedFromAI === suggestion.nguoi_dung_id && (
                          <Check className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                        {suggestion.ly_do?.chinh || 'Phù hợp với task'}
                      </p>
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

                    {/* Score */}
                    <Badge className={`flex-shrink-0 ${getScoreColor(suggestion.diem_phu_hop)}`}>
                      {Math.round(suggestion.diem_phu_hop)}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Manual Selection Toggle */}
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
                      {allCandidates.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-5 h-5">
                              <AvatarImage src={user.avatar_url || ''} />
                              <AvatarFallback className="text-xs">
                                {getInitials(user.ten)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{user.ten}</span>
                            <span className="text-gray-400">({user.email})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Selected Assignee Summary */}
          {selectedAssignee !== 'unassigned' && (
            <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700">
                Đã chọn:{' '}
                <strong>
                  {suggestions.find((s) => s.nguoi_dung_id === selectedAssignee)?.user?.ten ||
                    allCandidates.find((c) => c.id === selectedAssignee)?.ten ||
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
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                'Tạo Task'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
