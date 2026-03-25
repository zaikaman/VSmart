import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface ProjectPermissions {
  canManageProject: boolean;
  canDeleteProject: boolean;
  canManageMembers: boolean;
  canCreateTasks: boolean;
  canViewAnalytics: boolean;
}

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
  current_membership_role?: 'owner' | 'admin' | 'member' | 'viewer' | null;
  permissions?: ProjectPermissions;
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

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedProjectsResponse {
  data: Project[];
  pagination: PaginationMeta;
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

interface ProjectsParams {
  page?: number;
  limit?: number;
  trangThai?: string;
}

interface DeleteProjectResponse {
  message: string;
  data: Project;
}

function updateProjectListsAfterDelete(
  queryClient: ReturnType<typeof useQueryClient>,
  deletedProjectId: string
) {
  const projectQueries = queryClient.getQueriesData<PaginatedProjectsResponse>({
    queryKey: ['projects'],
  });

  projectQueries.forEach(([queryKey, cachedData]) => {
    if (!cachedData?.data || !Array.isArray(cachedData.data)) {
      return;
    }

    const nextProjects = cachedData.data.filter(project => project.id !== deletedProjectId);

    if (nextProjects.length === cachedData.data.length) {
      return;
    }

    const removedCount = cachedData.data.length - nextProjects.length;
    const total = Math.max(0, cachedData.pagination.total - removedCount);
    const totalPages = total === 0 ? 0 : Math.ceil(total / cachedData.pagination.limit);

    queryClient.setQueryData<PaginatedProjectsResponse>(queryKey, {
      ...cachedData,
      data: nextProjects,
      pagination: {
        ...cachedData.pagination,
        total,
        totalPages,
      },
    });
  });
}

async function getApiErrorMessage(response: Response, fallback: string) {
  const error = await response.json().catch(() => ({}) as { error?: unknown });

  if (typeof error.error === 'string' && error.error.trim()) {
    return error.error;
  }

  return fallback;
}

export function useProjects(params?: ProjectsParams) {
  const normalizedParams = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 10,
    trangThai: params?.trangThai ?? null,
  };

  return useQuery<PaginatedProjectsResponse>({
    queryKey: ['projects', normalizedParams],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        page: normalizedParams.page.toString(),
        limit: normalizedParams.limit.toString(),
      });

      if (normalizedParams.trangThai) {
        searchParams.set('trangThai', normalizedParams.trangThai);
      }

      const response = await fetch(`/api/projects?${searchParams.toString()}`);
      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, 'Không thể tải danh sách dự án.'));
      }
      return response.json() as Promise<PaginatedProjectsResponse>;
    },
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${id}`);
      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, 'Không thể tải dự án.'));
      }
      return response.json() as Promise<Project>;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, 'Không thể tạo dự án.'));
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProjectInput) => {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, 'Không thể cập nhật dự án.'));
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects', id] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, 'Không thể xóa dự án.'));
      }

      return response.json() as Promise<DeleteProjectResponse>;
    },
    onMutate: async (deletedProjectId: string) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] });

      const previousProjectLists = queryClient.getQueriesData<PaginatedProjectsResponse>({
        queryKey: ['projects'],
      });
      const previousProjectDetail = queryClient.getQueryData<Project>(['projects', deletedProjectId]);

      updateProjectListsAfterDelete(queryClient, deletedProjectId);
      queryClient.removeQueries({ queryKey: ['projects', deletedProjectId] });

      return {
        deletedProjectId,
        previousProjectLists,
        previousProjectDetail,
      };
    },
    onError: (_error, _deletedProjectId, context) => {
      context?.previousProjectLists.forEach(([queryKey, cachedData]) => {
        queryClient.setQueryData(queryKey, cachedData);
      });

      if (context?.previousProjectDetail) {
        queryClient.setQueryData(['projects', context.deletedProjectId], context.previousProjectDetail);
      }
    },
    onSuccess: async (_result, deletedProjectId) => {
      queryClient.removeQueries({ queryKey: ['projects', deletedProjectId] });
      queryClient.removeQueries({ queryKey: ['project-parts', deletedProjectId] });
      queryClient.removeQueries({ queryKey: ['project-members', deletedProjectId] });
      queryClient.removeQueries({ queryKey: ['project-forecast', deletedProjectId] });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['projects'], refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: ['stats'] }),
        queryClient.invalidateQueries({ queryKey: ['planning-calendar'] }),
        queryClient.invalidateQueries({ queryKey: ['planning-workload'] }),
        queryClient.invalidateQueries({ queryKey: ['activity-feed'] }),
      ]);
    },
  });
}
