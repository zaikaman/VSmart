'use client';

import { createContext, useContext, useState, useCallback, ReactNode, lazy, Suspense } from 'react';

// Dynamic import ChatSidebar để giảm initial bundle size
const ChatSidebar = lazy(() => 
  import('@/components/chat/chat-sidebar').then((mod) => ({ 
    default: mod.ChatSidebar 
  }))
);

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
 * Loading component cho ChatSidebar
 */
function ChatSidebarLoading() {
  return (
    <div className="fixed right-0 top-0 h-full w-[400px] bg-background border-l border-border shadow-2xl z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Đang tải Chat AI...</p>
      </div>
    </div>
  );
}

/**
 * Provider quản lý state của Chat AI
 * Wrap layout để sử dụng chat từ mọi nơi trong dashboard
 * ChatSidebar được lazy load để tối ưu performance
 */
export function ChatProvider({ children }: ChatProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);
  const toggleChat = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <ChatContext.Provider value={{ isOpen, openChat, closeChat, toggleChat }}>
      {children}
      {isOpen && (
        <Suspense fallback={<ChatSidebarLoading />}>
          <ChatSidebar isOpen={isOpen} onClose={closeChat} />
        </Suspense>
      )}
    </ChatContext.Provider>
  );
}
