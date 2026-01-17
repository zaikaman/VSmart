import { useQuery } from '@tanstack/react-query';

export interface User {
    id: string;
    ten: string;
    email: string;
    avatar_url: string | null;
    vai_tro: 'admin' | 'quan_ly' | 'nhan_vien';
    phong_ban_id: string | null;
    project_role?: 'admin' | 'member'; // Vai trò trong dự án cụ thể
}

// Fetch danh sách người dùng (có thể lọc theo projectId)
export function useUsers(projectId?: string) {
    return useQuery({
        queryKey: ['users', projectId],
        queryFn: async () => {
            const url = projectId 
                ? `/api/users?projectId=${projectId}` 
                : '/api/users';
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch users');
            const result = await response.json();
            return result.data as User[];
        },
    });
}
