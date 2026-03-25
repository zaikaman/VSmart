import { createPreferredChatCompletion, getPreferredAIModel } from './client';
import type { InsightDataset } from './insight-context';
import {
  REBALANCE_PROMPT,
  createRebalanceUserPrompt,
} from './prompts/summary-prompts';

export interface RebalanceSuggestion {
  task_id: string;
  task_name: string;
  from_user_id: string;
  from_user_name: string;
  to_user_id: string;
  to_user_name: string;
  reason: string;
  impact: string;
  confidence: number;
}

export interface RebalanceSuggestionResult {
  overview: string;
  suggestions: RebalanceSuggestion[];
}

export interface RebalanceSuggestionResponse {
  result: RebalanceSuggestionResult;
  latency_ms: number;
  model: string;
  reference_id: string;
  error?: string;
}

function compareTasks(
  a: { risk_score: number; deadline: string },
  b: { risk_score: number; deadline: string }
) {
  if (b.risk_score !== a.risk_score) {
    return b.risk_score - a.risk_score;
  }

  return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
}

function buildFallback(dataset: InsightDataset): RebalanceSuggestionResult {
  const senders = dataset.workload.members
    .filter((member) => member.loadStatus === 'overloaded' || member.loadStatus === 'stretched')
    .sort((a, b) => b.loadRatio - a.loadRatio);
  const receivers = dataset.workload.members
    .filter((member) => member.loadStatus === 'available' || member.loadStatus === 'balanced')
    .sort((a, b) => a.loadRatio - b.loadRatio);

  const suggestions: RebalanceSuggestion[] = [];

  for (const sender of senders) {
    const senderTasks = [...sender.tasks]
      .filter((task) => task.trang_thai !== 'done')
      .sort(compareTasks);

    for (const task of senderTasks) {
      const receiver = receivers.find((member) => member.userId !== sender.userId);
      if (!receiver) {
        break;
      }

      suggestions.push({
        task_id: task.id,
        task_name: task.ten,
        from_user_id: sender.userId,
        from_user_name: sender.ten,
        to_user_id: receiver.userId,
        to_user_name: receiver.ten,
        reason: `${sender.ten} đang ${sender.loadStatus === 'overloaded' ? 'quá tải' : 'sát tải'}, trong khi ${receiver.ten} còn dư địa để nhận thêm việc.`,
        impact: `Giảm áp lực cho ${sender.ten} và kéo giãn deadline gần của nhóm.`,
        confidence: Math.max(
          62,
          Math.min(92, 78 - Math.round(receiver.loadRatio * 10) + Math.round(task.risk_score / 10))
        ),
      });

      receivers.push(receivers.shift() as (typeof receivers)[number]);

      if (suggestions.length >= 4) {
        return {
          overview: `Hiện có ${senders.length} thành viên đang ở vùng tải cao và ${receivers.length} thành viên còn dư tải.`,
          suggestions,
        };
      }
    }
  }

  return {
    overview:
      suggestions.length > 0
        ? `Hiện có ${senders.length} thành viên đang ở vùng tải cao và nên điều phối lại một vài task.`
        : 'Tải công việc hiện khá cân bằng, chưa thấy trường hợp cần rebalance mạnh.',
    suggestions,
  };
}

function normalizeResult(parsed: Partial<RebalanceSuggestionResult>, fallback: RebalanceSuggestionResult) {
  const suggestions = Array.isArray(parsed.suggestions)
    ? parsed.suggestions
        .filter(
          (item): item is RebalanceSuggestion =>
            Boolean(
              item &&
                item.task_id &&
                item.task_name &&
                item.from_user_id &&
                item.from_user_name &&
                item.to_user_id &&
                item.to_user_name
            )
        )
        .slice(0, 6)
    : fallback.suggestions;

  return {
    overview: parsed.overview || fallback.overview,
    suggestions,
  };
}

export async function aiRebalanceSuggestions(
  dataset: InsightDataset
): Promise<RebalanceSuggestionResponse> {
  const start = Date.now();
  const model = getPreferredAIModel();
  const fallback = buildFallback(dataset);
  const referenceId = `${dataset.project_id || 'workspace'}:${new Date(dataset.generated_at).toISOString().slice(0, 10)}`;

  try {
    const response = await createPreferredChatCompletion({
      messages: [
        { role: 'system', content: REBALANCE_PROMPT },
        { role: 'user', content: createRebalanceUserPrompt(dataset) },
      ],
      responseFormat: 'json_object',
    });

    if (!response.content) {
      return {
        result: fallback,
        latency_ms: Date.now() - start,
        model: response.model,
        reference_id: referenceId,
        error: 'AI không trả về dữ liệu, dùng gợi ý cân tải dự phòng',
      };
    }

    return {
      result: normalizeResult(JSON.parse(response.content) as Partial<RebalanceSuggestionResult>, fallback),
      latency_ms: Date.now() - start,
      model: response.model,
      reference_id: referenceId,
    };
  } catch (error) {
    return {
      result: fallback,
      latency_ms: Date.now() - start,
      model,
      reference_id: referenceId,
      error: error instanceof Error ? error.message : 'Không thể tạo gợi ý rebalance',
    };
  }
}
