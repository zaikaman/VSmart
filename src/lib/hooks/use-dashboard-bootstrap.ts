'use client';

import { useQuery } from '@tanstack/react-query';
import type { MyOrganizationInvitation } from '@/app/api/organization-members/invitations/route';
import type { Organization } from '@/app/api/organizations/route';
import type { CurrentUser } from '@/lib/hooks/use-current-user';
import type { Project } from '@/lib/hooks/use-projects';
import type { DashboardStats } from '@/lib/hooks/use-stats';

export interface DashboardBootstrapData {
  currentUser: CurrentUser;
  organization: Organization | null;
  organizationInvitations: MyOrganizationInvitation[];
  projects: Project[];
  stats: DashboardStats | null;
}

export function useDashboardBootstrap() {
  return useQuery({
    queryKey: ['dashboard-bootstrap'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/bootstrap');

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Không thể tải dữ liệu tổng quan');
      }

      const result = await response.json();
      return result.data as DashboardBootstrapData;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
