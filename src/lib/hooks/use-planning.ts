import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface PlanningCalendarParams {
  projectId?: string;
  assigneeId?: string;
  dateFrom: string;
  dateTo: string;
  enabled?: boolean;
}

interface PlanningWorkloadParams {
  projectId?: string;
  assigneeId?: string;
  enabled?: boolean;
}

export interface PlanningTaskItem {
  id: string;
  ten: string;
  mo_ta: string | null;
  deadline: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  trang_thai: 'todo' | 'in-progress' | 'done';
  progress: number;
  risk_score: number;
  assignee_id: string | null;
  assignee: {
    id: string;
    ten: string;
    email: string;
    avatar_url: string | null;
  } | null;
  project: {
    id: string;
    ten: string;
  } | null;
  part: {
    id: string;
    ten: string;
  } | null;
  department: {
    id: string;
    ten: string;
  } | null;
}

export interface PlanningCalendarResponse {
  range: {
    dateFrom: string;
    dateTo: string;
  };
  items: PlanningTaskItem[];
  summary: {
    totalTasks: number;
    overdueTasks: number;
    upcomingTasks: number;
    highRiskTasks: number;
  };
}

export interface WorkloadMemberSummary {
  userId: string;
  ten: string;
  email: string;
  avatarUrl: string | null;
  projectRole: string;
  departmentName: string | null;
  activeTasks: number;
  overdueTasks: number;
  dueSoonTasks: number;
  highRiskTasks: number;
  loadPoints: number;
  capacityPoints: number;
  loadRatio: number;
  loadStatus: 'available' | 'balanced' | 'stretched' | 'overloaded';
  tasks: PlanningTaskItem[];
}

export interface PlanningWorkloadResponse {
  summary: {
    totalMembers: number;
    overloadedMembers: number;
    stretchedMembers: number;
    availableMembers: number;
    totalActiveTasks: number;
    avgLoadRatio: number;
    overloadThreshold: number;
  };
  members: WorkloadMemberSummary[];
}

export interface ProjectForecastResponse {
  project: {
    id: string;
    ten: string;
    deadline: string;
    trang_thai: string;
    phan_tram_hoan_thanh: number;
  };
  forecastStatus: 'on-track' | 'watch' | 'slipping';
  slipProbability: number;
  projectedDelayDays: number;
  confidence: number;
  summary: {
    totalTasks: number;
    openTasks: number;
    doneTasks: number;
    overdueTasks: number;
    highRiskTasks: number;
    unassignedTasks: number;
    dueThisWeek: number;
    overloadedMembers: number;
    completionRate: number;
  };
  reasons: string[];
  topRisks: PlanningTaskItem[];
  overloadedMembers: WorkloadMemberSummary[];
}

export function usePlanningCalendar(params: PlanningCalendarParams) {
  return useQuery({
    queryKey: ['planning-calendar', params.projectId, params.assigneeId, params.dateFrom, params.dateTo],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      });

      if (params.projectId) {
        searchParams.set('projectId', params.projectId);
      }

      if (params.assigneeId) {
        searchParams.set('assigneeId', params.assigneeId);
      }

      const response = await fetch(`/api/planning/calendar?${searchParams.toString()}`);
      if (!response.ok) {
        throw new Error('Không thể tải lịch planning');
      }

      const result = await response.json();
      return result.data as PlanningCalendarResponse;
    },
    enabled: params.enabled ?? true,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function usePlanningWorkload(params: PlanningWorkloadParams = {}) {
  return useQuery({
    queryKey: ['planning-workload', params.projectId, params.assigneeId],
    queryFn: async () => {
      const searchParams = new URLSearchParams();

      if (params.projectId) {
        searchParams.set('projectId', params.projectId);
      }

      if (params.assigneeId) {
        searchParams.set('assigneeId', params.assigneeId);
      }

      const queryString = searchParams.toString();
      const response = await fetch(
        queryString ? `/api/planning/workload?${queryString}` : '/api/planning/workload'
      );

      if (!response.ok) {
        throw new Error('Không thể tải workload');
      }

      const result = await response.json();
      return result.data as PlanningWorkloadResponse;
    },
    enabled: params.enabled ?? true,
    staleTime: 45 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useProjectForecast(projectId?: string, enabled = true) {
  return useQuery({
    queryKey: ['project-forecast', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/forecast`);
      if (!response.ok) {
        throw new Error('Không thể tải dự báo dự án');
      }

      const result = await response.json();
      return result.data as ProjectForecastResponse;
    },
    enabled: Boolean(projectId) && enabled,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useRescheduleTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      deadline,
      reason,
    }: {
      taskId: string;
      deadline: string;
      reason?: string;
    }) => {
      const response = await fetch(`/api/tasks/${taskId}/reschedule`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deadline, reason }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Không thể dời lịch task');
      }

      return response.json() as Promise<{
        data: {
          id: string;
          deadline: string;
        };
        warnings?: string[];
        message?: string;
      }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['planning-workload'] });
      queryClient.invalidateQueries({ queryKey: ['project-forecast'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
