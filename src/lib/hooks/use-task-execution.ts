import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface ChecklistItem {
  id: string;
  task_id: string;
  title: string;
  is_done: boolean;
  sort_order: number;
  ngay_tao: string;
  cap_nhat_cuoi: string;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_name: string;
  file_url: string;
  mime_type: string | null;
  size: number;
  cloudinary_public_id: string | null;
  uploaded_by: string | null;
  ngay_tao: string;
  nguoi_dung?: {
    id: string;
    ten: string;
    email: string;
    avatar_url: string | null;
  } | null;
}

export interface TaskTemplate {
  id: string;
  ten: string;
  mo_ta: string | null;
  default_priority: 'low' | 'medium' | 'high' | 'urgent';
  checklist_template: Array<{
    title: string;
    is_done?: boolean;
    sort_order?: number;
  }>;
  created_by: string;
  is_shared: boolean;
  ngay_tao: string;
  cap_nhat_cuoi: string;
}

export interface RecurringTaskRule {
  id: string;
  source_task_id: string | null;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  cron_expression: string;
  phan_du_an_id: string;
  assignee_id: string | null;
  template_id: string | null;
  checklist_template: Array<{
    title: string;
    is_done?: boolean;
    sort_order?: number;
  }>;
  next_run_at: string;
  is_active: boolean;
}

export interface ChecklistDraftItem {
  title: string;
  is_done?: boolean;
  sort_order?: number;
}

export function useTaskChecklist(taskId?: string, enabled = true) {
  return useQuery<{ data: ChecklistItem[] }>({
    queryKey: ['task-checklist', taskId],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/checklist`);
      if (!response.ok) {
        throw new Error('Failed to fetch checklist');
      }
      return response.json();
    },
    enabled: Boolean(taskId) && enabled,
    staleTime: 10 * 1000,
  });
}

export function useAddChecklistItems(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { title?: string; items?: ChecklistDraftItem[] }) => {
      const response = await fetch(`/api/tasks/${taskId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to add checklist item');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-checklist', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
    },
  });
}

export function useUpdateChecklistItem(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      checklistId,
      ...payload
    }: {
      checklistId: string;
      title?: string;
      is_done?: boolean;
      sort_order?: number;
    }) => {
      const response = await fetch(`/api/tasks/${taskId}/checklist/${checklistId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to update checklist item');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-checklist', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
    },
  });
}

export function useDeleteChecklistItem(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (checklistId: string) => {
      const response = await fetch(`/api/tasks/${taskId}/checklist/${checklistId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to delete checklist item');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-checklist', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
    },
  });
}

export function useTaskAttachments(taskId?: string, enabled = true) {
  return useQuery<{ data: TaskAttachment[] }>({
    queryKey: ['task-attachments', taskId],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/attachments`);
      if (!response.ok) {
        throw new Error('Failed to fetch attachments');
      }
      return response.json();
    },
    enabled: Boolean(taskId) && enabled,
    staleTime: 10 * 1000,
  });
}

export function useUploadTaskAttachment(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to upload attachment');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] });
    },
  });
}

export function useDeleteTaskAttachment(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attachmentId: string) => {
      const response = await fetch(`/api/tasks/${taskId}/attachments/${attachmentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to delete attachment');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] });
    },
  });
}

export function useTaskTemplates(enabled = true) {
  return useQuery<{ data: TaskTemplate[] }>({
    queryKey: ['task-templates'],
    queryFn: async () => {
      const response = await fetch('/api/task-templates');
      if (!response.ok) {
        throw new Error('Failed to fetch task templates');
      }
      return response.json();
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useCreateTaskTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      ten: string;
      mo_ta?: string;
      default_priority?: 'low' | 'medium' | 'high' | 'urgent';
      checklist_template?: ChecklistDraftItem[];
      is_shared?: boolean;
    }) => {
      const response = await fetch('/api/task-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to create template');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-templates'] });
    },
  });
}

export function useRecurringRule(taskId?: string, enabled = true) {
  return useQuery<{ data: RecurringTaskRule | null }>({
    queryKey: ['task-recurring-rule', taskId],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/recurring`);
      if (!response.ok) {
        throw new Error('Failed to fetch recurring rule');
      }
      return response.json();
    },
    enabled: Boolean(taskId) && enabled,
    staleTime: 10 * 1000,
  });
}

export function useSaveRecurringRule(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      cron_expression: string;
      title?: string;
      description?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      assignee_id?: string | null;
      checklist_template?: ChecklistDraftItem[];
      template_id?: string | null;
      is_active?: boolean;
    }) => {
      const response = await fetch(`/api/tasks/${taskId}/recurring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to save recurring rule');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-recurring-rule', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
    },
  });
}

export function useDeleteRecurringRule(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/recurring`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to delete recurring rule');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-recurring-rule', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
    },
  });
}

export function useBreakdownTask() {
  return useMutation({
    mutationFn: async (payload: {
      ten: string;
      mo_ta?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
    }) => {
      const response = await fetch('/api/ai/breakdown-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to generate checklist');
      }

      return response.json() as Promise<{
        checklist: ChecklistDraftItem[];
        latency_ms: number;
        model: string;
        error?: string;
      }>;
    },
  });
}
