'use client';

import { useQuery } from '@tanstack/react-query';

export interface CurrentUser {
  id: string;
  ten: string;
  email: string;
  avatar_url: string | null;
  ten_cong_ty?: string | null;
  ten_phong_ban?: string | null;
  onboarding_completed?: boolean;
  vai_tro?: 'owner' | 'admin' | 'manager' | 'member';
  to_chuc?: {
    id: string;
    ten: string;
    mo_ta?: string | null;
    logo_url?: string | null;
  } | null;
}

async function fetchCurrentUser() {
  const response = await fetch('/api/users/me');

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Không thể tải thông tin người dùng');
  }

  return response.json() as Promise<CurrentUser>;
}

export function useCurrentUser(enabled = true) {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: fetchCurrentUser,
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
