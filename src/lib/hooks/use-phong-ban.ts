import { useQuery } from '@tanstack/react-query';

export interface PhongBan {
    id: string;
    ten: string;
    mo_ta: string | null;
    ngay_tao: string;
    cap_nhat_cuoi: string;
}

// Fetch danh sách phòng ban
export function usePhongBan() {
    return useQuery({
        queryKey: ['phong-ban'],
        queryFn: async () => {
            const response = await fetch('/api/phong-ban');
            if (!response.ok) throw new Error('Failed to fetch phong ban');
            const result = await response.json();
            return result.data as PhongBan[];
        },
    });
}
