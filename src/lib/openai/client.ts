/**
 * AI client helpers
 * Gemini is preferred. OpenAI is used as fallback when Gemini fails.
 */

import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';

let openaiInstance: OpenAI | null = null;

export interface AiUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface AiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ChatCompletionMessageToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface PreferredChatCompletionOptions {
  messages: AiMessage[];
  tools?: ChatCompletionTool[];
  temperature?: number;
  responseFormat?: 'text' | 'json_object';
}

export interface PreferredChatCompletionResult {
  content: string;
  toolCalls: ChatCompletionMessageToolCall[];
  usage?: AiUsage;
  model: string;
  provider: 'gemini' | 'openai';
}

interface GeminiPart {
  text?: string;
  functionCall?: {
    name?: string;
    args?: unknown;
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: {
    message?: string;
  };
}

export function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY chưa được cấu hình. Vui lòng thêm vào .env');
    }

    openaiInstance = new OpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    });
  }

  return openaiInstance;
}

export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL || 'gpt-4o-mini';
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
}

export function getPreferredAIModel(): string {
  if (hasGeminiConfig()) {
    return getGeminiModel();
  }

  return getOpenAIModel();
}

export function resetOpenAIClient(): void {
  openaiInstance = null;
}

function hasGeminiConfig(): boolean {
  return Boolean(
    process.env.GEMINI_API_KEY && process.env.GEMINI_BASE_URL && process.env.GEMINI_MODEL
  );
}

function normalizeGeminiBaseUrl(baseUrl: string): string[] {
  const trimmed = baseUrl.replace(/\/+$/, '');
  const urls = [`${trimmed}/models/${getGeminiModel()}:generateContent`];

  if (trimmed.endsWith('/v1')) {
    urls.push(`${trimmed.replace(/\/v1$/, '/v1beta')}/models/${getGeminiModel()}:generateContent`);
  }

  return Array.from(new Set(urls));
}

function convertSchemaForGemini(schema: unknown): unknown {
  if (Array.isArray(schema)) {
    return schema.map(convertSchemaForGemini);
  }

  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  const converted: Record<string, unknown> = {};

  Object.entries(schema).forEach(([key, value]) => {
    if (key === 'type' && typeof value === 'string') {
      converted[key] = value.toUpperCase();
      return;
    }

    if (key === 'properties' && value && typeof value === 'object' && !Array.isArray(value)) {
      converted[key] = Object.fromEntries(
        Object.entries(value).map(([propertyName, propertyValue]) => [
          propertyName,
          convertSchemaForGemini(propertyValue),
        ])
      );
      return;
    }

    converted[key] = convertSchemaForGemini(value);
  });

  return converted;
}

function convertToolsForGemini(tools?: ChatCompletionTool[]) {
  if (!tools?.length) {
    return undefined;
  }

  const functionTools = tools.filter(
    (
      tool
    ): tool is ChatCompletionTool & {
      type: 'function';
      function: {
        name: string;
        description?: string;
        parameters?: unknown;
      };
    } => tool.type === 'function' && 'function' in tool
  );

  if (!functionTools.length) {
    return undefined;
  }

  return [
    {
      functionDeclarations: functionTools.map((tool) => ({
        name: tool.function.name,
        description: tool.function.description,
        parameters: convertSchemaForGemini(tool.function.parameters),
      })),
    },
  ];
}

function buildSystemInstruction(messages: AiMessage[]) {
  const systemContent = messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content.trim())
    .filter(Boolean)
    .join('\n\n');

  if (!systemContent) {
    return undefined;
  }

  return {
    parts: [{ text: systemContent }],
  };
}

function formatToolCallsForGemini(message: AiMessage): string {
  if (!message.tool_calls?.length) {
    return message.content;
  }

  const toolSummary = message.tool_calls
    .filter(
      (
        toolCall
      ): toolCall is ChatCompletionMessageToolCall & {
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      } => toolCall.type === 'function' && 'function' in toolCall
    )
    .map((toolCall) => {
      const toolName = toolCall.function.name;
      const args = toolCall.function.arguments || '{}';
      return `Tool call: ${toolName}\nArgs: ${args}`;
    })
    .join('\n\n');

  return [message.content.trim(), toolSummary].filter(Boolean).join('\n\n');
}

function buildGeminiContents(messages: AiMessage[]) {
  return messages
    .filter((message) => message.role !== 'system')
    .map((message) => {
      const role = message.role === 'assistant' ? 'model' : 'user';

      if (message.role === 'tool') {
        return {
          role: 'user',
          parts: [
            {
              text: `Kết quả công cụ ${message.tool_call_id || ''}:\n${message.content}`,
            },
          ],
        };
      }

      return {
        role,
        parts: [
          {
            text:
              message.role === 'assistant' && message.tool_calls?.length
                ? formatToolCallsForGemini(message)
                : message.content,
          },
        ],
      };
    });
}

function normalizeUsage(usage?: {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}): AiUsage | undefined {
  if (!usage) {
    return undefined;
  }

  return {
    prompt: usage.prompt_tokens || 0,
    completion: usage.completion_tokens || 0,
    total: usage.total_tokens || 0,
  };
}

