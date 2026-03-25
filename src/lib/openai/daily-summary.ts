import { createPreferredChatCompletion, getPreferredAIModel } from './client';
import type { InsightDataset } from './insight-context';
import {
  DAILY_SUMMARY_PROMPT,
  createDailySummaryUserPrompt,
} from './prompts/summary-prompts';

export interface DailySummaryResult {
  headline: string;
  tone: 'on-track' | 'watch' | 'critical';
  summary: string;
  top_risks: Array<{
    title: string;
    detail: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  workload_alerts: Array<{
    member_name: string;
    detail: string;
    severity: 'medium' | 'high';
  }>;
  recommended_actions: string[];
  executive_brief: string[];
}

export interface DailySummaryResponse {
  result: DailySummaryResult;
  latency_ms: number;
  model: string;
  digest_key: string;
  error?: string;
}

function buildDigestKey(dataset: InsightDataset) {
  const dateKey = new Date(dataset.generated_at).toISOString().slice(0, 10);
  return `${dataset.project_id || 'workspace'}:${dateKey}`;
}

function buildFallback(dataset: InsightDataset): DailySummaryResult {
  const topRisks = dataset.high_risk_tasks.slice(0, 3).map((task) => ({
    title: task.ten,
    detail: `${task.project_name || 'Chưa rõ dự án'} · ${task.risk_score}% rủi ro · deadline ${new Date(task.deadline).toLocaleDateString('vi-VN')}`,
    severity: (task.risk_score >= 80 ? 'high' : 'medium') as 'medium' | 'high',
  }));

  const workloadAlerts = dataset.workload.members
    .filter((member) => member.loadStatus === 'overloaded' || member.loadStatus === 'stretched')
    .slice(0, 3)
    .map((member) => ({
      member_name: member.ten,
      detail: `${Math.round(member.loadRatio * 100)}% tải · ${member.activeTasks} task đang mở`,
      severity: (member.loadStatus === 'overloaded' ? 'high' : 'medium') as 'medium' | 'high',
    }));

  const recommendedActions = [
    dataset.overdue_tasks.length > 0
      ? `Chốt phương án xử lý ${dataset.overdue_tasks.length} task đã quá hạn trước cuối ngày.`
      : null,
    workloadAlerts.length > 0
      ? `Tái cân bằng cho ${workloadAlerts[0]?.member_name || 'nhóm đang quá tải'} để giảm dồn việc.`
      : null,
    dataset.due_soon_tasks.length > 0
      ? `Rà lại ${Math.min(dataset.due_soon_tasks.length, 5)} task sắp tới hạn trong tuần này.`
      : null,
  ].filter((item): item is string => Boolean(item));

  const tone: DailySummaryResult['tone'] =
    dataset.summary.overdueTasks > 0 || dataset.summary.highRiskTasks >= 3
      ? 'critical'
      : dataset.summary.overloadedMembers > 0 || dataset.summary.riskyProjects > 0
        ? 'watch'
        : 'on-track';

  const headline =
    tone === 'critical'
      ? 'Nhịp vận hành hôm nay đang chịu áp lực rõ rệt.'
      : tone === 'watch'
        ? 'Đội đang giữ được tiến độ nhưng bắt đầu có tín hiệu cần can thiệp sớm.'
        : 'Tiến độ hiện vẫn trong vùng kiểm soát tốt.';

  return {
    headline,
    tone,
    summary: `Hiện có ${dataset.summary.openTasks} task đang mở, ${dataset.summary.highRiskTasks} task rủi ro cao và ${dataset.summary.overloadedMembers} thành viên quá tải. ${
      dataset.summary.riskyProjects > 0
        ? `${dataset.summary.riskyProjects} dự án đã xuất hiện tín hiệu trượt mốc.`
        : 'Chưa thấy dự án nào rơi vào vùng báo động.'
    }`,
    top_risks: topRisks,
    workload_alerts: workloadAlerts,
    recommended_actions: recommendedActions,
    executive_brief: [
      `${dataset.summary.openTasks} task đang mở`,
      `${dataset.summary.overdueTasks} task quá hạn`,
      `${dataset.summary.overloadedMembers} thành viên quá tải`,
    ],
  };
}

function normalizeResult(parsed: Partial<DailySummaryResult>, fallback: DailySummaryResult) {
  return {
    headline: parsed.headline || fallback.headline,
    tone: parsed.tone || fallback.tone,
    summary: parsed.summary || fallback.summary,
    top_risks: Array.isArray(parsed.top_risks) ? parsed.top_risks.slice(0, 5) : fallback.top_risks,
    workload_alerts: Array.isArray(parsed.workload_alerts)
      ? parsed.workload_alerts.slice(0, 5)
      : fallback.workload_alerts,
    recommended_actions: Array.isArray(parsed.recommended_actions)
      ? parsed.recommended_actions.slice(0, 5)
      : fallback.recommended_actions,
    executive_brief: Array.isArray(parsed.executive_brief)
      ? parsed.executive_brief.slice(0, 4)
      : fallback.executive_brief,
  } satisfies DailySummaryResult;
}

export async function aiDailySummary(dataset: InsightDataset): Promise<DailySummaryResponse> {
  const start = Date.now();
  const model = getPreferredAIModel();
  const digestKey = buildDigestKey(dataset);
  const fallback = buildFallback(dataset);

  try {
    const response = await createPreferredChatCompletion({
      messages: [
        { role: 'system', content: DAILY_SUMMARY_PROMPT },
        { role: 'user', content: createDailySummaryUserPrompt(dataset) },
      ],
      responseFormat: 'json_object',
    });

    if (!response.content) {
      return {
        result: fallback,
        latency_ms: Date.now() - start,
        model: response.model,
        digest_key: digestKey,
        error: 'AI không trả về dữ liệu, dùng bản tóm tắt dự phòng',
      };
    }

    const parsed = JSON.parse(response.content) as Partial<DailySummaryResult>;

    return {
      result: normalizeResult(parsed, fallback),
      latency_ms: Date.now() - start,
      model: response.model,
      digest_key: digestKey,
    };
  } catch (error) {
    return {
      result: fallback,
      latency_ms: Date.now() - start,
      model,
      digest_key: digestKey,
      error: error instanceof Error ? error.message : 'Không thể tạo tóm tắt ngày',
    };
  }
}
