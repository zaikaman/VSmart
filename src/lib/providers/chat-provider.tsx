'use client';

import dynamic from 'next/dynamic';
import { createContext, ReactNode, useCallback, useContext, useState } from 'react';

const ChatSidebar = dynamic(
  () => import('@/components/chat/chat-sidebar').then((mod) => ({ default: mod.ChatSidebar })),
  {
    loading: () => (
      <div className="fixed right-0 top-0 z-50 flex h-full w-[400px] items-center justify-center border-l border-border bg-background shadow-2xl">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Đang tải Chat AI...</p>
        </div>
      </div>
    ),
    ssr: false,
  }
);

interface ChatContextType {
  isOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
}

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);
  const toggleChat = useCallback(() => setIsOpen((previous) => !previous), []);

  return (
    <ChatContext.Provider value={{ isOpen, openChat, closeChat, toggleChat }}>
      {children}
      {isOpen ? <ChatSidebar isOpen={isOpen} onClose={closeChat} /> : null}
    </ChatContext.Provider>
  );
}
