'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

export interface Notification {
  id: string;
  nguoi_dung_id: string;
  loai: 'risk_alert' | 'stale_task' | 'assignment' | 'overload' | 'project_invitation';
  noi_dung: string;
  task_lien_quan_id?: string | null;
  da_doc: boolean;
  thoi_gian: string;
  task?: {
    id: string;
    ten: string;
    trang_thai: string;
    progress: number;
    risk_level: string;
  } | null;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface NotificationsResponse {
  data: Notification[];
  unreadCount: number;
  pagination: PaginationMeta;
}

async function fetchNotifications({
  page,
  limit,
  unreadOnly,
}: {
  page: number;
  limit: number;
  unreadOnly: boolean;
}): Promise<NotificationsResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (unreadOnly) {
    params.set('unreadOnly', 'true');
  }

  const res = await fetch(`/api/notifications?${params.toString()}`);

  if (!res.ok) {
    throw new Error('Không thể tải thông báo');
  }

  return res.json() as Promise<NotificationsResponse>;
}

async function markAsRead(id: string): Promise<void> {
  const res = await fetch(`/api/notifications/${id}/read`, {
    method: 'PATCH',
  });

  if (!res.ok) {
    throw new Error('Không thể đánh dấu đã đọc');
  }
}

async function markAllAsRead(): Promise<void> {
  const res = await fetch('/api/notifications/read-all', {
    method: 'PATCH',
  });

  if (!res.ok) {
    throw new Error('Không thể đánh dấu tất cả đã đọc');
  }
}

export function useNotifications(options?: { unreadOnly?: boolean; limit?: number }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = options?.limit ?? 10;
  const unreadOnly = options?.unreadOnly ?? false;

  const queryKey = useMemo(
    () => ['notifications', { page, limit, unreadOnly }] as const,
    [limit, page, unreadOnly]
  );

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchNotifications({ page, limit, unreadOnly }),
    placeholderData: keepPreviousData,
    staleTime: 15 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: false,
  });

  const markAsReadMutation = useMutation({
    mutationFn: markAsRead,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      const snapshots = queryClient.getQueriesData<NotificationsResponse>({
        queryKey: ['notifications'],
      });

      queryClient.setQueriesData<NotificationsResponse>(
        { queryKey: ['notifications'] },
        (previous) => {
          if (!previous) return previous;

          const wasUnread = previous.data.some((notification) => notification.id === id && !notification.da_doc);

          return {
            ...previous,
            data: previous.data.map((notification) =>
              notification.id === id ? { ...notification, da_doc: true } : notification
            ),
            unreadCount: wasUnread ? Math.max(0, previous.unreadCount - 1) : previous.unreadCount,
          };
        }
      );

      return { snapshots };
    },
    onError: (_error, _id, context) => {
      context?.snapshots.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });

      const snapshots = queryClient.getQueriesData<NotificationsResponse>({
        queryKey: ['notifications'],
      });

      queryClient.setQueriesData<NotificationsResponse>(
        { queryKey: ['notifications'] },
        (previous) => {
          if (!previous) return previous;

          return {
            ...previous,
            data: previous.data.map((notification) => ({ ...notification, da_doc: true })),
            unreadCount: 0,
          };
        }
      );

      return { snapshots };
    },
    onError: (_error, _variables, context) => {
      context?.snapshots.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleMarkAsRead = useCallback(
    (id: string) => {
      markAsReadMutation.mutate(id);
    },
    [markAsReadMutation]
  );

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  const totalPages = data?.pagination.totalPages ?? 0;

  const handleNextPage = useCallback(() => {
    if (data && page < data.pagination.totalPages) {
      setPage((previous) => previous + 1);
    }
  }, [data, page]);

  const handlePrevPage = useCallback(() => {
    if (page > 1) {
      setPage((previous) => previous - 1);
    }
  }, [page]);

  const handlePageChange = useCallback(
    (nextPage: number) => {
      if (nextPage < 1 || (totalPages > 0 && nextPage > totalPages)) {
        return;
      }
      setPage(nextPage);
    },
    [totalPages]
  );

  return {
    notifications: data?.data || [],
    unreadCount: data?.unreadCount || 0,
    pagination: data?.pagination || { page: 1, limit, total: 0, totalPages: 0 },
    isLoading,
    isFetching,
    error,
    refetch,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    nextPage: handleNextPage,
    prevPage: handlePrevPage,
    setPage: handlePageChange,
    currentPage: page,
    hasNextPage: totalPages > 0 && page < totalPages,
    hasPrevPage: page > 1,
  };
}
