import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
  ngay_tao: string;
  cap_nhat_cuoi: string;
  deleted_at: string | null;
  nguoi_dung?: {
    id: string;
    ten: string;
    email: string;
    avatar_url: string | null;
  };
  phan_du_an?: {
    id: string;
    ten: string;
    du_an_id: string;
  };
}

export interface CreateTaskInput {
  ten: string;
  mo_ta?: string;
  deadline: string;
  phan_du_an_id: string;
  assignee_id?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface UpdateTaskInput {
  id: string;
  ten?: string;
  mo_ta?: string;
  deadline?: string;
  assignee_id?: string;
  trang_thai?: 'todo' | 'in-progress' | 'done';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  progress?: number;
}

interface TasksParams {
  page?: number;
  trangThai?: string;
  assigneeId?: string;
  deadline?: string;
}

// Fetch all tasks
export function useTasks(params?: TasksParams) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.trangThai) searchParams.set('trangThai', params.trangThai);
      if (params?.assigneeId) searchParams.set('assigneeId', params.assigneeId);
      if (params?.deadline) searchParams.set('deadline', params.deadline);

      const response = await fetch(`/api/tasks?${searchParams}`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const result = await response.json();
      // API returns { data, pagination }, extract the array
      return result.data || [];
    },
  });
}

// Fetch single task
export function useTask(id: string) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${id}`);
      if (!response.ok) throw new Error('Failed to fetch task');
      return response.json() as Promise<Task>;
    },
    enabled: !!id,
  });
}

// Create task mutation
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
        console.error('Create task error:', errorData);
        // Handle Zod validation errors (array format)
        if (Array.isArray(errorData.error)) {
          const messages = errorData.error.map((e: { path?: string[], message?: string }) =>
            `${e.path?.join('.') || 'field'}: ${e.message || 'invalid'}`
          ).join(', ');
          throw new Error(messages);
        }
        throw new Error(errorData.error || 'Failed to create task');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// Update task mutation - now takes input with id included
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
      if (!response.ok) throw new Error('Failed to update task');
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.id] });
    },
  });
}

// Delete task mutation
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
