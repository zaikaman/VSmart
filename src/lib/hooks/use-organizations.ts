import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Organization } from '@/app/api/organizations/route';
import type {
  OrganizationMember,
  OrganizationMembersResponse,
} from '@/app/api/organization-members/route';

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
    mutationFn: async (data: { ten: string; mo_ta?: string; logo_url?: string; settings?: Organization['settings'] }) => {
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
      queryClient.invalidateQueries({ queryKey: ['dashboard-current-user'] });
      queryClient.invalidateQueries({ queryKey: ['settings-current-user'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-user'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// Cập nhật organization
export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { ten?: string; mo_ta?: string; logo_url?: string; settings?: Organization['settings'] }) => {
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
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    },
  });
}

export function useOrganizationMembers() {
  return useQuery({
    queryKey: ['organization-members'],
    queryFn: async () => {
      const response = await fetch('/api/organization-members');
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }

        throw new Error('KhÃ´ng thá»ƒ láº¥y danh sÃ¡ch thÃ nh viÃªn tá»• chá»©c');
      }

      return response.json() as Promise<OrganizationMembersResponse>;
    },
  });
}

export function useUpdateOrganizationMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['update-organization-role'],
    mutationFn: async (data: { user_id: string; vai_tro: OrganizationMember['vai_tro'] }) => {
      const response = await fetch('/api/organization-members', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'KhÃ´ng thá»ƒ cáº­p nháº­t role tá»• chá»©c');
      }

      return response.json() as Promise<{ data: OrganizationMember }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-current-user'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-current-user'] });
      queryClient.invalidateQueries({ queryKey: ['reviews-current-user'] });
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
