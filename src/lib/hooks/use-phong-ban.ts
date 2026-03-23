import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type PhongBanTrangThai = 'active' | 'inactive' | 'merged';

export interface PhongBan {
  id: string;
  ten: string;
  mo_ta: string | null;
  ngay_tao: string;
  cap_nhat_cuoi?: string | null;
  to_chuc_id?: string | null;
  trang_thai: PhongBanTrangThai;
  merged_into_id?: string | null;
  ngung_su_dung_at?: string | null;
  merged_into?: {
    id: string;
    ten: string;
  } | null;
}

export interface UpsertPhongBanInput {
  ten: string;
  mo_ta?: string;
}

interface GetPhongBanOptions {
  includeInactive?: boolean;
}

async function getApiPayload<T>(response: Response) {
  return response.json().catch(() => ({} as { error?: string; data?: T }));
}

export function usePhongBan(options?: GetPhongBanOptions) {
  return useQuery({
    queryKey: ['phong-ban', options?.includeInactive ?? false],
    queryFn: async () => {
      const searchParams = new URLSearchParams();

      if (options?.includeInactive) {
        searchParams.set('includeInactive', 'true');
      }

      const response = await fetch(
        `/api/phong-ban${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
      );
      const payload = await getApiPayload<PhongBan[]>(response);

      if (!response.ok) {
        throw new Error(payload.error || 'Không thể tải danh sách phòng ban.');
      }

      return payload.data || [];
    },
  });
}

export function useCreatePhongBan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpsertPhongBanInput) => {
      const response = await fetch('/api/phong-ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const payload = await getApiPayload<PhongBan>(response);

      if (!response.ok) {
        throw new Error(payload.error || 'Không thể tạo phòng ban.');
      }

      return payload as { data: PhongBan };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phong-ban'] });
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
    },
  });
}

export function useUpdatePhongBan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: UpsertPhongBanInput & {
      id: string;
    }) => {
      const response = await fetch(`/api/phong-ban/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const payload = await getApiPayload<PhongBan>(response);

      if (!response.ok) {
        throw new Error(payload.error || 'Không thể cập nhật phòng ban.');
      }

      return payload as { data: PhongBan };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phong-ban'] });
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdatePhongBanStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      action: 'deactivate' | 'reactivate' | 'merge';
      target_department_id?: string;
    }) => {
      const response = await fetch(`/api/phong-ban/${input.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: input.action,
          target_department_id: input.target_department_id,
        }),
      });
      const payload = await getApiPayload<PhongBan>(response);

      if (!response.ok) {
        throw new Error(payload.error || 'Không thể cập nhật trạng thái phòng ban.');
      }

      return payload as { data: PhongBan };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phong-ban'] });
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['project-parts'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
