/**
 * Chat completion with synthetic streaming and tool-calling support.
 * Gemini is preferred. OpenAI is used as fallback automatically.
 */

import {
  createPreferredChatCompletion,
  getPreferredAIModel,
  type AiMessage,
} from './client';
import {
  CHAT_SYSTEM_PROMPT,
  FALLBACK_MESSAGE,
  createRagContextPrompt,
} from './prompts/chat-prompts';
import { AI_AGENT_TOOLS } from './agent-tools';
import type { ChatCompletionMessageToolCall } from 'openai/resources/chat/completions';

export interface ChatMessage extends AiMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: ChatCompletionMessageToolCall[];
  tool_call_id?: string;
  name?: string;
}

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

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  context: ChatContext;
  maxTokens?: number;
  temperature?: number;
  enableTools?: boolean;
}

export interface ToolCallResult {
  tool_call_id: string;
  tool_name: string;
  result: any;
}

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

const AGENT_GUIDANCE = `
Bạn đang ở chế độ AI Agent.

Quy tắc bắt buộc:
- Chỉ dùng tool khi thực sự cần thao tác hoặc cần thêm dữ liệu.
- Luôn ưu tiên lấy ID từ context trước, không tự bịa ID.
- Nếu thiếu thông tin bắt buộc như deadline, project_id, part_id thì phải hỏi lại.
- Sau khi có tool result, luôn trả lời ngắn gọn bằng tiếng Việt.
- Nếu hành động thất bại, nêu rõ lý do để người dùng xử lý tiếp.
`.trim();

function buildSystemMessage(context: ChatContext, enableTools?: boolean) {
  const ragContext = createRagContextPrompt(context);
  const sections = [CHAT_SYSTEM_PROMPT, ragContext];

  if (enableTools) {
    sections.push(AGENT_GUIDANCE);
  }

  return sections.join('\n\n');
}

function buildMessages(options: ChatCompletionOptions): ChatMessage[] {
  return [
    { role: 'system', content: buildSystemMessage(options.context, options.enableTools) },
    ...options.messages,
  ];
}

function toTokenUsage(usage?: { prompt: number; completion: number; total: number }) {
  if (!usage) {
    return undefined;
  }

  return {
    prompt: usage.prompt,
    completion: usage.completion,
    total: usage.total,
  };
}

function splitContentForStream(content: string): string[] {
  const normalized = content.trim();
  if (!normalized) {
    return [];
  }

  const chunks: string[] = [];
  let current = '';

  normalized.split(/(\s+)/).forEach((part) => {
    if ((current + part).length > 48 && current.trim()) {
      chunks.push(current);
      current = part;
      return;
    }

    current += part;
  });

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

export async function createChatCompletion(
  options: ChatCompletionOptions
): Promise<ChatCompletionResponse> {
  const startTime = Date.now();
  const model = getPreferredAIModel();

  try {
    const response = await createPreferredChatCompletion({
      messages: buildMessages(options),
      tools: options.enableTools ? AI_AGENT_TOOLS : undefined,
      temperature: options.temperature,
    });

    return {
      content: response.content || FALLBACK_MESSAGE,
      latency_ms: Date.now() - startTime,
      tokens_used: toTokenUsage(response.usage),
      model: response.model,
    };
  } catch (error) {
    console.error('[Chat Completion Error]', error);

    const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';

    return {
      content: `Xin lỗi, đã xảy ra lỗi khi xử lý yêu cầu: ${errorMessage}`,
      latency_ms: Date.now() - startTime,
      model,
      error: errorMessage,
    };
  }
}

export async function createChatCompletionStream(
  options: ChatCompletionOptions
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        const response = await createPreferredChatCompletion({
          messages: buildMessages(options),
          tools: options.enableTools ? AI_AGENT_TOOLS : undefined,
          temperature: options.temperature,
        });

        const content = response.content || '';
        const chunks = splitContentForStream(content);

        for (const chunk of chunks) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'content', content: chunk })}\n\n`)
          );
        }

        if (response.toolCalls.length > 0) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'tool_calls', tool_calls: response.toolCalls })}\n\n`
            )
          );
        }

        if (!content && response.toolCalls.length === 0) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'content', content: FALLBACK_MESSAGE })}\n\n`
            )
          );
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        console.error('[Streaming Error]', error);
        const errorMessage = error instanceof Error ? error.message : 'Lỗi streaming';
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`)
        );
        controller.close();
      }
    },
  });
}

export type ChatIntent =
  | 'task_status'
  | 'task_risk'
  | 'project_status'
  | 'suggest_assignee'
  | 'breakdown_task'
  | 'stats'
  | 'general';

export function detectChatIntent(message: string): ChatIntent {
  const lowerMessage = message.toLowerCase();

  if (/r[ủu]i\s*ro|nguy\s*c[ơo]|tr[ễe]\s*h[ạa]n|delay|risk/.test(lowerMessage)) {
    return 'task_risk';
  }
  if (/ph[âa]n\s*c[ôo]ng|g[ợo]i\s*[ýy]|ai\s*ph[ùu]\s*h[ợo]p|assign|suggest/.test(lowerMessage)) {
    return 'suggest_assignee';
  }
  if (/chia\s*nh[ỏo]|breakdown|subtask|t[áa]ch*\s*nh[ỏo]/.test(lowerMessage)) {
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
