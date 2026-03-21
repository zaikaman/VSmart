'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, MessageSquare, Trash2, RefreshCw, Zap, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessage, Message, TypingIndicator } from './chat-message';
import { ChatInput, SuggestedQuestions } from './chat-input';

// Key cho localStorage
const CHAT_HISTORY_KEY = 'vsmart-chat-history';
const MAX_HISTORY_MESSAGES = 50;
const AGENT_MODE_KEY = 'vsmart-agent-mode';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ToolCall {
  id?: string;
  type?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
}

interface StreamChunk {
  type?: 'content' | 'tool_calls' | 'error';
  content?: string;
  tool_calls?: ToolCall[];
  error?: string;
}

interface ToolExecutionResult {
  success: boolean;
  data?: {
    message?: string;
  };
  error?: string;
  tool_call_id?: string;
}

interface ToolExecutionResponse {
  results: ToolExecutionResult[];
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
  const [agentMode, setAgentMode] = useState(false); // AI Agent mode
  const [executingTools, setExecutingTools] = useState(false); // Đang thực thi tools
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load history và agent mode on mount
  useEffect(() => {
    const history = loadChatHistory();
    if (history.length > 0) {
      setMessages(history);
    }
    
    // Load agent mode preference
    const savedAgentMode = localStorage.getItem(AGENT_MODE_KEY);
    if (savedAgentMode === 'true') {
      setAgentMode(true);
    }
  }, []);

