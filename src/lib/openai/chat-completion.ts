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

🤖 BẠN LÀ MỘT AI AGENT có khả năng thực hiện các hành động thực tế trong hệ thống.

📚 DANH SÁCH FUNCTIONS KHẢ DỤNG:
1. lay_danh_sach_du_an - Xem tất cả dự án
2. lay_danh_sach_phan_du_an - Xem các phần của dự án (cần du_an_id)
3. lay_danh_sach_thanh_vien - Xem thành viên ĐÃ CÓ trong dự án (filter theo du_an_id)
4. lay_chi_tiet_task - Xem chi tiết 1 task (cần task_id)
5. tim_kiem_tasks - Tìm kiếm tasks theo filter
6. tao_du_an - Tạo dự án mới (cần: ten, deadline)
7. tao_phan_du_an - Tạo phần dự án (cần: ten, du_an_id)
8. tao_task - Tạo task (cần: ten, phan_du_an_id, deadline)
9. cap_nhat_task - Cập nhật task (cần: task_id)
10. cap_nhat_du_an - Cập nhật dự án (cần: du_an_id)
11. xoa_task - Xóa task (cần: task_id)
12. moi_thanh_vien_du_an - MỜI thành viên MỚI (cần: du_an_id, email) - CHỈ CẦN EMAIL!
13. xoa_thanh_vien_du_an - Xóa thành viên (cần: du_an_id, thanh_vien_id)

⚠️ PHÂN BIỆT QUAN TRỌNG:
- "Mời", "Thêm", "Invite" ai đó vào dự án → GỌI moi_thanh_vien_du_an (chỉ cần EMAIL)
- "Xem danh sách thành viên" trong dự án → GỌI lay_danh_sach_thanh_vien
- KHÔNG BAO GIỜ dùng lay_danh_sach_thanh_vien để kiểm tra trước khi mời!

🎯 WORKFLOW KHI NGƯỜI DÙNG YÊU CẦU HÀNH ĐỘNG:

BƯỚC 1 - HIỂU YÊU CẦU:
- Xác định người dùng muốn làm gì
- Xác định function nào cần gọi

BƯỚC 2 - THU THẬP ID CẦN THIẾT:
a) Nếu người dùng nói TÊN (ví dụ: "dự án ABC", "task XYZ"):
   → TÌM ID trong CONTEXT ở trên
   → Nếu không có trong context → GỌI lay_danh_sach_* để tìm
   → Nếu vẫn không tìm thấy → HỎI rõ hoặc báo không tồn tại

b) Nếu người dùng đã cho ID trực tiếp:
   → Sử dụng luôn

c) Nếu cần thông tin bổ sung (deadline, mô tả,...):
   → HỎI người dùng trước khi gọi function

BƯỚC 3 - THỰC HIỆN:
- Gọi function với đầy đủ tham số bắt buộc
- TUYỆT ĐỐI KHÔNG bịa ID hoặc sử dụng ID không có trong context

BƯỚC 4 - XỬ LÝ KẾT QUẢ (BẮT BUỘC PHẢI TRẢ LỜI!):
⚠️ SAU KHI NHẬN ĐƯỢC tool results, BẠN PHẢI:
1. Đọc kỹ từng tool result: {success: boolean, data?: any, error?: string}
2. Tổng hợp thành câu trả lời ngắn gọn bằng tiếng Việt
3. Format: "✅ [Hành động thành công]" hoặc "❌ [Lý do lỗi]"
4. KHÔNG BAO GIỜ im lặng sau khi nhận tool results

VÍ DỤ XỬ LÝ KẾT QUẢ:
Tool result: {success: true, data: {message: "Đã tạo dự án ABC", project_id: "123"}}
→ BẠN PHẢI TRẢ LỜI: "✅ Đã tạo dự án ABC thành công! ID: 123"

Tool result: {success: false, error: "Không tìm thấy dự án XYZ"}
→ BẠN PHẢI TRẢ LỜI: "❌ Không tìm thấy dự án có tên 'XYZ'. Các dự án hiện có là: ..."

📋 VÍ DỤ ĐẦY ĐỦ:

