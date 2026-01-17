import { useQuery } from '@tanstack/react-query';

export interface User {
    id: string;
    ten: string;
    email: string;
    avatar_url: string | null;
    vai_tro: 'admin' | 'quan_ly' | 'nhan_vien';
    phong_ban_id: string | null;
}

// Fetch danh sách người dùng
export function useUsers() {
    return useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const response = await fetch('/api/users');
            if (!response.ok) throw new Error('Failed to fetch users');
            const result = await response.json();
            return result.data as User[];
        },
    });
}
