-- VSmart Database Schema
-- Chạy script này trong Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Phòng Ban
CREATE TABLE phong_ban (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ten VARCHAR(200) NOT NULL,
  mo_ta TEXT,
  so_luong_thanh_vien INT DEFAULT 0,
  ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Người Dùng
CREATE TABLE nguoi_dung (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ten VARCHAR(200) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  mat_khau_hash VARCHAR(255) NOT NULL,
  vai_tro VARCHAR(20) DEFAULT 'member' CHECK (vai_tro IN ('admin', 'manager', 'member')),
  phong_ban_id UUID REFERENCES phong_ban(id) ON DELETE SET NULL,
  avatar_url VARCHAR(500),
  ty_le_hoan_thanh REAL DEFAULT 0.0,
  ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cap_nhat_cuoi TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kỹ Năng Người Dùng
CREATE TABLE ky_nang_nguoi_dung (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nguoi_dung_id UUID NOT NULL REFERENCES nguoi_dung(id) ON DELETE CASCADE,
  ten_ky_nang VARCHAR(100) NOT NULL,
  trinh_do VARCHAR(20) NOT NULL CHECK (trinh_do IN ('beginner', 'intermediate', 'advanced', 'expert')),
  nam_kinh_nghiem INT DEFAULT 0,
  ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dự Án
CREATE TABLE du_an (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ten VARCHAR(200) NOT NULL,
  mo_ta TEXT,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  trang_thai VARCHAR(20) DEFAULT 'todo' CHECK (trang_thai IN ('todo', 'in-progress', 'done')),
  nguoi_tao_id UUID NOT NULL REFERENCES nguoi_dung(id) ON DELETE CASCADE,
  phan_tram_hoan_thanh REAL DEFAULT 0.0,
  ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cap_nhat_cuoi TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Phần Dự Án
CREATE TABLE phan_du_an (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ten VARCHAR(200) NOT NULL,
  mo_ta TEXT,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  du_an_id UUID NOT NULL REFERENCES du_an(id) ON DELETE CASCADE,
  phong_ban_id UUID NOT NULL REFERENCES phong_ban(id) ON DELETE CASCADE,
  trang_thai VARCHAR(20) DEFAULT 'todo' CHECK (trang_thai IN ('todo', 'in-progress', 'done')),
  phan_tram_hoan_thanh REAL DEFAULT 0.0,
  ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cap_nhat_cuoi TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task
CREATE TABLE task (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ten VARCHAR(200) NOT NULL,
  mo_ta TEXT,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  phan_du_an_id UUID NOT NULL REFERENCES phan_du_an(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES nguoi_dung(id) ON DELETE SET NULL,
  trang_thai VARCHAR(20) DEFAULT 'todo' CHECK (trang_thai IN ('todo', 'in-progress', 'done')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  risk_score INT DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level VARCHAR(20) DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  risk_updated_at TIMESTAMP WITH TIME ZONE,
  is_stale BOOLEAN DEFAULT FALSE,
  ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cap_nhat_cuoi TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Gợi Ý Phân Công
CREATE TABLE goi_y_phan_cong (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  nguoi_dung_goi_y_id UUID NOT NULL REFERENCES nguoi_dung(id) ON DELETE CASCADE,
  diem_phu_hop REAL NOT NULL CHECK (diem_phu_hop >= 0 AND diem_phu_hop <= 100),
  ly_do JSONB NOT NULL,
  da_chap_nhan BOOLEAN DEFAULT FALSE,
  thoi_gian TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lịch Sử Task
CREATE TABLE lich_su_task (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  hanh_dong VARCHAR(30) NOT NULL CHECK (hanh_dong IN ('created', 'assigned', 'status_changed', 'progress_updated', 'completed', 'deleted')),
  nguoi_thuc_hien_id UUID NOT NULL REFERENCES nguoi_dung(id) ON DELETE CASCADE,
  gia_tri_cu JSONB,
  gia_tri_moi JSONB,
  thoi_gian TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Thông Báo
CREATE TABLE thong_bao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nguoi_dung_id UUID NOT NULL REFERENCES nguoi_dung(id) ON DELETE CASCADE,
  loai VARCHAR(30) NOT NULL CHECK (loai IN ('risk_alert', 'stale_task', 'assignment', 'overload')),
  noi_dung TEXT NOT NULL,
  task_lien_quan_id UUID REFERENCES task(id) ON DELETE SET NULL,
  da_doc BOOLEAN DEFAULT FALSE,
  thoi_gian TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_nguoi_dung_email ON nguoi_dung(email);
CREATE INDEX idx_nguoi_dung_phong_ban ON nguoi_dung(phong_ban_id);
CREATE INDEX idx_ky_nang_nguoi_dung ON ky_nang_nguoi_dung(nguoi_dung_id);
CREATE INDEX idx_du_an_nguoi_tao ON du_an(nguoi_tao_id);
CREATE INDEX idx_phan_du_an_du_an ON phan_du_an(du_an_id);
CREATE INDEX idx_phan_du_an_phong_ban ON phan_du_an(phong_ban_id);
CREATE INDEX idx_task_phan_du_an ON task(phan_du_an_id);
CREATE INDEX idx_task_assignee ON task(assignee_id);
CREATE INDEX idx_task_trang_thai ON task(trang_thai);
CREATE INDEX idx_task_deleted_at ON task(deleted_at);
CREATE INDEX idx_goi_y_task ON goi_y_phan_cong(task_id);
CREATE INDEX idx_lich_su_task ON lich_su_task(task_id);
CREATE INDEX idx_thong_bao_nguoi_dung ON thong_bao(nguoi_dung_id);
CREATE INDEX idx_thong_bao_da_doc ON thong_bao(da_doc);

-- Enable Row Level Security (RLS)
ALTER TABLE phong_ban ENABLE ROW LEVEL SECURITY;
ALTER TABLE nguoi_dung ENABLE ROW LEVEL SECURITY;
ALTER TABLE ky_nang_nguoi_dung ENABLE ROW LEVEL SECURITY;
ALTER TABLE du_an ENABLE ROW LEVEL SECURITY;
ALTER TABLE phan_du_an ENABLE ROW LEVEL SECURITY;
ALTER TABLE task ENABLE ROW LEVEL SECURITY;
ALTER TABLE goi_y_phan_cong ENABLE ROW LEVEL SECURITY;
ALTER TABLE lich_su_task ENABLE ROW LEVEL SECURITY;
ALTER TABLE thong_bao ENABLE ROW LEVEL SECURITY;

-- RLS Policies (cho phép authenticated users đọc/ghi tất cả - có thể tùy chỉnh sau)
CREATE POLICY "Enable read access for authenticated users" ON phong_ban FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable write access for authenticated users" ON phong_ban FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON nguoi_dung FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable write access for authenticated users" ON nguoi_dung FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON ky_nang_nguoi_dung FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable write access for authenticated users" ON ky_nang_nguoi_dung FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON du_an FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable write access for authenticated users" ON du_an FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON phan_du_an FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable write access for authenticated users" ON phan_du_an FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON task FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable write access for authenticated users" ON task FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON goi_y_phan_cong FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable write access for authenticated users" ON goi_y_phan_cong FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON lich_su_task FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable write access for authenticated users" ON lich_su_task FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON thong_bao FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable write access for authenticated users" ON thong_bao FOR ALL USING (auth.role() = 'authenticated');

-- Trigger để tự động update cap_nhat_cuoi
CREATE OR REPLACE FUNCTION update_cap_nhat_cuoi()
RETURNS TRIGGER AS $$
BEGIN
  NEW.cap_nhat_cuoi = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_nguoi_dung_cap_nhat_cuoi
  BEFORE UPDATE ON nguoi_dung
  FOR EACH ROW
  EXECUTE FUNCTION update_cap_nhat_cuoi();

CREATE TRIGGER update_du_an_cap_nhat_cuoi
  BEFORE UPDATE ON du_an
  FOR EACH ROW
  EXECUTE FUNCTION update_cap_nhat_cuoi();

CREATE TRIGGER update_phan_du_an_cap_nhat_cuoi
  BEFORE UPDATE ON phan_du_an
  FOR EACH ROW
  EXECUTE FUNCTION update_cap_nhat_cuoi();

CREATE TRIGGER update_task_cap_nhat_cuoi
  BEFORE UPDATE ON task
  FOR EACH ROW
  EXECUTE FUNCTION update_cap_nhat_cuoi();
