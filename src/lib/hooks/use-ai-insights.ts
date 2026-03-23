import { useMutation, useQuery } from '@tanstack/react-query';

export interface DailySummaryData {
  result: {
    headline: string;
    tone: 'on-track' | 'watch' | 'critical';
    summary: string;
    top_risks: Array<{
      title: string;
      detail: string;
      severity: 'low' | 'medium' | 'high';
    }>;
    workload_alerts: Array<{
      member_name: string;
      detail: string;
      severity: 'medium' | 'high';
    }>;
    recommended_actions: string[];
    executive_brief: string[];
  };
  latency_ms: number;
  model: string;
  digest_key: string;
  error?: string;
}

export interface WeeklySummaryData {
  result: {
    headline: string;
    summary: string;
    wins: string[];
    watchouts: string[];
    next_focus: string[];
  };
  latency_ms: number;
  model: string;
  digest_key: string;
  error?: string;
}

export interface RebalanceData {
  result: {
    overview: string;
    suggestions: Array<{
      task_id: string;
      task_name: string;
      from_user_id: string;
      from_user_name: string;
      to_user_id: string;
      to_user_name: string;
      reason: string;
      impact: string;
      confidence: number;
    }>;
  };
  latency_ms: number;
  model: string;
  reference_id: string;
  error?: string;
}

export interface DeadlineReviewData {
  result: {
    is_reasonable: boolean;
    warning_level: 'none' | 'watch' | 'high';
    ly_do: string;
    goi_y: string[];
    suggested_deadline: string | null;
  };
  latency_ms: number;
  model: string;
  error?: string;
}

export interface MeetingSummaryData {
  result: {
    summary: string;
    decisions: string[];
    blockers: string[];
    action_items: Array<{
      title: string;
      owner: string | null;
      due_hint: string | null;
    }>;
    follow_ups: string[];
  };
  latency_ms: number;
  model: string;
  reference_id: string;
  error?: string;
}

export function useDailySummary(projectId?: string, enabled = true, refreshToken = 0) {
  return useQuery({
    queryKey: ['ai-daily-summary', projectId, refreshToken],
    queryFn: async () => {
      const response = await fetch('/api/ai/daily-summary', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        throw new Error('Không thể tải tóm tắt ngày');
      }

      const result = await response.json();
      return result.data as DailySummaryData;
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useWeeklySummary(projectId?: string, enabled = true, refreshToken = 0) {
  return useQuery({
    queryKey: ['ai-weekly-summary', projectId, refreshToken],
    queryFn: async () => {
      const response = await fetch('/api/ai/weekly-summary', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        throw new Error('Không thể tải tóm tắt tuần');
      }

      const result = await response.json();
      return result.data as WeeklySummaryData;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRebalanceSuggestions() {
  return useMutation({
    mutationFn: async ({ projectId }: { projectId?: string } = {}) => {
      const response = await fetch('/api/ai/rebalance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Không thể tạo gợi ý cân tải');
      }

      const result = await response.json();
      return result.data as RebalanceData;
    },
  });
}

export function useDeadlineReview() {
  return useMutation({
    mutationFn: async (payload: {
      ten: string;
      mo_ta?: string;
      priority: 'low' | 'medium' | 'high' | 'urgent';
      deadline: string;
      projectId?: string;
    }) => {
      const response = await fetch('/api/ai/deadline-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Không thể đánh giá deadline');
      }

      const result = await response.json();
      return result.data as DeadlineReviewData;
    },
  });
}

export function useMeetingSummary() {
  return useMutation({
    mutationFn: async (payload: { notes: string; projectId?: string; projectName?: string }) => {
      const response = await fetch('/api/ai/meeting-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Không thể tóm tắt cuộc họp');
      }

      const result = await response.json();
      return result.data as MeetingSummaryData;
    },
  });
}

export function useInsightFeedback() {
  return useMutation({
    mutationFn: async (payload: {
      insight_type:
        | 'daily_summary'
        | 'weekly_summary'
        | 'rebalance'
        | 'deadline_review'
        | 'meeting_summary'
        | 'team_digest';
      event_type: 'viewed' | 'accepted' | 'dismissed' | 'helpful' | 'not_helpful';
      reference_id?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const response = await fetch('/api/ai/insights-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Không thể lưu phản hồi insight');
      }

      return response.json();
    },
  });
}