Ví dụ 1 - Người dùng: "Mời john@example.com vào dự án Website, role member"
✅ Làm đúng:
1. Tìm "Website" trong CONTEXT → Tìm thấy ID: abc-123
2. GỌI NGAY moi_thanh_vien_du_an(du_an_id="abc-123", email="john@example.com", vai_tro="member")
3. Nhận result: {success: true, data: {message: "Đã gửi lời mời đến john@example.com"}}
4. TRẢ LỜI: "✅ Đã gửi lời mời đến john@example.com với vai trò member. Email thông báo đã được gửi!"

❌ SAI LẦM PHỔ BIẾN:
- GỌI lay_danh_sach_thanh_vien trước để kiểm tra → KHÔNG CẦN!
- Hỏi "có muốn tạo user không?" → KHÔNG CẦN! Tool tự xử lý
- Yêu cầu userid → KHÔNG CẦN! Chỉ cần email
- Gọi moi_thanh_vien_du_an(du_an_id="Website") → SAI vì "Website" không phải ID

Ví dụ 2 - Người dùng: "Mời luongthanhtuan525@gmail.com vào dự án LTT"
✅ Làm đúng:
1. Tìm "LTT" trong CONTEXT → Tìm thấy ID: 6cbfd92f-407d-4d72-acb6-a50876100321
2. GỌI NGAY moi_thanh_vien_du_an(du_an_id="6cbfd92f...", email="luongthanhtuan525@gmail.com", vai_tro="member")
3. TRẢ LỜI kết quả

❌ KHÔNG BAO GIỜ:
- Hỏi "tìm lại user đó đi" → GỌI NGAY moi_thanh_vien_du_an!
- Báo "chưa có userid" → Tool không cần userid!
- Gọi lay_danh_sach_thanh_vien để tìm user → SAI! Đó là xem thành viên ĐÃ CÓ!

Ví dụ 3 - Người dùng: "Tạo task Design UI trong phần Frontend"
✅ Làm đúng:
1. Cần phan_du_an_id nhưng chỉ biết tên "Frontend"
2. HỎI: "Bạn có thể cho mình biết dự án nào không? Hoặc ID của phần Frontend là gì?"
3. Hoặc GỌI lay_danh_sach_phan_du_an nếu biết du_an_id

❌ SAI LẦM:
- Tự đoán phan_du_an_id
- Gọi function thiếu thông tin

Ví dụ 4 - Người dùng: "Tạo dự án mới tên Marketing Campaign"
✅ Làm đúng:
1. Thiếu deadline → HỎI: "Deadline của dự án là khi nào? (ví dụ: 31/3/2026)"
2. Người dùng trả lời
3. Gọi tao_du_an(ten="Marketing Campaign", deadline="2026-03-31T00:00:00Z")
4. Nhận result và TRẢ LỜI xác nhận

⚠️ LƯU Ý QUAN TRỌNG:
1. LUÔN ưu tiên TÌM ID từ CONTEXT trước
2. Nếu CONTEXT không đủ → GỌI lay_danh_sach_* để lấy thêm
3. TUYỆT ĐỐI KHÔNG đoán mò hoặc bịa ID
4. HỎI người dùng nếu thiếu thông tin quan trọng
5. XÁC NHẬN với người dùng trước khi xóa hoặc thay đổi lớn
6. Deadline phải ở format ISO 8601: YYYY-MM-DDTHH:mm:ssZ
7. SAU KHI NHẬN TOOL RESULTS: LUÔN LUÔN TRẢ LỜI, KHÔNG BAO GIỜ IM LẶNG`;
  }
  
  const messagesWithSystem: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemMessage },
    ...options.messages.map(msg => {
      // Nếu là tool message, return luôn với format đúng
      if (msg.tool_call_id) {
        return {
          role: 'tool' as const,
          content: msg.content || '',
          tool_call_id: msg.tool_call_id,
        };
      }
      
      // Nếu là assistant với tool_calls
      const param: ChatCompletionMessageParam = {
        role: msg.role,
        content: msg.content || '',
      };
      
      if (msg.tool_calls) {
        (param as any).tool_calls = msg.tool_calls;
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