  // Save agent mode preference
  useEffect(() => {
    localStorage.setItem(AGENT_MODE_KEY, agentMode.toString());
  }, [agentMode]);

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
   * Gửi tin nhắn và nhận streaming response với AI Agent support
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
      // QUAN TRỌNG: Loại bỏ tool_calls và tool messages từ history cũ
      const messagesToSend = [...messages, userMessage]
        .filter((m) => !m.tool_call_id) // Loại tool messages
        .map((m) => ({
          role: m.role,
          content: m.content,
          // Không include tool_calls và tool-related fields
        }));

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messages: messagesToSend,
          enableAgent: agentMode, // Bật AI Agent mode
        }),
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
      let toolCalls: ToolCall[] = [];

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
              const parsed = JSON.parse(data) as StreamChunk;
              
              // Xử lý text content
              if (parsed.type === 'content' && parsed.content) {
                fullContent += parsed.content;
                setStreamingContent(fullContent);
              }
              
              // Xử lý tool calls
              if (parsed.type === 'tool_calls' && parsed.tool_calls) {
                toolCalls = parsed.tool_calls;
              }
              
              if (parsed.type === 'error' && parsed.error) {
                throw new Error(parsed.error);
              }
            } catch {
              // Ignore parse errors for incomplete JSON
            }
          }
        }
      }

      // Nếu có tool calls, thực thi chúng
      if (toolCalls.length > 0 && agentMode) {
        // Thêm assistant message với tool calls
        const assistantMessageWithTools: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: fullContent || 'Đang thực hiện các hành động...',
          timestamp: new Date(),
          tool_calls: toolCalls,
        };
        
        setMessages((prev) => [...prev, assistantMessageWithTools]);
        setStreamingContent('');
        setExecutingTools(true);

        // Gọi API để execute tools
        const toolResponse = await fetch('/api/ai/execute-tools', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tool_calls: toolCalls }),
        });

        if (!toolResponse.ok) {
          throw new Error('Lỗi khi thực thi tools');
        }

        const toolResults = (await toolResponse.json()) as ToolExecutionResponse;
        setExecutingTools(false);

        // Gọi lại AI với tool results để tổng hợp
        // Build messages array đúng format: [...history, assistant_with_tools, ...tool_results]
        const summaryMessages = [
          ...messagesToSend, // History đã clean (không có tool_calls)
          {
            role: 'assistant',
            content: fullContent || '',
            tool_calls: toolCalls, // Assistant message với tool_calls
          },
          ...toolResults.results.map((result) => ({
            role: 'tool',
            content: JSON.stringify({
              success: result.success,
              data: result.data,
              error: result.error,
            }),
            tool_call_id: result.tool_call_id,
          })),
          // Thêm user message yêu cầu tổng hợp rõ ràng
          {
            role: 'user',
            content: 'Hãy tổng hợp kết quả các hành động trên thành 1-2 câu ngắn gọn, rõ ràng. Sử dụng ✅ nếu thành công, ❌ nếu có lỗi.',
          },
        ];

        console.log('[Chat] Calling AI for summary with messages:', summaryMessages.length);

        const summaryResponse = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            messages: summaryMessages,
            enableAgent: false, // TẮT agent mode cho summary để tránh loop
          }),
        });

        if (!summaryResponse.ok) {
          const errorText = await summaryResponse.text();
          console.error('[Chat] Summary response error:', errorText);
          throw new Error('Lỗi khi tổng hợp kết quả');
        }

        // Đọc summary response
        const summaryReader = summaryResponse.body?.getReader();
        if (!summaryReader) {
          throw new Error('Không thể đọc summary response');
        }

        let summaryContent = '';
        let hasContent = false;
        while (true) {
          const { done, value } = await summaryReader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data) as StreamChunk;
                console.log('[Chat] Summary chunk:', parsed);
                if (parsed.type === 'content' && parsed.content) {
                  summaryContent += parsed.content;
                  setStreamingContent(summaryContent);
                  hasContent = true;
                }
              } catch {}
            }
          }
        }

        console.log('[Chat] Summary complete. Has content:', hasContent, 'Length:', summaryContent.length);

        // Thêm summary message hoặc fallback
        if (summaryContent) {
          const summaryMessage: Message = {
            id: generateMessageId(),
            role: 'assistant',
            content: summaryContent,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, summaryMessage]);
        } else {
          // Nếu AI không trả lời, tự tạo summary từ tool results
          const resultsText = toolResults.results
            .map((r) => {
              if (r.success) {
                return `✅ ${r.data?.message || 'Thành công'}`;
              } else {
                return `❌ Lỗi: ${r.error}`;
              }
            })
            .join('\n');

          const fallbackMessage: Message = {
            id: generateMessageId(),
            role: 'assistant',
            content: `Đã thực hiện xong các hành động:\n\n${resultsText}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, fallbackMessage]);
        }
      } else if (fullContent) {
        // Không có tool calls, thêm assistant message bình thường
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
      setExecutingTools(false);
      abortControllerRef.current = null;
    }
  }, [messages, agentMode]);

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
            {agentMode && (
              <div className="flex items-center gap-1 px-2 py-1 bg-[#b9ff66]/10 rounded-full">
                <Zap className="w-3 h-3 text-[#b9ff66]" />
                <span className="text-xs text-[#b9ff66] font-medium">Agent</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Agent Mode Toggle */}
            <button
              onClick={() => setAgentMode(!agentMode)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                agentMode 
                  ? 'text-[#b9ff66] bg-[#b9ff66]/10 hover:bg-[#b9ff66]/20' 
                  : 'text-white/50 hover:text-white hover:bg-[#2a2b35]'
              )}
              title={agentMode ? 'Tắt AI Agent (chỉ trả lời)' : 'Bật AI Agent (có thể thực hiện hành động)'}
            >
              <Zap className="w-4 h-4" />
            </button>
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
              <p className="text-sm text-white/60 mb-2 max-w-[280px]">
                Tôi có thể giúp bạn quản lý tasks, phân tích rủi ro, gợi ý phân công và nhiều hơn nữa.
              </p>
              {agentMode && (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#b9ff66]/10 rounded-lg mb-4">
                  <Zap className="w-4 h-4 text-[#b9ff66]" />
                  <p className="text-xs text-[#b9ff66]">
                    Chế độ Agent đang BẬT - Tôi có thể tạo dự án, tasks, mời thành viên,...
                  </p>
                </div>
              )}
              <button
                onClick={() =>
                  handleSendMessage(
                    'Tạo checklist bằng AI cho task sau. Hãy trả về checklist ngắn gọn, thực thi được: '
                  )
                }
                disabled={isLoading}
                className="mb-4 inline-flex items-center gap-2 rounded-lg border border-[#b9ff66]/30 bg-[#b9ff66]/10 px-4 py-2 text-sm text-[#b9ff66] hover:bg-[#b9ff66]/20 disabled:opacity-50"
              >
                <Wand2 className="w-4 h-4" />
                Tạo checklist bằng AI
              </button>
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
              {isLoading && !streamingContent && !executingTools && <TypingIndicator />}
              
              {/* Tool execution indicator */}
              {executingTools && (
                <div className="flex items-center gap-2 p-3 bg-[#2a2b35] rounded-lg">
                  <div className="animate-spin">
                    <Zap className="w-4 h-4 text-[#b9ff66]" />
                  </div>
                  <span className="text-sm text-white/70">Đang thực hiện các hành động...</span>
                </div>
              )}

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
