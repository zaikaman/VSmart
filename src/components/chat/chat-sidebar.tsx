'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Loader2, MessageSquare, RefreshCw, Trash2, Wand2, X, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatInput, SuggestedQuestions } from './chat-input';
import { ChatMessage, Message, TypingIndicator } from './chat-message';
import { useMeetingSummary } from '@/lib/hooks/use-ai-insights';

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

function saveChatHistory(messages: Message[]) {
  try {
    const historyToSave = messages.slice(-MAX_HISTORY_MESSAGES);
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(historyToSave));
  } catch (error) {
    console.error('Lỗi lưu chat history:', error);
  }
}

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

function clearChatHistory() {
  try {
    localStorage.removeItem(CHAT_HISTORY_KEY);
  } catch (error) {
    console.error('Lỗi xóa chat history:', error);
  }
}

function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function ChatSidebar({ isOpen, onClose }: ChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [agentMode, setAgentMode] = useState(false);
  const [executingTools, setExecutingTools] = useState(false);
  const [showMeetingTool, setShowMeetingTool] = useState(false);
  const [meetingNotes, setMeetingNotes] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const meetingSummaryMutation = useMeetingSummary();

  useEffect(() => {
    const history = loadChatHistory();
    if (history.length > 0) {
      setMessages(history);
    }

    const savedAgentMode = localStorage.getItem(AGENT_MODE_KEY);
    if (savedAgentMode === 'true') {
      setAgentMode(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(AGENT_MODE_KEY, agentMode.toString());
  }, [agentMode]);

  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory(messages);
    }
  }, [messages]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      const userMessage: Message = {
        id: generateMessageId(),
        role: 'user',
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setStreamingContent('');
      abortControllerRef.current = new AbortController();

      try {
        const messagesToSend = [...messages, userMessage]
          .filter((m) => !m.tool_call_id)
          .map((m) => ({
            role: m.role,
            content: m.content,
          }));

        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: messagesToSend,
            enableAgent: agentMode,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Lỗi kết nối với AI');
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Không thể đọc phản hồi');
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
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data) as StreamChunk;

              if (parsed.type === 'content' && parsed.content) {
                fullContent += parsed.content;
                setStreamingContent(fullContent);
              }

              if (parsed.type === 'tool_calls' && parsed.tool_calls) {
                toolCalls = parsed.tool_calls;
              }

              if (parsed.type === 'error' && parsed.error) {
                throw new Error(parsed.error);
              }
            } catch {
              // Ignore incomplete chunks
            }
          }
        }

        if (toolCalls.length > 0 && agentMode) {
          const assistantMessageWithTools: Message = {
            id: generateMessageId(),
            role: 'assistant',
            content: fullContent || 'Đang thực hiện...',
            timestamp: new Date(),
            tool_calls: toolCalls,
          };

          setMessages((prev) => [...prev, assistantMessageWithTools]);
          setStreamingContent('');
          setExecutingTools(true);

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

          const summaryMessages = [
            ...messagesToSend,
            {
              role: 'assistant',
              content: fullContent || '',
              tool_calls: toolCalls,
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
            {
              role: 'user',
              content: 'Tóm tắt ngắn gọn kết quả ở trên thành 1-2 câu rõ ràng.',
            },
          ];

          const summaryResponse = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: summaryMessages,
              enableAgent: false,
            }),
          });

          if (!summaryResponse.ok) {
            throw new Error('Lỗi khi tổng hợp kết quả');
          }

          const summaryReader = summaryResponse.body?.getReader();
          if (!summaryReader) {
            throw new Error('Không thể đọc phản hồi tổng hợp');
          }

          let summaryContent = '';
          while (true) {
            const { done, value } = await summaryReader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data) as StreamChunk;
                if (parsed.type === 'content' && parsed.content) {
                  summaryContent += parsed.content;
                  setStreamingContent(summaryContent);
                }
              } catch {
                // Ignore incomplete chunks
              }
            }
          }

          if (summaryContent) {
            const summaryMessage: Message = {
              id: generateMessageId(),
              role: 'assistant',
              content: summaryContent,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, summaryMessage]);
          } else {
            const resultsText = toolResults.results
              .map((r) => (r.success ? `Thành công: ${r.data?.message || 'OK'}` : `Lỗi: ${r.error}`))
              .join('\n');

            const fallbackMessage: Message = {
              id: generateMessageId(),
              role: 'assistant',
              content: resultsText,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, fallbackMessage]);
          }
        } else if (fullContent) {
          const assistantMessage: Message = {
            id: generateMessageId(),
            role: 'assistant',
            content: fullContent,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          const errorMessage: Message = {
            id: generateMessageId(),
            role: 'assistant',
            content: `Đã xảy ra lỗi: ${(error as Error).message}`,
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
    },
    [messages, agentMode]
  );

  const handleClearHistory = useCallback(() => {
    if (window.confirm('Xóa toàn bộ lịch sử chat?')) {
      setMessages([]);
      clearChatHistory();
    }
  }, []);

  const handleCancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return (
    <>
      {isOpen ? <div className="fixed inset-0 z-40 bg-black/25 md:hidden" onClick={onClose} /> : null}

      <div
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-[#e1e7d8] bg-[linear-gradient(180deg,#fdfcf7_0%,#f4f7ef_48%,#eef3ea_100%)] shadow-[0_24px_80px_-40px_rgba(89,109,84,0.35)] transition-transform duration-300 ease-in-out md:w-[420px]',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-center justify-between border-b border-[#e1e7d8] bg-white/80 px-4 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#dbe4cf] bg-[#eef6df] text-[#719254]">
              <MessageSquare className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-[#223021]">Chat AI</span>
            {agentMode ? (
              <div className="inline-flex items-center gap-1 rounded-full border border-[#d7e3c8] bg-[#edf6df] px-2 py-1 text-[11px] font-medium text-[#42533d]">
                <Zap className="h-3 w-3" />
                Agent
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowMeetingTool((value) => !value)}
              className={cn(
                'rounded-2xl border p-2 transition-colors',
                showMeetingTool
                  ? 'border-[#d7e3c8] bg-[#edf6df] text-[#42533d]'
                  : 'border-transparent text-[#7b8775] hover:border-[#e2e8d9] hover:bg-white hover:text-[#223021]'
              )}
              title="Tóm tắt họp"
            >
              <FileText className="h-4 w-4" />
            </button>
            <button
              onClick={() => setAgentMode(!agentMode)}
              className={cn(
                'rounded-2xl border p-2 transition-colors',
                agentMode
                  ? 'border-[#d7e3c8] bg-[#edf6df] text-[#42533d]'
                  : 'border-transparent text-[#7b8775] hover:border-[#e2e8d9] hover:bg-white hover:text-[#223021]'
              )}
              title="Bật hoặc tắt Agent"
            >
              <Zap className="h-4 w-4" />
            </button>
            {messages.length > 0 ? (
              <button
                onClick={handleClearHistory}
                className="rounded-2xl border border-transparent p-2 text-[#7b8775] transition-colors hover:border-[#e2e8d9] hover:bg-white hover:text-[#223021]"
                title="Xóa lịch sử"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
            <button
              onClick={onClose}
              className="rounded-2xl border border-transparent p-2 text-[#7b8775] transition-colors hover:border-[#e2e8d9] hover:bg-white hover:text-[#223021]"
              title="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {showMeetingTool ? (
            <div className="mb-4 rounded-[24px] border border-[#e1e7d8] bg-white p-4 shadow-[0_16px_35px_-30px_rgba(97,120,85,0.16)]">
              <div className="mb-3">
                <div className="flex items-center gap-2 text-sm font-medium text-[#223021]">
                  <FileText className="h-4 w-4 text-[#719254]" />
                  Tóm tắt nhanh cuộc họp
                </div>
                <p className="mt-1 text-xs leading-5 text-[#7d8978]">
                  Dán notes hoặc transcript để rút ra quyết định, blocker và việc cần làm tiếp.
                </p>
              </div>
              <textarea
                value={meetingNotes}
                onChange={(event) => setMeetingNotes(event.target.value)}
                placeholder="Ví dụ: Hôm nay team chốt scope sprint, API auth còn kẹt vì mapping role..."
                className="min-h-[120px] w-full rounded-[20px] border border-[#e4e9de] bg-[#fbfcf8] px-3 py-3 text-sm text-[#223021] outline-none placeholder:text-[#95a08f]"
              />
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => meetingSummaryMutation.mutate({ notes: meetingNotes })}
                  disabled={meetingSummaryMutation.isPending || meetingNotes.trim().length < 20}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[#d5e1c7] bg-[#edf6df] px-4 py-2 text-sm font-medium text-[#42533d] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {meetingSummaryMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  Tóm tắt ngay
                </button>
                <button
                  onClick={() => {
                    setMeetingNotes('');
                    meetingSummaryMutation.reset();
                  }}
                  className="rounded-2xl border border-[#e1e7d8] bg-white px-3 py-2 text-sm text-[#5f6b58]"
                >
                  Xóa
                </button>
              </div>

              {meetingSummaryMutation.data?.result ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-[20px] border border-[#e4e9de] bg-[#fbfcf8] p-3 text-sm text-[#223021]">
                    {meetingSummaryMutation.data.result.summary}
                  </div>

                  {meetingSummaryMutation.data.result.decisions.map((item) => (
                    <div key={item} className="rounded-[20px] border border-[#e4e9de] bg-white px-3 py-2 text-sm text-[#223021]">
                      {item}
                    </div>
                  ))}

                  {meetingSummaryMutation.data.result.blockers.map((item) => (
                    <div key={item} className="rounded-[20px] border border-[#f0ddd1] bg-[#fff7f2] px-3 py-2 text-sm text-[#8f5a3e]">
                      {item}
                    </div>
                  ))}

                  {meetingSummaryMutation.data.result.action_items.map((item) => (
                    <div key={`${item.title}-${item.owner || 'no-owner'}`} className="rounded-[20px] border border-[#e4e9de] bg-white px-3 py-2 text-sm text-[#223021]">
                      <div>{item.title}</div>
                      {item.owner || item.due_hint ? <div className="mt-1 text-xs text-[#8a9684]">{[item.owner, item.due_hint].filter(Boolean).join(' · ')}</div> : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {messages.length === 0 && !streamingContent ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[24px] border border-[#dbe4cf] bg-[#eef6df] text-[#719254]">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-[#223021]">Xin chào, tôi là VSmart AI</h3>
              <p className="mb-2 max-w-[300px] text-center text-sm leading-6 text-[#6e7a69]">
                Tôi có thể giúp bạn theo dõi tiến độ, tìm task rủi ro, gợi ý người phù hợp và chia nhỏ công việc.
              </p>
              {agentMode ? (
                <div className="mb-4 inline-flex items-center gap-2 rounded-2xl border border-[#d7e3c8] bg-[#edf6df] px-3 py-2 text-xs font-medium text-[#42533d]">
                  <Zap className="h-3.5 w-3.5" />
                  Chế độ Agent đang bật
                </div>
              ) : null}
              <button
                onClick={() =>
                  handleSendMessage(
                    'Tạo checklist bằng AI cho task sau. Hãy trả về checklist ngắn gọn, thực thi được: '
                  )
                }
                disabled={isLoading}
                className="mb-5 inline-flex items-center gap-2 rounded-2xl border border-[#d5e1c7] bg-[#edf6df] px-4 py-2 text-sm font-medium text-[#42533d] hover:bg-[#e4efd3] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Wand2 className="h-4 w-4" />
                Tạo checklist bằng AI
              </button>
              <SuggestedQuestions onSelect={handleSendMessage} disabled={isLoading} />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}

              {streamingContent ? (
                <ChatMessage
                  message={{
                    id: 'streaming',
                    role: 'assistant',
                    content: streamingContent,
                    timestamp: new Date(),
                  }}
                  isStreaming
                />
              ) : null}

              {isLoading && !streamingContent && !executingTools ? <TypingIndicator /> : null}

              {executingTools ? (
                <div className="rounded-[24px] border border-[#d7e3c8] bg-[#edf6df] px-4 py-3 text-sm text-[#42533d]">
                  Đang thực hiện các hành động...
                </div>
              ) : null}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="border-t border-[#e4e9de] bg-[#fbfcf8] px-4 py-2">
            <button
              onClick={handleCancelRequest}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#e1e7d8] bg-white px-4 py-2 text-sm text-[#5f6b58]"
            >
              <RefreshCw className="h-4 w-4" />
              Hủy
            </button>
          </div>
        ) : null}

        <ChatInput onSend={handleSendMessage} isLoading={isLoading} placeholder="Nhập câu hỏi..." disabled={isLoading} />
      </div>
    </>
  );
}
