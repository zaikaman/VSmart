import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface ProjectPart {
    id: string;
    ten: string;
    mo_ta: string | null;
    deadline: string;
    du_an_id: string;
    phong_ban_id: string;
    trang_thai: 'todo' | 'in-progress' | 'done';
    phan_tram_hoan_thanh: number;
    ngay_tao: string;
    cap_nhat_cuoi: string;
    phong_ban?: {
        id: string;
        ten: string;
    };
}

export interface CreateProjectPartInput {
    ten: string;
    mo_ta?: string;
    deadline: string;
    phong_ban_id: string;
}

// Fetch danh sách phần dự án theo dự án
export function useProjectParts(projectId: string) {
    return useQuery({
        queryKey: ['project-parts', projectId],
        queryFn: async () => {
            const response = await fetch(`/api/project-parts?duAnId=${projectId}`);
            if (!response.ok) throw new Error('Failed to fetch project parts');
            const result = await response.json();
            return result.data as ProjectPart[];
        },
        enabled: !!projectId,
    });
}

// Tạo phần dự án mới
export function useCreateProjectPart(projectId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreateProjectPartInput) => {
            const response = await fetch(`/api/projects/${projectId}/parts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(input),
            });
            if (!response.ok) throw new Error('Failed to create project part');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project-parts', projectId] });
            queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
        },
    });
}
