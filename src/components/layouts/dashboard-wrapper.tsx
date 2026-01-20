'use client';

import { ReactNode, useEffect } from 'react';
import { ChatProvider } from '@/lib/providers/chat-provider';
import { useSocket } from '@/lib/hooks/use-socket';
import { useQuery } from '@tanstack/react-query';

interface DashboardWrapperProps {
  children: ReactNode;
}

/**
 * Client wrapper cho Dashboard layout
 * Bao gồm ChatProvider để enable Chat AI từ mọi nơi
 * Và join user room cho realtime notifications
 */
export function DashboardWrapper({ children }: DashboardWrapperProps) {
  const { isConnected, joinUserRoom } = useSocket();

  // Lấy thông tin user hiện tại
  const { data: userData } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const res = await fetch('/api/users/me');
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 phút
  });

  // Join user room khi socket connected
  useEffect(() => {
    if (isConnected && userData?.id) {
      joinUserRoom(userData.id);
    }
  }, [isConnected, userData?.id, joinUserRoom]);

  return <ChatProvider>{children}</ChatProvider>;
}
