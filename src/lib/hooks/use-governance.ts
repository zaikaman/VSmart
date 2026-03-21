import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Task } from '@/lib/hooks/use-tasks';

export interface ActivityItem {
  id: string;
  entity_type: 'task' | 'project' | 'project_part' | 'comment' | 'review';
  entity_id: string;
  action: string;
  actor_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
  actor?: {
    id: string;
    ten: string;
    email: string;
    avatar_url: string | null;
  } | null;
}

export interface AnalyticsOverview {
  summary: {
    totalProjects: number;
    totalTasks: number;
    completionRate: number;
    overdueRate: number;
    averageLeadTimeDays: number;
    avgLoadRatio: number;
  };
  completionTrend: Array<{ label: string; completed: number }>;
  overdueTrend: Array<{ label: string; overdue: number }>;
  riskDistribution: Array<{ label: string; value: number; color: string }>;
  topOverloadedMembers: Array<{
    userId: string;
    ten: string;
    activeTasks: number;
    loadRatio: number;
    loadStatus: string;
  }>;
  projectHealth: Array<{
    id: string;
    ten: string;
    completionRate: number;
    overdueTasks: number;
    slipProbability: number;
    status: 'on-track' | 'watch' | 'slipping';
  }>;
}

export function useActivityFeed(params: {
  taskId?: string;
  projectId?: string;
  entityType?: string;
  enabled?: boolean;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['activity-feed', params.taskId, params.projectId, params.entityType, params.limit],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.taskId) searchParams.set('taskId', params.taskId);
      if (params.projectId) searchParams.set('projectId', params.projectId);
      if (params.entityType) searchParams.set('entityType', params.entityType);
      if (params.limit) searchParams.set('limit', String(params.limit));

      const response = await fetch(`/api/activity?${searchParams.toString()}`);
      if (!response.ok) {
        throw new Error('Không thể tải activity log');
      }
      const result = await response.json();
      return result.data as ActivityItem[];
    },
    enabled: params.enabled ?? true,
    staleTime: 20 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useReviewQueue(enabled = true) {
  return useQuery({
    queryKey: ['review-queue'],
    queryFn: async () => {
      const response = await fetch('/api/tasks?page=1&limit=50&reviewStatus=pending_review');
      if (!response.ok) {
        throw new Error('Không thể tải hàng chờ duyệt');
      }
      const result = await response.json();
      return result.data as Task[];
    },
    enabled,
    staleTime: 20 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 20 * 1000,
  });
}

function useReviewMutation(endpoint: 'submit-review' | 'approve' | 'reject') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      review_comment,
    }: {
      taskId: string;
      review_comment?: string;
    }) => {
      const response = await fetch(`/api/tasks/${taskId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_comment }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Không thể cập nhật trạng thái duyệt');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-overview'] });
    },
  });
}

export function useSubmitTaskForReview() {
  return useReviewMutation('submit-review');
}

export function useApproveTask() {
  return useReviewMutation('approve');
}

export function useRejectTask() {
  return useReviewMutation('reject');
}

export function useAnalyticsOverview(enabled = true) {
  return useQuery({
    queryKey: ['analytics-overview'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/overview');
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Không thể tải analytics');
      }
      const result = await response.json();
      return result.data as AnalyticsOverview;
    },
    enabled,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
