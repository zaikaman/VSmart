import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Project {
  id: string;
  ten: string;
  mo_ta: string | null;
  deadline: string;
  trang_thai: 'todo' | 'in-progress' | 'done';
  nguoi_tao_id: string;
  phan_tram_hoan_thanh: number;
  ngay_tao: string;
  cap_nhat_cuoi: string;
  phan_du_an?: ProjectPart[];
}

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
}

export interface CreateProjectInput {
  ten: string;
  mo_ta?: string;
  deadline: string;
}

export interface UpdateProjectInput {
  ten?: string;
  mo_ta?: string;
  deadline?: string;
  trang_thai?: 'todo' | 'in-progress' | 'done';
  phan_tram_hoan_thanh?: number;
}

// Fetch all projects
export function useProjects(params?: { page?: number; limit?: number; trangThai?: string }) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.trangThai) searchParams.set('trangThai', params.trangThai);

      const response = await fetch(`/api/projects?${searchParams}`);
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    },
  });
}

// Fetch single project
export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${id}`);
      if (!response.ok) throw new Error('Failed to fetch project');
      return response.json() as Promise<Project>;
    },
    enabled: !!id,
  });
}

// Create project mutation
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error('Failed to create project');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// Update project mutation
export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProjectInput) => {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error('Failed to update project');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects', id] });
    },
  });
}

// Delete project mutation
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete project');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
