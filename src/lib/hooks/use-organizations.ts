import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Organization } from '@/app/api/organizations/route';

// Lấy thông tin organization của user hiện tại
export function useOrganization() {
  return useQuery({
    queryKey: ['organization'],
    queryFn: async () => {
      const response = await fetch('/api/organizations');
      if (!response.ok) {
        if (response.status === 404) {
          return null; // User chưa có organization
        }
        throw new Error('Không thể lấy thông tin tổ chức');
      }
      return response.json() as Promise<Organization>;
    },
  });
}

// Tạo organization mới
export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { ten: string; mo_ta?: string; logo_url?: string }) => {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Không thể tạo tổ chức');
      }
      return response.json() as Promise<Organization>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
  });
}

// Cập nhật organization
export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { ten?: string; mo_ta?: string; logo_url?: string }) => {
      const response = await fetch('/api/organizations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Không thể cập nhật tổ chức');
      }
      return response.json() as Promise<Organization>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
  });
}
