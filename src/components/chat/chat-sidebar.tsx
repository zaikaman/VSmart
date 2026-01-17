'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, MessageSquare, Trash2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage, Message, TypingIndicator } from './chat-message';
import { ChatInput, SuggestedQuestions } from './chat-input';

// Key cho localStorage
const CHAT_HISTORY_KEY = 'vsmart-chat-history';
const MAX_HISTORY_MESSAGES = 50;

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Lưu chat history vào localStorage
 */
function saveChatHistory(messages: Message[]) {
  try {
    const historyToSave = messages.slice(-MAX_HISTORY_MESSAGES);
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(historyToSave));
  } catch (error) {
    console.error('Lỗi lưu chat history:', error);
  }
}

/**
 * Tải chat history từ localStorage
 */
function loadChatHistory(): Message[] {
  try {
    const saved = localStorage.getItem(CHAT_HISTORY_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((m: Message) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
    }
  } catch (error) {
    console.error('Lỗi tải chat history:', error);
  }
  return [];
}

/**
 * Xóa chat history
 */
function clearChatHistory() {
  try {
    localStorage.removeItem(CHAT_HISTORY_KEY);
  } catch (error) {
    console.error('Lỗi xóa chat history:', error);
  }
}

/**
 * Tạo unique ID cho message
 */
function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Chat Sidebar Component
 * Hiển thị giao diện chat với AI assistant
 */
export function ChatSidebar({ isOpen, onClose }: ChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load history on mount
  useEffect(() => {
    const history = loadChatHistory();
    if (history.length > 0) {
      setMessages(history);
    }
  }, []);

  // Save history when messages change
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory(messages);
    }
  }, [messages]);

  // Scroll to bottom when new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent]);

  /**
   * Gửi tin nhắn và nhận streaming response
   */
  const handleSendMessage = useCallback(async (content: string) => {
    // Thêm user message
    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setStreamingContent('');

    // Tạo abort controller để có thể cancel request
    abortControllerRef.current = new AbortController();

    try {
      // Gửi request với toàn bộ conversation history
      const messagesToSend = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: messagesToSend }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Lỗi kết nối với AI');
      }

      // Đọc streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Không thể đọc response');
      }

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              break;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                setStreamingContent(fullContent);
              }
              if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch {
              // Ignore parse errors for incomplete JSON
            }
          }
        }
      }

      // Thêm assistant message với nội dung đầy đủ
      if (fullContent) {
        const assistantMessage: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: fullContent,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('Request bị hủy');
      } else {
        console.error('Lỗi chat:', error);
        // Thêm error message
        const errorMessage: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: `Xin lỗi, đã xảy ra lỗi: ${(error as Error).message}. Vui lòng thử lại.`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
      setStreamingContent('');
      abortControllerRef.current = null;
    }
  }, [messages]);

  /**
   * Xóa lịch sử chat
   */
  const handleClearHistory = useCallback(() => {
    if (window.confirm('Bạn có chắc muốn xóa toàn bộ lịch sử chat?')) {
      setMessages([]);
      clearChatHistory();
    }
  }, []);

  /**
   * Hủy request đang chạy
   */
  const handleCancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return (
    <>
      {/* Overlay khi mở trên mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Chat Sidebar */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full md:w-[400px] bg-[#191a23] z-50',
          'flex flex-col shadow-2xl transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2a2b35]">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#b9ff66]" />
            <h2 className="text-lg font-semibold text-white">VSmart AI</h2>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="p-2 text-white/50 hover:text-white hover:bg-[#2a2b35] rounded-lg transition-colors"
                title="Xóa lịch sử chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-white/50 hover:text-white hover:bg-[#2a2b35] rounded-lg transition-colors"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#2a2b35] scrollbar-track-transparent">
          {messages.length === 0 && !streamingContent ? (
            // Welcome state
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-[#2a2b35] flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-[#b9ff66]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Xin chào! Tôi là VSmart AI 👋
              </h3>
              <p className="text-sm text-white/60 mb-6 max-w-[280px]">
                Tôi có thể giúp bạn quản lý tasks, phân tích rủi ro, gợi ý phân công và nhiều hơn nữa.
              </p>
              <SuggestedQuestions
                onSelect={handleSendMessage}
                disabled={isLoading}
              />
            </div>
          ) : (
            // Messages list
            <div className="flex flex-col gap-2 p-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}

              {/* Streaming message */}
              {streamingContent && (
                <ChatMessage
                  message={{
                    id: 'streaming',
                    role: 'assistant',
                    content: streamingContent,
                    timestamp: new Date(),
                  }}
                  isStreaming
                />
              )}

              {/* Typing indicator */}
              {isLoading && !streamingContent && <TypingIndicator />}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Cancel button when loading */}
        {isLoading && (
          <div className="flex justify-center py-2 border-t border-[#2a2b35]">
            <button
              onClick={handleCancelRequest}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white bg-[#2a2b35] hover:bg-[#3a3b45] rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Hủy
            </button>
          </div>
        )}

        {/* Input Area */}
        <ChatInput
          onSend={handleSendMessage}
          isLoading={isLoading}
          placeholder="Hỏi gì đó về tasks, dự án..."
          disabled={isLoading}
        />
      </div>
    </>
  );
}
