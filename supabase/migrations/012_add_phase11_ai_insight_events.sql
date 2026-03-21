CREATE TABLE IF NOT EXISTS public.ai_insight_event (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.nguoi_dung(id) ON DELETE CASCADE,
  insight_type character varying NOT NULL CHECK (
    insight_type IN (
      'daily_summary',
      'weekly_summary',
      'rebalance',
      'deadline_review',
      'meeting_summary',
      'team_digest'
    )
  ),
  event_type character varying NOT NULL CHECK (
    event_type IN (
      'sent',
      'viewed',
      'generated',
      'accepted',
      'dismissed',
      'helpful',
      'not_helpful'
    )
  ),
  reference_id character varying,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_insight_event_user_type_created
  ON public.ai_insight_event(user_id, insight_type, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_insight_event_reference
  ON public.ai_insight_event(reference_id, created_at DESC);
