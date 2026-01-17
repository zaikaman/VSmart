'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ChatSidebar } from '@/components/chat/chat-sidebar';

interface ChatContextType {
  isOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

/**
 * Hook để sử dụng chat context
 */
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

/**
 * Provider quản lý state của Chat AI
 * Wrap layout để sử dụng chat từ mọi nơi trong dashboard
 */
export function ChatProvider({ children }: ChatProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);
  const toggleChat = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <ChatContext.Provider value={{ isOpen, openChat, closeChat, toggleChat }}>
      {children}
      <ChatSidebar isOpen={isOpen} onClose={closeChat} />
    </ChatContext.Provider>
  );
}
