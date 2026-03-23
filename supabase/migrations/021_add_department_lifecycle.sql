-- Migration: add department lifecycle states and safe merge support
-- Created: 2026-03-23

ALTER TABLE public.phong_ban
ADD COLUMN IF NOT EXISTS cap_nhat_cuoi TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS trang_thai VARCHAR(20) NOT NULL DEFAULT 'active'
  CHECK (trang_thai IN ('active', 'inactive', 'merged')),
ADD COLUMN IF NOT EXISTS merged_into_id UUID REFERENCES public.phong_ban(id),
ADD COLUMN IF NOT EXISTS ngung_su_dung_at TIMESTAMP WITH TIME ZONE;

UPDATE public.phong_ban
SET
  cap_nhat_cuoi = COALESCE(cap_nhat_cuoi, NOW()),
  trang_thai = COALESCE(trang_thai, 'active');
