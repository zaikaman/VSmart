import { createPreferredChatCompletion, getPreferredAIModel } from './client';
import {
  DEADLINE_REVIEW_PROMPT,
  createDeadlineReviewUserPrompt,
} from './prompts/summary-prompts';

export interface DeadlineReviewResult {
  is_reasonable: boolean;
  warning_level: 'none' | 'watch' | 'high';
  ly_do: string;
  goi_y: string[];
  suggested_deadline: string | null;
}

export interface DeadlineReviewResponse {
  result: DeadlineReviewResult;
  latency_ms: number;
  model: string;
  error?: string;
}

function estimateComplexityDays(ten: string, moTa?: string) {
  const content = `${ten} ${moTa || ''}`.toLowerCase();
  const keywords = ['api', 'migration', 'auth', 'report', 'dashboard', 'tích hợp', 'ai', 'phân quyền'];
  const hits = keywords.filter((keyword) => content.includes(keyword)).length;
  return 2 + hits;
}

function buildFallback(params: {
  ten: string;
  mo_ta?: string;
  priority: string;
  deadline: string;
}): DeadlineReviewResult {
  const now = new Date();
  const deadline = new Date(params.deadline);
  const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const estimatedDays = estimateComplexityDays(params.ten, params.mo_ta);

  let warningLevel: DeadlineReviewResult['warning_level'] = 'none';
  if (daysRemaining < estimatedDays) {
    warningLevel = daysRemaining <= Math.max(1, estimatedDays - 2) ? 'high' : 'watch';
  }

  if (params.priority === 'urgent' && daysRemaining < 2) {
    warningLevel = 'high';
  }

  const suggestedDeadline =
    warningLevel === 'none'
      ? null
      : new Date(
          now.getTime() + Math.max(estimatedDays, params.priority === 'urgent' ? 2 : estimatedDays + 1) * 86400000
        ).toISOString();

  return {
    is_reasonable: warningLevel === 'none',
    warning_level: warningLevel,
    ly_do:
      warningLevel === 'none'
        ? 'Deadline hiện vẫn nằm trong vùng có thể triển khai.'
        : `Khối lượng công việc gợi ý tối thiểu khoảng ${estimatedDays} ngày, trong khi mốc đang còn ${Math.max(daysRemaining, 0)} ngày.`,
    goi_y:
      warningLevel === 'none'
        ? ['Giữ mốc hiện tại nhưng nên xác nhận checklist và người phụ trách ngay từ đầu.']
        : [
            'Nới deadline thêm vài ngày hoặc tách task thành checklist nhỏ hơn.',
            'Chốt người phụ trách sớm để tránh dồn việc sát hạn.',
          ],
    suggested_deadline: suggestedDeadline,
  };
}

function normalizeResult(parsed: Partial<DeadlineReviewResult>, fallback: DeadlineReviewResult) {
  return {
    is_reasonable:
      typeof parsed.is_reasonable === 'boolean' ? parsed.is_reasonable : fallback.is_reasonable,
    warning_level: parsed.warning_level || fallback.warning_level,
    ly_do: parsed.ly_do || fallback.ly_do,
    goi_y: Array.isArray(parsed.goi_y) ? parsed.goi_y.slice(0, 4) : fallback.goi_y,
    suggested_deadline:
      typeof parsed.suggested_deadline === 'string' || parsed.suggested_deadline === null
        ? parsed.suggested_deadline
        : fallback.suggested_deadline,
  } satisfies DeadlineReviewResult;
}

export async function reviewDeadlineReasonability(params: {
  ten: string;
  mo_ta?: string;
  priority: string;
  deadline: string;
  projectName?: string | null;
}): Promise<DeadlineReviewResponse> {
  const start = Date.now();
  const model = getPreferredAIModel();
  const fallback = buildFallback(params);

  try {
    const response = await createPreferredChatCompletion({
      messages: [
        { role: 'system', content: DEADLINE_REVIEW_PROMPT },
        { role: 'user', content: createDeadlineReviewUserPrompt(params) },
      ],
      responseFormat: 'json_object',
    });

    if (!response.content) {
      return {
        result: fallback,
        latency_ms: Date.now() - start,
        model: response.model,
        error: 'AI không trả về dữ liệu, dùng đánh giá dự phòng',
      };
    }

    return {
      result: normalizeResult(JSON.parse(response.content) as Partial<DeadlineReviewResult>, fallback),
      latency_ms: Date.now() - start,
      model: response.model,
    };
  } catch (error) {
    return {
      result: fallback,
      latency_ms: Date.now() - start,
      model,
      error: error instanceof Error ? error.message : 'Không thể đánh giá deadline',
    };
  }
}
