import { getOpenAIClient, getOpenAIModel } from './client';
import type { InsightDataset } from './insight-context';
import {
  WEEKLY_SUMMARY_PROMPT,
  createWeeklySummaryUserPrompt,
} from './prompts/summary-prompts';

export interface WeeklySummaryResult {
  headline: string;
  summary: string;
  wins: string[];
  watchouts: string[];
  next_focus: string[];
}

export interface WeeklySummaryResponse {
  result: WeeklySummaryResult;
  latency_ms: number;
  model: string;
  digest_key: string;
  error?: string;
}

function buildDigestKey(dataset: InsightDataset) {
  const now = new Date(dataset.generated_at);
  const firstDay = new Date(now);
  firstDay.setDate(now.getDate() - now.getDay() + 1);
  return `${dataset.project_id || 'workspace'}:week:${firstDay.toISOString().slice(0, 10)}`;
}

function buildFallback(dataset: InsightDataset): WeeklySummaryResult {
  const wins = [
    dataset.summary.completedThisWindow > 0
      ? `Đã khép lại ${dataset.summary.completedThisWindow} task trong ${dataset.timeframe.lookbackDays} ngày gần đây.`
      : null,
    dataset.forecasts.some((project) => project.forecastStatus === 'on-track')
      ? 'Một số dự án vẫn giữ được nhịp độ ổn định.'
      : null,
  ].filter((item): item is string => Boolean(item));

  const watchouts = [
    dataset.summary.overdueTasks > 0 ? `${dataset.summary.overdueTasks} task đang quá hạn.` : null,
    dataset.summary.highRiskTasks > 0
      ? `${dataset.summary.highRiskTasks} task rủi ro cao cần giữ sát.`
      : null,
    dataset.summary.overloadedMembers > 0
      ? `${dataset.summary.overloadedMembers} thành viên đang rơi vào vùng quá tải.`
      : null,
  ].filter((item): item is string => Boolean(item));

  const nextFocus = [
    dataset.summary.overdueTasks > 0 ? 'Khóa phương án xử lý các task quá hạn còn treo.' : null,
    dataset.summary.overloadedMembers > 0 ? 'Điều phối lại tải giữa các thành viên trước khi dồn cuối tuần.' : null,
    dataset.summary.riskyProjects > 0 ? 'Rà lại forecast của các dự án đang có tín hiệu trượt mốc.' : null,
  ].filter((item): item is string => Boolean(item));

  return {
    headline:
      dataset.summary.riskyProjects > 0
        ? 'Tuần này có tiến độ, nhưng áp lực deadline đang tăng lên.'
        : 'Tuần này đội vẫn giữ được nhịp vận hành tương đối ổn định.',
    summary: `Khối lượng còn mở hiện là ${dataset.summary.openTasks} task. Trong tuần qua đã đóng ${dataset.summary.completedThisWindow} task, nhưng vẫn còn ${dataset.summary.overdueTasks} task quá hạn và ${dataset.summary.highRiskTasks} task rủi ro cao.`,
    wins,
    watchouts,
    next_focus: nextFocus,
  };
}

function normalizeResult(parsed: Partial<WeeklySummaryResult>, fallback: WeeklySummaryResult) {
  return {
    headline: parsed.headline || fallback.headline,
    summary: parsed.summary || fallback.summary,
    wins: Array.isArray(parsed.wins) ? parsed.wins.slice(0, 4) : fallback.wins,
    watchouts: Array.isArray(parsed.watchouts) ? parsed.watchouts.slice(0, 4) : fallback.watchouts,
    next_focus: Array.isArray(parsed.next_focus) ? parsed.next_focus.slice(0, 4) : fallback.next_focus,
  } satisfies WeeklySummaryResult;
}

export async function aiWeeklySummary(dataset: InsightDataset): Promise<WeeklySummaryResponse> {
  const start = Date.now();
  const model = getOpenAIModel();
  const digestKey = buildDigestKey(dataset);
  const fallback = buildFallback(dataset);

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: WEEKLY_SUMMARY_PROMPT },
        { role: 'user', content: createWeeklySummaryUserPrompt(dataset) },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        result: fallback,
        latency_ms: Date.now() - start,
        model,
        digest_key: digestKey,
        error: 'AI không trả về dữ liệu, dùng bản tóm tắt dự phòng',
      };
    }

    return {
      result: normalizeResult(JSON.parse(content) as Partial<WeeklySummaryResult>, fallback),
      latency_ms: Date.now() - start,
      model,
      digest_key: digestKey,
    };
  } catch (error) {
    return {
      result: fallback,
      latency_ms: Date.now() - start,
      model,
      digest_key: digestKey,
      error: error instanceof Error ? error.message : 'Không thể tạo tóm tắt tuần',
    };
  }
}
