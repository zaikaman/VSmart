ALTER TABLE public.task
  ADD COLUMN IF NOT EXISTS review_status character varying NOT NULL DEFAULT 'draft'
    CHECK (review_status IN ('draft', 'pending_review', 'approved', 'changes_requested')),
  ADD COLUMN IF NOT EXISTS submitted_for_review_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.nguoi_dung(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS review_comment text;

CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type character varying NOT NULL CHECK (
    entity_type IN ('task', 'project', 'project_part', 'comment', 'review')
  ),
  entity_id uuid NOT NULL,
  action character varying NOT NULL,
  actor_id uuid NOT NULL REFERENCES public.nguoi_dung(id) ON DELETE CASCADE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_entity
  ON public.activity_log(entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_actor
  ON public.activity_log(actor_id, created_at DESC);

ALTER TABLE public.nguoi_dung
  ALTER COLUMN settings SET DEFAULT '{
    "dashboard": { "defaultPage": "/dashboard", "itemsPerPage": 10 },
    "notifications": {
      "pushEnabled": false,
      "emailComments": true,
      "emailTaskAssigned": true,
      "emailDeadlineReminder": true,
      "emailTeamDigest": true,
      "emailReviewRequests": true,
      "emailApprovalResults": true
    }
  }'::jsonb;