function extractJsonPayload(content: string): string {
  const trimmed = content.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    JSON.parse(withoutFence);
    return withoutFence;
  } catch {
    const objectStart = withoutFence.indexOf('{');
    const arrayStart = withoutFence.indexOf('[');
    const startCandidates = [objectStart, arrayStart].filter((value) => value >= 0);

    if (startCandidates.length === 0) {
      throw new Error('AI không trả về JSON hợp lệ');
    }

    const start = Math.min(...startCandidates);
    const objectEnd = withoutFence.lastIndexOf('}');
    const arrayEnd = withoutFence.lastIndexOf(']');
    const end = Math.max(objectEnd, arrayEnd);

    if (end < start) {
      throw new Error('AI không trả về JSON hợp lệ');
    }

    const sliced = withoutFence.slice(start, end + 1);
    JSON.parse(sliced);
    return sliced;
  }
}

export function parseJsonContent<T = unknown>(content: string): T {
  return JSON.parse(extractJsonPayload(content)) as T;
}

function normalizeJsonContent(content: string): string {
  return JSON.stringify(parseJsonContent(content));
}

function normalizeGeminiToolCalls(parts: GeminiPart[]): ChatCompletionMessageToolCall[] {
  return parts
    .filter((part) => part.functionCall?.name)
    .map((part, index) => ({
      id: `gemini-tool-${Date.now()}-${index}`,
      type: 'function',
      function: {
        name: part.functionCall?.name || '',
        arguments: JSON.stringify(part.functionCall?.args || {}),
      },
    }));
}

async function callGeminiCompletion(
  options: PreferredChatCompletionOptions
): Promise<PreferredChatCompletionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const baseUrl = process.env.GEMINI_BASE_URL;
  const model = getGeminiModel();

  if (!apiKey || !baseUrl) {
    throw new Error('Thiếu cấu hình Gemini trong .env');
  }

  const body: Record<string, unknown> = {
    contents: buildGeminiContents(options.messages),
    generationConfig: {
      temperature: options.temperature ?? 0.7,
    },
  };

  const systemInstruction = buildSystemInstruction(options.messages);
  if (systemInstruction) {
    body.systemInstruction = systemInstruction;
  }

  const tools = convertToolsForGemini(options.tools);
  if (tools) {
    body.tools = tools;
    body.toolConfig = {
      functionCallingConfig: {
        mode: 'AUTO',
      },
    };
  }

  if (options.responseFormat === 'json_object') {
    body.generationConfig = {
      ...(body.generationConfig as Record<string, unknown>),
      responseMimeType: 'application/json',
    };
  }

  const errors: string[] = [];

  for (const url of normalizeGeminiBaseUrl(baseUrl)) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      errors.push(`Gemini ${response.status} tại ${url}: ${errorText}`);
      continue;
    }

    const data = (await response.json()) as GeminiResponse;

    if (data.error?.message) {
      errors.push(data.error.message);
      continue;
    }

    const parts = data.candidates?.[0]?.content?.parts || [];
    const toolCalls = normalizeGeminiToolCalls(parts);
    let content = parts
      .map((part) => part.text || '')
      .join('')
      .trim();

    if (options.responseFormat === 'json_object' && content) {
      content = normalizeJsonContent(content);
    }

    if (!content && toolCalls.length === 0) {
      errors.push('Gemini không trả về nội dung hợp lệ');
      continue;
    }

    return {
      content,
      toolCalls,
      usage: data.usageMetadata
        ? {
            prompt: data.usageMetadata.promptTokenCount || 0,
            completion: data.usageMetadata.candidatesTokenCount || 0,
            total: data.usageMetadata.totalTokenCount || 0,
          }
        : undefined,
      model,
      provider: 'gemini',
    };
  }

  throw new Error(errors.join(' | ') || 'Không thể gọi Gemini');
}

function toOpenAIMessages(messages: AiMessage[]): ChatCompletionMessageParam[] {
  return messages.map((message) => {
    if (message.role === 'tool') {
      return {
        role: 'tool',
        content: message.content || '',
        tool_call_id: message.tool_call_id || '',
      } as ChatCompletionMessageParam;
    }

    const normalizedMessage: ChatCompletionMessageParam = {
      role: message.role,
      content: message.content || '',
    } as ChatCompletionMessageParam;

    if (message.tool_calls?.length) {
      (normalizedMessage as ChatCompletionMessageParam & {
        tool_calls?: ChatCompletionMessageToolCall[];
      }).tool_calls = message.tool_calls;
    }

    return normalizedMessage;
  });
}

async function callOpenAICompletion(
  options: PreferredChatCompletionOptions
): Promise<PreferredChatCompletionResult> {
  const client = getOpenAIClient();
  const model = getOpenAIModel();
  const response = await client.chat.completions.create({
    model,
    messages: toOpenAIMessages(options.messages),
    tools: options.tools,
    tool_choice: options.tools?.length ? 'auto' : undefined,
    temperature: options.temperature,
    response_format:
      options.responseFormat === 'json_object' ? { type: 'json_object' } : undefined,
  });

  let content = response.choices[0]?.message?.content || '';
  if (options.responseFormat === 'json_object' && content) {
    content = normalizeJsonContent(content);
  }

  return {
    content,
    toolCalls: response.choices[0]?.message?.tool_calls || [],
    usage: normalizeUsage(response.usage),
    model,
    provider: 'openai',
  };
}

export async function createPreferredChatCompletion(
  options: PreferredChatCompletionOptions
): Promise<PreferredChatCompletionResult> {
  if (hasGeminiConfig()) {
    try {
      return await callGeminiCompletion(options);
    } catch (geminiError) {
      console.error('[AI] Gemini lỗi, chuyển sang OpenAI:', geminiError);
    }
  }

  return callOpenAICompletion(options);
}
