'use client';

import { ReactNode } from 'react';
import { ChatProvider } from '@/lib/providers/chat-provider';

interface DashboardWrapperProps {
  children: ReactNode;
}

/**
 * Client wrapper cho Dashboard layout
 * Bao gồm ChatProvider để enable Chat AI từ mọi nơi
 */
export function DashboardWrapper({ children }: DashboardWrapperProps) {
  return <ChatProvider>{children}</ChatProvider>;
}
