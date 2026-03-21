-- Migration: Initial executable schema for VSmart
-- Created: 2026-01-16
-- Purpose: bootstrap base tables before incremental migrations 003+

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION public.update_cap_nhat_cuoi()
RETURNS TRIGGER AS $$
BEGIN
  NEW.cap_nhat_cuoi = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.phong_ban (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ten VARCHAR(255) NOT NULL,
  mo_ta TEXT,
  so_luong_thanh_vien INTEGER DEFAULT 0,
  ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.nguoi_dung (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ten VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  mat_khau_hash VARCHAR(255) NOT NULL,
  vai_tro VARCHAR(20) DEFAULT 'member'
    CHECK (vai_tro IN ('admin', 'manager', 'member')),
  phong_ban_id UUID REFERENCES public.phong_ban(id),
  avatar_url VARCHAR(500),
  ty_le_hoan_thanh REAL DEFAULT 0.0,
  ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cap_nhat_cuoi TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ky_nang_nguoi_dung (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nguoi_dung_id UUID NOT NULL REFERENCES public.nguoi_dung(id) ON DELETE CASCADE,
  ten_ky_nang VARCHAR(255) NOT NULL,
  trinh_do VARCHAR(20) NOT NULL
    CHECK (trinh_do IN ('beginner', 'intermediate', 'advanced', 'expert')),
  nam_kinh_nghiem INTEGER DEFAULT 0,
  ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.du_an (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ten VARCHAR(255) NOT NULL,
  mo_ta TEXT,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  trang_thai VARCHAR(20) DEFAULT 'todo'
    CHECK (trang_thai IN ('todo', 'in-progress', 'done')),
  nguoi_tao_id UUID NOT NULL REFERENCES public.nguoi_dung(id),
  phan_tram_hoan_thanh REAL DEFAULT 0.0,
  ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cap_nhat_cuoi TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.phan_du_an (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ten VARCHAR(255) NOT NULL,
  mo_ta TEXT,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  du_an_id UUID NOT NULL REFERENCES public.du_an(id) ON DELETE CASCADE,
  phong_ban_id UUID NOT NULL REFERENCES public.phong_ban(id),
  trang_thai VARCHAR(20) DEFAULT 'todo'
    CHECK (trang_thai IN ('todo', 'in-progress', 'done')),
  phan_tram_hoan_thanh REAL DEFAULT 0.0,
  ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cap_nhat_cuoi TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.task (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ten VARCHAR(255) NOT NULL,
  mo_ta TEXT,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  phan_du_an_id UUID NOT NULL REFERENCES public.phan_du_an(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES public.nguoi_dung(id),
  trang_thai VARCHAR(20) DEFAULT 'todo'
    CHECK (trang_thai IN ('todo', 'in-progress', 'done')),
  priority VARCHAR(20) DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level VARCHAR(20) DEFAULT 'low'
    CHECK (risk_level IN ('low', 'medium', 'high')),
  risk_updated_at TIMESTAMP WITH TIME ZONE,
  is_stale BOOLEAN DEFAULT FALSE,
  ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cap_nhat_cuoi TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.goi_y_phan_cong (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.task(id) ON DELETE CASCADE,
  nguoi_dung_goi_y_id UUID NOT NULL REFERENCES public.nguoi_dung(id) ON DELETE CASCADE,
  diem_phu_hop REAL NOT NULL CHECK (diem_phu_hop >= 0 AND diem_phu_hop <= 100),
  ly_do JSONB NOT NULL,
  da_chap_nhan BOOLEAN DEFAULT FALSE,
  thoi_gian TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lich_su_task (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.task(id) ON DELETE CASCADE,
  hanh_dong VARCHAR(30) NOT NULL
    CHECK (hanh_dong IN ('created', 'assigned', 'status_changed', 'progress_updated', 'completed', 'deleted')),
  nguoi_thuc_hien_id UUID NOT NULL REFERENCES public.nguoi_dung(id),
  gia_tri_cu JSONB,
  gia_tri_moi JSONB,
  thoi_gian TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.thong_bao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nguoi_dung_id UUID NOT NULL REFERENCES public.nguoi_dung(id) ON DELETE CASCADE,
  loai VARCHAR(30) NOT NULL
    CHECK (loai IN ('risk_alert', 'stale_task', 'assignment', 'overload')),
  noi_dung TEXT NOT NULL,
  task_lien_quan_id UUID REFERENCES public.task(id) ON DELETE CASCADE,
  da_doc BOOLEAN DEFAULT FALSE,
  thoi_gian TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_phan_du_an_id ON public.task(phan_du_an_id);
CREATE INDEX IF NOT EXISTS idx_task_assignee_id ON public.task(assignee_id);
CREATE INDEX IF NOT EXISTS idx_task_deleted_at ON public.task(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_phan_du_an_du_an_id ON public.phan_du_an(du_an_id);
CREATE INDEX IF NOT EXISTS idx_ky_nang_nguoi_dung_nguoi_dung_id ON public.ky_nang_nguoi_dung(nguoi_dung_id);
CREATE INDEX IF NOT EXISTS idx_thong_bao_nguoi_dung_id ON public.thong_bao(nguoi_dung_id);

DROP TRIGGER IF EXISTS update_nguoi_dung_cap_nhat_cuoi ON public.nguoi_dung;
CREATE TRIGGER update_nguoi_dung_cap_nhat_cuoi
  BEFORE UPDATE ON public.nguoi_dung
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cap_nhat_cuoi();

DROP TRIGGER IF EXISTS update_du_an_cap_nhat_cuoi ON public.du_an;
CREATE TRIGGER update_du_an_cap_nhat_cuoi
  BEFORE UPDATE ON public.du_an
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cap_nhat_cuoi();

DROP TRIGGER IF EXISTS update_phan_du_an_cap_nhat_cuoi ON public.phan_du_an;
CREATE TRIGGER update_phan_du_an_cap_nhat_cuoi
  BEFORE UPDATE ON public.phan_du_an
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cap_nhat_cuoi();

DROP TRIGGER IF EXISTS update_task_cap_nhat_cuoi ON public.task;
CREATE TRIGGER update_task_cap_nhat_cuoi
  BEFORE UPDATE ON public.task
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cap_nhat_cuoi();
