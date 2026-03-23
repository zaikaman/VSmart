import { useQuery } from '@tanstack/react-query';

export interface DashboardStats {
    totalProjects: number;
    inProgressTasks: number;
    totalUsers: number;
    overdueTasks: number;
    upcomingDeadlines: Array<{
        id: string;
        ten: string;
        deadline: string;
        projectName: string;
        assigneeName: string;
    }>;
    workloadSummary: {
        totalMembers: number;
        overloadedMembers: number;
        stretchedMembers: number;
        availableMembers: number;
        totalActiveTasks: number;
        avgLoadRatio: number;
        overloadThreshold: number;
    };
    riskTrends: {
        low: number;
        medium: number;
        high: number;
    };
    overloadedMembers: Array<{
        userId: string;
        ten: string;
        loadStatus: string;
        loadRatio: number;
        activeTasks: number;
    }>;
    riskyProjects: Array<{
        id: string;
        ten: string;
        forecastStatus: string;
        slipProbability: number;
    }>;
}

// Fetch thống kê dashboard
export function useStats(options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: ['stats'],
        queryFn: async () => {
            const response = await fetch('/api/stats');
            if (!response.ok) throw new Error('Failed to fetch stats');
            const result = await response.json();
            return result.data as DashboardStats;
        },
        enabled: options?.enabled ?? true,
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });
}
