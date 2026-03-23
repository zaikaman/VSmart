ALTER TABLE public.task
  ADD COLUMN IF NOT EXISTS requires_review boolean NOT NULL DEFAULT false;
