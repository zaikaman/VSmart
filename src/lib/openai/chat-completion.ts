/**
 * Chat Completion với Streaming
 * Sử dụng OpenAI API để tạo chat responses với Server-Sent Events
 */

import { getOpenAIClient, getOpenAIModel } from './client';
import { CHAT_SYSTEM_PROMPT, createRagContextPrompt, FALLBACK_MESSAGE } from './prompts/chat-prompts';

/**
 * Message trong chat history
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
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
 * Tạo chat completion với streaming
 * Trả về ReadableStream để sử dụng với Server-Sent Events
 */
export async function createChatCompletionStream(
  options: ChatCompletionOptions
): Promise<ReadableStream<Uint8Array>> {
  const model = getOpenAIModel();
  const client = getOpenAIClient();

  // Tạo RAG context từ dữ liệu hệ thống
  const ragContext = createRagContextPrompt(options.context);
  
  // Xây dựng messages với system prompt và context
  const systemMessage = `${CHAT_SYSTEM_PROMPT}\n\n${ragContext}`;
  
  const messagesWithSystem: ChatMessage[] = [
    { role: 'system', content: systemMessage },
    ...options.messages,
  ];

  // Tạo streaming response từ OpenAI
  const stream = await client.chat.completions.create({
    model,
    messages: messagesWithSystem,
    stream: true,
  });

  // Convert OpenAI stream thành Web ReadableStream
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            // Format theo Server-Sent Events
            const sseData = `data: ${JSON.stringify({ content })}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          }
        }
        // Gửi signal kết thúc
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        console.error('[Streaming Error]', error);
        const errorMessage = error instanceof Error ? error.message : 'Lỗi streaming';
        const errorData = `data: ${JSON.stringify({ error: errorMessage })}\n\n`;
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
