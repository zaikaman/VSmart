/**
 * Chat Completion với Streaming và Function Calling
 * Sử dụng OpenAI API để tạo chat responses với Server-Sent Events
 * Hỗ trợ AI Agent với function calling
 */

import { getOpenAIClient, getOpenAIModel } from './client';
import { CHAT_SYSTEM_PROMPT, createRagContextPrompt, FALLBACK_MESSAGE } from './prompts/chat-prompts';
import { AI_AGENT_TOOLS } from './agent-tools';
import type { ChatCompletionMessageParam, ChatCompletionMessageToolCall } from 'openai/resources/chat/completions';

/**
 * Message trong chat history
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  tool_calls?: ChatCompletionMessageToolCall[];
  tool_call_id?: string;
  name?: string;
}

/**
 * Context cho RAG
 */
export interface ChatContext {
  user: {
    id: string;
    ten: string;
    email: string;
    vai_tro?: string;
  };
  activeTasks: Array<{
    id: string;
    ten: string;
    mo_ta?: string;
    trang_thai: string;
    priority: string;
    progress: number;
    deadline: string;
    risk_score?: number;
    risk_level?: string;
    assignee_ten?: string;
    phan_du_an_ten?: string;
    du_an_ten?: string;
  }>;
  recentProjects: Array<{
    id: string;
    ten: string;
    mo_ta?: string;
    trang_thai: string;
    phan_tram_hoan_thanh: number;
    deadline: string;
    so_tasks: number;
    so_parts: number;
  }>;
  teamMembers: Array<{
    id: string;
    ten: string;
    email: string;
    vai_tro?: string;
    skills: Array<{
      ten_ky_nang: string;
      trinh_do: string;
    }>;
    so_task_dang_lam: number;
    ty_le_hoan_thanh: number;
  }>;
  stats?: {
    total_tasks: number;
    completed_tasks: number;
    in_progress_tasks: number;
    overdue_tasks: number;
    high_risk_tasks: number;
  };
}

/**
 * Options cho chat completion
 */
export interface ChatCompletionOptions {
  messages: ChatMessage[];
  context: ChatContext;
  maxTokens?: number;
  temperature?: number;
  enableTools?: boolean; // Bật tính năng AI Agent với function calling
}

/**
 * Tool call result
 */
export interface ToolCallResult {
  tool_call_id: string;
  tool_name: string;
  result: any;
}

/**
 * Response không streaming
 */
export interface ChatCompletionResponse {
  content: string;
  latency_ms: number;
  tokens_used?: {
    prompt: number;
    completion: number;
    total: number;
  };
  model: string;
  error?: string;
}

/**
 * Tạo chat completion không streaming (dùng cho testing hoặc API đơn giản)
 */
export async function createChatCompletion(
  options: ChatCompletionOptions
): Promise<ChatCompletionResponse> {
  const startTime = Date.now();
  const model = getOpenAIModel();

  try {
    const client = getOpenAIClient();
    
    // Tạo RAG context từ dữ liệu hệ thống
    const ragContext = createRagContextPrompt(options.context);
    
    // Xây dựng messages với system prompt và context
    const systemMessage = `${CHAT_SYSTEM_PROMPT}\n\n${ragContext}`;
    
    const messagesWithSystem: ChatMessage[] = [
      { role: 'system', content: systemMessage },
      ...options.messages,
    ];

    const response = await client.chat.completions.create({
      model,
      messages: messagesWithSystem,
    });

    const content = response.choices[0]?.message?.content || FALLBACK_MESSAGE;
    const latencyMs = Date.now() - startTime;

    return {
      content,
      latency_ms: latencyMs,
      tokens_used: {
        prompt: response.usage?.prompt_tokens || 0,
        completion: response.usage?.completion_tokens || 0,
        total: response.usage?.total_tokens || 0,
      },
      model,
    };
  } catch (error) {
    console.error('[Chat Completion Error]', error);
    
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';

    return {
      content: `Xin lỗi, đã xảy ra lỗi khi xử lý yêu cầu: ${errorMessage}`,
      latency_ms: latencyMs,
      model,
      error: errorMessage,
    };
  }
}

/**
 * Tạo chat completion với streaming và function calling
 * Trả về ReadableStream để sử dụng với Server-Sent Events
 */
