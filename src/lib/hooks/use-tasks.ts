import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface TaskPermissions {
  canAssign: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canSubmitReview: boolean;
  canApprove: boolean;
  canReject: boolean;
}

export interface Task {
  id: string;
  ten: string;
  mo_ta: string | null;
  deadline: string;
  phan_du_an_id: string;
  assignee_id: string | null;
  trang_thai: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  progress: number;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  risk_updated_at: string | null;
  is_stale: boolean;
  progress_mode?: 'manual' | 'checklist';
  template_id?: string | null;
  recurring_rule_id?: string | null;
  review_status?: 'draft' | 'pending_review' | 'approved' | 'changes_requested';
  submitted_for_review_at?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_comment?: string | null;
  ngay_tao: string;
  cap_nhat_cuoi: string;
  deleted_at: string | null;
  permissions?: TaskPermissions;
  nguoi_dung?: {
    id: string;
    ten: string;
    email: string;
    avatar_url: string | null;
  };
  reviewer?: {
    id: string;
    ten: string;
    email: string;
    avatar_url: string | null;
  } | null;
  phan_du_an?: {
    id: string;
    ten: string;
    du_an_id: string;
    du_an?: {
      ten: string;
    } | null;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedTasksResponse {
  data: Task[];
  pagination: PaginationMeta;
}

export interface CreateTaskInput {
  ten: string;
  mo_ta?: string;
  deadline: string;
  phan_du_an_id: string;
  assignee_id?: string;
  trang_thai?: 'todo' | 'in-progress' | 'done';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  checklist_items?: Array<{
    title: string;
    is_done?: boolean;
    sort_order?: number;
  }>;
  template_id?: string | null;
  progress_mode?: 'manual' | 'checklist';
}

export interface UpdateTaskInput {
  id: string;
  ten?: string;
  mo_ta?: string;
  deadline?: string;
  assignee_id?: string | null;
  trang_thai?: 'todo' | 'in-progress' | 'done';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  progress?: number;
  progress_mode?: 'manual' | 'checklist';
}

interface TasksParams {
  page?: number;
  limit?: number;
  trangThai?: string;
  assigneeId?: string;
  deadline?: string;
  duAnId?: string;
  phanDuAnId?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  riskScoreMin?: number;
  reviewStatus?: 'draft' | 'pending_review' | 'approved' | 'changes_requested';
  isStale?: boolean;
  viewMode?: 'default' | 'kanban';
}

export function useTasks(params?: TasksParams) {
  const normalizedParams = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 10,
    trangThai: params?.trangThai ?? null,
    assigneeId: params?.assigneeId ?? null,
    deadline: params?.deadline ?? null,
    duAnId: params?.duAnId ?? null,
    phanDuAnId: params?.phanDuAnId ?? null,
    riskLevel: params?.riskLevel ?? null,
    riskScoreMin: params?.riskScoreMin ?? null,
    reviewStatus: params?.reviewStatus ?? null,
    isStale: params?.isStale ?? false,
    viewMode: params?.viewMode ?? 'default',
  };

  return useQuery<PaginatedTasksResponse>({
    queryKey: ['tasks', normalizedParams],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        page: normalizedParams.page.toString(),
        limit: normalizedParams.limit.toString(),
      });

      if (normalizedParams.trangThai) searchParams.set('trangThai', normalizedParams.trangThai);
      if (normalizedParams.assigneeId) searchParams.set('assigneeId', normalizedParams.assigneeId);
      if (normalizedParams.deadline) searchParams.set('deadline', normalizedParams.deadline);
      if (normalizedParams.duAnId) searchParams.set('duAnId', normalizedParams.duAnId);
      if (normalizedParams.phanDuAnId) searchParams.set('phanDuAnId', normalizedParams.phanDuAnId);
      if (normalizedParams.riskLevel) searchParams.set('riskLevel', normalizedParams.riskLevel);
      if (normalizedParams.riskScoreMin !== null) {
        searchParams.set('riskScoreMin', normalizedParams.riskScoreMin.toString());
      }
      if (normalizedParams.reviewStatus) searchParams.set('reviewStatus', normalizedParams.reviewStatus);
      if (normalizedParams.isStale) searchParams.set('isStale', 'true');
      if (normalizedParams.viewMode !== 'default') searchParams.set('viewMode', normalizedParams.viewMode);

      const response = await fetch(`/api/tasks?${searchParams.toString()}`);
      if (!response.ok) throw new Error('Không thể tải danh sách task');
      return response.json() as Promise<PaginatedTasksResponse>;
    },
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: false,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${id}`);
      if (!response.ok) throw new Error('Không thể tải task');
      return response.json() as Promise<Task>;
    },
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (Array.isArray(errorData.error)) {
          const messages = errorData.error
            .map((error: { path?: string[]; message?: string }) => {
              const field = error.path?.join('.') || 'field';
              return `${field}: ${error.message || 'invalid'}`;
            })
            .join(', ');
          throw new Error(messages);
        }
        throw new Error(errorData.error || 'Không thể tạo task');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTaskInput) => {
      const { id, ...updateData } = input;
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Không thể cập nhật task');
      }
      return response.json() as Promise<Task>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.id] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Không thể xóa task');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
