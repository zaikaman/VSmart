'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Component input cho chat
 * Hỗ trợ Enter để gửi, Shift+Enter để xuống dòng
 */
export function ChatInput({
  onSend,
  isLoading = false,
  placeholder = 'Nhập tin nhắn...',
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage && !isLoading && !disabled) {
      onSend(trimmedMessage);
      setMessage('');
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2 p-3 bg-[#191a23] border-t border-[#2a2b35]">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        rows={1}
        className={cn(
          'flex-1 resize-none bg-[#2a2b35] text-white text-sm rounded-lg px-4 py-3',
          'placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#b9ff66]/50',
          'scrollbar-thin scrollbar-thumb-[#3a3b45] scrollbar-track-transparent',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'min-h-[44px] max-h-[120px]'
        )}
      />
      <button
        onClick={handleSend}
        disabled={!message.trim() || isLoading || disabled}
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
          'bg-[#b9ff66] text-[#191a23] hover:bg-[#a8ee55] transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#b9ff66]'
        )}
        title="Gửi tin nhắn (Enter)"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Send className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}

/**
 * Các gợi ý câu hỏi mẫu
 */
export const SUGGESTED_QUESTIONS = [
  'Tổng quan tiến độ công việc hôm nay?',
  'Task nào có nguy cơ trễ hạn?',
  'Ai phù hợp làm task React?',
  'Chia nhỏ task lớn thành subtasks',
];

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
  disabled?: boolean;
}

/**
 * Component hiển thị các câu hỏi gợi ý
 */
export function SuggestedQuestions({ onSelect, disabled }: SuggestedQuestionsProps) {
  return (
    <div className="p-4">
      <p className="text-xs text-white/50 mb-3">Gợi ý câu hỏi:</p>
      <div className="flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((question, index) => (
          <button
            key={index}
            onClick={() => onSelect(question)}
            disabled={disabled}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full',
              'bg-[#2a2b35] text-white/70 hover:text-[#b9ff66] hover:bg-[#3a3b45]',
              'transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
