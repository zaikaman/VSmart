-- Migration: tighten indexes for paginated task and project lookups
-- Created: 2026-03-21
-- Purpose: support server-side pagination/filtering without extra table scans

DO $$
BEGIN
  IF to_regclass('public.task') IS NOT NULL THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_task_part_status_created_active
      ON public.task(phan_du_an_id, trang_thai, ngay_tao DESC)
      WHERE deleted_at IS NULL
    ';

    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_task_part_deadline_active
      ON public.task(phan_du_an_id, deadline)
      WHERE deleted_at IS NULL
    ';

    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_task_part_risk_score_active
      ON public.task(phan_du_an_id, risk_score DESC)
      WHERE deleted_at IS NULL
    ';

    EXECUTE '
      COMMENT ON INDEX idx_task_part_status_created_active
      IS ''Supports paginated kanban queries scoped by part and status''
    ';

    EXECUTE '
      COMMENT ON INDEX idx_task_part_deadline_active
      IS ''Supports deadline filtering within project parts''
    ';

    EXECUTE '
      COMMENT ON INDEX idx_task_part_risk_score_active
      IS ''Supports risk-based filtering within project parts''
    ';
  END IF;

  IF to_regclass('public.thanh_vien_du_an') IS NOT NULL THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_thanh_vien_du_an_email_status_project
      ON public.thanh_vien_du_an(email, trang_thai, du_an_id)
    ';

    EXECUTE '
      COMMENT ON INDEX idx_thanh_vien_du_an_email_status_project
      IS ''Supports membership lookups before paginated project/task queries''
    ';
  END IF;

  IF to_regclass('public.du_an') IS NOT NULL THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_du_an_active_created
      ON public.du_an(ngay_tao DESC)
      WHERE deleted_at IS NULL
    ';
  END IF;
END $$;
