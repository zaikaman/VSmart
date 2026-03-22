'use client';

import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({
  onSend,
  isLoading = false,
  placeholder = 'Nhập câu hỏi...',
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    <div className="border-t border-[#e4e9de] bg-[#fbfcf8] p-3">
      <div className="flex items-end gap-2 rounded-[24px] border border-[#e1e7d8] bg-white p-2 shadow-[0_16px_35px_-30px_rgba(97,120,85,0.16)]">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          rows={1}
          className={cn(
            'min-h-[44px] max-h-[120px] flex-1 resize-none bg-transparent px-3 py-2 text-sm text-[#223021]',
            'placeholder:text-[#95a08f] focus:outline-none',
            'scrollbar-thin scrollbar-thumb-[#d8dfcf] scrollbar-track-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        />
        <button
          onClick={handleSend}
          disabled={!message.trim() || isLoading || disabled}
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] transition-colors',
            'hover:bg-[#e4efd3] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#edf6df]'
          )}
          title="Gửi tin nhắn"
        >
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}

export const SUGGESTED_QUESTIONS = [
  'Tiến độ hôm nay thế nào?',
  'Task nào có nguy cơ trễ?',
  'Ai phù hợp cho task React?',
  'Chia nhỏ task này giúp tôi',
];

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
  disabled?: boolean;
}

export function SuggestedQuestions({ onSelect, disabled }: SuggestedQuestionsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {SUGGESTED_QUESTIONS.map((question, index) => (
        <button
          key={index}
          onClick={() => onSelect(question)}
          disabled={disabled}
          className={cn(
            'rounded-full border border-[#e1e7d8] bg-white px-3 py-1.5 text-xs text-[#5f6b58] shadow-[0_12px_28px_-24px_rgba(97,120,85,0.18)]',
            'transition-colors hover:border-[#d7e3c8] hover:bg-[#f7fbef] hover:text-[#42533d]',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        >
          {question}
        </button>
      ))}
    </div>
  );
}
