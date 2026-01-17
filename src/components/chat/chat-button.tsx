'use client';

import { MessageSquare } from 'lucide-react';
import { useChat } from '@/lib/providers/chat-provider';
import { cn } from '@/lib/utils';

interface ChatButtonProps {
  className?: string;
}

/**
 * Nút mở Chat AI Sidebar
 */
export function ChatButton({ className }: ChatButtonProps) {
  const { toggleChat, isOpen } = useChat();

  return (
    <button
      onClick={toggleChat}
      className={cn(
        'flex items-center space-x-3 w-full rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isOpen
          ? 'bg-[#2a2b35] text-[#b9ff66]'
          : 'text-white/70 hover:bg-[#2a2b35]/50 hover:text-white',
        className
      )}
      title="Mở Chat AI"
    >
      <MessageSquare
        className={cn('h-4 w-4', isOpen ? 'text-[#b9ff66]' : 'text-white/70')}
      />
      <span>Chat AI</span>
    </button>
  );
}
