'use client';

import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tool_calls?: unknown[];
  tool_call_id?: string;
}

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser ? (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl border border-[#dbe4cf] bg-[#eef6df] text-[#719254]">
          <Bot className="h-4 w-4" />
        </div>
      ) : null}

      <div className={cn('max-w-[85%]', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-[24px] border px-4 py-3 shadow-[0_16px_35px_-30px_rgba(97,120,85,0.22)]',
            isUser
              ? 'border-[#d7e3c8] bg-[#edf6df] text-[#30412d]'
              : 'border-[#e4e9de] bg-white text-[#223021]'
          )}
        >
          <MessageContent content={message.content} isStreaming={isStreaming} isUser={isUser} />
        </div>
        <div className={cn('mt-1 px-1 text-xs text-[#8a9684]', isUser ? 'text-right' : 'text-left')}>
          {message.timestamp.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>

      {isUser ? (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl border border-[#e4e9de] bg-white text-[#5f6b58]">
          <User className="h-4 w-4" />
        </div>
      ) : null}
    </div>
  );
}

function MessageContent({
  content,
  isStreaming,
  isUser,
}: {
  content: string;
  isStreaming?: boolean;
  isUser: boolean;
}) {
  const strongClass = isUser ? 'font-semibold text-[#223021]' : 'font-semibold text-[#1f2b1f]';
  const codeClass = isUser
    ? 'bg-white/70 px-1 py-0.5 rounded text-[#42533d] text-xs'
    : 'bg-[#f5f7f1] px-1 py-0.5 rounded text-[#4f614b] text-xs';

  const processedContent = content
    .replace(/\*\*(.+?)\*\*/g, `<strong class="${strongClass}">$1</strong>`)
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, `<code class="${codeClass}">$1</code>`);

  return (
    <span className="relative text-sm break-words whitespace-pre-wrap leading-6">
      <span dangerouslySetInnerHTML={{ __html: processedContent }} />
      {isStreaming ? <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-[#8abe4b]" /> : null}
    </span>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl border border-[#dbe4cf] bg-[#eef6df] text-[#719254]">
        <Bot className="h-4 w-4" />
      </div>
      <div className="rounded-[24px] border border-[#e4e9de] bg-white px-4 py-3 shadow-[0_16px_35px_-30px_rgba(97,120,85,0.22)]">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 animate-bounce rounded-full bg-[#8abe4b]" style={{ animationDelay: '0ms' }} />
          <div className="h-2 w-2 animate-bounce rounded-full bg-[#8abe4b]" style={{ animationDelay: '150ms' }} />
          <div className="h-2 w-2 animate-bounce rounded-full bg-[#8abe4b]" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
