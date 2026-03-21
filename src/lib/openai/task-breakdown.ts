import { getOpenAIClient, getOpenAIModel } from './client';
import { normalizeChecklistItems } from '@/lib/tasks/checklist';

export interface BreakdownRequest {
  ten: string;
  mo_ta?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface BreakdownResponse {
  checklist: Array<{
    title: string;
    is_done: boolean;
    sort_order: number;
  }>;
  latency_ms: number;
  model: string;
  error?: string;
}

const TASK_BREAKDOWN_PROMPT = `
Bạn là trợ lý quản lý dự án.
Hãy phân rã một task lớn thành checklist hành động ngắn gọn, thực tế và có thể thực thi.

Yêu cầu:
- Trả về JSON object với key "checklist"
- "checklist" là mảng tối đa 8 item
- Mỗi item có dạng { "title": string }
- Title phải ngắn gọn, bắt đầu bằng động từ, không đánh số
- Không trả lời thêm văn bản ngoài JSON
`.trim();

export async function taoChecklistBangAI(input: BreakdownRequest): Promise<BreakdownResponse> {
  const startTime = Date.now();
  const model = getOpenAIModel();

  if (!input.ten.trim()) {
    return {
      checklist: [],
      latency_ms: Date.now() - startTime,
      model,
      error: 'Tên task không được để trống',
    };
  }

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: TASK_BREAKDOWN_PROMPT },
        {
          role: 'user',
          content: JSON.stringify({
            ten: input.ten,
            mo_ta: input.mo_ta || '',
            priority: input.priority || 'medium',
          }),
        },
      ],
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('AI không trả về kết quả');
    }

    const parsed = JSON.parse(content);
    const checklist = normalizeChecklistItems(parsed.checklist);

    return {
      checklist,
      latency_ms: Date.now() - startTime,
      model,
    };
  } catch (error) {
    return {
      checklist: fallbackChecklist(input),
      latency_ms: Date.now() - startTime,
      model,
      error: error instanceof Error ? error.message : 'Không thể tạo checklist bằng AI',
    };
  }
}

function fallbackChecklist(input: BreakdownRequest) {
  const baseItems = [
    `Làm rõ yêu cầu cho "${input.ten}"`,
    'Xác định phạm vi và tiêu chí hoàn thành',
    'Chuẩn bị tài nguyên hoặc dữ liệu cần thiết',
    'Thực hiện phần chính của task',
    'Kiểm tra và xác nhận kết quả',
  ];

  return normalizeChecklistItems(baseItems);
}
