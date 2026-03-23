ALTER TABLE public.task
  ADD COLUMN IF NOT EXISTS review_request_comment text;
