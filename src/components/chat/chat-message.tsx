'use client';

import { cn } from '@/lib/utils';
import { User, Bot } from 'lucide-react';

/**
 * Interface cho một tin nhắn chat
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

/**
 * Component hiển thị một tin nhắn trong chat
 * Hỗ trợ cả user và assistant messages với styling khác nhau
 */
export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3 p-4 rounded-lg',
        isUser ? 'bg-[#2a2b35]/50 flex-row-reverse' : 'bg-[#191a23]'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-[#b9ff66] text-[#191a23]' : 'bg-[#2a2b35] text-[#b9ff66]'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>

      {/* Nội dung tin nhắn */}
      <div className={cn('flex-1 min-w-0', isUser && 'text-right')}>
        <div
          className={cn(
            'text-sm font-medium mb-1',
            isUser ? 'text-[#b9ff66]' : 'text-white/90'
          )}
        >
          {isUser ? 'Bạn' : 'VSmart AI'}
        </div>
        <div
          className={cn(
            'text-sm text-white/80 break-words whitespace-pre-wrap',
            isUser && 'inline-block text-left bg-[#2a2b35] px-3 py-2 rounded-lg'
          )}
        >
          <MessageContent content={message.content} isStreaming={isStreaming} />
        </div>
        <div className="text-xs text-white/40 mt-1">
          {message.timestamp.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Component render nội dung tin nhắn với markdown đơn giản
 */
function MessageContent({
  content,
  isStreaming,
}: {
  content: string;
  isStreaming?: boolean;
}) {
  // Xử lý markdown đơn giản: bold, italic, code, links
  const processedContent = content
    // Bold: **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    // Italic: *text* hoặc _text_
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Inline code: `code`
    .replace(/`(.+?)`/g, '<code class="bg-[#2a2b35] px-1 py-0.5 rounded text-[#b9ff66] text-xs">$1</code>')
    // Emoji risk levels
    .replace(/🔴/g, '<span class="text-red-400">🔴</span>')
    .replace(/🟡/g, '<span class="text-yellow-400">🟡</span>')
    .replace(/🟢/g, '<span class="text-green-400">🟢</span>');

  return (
    <span className="relative">
      <span 
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-[#b9ff66] ml-0.5 animate-pulse" />
      )}
    </span>
  );
}

/**
 * Component hiển thị trạng thái đang typing
 */
export function TypingIndicator() {
  return (
    <div className="flex gap-3 p-4 rounded-lg bg-[#191a23]">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#2a2b35] flex items-center justify-center text-[#b9ff66]">
        <Bot className="w-4 h-4" />
      </div>
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-[#b9ff66] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-[#b9ff66] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-[#b9ff66] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
