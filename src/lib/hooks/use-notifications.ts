'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSocket } from './use-socket';
import { SOCKET_EVENTS } from '../socket/events';

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

interface NotificationsResponse {
  data: Notification[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

async function fetchNotifications(page = 1, unreadOnly = false): Promise<NotificationsResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: '20',
    ...(unreadOnly && { unreadOnly: 'true' }),
  });
  
  const res = await fetch(`/api/notifications?${params}`);
  
  if (!res.ok) {
    throw new Error('Không thể tải thông báo');
  }
  
  return res.json();
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

export function useNotifications(options?: { unreadOnly?: boolean }) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const { on, off, isConnected } = useSocket();
  
  // Query notifications
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['notifications', page, options?.unreadOnly],
    queryFn: () => fetchNotifications(page, options?.unreadOnly),
    staleTime: 30 * 1000, // 30 giây - notifications cần fresh
    gcTime: 2 * 60 * 1000, // 2 phút cache
    refetchInterval: 60 * 1000, // Refetch mỗi phút
    refetchOnWindowFocus: true, // Refetch khi user quay lại tab
  });

  // Listen realtime notification events
  useEffect(() => {
    if (!isConnected) return;

    const handleNewNotification = (notification: any) => {
      console.log('Received new notification:', notification);
      // Invalidate queries to refetch notifications
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    on(SOCKET_EVENTS.NOTIFICATION as any, handleNewNotification);

    return () => {
      off(SOCKET_EVENTS.NOTIFICATION as any, handleNewNotification);
    };
  }, [isConnected, on, off, queryClient]);
  
  // Mutation: mark as read
  const markAsReadMutation = useMutation({
    mutationFn: markAsRead,
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      
      // Snapshot previous value
      const previous = queryClient.getQueryData<NotificationsResponse>(['notifications', page, options?.unreadOnly]);
      
      // Optimistically update
      if (previous) {
        queryClient.setQueryData<NotificationsResponse>(['notifications', page, options?.unreadOnly], {
          ...previous,
          data: previous.data.map((n) =>
            n.id === id ? { ...n, da_doc: true } : n
          ),
          unreadCount: Math.max(0, previous.unreadCount - 1),
        });
      }
      
      return { previous };
    },
    onError: (err, id, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(['notifications', page, options?.unreadOnly], context.previous);
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
  
  // Mutation: mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      
      const previous = queryClient.getQueryData<NotificationsResponse>(['notifications', page, options?.unreadOnly]);
      
      if (previous) {
        queryClient.setQueryData<NotificationsResponse>(['notifications', page, options?.unreadOnly], {
          ...previous,
          data: previous.data.map((n) => ({ ...n, da_doc: true })),
          unreadCount: 0,
        });
      }
      
      return { previous };
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['notifications', page, options?.unreadOnly], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
  
  const handleMarkAsRead = useCallback((id: string) => {
    markAsReadMutation.mutate(id);
  }, [markAsReadMutation]);
  
  const handleMarkAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);
  
  const handleNextPage = useCallback(() => {
    if (data && page < data.pagination.totalPages) {
      setPage((p) => p + 1);
    }
  }, [data, page]);
  
  const handlePrevPage = useCallback(() => {
    if (page > 1) {
      setPage((p) => p - 1);
    }
  }, [page]);
  
  return {
    notifications: data?.data || [],
    unreadCount: data?.unreadCount || 0,
    pagination: data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
    isLoading,
    isFetching,
    error,
    refetch,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    nextPage: handleNextPage,
    prevPage: handlePrevPage,
    currentPage: page,
  };
}