export async function createChatCompletionStream(
  options: ChatCompletionOptions
): Promise<ReadableStream<Uint8Array>> {
  const model = getOpenAIModel();
  const client = getOpenAIClient();

  // Tạo RAG context từ dữ liệu hệ thống
  const ragContext = createRagContextPrompt(options.context);
  
  // System message với context và hướng dẫn sử dụng tools
  let systemMessage = `${CHAT_SYSTEM_PROMPT}\n\n${ragContext}`;
  
  if (options.enableTools) {
    systemMessage += `

BẠN LÀ MỘT AI AGENT có khả năng thực hiện các hành động thực tế trong hệ thống.

KHI NGƯỜI DÙNG YÊU CẦU:
- "Tạo dự án mới" → Sử dụng function tao_du_an
- "Mời [người] vào dự án" → Sử dụng function moi_thanh_vien_du_an
- "Tạo phần dự án / module / sprint" → Sử dụng function tao_phan_du_an
- "Tạo task / công việc" → Sử dụng function tao_task
- "Cập nhật / thay đổi task" → Sử dụng function cap_nhat_task
- "Xóa task" → Sử dụng function xoa_task
- "Xem danh sách dự án / tasks / thành viên" → Sử dụng các function lay_danh_sach_*

QUAN TRỌNG:
1. Khi thiếu thông tin (ví dụ: deadline, tên dự án), HỎI NGƯỜI DÙNG trước khi gọi function
2. Sau khi gọi function thành công, thông báo rõ ràng kết quả cho người dùng
3. Nếu function thất bại, giải thích lỗi và hướng dẫn người dùng cách khắc phục
4. Luôn XÁC NHẬN với người dùng trước khi thực hiện các hành động quan trọng (xóa, thay đổi lớn)
5. Sử dụng context có sẵn để điền thông tin khi có thể (ví dụ: dự án hiện tại, phần dự án)`;
  }
  
  const messagesWithSystem: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemMessage },
    ...options.messages.map(msg => {
      const param: ChatCompletionMessageParam = {
        role: msg.role,
        content: msg.content || '',
      };
      
      if (msg.tool_calls) {
        (param as any).tool_calls = msg.tool_calls;
      }
      
      if (msg.tool_call_id && msg.name) {
        return {
          role: 'tool' as const,
          content: msg.content || '',
          tool_call_id: msg.tool_call_id,
        };
      }
      
      return param;
    }),
  ];

  // Tạo streaming response từ OpenAI
  const streamOptions: any = {
    model,
    messages: messagesWithSystem,
    stream: true,
  };

  // Thêm tools nếu được bật
  if (options.enableTools) {
    streamOptions.tools = AI_AGENT_TOOLS;
    streamOptions.tool_choice = 'auto'; // Để AI tự quyết định khi nào dùng tools
  }

  const stream = await client.chat.completions.create(streamOptions) as any;

  // Convert OpenAI stream thành Web ReadableStream
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        let toolCalls: any[] = [];
        let currentToolCall: any = null;

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta;
          
          // Xử lý text content
          if (delta?.content) {
            const sseData = `data: ${JSON.stringify({ 
              type: 'content',
              content: delta.content 
            })}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          }

          // Xử lý tool calls
          if (delta?.tool_calls) {
            for (const toolCall of delta.tool_calls) {
              if (toolCall.index !== undefined) {
                if (!toolCalls[toolCall.index]) {
                  toolCalls[toolCall.index] = {
                    id: toolCall.id || '',
                    type: 'function',
                    function: {
                      name: toolCall.function?.name || '',
                      arguments: toolCall.function?.arguments || '',
                    },
                  };
                } else {
                  // Append arguments
                  if (toolCall.function?.arguments) {
                    toolCalls[toolCall.index].function.arguments += toolCall.function.arguments;
                  }
                  if (toolCall.function?.name) {
                    toolCalls[toolCall.index].function.name = toolCall.function.name;
                  }
                  if (toolCall.id) {
                    toolCalls[toolCall.index].id = toolCall.id;
                  }
                }
              }
            }
          }

          // Khi stream kết thúc và có tool calls
          if (chunk.choices[0]?.finish_reason === 'tool_calls' && toolCalls.length > 0) {
            // Gửi tool calls về client
            const toolCallsData = `data: ${JSON.stringify({ 
              type: 'tool_calls',
              tool_calls: toolCalls 
            })}\n\n`;
            controller.enqueue(encoder.encode(toolCallsData));
          }
        }

        // Gửi signal kết thúc
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        console.error('[Streaming Error]', error);
        const errorMessage = error instanceof Error ? error.message : 'Lỗi streaming';
        const errorData = `data: ${JSON.stringify({ 
          type: 'error',
          error: errorMessage 
        })}\n\n`;
        controller.enqueue(encoder.encode(errorData));
        controller.close();
      }
    },
  });
}

/**
 * Phân tích ý định người dùng từ câu hỏi
 */
export type ChatIntent = 
  | 'task_status'      // Hỏi về trạng thái task
  | 'task_risk'        // Hỏi về rủi ro task
  | 'project_status'   // Hỏi về trạng thái dự án
  | 'suggest_assignee' // Gợi ý phân công
  | 'breakdown_task'   // Chia nhỏ task
  | 'stats'            // Thống kê
  | 'general';         // Câu hỏi chung

export function detectChatIntent(message: string): ChatIntent {
  const lowerMessage = message.toLowerCase();

  // Keywords cho từng intent
  if (/r[ủu]i\s*ro|nguy\s*c[ơo]|tr[ễe]\s*h[ạa]n|delay|risk/.test(lowerMessage)) {
    return 'task_risk';
  }
  if (/ph[âa]n\s*c[ôo]ng|g[ợo]i\s*[ýy]|ai\s*ph[ùu]\s*h[ợo]p|assign|suggest/.test(lowerMessage)) {
    return 'suggest_assignee';
  }
  if (/chia\s*nh[ỏo]|breakdown|subtask|t[ách]*\s*nh[ỏo]/.test(lowerMessage)) {
    return 'breakdown_task';
  }
  if (/th[ốo]ng\s*k[êe]|statistics|báo\s*cáo|report|t[ổo]ng\s*quan/.test(lowerMessage)) {
    return 'stats';
  }
  if (/d[ựu]\s*[áa]n|project/.test(lowerMessage)) {
    return 'project_status';
  }
  if (/task|c[ôo]ng\s*vi[ệe]c|nhi[ệe]m\s*v[ụu]/.test(lowerMessage)) {
    return 'task_status';
  }

  return 'general';
}
