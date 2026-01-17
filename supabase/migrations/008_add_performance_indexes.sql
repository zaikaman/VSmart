-- Migration: Add performance indexes for common query patterns
-- Created: 2026-01-18
-- Purpose: Optimize database queries by adding indexes for frequently filtered columns

-- Index for task queries filtered by assignee_id and trang_thai
CREATE INDEX IF NOT EXISTS idx_task_assignee_trang_thai 
ON public.task(assignee_id, trang_thai) 
WHERE deleted_at IS NULL;

-- Index for task queries filtered by deadline
CREATE INDEX IF NOT EXISTS idx_task_deadline 
ON public.task(deadline) 
WHERE deleted_at IS NULL;

-- Index for task queries filtered by risk_score
CREATE INDEX IF NOT EXISTS idx_task_risk_score 
ON public.task(risk_score DESC) 
WHERE deleted_at IS NULL;

-- Index for task queries filtered by trang_thai only
CREATE INDEX IF NOT EXISTS idx_task_trang_thai 
ON public.task(trang_thai) 
WHERE deleted_at IS NULL;

-- Composite index for common task filters (assignee + status + deadline)
CREATE INDEX IF NOT EXISTS idx_task_assignee_status_deadline 
ON public.task(assignee_id, trang_thai, deadline) 
WHERE deleted_at IS NULL;

-- Index for phan_du_an lookup by du_an_id (used in task queries)
CREATE INDEX IF NOT EXISTS idx_phan_du_an_du_an_id 
ON public.phan_du_an(du_an_id);

-- Index for thanh_vien_du_an active members lookup
CREATE INDEX IF NOT EXISTS idx_thanh_vien_du_an_email_trang_thai 
ON public.thanh_vien_du_an(email, trang_thai);

-- Index for thanh_vien_du_an by du_an_id
CREATE INDEX IF NOT EXISTS idx_thanh_vien_du_an_du_an_id 
ON public.thanh_vien_du_an(du_an_id, trang_thai);

-- Index for notifications by user and read status
CREATE INDEX IF NOT EXISTS idx_thong_bao_nguoi_dung_da_doc 
ON public.thong_bao(nguoi_dung_id, da_doc, thoi_gian DESC);

-- Index for notifications by user only (for all notifications query)
CREATE INDEX IF NOT EXISTS idx_thong_bao_nguoi_dung_thoi_gian 
ON public.thong_bao(nguoi_dung_id, thoi_gian DESC);

-- Index for project queries by trang_thai
CREATE INDEX IF NOT EXISTS idx_du_an_trang_thai 
ON public.du_an(trang_thai, ngay_tao DESC);

-- Index for task queries by phan_du_an_id (common join)
CREATE INDEX IF NOT EXISTS idx_task_phan_du_an_id 
ON public.task(phan_du_an_id) 
WHERE deleted_at IS NULL;

-- Comment explaining the indexes
COMMENT ON INDEX idx_task_assignee_trang_thai IS 'Optimize queries filtering tasks by assignee and status';
COMMENT ON INDEX idx_task_deadline IS 'Optimize queries sorting or filtering by deadline';
COMMENT ON INDEX idx_task_risk_score IS 'Optimize queries sorting by risk score (descending)';
COMMENT ON INDEX idx_task_assignee_status_deadline IS 'Composite index for complex task filters';
COMMENT ON INDEX idx_thong_bao_nguoi_dung_da_doc IS 'Optimize unread notifications queries';
