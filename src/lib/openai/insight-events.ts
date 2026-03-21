import { supabaseAdmin } from '@/lib/supabase/client';

export type InsightType =
  | 'daily_summary'
  | 'weekly_summary'
  | 'rebalance'
  | 'deadline_review'
  | 'meeting_summary'
  | 'team_digest';

export type InsightEventType =
  | 'sent'
  | 'viewed'
  | 'generated'
  | 'accepted'
  | 'dismissed'
  | 'helpful'
  | 'not_helpful';

export async function logInsightEvent(params: {
  userId: string;
  insightType: InsightType;
  eventType: InsightEventType;
  referenceId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin.from('ai_insight_event').insert({
    user_id: params.userId,
    insight_type: params.insightType,
    event_type: params.eventType,
    reference_id: params.referenceId || null,
    metadata: params.metadata || {},
  });

  if (error) {
    throw new Error(error.message);
  }
}
