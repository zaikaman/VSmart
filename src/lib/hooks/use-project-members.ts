import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ProjectMember } from '@/app/api/project-members/route';

// Lấy danh sách thành viên của dự án
export function useProjectMembers(projectId: string) {
  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/project-members?projectId=${projectId}`);
      if (!response.ok) {
        throw new Error('Không thể lấy danh sách thành viên');
      }
      return response.json() as Promise<ProjectMember[]>;
    },
    enabled: !!projectId,
  });
}

// Mời thành viên vào dự án
export function useInviteProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { du_an_id: string; email: string; vai_tro?: string }) => {
      const response = await fetch('/api/project-members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Không thể mời thành viên');
      }
      return response.json() as Promise<ProjectMember>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', variables.du_an_id] });
    },
  });
}

// Cập nhật thành viên (trạng thái hoặc vai trò)
export function useUpdateProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { member_id: string; trang_thai?: string; vai_tro?: string }) => {
      const response = await fetch('/api/project-members', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Không thể cập nhật thành viên');
      }
      return response.json() as Promise<ProjectMember>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', data.du_an_id] });
    },
  });
}

// Xóa thành viên khỏi dự án
export function useRemoveProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { member_id: string; project_id: string }) => {
      const response = await fetch(`/api/project-members?memberId=${data.member_id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Không thể xóa thành viên');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', variables.project_id] });
    },
  });
}
