import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Organization } from '@/app/api/organizations/route';
import type {
  OrganizationMember,
  OrganizationMembersResponse,
} from '@/app/api/organization-members/route';
import type {
  MyOrganizationInvitation,
} from '@/app/api/organization-members/invitations/route';
import type {
  OrganizationInvitation,
} from '@/app/api/organization-members/invitations/manage/route';
import type {
  DiscoverableOrganization,
} from '@/app/api/organization-join-requests/discover/route';
import type {
  MyOrganizationJoinRequest,
} from '@/app/api/organization-join-requests/route';
import type {
  OrganizationJoinRequest,
} from '@/app/api/organization-join-requests/manage/route';

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
    mutationFn: async (data: { ten: string; mo_ta?: string; logo_url?: string; settings?: Partial<Organization['settings']> }) => {
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
      queryClient.invalidateQueries({ queryKey: ['my-organization-join-requests'] });
      queryClient.invalidateQueries({ queryKey: ['discover-organizations'] });
    },
  });
}

// Cập nhật organization
export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { ten?: string; mo_ta?: string; logo_url?: string; settings?: Partial<Organization['settings']> }) => {
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
    mutationFn: async (data: {
      user_id: string;
      vai_tro?: OrganizationMember['vai_tro'];
      phong_ban_id?: string | null;
    }) => {
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
      queryClient.invalidateQueries({ queryKey: ['phong-ban'] });
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

export function useOrganizationInvitations() {
  return useQuery({
    queryKey: ['organization-invitations', 'manage'],
    queryFn: async () => {
      const response = await fetch('/api/organization-members/invitations/manage');
      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }

        throw new Error('Không thể tải danh sách lời mời tổ chức');
      }

      return response.json() as Promise<OrganizationInvitation[]>;
    },
  });
}

export function useInviteOrganizationMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { email: string; vai_tro: OrganizationInvitation['vai_tro'] }) => {
      const response = await fetch('/api/organization-members/invitations/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Không thể gửi lời mời tổ chức');
      }

      return response.json() as Promise<{ data: OrganizationInvitation }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-invitations', 'manage'] });
      queryClient.invalidateQueries({ queryKey: ['my-organization-invitations'] });
    },
  });
}

export function useMyOrganizationInvitations() {
  return useQuery({
    queryKey: ['my-organization-invitations'],
    queryFn: async () => {
      const response = await fetch('/api/organization-members/invitations');
      if (!response.ok) {
        throw new Error('Không thể tải lời mời tổ chức');
      }

      return response.json() as Promise<MyOrganizationInvitation[]>;
    },
  });
}

export function useRespondOrganizationInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { invitation_id: string; action: 'accept' | 'decline' }) => {
      const response = await fetch('/api/organization-members/invitations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Không thể xử lý lời mời tổ chức');
      }

      return payload as { message: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-organization-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-current-user'] });
      queryClient.invalidateQueries({ queryKey: ['settings-current-user'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-user'] });
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      queryClient.invalidateQueries({ queryKey: ['my-organization-join-requests'] });
      queryClient.invalidateQueries({ queryKey: ['discover-organizations'] });
    },
  });
}

export function useDiscoverOrganizations(query?: string) {
  return useQuery({
    queryKey: ['discover-organizations', query || ''],
    queryFn: async () => {
      const searchParams = new URLSearchParams();

      if (query?.trim()) {
        searchParams.set('q', query.trim());
      }

      const response = await fetch(`/api/organization-join-requests/discover?${searchParams.toString()}`);
      if (!response.ok) {
        throw new Error('Không thể tải danh sách tổ chức');
      }

      return response.json() as Promise<DiscoverableOrganization[]>;
    },
  });
}

export function useMyOrganizationJoinRequests() {
  return useQuery({
    queryKey: ['my-organization-join-requests'],
    queryFn: async () => {
      const response = await fetch('/api/organization-join-requests');
      if (!response.ok) {
        throw new Error('Không thể tải yêu cầu gia nhập');
      }

      return response.json() as Promise<MyOrganizationJoinRequest[]>;
    },
  });
}

export function useCreateOrganizationJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { to_chuc_id: string }) => {
      const response = await fetch('/api/organization-join-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Không thể gửi yêu cầu gia nhập');
      }

      return payload as { data: MyOrganizationJoinRequest };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-organization-join-requests'] });
      queryClient.invalidateQueries({ queryKey: ['discover-organizations'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useCancelOrganizationJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { request_id: string; action: 'cancel' }) => {
      const response = await fetch('/api/organization-join-requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Không thể rút yêu cầu gia nhập');
      }

      return payload as { message: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-organization-join-requests'] });
      queryClient.invalidateQueries({ queryKey: ['discover-organizations'] });
    },
  });
}

export function useOrganizationJoinRequests() {
  return useQuery({
    queryKey: ['organization-join-requests', 'manage'],
    queryFn: async () => {
      const response = await fetch('/api/organization-join-requests/manage');
      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }

        throw new Error('Không thể tải yêu cầu gia nhập tổ chức');
      }

      return response.json() as Promise<OrganizationJoinRequest[]>;
    },
  });
}

export function useRespondOrganizationJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { request_id: string; action: 'approve' | 'reject' }) => {
      const response = await fetch('/api/organization-join-requests/manage', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Không thể xử lý yêu cầu gia nhập');
      }

      return payload as { message: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-join-requests', 'manage'] });
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['my-organization-join-requests'] });
    },
  });
}
