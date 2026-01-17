import { useQuery } from '@tanstack/react-query';

export interface DashboardStats {
    totalProjects: number;
    inProgressTasks: number;
    totalUsers: number;
}

// Fetch thống kê dashboard
export function useStats() {
    return useQuery({
        queryKey: ['stats'],
        queryFn: async () => {
            const response = await fetch('/api/stats');
            if (!response.ok) throw new Error('Failed to fetch stats');
            const result = await response.json();
            return result.data as DashboardStats;
        },
    });
}
