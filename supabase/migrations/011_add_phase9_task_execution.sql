-- Migration: Add checklist, attachments, templates and recurring task rules
-- Created: 2026-03-21

ALTER TABLE public.task
ADD COLUMN IF NOT EXISTS progress_mode VARCHAR(20) DEFAULT 'manual';

ALTER TABLE public.task
ADD COLUMN IF NOT EXISTS template_id UUID;

ALTER TABLE public.task
ADD COLUMN IF NOT EXISTS recurring_rule_id UUID;

ALTER TABLE public.task
DROP CONSTRAINT IF EXISTS task_progress_mode_check;

ALTER TABLE public.task
ADD CONSTRAINT task_progress_mode_check
CHECK (progress_mode IN ('manual', 'checklist'));

CREATE TABLE IF NOT EXISTS public.task_template (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ten VARCHAR(200) NOT NULL,
  mo_ta TEXT,
  default_priority VARCHAR(20) DEFAULT 'medium',
  checklist_template JSONB DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL REFERENCES public.nguoi_dung(id) ON DELETE CASCADE,
  is_shared BOOLEAN DEFAULT FALSE,
  ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cap_nhat_cuoi TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT task_template_default_priority_check
    CHECK (default_priority IN ('low', 'medium', 'high', 'urgent'))
);

CREATE TABLE IF NOT EXISTS public.recurring_task_rule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_task_id UUID REFERENCES public.task(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  cron_expression VARCHAR(100) NOT NULL,
  phan_du_an_id UUID NOT NULL REFERENCES public.phan_du_an(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES public.nguoi_dung(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.task_template(id) ON DELETE SET NULL,
  checklist_template JSONB DEFAULT '[]'::jsonb,
  next_run_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES public.nguoi_dung(id) ON DELETE CASCADE,
  ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cap_nhat_cuoi TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT recurring_task_rule_priority_check
    CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

CREATE TABLE IF NOT EXISTS public.task_checklist_item (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.task(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  is_done BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cap_nhat_cuoi TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.task_attachment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.task(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  mime_type VARCHAR(100),
  size INTEGER NOT NULL DEFAULT 0,
  cloudinary_public_id VARCHAR(255),
  uploaded_by UUID REFERENCES public.nguoi_dung(id) ON DELETE SET NULL,
  ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.task
DROP CONSTRAINT IF EXISTS task_template_id_fkey;

ALTER TABLE public.task
ADD CONSTRAINT task_template_id_fkey
FOREIGN KEY (template_id) REFERENCES public.task_template(id) ON DELETE SET NULL;

ALTER TABLE public.task
DROP CONSTRAINT IF EXISTS task_recurring_rule_id_fkey;

ALTER TABLE public.task
ADD CONSTRAINT task_recurring_rule_id_fkey
FOREIGN KEY (recurring_rule_id) REFERENCES public.recurring_task_rule(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_task_checklist_item_task_id
ON public.task_checklist_item(task_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_task_attachment_task_id
ON public.task_attachment(task_id, ngay_tao DESC);

CREATE INDEX IF NOT EXISTS idx_task_template_created_by
ON public.task_template(created_by, ngay_tao DESC);

CREATE INDEX IF NOT EXISTS idx_task_template_is_shared
ON public.task_template(is_shared, ngay_tao DESC);

CREATE INDEX IF NOT EXISTS idx_recurring_task_rule_next_run
ON public.recurring_task_rule(is_active, next_run_at);

CREATE INDEX IF NOT EXISTS idx_task_recurring_rule_id
ON public.task(recurring_rule_id)
WHERE recurring_rule_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.update_generic_cap_nhat_cuoi()
RETURNS TRIGGER AS $$
BEGIN
  NEW.cap_nhat_cuoi = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_task_template_cap_nhat_cuoi ON public.task_template;
CREATE TRIGGER update_task_template_cap_nhat_cuoi
  BEFORE UPDATE ON public.task_template
  FOR EACH ROW
  EXECUTE FUNCTION public.update_generic_cap_nhat_cuoi();

DROP TRIGGER IF EXISTS update_recurring_task_rule_cap_nhat_cuoi ON public.recurring_task_rule;
CREATE TRIGGER update_recurring_task_rule_cap_nhat_cuoi
  BEFORE UPDATE ON public.recurring_task_rule
  FOR EACH ROW
  EXECUTE FUNCTION public.update_generic_cap_nhat_cuoi();

DROP TRIGGER IF EXISTS update_task_checklist_item_cap_nhat_cuoi ON public.task_checklist_item;
CREATE TRIGGER update_task_checklist_item_cap_nhat_cuoi
  BEFORE UPDATE ON public.task_checklist_item
  FOR EACH ROW
  EXECUTE FUNCTION public.update_generic_cap_nhat_cuoi();

COMMENT ON COLUMN public.task.progress_mode IS 'manual = user chỉnh progress thủ công, checklist = progress tự rollup từ checklist';
COMMENT ON COLUMN public.task.template_id IS 'Template dùng để tạo task, nếu có';
COMMENT ON COLUMN public.task.recurring_rule_id IS 'Recurring rule sinh ra task, nếu có';
COMMENT ON TABLE public.task_checklist_item IS 'Checklist/subtasks đơn giản của task';
COMMENT ON TABLE public.task_attachment IS 'File đính kèm của task';
COMMENT ON TABLE public.task_template IS 'Task template có thể tái sử dụng khi tạo task';
COMMENT ON TABLE public.recurring_task_rule IS 'Rule sinh task định kỳ theo cron_expression giới hạn';
