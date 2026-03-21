import { getOpenAIClient, getOpenAIModel } from './client';
import type { InsightDataset } from './insight-context';
import {
  MEETING_SUMMARY_PROMPT,
  createMeetingSummaryUserPrompt,
} from './prompts/summary-prompts';

export interface MeetingSummaryResult {
  summary: string;
  decisions: string[];
  blockers: string[];
  action_items: Array<{
    title: string;
    owner: string | null;
    due_hint: string | null;
  }>;
  follow_ups: string[];
}

export interface MeetingSummaryResponse {
  result: MeetingSummaryResult;
  latency_ms: number;
  model: string;
  reference_id: string;
  error?: string;
}

function extractByPrefix(lines: string[], keywords: string[]) {
  return lines
    .filter((line) => keywords.some((keyword) => line.toLowerCase().includes(keyword)))
    .slice(0, 5);
}

function buildFallback(notes: string): MeetingSummaryResult {
  const lines = notes
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const decisions = extractByPrefix(lines, ['quyết', 'decision', 'chốt']);
  const blockers = extractByPrefix(lines, ['kẹt', 'block', 'vướng', 'chờ']);
  const actionLines = extractByPrefix(lines, ['todo', 'action', 'làm', 'theo']);

  return {
    summary: lines.slice(0, 3).join(' ').slice(0, 260) || 'Chưa đủ dữ liệu để tóm tắt cuộc họp.',
    decisions,
    blockers,
    action_items: actionLines.map((line) => ({
      title: line.replace(/^[-*]\s*/, ''),
      owner: null,
      due_hint: null,
    })),
    follow_ups: blockers.length > 0 ? ['Chốt đầu mối gỡ blockers trước buổi cập nhật tiếp theo.'] : [],
  };
}

function normalizeResult(parsed: Partial<MeetingSummaryResult>, fallback: MeetingSummaryResult) {
  return {
    summary: parsed.summary || fallback.summary,
    decisions: Array.isArray(parsed.decisions) ? parsed.decisions.slice(0, 5) : fallback.decisions,
    blockers: Array.isArray(parsed.blockers) ? parsed.blockers.slice(0, 5) : fallback.blockers,
    action_items: Array.isArray(parsed.action_items)
      ? parsed.action_items
          .filter((item) => Boolean(item?.title))
          .slice(0, 6)
          .map((item) => ({
            title: item.title,
            owner: item.owner || null,
            due_hint: item.due_hint || null,
          }))
      : fallback.action_items,
    follow_ups: Array.isArray(parsed.follow_ups) ? parsed.follow_ups.slice(0, 5) : fallback.follow_ups,
  } satisfies MeetingSummaryResult;
}

export async function summarizeMeetingNotes(params: {
  notes: string;
  projectName?: string | null;
  context?: InsightDataset | null;
}): Promise<MeetingSummaryResponse> {
  const start = Date.now();
  const model = getOpenAIModel();
  const fallback = buildFallback(params.notes);
  const referenceId = `${params.projectName || 'workspace'}:${new Date().toISOString()}`;

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: MEETING_SUMMARY_PROMPT },
        { role: 'user', content: createMeetingSummaryUserPrompt(params) },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        result: fallback,
        latency_ms: Date.now() - start,
        model,
        reference_id: referenceId,
        error: 'AI không trả về dữ liệu, dùng tóm tắt dự phòng',
      };
    }

    return {
      result: normalizeResult(JSON.parse(content) as Partial<MeetingSummaryResult>, fallback),
      latency_ms: Date.now() - start,
      model,
      reference_id: referenceId,
    };
  } catch (error) {
    return {
      result: fallback,
      latency_ms: Date.now() - start,
      model,
      reference_id: referenceId,
      error: error instanceof Error ? error.message : 'Không thể tóm tắt cuộc họp',
    };
  }
}
