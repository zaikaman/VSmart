'use client';

import { MessageSquare } from 'lucide-react';
import { useChat } from '@/lib/providers/chat-provider';
import { cn } from '@/lib/utils';

interface ChatButtonProps {
  className?: string;
}

export function ChatButton({ className }: ChatButtonProps) {
  const { toggleChat, isOpen } = useChat();

  return (
    <button
      onClick={toggleChat}
      className={cn(
        'flex w-full items-center rounded-2xl px-3 py-3 text-sm font-medium transition-all',
        isOpen
          ? 'border border-[#d7e3c8] bg-[#edf6df] text-[#42533d] shadow-[0_16px_35px_-30px_rgba(97,120,85,0.45)]'
          : 'border border-transparent text-[#62705d] hover:border-[#e2e8d9] hover:bg-white/80 hover:text-[#223021]',
        className
      )}
      title="Mở Chat AI"
    >
      <MessageSquare className={cn('mr-3 h-4 w-4', isOpen ? 'text-[#719254]' : 'text-[#7b8775]')} />
      <span>Chat AI</span>
    </button>
  );
}
